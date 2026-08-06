'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function SalesPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTransactions = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) setTransactions(data)
    if (error) console.error('Error fetching transactions:', error.message)
    setLoading(false)
  }

  useEffect(() => {
    fetchTransactions()
  }, [])

  // Fungsi untuk mengubah status pembayaran (PAID / UNPAID)
  const togglePaymentStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'PAID' ? 'UNPAID' : 'PAID'
    const { error } = await supabase
      .from('transactions')
      .update({ payment_status: newStatus })
      .eq('id', id)

    if (error) {
      alert('Gagal mengubah status: ' + error.message)
    } else {
      fetchTransactions()
    }
  }

  // Hitung total omzet dari transaksi yang termuat
  const totalOmzet = transactions.reduce((sum, tx) => sum + (Number(tx.total_price) || 0), 0)

  return (
    /* Perbaikan 1: Kontainer diperluas ke max-w-7xl */
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      {/* Header Navigasi & Total Omzet */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Link 
          href="/dashboard"
          className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white transition gap-1"
        >
          ← Kembali ke Dashboard
        </Link>
        
        <div className="bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl text-left sm:text-right shadow-lg w-full sm:w-auto">
          <span className="text-xs text-slate-400 font-medium block uppercase tracking-wider">
            Total Pendapatan / Omzet
          </span>
          <span className="text-xl font-black text-blue-400">
            Rp {totalOmzet.toLocaleString('id-ID')}
          </span>
        </div>
      </div>

      {/* Card Utama Riwayat */}
      <div className="bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-800 shadow-2xl space-y-6">
        <div className="border-b border-slate-800/80 pb-4">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span>📜</span> Riwayat Transaksi & Penjualan
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Daftar semua nota dan status pembayaran pelanggan.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500 font-medium animate-pulse">
            Memuat data transaksi...
          </div>
        ) : (
          /* Container dengan scroll horizontal internal */
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            {/* Perbaikan 2: Menambahkan min-w-[850px] agar tabel bisa discroll rapi saat layar sempit */}
            <table className="w-full min-w-[850px] text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-950/80">
                  <th className="p-3.5 whitespace-nowrap">Tanggal / Waktu</th>
                  <th className="p-3.5 whitespace-nowrap">Nama Pembeli</th>
                  <th className="p-3.5">Rincian Pesanan Produk</th>
                  <th className="p-3.5 text-right whitespace-nowrap">Total Tagihan</th>
                  <th className="p-3.5 text-center whitespace-nowrap">Status</th>
                  <th className="p-3.5 text-center whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-500">
                      Belum ada riwayat transaksi.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => {
                    const targetDate = tx.transaction_date || tx.created_at
                    const dateFormatted = targetDate 
                      ? new Date(targetDate.includes('T') ? targetDate : targetDate + 'T00:00:00').toLocaleDateString('id-ID', {
                          dateStyle: 'medium',
                        })
                      : '-'

                    const isPaid = tx.payment_status === 'PAID'

                    return (
                      <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3.5 text-xs text-slate-400 whitespace-nowrap font-medium">
                          {dateFormatted}
                        </td>
                        <td className="p-3.5 font-semibold text-slate-200 min-w-[140px]">
                          {tx.customer_name}
                        </td>
                        <td className="p-3.5 text-slate-300 max-w-xs truncate" title={tx.product_name}>
                          {tx.product_name}
                        </td>
                        <td className="p-3.5 text-right font-bold text-white whitespace-nowrap">
                          Rp {(tx.total_price || 0).toLocaleString('id-ID')}
                        </td>
                        <td className="p-3.5 text-center whitespace-nowrap">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${
                            isPaid 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {isPaid ? 'LUNAS (PAID)' : 'BELUM BAYAR (UNPAID)'}
                          </span>
                        </td>
                        {/* Perbaikan 3: Perbaikan tombol aksi agar tidak terpotong */}
                        <td className="p-3.5 text-center whitespace-nowrap">
                          <button
                            onClick={() => togglePaymentStatus(tx.id, tx.payment_status)}
                            className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition ${
                              isPaid 
                                ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700/50' 
                                : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/20'
                            }`}
                          >
                            {isPaid ? 'Ubah ke Belum Bayar' : 'Lunasi Pembayaran'}
                          </button>
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