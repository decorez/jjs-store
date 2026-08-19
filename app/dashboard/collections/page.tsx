'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Transaction {
  id: number
  customer_name: string
  created_at?: string
  transaction_date?: string
  due_date?: string
  total_price: number
  paid_amount: number
  payment_status?: string
  product_name?: string
  items_summary?: string
  assigned_sales?: string | null
  is_carried?: boolean
  payment_history?: any[]
}

// Option Sales / Petugas Penagih
const SALES_OPTIONS = ['Eko']

// Helper Format Tanggal (contoh: 17 Agt 2026)
const formatDate = (dateString?: string) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return dateString
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export default function CollectionPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // State Penyerahan Nota Tagihan Sales
  const [selectedSales, setSelectedSales] = useState<string>('')
  const [checkedIds, setCheckedIds] = useState<number[]>([])

  // State Modal Terima Cash dari Sales/Petugas
  const [cashModalTarget, setCashModalTarget] = useState<Transaction | null>(null)
  const [cashAmount, setCashAmount] = useState<number | ''>('')
  const [collectorName, setCollectorName] = useState<string>('')
  const [isSavingPay, setIsSavingPay] = useState(false)

  // State Modal Edit Nota & Status Manual
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [editDate, setEditDate] = useState('')
  const [editProduct, setEditProduct] = useState('')
  const [editPrice, setEditPrice] = useState<number>(0)
  const [editPaidAmount, setEditPaidAmount] = useState<number>(0)
  const [editStatus, setEditStatus] = useState<string>('UNPAID')
  const [savingEdit, setSavingEdit] = useState(false)

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchTransactions = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .neq('payment_status', 'PAID')
      .neq('payment_status', 'CANCELLED')
      .order('id', { ascending: false })

    if (error) {
      showToast('Gagal memuat data: ' + error.message, 'error')
    } else if (data) {
      setTransactions(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchTransactions()
  }, [])

  // Checkbox Individual
  const handleToggleCheck = (id: number) => {
    setCheckedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  // Checkbox Select All
  const availableTransactions = transactions.filter((tx) => !tx.is_carried)
  const isAllChecked =
    availableTransactions.length > 0 &&
    availableTransactions.every((tx) => checkedIds.includes(tx.id))

  const handleToggleSelectAll = () => {
    if (isAllChecked) {
      setCheckedIds([])
    } else {
      setCheckedIds(availableTransactions.map((tx) => tx.id))
    }
  }

  // Serahkan Nota ke Sales
  const handleBatchAssign = async () => {
    if (!selectedSales) {
      showToast('Pilih Sales bertugas terlebih dahulu!', 'error')
      return
    }
    if (checkedIds.length === 0) {
      showToast('Pilih minimal satu nota tagihan!', 'error')
      return
    }

    setLoading(true)
    const { error } = await supabase
      .from('transactions')
      .update({
        is_carried: true,
        assigned_sales: selectedSales,
      })
      .in('id', checkedIds)

    if (error) {
      showToast('Gagal menyerahkan nota: ' + error.message, 'error')
    } else {
      showToast(`Berhasil menyerahkan ${checkedIds.length} nota ke ${selectedSales}!`, 'success')
      setCheckedIds([])
      fetchTransactions()
    }
    setLoading(false)
  }

  // Batal Bawa Nota
  const handleCancelCarried = async (txId: number) => {
    const { error } = await supabase
      .from('transactions')
      .update({
        is_carried: false,
        assigned_sales: null,
      })
      .eq('id', txId)

    if (error) {
      showToast('Gagal membatalkan: ' + error.message, 'error')
    } else {
      showToast('Penyerahan nota dibatalkan.', 'success')
      fetchTransactions()
    }
  }

  // 🚀 LANGSUNG SET LUNAS (Toko Bayar Transfer / Bayar Langsung ke Kantor)
  const handleQuickMarkPaid = async (tx: Transaction) => {
    if (
      !confirm(
        `Tandai nota toko ${tx.customer_name} sebesar Rp ${tx.total_price.toLocaleString(
          'id-ID'
        )} sebagai LUNAS (Transfer/Direct)?`
      )
    )
      return

    const existingHistory = Array.isArray(tx.payment_history) ? tx.payment_history : []
    const remainingAmount = tx.total_price - (tx.paid_amount || 0)

    const updatedHistory = [
      ...existingHistory,
      {
        amount: remainingAmount,
        date: new Date().toISOString(),
        sales_name: 'Admin / Kantor',
        note: 'Pembayaran Transfer Bank / Direct Kantor',
      },
    ]

    const { error } = await supabase
      .from('transactions')
      .update({
        paid_amount: tx.total_price,
        payment_status: 'PAID',
        payment_history: updatedHistory,
        is_carried: false,
        assigned_sales: null,
      })
      .eq('id', tx.id)

    if (error) {
      showToast('Gagal update status lunas: ' + error.message, 'error')
    } else {
      showToast(`✅ Nota ${tx.customer_name} berhasil ditandai LUNAS!`, 'success')
      fetchTransactions()
    }
  }

  // Simpan Setoran Cash yang Dibawa Sales
  const handleSaveSalesCash = async () => {
    if (!cashModalTarget) return
    const payNum = Number(cashAmount) || 0

    if (payNum <= 0) {
      showToast('Masukkan nominal setoran cash yang valid!', 'error')
      return
    }

    setIsSavingPay(true)

    const currentPaid = Number(cashModalTarget.paid_amount || 0)
    const newPaidTotal = currentPaid + payNum
    const isFullPaid = newPaidTotal >= cashModalTarget.total_price
    const newStatus = isFullPaid ? 'PAID' : 'PARTIAL'

    const existingHistory = Array.isArray(cashModalTarget.payment_history)
      ? cashModalTarget.payment_history
      : []

    const newHistoryItem = {
      amount: payNum,
      date: new Date().toISOString(),
      sales_name: collectorName || cashModalTarget.assigned_sales || 'Sales',
      note: 'Setoran Cash Penagihan Sales',
    }

    const updatedHistory = [...existingHistory, newHistoryItem]

    const { error } = await supabase
      .from('transactions')
      .update({
        paid_amount: newPaidTotal,
        payment_status: newStatus,
        payment_history: updatedHistory,
        is_carried: false,
        assigned_sales: null,
      })
      .eq('id', cashModalTarget.id)

    setIsSavingPay(false)

    if (error) {
      showToast('Gagal menyimpan setoran: ' + error.message, 'error')
    } else {
      showToast(
        `✅ Setoran cash Rp ${payNum.toLocaleString('id-ID')} dari ${collectorName} berhasil dicatat!`,
        'success'
      )
      setCashModalTarget(null)
      setCashAmount('')
      fetchTransactions()
    }
  }

  // Open Edit Modal
  const handleOpenEdit = (tx: Transaction) => {
    setEditingTx(tx)
    const rawDate = tx.created_at ? tx.created_at.substring(0, 10) : (tx.transaction_date || '')
    setEditDate(rawDate)
    setEditProduct(tx.product_name || tx.items_summary || '')
    setEditPrice(tx.total_price || 0)
    setEditPaidAmount(tx.paid_amount || 0)
    setEditStatus(tx.payment_status || 'UNPAID')
  }

  // Save Edit Manual
  const handleSaveEdit = async () => {
    if (!editingTx) return
    setSavingEdit(true)

    const formattedCreatedAt = editDate ? `${editDate}T12:00:00` : new Date().toISOString()
    const isFull = editPaidAmount >= editPrice
    const calculatedStatus = isFull ? 'PAID' : editPaidAmount > 0 ? 'PARTIAL' : editStatus

    const { error } = await supabase
      .from('transactions')
      .update({
        created_at: formattedCreatedAt,
        transaction_date: editDate,
        product_name: editProduct,
        total_price: Number(editPrice),
        paid_amount: Number(editPaidAmount),
        payment_status: calculatedStatus,
        is_carried: calculatedStatus === 'PAID' ? false : editingTx.is_carried,
      })
      .eq('id', editingTx.id)

    if (error) {
      showToast('Gagal update: ' + error.message, 'error')
    } else {
      showToast('Data nota diperbarui!', 'success')
      setEditingTx(null)
      fetchTransactions()
    }
    setSavingEdit(false)
  }

  const filteredTransactions = transactions.filter(
    (tx) =>
      tx.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      (tx.product_name || tx.items_summary || '').toLowerCase().includes(search.toLowerCase())
  )

  const totalPiutang = transactions.reduce(
    (sum, tx) => sum + ((tx.total_price || 0) - (tx.paid_amount || 0)),
    0
  )

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 text-slate-100 relative">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl border text-xs font-bold transition-all ${
            toast.type === 'error'
              ? 'bg-rose-950 border-rose-800 text-rose-200'
              : 'bg-emerald-950 border-emerald-800 text-emerald-200'
          }`}
        >
          <span>{toast.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Page Tagihan Sales */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-blue-400 transition gap-1 mb-1"
        >
          ← Kembali ke Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0b1329] p-5 rounded-2xl border border-slate-800 shadow-xl">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span>📄</span> Daftar Tagihan Sales
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Pilih Sales untuk membawa nota tagihan, atur setoran cash, atau langsung klik Set Lunas jika toko bayar transfer.
            </p>
          </div>
          <div className="bg-[#070c1a] border border-slate-800 px-4 py-2.5 rounded-xl text-right shrink-0">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
              Total Piutang Belum Tertagih
            </span>
            <span className="text-lg font-black text-amber-400">
              Rp {totalPiutang.toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      </div>

      {/* BAR PENYERAHAN NOTA & PENCARIAN */}
      <div className="bg-[#0b1329] border border-slate-800 p-4 rounded-2xl shadow-xl flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <select
            value={selectedSales}
            onChange={(e) => setSelectedSales(e.target.value)}
            className="px-4 py-2.5 bg-[#070c1a] border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-blue-500 transition cursor-pointer min-w-[200px]"
          >
            <option value="">-- Pilih Sales Bertugas --</option>
            {SALES_OPTIONS.map((sales) => (
              <option key={sales} value={sales}>
                👤 {sales}
              </option>
            ))}
          </select>

          <button
            onClick={handleBatchAssign}
            disabled={loading || !selectedSales || checkedIds.length === 0}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/20 transition active:scale-95 flex items-center gap-2"
          >
            <span>Serahkan ({checkedIds.length}) Nota 💼</span>
          </button>
        </div>

        <div className="bg-[#070c1a] border border-slate-800 px-3 py-2 rounded-xl flex items-center gap-2 md:w-64">
          <span className="text-slate-400 text-xs">🔍</span>
          <input
            type="text"
            placeholder="Cari toko/barang..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {/* TABEL TAGIHAN SALES */}
      <div className="bg-[#0b1329] border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 animate-pulse">Memuat data tagihan...</div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Tidak ada nota piutang yang ditemukan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#070c1a] text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllChecked}
                      onChange={handleToggleSelectAll}
                      className="rounded border-slate-700 bg-[#0b1329] text-blue-600 focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-4">Toko Tujuan</th>
                  <th className="py-3.5 px-4">Tanggal Nota</th>
                  <th className="py-3.5 px-4">Pesanan Barang</th>
                  <th className="py-3.5 px-4 text-right">Total Nota</th>
                  <th className="py-3.5 px-4 text-right">Sisa Tagihan</th>
                  <th className="py-3.5 px-4 text-center">Status / Sales Bawa</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredTransactions.map((tx) => {
                  const remaining = (tx.total_price || 0) - (tx.paid_amount || 0)
                  const isCarried = tx.is_carried
                  const isChecked = checkedIds.includes(tx.id)
                  const displayDate = tx.created_at || tx.transaction_date
                  const displayProduct = tx.product_name || tx.items_summary || '-'

                  return (
                    <tr
                      key={tx.id}
                      className={`transition ${
                        isChecked
                          ? 'bg-blue-950/30'
                          : isCarried
                          ? 'bg-slate-900/40 opacity-80'
                          : 'hover:bg-slate-800/30'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        {!isCarried ? (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleCheck(tx.id)}
                            className="rounded border-slate-700 bg-[#070c1a] text-blue-600 focus:ring-0 w-4 h-4 cursor-pointer"
                          />
                        ) : (
                          <span className="text-slate-600" title="Nota sedang dibawa sales">🔒</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-100">
                        🏪 {tx.customer_name}
                      </td>

                      <td className="py-3.5 px-4 text-slate-300 font-medium whitespace-nowrap">
                        📅 {formatDate(displayDate)}
                      </td>

                      <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate" title={displayProduct}>
                        {displayProduct}
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-slate-200">
                        Rp {(tx.total_price || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-rose-400">
                        Rp {remaining.toLocaleString('id-ID')}
                      </td>

                      {/* Status Sales Penagih */}
                      <td className="py-3.5 px-4 text-center">
                        {isCarried ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2.5 py-1 rounded-xl">
                              👤 {tx.assigned_sales}
                            </span>
                            <button
                              onClick={() => handleCancelCarried(tx.id)}
                              className="text-[10px] font-bold text-rose-400 hover:underline"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500 bg-slate-800/40 px-2 py-1 rounded-lg">
                            Belum Dibawa
                          </span>
                        )}
                      </td>

                      {/* Aksi Pelunasan */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {isCarried ? (
                            /* SALES SERAHKAN CASH HASIL NAGIH */
                            <button
                              onClick={() => {
                                setCashModalTarget(tx)
                                setCashAmount((tx.total_price || 0) - (tx.paid_amount || 0))
                                setCollectorName(tx.assigned_sales || 'Eko')
                              }}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] px-2.5 py-1 rounded-lg shadow transition flex items-center gap-1"
                            >
                              💵 Terima Cash
                            </button>
                          ) : (
                            /* TOKO BAYAR TRANSFER ATAU LANGSUNG KE KANTOR */
                            <button
                              onClick={() => handleQuickMarkPaid(tx)}
                              className="bg-emerald-950/80 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-800 font-bold text-[11px] px-2.5 py-1 rounded-lg transition flex items-center gap-1"
                              title="Toko Bayar via Transfer Bank / Langsung ke Kantor"
                            >
                              ✅ Set Lunas
                            </button>
                          )}

                          {/* Edit Data / Status Nota */}
                          <button
                            onClick={() => handleOpenEdit(tx)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 text-[11px] font-semibold transition"
                            title="Edit Data / Status Nota"
                          >
                            ✏️
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

      {/* 💵 MODAL INPUT SETORAN CASH SALES */}
      {cashModalTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1329] border border-slate-800 p-6 rounded-2xl max-w-md w-full space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm sm:text-base text-emerald-400 flex items-center gap-2">
                <span>💵</span> Terima Uang Cash dari Sales
              </h3>
              <button
                onClick={() => setCashModalTarget(null)}
                className="text-slate-400 hover:text-white font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-[#070c1a] p-3.5 rounded-xl border border-slate-800/80 space-y-1.5">
                <div className="text-slate-400">
                  Toko: <strong className="text-white">{cashModalTarget.customer_name}</strong>
                </div>
                <div className="text-slate-400">
                  Sales Penagih:{' '}
                  <strong className="text-emerald-400">
                    {cashModalTarget.assigned_sales || collectorName}
                  </strong>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Total Nota:</span>
                  <span className="font-bold text-blue-400">
                    Rp {(cashModalTarget.total_price || 0).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Sudah Dibayar:</span>
                  <span className="font-bold text-emerald-400">
                    Rp {(cashModalTarget.paid_amount || 0).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Sisa Tagihan:</span>
                  <span className="font-bold text-rose-400">
                    Rp{' '}
                    {(
                      (cashModalTarget.total_price || 0) - (cashModalTarget.paid_amount || 0)
                    ).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Sales / Petugas Penyerah Uang
                </label>
                <input
                  type="text"
                  value={collectorName}
                  onChange={(e) => setCollectorName(e.target.value)}
                  placeholder="Nama sales..."
                  className="w-full bg-[#070c1a] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Nominal Uang Cash Disetorkan (Rp)
                </label>
                <input
                  type="number"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value ? Number(e.target.value) : '')}
                  placeholder="Masukkan nominal setoran..."
                  className="w-full bg-[#070c1a] border border-slate-800 rounded-xl p-2.5 text-sm font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setCashModalTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 transition"
              >
                Batal
              </button>
              <button
                onClick={handleSaveSalesCash}
                disabled={isSavingPay}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2 rounded-xl transition disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
              >
                {isSavingPay ? 'Menyimpan...' : '💾 Simpan Setoran Cash'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✏️ MODAL EDIT DATA NOTA & ATUR STATUS */}
      {editingTx && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1329] border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>✏️</span> Edit Nota {editingTx.customer_name}
              </h3>
              <button
                onClick={() => setEditingTx(null)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Tanggal Transaksi</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="bg-slate-800 text-white border border-slate-700 rounded-xl p-2.5 [color-scheme:dark] w-full"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Pesanan Barang / Rincian</label>
                <textarea
                  rows={2}
                  value={editProduct}
                  onChange={(e) => setEditProduct(e.target.value)}
                  className="w-full bg-[#070c1a] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Total Nota (Rp)</label>
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(Number(e.target.value))}
                    className="w-full bg-[#070c1a] border border-slate-700 rounded-xl p-2.5 text-white font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Sudah Dibayar (Rp)</label>
                  <input
                    type="number"
                    value={editPaidAmount}
                    onChange={(e) => setEditPaidAmount(Number(e.target.value))}
                    className="w-full bg-[#070c1a] border border-slate-700 rounded-xl p-2.5 text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Status Pembayaran</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-[#070c1a] border border-slate-700 rounded-xl p-2.5 text-white font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="UNPAID">🔴 UNPAID (Belum Bayar)</option>
                  <option value="PARTIAL">🟡 PARTIAL (Nyicil Sebagian)</option>
                  <option value="PAID">🟢 PAID (Sudah Lunas)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setEditingTx(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
              >
                Batal
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/20"
              >
                {savingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}