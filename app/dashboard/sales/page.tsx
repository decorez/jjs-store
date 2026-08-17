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

  // 🔔 Custom Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'error') => {
    setToast({ message, type })
    setTimeout(() => {
      setToast(null)
    }, 3000)
  }

  // ⚠️ Modal Konfirmasi Cancel Target
  const [cancelTarget, setCancelTarget] = useState<Transaction | null>(null)

  // Fetch Semua Transaksi Penjualan
  const fetchTransactions = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('id', { ascending: false })

    if (error) {
      showToast('Gagal mengambil data transaksi: ' + error.message, 'error')
    } else if (data) {
      setTransactions(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchTransactions()
  }, [])

  // Klik tombol Cancel Nota -> Buka Modal
  const handleOpenCancelModal = (tx: Transaction) => {
    if (tx.payment_status === 'CANCELLED') {
      showToast('Nota ini sudah dibatalkan sebelumnya.', 'error')
      return
    }
    setCancelTarget(tx)
  }

  // 🛑 EKSEKUSI PEMBATALAN NOTA & RESTORE STOK GUDANG
  const executeCancelInvoice = async () => {
    if (!cancelTarget) return

    const tx = cancelTarget
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
        const match = itemStr.trim().match(/^(\d+)\s+(Dus|Pcs)\s+(.+)$/i)
        if (match) {
          const qty = Number(match[1])
          const unit = match[2].toUpperCase()
          const prodName = match[3].trim()

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

      showToast('Nota berhasil dibatalkan dan stok dikembalikan ke gudang!', 'success')
      setCancelTarget(null)
      fetchTransactions()
    } catch (err: any) {
      showToast('Gagal membatalkan nota: ' + err.message, 'error')
    } finally {
      setCancelingId(null)
    }
  }

  // Filter Transaksi Berdasarkan Pencarian Toko atau Produk
  const filteredTransactions = transactions.filter((t) =>
    t.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Ringkasan Keuangan (Abaikan Transaksi Dibatalkan)
  const activeTransactions = transactions.filter((t) => t.payment_status !== 'CANCELLED')
  const totalOmset = activeTransactions.reduce((sum, t) => sum + (t.total_price || 0), 0)
  const totalTerbayar = activeTransactions.reduce((sum, t) => sum + (t.paid_amount || 0), 0)
  const totalPiutang = Math.max(0, totalOmset - totalTerbayar)

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 text-slate-100 relative">
      
      {/* 🔔 CUSTOM TOAST NOTIFICATION */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl border text-xs font-bold transition-all animate-bounce ${
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-blue-400 transition gap-1 mb-1"
          >
            ← Kembali ke Dashboard
          </Link>
          <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2 text-white">
            <span>📋</span> Riwayat Penjualan & Nota
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Kelola transaksi penjualan, pelunasan piutang, dan pembatalan nota.
          </p>
        </div>

        <Link
          href="/dashboard/invoice"
          className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg transition gap-2 shrink-0"
        >
          <span>➕</span> Buat Nota Baru
        </Link>
      </div>

      {/* 📊 Card Ringkasan Statistik */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0b1329] border border-slate-800/80 p-4 rounded-2xl shadow-xl">
          <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Total Omset Penjualan</span>
          <span className="text-lg sm:text-xl font-black text-blue-400 mt-1 block">
            Rp {totalOmset.toLocaleString('id-ID')}
          </span>
        </div>
        <div className="bg-[#0b1329] border border-slate-800/80 p-4 rounded-2xl shadow-xl">
          <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Total Pembayaran Masuk</span>
          <span className="text-lg sm:text-xl font-black text-emerald-400 mt-1 block">
            Rp {totalTerbayar.toLocaleString('id-ID')}
          </span>
        </div>
        <div className="bg-[#0b1329] border border-slate-800/80 p-4 rounded-2xl shadow-xl">
          <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Total Sisa Piutang Toko</span>
          <span className="text-lg sm:text-xl font-black text-rose-400 mt-1 block">
            Rp {totalPiutang.toLocaleString('id-ID')}
          </span>
        </div>
      </div>

      {/* 🔍 Search Bar */}
      <div className="bg-[#0b1329] border border-slate-800/80 rounded-2xl p-3 sm:p-4">
        <div className="relative w-full">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">
            🔍
          </span>
          <input
            type="text"
            placeholder="Cari toko atau rincian produk..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#070c1a] border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>
      </div>

      {/* 📋 Tabel Transaksi */}
      <div className="bg-[#0b1329] border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Memuat riwayat transaksi...</div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">Belum ada transaksi yang sesuai.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#070c1a] text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-5">Toko / Pelanggan</th>
                  <th className="py-3.5 px-5">Rincian Barang</th>
                  <th className="py-3.5 px-5 text-right">Total Nota</th>
                  <th className="py-3.5 px-5 text-center">Status</th>
                  <th className="py-3.5 px-5 text-center w-36">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredTransactions.map((tx) => {
                  const isCancelled = tx.payment_status === 'CANCELLED'
                  const isPaid = tx.payment_status === 'PAID'
                  const isPartial = tx.payment_status === 'PARTIAL'

                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-slate-800/30 transition ${
                        isCancelled ? 'opacity-40 bg-slate-950/40' : ''
                      }`}
                    >
                      {/* Toko & Tanggal */}
                      <td className="py-3.5 px-5">
                        <div className={`font-bold text-sm ${isCancelled ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                          🏪 {tx.customer_name}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          📅 {tx.transaction_date || 'Tanpa tanggal'}
                        </div>
                      </td>

                      {/* Rincian Barang */}
                      <td className="py-3.5 px-5 max-w-xs">
                        <div className={`text-xs ${isCancelled ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                          {tx.product_name}
                        </div>
                      </td>

                      {/* Total Tagihan */}
                      <td className="py-3.5 px-5 text-right font-bold">
                        <div className={isCancelled ? 'line-through text-slate-500' : 'text-slate-100 text-sm'}>
                          Rp {tx.total_price?.toLocaleString('id-ID')}
                        </div>
                        {tx.paid_amount > 0 && !isCancelled && (
                          <div className="text-[11px] text-emerald-400 mt-0.5 font-normal">
                            Bayar: Rp {tx.paid_amount.toLocaleString('id-ID')}
                          </div>
                        )}
                      </td>

                      {/* Badge Status */}
                      <td className="py-3.5 px-5 text-center">
                        {isCancelled ? (
                          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-rose-950/60 text-rose-400 border border-rose-800/60">
                            🚫 DIBATALKAN
                          </span>
                        ) : isPaid ? (
                          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                            LUNAS
                          </span>
                        ) : isPartial ? (
                          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-amber-950/80 text-amber-400 border border-amber-800/60">
                            DICICIL (DP)
                          </span>
                        ) : (
                          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            BELUM BAYAR
                          </span>
                        )}
                      </td>

                      {/* Aksi Pembatalan */}
                      <td className="py-3.5 px-5 text-center">
                        {isCancelled ? (
                          <span className="text-[11px] text-slate-500 italic">Stok dikembalikan</span>
                        ) : (
                          <button
                            onClick={() => handleOpenCancelModal(tx)}
                            className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-900/50 rounded-lg text-xs font-bold transition"
                          >
                            🚫 Cancel Nota
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

      {/* ⚠️ MODAL KONFIRMASI PEMBATALAN NOTA */}
      {cancelTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-[#0b1329] border border-slate-800 p-6 rounded-2xl max-w-md w-full space-y-4 text-slate-100 shadow-2xl">
            <div className="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-full flex items-center justify-center text-2xl mx-auto border border-rose-500/20">
              ⚠️
            </div>
            <div className="space-y-2 text-center">
              <h3 className="text-base font-bold text-white">Pembatalan Nota Transaksi</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Apakah Anda yakin ingin membatalkan nota untuk toko <strong className="text-white">"{cancelTarget.customer_name}"</strong>?
              </p>
              <div className="bg-[#070c1a] p-3 rounded-xl border border-slate-800/80 text-left text-xs space-y-1 my-2">
                <div className="text-slate-400">Rincian: <span className="text-slate-200 font-semibold">{cancelTarget.product_name}</span></div>
                <div className="text-slate-400">Total: <span className="text-blue-400 font-bold">Rp {cancelTarget.total_price?.toLocaleString('id-ID')}</span></div>
              </div>
              <p className="text-[11px] text-emerald-400 font-medium">
                📦 Stok barang akan otomatis dikembalikan ke inventaris gudang.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setCancelTarget(null)}
                disabled={cancelingId !== null}
                className="w-full py-2.5 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={executeCancelInvoice}
                disabled={cancelingId !== null}
                className="w-full py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-lg transition disabled:opacity-50"
              >
                {cancelingId !== null ? 'Proses...' : 'Ya, Batalkan Nota'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}