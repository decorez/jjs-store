'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface PaymentLog {
  amount: number
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
  payment_history?: PaymentLog[] // 👈 Tipe data riwayat pembayaran
}

export default function SettlementPage() {
  const [salesList, setSalesList] = useState<string[]>([])
  const [selectedSales, setSelectedSales] = useState<string>('')
  const [carriedNotes, setCarriedNotes] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)

  // State form input setoran per transaksi { [id]: { amount: number, newDueDate: string } }
  const [settlementData, setSettlementData] = useState<{
    [key: number]: { amount: string; newDueDate: string }
  }>({})

  // Fetch daftar sales yang sedang membawa nota
  useEffect(() => {
    async function fetchActiveSales() {
      const { data } = await supabase
        .from('transactions')
        .select('assigned_sales')
        .eq('is_carried', true)

      if (data) {
        const uniqueSales = Array.from(
          new Set(data.map((item) => item.assigned_sales).filter(Boolean))
        )
        setSalesList(uniqueSales as string[])
      }
    }
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
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('is_carried', true)
        .eq('assigned_sales', selectedSales)

      if (data) {
        setCarriedNotes(data)
        // Inisialisasi state setoran
        const initialMap: { [key: number]: { amount: string; newDueDate: string } } = {}
        data.forEach((item) => {
          initialMap[item.id] = {
            amount: '0',
            newDueDate: item.due_date || '',
          }
        })
        setSettlementData(initialMap)
      }
      setLoading(false)
    }

    fetchCarriedNotes()
  }, [selectedSales])

  // Handle perubahan nominal bayar atau tanggal tempo baru
  const handleInputChange = (id: number, field: 'amount' | 'newDueDate', value: string) => {
    setSettlementData((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }))
  }

  // Hitung total fisik uang tunai yang harus diterima kasir dari Sales
  const totalCashToReceive = carriedNotes.reduce((sum, item) => {
    const inputVal = Number(settlementData[item.id]?.amount) || 0
    return sum + inputVal
  }, 0)

  // Simpan/Proses Seluruh Setoran Sales
  const handleSubmitSettlement = async () => {
    if (!selectedSales) return

    const confirmProcess = confirm(
      `Proses setoran untuk sales ${selectedSales}?\nTotal Uang Tunai Diterima: Rp ${totalCashToReceive.toLocaleString('id-ID')}`
    )
    if (!confirmProcess) return

    setLoading(true)

    for (const item of carriedNotes) {
      const input = settlementData[item.id]
      const addedPaid = Number(input?.amount) || 0

      // 1. Ambil riwayat pembayaran lama (jika ada)
      const oldHistory = Array.isArray(item.payment_history) ? item.payment_history : []
      let updatedHistory = [...oldHistory]

      // 2. Jika ada pembayaran masuk (> 0), catat tanggal, nominal, dan sales pencatatnya
      if (addedPaid > 0) {
        updatedHistory.push({
          amount: addedPaid,
          date: new Date().toISOString(),
          sales_name: selectedSales,
        })
      }

      const newTotalPaid = (item.paid_amount || 0) + addedPaid
      const remainingAfter = item.total_price - newTotalPaid

      // Tentukan status pembayaran baru
      let newStatus = 'UNPAID'
      if (remainingAfter <= 0) {
        newStatus = 'PAID'
      } else if (newTotalPaid > 0) {
        newStatus = 'PARTIAL'
      }

      // Update transaksi di Supabase
      await supabase
        .from('transactions')
        .update({
          paid_amount: newTotalPaid,
          payment_status: newStatus,
          due_date: input?.newDueDate || item.due_date,
          is_carried: false, // Nota dikembalikan/selesai penagihan hari ini
          assigned_sales: null,
          payment_history: updatedHistory, // 👈 Menyimpan array riwayat pembayaran
        })
        .eq('id', item.id)
    }

    alert('Berhasil memproses setoran sales dan merekam riwayat pembayaran!')
    setSelectedSales('')
    setCarriedNotes([])
    setLoading(false)

    // Reload list sales
    const { data } = await supabase
      .from('transactions')
      .select('assigned_sales')
      .eq('is_carried', true)

    if (data) {
      const uniqueSales = Array.from(
        new Set(data.map((item) => item.assigned_sales).filter(Boolean))
      )
      setSalesList(uniqueSales as string[])
    }
  }

  return (
    <div className="p-3.5 sm:p-6 max-w-7xl mx-auto space-y-6 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Tombol Kembali */}
      <Link
        href="/dashboard"
        className="inline-flex items-center text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition gap-1"
      >
        ← Kembali ke Dashboard
      </Link>

      {/* Header Utama */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>📥</span> Setoran & Rekapitulasi Sales
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Proses pelunasan, cicilan, dan pembaharuan janji bayar dari nota yang dibawa sales.
          </p>
        </div>

        {/* Pilih Sales */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
            Pilih Sales:
          </label>
          <select
            value={selectedSales}
            onChange={(e) => setSelectedSales(e.target.value)}
            className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
          >
            <option value="">-- Pilih Sales Bertugas --</option>
            {salesList.map((sales) => (
              <option key={sales} value={sales}>
                👤 {sales}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedSales && (
        <div className="space-y-5">
          {/* Bar Total Uang Masuk yang Diterima Kasir */}
          <div className="bg-emerald-50 dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/50 p-5 rounded-2xl shadow-sm dark:shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 transition-colors">
            <div>
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider block">
                Total Uang Tunai Diterima dari Sales ({selectedSales})
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Hitungan akumulasi dari seluruh setoran toko yang diinput.
              </span>
            </div>

            <div className="flex items-center gap-4 justify-between sm:justify-end">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                Rp {totalCashToReceive.toLocaleString('id-ID')}
              </span>
              <button
                onClick={handleSubmitSettlement}
                disabled={loading}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-emerald-600/25 transition active:scale-95 disabled:opacity-50 whitespace-nowrap"
              >
                {loading ? 'Memproses...' : 'Simpan Setoran Sales 💾'}
              </button>
            </div>
          </div>

          {/* Tabel Nota yang Dibawa */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-2xl overflow-hidden transition-colors">
            {carriedNotes.length === 0 ? (
              <div className="p-12 text-center text-slate-400 dark:text-slate-500">
                Sales ini tidak sedang membawa nota tagihan.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      <th className="p-4">Toko / Pembeli</th>
                      <th className="p-4 text-right">Sisa Tagihan</th>
                      <th className="p-4 w-48 text-center">Bayar Hari Ini (Rp)</th>
                      <th className="p-4 w-44 text-center">Tgl Tempo / Janji Baru</th>
                      <th className="p-4 text-center">Aksi Cepat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                    {carriedNotes.map((tx) => {
                      const remaining = (tx.total_price || 0) - (tx.paid_amount || 0)
                      const currentInput = settlementData[tx.id] || { amount: '0', newDueDate: '' }

                      return (
                        <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                          <td className="p-4">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">{tx.customer_name}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              Total Nota: Rp {(tx.total_price || 0).toLocaleString('id-ID')}
                            </div>
                          </td>

                          <td className="p-4 text-right font-bold text-rose-600 dark:text-rose-400">
                            Rp {remaining.toLocaleString('id-ID')}
                          </td>

                          {/* Input Bayar */}
                          <td className="p-4">
                            <input
                              type="number"
                              value={currentInput.amount}
                              onChange={(e) => handleInputChange(tx.id, 'amount', e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-right font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition text-sm"
                            />
                          </td>

                          {/* Input Tgl Janji Bayar Baru */}
                          <td className="p-4">
                            <input
                              type="date"
                              value={currentInput.newDueDate}
                              onChange={(e) => handleInputChange(tx.id, 'newDueDate', e.target.value)}
                              className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-center text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
                            />
                          </td>

                          {/* Tombol Aksi Cepat */}
                          <td className="p-4 text-center">
                            <div className="flex justify-center gap-1.5">
                              <button
                                onClick={() => handleInputChange(tx.id, 'amount', remaining.toString())}
                                className="px-2.5 py-1 text-xs bg-emerald-100 dark:bg-emerald-950/60 hover:bg-emerald-200 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-400 font-semibold rounded-lg border border-emerald-300 dark:border-emerald-800/50 transition"
                              >
                                Set Lunas
                              </button>
                              <button
                                onClick={() => handleInputChange(tx.id, 'amount', '0')}
                                className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-lg border border-slate-300 dark:border-slate-700 transition"
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
    </div>
  )
}