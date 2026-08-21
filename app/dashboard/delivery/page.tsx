'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Transaction {
  id: number
  customer_name: string
  transaction_date: string
  product_name: string
  total_price: number
  paid_amount: number
  payment_status: string
  delivery_status?: string
}

interface AggregatedItem {
  name: string
  unit: string
  totalQty: number
}

interface SavedDelivery {
  id: number
  created_at: string
  delivery_date: string
  driver_name: string
  vehicle_no: string
  helpers: string[]
  aggregated_items: AggregatedItem[]
  stores_data: {
    transaction_id?: number
    customer_name: string
    product_name: string
    sisa_piutang: number
    status: string
  }[]
  transaction_ids: number[]
  total_cod: number
}

const VEHICLE_OPTIONS = [
  'BG 8984 ZH',
  'BG 8114 IF',
  'BG 8936 IC',
]

// Helper function untuk menghitung ulang akumulasi muatan barang dari teks produk
const recalculateAggregatedItems = (productStrings: string[]): AggregatedItem[] => {
  const map = new Map<string, { name: string; unit: string; totalQty: number }>()

  productStrings.forEach((pStr) => {
    const itemStrings = pStr.split(', ')
    itemStrings.forEach((itemStr) => {
      const match = itemStr.trim().match(/^(\d+)\s+(Dus|Pcs)\s+(.+)$/i)
      if (match) {
        const qty = Number(match[1])
        const unit = match[2].toUpperCase()
        const name = match[3].trim()
        const key = `${name.toLowerCase()}__${unit}`

        if (map.has(key)) {
          const current = map.get(key)!
          map.set(key, { ...current, totalQty: current.totalQty + qty })
        } else {
          map.set(key, { name, unit, totalQty: qty })
        }
      }
    })
  })

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
}

export default function DeliveryRekapPage() {
  const [activeTab, setActiveTab] = useState<'create' | 'saved'>('create')
  
  // State Form
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [processingIndex, setProcessingIndex] = useState<number | null>(null)

  // State Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'error') => {
    setToast({ message, type })
    setTimeout(() => {
      setToast(null)
    }, 3000)
  }

  // State Informasi Armada / Pengirim
  const [driverName, setDriverName] = useState('')
  const [vehicleNo, setVehicleNo] = useState('')
  const [helpers, setHelpers] = useState<string[]>([''])
  const [selectedTxIds, setSelectedTxIds] = useState<number[]>([])

  // State Riwayat Data Tersimpan, Detail Modal, & Delete Modal
  const [savedDeliveries, setSavedDeliveries] = useState<SavedDelivery[]>([])
  const [loadingSaved, setLoadingSaved] = useState(false)
  const [selectedDeliveryDetail, setSelectedDeliveryDetail] = useState<SavedDelivery | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null)

  const fetchTransactionsByDate = async (dateStr: string) => {
    setLoading(true)

    // 1. Ambil SELURUH ID transaksi yang SUDAH PERNAH dimasukkan ke dalam rekap delivery manapun
    const { data: existingDeliveries } = await supabase
      .from('deliveries')
      .select('transaction_ids')

    const usedTxIds = Array.from(
      new Set(existingDeliveries?.flatMap((d) => d.transaction_ids || []) || [])
    )

    // 2. Query Transaksi Antrean Delivery (Diurutkan berdasarkan Nama Toko A-Z agar nota ganda berdampingan)
    let query = supabase
      .from('transactions')
      .select('*')
      .lte('transaction_date', dateStr)
      .neq('payment_status', 'CANCELLED')
      .neq('delivery_status', 'DELIVERED')
      .neq('delivery_status', 'IN_DELIVERY')
      .order('customer_name', { ascending: true }) // 👈 Urutkan Nama Toko A-Z
      .order('transaction_date', { ascending: true }) // 👈 Jika toko sama, urutkan tanggal transaksi tertua

    if (usedTxIds.length > 0) {
      query = query.not('id', 'in', `(${usedTxIds.join(',')})`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching transactions:', error.message)
    } else if (data) {
      setTransactions(data)
      setSelectedTxIds([])
    }
    setLoading(false)
  }

  // Fungsi instan tanpa pop-up konfirmasi untuk bersihkan nota susulan/lama
  const handleMarkAsDelivered = async (txId: number, customerName: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== txId))
    setSelectedTxIds((prev) => prev.filter((id) => id !== txId))

    const { error } = await supabase
      .from('transactions')
      .update({ delivery_status: 'DELIVERED' })
      .eq('id', txId)

    if (error) {
      showToast('Gagal memperbarui status: ' + error.message, 'error')
      fetchTransactionsByDate(selectedDate)
    } else {
      showToast(`✅ Nota ${customerName} disembunyikan!`, 'success')
    }
  }

  const fetchSavedDeliveries = async () => {
    setLoadingSaved(true)
    const { data, error } = await supabase
      .from('deliveries')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching saved deliveries:', error.message)
    } else if (data) {
      setSavedDeliveries(data)
    }
    setLoadingSaved(false)
  }

  useEffect(() => {
    if (activeTab === 'create') {
      fetchTransactionsByDate(selectedDate)
    } else {
      fetchSavedDeliveries()
    }
  }, [selectedDate, activeTab])

  const handleAddHelper = () => setHelpers([...helpers, ''])
  const handleRemoveHelper = (index: number) => {
    if (helpers.length === 1) setHelpers([''])
    else setHelpers(helpers.filter((_, i) => i !== index))
  }
  const handleHelperChange = (index: number, value: string) => {
    const updated = [...helpers]
    updated[index] = value
    setHelpers(updated)
  }

  // 💵 AKSI PELUNASAN CASH UNTUK TOKO
  const handlePayStoreCash = async (storeIndex: number) => {
    if (!selectedDeliveryDetail) return

    const store = selectedDeliveryDetail.stores_data[storeIndex]
    const txId = store.transaction_id || selectedDeliveryDetail.transaction_ids?.[storeIndex]

    if (!confirm(`Konfirmasi pelunasan Cash untuk ${store.customer_name}?`)) return

    setProcessingIndex(storeIndex)

    if (txId) {
      const { data: tx } = await supabase
        .from('transactions')
        .select('total_price')
        .eq('id', txId)
        .single()

      const fullPrice = tx?.total_price || store.sisa_piutang

      await supabase
        .from('transactions')
        .update({
          paid_amount: fullPrice,
          payment_status: 'PAID',
          delivery_status: 'DELIVERED',
        })
        .eq('id', txId)
    }

    const updatedStores = [...selectedDeliveryDetail.stores_data]
    const paidAmount = updatedStores[storeIndex].sisa_piutang

    updatedStores[storeIndex] = {
      ...updatedStores[storeIndex],
      sisa_piutang: 0,
      status: 'PAID',
    }

    const newTotalCod = Math.max(0, (selectedDeliveryDetail.total_cod || 0) - paidAmount)

    const { error } = await supabase
      .from('deliveries')
      .update({
        stores_data: updatedStores,
        total_cod: newTotalCod,
      })
      .eq('id', selectedDeliveryDetail.id)

    setProcessingIndex(null)

    if (error) {
      showToast('Gagal memperbarui status: ' + error.message, 'error')
    } else {
      showToast(`✅ Pembayaran Cash ${store.customer_name} berhasil disimpan!`, 'success')

      const updatedDetail = {
        ...selectedDeliveryDetail,
        stores_data: updatedStores,
        total_cod: newTotalCod,
      }
      setSelectedDeliveryDetail(updatedDetail)
      fetchSavedDeliveries()
    }
  }

  // 🔄 AKSI PENANGANAN NOTA RETUR (TOKO TUTUP / NOTA DIBAWA BALIK)
  const handleReturnStore = async (storeIndex: number) => {
    if (!selectedDeliveryDetail) return

    const store = selectedDeliveryDetail.stores_data[storeIndex]
    const txId = store.transaction_id || selectedDeliveryDetail.transaction_ids?.[storeIndex]

    if (!confirm(`Toko ${store.customer_name} tutup/retur? Nota ini akan dikembalikan ke antrean rekap baru.`)) return

    setProcessingIndex(storeIndex)

    // 1. Kembalikan status transaksi ke PENDING di database
    if (txId) {
      await supabase
        .from('transactions')
        .update({ delivery_status: 'PENDING' })
        .eq('id', txId)
    }

    // 2. Keluarkan nota dari rekap pengiriman ini
    const updatedStores = selectedDeliveryDetail.stores_data.filter((_, i) => i !== storeIndex)
    const updatedTxIds = (selectedDeliveryDetail.transaction_ids || []).filter((id) => id !== txId)
    const newTotalCod = Math.max(0, (selectedDeliveryDetail.total_cod || 0) - (store.sisa_piutang || 0))

    // Hitung ulang muatan barang gudang setelah nota ini dikurangi
    const remainingProducts = updatedStores.map((s) => s.product_name)
    const updatedAggregatedItems = recalculateAggregatedItems(remainingProducts)

    // 3. Update data rekap pengiriman
    const { error } = await supabase
      .from('deliveries')
      .update({
        stores_data: updatedStores,
        transaction_ids: updatedTxIds,
        aggregated_items: updatedAggregatedItems,
        total_cod: newTotalCod,
      })
      .eq('id', selectedDeliveryDetail.id)

    setProcessingIndex(null)

    if (error) {
      showToast('Gagal memproses retur nota: ' + error.message, 'error')
    } else {
      showToast(`↩️ Nota ${store.customer_name} dikembalikan ke antrean rekap!`, 'success')

      const updatedDetail = {
        ...selectedDeliveryDetail,
        stores_data: updatedStores,
        transaction_ids: updatedTxIds,
        aggregated_items: updatedAggregatedItems,
        total_cod: newTotalCod,
      }
      setSelectedDeliveryDetail(updatedDetail)
      fetchSavedDeliveries()
      fetchTransactionsByDate(selectedDate)
    }
  }

  // 🗑️ EKSEKUSI PEMBATALAN REKAP PENGIRIMAN
  const executeDeleteDelivery = async () => {
    if (!deleteTargetId) return

    const targetDelivery = savedDeliveries.find((d) => d.id === deleteTargetId)

    const { error } = await supabase
      .from('deliveries')
      .delete()
      .eq('id', deleteTargetId)

    if (error) {
      showToast('Gagal membatalkan pengiriman: ' + error.message, 'error')
    } else {
      if (targetDelivery?.transaction_ids?.length) {
        await supabase
          .from('transactions')
          .update({ delivery_status: 'PENDING' })
          .in('id', targetDelivery.transaction_ids)
      }

      showToast('Rekap pengiriman berhasil dibatalkan!', 'success')
      setSelectedDeliveryDetail(null)
      setDeleteTargetId(null)
      
      fetchSavedDeliveries()
      fetchTransactionsByDate(selectedDate)
    }
  }

  const handleToggleTx = (id: number) => {
    setSelectedTxIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedTxIds(transactions.map((t) => t.id))
    else setSelectedTxIds([])
  }

  const aggregatedLoad = useMemo(() => {
    const activeTransactions = transactions.filter((t) => selectedTxIds.includes(t.id))
    const productStrings = activeTransactions.map((t) => t.product_name)
    return recalculateAggregatedItems(productStrings)
  }, [transactions, selectedTxIds])

  const activeSelectedTx = transactions.filter((t) => selectedTxIds.includes(t.id))
  const totalTagihanDriver = activeSelectedTx.reduce((sum, t) => {
    const sisa = Math.max(0, (t.total_price || 0) - (t.paid_amount || 0))
    return sum + sisa
  }, 0)

  // 💾 SIMPAN DATA PENGIRIMAN
  const handleSaveDelivery = async () => {
    if (!driverName.trim()) {
      showToast('Mohon isi Nama Driver terlebih dahulu!', 'error')
      return
    }
    if (selectedTxIds.length === 0) {
      showToast('Pilih minimal 1 toko tujuan!', 'error')
      return
    }

    setSaving(true)

    const activeHelpers = helpers.filter((h) => h.trim() !== '')
    const storesSummary = activeSelectedTx.map((tx) => ({
      transaction_id: tx.id,
      customer_name: tx.customer_name,
      product_name: tx.product_name,
      sisa_piutang: Math.max(0, (tx.total_price || 0) - (tx.paid_amount || 0)),
      status: tx.payment_status,
    }))

    const { error } = await supabase.from('deliveries').insert([
      {
        delivery_date: selectedDate,
        driver_name: driverName,
        vehicle_no: vehicleNo || 'Tanpa Plat',
        helpers: activeHelpers,
        aggregated_items: aggregatedLoad,
        stores_data: storesSummary,
        transaction_ids: selectedTxIds,
        total_cod: totalTagihanDriver,
      },
    ])

    if (error) {
      setSaving(false)
      showToast('Gagal menyimpan data: ' + error.message, 'error')
    } else {
      await supabase
        .from('transactions')
        .update({ delivery_status: 'IN_DELIVERY' })
        .in('id', selectedTxIds)

      setSaving(false)
      showToast('Data pengiriman berhasil disimpan!', 'success')
      setDriverName('')
      setVehicleNo('')
      setHelpers([''])
      setSelectedTxIds([])
      setActiveTab('saved')
    }
  }

  return (
    <div className="p-3.5 sm:p-6 max-w-5xl mx-auto space-y-6 text-slate-900 dark:text-slate-100 relative">
      
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

      {/* Header & Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center text-xs sm:text-sm font-semibold text-slate-500 hover:text-blue-600 transition gap-1 mb-1"
          >
            ← Kembali ke Dashboard
          </Link>
          <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2">
            <span>🚚</span> Rekap Muatan Pengiriman
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Penugasan driver & helper serta simpan riwayat pengiriman harian.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === 'create'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ➕ Buat Rekap Baru
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === 'saved'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📁 Data Tersimpan
          </button>
        </div>
      </div>

      {/* ================= TAB 1: BUAT REKAP PENGIRIMAN BARU ================= */}
      {activeTab === 'create' && (
        <>
          {/* 📅 Form Penugasan */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <span>📋</span> Informasi Penugasan Pengiriman
              </h2>
              <div className="text-xs font-semibold text-slate-400">
                Tanggal: <span className="text-slate-900 dark:text-slate-100 font-bold">{selectedDate}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Pilih Tanggal</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">No. Plat / Kendaraan</label>
                  <select
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="">-- Pilih Kendaraan --</option>
                    {VEHICLE_OPTIONS.map((plate, idx) => (
                      <option key={idx} value={plate}>
                        {plate}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Nama Driver / Supir</label>
                <input
                  type="text"
                  placeholder="Ketik nama driver..."
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-400 block">
                    Helper / Kernet ({helpers.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddHelper}
                    className="text-[11px] font-bold text-blue-500 hover:text-blue-400"
                  >
                    ➕ Tambah Helper
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {helpers.map((h, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={`Helper #${idx + 1}...`}
                        value={h}
                        onChange={(e) => handleHelperChange(idx, e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-blue-500"
                      />
                      {helpers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveHelper(idx)}
                          className="text-rose-500 hover:text-rose-700 font-bold text-xs p-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 📦 KOTAK HITUNG OTOMATIS */}
          <div className="bg-blue-950/20 dark:bg-blue-950/40 p-5 rounded-2xl border border-blue-500/30 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-blue-500/20 pb-2">
              <h2 className="text-sm font-black uppercase tracking-wider text-blue-400 flex items-center gap-2">
                <span>📦</span> Rekap Total Muatan Barang Gudang (Hitung Otomatis)
              </h2>
              <span className="text-xs font-bold text-slate-400">
                {aggregatedLoad.length} Jenis Barang
              </span>
            </div>

            {aggregatedLoad.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">
                Belum ada muatan barang. Silakan pilih toko tujuan pengiriman di bawah ini.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                {aggregatedLoad.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">
                        Satuan: {item.unit}
                      </div>
                    </div>
                    <div className="text-lg font-black text-blue-500 bg-blue-500/10 px-3 py-1 rounded-lg">
                      {item.totalQty} <span className="text-xs font-bold">{item.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 🏪 DAFTAR TOKO */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <span>🏪</span> Daftar Toko Tujuan Rute Pengiriman
              </h2>

              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <input
                  type="checkbox"
                  id="selectAll"
                  checked={selectedTxIds.length === transactions.length && transactions.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded accent-blue-600 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="selectAll" className="cursor-pointer">Pilih Semua</label>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Memuat rute pengiriman...</div>
            ) : transactions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Tidak ada transaksi pengiriman yang belum di-rekap pada tanggal <span className="font-bold">{selectedDate}</span>.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-400 uppercase text-[10px] sm:text-xs font-bold tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4 text-center w-10">Pilih</th>
                      <th className="py-3 px-4">Toko Tujuan</th>
                      <th className="py-3 px-4">Pesanan Barang</th>
                      <th className="py-3 px-4 text-right">Sisa Piutang (COD)</th>
                      <th className="py-3 px-4 text-center">Status Nota</th>
                      <th className="py-3 px-4 text-center">Aksi Cepat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                    {transactions.map((tx) => {
                      const isChecked = selectedTxIds.includes(tx.id)
                      const sisaPiutang = Math.max(0, (tx.total_price || 0) - (tx.paid_amount || 0))

                      return (
                        <tr
                          key={tx.id}
                          className={`hover:bg-slate-50/50 dark:hover:bg-slate-950/50 transition ${
                            !isChecked ? 'opacity-40 bg-slate-100/20 dark:bg-slate-950/20' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleTx(tx.id)}
                              className="rounded accent-blue-600 w-4 h-4 cursor-pointer"
                            />
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                            🏪 {tx.customer_name}
                          </td>
                          <td className="py-3.5 px-4 text-slate-300">
                            {tx.product_name}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold">
                            {sisaPiutang > 0 ? (
                              <span className="text-rose-500">
                                Rp {sisaPiutang.toLocaleString('id-ID')}
                              </span>
                            ) : (
                              <span className="text-emerald-500">LUNAS (Rp 0)</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-block px-2.5 py-0.5 text-[10px] font-extrabold rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">
                              {tx.payment_status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleMarkAsDelivered(tx.id, tx.customer_name)}
                              title="Sembunyikan karena barang sudah dikirim / nota susulan"
                              className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 rounded-lg transition whitespace-nowrap"
                            >
                              ✅ Sudah Dikirim
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer Penagihan & Tombol Simpan */}
            {transactions.length > 0 && (
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs font-bold text-slate-400">
                  Total COD Harus Diterima Driver:{' '}
                  <span className="text-base font-black text-rose-500 ml-1">
                    Rp {totalTagihanDriver.toLocaleString('id-ID')}
                  </span>
                </div>

                <button
                  onClick={handleSaveDelivery}
                  disabled={saving}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                >
                  {saving ? 'Menyimpan...' : '💾 Simpan Data Pengiriman'}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ================= TAB 2: DATA PENGIRIMAN TERSIMPAN ================= */}
      {activeTab === 'saved' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <span>📁</span> Riwayat Data Pengiriman Tersimpan
              </h2>
            </div>

            {loadingSaved ? (
              <div className="p-8 text-center text-xs text-slate-400">Memuat data tersimpan...</div>
            ) : savedDeliveries.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Belum ada data pengiriman yang disimpan.
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {savedDeliveries.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedDeliveryDetail(item)}
                    className="p-4 hover:bg-slate-800/40 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-slate-100">
                          👤 {item.driver_name}
                        </span>
                        <span className="text-xs bg-blue-500/20 text-blue-400 font-bold px-2 py-0.5 rounded-md border border-blue-500/30">
                          🚘 {item.vehicle_no}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          📅 {item.delivery_date}
                        </span>
                      </div>

                      <div className="text-xs text-slate-400">
                        <strong>Helper:</strong>{' '}
                        {item.helpers && item.helpers.length > 0
                          ? item.helpers.join(', ')
                          : 'Tidak ada'}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <div className="text-right">
                        <div className="text-[10px] uppercase text-slate-400 font-bold">Total Toko & COD</div>
                        <div className="text-xs font-black text-rose-400">
                          {item.stores_data?.length || 0} Toko | Rp {(item.total_cod || 0).toLocaleString('id-ID')}
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteTargetId(item.id)
                        }}
                        className="text-xs font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded-lg border border-rose-500/20 transition"
                      >
                        🗑️ Batal
                      </button>

                      <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20">
                        Lihat Detail →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🔍 MODAL DETAIL PENGIRIMAN LENGKAP */}
      {selectedDeliveryDetail && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6 text-slate-100 shadow-2xl">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-black flex items-center gap-2">
                  <span>🚚</span> Detail Pengiriman: {selectedDeliveryDetail.driver_name}
                </h3>
                <p className="text-xs text-slate-400">
                  Tanggal Pengiriman: {selectedDeliveryDetail.delivery_date}
                </p>
              </div>
              <button
                onClick={() => setSelectedDeliveryDetail(null)}
                className="text-slate-400 hover:text-white font-bold text-xl px-2"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold">Driver / Supir:</span>
                <strong className="text-blue-400 text-sm">{selectedDeliveryDetail.driver_name}</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">No. Plat / Armada:</span>
                <strong className="text-sm">{selectedDeliveryDetail.vehicle_no}</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Helper / Kernet:</span>
                <strong className="text-sm">
                  {selectedDeliveryDetail.helpers?.length > 0
                    ? selectedDeliveryDetail.helpers.join(', ')
                    : '-'}
                </strong>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-blue-400">
                📦 Total Muatan Barang Gudang
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {selectedDeliveryDetail.aggregated_items?.map((item, idx) => (
                  <div key={idx} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                    <span className="font-bold">{item.name}</span>
                    <span className="font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                      {item.totalQty} {item.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                🏪 Daftar Toko Tujuan ({selectedDeliveryDetail.stores_data?.length} Toko)
              </h4>
              <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-900 text-slate-400 text-[10px] font-bold uppercase border-b border-slate-800">
                    <tr>
                      <th className="p-3">Toko</th>
                      <th className="p-3">Barang Pesanan</th>
                      <th className="p-3 text-right">Tagihan COD</th>
                      <th className="p-3 text-center">Status / Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {selectedDeliveryDetail.stores_data?.map((store, idx) => {
                      const isPaid = store.status === 'PAID' || store.sisa_piutang === 0

                      return (
                        <tr key={idx}>
                          <td className="p-3 font-bold">🏪 {store.customer_name}</td>
                          <td className="p-3 text-slate-300">{store.product_name}</td>
                          <td className="p-3 text-right font-bold text-rose-400">
                            Rp {store.sisa_piutang?.toLocaleString('id-ID')}
                          </td>
                          <td className="p-3 text-center">
                            {isPaid ? (
                              <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2.5 py-1 rounded-lg inline-block">
                                🟢 LUNAS
                              </span>
                            ) : (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handlePayStoreCash(idx)}
                                  disabled={processingIndex === idx}
                                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-[11px] px-2.5 py-1 rounded-lg shadow transition"
                                >
                                  {processingIndex === idx ? 'Processing...' : '💵 Terima Cash'}
                                </button>
                                <button
                                  onClick={() => handleReturnStore(idx)}
                                  disabled={processingIndex === idx}
                                  title="Nota dibawa balik karena toko tutup"
                                  className="bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 disabled:opacity-50 font-bold text-[11px] px-2 py-1 rounded-lg transition"
                                >
                                  ❌ Toko Tutup
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center border-t border-slate-800 pt-4 text-xs font-bold gap-3">
              <span>
                Total Penagihan COD Driver: <strong className="text-rose-400 text-sm ml-1">Rp {selectedDeliveryDetail.total_cod?.toLocaleString('id-ID')}</strong>
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setDeleteTargetId(selectedDeliveryDetail.id)}
                  className="w-full sm:w-auto bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-200 px-4 py-2 rounded-xl transition"
                >
                  🗑️ Batalkan Pengiriman Ini
                </button>
                <button
                  onClick={() => setSelectedDeliveryDetail(null)}
                  className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white px-5 py-2 rounded-xl transition"
                >
                  Tutup
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ⚠️ MODAL CUSTOM KONFIRMASI PEMBATALAN */}
      {deleteTargetId !== null && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full space-y-4 text-center text-slate-100 shadow-2xl">
            <div className="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-full flex items-center justify-center text-2xl mx-auto border border-rose-500/20">
              ⚠️
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-100">Batalkan Rekap Pengiriman?</h3>
              <p className="text-xs text-slate-400">
                Toko-toko di dalamnya akan otomatis kembali tersedia di daftar rekap baru.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="w-full py-2.5 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition"
              >
                Kembali
              </button>
              <button
                onClick={executeDeleteDelivery}
                className="w-full py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-lg transition"
              >
                Ya, Batalkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}