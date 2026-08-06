'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Transaction {
  id: number
  customer_name: string
  transaction_date: string
  product_name: string
  total_price: number
  paid_amount: number
  payment_status: 'PAID' | 'UNPAID' | 'PARTIAL' | 'CANCELLED' | string
  created_at?: string
}

export default function SalesHistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelingId, setCancelingId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch Semua Transaksi Penjualan
  const fetchTransactions = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('id', { ascending: false })

    if (error) {
      console.error('Error fetching transactions:', error.message)
    } else if (data) {
      setTransactions(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchTransactions()
  }, [])

  // 🛑 HANDLER PEMBATALAN NOTA (CANCEL INVOICE & RESTORE STOK)
  const handleCancelInvoice = async (tx: Transaction) => {
    if (tx.payment_status === 'CANCELLED') {
      alert('Nota ini sudah dibatalkan sebelumnya.')
      return
    }

    const confirmCancel = window.confirm(
      `⚠️ KONFIRMASI PEMBATALAN NOTA\n\n` +
      `Toko/Pelanggan: ${tx.customer_name}\n` +
      `Rincian: ${tx.product_name}\n` +
      `Total: Rp ${tx.total_price.toLocaleString('id-ID')}\n\n` +
      `Apakah Anda yakin ingin membatalkan nota ini?\nStok barang akan otomatis dikembalikan ke inventaris gudang.`
    )

    if (!confirmCancel) return

    setCancelingId(tx.id)

    try {
      // 1. Ambil data produk terbaru dari Supabase untuk pencocokan ID & Stok
      const { data: productsList, error: prodErr } = await supabase
        .from('products')
        .select('*')

      if (prodErr) throw prodErr

      // 2. Parse daftar barang dari rincian nota (contoh: "12 Dus Oasis 600 ml, 1 Pcs Saltcheese")
      const itemStrings = tx.product_name.split(', ')

      for (const itemStr of itemStrings) {
        // Regex untuk ekstrak Qty, Satuan (Dus/Pcs), dan Nama Barang
        const match = itemStr.trim().match(/^(\d+)\s+(Dus|Pcs)\s+(.+)$/i)
        if (match) {
          const qty = Number(match[1])
          const unit = match[2].toUpperCase()
          const prodName = match[3].trim()

          // Cari produk yang cocok di database
          const foundProd = productsList?.find(
            (p) => p.name.toLowerCase().trim() === prodName.toLowerCase().trim()
          )

          if (foundProd) {
            if (unit === 'DUS') {
              const restoredBoxStock = (foundProd.box_stock || 0) + qty
              await supabase
                .from('products')
                .update({ box_stock: restoredBoxStock })
                .eq('id', foundProd.id)
            } else if (unit === 'PCS') {
              const restoredBottleStock = (foundProd.bottle_stock || 0) + qty
              await supabase
                .from('products')
                .update({ bottle_stock: restoredBottleStock })
                .eq('id', foundProd.id)
            }
          }
        }
      }

      // 3. Ubah Status Transaksi Menjadi 'CANCELLED'
      const { error: cancelErr } = await supabase
        .from('transactions')
        .update({ payment_status: 'CANCELLED' })
        .eq('id', tx.id)

      if (cancelErr) throw cancelErr

      alert('✅ Nota berhasil dibatalkan dan stok barang telah dikembalikan ke gudang!')
      fetchTransactions() // Refresh data
    } catch (err: any) {
      alert('Gagal membatalkan nota: ' + err.message)
    } finally {
      setCancelingId(null)
    }
  }

  // Filter Transaksi Berdasarkan Pencarian Toko
  const filteredTransactions = transactions.filter((t) =>
    t.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Hitung Ringkasan Keuangan (Abaikan Transaksi Dibatalkan)
  const activeTransactions = transactions.filter((t) => t.payment_status !== 'CANCELLED')
  const totalOmset = activeTransactions.reduce((sum, t) => sum + (t.total_price || 0), 0)
  const totalTerbayar = activeTransactions.reduce((sum, t) => sum + (t.paid_amount || 0), 0)
  const totalPiutang = Math.max(0, totalOmset - totalTerbayar)

  return (
    <div className="p-3.5 sm:p-6 max-w-6xl mx-auto space-y-6 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center text-xs sm:text-sm font-semibold text-slate-500 hover:text-blue-600 transition gap-1 mb-1"
          >
            ← Kembali ke Dashboard
          </Link>
          <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2">
            <span>📋</span> Riwayat Penjualan & Nota
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Kelola transaksi penjualan, pelunasan piutang, dan pembatalan nota.
          </p>
        </div>

        <Link
          href="/dashboard/invoice"
          className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl shadow-md transition gap-2"
        >
          <span>➕</span> Buat Nota Baru
        </Link>
      </div>

      {/* Card Ringkasan Statistik */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold text-slate-400 block uppercase">Total Omset Penjualan</span>
          <span className="text-lg sm:text-xl font-black text-blue-600 dark:text-blue-400">
            Rp {totalOmset.toLocaleString('id-ID')}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold text-slate-400 block uppercase">Total Pembayaran Masuk</span>
          <span className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">
            Rp {totalTerbayar.toLocaleString('id-ID')}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold text-slate-400 block uppercase">Total Sisa Piutang Toko</span>
          <span className="text-lg sm:text-xl font-black text-rose-500">
            Rp {totalPiutang.toLocaleString('id-ID')}
          </span>
        </div>
      </div>

      {/* Filter & Cari */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <input
          type="text"
          placeholder="🔍 Cari toko atau nama produk..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Tabel Riwayat Transaksi */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Memuat data riwayat transaksi...</div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">Belum ada transaksi penjualan yang tercatat.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-400 uppercase text-[10px] sm:text-xs font-bold tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Toko / Pelanggan</th>
                  <th className="py-3 px-4">Rincian Barang</th>
                  <th className="py-3 px-4 text-right">Total Nota</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Aksi / Kontrol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                {filteredTransactions.map((tx) => {
                  const isCancelled = tx.payment_status === 'CANCELLED'
                  const isPaid = tx.payment_status === 'PAID'
                  const isPartial = tx.payment_status === 'PARTIAL'

                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-950/50 transition ${
                        isCancelled ? 'opacity-50 bg-slate-100/30 dark:bg-slate-950/30' : ''
                      }`}
                    >
                      {/* Toko & Tanggal */}
                      <td className="py-3.5 px-4">
                        <div className={`font-bold ${isCancelled ? 'line-through text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>
                          🏪 {tx.customer_name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          📅 {tx.transaction_date || 'Tanggal tidak dicatat'}
                        </div>
                      </td>

                      {/* Rincian Barang */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className={`text-xs ${isCancelled ? 'line-through text-slate-400' : 'text-slate-300'}`}>
                          {tx.product_name}
                        </div>
                      </td>

                      {/* Total Tagihan */}
                      <td className="py-3.5 px-4 text-right font-bold">
                        <div className={isCancelled ? 'line-through text-slate-400' : 'text-blue-500'}>
                          Rp {tx.total_price?.toLocaleString('id-ID')}
                        </div>
                        {tx.paid_amount > 0 && !isCancelled && (
                          <div className="text-[10px] text-emerald-500">
                            Bayar: Rp {tx.paid_amount.toLocaleString('id-ID')}
                          </div>
                        )}
                      </td>

                      {/* Badge Status */}
                      <td className="py-3.5 px-4 text-center">
                        {isCancelled ? (
                          <span className="inline-block px-2.5 py-1 text-[10px] font-extrabold rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
                            🚫 DIBATALKAN
                          </span>
                        ) : isPaid ? (
                          <span className="inline-block px-2.5 py-1 text-[10px] font-extrabold rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            LUNAS
                          </span>
                        ) : isPartial ? (
                          <span className="inline-block px-2.5 py-1 text-[10px] font-extrabold rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            DICICIL (DP)
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-1 text-[10px] font-extrabold rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">
                            BELUM BAYAR
                          </span>
                        )}
                      </td>

                      {/* Aksi Pembatalan */}
                      <td className="py-3.5 px-4 text-center">
                        {isCancelled ? (
                          <span className="text-[11px] text-slate-500 italic">Stok sudah dikembalikan</span>
                        ) : (
                          <button
                            onClick={() => handleCancelInvoice(tx)}
                            disabled={cancelingId === tx.id}
                            className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 text-xs font-bold px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                            title="Batalkan Nota & Kembalikan Stok ke Gudang"
                          >
                            {cancelingId === tx.id ? 'Membatalkan...' : '🚫 Cancel Nota'}
                          </button>
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