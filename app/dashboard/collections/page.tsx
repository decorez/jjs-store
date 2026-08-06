'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function CollectionsAssignmentPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [salesName, setSalesName] = useState('')
  const [activeTab, setActiveTab] = useState<'available' | 'carried'>('available')

  // Fetch nota yang belum lunas
  async function fetchTransactions() {
    setLoading(true)
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .neq('payment_status', 'PAID')
      .order('due_date', { ascending: true, nullsFirst: false })

    if (data) setTransactions(data)
    if (error) console.error('Error:', error.message)
    setLoading(false)
  }

  useEffect(() => {
    fetchTransactions()
  }, [])

  // Filter berdasarkan tab (Nota di toko vs Nota sedang dibawa sales)
  const availableList = transactions.filter(tx => !tx.is_carried)
  const carriedList = transactions.filter(tx => tx.is_carried)

  // Toggle checklist satuan
  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  // Toggle checklist semua
  const toggleSelectAll = () => {
    if (selectedIds.length === availableList.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(availableList.map(tx => tx.id))
    }
  }

  // Hitung total nilai tagihan dari nota yang dicentang
  const selectedTotal = availableList
    .filter(tx => selectedIds.includes(tx.id))
    .reduce((sum, tx) => sum + ((tx.total_price || 0) - (tx.paid_amount || 0)), 0)

  // Proses penyerahan nota ke sales
  const handleAssignToSales = async () => {
    if (selectedIds.length === 0) {
      alert('Pilih minimal 1 nota yang akan dibawa sales!')
      return
    }
    if (!salesName.trim()) {
      alert('Masukkan nama sales yang bertugas!')
      return
    }

    const { error } = await supabase
      .from('transactions')
      .update({
        is_carried: true,
        assigned_sales: salesName.trim()
      })
      .in('id', selectedIds)

    if (!error) {
      alert(`Berhasil menyerahkan ${selectedIds.length} nota ke Sales: ${salesName}`)
      setSelectedIds([])
      setSalesName('')
      fetchTransactions()
    } else {
      alert('Gagal memperbarui nota: ' + error.message)
    }
  }

  // Kembalikan nota ke toko / batal dibawa sales
  const handleReturnToStore = async (id: number) => {
    const { error } = await supabase
      .from('transactions')
      .update({
        is_carried: false,
        assigned_sales: null
      })
      .eq('id', id)

    if (!error) {
      fetchTransactions()
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      {/* Tombol Kembali */}
      <Link 
        href="/dashboard" 
        className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white transition gap-1"
      >
        ← Kembali ke Dashboard
      </Link>

      {/* Header Utama & Tab Switcher */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🚚</span> Penugasan Nota Penagihan Sales
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Pilih nota piutang yang akan dibawa sales untuk ditagih hari ini.
          </p>
        </div>

        {/* Tab Filter */}
        <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('available')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === 'available' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Siap Dibawa ({availableList.length})
          </button>
          <button
            onClick={() => setActiveTab('carried')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === 'carried' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sedang Dibawa Sales ({carriedList.length})
          </button>
        </div>
      </div>

      {activeTab === 'available' ? (
        <div className="space-y-4">
          {/* Form Penyerahan ke Sales */}
          {availableList.length > 0 && (
            <div className="bg-slate-900 border border-blue-900/50 p-5 rounded-2xl shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-5">
              <div className="flex-1 space-y-1.5">
                <label className="block text-xs font-bold text-blue-400 uppercase tracking-wider">
                  Nama Sales Penagih
                </label>
                <input
                  type="text"
                  placeholder="Ketik nama sales (contoh: Budi / Andi)..."
                  value={salesName}
                  onChange={(e) => setSalesName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>

              <div className="flex flex-col sm:items-end justify-center">
                <span className="text-xs text-slate-400">Total Tagihan Dipilih ({selectedIds.length} Nota):</span>
                <span className="text-xl font-black text-blue-400">
                  Rp {selectedTotal.toLocaleString('id-ID')}
                </span>
              </div>

              <button
                onClick={handleAssignToSales}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-600/25 transition active:scale-95 whitespace-nowrap"
              >
                Serahkan Nota ke Sales 🚀
              </button>
            </div>
          )}

          {/* Tabel Nota Siap Dibawa */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-500 font-medium animate-pulse">
                Memuat data nota...
              </div>
            ) : availableList.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                Tidak ada nota piutang yang perlu ditagih saat ini 🎉
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <th className="p-4 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.length === availableList.length && availableList.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                        />
                      </th>
                      <th className="p-4">Toko / Pembeli</th>
                      <th className="p-4">Tanggal Transaksi</th>
                      <th className="p-4">Jatuh Tempo</th>
                      <th className="p-4 text-right">Total Nota</th>
                      <th className="p-4 text-right">Sisa Tagihan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {availableList.map((tx) => {
                      const isSelected = selectedIds.includes(tx.id)
                      const remaining = (tx.total_price || 0) - (tx.paid_amount || 0)

                      return (
                        <tr
                          key={tx.id}
                          onClick={() => toggleSelect(tx.id)}
                          className={`cursor-pointer transition ${
                            isSelected ? 'bg-blue-900/20' : 'hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(tx.id)}
                              className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                            />
                          </td>
                          <td className="p-4 font-semibold text-slate-200">{tx.customer_name}</td>
                          <td className="p-4 text-slate-400 text-xs">
                            {tx.transaction_date ? new Date(tx.transaction_date + 'T00:00:00').toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}
                          </td>
                          <td className="p-4 font-medium text-amber-400 text-xs">
                            {tx.due_date ? new Date(tx.due_date + 'T00:00:00').toLocaleDateString('id-ID', { dateStyle: 'medium' }) : 'Tanpa Tempo'}
                          </td>
                          <td className="p-4 text-right font-medium text-slate-300">
                            Rp {(tx.total_price || 0).toLocaleString('id-ID')}
                          </td>
                          <td className="p-4 text-right font-bold text-rose-400">
                            Rp {remaining.toLocaleString('id-ID')}
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
      ) : (
        /* Tabel Nota Sedang Dibawa Sales */
        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
          {carriedList.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              Belum ada nota yang sedang dibawa sales.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="p-4">Sales Penagih</th>
                    <th className="p-4">Toko / Pembeli</th>
                    <th className="p-4">Jatuh Tempo</th>
                    <th className="p-4 text-right">Sisa Tagihan</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {carriedList.map((tx) => {
                    const remaining = (tx.total_price || 0) - (tx.paid_amount || 0)
                    return (
                      <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-4 font-bold text-blue-400 flex items-center gap-2">
                          <span>👤</span> {tx.assigned_sales || 'Sales'}
                        </td>
                        <td className="p-4 font-semibold text-slate-200">{tx.customer_name}</td>
                        <td className="p-4 text-slate-400 text-xs">
                          {tx.due_date ? new Date(tx.due_date + 'T00:00:00').toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}
                        </td>
                        <td className="p-4 text-right font-bold text-rose-400">
                          Rp {remaining.toLocaleString('id-ID')}
                        </td>
                        <td className="p-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleReturnToStore(tx.id)}
                            className="text-xs px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold rounded-lg border border-slate-700/50 transition"
                          >
                            Batal Dibawa
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}