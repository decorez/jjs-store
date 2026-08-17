'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Customer {
  id: number
  name: string
}

interface Transaction {
  id: number
  customer_name: string
  total_price: number
  paid_amount: number
  payment_status?: string
}

export default function DashboardPage() {
  const [customersCount, setCustomersCount] = useState<number>(0)
  const [delinquentCount, setDelinquentCount] = useState<number>(0)
  const [totalOmzet, setTotalOmzet] = useState<number>(0)
  const [totalPiutang, setTotalPiutang] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboardSummary() {
      setLoading(true)

      // 🔍 Ditambahkan filter .neq('payment_status', 'DIBATALKAN')
      const [custRes, txRes] = await Promise.all([
        supabase.from('customers').select('id, name'),
        supabase
          .from('transactions')
          .select('id, customer_name, total_price, paid_amount, payment_status')
          .neq('payment_status', 'CANCELLED') // 👈 Mengabaikan transaksi yang dibatalkan
      ])

      const customersList: Customer[] = custRes.data || []
      const txList: Transaction[] = txRes.data || []

      // 1. Total Toko
      setCustomersCount(customersList.length)

      // 2. Hitung Omzet & Piutang Keseluruhan (Hanya Nota Aktif)
      let omzet = 0
      let kasMasuk = 0
      txList.forEach((tx) => {
        omzet += Number(tx.total_price) || 0
        kasMasuk += Number(tx.paid_amount) || 0
      })
      setTotalOmzet(omzet)
      setTotalPiutang(omzet - kasMasuk)

      // 3. Hitung Jumlah Toko yang Memiliki Tunggakan (Sisa Piutang > 0)
      if (customersList.length > 0 && txList.length > 0) {
        let delinquent = 0
        customersList.forEach((cust) => {
          const custTxs = txList.filter(
            (tx) => tx.customer_name?.toLowerCase().trim() === cust.name.toLowerCase().trim()
          )
          const belanja = custTxs.reduce((sum, tx) => sum + (Number(tx.total_price) || 0), 0)
          const bayar = custTxs.reduce((sum, tx) => sum + (Number(tx.paid_amount) || 0), 0)
          if (belanja - bayar > 0) {
            delinquent++
          }
        })
        setDelinquentCount(delinquent)
      }

      setLoading(false)
    }

    fetchDashboardSummary()
  }, [])

  return (
    <div className="p-3.5 sm:p-6 max-w-7xl mx-auto space-y-6 text-slate-900 dark:text-slate-100">
      {/* Header Dashboard */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <span>🚀</span> Dashboard Sistem
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Ringkasan operasional toko, rekapitulasi piutang, dan manajemen pelanggan.
        </p>
      </div>

      {/* Ringkasan Metric Quick-View */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Total Omzet */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Total Omzet
            </span>
            <span className="text-sm">💰</span>
          </div>
          <span className="text-lg sm:text-xl font-black text-blue-600 dark:text-blue-400 block mt-1">
            {loading ? '...' : `Rp ${totalOmzet.toLocaleString('id-ID')}`}
          </span>
        </div>

        {/* Metric 2: Sisa Piutang */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Sisa Piutang Toko
            </span>
            <span className="text-sm">⏳</span>
          </div>
          <span className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 block mt-1">
            {loading ? '...' : `Rp ${totalPiutang.toLocaleString('id-ID')}`}
          </span>
        </div>

        {/* Metric 3: Total Toko Terdaftar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Toko Terdaftar
            </span>
            <span className="text-sm">🏪</span>
          </div>
          <span className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 block mt-1">
            {loading ? '...' : `${customersCount} Toko`}
          </span>
        </div>

        {/* Metric 4: Toko Ada Utang */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Toko Menunggak
            </span>
            <span className="text-sm">⚠️</span>
          </div>
          <span className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400 block mt-1">
            {loading ? '...' : `${delinquentCount} Toko`}
          </span>
        </div>
      </div>

      {/* Grid Menu Utama / Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Menu 1: Kelola Toko / Pelanggan */}
        <Link
          href="/dashboard/customers"
          className="group bg-blue-600 hover:bg-blue-700 p-5 rounded-2xl text-white shadow-lg shadow-blue-500/10 hover:shadow-blue-500/25 transition transform hover:-translate-y-0.5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl">🏪</span>
            <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-semibold">
              Master Data
            </span>
          </div>
          <div>
            <h3 className="font-bold text-lg group-hover:underline">Kelola Toko & Pelanggan</h3>
            <p className="text-xs text-blue-100 mt-1">
              Atur daftar toko, kontak, serta pantau kartu piutang & histori cicilan per pelanggan.
            </p>
          </div>
        </Link>

        {/* Menu 2: Input Nota Penjualan */}
        <Link
          href="/dashboard/invoice"
          className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm hover:border-blue-500 transition transform hover:-translate-y-0.5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl">📝</span>
            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-full font-semibold">
              Penjualan
            </span>
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-blue-600">
              Input Nota Transaksi
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Buat nota penjualan baru, cetak struk, dan catat opsi pembayaran tunai/kredit.
            </p>
          </div>
        </Link>

        {/* Menu 3: Rekap Piutang & Nota */}
        <Link
          href="/dashboard/sales"
          className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm hover:border-blue-500 transition transform hover:-translate-y-0.5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl">📜</span>
            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-full font-semibold">
              Piutang
            </span>
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-blue-600">
              Rekap Piutang & Nota
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Cek riwayat nota masuk, status pelunasan instan, dan log histori cicilan.
            </p>
          </div>
        </Link>

        {/* Menu 4: Tagihan Sales (Bawa Nota) */}
        <Link
          href="/dashboard/collection"
          className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm hover:border-blue-500 transition transform hover:-translate-y-0.5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl">🏍️</span>
            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-full font-semibold">
              Penugasan
            </span>
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-blue-600">
              Tagihan Sales
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Pilih nota tagihan yang akan diserahterimakan & dibawa sales untuk ditagih hari ini.
            </p>
          </div>
        </Link>

        {/* Menu 5: Setoran Sales (Terima Uang Tunai) */}
        <Link
          href="/dashboard/settlement"
          className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm hover:border-blue-500 transition transform hover:-translate-y-0.5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl">💼</span>
            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-full font-semibold">
              Setoran
            </span>
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-blue-600">
              Setoran Sales
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Proses uang tunai yang disetorkan sales, perbarui janji bayar, dan cetak bukti setoran.
            </p>
          </div>
        </Link>

        {/* Menu 6: Stok Produk */}
        <Link
          href="/dashboard/products"
          className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm hover:border-blue-500 transition transform hover:-translate-y-0.5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl">📦</span>
            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-full font-semibold">
              Inventaris
            </span>
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-blue-600">
              Stok & Katalog Produk
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Kelola sisa stok fisik barang, harga jual Dus/Pcs, serta varian produk toko.
            </p>
          </div>
        </Link>

        {/* Menu 7: Laporan Keuangan */}
        <Link
          href="/dashboard/reports"
          className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm hover:border-blue-500 transition transform hover:-translate-y-0.5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl">📊</span>
            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-full font-semibold">
              Laporan
            </span>
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-blue-600">
              Laporan & Rekapitulasi
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Laporan akumulasi omzet keseluruhan, realisasi kas masuk, dan ringkasan tagihan.
            </p>
          </div>
        </Link>

        {/* Menu 8: Delivery / Surat Jalan */}
        <Link
          href="/dashboard/delivery"
          className="group bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 p-5 rounded-2xl shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-800 transition transform hover:-translate-y-0.5 space-y-3 col-span-1 sm:col-span-2 lg:col-span-3 duration-200"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🚚</span>
              <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-full">
                Pengiriman
              </span>
            </div>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition">
              Buka Menu →
            </span>
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              Surat Jalan & Rekap Muatan Hari Ini
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Kelola penugasan driver, helper, dan rekapitulasi muatan armada pengiriman.
            </p>
          </div>
        </Link>
      </div>
    </div>
  )
}