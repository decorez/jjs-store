'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function ReportsPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTransactions() {
      const { data } = await supabase.from('transactions').select('*').order('id', { ascending: false })
      if (data) setTransactions(data)
      setLoading(false)
    }
    fetchTransactions()
  }, [])

  const formatStatus = (status: string) => {
    if (!status) return 'UNPAID'
    const upper = status.toUpperCase()
    if (upper === 'PAID' || upper === 'LUNAS') return 'PAID'
    return 'UNPAID'
  }

  const totalOmset = transactions.reduce((sum, tx) => sum + Number(tx.total_price || 0), 0)
  
  const totalPaid = transactions
    .filter(tx => formatStatus(tx.payment_status) === 'PAID')
    .reduce((sum, tx) => sum + Number(tx.total_price || 0), 0)

  const totalUnpaid = transactions
    .filter(tx => formatStatus(tx.payment_status) !== 'PAID')
    .reduce((sum, tx) => sum + Number(tx.total_price || 0), 0)

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      {/* Tombol Kembali */}
      <div>
        <Link 
          href="/dashboard"
          className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white transition gap-1"
        >
          ← Kembali ke Dashboard
        </Link>
      </div>

      {/* Header Utama */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-2xl space-y-1">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <span>📊</span> Laporan & Rekapitulasi Keuangan
        </h1>
        <p className="text-xs text-slate-400">
          Ringkasan akumulasi total penjualan, realisasi kas masuk (Paid), dan sisa piutang (Unpaid).
        </p>
      </div>

      {/* Ringkasan Metrics / KPI Cards */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 font-medium animate-pulse bg-slate-900 rounded-2xl border border-slate-800">
          Memuat laporan keuangan...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Total Omset */}
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-3 relative overflow-hidden">
            <div className="absolute -right-2 -top-2 w-20 h-20 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Keseluruhan Omset
            </span>
            <div className="text-2xl sm:text-3xl font-black text-blue-400">
              Rp {totalOmset.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-slate-500">Akumulasi nilai seluruh transaksi nota tercatat.</p>
          </div>

          {/* Kas Masuk (PAID) */}
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-3 relative overflow-hidden">
            <div className="absolute -right-2 -top-2 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Kas Masuk (PAID)
            </span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400">
              Rp {totalPaid.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-slate-500">Total dana tunai yang sudah lunas diterima.</p>
          </div>

          {/* Total Tagihan (UNPAID) */}
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-3 relative overflow-hidden">
            <div className="absolute -right-2 -top-2 w-20 h-20 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Tagihan (UNPAID)
            </span>
            <div className="text-2xl sm:text-3xl font-black text-amber-400">
              Rp {totalUnpaid.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-slate-500">Sisa piutang dagang yang belum dibayar toko.</p>
          </div>
        </div>
      )}

      {/* Tabel 10 Transaksi Terakhir */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl p-6 space-y-4">
        <h3 className="font-bold text-white text-base flex items-center gap-2">
          <span>🕒</span> 10 Transaksi Terakhir
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="p-3.5">Toko / Pembeli</th>
                <th className="p-3.5">Produk</th>
                <th className="p-3.5 text-center">Jumlah</th>
                <th className="p-3.5 text-right">Total Transaksi</th>
                <th className="p-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-500">
                    Belum ada riwayat transaksi.
                  </td>
                </tr>
              ) : (
                transactions.slice(0, 10).map((tx) => {
                  const displayStatus = formatStatus(tx.payment_status)
                  const isPaid = displayStatus === 'PAID'

                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3.5 font-semibold text-slate-100">{tx.customer_name}</td>
                      <td className="p-3.5 text-slate-300">{tx.product_name || '-'}</td>
                      <td className="p-3.5 text-center text-slate-400 font-medium">
                        {tx.qty} {tx.unit}
                      </td>
                      <td className="p-3.5 text-right font-bold text-slate-100">
                        Rp {Number(tx.total_price || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${
                          isPaid 
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/50' 
                            : 'bg-amber-950/60 text-amber-400 border-amber-800/50'
                        }`}>
                          {displayStatus}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}