'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalOmzet: 0,
    totalPiutang: 0,
    notaAktif: 0,
    stokMenipis: 0,
  })
  const [recentTx, setRecentTx] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true)

      // Fetch Transaksi
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })

      // Fetch Produk
      const { data: products } = await supabase.from('products').select('*')

      if (transactions) {
        // Hitung Omzet
        const omzet = transactions.reduce((sum, tx) => sum + (Number(tx.total_price) || 0), 0)

        // Hitung Sisa Piutang (Belum Lunas)
        const piutang = transactions
          .filter((tx) => tx.payment_status !== 'PAID')
          .reduce((sum, tx) => sum + ((Number(tx.total_price) || 0) - (Number(tx.paid_amount) || 0)), 0)

        const activeInvoices = transactions.filter((tx) => tx.payment_status !== 'PAID').length

        setStats((prev) => ({
          ...prev,
          totalOmzet: omzet,
          totalPiutang: piutang,
          notaAktif: activeInvoices,
        }))

        setRecentTx(transactions.slice(0, 5))
      }

      if (products) {
        const lowStockCount = products.filter((p) => (Number(p.box_stock) || 0) < 5).length
        setStats((prev) => ({ ...prev, stokMenipis: lowStockCount }))
      }

      setLoading(false)
    }

    loadDashboardData()
  }, [])

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100">
      {/* Wrapper DALAM */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-8">
        {/* Header Welcoming */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              📊 <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Dashboard Ringkasan Toko</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Pantau arus kas, piutang pelanggan, dan penugasan sales secara real-time.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/invoice"
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition text-sm flex items-center gap-2 active:scale-95"
            >
              <span>➕</span> Buat Nota Baru
            </Link>
          </div>
        </div>

        {/* Grid Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Omzet Card */}
          <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-3 relative overflow-hidden group hover:border-emerald-500/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Omzet</span>
              <span className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 text-lg">💰</span>
            </div>
            <p className="text-2xl font-black text-white">
              {loading ? '...' : `Rp ${stats.totalOmzet.toLocaleString('id-ID')}`}
            </p>
            <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Akumulasi seluruh transaksi
            </span>
          </div>

          {/* Piutang Card */}
          <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-3 relative overflow-hidden group hover:border-rose-500/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sisa Piutang</span>
              <span className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20 text-lg">⏳</span>
            </div>
            <p className="text-2xl font-black text-rose-400">
              {loading ? '...' : `Rp ${stats.totalPiutang.toLocaleString('id-ID')}`}
            </p>
            <span className="text-xs text-rose-300 font-medium">
              {stats.notaAktif} Nota Belum Lunas
            </span>
          </div>

          {/* Penugasan Sales Card */}
          <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-3 relative overflow-hidden group hover:border-blue-500/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Penugasan Sales</span>
              <span className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 text-lg">🚚</span>
            </div>
            <p className="text-2xl font-black text-white">
              {loading ? '...' : `${stats.notaAktif} Tagihan`}
            </p>
            <Link href="/dashboard/collections" className="text-xs text-blue-400 font-semibold hover:text-blue-300 hover:underline">
              Atur Tagihan Sales →
            </Link>
          </div>

          {/* Stok Menipis Card */}
          <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-3 relative overflow-hidden group hover:border-amber-500/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Stok Menipis</span>
              <span className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 text-lg">📦</span>
            </div>
            <p className="text-2xl font-black text-amber-400">
              {loading ? '...' : `${stats.stokMenipis} Produk`}
            </p>
            <span className="text-xs text-slate-400 font-medium">
              Perlu dikulak kembali
            </span>
          </div>
        </div>

        {/* Menu Akses Cepat */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Akses Pintar</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <Link
              href="/dashboard/invoice"
              className="p-4 bg-slate-900 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/80 rounded-2xl transition text-center space-y-2 group shadow-lg"
            >
              <div className="text-2xl group-hover:scale-110 transition transform">📄</div>
              <div className="text-xs font-bold text-slate-200 group-hover:text-white">Input Nota</div>
            </Link>

            <Link
              href="/dashboard/sales"
              className="p-4 bg-slate-900 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/80 rounded-2xl transition text-center space-y-2 group shadow-lg"
            >
              <div className="text-2xl group-hover:scale-110 transition transform">📜</div>
              <div className="text-xs font-bold text-slate-200 group-hover:text-white">Rekap & Piutang</div>
            </Link>

            <Link
              href="/dashboard/collections"
              className="p-4 bg-slate-900 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/80 rounded-2xl transition text-center space-y-2 group shadow-lg"
            >
              <div className="text-2xl group-hover:scale-110 transition transform">🚚</div>
              <div className="text-xs font-bold text-slate-200 group-hover:text-white">Tagihan Sales</div>
            </Link>

            <Link
              href="/dashboard/products"
              className="p-4 bg-slate-900 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/80 rounded-2xl transition text-center space-y-2 group shadow-lg"
            >
              <div className="text-2xl group-hover:scale-110 transition transform">📦</div>
              <div className="text-xs font-bold text-slate-200 group-hover:text-white">Stok Produk</div>
            </Link>

            {/* Menu Laporan Keuangan Ditambahkan di Sini! */}
            <Link
              href="/dashboard/reports"
              className="p-4 bg-slate-900 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/80 rounded-2xl transition text-center space-y-2 group shadow-lg col-span-2 sm:col-span-1"
            >
              <div className="text-2xl group-hover:scale-110 transition transform">📊</div>
              <div className="text-xs font-bold text-slate-200 group-hover:text-white">Laporan Keuangan</div>
            </Link>
          </div>
        </div>

        {/* Transaksi Terbaru */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>🕒</span> Transaksi Terbaru
            </h2>
            <Link href="/dashboard/sales" className="text-xs font-semibold text-blue-400 hover:text-blue-300 hover:underline">
              Lihat Semua →
            </Link>
          </div>

          {recentTx.length === 0 ? (
            <p className="text-center py-6 text-slate-500 text-sm">Belum ada transaksi tercatat.</p>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {recentTx.map((tx) => (
                <div key={tx.id} className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-800/40 px-3 rounded-xl transition">
                  <div>
                    <p className="text-sm font-bold text-white">{tx.customer_name}</p>
                    <p className="text-xs text-slate-400">{tx.product_name}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-sm font-black text-slate-100">
                      Rp {(tx.total_price || 0).toLocaleString('id-ID')}
                    </p>
                    <span
                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        tx.payment_status === 'PAID'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {tx.payment_status === 'PAID' ? 'LUNAS' : 'TEMPO'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}