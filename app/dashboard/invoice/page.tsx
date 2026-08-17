'use client'

import { useState, useEffect, useRef } from 'react'
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

interface ToastState {
  message: string
  type: 'error' | 'success' | 'warning'
}

// 🔍 Komponen Autocomplete Barang per Baris
function ProductSearchSelect({
  selectedProductId,
  selectedProductName,
  productsList,
  onSelectProduct,
}: {
  selectedProductId: string | number
  selectedProductName: string
  productsList: any[]
  onSelectProduct: (product: any | 'MANUAL' | null) => void
}) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (selectedProductId && selectedProductId !== 'MANUAL') {
      const prod = productsList.find((p) => String(p.id) === String(selectedProductId))
      if (prod) setQuery(prod.name)
    } else if (selectedProductId === 'MANUAL') {
      setQuery(selectedProductName)
    } else {
      setQuery('')
    }
  }, [selectedProductId, selectedProductName, productsList])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredProducts = productsList.filter((p) =>
    p.name?.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="relative flex items-center">
        <input
          type="text"
          placeholder="🔍 Ketik nama barang..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
            if (selectedProductId) onSelectProduct(null)
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500 pr-7"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              onSelectProduct(null)
            }}
            className="absolute right-2 text-slate-400 hover:text-slate-200 font-bold text-xs"
            title="Reset Barang"
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-40 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-h-52 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  onSelectProduct(p)
                  setQuery(p.name)
                  setIsOpen(false)
                }}
                className="p-2.5 hover:bg-blue-50 dark:hover:bg-blue-950/50 cursor-pointer transition flex justify-between items-center text-xs"
              >
                <div>
                  <span className="font-bold text-slate-900 dark:text-slate-100 block">📦 {p.name}</span>
                  <span className="text-[10px] text-slate-400">
                    Rp {Number(p.selling_price_per_box ?? p.harga_dus ?? 0).toLocaleString('id-ID')} / Dus
                  </span>
                </div>
                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-semibold shrink-0">
                  Stok: {p.box_stock || 0} Dus
                </span>
              </div>
            ))
          ) : (
            <div className="p-2.5 text-xs text-slate-400 text-center">Barang "{query}" tidak ditemukan.</div>
          )}

          <div
            onClick={() => {
              onSelectProduct('MANUAL')
              setIsOpen(false)
            }}
            className="p-2.5 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 cursor-pointer transition text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5"
          >
            <span>✍️</span> + Input Nama Barang Custom / Manual
          </div>
        </div>
      )}
    </div>
  )
}

export default function InvoicePage() {
  const router = useRouter()

  // Master Data State
  const [customers, setCustomers] = useState<Customer[]>([])
  const [productsList, setProductsList] = useState<any[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // 🔔 Custom Toast State
  const [toast, setToast] = useState<ToastState | null>(null)

  const showToast = (message: string, type: 'error' | 'success' | 'warning' = 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Form State Tanggal
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split('T')[0]
  )

  // 🔍 State Searchable Customer Dropdown
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false)
  const [selectedCustomerData, setSelectedCustomerData] = useState<Customer | null>(null)
  const [isManualCustomer, setIsManualCustomer] = useState(false)
  const [customCustomerName, setCustomCustomerName] = useState('')
  const [customCustomerAddress, setCustomCustomerAddress] = useState('')
  const customerDropdownRef = useRef<HTMLDivElement>(null)

  // State Rincian Barang (Multi-Item)
  const [items, setItems] = useState<InvoiceItem[]>([
    { product_id: '', product_name: '', unit: 'Dus', quantity: 1, price: 0 }
  ])

  // State Pembayaran
  const [paidAmount, setPaidAmount] = useState<number | ''>(0)

  // Helper Presisi Mengambil Harga Dus & Pcs
  const getBoxPrice = (p: any): number => Number(p?.selling_price_per_box ?? p?.harga_dus ?? 0)
  const getPcsPrice = (p: any): number => Number(p?.selling_price_per_bottle ?? p?.harga_pcs ?? 0)

  const canSellPcs = (p?: any): boolean => {
    if (!p) return true
    if (typeof p.is_retail_allowed === 'boolean') return p.is_retail_allowed
    return getPcsPrice(p) > 0
  }

  // Fetch Master Data
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

  // Event handler menutup dropdown toko saat klik di luar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setIsCustomerDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter Toko
  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      (c.address && c.address.toLowerCase().includes(customerSearchQuery.toLowerCase())) ||
      (c.phone && c.phone.includes(customerSearchQuery))
  )

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomerData(customer)
    setCustomerSearchQuery(customer.name)
    setIsManualCustomer(false)
    setIsCustomerDropdownOpen(false)
  }

  const handleClearCustomer = () => {
    setSelectedCustomerData(null)
    setCustomerSearchQuery('')
    setIsManualCustomer(false)
    setCustomCustomerName('')
    setCustomCustomerAddress('')
  }

  // Handler Item Barang
  const handleAddItem = () => {
    setItems([...items, { product_id: '', product_name: '', unit: 'Dus', quantity: 1, price: 0 }])
  }

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) {
      showToast('Minimal harus ada 1 barang dalam nota!', 'warning')
      return
    }
    setItems(items.filter((_, i) => i !== index))
  }

  const handleSelectProductInItem = (index: number, selected: any | 'MANUAL' | null) => {
    const updatedItems = [...items]
    const currentItem = updatedItems[index]

    if (!selected) {
      updatedItems[index] = {
        ...currentItem,
        product_id: '',
        product_name: '',
        price: 0
      }
    } else if (selected === 'MANUAL') {
      updatedItems[index] = {
        ...currentItem,
        product_id: 'MANUAL',
        product_name: '',
        unit: 'Dus',
        price: 0
      }
    } else {
      const allowsPcs = canSellPcs(selected)
      const targetUnit = allowsPcs ? currentItem.unit : 'Dus'
      const autoPrice = targetUnit === 'Dus' ? getBoxPrice(selected) : getPcsPrice(selected)

      updatedItems[index] = {
        ...currentItem,
        product_id: selected.id,
        product_name: selected.name,
        unit: targetUnit,
        price: autoPrice
      }
    }

    setItems(updatedItems)
  }

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const updatedItems = [...items]
    const currentItem = updatedItems[index]

    if (field === 'unit') {
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

  // Hitung Total Nota
  const totalPrice = items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0
    const prc = Number(item.price) || 0
    return sum + (qty * prc)
  }, 0)

  const paidNum = Number(paidAmount) || 0
  const remainingNum = Math.max(0, totalPrice - paidNum)

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    let finalCustomerName = ''
    let finalCustomerAddress = ''
    let finalCustomerId: number | null = null

    if (isManualCustomer) {
      if (!customCustomerName.trim()) {
        showToast('⚠️ Silakan isi nama toko/pelanggan baru!', 'warning')
        return
      }
      finalCustomerName = customCustomerName.trim()
      finalCustomerAddress = customCustomerAddress.trim()
    } else if (selectedCustomerData) {
      finalCustomerId = selectedCustomerData.id
      finalCustomerName = selectedCustomerData.name
      finalCustomerAddress = selectedCustomerData.address || ''
    } else {
      showToast('⚠️ Silakan cari dan pilih Toko / Pelanggan terlebih dahulu!', 'warning')
      return
    }

    const validItems = items.filter(item => item.product_name.trim() !== '' && item.quantity > 0)
    if (validItems.length === 0) {
      showToast('⚠️ Pilih minimal 1 barang dengan jumlah yang valid!', 'warning')
      return
    }

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

    const productSummary = validItems
      .map(item => `${item.quantity} ${item.unit} ${item.product_name}`)
      .join(', ')

    let paymentStatus = 'UNPAID'
    if (paidNum >= totalPrice && totalPrice > 0) {
      paymentStatus = 'PAID'
    } else if (paidNum > 0 && paidNum < totalPrice) {
      paymentStatus = 'PARTIAL'
    }

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

    const { error: txError } = await supabase.from('transactions').insert([
      {
        customer_id: finalCustomerId,
        customer_name: finalCustomerName,
        customer_address: finalCustomerAddress,
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
    
    setTimeout(() => {
      router.push('/dashboard/sales')
    }, 1500)
  }

  return (
    <div className="p-3.5 sm:p-6 max-w-5xl mx-auto space-y-6 text-slate-900 dark:text-slate-100 relative">
      
      {/* 🔔 CUSTOM TOAST NOTIFICATION */}
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
              type="button"
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
                className="bg-slate-800 text-white border border-slate-700 rounded-xl p-2.5 [color-scheme:dark]"
              />
            </div>

            {/* SEARCHABLE COMBOBOX TOKO */}
            <div className="relative" ref={customerDropdownRef}>
              <label className="text-xs font-bold text-slate-500 block mb-1.5">
                Pilih Toko / Pelanggan <span className="text-rose-500">*</span>
              </label>
              
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="🔍 Ketik nama toko, alamat, atau HP..."
                  value={customerSearchQuery}
                  onChange={(e) => {
                    setCustomerSearchQuery(e.target.value)
                    setIsCustomerDropdownOpen(true)
                    if (selectedCustomerData) setSelectedCustomerData(null)
                  }}
                  onFocus={() => setIsCustomerDropdownOpen(true)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:border-blue-500 pr-10"
                />
                {(customerSearchQuery || selectedCustomerData || isManualCustomer) && (
                  <button
                    type="button"
                    onClick={handleClearCustomer}
                    className="absolute right-3 text-slate-400 hover:text-slate-200 font-bold text-xs"
                    title="Reset Pilihan"
                  >
                    ✕
                  </button>
                )}
              </div>

              {isCustomerDropdownOpen && (
                <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {loadingData ? (
                    <div className="p-3 text-xs text-slate-400 text-center">Memuat daftar toko...</div>
                  ) : filteredCustomers.length > 0 ? (
                    filteredCustomers.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => handleSelectCustomer(c)}
                        className="p-3 hover:bg-blue-50 dark:hover:bg-blue-950/50 cursor-pointer transition flex items-start justify-between gap-2"
                      >
                        <div>
                          <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                            🏪 {c.name}
                          </div>
                          {c.address && (
                            <div className="text-[11px] text-slate-400">📍 {c.address}</div>
                          )}
                        </div>
                        {c.phone && (
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">
                            📞 {c.phone}
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-xs text-slate-400 text-center">
                      Toko "{customerSearchQuery}" tidak ditemukan.
                    </div>
                  )}

                  <div
                    onClick={() => {
                      setIsManualCustomer(true)
                      setSelectedCustomerData(null)
                      setIsCustomerDropdownOpen(false)
                    }}
                    className="p-3 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 cursor-pointer transition text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2"
                  >
                    <span>➕</span> + Input Toko Baru / Manual
                  </div>
                </div>
              )}
            </div>
          </div>

          {selectedCustomerData && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl flex items-center justify-between">
              <div className="text-xs">
                <span className="font-bold text-emerald-500 block">✓ Toko Terpilih:</span>
                <strong className="text-slate-900 dark:text-slate-100">{selectedCustomerData.name}</strong>
                {selectedCustomerData.address && (
                  <span className="text-slate-400 block text-[11px]">📍 {selectedCustomerData.address}</span>
                )}
              </div>
              <button
                type="button"
                onClick={handleClearCustomer}
                className="text-xs text-slate-400 hover:text-rose-500 font-bold px-2 py-1"
              >
                Ganti
              </button>
            </div>
          )}

          {isManualCustomer && (
            <div className="bg-blue-50/50 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 space-y-3">
              <div className="text-xs font-bold text-blue-600 dark:text-blue-400">📝 Form Toko Baru (Manual)</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Nama Toko Baru *</label>
                  <input
                    type="text"
                    placeholder="Contoh: Toko Barokah"
                    value={customCustomerName}
                    onChange={(e) => setCustomCustomerName(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Alamat Toko</label>
                  <input
                    type="text"
                    placeholder="Contoh: Jl. Merdeka No. 10"
                    value={customCustomerAddress}
                    onChange={(e) => setCustomCustomerAddress(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Rincian Barang (Multi-Item Searchable) */}
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
                  {/* BARANG SEARCHABLE AUTOCOMPLETE */}
                  <div className="md:col-span-4 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">
                      Produk #{index + 1}
                    </label>
                    <ProductSearchSelect
                      selectedProductId={item.product_id}
                      selectedProductName={item.product_name}
                      productsList={productsList}
                      onSelectProduct={(selected) => handleSelectProductInItem(index, selected)}
                    />

                    {item.product_id === 'MANUAL' && (
                      <input
                        type="text"
                        placeholder="Ketik nama barang custom..."
                        value={item.product_name}
                        onChange={(e) => handleItemChange(index, 'product_name', e.target.value)}
                        className="w-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                      />
                    )}
                  </div>

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

                  <div className="md:col-span-2 text-right">
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">Subtotal</span>
                    <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                      Rp {subtotal.toLocaleString('id-ID')}
                    </span>
                  </div>

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