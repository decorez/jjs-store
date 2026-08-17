'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Transaction {
  id: number
  created_at: string
  transaction_date?: string
  customer_name: string
  product_name: string
  total_price: number
  paid_amount: number
  payment_status: string
}

export default function ReportsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTransactions = async () => {
    setLoading(true)
    // 🔍 Menambahkan filter .neq('payment_status', 'CANCELLED')
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .neq('payment_status', 'CANCELLED') // 👈 Mengabaikan transaksi yang dibatalkan
      .order('id', { ascending: false })

    if (data) setTransactions(data)
    if (error) console.error('Error fetching transactions:', error.message)
    setLoading(false)
  }

  useEffect(() => {
    fetchTransactions()
  }, [])

  // Kalkulasi Akurat & Akumulatif (Sinkron dengan halaman Sales)
  const totalOmzet = transactions.reduce((sum, tx) => sum + (Number(tx.total_price) || 0), 0)
  const totalPaidCash = transactions.reduce((sum, tx) => sum + (Number(tx.paid_amount) || 0), 0)
  const totalPiutang = totalOmzet - totalPaidCash

  return (
    <div className="p-3.5 sm:p-6 max-w-7xl mx-auto space-y-6 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Header Navigasi */}
      <div className="flex items-center justify-between">
        <Link 
          href="/dashboard"
          className="inline-flex items-center text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition gap-1"
        >
          ← Kembali ke Dashboard
        </Link>
      </div>

      {/* Title Header */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-2xl transition-colors">
        <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span>📊</span> Laporan & Rekapitulasi Keuangan
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Ringkasan akumulasi total penjualan, realisasi kas masuk (Paid), dan sisa piutang (Unpaid).
        </p>
      </div>

      {/* Metric Cards (Sinkron 100%) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Omzet */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm dark:shadow-xl space-y-1 transition-colors">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Keseluruhan Omset
          </span>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
            {loading ? '...' : `Rp ${totalOmzet.toLocaleString('id-ID')}`}
          </div>
          <p className="text-[11px] text-slate-400">
            Akumulasi nilai seluruh transaksi nota tercatat.
          </p>
        </div>

        {/* Realisasi Kas Masuk */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm dark:shadow-xl space-y-1 transition-colors">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Kas Masuk (Paid)
          </span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {loading ? '...' : `Rp ${totalPaidCash.toLocaleString('id-ID')}`}
          </div>
          <p className="text-[11px] text-slate-400">
            Total dana tunai & cicilan yang sudah lunas/diterima.
          </p>
        </div>

        {/* Sisa Piutang */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm dark:shadow-xl space-y-1 transition-colors">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Tagihan (Unpaid)
          </span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {loading ? '...' : `Rp ${totalPiutang.toLocaleString('id-ID')}`}
          </div>
          <p className="text-[11px] text-slate-400">
            Sisa piutang dagang yang belum dibayar toko.
          </p>
        </div>
      </div>

      {/* Tabel Transaksi */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-2xl space-y-4 transition-colors">
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <span>🕒</span> Transaksi Terakhir
        </h2>

        {loading ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500 font-medium animate-pulse">
            Memuat laporan...
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full min-w-[700px] text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-950/80">
                  <th className="p-3.5">Toko / Pembeli</th>
                  <th className="p-3.5">Produk</th>
                  <th className="p-3.5 text-right">Total Transaksi</th>
                  <th className="p-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-sm">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-slate-400">
                      Belum ada transaksi.
                    </td>
                  </tr>
                ) : (
                  transactions.slice(0, 15).map((tx) => {
                    const total = tx.total_price || 0
                    const paid = tx.paid_amount || 0
                    const remaining = total - paid
                    
                    const isPaid = tx.payment_status === 'PAID' || remaining <= 0
                    const isPartial = tx.payment_status === 'PARTIAL' || (paid > 0 && remaining > 0)

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="p-3.5 font-semibold text-slate-800 dark:text-slate-200">
                          {tx.customer_name}
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-300 max-w-xs truncate" title={tx.product_name}>
                          {tx.product_name || '-'}
                        </td>
                        <td className="p-3.5 text-right font-bold text-slate-900 dark:text-white">
                          Rp {total.toLocaleString('id-ID')}
                        </td>
                        <td className="p-3.5 text-center whitespace-nowrap">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${
                            isPaid 
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                              : isPartial
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                          }`}>
                            {isPaid ? 'PAID' : isPartial ? 'PARTIAL' : 'UNPAID'}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}