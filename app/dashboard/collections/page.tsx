'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Transaction {
  id: number
  customer_name: string
  created_at?: string
  due_date?: string
  total_price: number
  paid_amount: number
  items_summary?: string
  assigned_sales?: string | null
  is_carried?: boolean
}

const SALES_OPTIONS = ['Eko']

export default function CollectionPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  
  // State untuk Batch Assignment
  const [selectedSales, setSelectedSales] = useState<string>('')
  const [checkedIds, setCheckedIds] = useState<number[]>([])

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

  // Checkbox Handler Individual
  const handleToggleCheck = (id: number) => {
    setCheckedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  // Checkbox Select All (Hanya yang belum dibawa sales)
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

  // Proses Serahkan Nota Secara Massal (Batch)
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

  // Batal Bawa Nota Per Baris
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

  const filteredTransactions = transactions.filter(
    (tx) =>
      tx.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      tx.items_summary?.toLowerCase().includes(search.toLowerCase())
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

      {/* Header */}
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
              <span>📋</span> Daftar Penagihan Piutang
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Pilih Sales terlebih dahulu, centang nota toko yang dibawa, lalu klik simpan.
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

      {/* BAR PENYERAHAN BATCH & PENCARIAN */}
      <div className="bg-[#0b1329] border border-slate-800 p-4 rounded-2xl shadow-xl flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Kontrol Penyerahan Sales */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <select
            value={selectedSales}
            onChange={(e) => setSelectedSales(e.target.value)}
            className="px-4 py-2.5 bg-[#070c1a] border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-blue-500 transition cursor-pointer min-w-[180px]"
          >
            <option value="">-- 1. Pilih Sales Bertugas --</option>
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
            <span>Serahkan ({checkedIds.length}) Nota 🏍️</span>
          </button>
        </div>

        {/* Input Cari */}
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

      {/* Tabel Tagihan */}
      <div className="bg-[#0b1329] border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Memuat data nota...</div>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredTransactions.map((tx) => {
                  const remaining = (tx.total_price || 0) - (tx.paid_amount || 0)
                  const isCarried = tx.is_carried
                  const isChecked = checkedIds.includes(tx.id)

                  return (
                    <tr
                      key={tx.id}
                      className={`transition ${
                        isChecked
                          ? 'bg-blue-950/30'
                          : isCarried
                          ? 'bg-slate-900/40 opacity-75'
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
                          <span className="text-slate-600">🔒</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-100">
                        🏪 {tx.customer_name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        📅 {tx.created_at ? tx.created_at.substring(0, 10) : tx.due_date || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate">
                        {tx.items_summary || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-200">
                        Rp {(tx.total_price || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-rose-400">
                        Rp {remaining.toLocaleString('id-ID')}
                      </td>

                      {/* Status / Aksi Batal */}
                      <td className="py-3.5 px-4 text-center">
                        {isCarried ? (
                          <div className="flex items-center justify-center gap-2">
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
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}