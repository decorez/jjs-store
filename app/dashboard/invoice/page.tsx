'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Customer {
  id: number
  name: string
  phone?: string
  address?: string
}

interface InvoiceItem {
  product_id: string | number
  product_name: string
  unit: 'Dus' | 'Pcs'
  quantity: number
  price: number
}

// Interface Toast Notifikasi
interface ToastState {
  message: string
  type: 'error' | 'success' | 'warning'
}

export default function InvoicePage() {
  const router = useRouter()

  // Master Data State
  const [customers, setCustomers] = useState<Customer[]>([])
  const [productsList, setProductsList] = useState<any[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // 🔔 Custom Toast State (Menggantikan Alert Browser)
  const [toast, setToast] = useState<ToastState | null>(null)

  // Helper untuk menampilkan Toast
  const showToast = (message: string, type: 'error' | 'success' | 'warning' = 'error') => {
    setToast({ message, type })
    setTimeout(() => {
      setToast(null)
    }, 4000) // Toast otomatis hilang setelah 4 detik
  }

  // Form State
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [customCustomerName, setCustomCustomerName] = useState('')
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split('T')[0]
  )

  // State Rincian Barang (Multi-Item)
  const [items, setItems] = useState<InvoiceItem[]>([
    { product_id: '', product_name: '', unit: 'Dus', quantity: 1, price: 0 }
  ])

  // State Pembayaran
  const [paidAmount, setPaidAmount] = useState<number | ''>(0)

  // Helper Presisi Mengambil Harga Dus (selling_price_per_box)
  const getBoxPrice = (p: any): number => {
    if (!p) return 0
    return Number(p.selling_price_per_box ?? p.harga_dus ?? 0)
  }

  // Helper Presisi Mengambil Harga Pcs (selling_price_per_bottle)
  const getPcsPrice = (p: any): number => {
    if (!p) return 0
    return Number(p.selling_price_per_bottle ?? p.harga_pcs ?? 0)
  }

  // Helper Presisi Cek Izin Eceran (is_retail_allowed)
  const canSellPcs = (p?: any): boolean => {
    if (!p) return true
    if (typeof p.is_retail_allowed === 'boolean') {
      return p.is_retail_allowed
    }
    return getPcsPrice(p) > 0
  }

  // Fetch Master Data Toko & Produk
  useEffect(() => {
    async function fetchMasterData() {
      setLoadingData(true)
      const [custRes, prodRes] = await Promise.all([
        supabase.from('customers').select('*').order('name', { ascending: true }),
        supabase.from('products').select('*').order('name', { ascending: true })
      ])

      if (custRes.data) setCustomers(custRes.data)
      if (prodRes.data) setProductsList(prodRes.data)
      if (prodRes.error) console.error('Error load products:', prodRes.error.message)
      setLoadingData(false)
    }
    fetchMasterData()
  }, [])

  // Handler Tambah Baris Barang
  const handleAddItem = () => {
    setItems([...items, { product_id: '', product_name: '', unit: 'Dus', quantity: 1, price: 0 }])
  }

  // Handler Hapus Baris Barang
  const handleRemoveItem = (index: number) => {
    if (items.length === 1) {
      showToast('Minimal harus ada 1 barang dalam nota!', 'warning')
      return
    }
    setItems(items.filter((_, i) => i !== index))
  }

  // Handler Perubahan Item Barang
  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const updatedItems = [...items]
    const currentItem = updatedItems[index]

    if (field === 'product_id') {
      if (value === 'MANUAL') {
        updatedItems[index] = {
          ...currentItem,
          product_id: 'MANUAL',
          product_name: '',
          unit: 'Dus',
          price: 0
        }
      } else {
        const foundProd = productsList.find((p) => String(p.id) === String(value))
        if (foundProd) {
          const allowsPcs = canSellPcs(foundProd)
          const targetUnit = allowsPcs ? currentItem.unit : 'Dus'
          const autoPrice = targetUnit === 'Dus' ? getBoxPrice(foundProd) : getPcsPrice(foundProd)

          updatedItems[index] = {
            ...currentItem,
            product_id: value,
            product_name: foundProd.name,
            unit: targetUnit,
            price: autoPrice
          }
        }
      }
    } else if (field === 'unit') {
      const foundProd = productsList.find((p) => String(p.id) === String(currentItem.product_id))
      let autoPrice = currentItem.price

      if (foundProd) {
        autoPrice = value === 'Dus' ? getBoxPrice(foundProd) : getPcsPrice(foundProd)
      }

      updatedItems[index] = {
        ...currentItem,
        unit: value,
        price: autoPrice
      }
    } else {
      updatedItems[index] = {
        ...currentItem,
        [field]: value
      }
    }

    setItems(updatedItems)
  }

  // Hitung Total Nota Otomatis
  const totalPrice = items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0
    const prc = Number(item.price) || 0
    return sum + (qty * prc)
  }, 0)

  const paidNum = Number(paidAmount) || 0
  const remainingNum = Math.max(0, totalPrice - paidNum)

  // Submit Handler dengan Pemotongan Stok
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 🛑 Validasi Custom Toko / Pelanggan
    if (!selectedCustomer) {
      showToast('⚠️ Silakan pilih Toko / Pelanggan terlebih dahulu!', 'warning')
      return
    }

    const finalCustomerName =
      selectedCustomer === 'OTHER'
        ? customCustomerName.trim()
        : selectedCustomer.trim()

    if (!finalCustomerName) {
      showToast('⚠️ Silakan isi nama toko/pelanggan baru!', 'warning')
      return
    }

    // Validasi Item Barang
    const validItems = items.filter(item => item.product_name.trim() !== '' && item.quantity > 0)
    if (validItems.length === 0) {
      showToast('⚠️ Pilih minimal 1 barang dengan jumlah yang valid!', 'warning')
      return
    }

    // 🛑 Validasi Kecukupan Stok Sebelum Disimpan
    for (const item of validItems) {
      if (item.product_id === 'MANUAL') continue

      const prod = productsList.find((p) => String(p.id) === String(item.product_id))
      if (prod) {
        if (item.unit === 'Dus') {
          const availBox = prod.box_stock || 0
          if (item.quantity > availBox) {
            showToast(`❌ Stok ${prod.name} tidak cukup! Tersedia: ${availBox} Dus, Diminta: ${item.quantity} Dus.`, 'error')
            return
          }
        } else if (item.unit === 'Pcs') {
          const availPcs = (prod.bottle_stock || 0) + ((prod.box_stock || 0) * (prod.units_per_box || 1))
          if (item.quantity > availPcs) {
            showToast(`❌ Stok ${prod.name} (Pcs) tidak cukup! Tersedia: ${availPcs} Pcs, Diminta: ${item.quantity} Pcs.`, 'error')
            return
          }
        }
      }
    }

    setSubmitting(true)

    // Format Ringkasan Deskripsi Produk
    const productSummary = validItems
      .map(item => `${item.quantity} ${item.unit} ${item.product_name}`)
      .join(', ')

    // Status Pembayaran
    let paymentStatus = 'UNPAID'
    if (paidNum >= totalPrice && totalPrice > 0) {
      paymentStatus = 'PAID'
    } else if (paidNum > 0 && paidNum < totalPrice) {
      paymentStatus = 'PARTIAL'
    }

    // Riwayat DP / Pembayaran Awal
    const initialHistory =
      paidNum > 0
        ? [
            {
              amount: paidNum,
              date: new Date().toISOString(),
              sales_name: 'Kasir (Pembayaran Awal)',
            },
          ]
        : []

    // 📝 Simpan Transaksi Ke Database
    const { error: txError } = await supabase.from('transactions').insert([
      {
        customer_name: finalCustomerName,
        transaction_date: transactionDate,
        product_name: productSummary,
        total_price: totalPrice,
        paid_amount: paidNum,
        payment_status: paymentStatus,
        payment_history: initialHistory,
        is_carried: false,
      },
    ])

    if (txError) {
      setSubmitting(false)
      showToast('Gagal membuat nota: ' + txError.message, 'error')
      return
    }

    // 📦 Potong Stok Barang di Tabel `products`
    for (const item of validItems) {
      if (item.product_id === 'MANUAL') continue

      const prod = productsList.find((p) => String(p.id) === String(item.product_id))
      if (!prod) continue

      if (item.unit === 'Dus') {
        const newBoxStock = Math.max(0, (prod.box_stock || 0) - item.quantity)
        await supabase
          .from('products')
          .update({ box_stock: newBoxStock })
          .eq('id', prod.id)
      } else if (item.unit === 'Pcs') {
        let currentBottle = prod.bottle_stock || 0
        let currentBox = prod.box_stock || 0
        const unitsPerBox = prod.units_per_box || 1

        if (currentBottle >= item.quantity) {
          currentBottle -= item.quantity
        } else {
          const neededPcs = item.quantity - currentBottle
          const boxesToBreak = Math.ceil(neededPcs / unitsPerBox)
          currentBox = Math.max(0, currentBox - boxesToBreak)
          currentBottle = (currentBottle + (boxesToBreak * unitsPerBox)) - item.quantity
        }

        await supabase
          .from('products')
          .update({
            box_stock: currentBox,
            bottle_stock: currentBottle,
          })
          .eq('id', prod.id)
      }
    }

    setSubmitting(false)
    showToast('✅ Nota transaksi berhasil disimpan & stok otomatis berkurang!', 'success')
    
    // Redirect ke riwayat penjualan setelah singkat
    setTimeout(() => {
      router.push('/dashboard/sales')
    }, 1500)
  }

  return (
    <div className="p-3.5 sm:p-6 max-w-5xl mx-auto space-y-6 text-slate-900 dark:text-slate-100 relative">
      
      {/* 🔔 CUSTOM TOAST NOTIFICATION COMPONENT */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 max-w-md animate-bounce-short">
          <div
            className={`flex items-start gap-3 p-4 rounded-2xl shadow-2xl border backdrop-blur-md transition-all ${
              toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
                : toast.type === 'warning'
                ? 'bg-amber-950/90 border-amber-500/50 text-amber-200'
                : 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
            }`}
          >
            <div className="text-xl">
              {toast.type === 'error' ? '❌' : toast.type === 'warning' ? '⚠️' : '✅'}
            </div>
            <div className="flex-1 text-xs sm:text-sm font-semibold leading-relaxed">
              {toast.message}
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-white font-bold text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center text-xs sm:text-sm font-semibold text-slate-500 hover:text-blue-600 transition gap-1 mb-1"
        >
          ← Kembali ke Dashboard
        </Link>
        <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2">
          <span>📝</span> Input Nota / Faktur Penjualan
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Pilih toko, masukkan rincian barang dari katalog, dan hitung total otomatis.
        </p>
      </div>

      {/* Form dengan `noValidate` untuk Mematikan Tooltip Browser */}
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Card 1: Informasi Toko & Tanggal */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <span>🏪</span> Informasi Toko & Tanggal
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1.5">
                Tanggal Transaksi <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1.5">
                Pilih Toko / Pelanggan <span className="text-rose-500">*</span>
              </label>
              {loadingData ? (
                <div className="text-xs text-slate-400 py-2.5">Memuat data toko...</div>
              ) : (
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Pilih Toko Terdaftar --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.name}>
                      🏪 {c.name} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                  <option value="OTHER">➕ + Input Manual / Toko Baru</option>
                </select>
              )}
            </div>
          </div>

          {selectedCustomer === 'OTHER' && (
            <div className="bg-blue-50/50 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-200 dark:border-blue-900/50">
              <label className="text-xs font-bold text-blue-600 dark:text-blue-400 block mb-1">
                Nama Toko Baru (Input Manual)
              </label>
              <input
                type="text"
                placeholder="Ketik nama toko..."
                value={customCustomerName}
                onChange={(e) => setCustomCustomerName(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          )}
        </div>

        {/* Card 2: Rincian Barang (Multi-Item) */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <span>📦</span> Daftar Barang Belanjaan
            </h2>
            <button
              type="button"
              onClick={handleAddItem}
              className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-900 hover:bg-blue-100 transition"
            >
              ➕ Tambah Barang
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => {
              const subtotal = (Number(item.quantity) || 0) * (Number(item.price) || 0)
              const selectedProd = productsList.find((p) => String(p.id) === String(item.product_id))
              const allowsPcs = canSellPcs(selectedProd)

              return (
                <div
                  key={index}
                  className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-3 items-center"
                >
                  {/* Select Produk Master / Custom */}
                  <div className="md:col-span-4 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 block md:hidden">
                      Produk #{index + 1}
                    </label>
                    <select
                      value={item.product_id}
                      onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500"
                    >
                      <option value="">-- Pilih Barang dari Katalog --</option>
                      {productsList.map((p) => {
                        return (
                          <option key={p.id} value={p.id}>
                            📦 {p.name} (Stok: {p.box_stock || 0} Dus)
                          </option>
                        )
                      })}
                      <option value="MANUAL">✍️ Input Nama Barang Custom</option>
                    </select>

                    {item.product_id === 'MANUAL' && (
                      <input
                        type="text"
                        placeholder="Nama barang custom..."
                        value={item.product_name}
                        onChange={(e) => handleItemChange(index, 'product_name', e.target.value)}
                        className="w-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                      />
                    )}
                  </div>

                  {/* Satuan (Dus / Pcs) */}
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Satuan</label>
                    <select
                      value={item.unit}
                      disabled={!allowsPcs && item.product_id !== 'MANUAL'}
                      onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500 disabled:opacity-60 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed"
                    >
                      <option value="Dus">📦 Dus</option>
                      {allowsPcs && <option value="Pcs">🥤 Pcs</option>}
                    </select>
                  </div>

                  {/* Quantity */}
                  <div className="md:col-span-1">
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-2 text-xs font-bold text-center focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Harga Satuan */}
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Harga (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      value={item.price}
                      onChange={(e) => handleItemChange(index, 'price', Number(e.target.value))}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-2 text-xs font-bold text-right focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Subtotal */}
                  <div className="md:col-span-2 text-right">
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">Subtotal</span>
                    <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                      Rp {subtotal.toLocaleString('id-ID')}
                    </span>
                  </div>

                  {/* Tombol Hapus */}
                  <div className="md:col-span-1 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="text-rose-500 hover:text-rose-700 text-xs p-1 font-bold"
                      title="Hapus Barang Ini"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Card 3: Pembayaran & Ringkasan Total */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <span>💳</span> Ringkasan Pembayaran
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1.5">
                Bayar Tunai / Uang Muka DP (Rp)
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-base font-bold text-emerald-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-center space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-semibold">Total Tagihan Nota:</span>
                <span className="text-base font-black text-blue-600">
                  Rp {totalPrice.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-semibold">Sisa Piutang Toko:</span>
                <span className={`text-sm font-black ${remainingNum > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                  Rp {remainingNum.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <Link
              href="/dashboard"
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-md transition disabled:opacity-50"
            >
              {submitting ? 'Menyimpan & Memotong Stok...' : '💾 Simpan & Terbitkan Nota'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}