'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface UnpaidTransaction {
  id: number
  customer_name: string
  transaction_date: string
  product_name: string
  total_price: number
  paid_amount: number
  payment_status: string
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<UnpaidTransaction[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [search, setSearch] = useState<string>('')

  useEffect(() => {
    fetchCollections()
  }, [])

  const fetchCollections = async () => {
    setLoading(true)

    // Ambil transaksi yang belum lunas
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .neq('payment_status', 'CANCELLED')
      .order('id', { ascending: false })

    if (error) {
      console.error('Error fetching collections:', error.message)
    } else if (data) {
      // Filter transaksi yang masih memiliki sisa piutang > 0
      const unpaid = data.filter((tx) => {
        const sisa = (tx.total_price || 0) - (tx.paid_amount || 0)
        return sisa > 0
      })
      setCollections(unpaid)
    }
    setLoading(false)
  }

  const filteredCollections = collections.filter((item) =>
    item.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    item.product_name?.toLowerCase().includes(search.toLowerCase())
  )

  const totalPiutang = collections.reduce((sum, item) => {
    return sum + (item.total_price - item.paid_amount)
  }, 0)

  return (
    <div className="p-3.5 sm:p-6 max-w-7xl mx-auto space-y-6 text-slate-900 dark:text-slate-100">
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
            <span>📋</span> Daftar Penagihan Piutang
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Pantau seluruh daftar nota toko yang masih memiliki sisa tagihan aktif.
          </p>
        </div>

        {/* Total Badge */}
        <div className="bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 rounded-2xl text-right">
          <span className="text-[10px] font-bold uppercase text-amber-500 block">
            Total Piutang Belum Tertagih
          </span>
          <span className="text-lg font-black text-amber-600 dark:text-amber-400">
            Rp {totalPiutang.toLocaleString('id-ID')}
          </span>
        </div>
      </div>

      {/* Bar Pencarian */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <input
          type="text"
          placeholder="🔍 Cari nama toko atau barang..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Table Data */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 font-semibold">
            ⏳ Memuat data penagihan...
          </div>
        ) : filteredCollections.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 font-semibold">
            🎉 Tidak ada tagihan piutang aktif saat ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-400 uppercase text-[10px] sm:text-xs font-bold tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Toko Tujuan</th>
                  <th className="py-3.5 px-4">Tanggal Nota</th>
                  <th className="py-3.5 px-4">Pesanan Barang</th>
                  <th className="py-3.5 px-4 text-right">Total Nota</th>
                  <th className="py-3.5 px-4 text-right">Sudah Dibayar</th>
                  <th className="py-3.5 px-4 text-right">Sisa Tagihan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                {filteredCollections.map((item) => {
                  const sisa = item.total_price - item.paid_amount
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-950/50 transition"
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                        🏪 {item.customer_name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        📅 {item.transaction_date || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {item.product_name}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold">
                        Rp {(item.total_price || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-emerald-500">
                        Rp {(item.paid_amount || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-rose-500">
                        Rp {sisa.toLocaleString('id-ID')}
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