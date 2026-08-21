'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface PaymentLog {
  amount: number
  discount_bs?: number
  date: string
  sales_name: string
}

interface Transaction {
  id: number
  customer_name: string
  total_price: number
  paid_amount: number
  due_date: string
  assigned_sales: string
  is_carried: boolean
  payment_history?: PaymentLog[]
}

const SETTLEMENT_DRAFT_KEY = 'DRAFT_SETTLEMENT_PAGE'

export default function SettlementPage() {
  const [salesList, setSalesList] = useState<string[]>([])
  const [selectedSales, setSelectedSales] = useState<string>('')
  const [carriedNotes, setCarriedNotes] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)

  // 🔔 State Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'error') => {
    setToast({ message, type })
    setTimeout(() => {
      setToast(null)
    }, 3000)
  }

  // ⚠️ State Modal Konfirmasi Setoran
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)

  // State form input setoran per transaksi (Termasuk discount / potongan BS)
  const [settlementData, setSettlementData] = useState<{
    [key: number]: { amount: string; discount: string; newDueDate: string }
  }>({})

  const isInitialLoadDone = useRef(false)

  // 💾 1. RESTORE DRAFT DARI LOCALSTORAGE
  useEffect(() => {
    const savedDraft = localStorage.getItem(SETTLEMENT_DRAFT_KEY)
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft)
        if (parsed) {
          if (parsed.selectedSales) setSelectedSales(parsed.selectedSales)
          if (parsed.settlementData) setSettlementData(parsed.settlementData)
        }
      } catch (err) {
        console.error('Gagal memuat draft setoran:', err)
      }
    }
    setTimeout(() => {
      isInitialLoadDone.current = true
    }, 500)
  }, [])

  // 💾 2. AUTOSAVE FORM SECARA REAL-TIME
  useEffect(() => {
    if (!isInitialLoadDone.current) return

    const draftData = {
      selectedSales,
      settlementData,
    }

    localStorage.setItem(SETTLEMENT_DRAFT_KEY, JSON.stringify(draftData))
  }, [selectedSales, settlementData])

  // Fetch daftar sales yang sedang membawa nota (is_carried = true)
  const fetchActiveSales = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('assigned_sales')
      .eq('is_carried', true)

    if (error) {
      showToast('Gagal mengambil daftar sales: ' + error.message, 'error')
      return
    }

    if (data) {
      const uniqueSales = Array.from(
        new Set(data.map((item) => item.assigned_sales).filter(Boolean))
      ) as string[]

      setSalesList(uniqueSales)

      // 🎯 Auto-select jika hanya ada 1 sales & belum ada pilihan
      if (uniqueSales.length === 1 && !selectedSales) {
        setSelectedSales(uniqueSales[0])
      }
    }
  }

  useEffect(() => {
    fetchActiveSales()
  }, [])

  // Fetch nota yang dibawa oleh sales yang dipilih
  useEffect(() => {
    if (!selectedSales) {
      setCarriedNotes([])
      return
    }

    async function fetchCarriedNotes() {
      setLoading(true)
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('is_carried', true)
        .eq('assigned_sales', selectedSales)
        .order('customer_name', { ascending: true })
        .order('id', { ascending: false })

      if (error) {
        showToast('Gagal mengambil nota sales: ' + error.message, 'error')
      } else if (data) {
        setCarriedNotes(data)

        // Hanya isi default jika data di settlementData belum diset/kosong
        setSettlementData((prevData) => {
          const updatedMap = { ...prevData }
          data.forEach((item) => {
            if (!updatedMap[item.id]) {
              updatedMap[item.id] = {
                amount: '0',
                discount: '0',
                newDueDate: item.due_date || '',
              }
            }
          })
          return updatedMap
        })
      }
      setLoading(false)
    }

    fetchCarriedNotes()
  }, [selectedSales])

  // 🚨 PERINGATAN REFRESH/PINDAH HALAMAN JIKA ADA NOMINAL INPUT > 0
  const hasUnsavedInput = Object.values(settlementData).some(
    (item) => Number(item.amount) > 0 || Number(item.discount) > 0
  )

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedInput && !loading) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedInput, loading])

  const handleInputChange = (
    id: number,
    field: 'amount' | 'discount' | 'newDueDate',
    value: string
  ) => {
    setSettlementData((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }))
  }

  // Hitung total fisik uang tunai yang diterima dari Sales
  const totalCashToReceive = carriedNotes.reduce((sum, item) => {
    const inputVal = Number(settlementData[item.id]?.amount) || 0
    return sum + inputVal
  }, 0)

  // Reset Draft Manual
  const handleResetDraft = () => {
    localStorage.removeItem(SETTLEMENT_DRAFT_KEY)
    setSelectedSales('')
    setSettlementData({})
    showToast('Draft setoran berhasil dibersihkan!', 'warning')
  }

  // Eksekusi Simpan Setoran Sales
  const executeSubmitSettlement = async () => {
    if (!selectedSales) return

    setIsConfirmModalOpen(false)
    setLoading(true)

    try {
      for (const item of carriedNotes) {
        const input = settlementData[item.id]
        const addedPaid = Number(input?.amount) || 0
        const discountVal = Number(input?.discount) || 0

        // Adjusted Total Price jika ada Retur/BS
        const newTotalPrice = (item.total_price || 0) - discountVal
        const newTotalPaid = (item.paid_amount || 0) + addedPaid
        const remainingAfter = newTotalPrice - newTotalPaid

        let newStatus = 'UNPAID'
        if (remainingAfter <= 0) {
          newStatus = 'PAID'
        } else if (newTotalPaid > 0) {
          newStatus = 'PARTIAL'
        }

        const oldHistory = Array.isArray(item.payment_history) ? item.payment_history : []
        let updatedHistory = [...oldHistory]

        if (addedPaid > 0 || discountVal > 0) {
          updatedHistory.push({
            amount: addedPaid,
            discount_bs: discountVal,
            date: new Date().toISOString(),
            sales_name: selectedSales,
          })
        }

        const { error } = await supabase
          .from('transactions')
          .update({
            total_price: newTotalPrice,
            paid_amount: newTotalPaid,
            payment_status: newStatus,
            due_date: input?.newDueDate || item.due_date,
            is_carried: false,
            assigned_sales: null,
            payment_history: updatedHistory,
          })
          .eq('id', item.id)

        if (error) throw error
      }

      showToast(`Setoran sales ${selectedSales} berhasil diproses!`, 'success')

      // 🧹 HAPUS DRAFT LOCALSTORAGE SETELAH SUKSES SIMPAN
      localStorage.removeItem(SETTLEMENT_DRAFT_KEY)
      setSelectedSales('')
      setCarriedNotes([])
      setSettlementData({})
      fetchActiveSales()
    } catch (err: any) {
      showToast('Gagal memproses setoran: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 text-slate-100 relative">
      
      {/* 🔔 CUSTOM TOAST NOTIFICATION */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl border text-xs font-bold transition-all ${
            toast.type === 'error'
              ? 'bg-rose-950 border-rose-800 text-rose-200'
              : toast.type === 'warning'
              ? 'bg-amber-950 border-amber-800 text-amber-200'
              : 'bg-emerald-950 border-emerald-800 text-emerald-200'
          }`}
        >
          <span>{toast.type === 'error' ? '⚠️' : toast.type === 'warning' ? '⚡' : '✅'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Tombol Kembali & Header */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-blue-400 transition gap-1 mb-1"
        >
          ← Kembali ke Dashboard
        </Link>
        <div className="bg-[#0b1329] p-4 sm:p-5 rounded-2xl border border-slate-800/80 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span>📥</span> Setoran & Rekapitulasi Sales
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Proses pelunasan, cicilan, dan pembaharuan janji bayar dari nota yang dibawa sales.
            </p>
          </div>

          {/* Selector Sales */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-slate-300 whitespace-nowrap">
              Pilih Sales:
            </label>
            <select
              value={selectedSales}
              onChange={(e) => setSelectedSales(e.target.value)}
              className="px-4 py-2 bg-[#070c1a] border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-blue-500 transition cursor-pointer min-w-[200px]"
            >
              <option value="">
                {salesList.length === 0 ? '-- Tidak Ada Sales Membawa Nota --' : '-- Pilih Sales Bertugas --'}
              </option>
              {salesList.map((sales) => (
                <option key={sales} value={sales}>
                  👤 {sales}
                </option>
              ))}
            </select>

            {selectedSales && (
              <button
                type="button"
                onClick={handleResetDraft}
                className="text-xs text-rose-400 hover:underline font-bold"
                title="Reset pilihan sales & inputan"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Warning Banner jika tidak ada sales aktif */}
      {salesList.length === 0 && (
        <div className="bg-amber-950/40 border border-amber-800/50 p-4 rounded-2xl text-xs text-amber-200 flex items-center gap-3">
          <span className="text-xl">ℹ️</span>
          <div>
            <strong>Belum ada nota yang dibawa oleh Sales.</strong>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Silakan buka menu <strong>Tagihan Sales</strong> terlebih dahulu dan pilih nota yang akan dibawa penagihan hari ini.
            </p>
          </div>
        </div>
      )}

      {selectedSales && (
        <div className="space-y-5">
          {/* Total Uang Masuk */}
          <div className="bg-[#0b1329] border border-emerald-900/60 p-5 rounded-2xl shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                Total Uang Tunai Diterima dari Sales ({selectedSales})
              </span>
              <span className="text-xs text-slate-400">
                Hitungan akumulasi dari seluruh setoran toko yang diinput.
              </span>
            </div>

            <div className="flex items-center gap-4 justify-between sm:justify-end">
              <span className="text-2xl font-black text-emerald-400">
                Rp {totalCashToReceive.toLocaleString('id-ID')}
              </span>
              <button
                onClick={() => setIsConfirmModalOpen(true)}
                disabled={loading}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-900/30 transition active:scale-95 disabled:opacity-50 whitespace-nowrap"
              >
                {loading ? 'Memproses...' : '💾 Simpan Setoran Sales'}
              </button>
            </div>
          </div>

          {/* Tabel Nota yang Dibawa */}
          <div className="bg-[#0b1329] border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
            {carriedNotes.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Sales ini tidak sedang membawa nota tagihan.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#070c1a] text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-5">Toko / Pembeli</th>
                      <th className="py-3.5 px-5 text-right">Sisa Tagihan</th>
                      <th className="py-3.5 px-5 w-36 text-center">Potong BS (Rp)</th>
                      <th className="py-3.5 px-5 w-40 text-center">Bayar Hari Ini (Rp)</th>
                      <th className="py-3.5 px-5 w-40 text-center">Janji Bayar Baru</th>
                      <th className="py-3.5 px-5 text-center">Aksi Cepat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {carriedNotes.map((tx) => {
                      const currentInput = settlementData[tx.id] || { amount: '0', discount: '0', newDueDate: '' }
                      const discountVal = Number(currentInput.discount) || 0
                      
                      // Sisa tagihan dikurangi retur BS
                      const adjustedTotalPrice = (tx.total_price || 0) - discountVal
                      const remaining = adjustedTotalPrice - (tx.paid_amount || 0)

                      return (
                        <tr key={tx.id} className="hover:bg-slate-800/30 transition">
                          <td className="py-3.5 px-5">
                            <div className="font-bold text-slate-100 text-sm">{tx.customer_name}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5 font-normal">
                              Total Nota Awal: Rp {(tx.total_price || 0).toLocaleString('id-ID')}
                            </div>
                          </td>

                          <td className="py-3.5 px-5 text-right font-bold text-rose-400 text-sm">
                            Rp {remaining.toLocaleString('id-ID')}
                          </td>

                          {/* Input Potongan BS */}
                          <td className="py-3.5 px-5">
                            <input
                              type="number"
                              value={currentInput.discount}
                              onChange={(e) => handleInputChange(tx.id, 'discount', e.target.value)}
                              placeholder="0"
                              className="w-full px-3 py-2 bg-[#070c1a] border border-amber-900/50 rounded-xl text-right font-bold text-amber-400 focus:outline-none focus:border-amber-500 transition text-xs"
                            />
                          </td>

                          {/* Input Bayar */}
                          <td className="py-3.5 px-5">
                            <input
                              type="number"
                              value={currentInput.amount}
                              onChange={(e) => handleInputChange(tx.id, 'amount', e.target.value)}
                              className="w-full px-3 py-2 bg-[#070c1a] border border-slate-800 rounded-xl text-right font-bold text-white focus:outline-none focus:border-blue-500 transition text-xs"
                            />
                          </td>

                          {/* Input Tgl Janji Bayar Baru */}
                          <td className="py-3.5 px-5">
                            <input
                              type="date"
                              value={currentInput.newDueDate}
                              onChange={(e) => handleInputChange(tx.id, 'newDueDate', e.target.value)}
                              className="w-full px-2.5 py-2 bg-[#070c1a] border border-slate-800 rounded-xl text-center text-xs text-white focus:outline-none focus:border-blue-500 transition [color-scheme:dark]"
                            />
                          </td>

                          {/* Tombol Aksi Cepat */}
                          <td className="py-3.5 px-5 text-center">
                            <div className="flex justify-center gap-1.5">
                              <button
                                onClick={() => handleInputChange(tx.id, 'amount', remaining.toString())}
                                className="px-2.5 py-1 text-xs bg-emerald-950/80 hover:bg-emerald-900 text-emerald-400 font-bold rounded-lg border border-emerald-800/60 transition"
                              >
                                Set Lunas
                              </button>
                              <button
                                onClick={() => handleInputChange(tx.id, 'amount', '0')}
                                className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg border border-slate-700 transition"
                              >
                                Ga Bayar
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ⚠️ MODAL KONFIRMASI SIMPAN SETORAN */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-[#0b1329] border border-slate-800 p-6 rounded-2xl max-w-md w-full space-y-4 text-slate-100 shadow-2xl text-center">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center text-2xl mx-auto border border-emerald-500/20">
              📥
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white">Proses Setoran Sales?</h3>
              <p className="text-xs text-slate-400">
                Konfirmasi penerimaan uang tunai dari sales <strong className="text-white">"{selectedSales}"</strong>
              </p>
              <div className="bg-[#070c1a] p-3 rounded-xl border border-slate-800/80 text-center text-xs my-2">
                <span className="text-slate-400 block mb-1">Total Tunai Diterima:</span>
                <span className="text-lg font-black text-emerald-400">
                  Rp {totalCashToReceive.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="w-full py-2.5 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition"
              >
                Batal
              </button>
              <button
                onClick={executeSubmitSettlement}
                className="w-full py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg transition"
              >
                Ya, Simpan Setoran
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}