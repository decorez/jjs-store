'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Transaction {
  id: number
  customer_name: string
  total_price: number
  paid_amount: number
  payment_status: string
  created_at: string
}

interface CustomerDebt {
  name: string
  sisaPiutang: number
  totalNota: number
  maxAgeDays: number
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  // 🟢 Threshold umur nota dalam hari: 0 (Semua), 14 (2 Minggu), 30 (1 Bulan)
  const [overdueThreshold, setOverdueThreshold] = useState<number>(30)
  const [userName, setUserName] = useState<string>('')

  const [stats, setStats] = useState({
    totalOmzet: 0,
    sisaPiutang: 0,
    totalToko: 0,
    tokoMenunggak: 0,
  })
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [topDebtors, setTopDebtors] = useState<CustomerDebt[]>([])

  useEffect(() => {
    const getUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User'
        const formattedName = name.charAt(0).toUpperCase() + name.slice(1)
        setUserName(formattedName)
      }
    }

    getUserData()
    fetchDashboardData()
  }, [overdueThreshold]) // Re-fetch / hitung ulang jika filter umur diubah

  const fetchDashboardData = async () => {
    setLoading(true)

    const [resCust, resTx] = await Promise.all([
      supabase.from('customers').select('*'),
      supabase.from('transactions').select('*').order('created_at', { ascending: false }),
    ])

    const customers = resCust.data || []
    const transactions: Transaction[] = resTx.data || []

    let totalOmzet = 0
    let totalPiutang = 0
    const now = new Date().getTime()

    // Hitung Omzet & Total Piutang Keseluruhan
    transactions.forEach((tx) => {
      if (tx.payment_status !== 'CANCELLED') {
        totalOmzet += tx.total_price || 0
        const piutang = Math.max(0, (tx.total_price || 0) - (tx.paid_amount || 0))
        totalPiutang += piutang
      }
    })

    // Agregasi Piutang Per Toko Berdasarkan Umur Nota (Threshold)
    const debtorMap: { [key: string]: { sisaPiutang: number; totalNota: number; maxAgeDays: number } } = {}

    customers.forEach((cust) => {
      // Filter nota milik toko ini yang MASIH MEMILIKI PIUTANG
      const myUnpaidTxs = transactions.filter((tx) => {
        const isMyCust = tx.customer_name?.toLowerCase().trim() === cust.name?.toLowerCase().trim()
        const isNotCancelled = tx.payment_status !== 'CANCELLED'
        const sisa = Math.max(0, (tx.total_price || 0) - (tx.paid_amount || 0))
        
        // 🟢 Hitung Berapa Hari Umur Nota Ini
        const txDate = new Date(tx.created_at).getTime()
        const ageInDays = Math.floor((now - txDate) / (1000 * 60 * 60 * 24))

        // Syarat Menunggak: Ada Sisa Piutang DAN Umur Nota >= Threshold
        const isOverdue = overdueThreshold === 0 || ageInDays >= overdueThreshold

        return isMyCust && isNotCancelled && sisa > 0 && isOverdue
      })

      if (myUnpaidTxs.length > 0) {
        const sisaPiutang = myUnpaidTxs.reduce(
          (sum, tx) => sum + Math.max(0, (tx.total_price || 0) - (tx.paid_amount || 0)),
          0
        )

        // Cari umur nota tertua milik toko ini
        const maxAge = Math.max(
          ...myUnpaidTxs.map((tx) =>
            Math.floor((now - new Date(tx.created_at).getTime()) / (1000 * 60 * 60 * 24))
          )
        )

        debtorMap[cust.name] = {
          sisaPiutang,
          totalNota: myUnpaidTxs.length,
          maxAgeDays: maxAge,
        }
      }
    })

    const allDebtors = Object.keys(debtorMap)
      .map((name) => ({
        name,
        sisaPiutang: debtorMap[name].sisaPiutang,
        totalNota: debtorMap[name].totalNota,
        maxAgeDays: debtorMap[name].maxAgeDays,
      }))
      .sort((a, b) => b.sisaPiutang - a.sisaPiutang)

    setStats({
      totalOmzet,
      sisaPiutang: totalPiutang,
      totalToko: customers.length,
      tokoMenunggak: allDebtors.length, // Total toko yang menunggak > X hari
    })

    setRecentTransactions(transactions.slice(0, 8))
    setTopDebtors(allDebtors.slice(0, 5))
    setLoading(false)
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      {/* Header Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0b1329] border border-slate-800/80 rounded-2xl p-5 shadow-lg">
        <div>
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider block mb-1">
            Sistem Kasir JJ Group
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            Selamat Datang Kembali{userName ? `, ${userName}` : ''}! 👋
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Ringkasan performa penjualan, sisa tagihan toko, dan aktivitas transaksi terbaru.
          </p>
        </div>

        {/* Filter Umur Piutang & Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Dropdown Filter Umur Nota */}
          <div className="flex items-center gap-2 bg-[#070c1a] border border-slate-800 rounded-xl px-3 py-2">
            <span className="text-xs text-slate-400 font-medium">Umur Nota:</span>
            <select
              value={overdueThreshold}
              onChange={(e) => setOverdueThreshold(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-amber-400 focus:outline-none cursor-pointer"
            >
              <option value={0} className="bg-[#0b1329] text-white">Semua Piutang</option>
              <option value={14} className="bg-[#0b1329] text-white">&gt; 14 Hari (2 Mgg)</option>
              <option value={30} className="bg-[#0b1329] text-white">&gt; 30 Hari (1 Bln)</option>
            </select>
          </div>

          <Link
            href="/dashboard/invoice"
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg transition flex items-center gap-2"
          >
            ➕ Input Nota Baru
          </Link>
        </div>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Omzet */}
        <div className="bg-[#0b1329] border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Omzet</p>
              <h3 className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">
                {loading ? '...' : `Rp ${stats.totalOmzet.toLocaleString('id-ID')}`}
              </h3>
            </div>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 text-lg">
              💰
            </div>
          </div>
          <p className="mt-3 text-[11px] text-slate-500 font-medium">Akumulasi omzet penjualan</p>
        </div>

        {/* Card 2: Piutang */}
        <div className="bg-[#0b1329] border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Sisa Piutang Toko</p>
              <h3 className="text-xl sm:text-2xl font-black text-rose-400 mt-1">
                {loading ? '...' : `Rp ${stats.sisaPiutang.toLocaleString('id-ID')}`}
              </h3>
            </div>
            <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20 text-lg">
              ⏳
            </div>
          </div>
          <p className="mt-3 text-[11px] text-slate-500 font-medium">Total tagihan aktif</p>
        </div>

        {/* Card 3: Toko Terdaftar */}
        <div className="bg-[#0b1329] border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Toko Terdaftar</p>
              <h3 className="text-xl sm:text-2xl font-black text-blue-400 mt-1">
                {loading ? '...' : `${stats.totalToko} Toko`}
              </h3>
            </div>
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 text-lg">
              🏪
            </div>
          </div>
          <p className="mt-3 text-[11px] text-slate-500 font-medium">Master data pelanggan</p>
        </div>

        {/* Card 4: Toko Menunggak (Dinamis Sesuai Filter Umur) */}
        <div className="bg-[#0b1329] border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Toko Menunggak {overdueThreshold > 0 ? `(> ${overdueThreshold} Hari)` : ''}
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-amber-400 mt-1">
                {loading ? '...' : `${stats.tokoMenunggak} Toko`}
              </h3>
            </div>
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 text-lg">
              ⚠️
            </div>
          </div>
          <p className="mt-3 text-[11px] text-slate-500 font-medium">
            {overdueThreshold === 0 ? 'Memiliki sisa piutang' : `Belum lunas > ${overdueThreshold} hari`}
          </p>
        </div>
      </div>

      {/* Section 2 Kolom: Activity & Debtor Priority */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Kolom Kiri: Transaksi Terakhir */}
        <div className="lg:col-span-2 bg-[#0b1329] border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div>
              <h2 className="text-sm font-black text-white flex items-center gap-2">
                <span>🧾</span> Transaksi Terakhir
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">8 Nota belanja terbaru.</p>
            </div>
            <Link
              href="/dashboard/collections"
              className="text-xs font-bold text-blue-400 hover:text-blue-300 transition"
            >
              Lihat Semua →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#070c1a] text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">No. Nota</th>
                  <th className="py-2.5 px-3">Pelanggan</th>
                  <th className="py-2.5 px-3">Total Belanja</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-500">Memuat data transaksi...</td>
                  </tr>
                ) : recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-500">Belum ada transaksi.</td>
                  </tr>
                ) : (
                  recentTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-3 font-bold text-blue-400">#TRX-{tx.id}</td>
                      <td className="py-3 px-3 font-semibold text-slate-200">{tx.customer_name || '-'}</td>
                      <td className="py-3 px-3 font-bold text-white">
                        Rp {(tx.total_price || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                            tx.payment_status?.toLowerCase() === 'lunas'
                              ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60'
                              : 'bg-rose-950/80 text-rose-400 border-rose-800/60'
                          }`}
                        >
                          {tx.payment_status || 'UNPAID'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Kolom Kanan: Prioritas Penagihan */}
        <div className="bg-[#0b1329] border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div>
              <h2 className="text-sm font-black text-white flex items-center gap-2">
                <span>🎯</span> Prioritas Penagihan
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {overdueThreshold === 0 ? 'Semua toko menunggak' : `Toko menunggak > ${overdueThreshold} hari`}
              </p>
            </div>
            <Link
              href="/dashboard/collections"
              className="text-xs font-bold text-amber-400 hover:text-amber-300 transition"
            >
              Rekap →
            </Link>
          </div>

          <div className="space-y-3">
            {loading ? (
              <p className="text-xs text-slate-500 text-center py-4">Memuat data...</p>
            ) : topDebtors.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">
                Tidak ada toko menunggak {overdueThreshold > 0 ? `> ${overdueThreshold} hari` : ''}! 🎉
              </p>
            ) : (
              topDebtors.map((debtor, idx) => (
                <div
                  key={idx}
                  className="bg-[#070c1a] border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-slate-700 transition"
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">{debtor.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-400">{debtor.totalNota} Nota</span>
                      <span className="text-[10px] text-amber-400 bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.2 rounded font-semibold">
                        {debtor.maxAgeDays} Hari
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-rose-400 block">
                      Rp {debtor.sisaPiutang.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  )
}