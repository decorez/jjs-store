'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Transaction {
  id: number
  business_id?: number
  store_id?: number
  customer_id?: number
  customer_name?: string
  customer_address?: string
  product_name?: string
  qty?: number
  unit?: string
  price_per_unit?: number
  total_price?: number
  paid_amount?: number
  payment_status?: string
  delivery_status?: string
  assigned_sales?: string
  transaction_date?: string
  created_at?: string
  due_date?: string
  items?: any[] // Mengakomodasi jika menyimpan banyak item dalam JSON
}

interface CustomerHistoryModalProps {
  customer: { id?: number; name: string } | null
  isOpen: boolean
  onClose: () => void
}

export default function CustomerHistoryModal({
  customer,
  isOpen,
  onClose,
}: CustomerHistoryModalProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (customer && isOpen) {
      fetchCustomerTransactions()
    }
  }, [customer, isOpen])

  const fetchCustomerTransactions = async () => {
    if (!customer) return
    setLoading(true)

    // PENCARIAN FLEKSIBEL:
    // Mencari berdasarkan customer_id jika ada, atau pencarian nama customer
    let query = supabase.from('transactions').select('*')

    if (customer.id) {
      query = query.or(`customer_id.eq.${customer.id},customer_name.ilike.%${customer.name}%`)
    } else {
      query = query.ilike('customer_name', `%${customer.name}%`)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Gagal mengambil history transaksi:', error.message)
    } else if (data) {
      setTransactions(data as Transaction[])
    }
    setLoading(false)
  }

  if (!isOpen || !customer) return null

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header Modal */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
          <div>
            <h2 className="text-base font-black flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <span>📜</span>
              <span>Riwayat Transaksi - {customer.name}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Daftar nota dan rincian pesanan pelanggan.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold p-1 rounded-lg transition"
          >
            ✕
          </button>
        </div>

        {/* Content / Body Modal */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Memuat riwayat transaksi...
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Belum ada riwayat transaksi ditemukan untuk toko ini.
            </div>
          ) : (
            transactions.map((trx) => {
              // Cek apakah item tersimpan dalam array JSON 'items' atau kolom tunggal
              const hasMultipleItems = Array.isArray(trx.items) && trx.items.length > 0

              return (
                <div
                  key={trx.id}
                  className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3"
                >
                  {/* Header Nota */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-blue-500">
                        #TRX-{trx.id}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        • {new Date(trx.transaction_date || trx.created_at || '').toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      {trx.assigned_sales && (
                        <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500 font-medium">
                          Sales: {trx.assigned_sales}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Status Pengiriman */}
                      {trx.delivery_status && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-blue-500/10 border-blue-500/30 text-blue-400">
                          🚚 {trx.delivery_status}
                        </span>
                      )}

                      {/* Status Pembayaran */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          trx.payment_status?.toLowerCase() === 'lunas'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                            : trx.payment_status?.toLowerCase() === 'piutang'
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                        }`}
                      >
                        {trx.payment_status || 'Lunas'}
                      </span>
                    </div>
                  </div>

                  {/* Tabel Rincian Barang yang Dipesan */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-[10px] uppercase text-slate-400 border-b border-slate-200 dark:border-slate-800">
                          <th className="py-1.5 font-bold">Item Produk</th>
                          <th className="py-1.5 text-center font-bold">Qty</th>
                          <th className="py-1.5 text-right font-bold">Harga Satuan</th>
                          <th className="py-1.5 text-right font-bold">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50 font-medium">
                        {hasMultipleItems ? (
                          // Render Jika Menggunakan Kolom JSON 'items'
                          trx.items?.map((item: any, idx: number) => (
                            <tr key={idx} className="text-slate-700 dark:text-slate-300">
                              <td className="py-2 font-semibold">📦 {item.product_name || item.name}</td>
                              <td className="py-2 text-center font-bold">
                                {item.qty || item.quantity} {item.unit || 'Dus'}
                              </td>
                              <td className="py-2 text-right text-slate-400">
                                Rp {(item.price_per_unit || item.price || 0).toLocaleString('id-ID')}
                              </td>
                              <td className="py-2 text-right font-bold text-slate-900 dark:text-slate-100">
                                Rp {(item.total_price || item.subtotal || 0).toLocaleString('id-ID')}
                              </td>
                            </tr>
                          ))
                        ) : (
                          // Render Kolom Tunggal
                          <tr className="text-slate-700 dark:text-slate-300">
                            <td className="py-2 font-semibold">📦 {trx.product_name || 'Produk'}</td>
                            <td className="py-2 text-center font-bold">
                              {trx.qty || 0} {trx.unit || 'Dus'}
                            </td>
                            <td className="py-2 text-right text-slate-400">
                              Rp {(trx.price_per_unit || 0).toLocaleString('id-ID')}
                            </td>
                            <td className="py-2 text-right font-bold text-slate-900 dark:text-slate-100">
                              Rp {(trx.total_price || 0).toLocaleString('id-ID')}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Ringkasan Total & Pembayaran */}
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800/80">
                    <div className="text-[11px] text-slate-400">
                      {trx.paid_amount !== undefined && (
                        <span>Sudah Dibayar: <strong className="text-emerald-400">Rp {(trx.paid_amount || 0).toLocaleString('id-ID')}</strong></span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Total Nota</span>
                      <span className="text-xs sm:text-sm font-black text-emerald-500">
                        Rp {(trx.total_price || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer Modal */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-950">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}