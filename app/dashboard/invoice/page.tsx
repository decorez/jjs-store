'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function InvoicePage() {
  const [stores, setStores] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  
  const [customerName, setCustomerName] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const [status, setStatus] = useState('PAID')

  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split('T')[0]
  )

  const [dueDate, setDueDate] = useState('')
  
  const [orderItems, setOrderItems] = useState([
    { product_id: '', quantity: 1, unit: 'Dus', price: 0 }
  ])
  
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function fetchData() {
      const { data: storeData } = await supabase.from('stores').select('name')
      if (storeData) {
        setStores(storeData.map(s => s.name))
      }

      const { data: prodData } = await supabase.from('products').select('*').order('name')
      if (prodData) {
        setProducts(prodData)
      }
    }
    fetchData()

    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredStores = stores.filter(store => 
    store.toLowerCase().includes(customerName.toLowerCase())
  )

  const addProductRow = () => {
    setOrderItems([...orderItems, { product_id: '', quantity: 1, unit: 'Dus', price: 0 }])
  }

  const removeProductRow = (index: number) => {
    if (orderItems.length === 1) return
    const updated = orderItems.filter((_, i) => i !== index)
    setOrderItems(updated)
  }

  const handleItemChange = (index: number, field: 'product_id' | 'quantity' | 'unit' | 'price', value: any) => {
    const updated = [...orderItems]

    if (field === 'product_id') {
      updated[index].product_id = value
      const selectedProd = products.find(p => String(p.id) === String(value))
      
      if (selectedProd) {
        if (selectedProd.is_retail_allowed === false) {
          updated[index].unit = 'Dus'
          updated[index].price = Number(selectedProd.selling_price_per_box) || 0
        } else {
          if (updated[index].unit === 'Dus') {
            updated[index].price = Number(selectedProd.selling_price_per_box) || 0
          } else {
            updated[index].price = Number(selectedProd.selling_price_per_bottle) || 0
          }
        }
      } else {
        updated[index].price = 0
      }
    } else if (field === 'unit') {
      const selectedProd = products.find(p => String(p.id) === String(updated[index].product_id))
      
      if (value === 'Pcs' && selectedProd && selectedProd.is_retail_allowed === false) {
        alert('Produk ini hanya boleh dijual per Dus!')
        return
      }

      updated[index].unit = value
      if (selectedProd) {
        if (value === 'Dus') {
          updated[index].price = Number(selectedProd.selling_price_per_box) || 0
        } else {
          updated[index].price = Number(selectedProd.selling_price_per_bottle) || 0
        }
      }
    } else if (field === 'quantity') {
      updated[index].quantity = value === '' ? '' : value
    } else if (field === 'price') {
      updated[index].price = value === '' ? '' : value
    }

    setOrderItems(updated)
  }

  const grandTotal = orderItems.reduce((sum, item) => {
    const qty = item.quantity === '' ? 0 : Number(item.quantity)
    const price = item.price === '' ? 0 : Number(item.price)
    return sum + (qty * price)
  }, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!customerName.trim() || orderItems.some(item => !item.product_id)) {
      alert('Mohon lengkapi nama pembeli dan pilih produk dengan benar!')
      return
    }

    setLoading(true)
    const transactionTimestamp = new Date().toISOString()

    const productSummaryList = orderItems.map(item => {
      const selectedProd = products.find(p => String(p.id) === String(item.product_id))
      const name = selectedProd ? selectedProd.name : 'Unknown Product'
      const qty = item.quantity === '' ? 1 : Number(item.quantity)
      return `${name} (${qty} ${item.unit})`
    })

    const combinedProductName = productSummaryList.join(', ')
    const totalJenis = orderItems.length

    const initialPaid = status === 'PAID' ? grandTotal : 0

    const { error: txError } = await supabase.from('transactions').insert([
      {
        customer_name: customerName.trim(),
        product_name: combinedProductName,
        qty: totalJenis,
        unit: 'Jenis',
        price_per_unit: grandTotal,
        total_price: grandTotal,
        paid_amount: initialPaid,
        payment_status: status,
        transaction_date: transactionDate,
        due_date: dueDate || null,
        created_at: transactionTimestamp,
      }
    ])

    if (txError) {
      alert('Gagal menyimpan transaksi: ' + txError.message)
      setLoading(false)
      return
    }

    for (const item of orderItems) {
      const selectedProd = products.find(p => String(p.id) === String(item.product_id))
      if (selectedProd) {
        const finalQty = item.quantity === '' ? 1 : Number(item.quantity)
        let currentBox = Number(selectedProd.box_stock) || 0
        let currentBottle = Number(selectedProd.bottle_stock) || 0
        const unitsPerBox = Number(selectedProd.units_per_box) || 12

        if (item.unit === 'Dus') {
          currentBox = Math.max(0, currentBox - finalQty)
        } else {
          let totalPcs = (currentBox * unitsPerBox) + currentBottle - finalQty
          if (totalPcs < 0) totalPcs = 0
          currentBox = Math.floor(totalPcs / unitsPerBox)
          currentBottle = totalPcs % unitsPerBox
        }

        await supabase
          .from('products')
          .update({ 
            box_stock: currentBox,
            bottle_stock: currentBottle 
          })
          .eq('id', selectedProd.id)
      }
    }

    setLoading(false)
    alert(`Nota berhasil disimpan & stok dipotong! Total: Rp ${grandTotal.toLocaleString('id-ID')}`)
    
    setCustomerName('')
    setDueDate('')
    setOrderItems([{ product_id: '', quantity: 1, unit: 'Dus', price: 0 }])

    const { data: prodData } = await supabase.from('products').select('*').order('name')
    if (prodData) setProducts(prodData)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 text-slate-100">
      {/* Tombol Navigasi Kembali */}
      <div>
        <Link 
          href="/dashboard"
          className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white transition gap-1"
        >
          ← Kembali ke Dashboard
        </Link>
      </div>

      {/* Card Utama Form */}
      <div className="bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-2xl space-y-6">
        <div className="border-b border-slate-800/80 pb-4">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span>➕</span> Input Pesanan Multi-Produk
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Harga otomatis terisi berdasarkan jenis produk dan satuan (Dus/Pcs).
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Input Nama Toko + Autocomplete */}
          <div className="relative" ref={wrapperRef}>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Nama Pembeli / Toko / Tetangga
            </label>
            <input 
              type="text" 
              placeholder="Ketik nama toko..."
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value)
                setShowSuggestions(true)
              }}
              onFocus={() => setShowSuggestions(true)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              required
            />
            
            {showSuggestions && filteredStores.length > 0 && (
              <ul className="absolute z-30 left-0 right-0 bg-slate-900 border border-slate-800 rounded-xl mt-1 shadow-2xl max-h-48 overflow-y-auto divide-y divide-slate-800/60">
                {filteredStores.map((store, idx) => (
                  <li 
                    key={idx}
                    onClick={() => {
                      setCustomerName(store)
                      setShowSuggestions(false)
                    }}
                    className="px-4 py-2.5 text-sm hover:bg-slate-800/80 cursor-pointer text-slate-200 flex items-center justify-between transition"
                  >
                    <span className="flex items-center gap-2">🏪 {store}</span>
                    <span className="text-xs text-blue-400 font-medium bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">Pilih Toko</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Input Tanggal Transaksi */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
              Tanggal Nota / Transaksi
            </label>
            <input 
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition [color-scheme:dark]"
            />
          </div>

          {/* Baris Daftar Produk */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                Daftar Produk Dipesan
              </label>
              <button 
                type="button"
                onClick={addProductRow}
                className="text-xs bg-emerald-500/10 text-emerald-400 font-semibold px-3 py-1.5 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/20 transition flex items-center gap-1"
              >
                <span>+</span> Tambah Jenis Produk Lain
              </button>
            </div>

            {orderItems.map((item, index) => {
              const selectedProd = products.find(p => String(p.id) === String(item.product_id))
              const isRetailAllowed = selectedProd ? selectedProd.is_retail_allowed !== false : true

              return (
                <div key={index} className="flex flex-col sm:flex-row items-center gap-3 p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  {/* Select Produk */}
                  <div className="w-full sm:flex-1">
                    <select 
                      value={item.product_id}
                      onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      required
                    >
                      <option value="" className="bg-slate-900 text-slate-400">-- Pilih Produk --</option>
                      {products.map((p) => {
                        const bBox = p.box_stock || 0
                        const bBottle = p.bottle_stock || 0
                        const limit = p.units_per_box || 12
                        const totalPcs = (bBox * limit) + bBottle
                        const finalBox = Math.floor(totalPcs / limit)
                        const finalBottle = totalPcs % limit

                        let stockText = 'Habis'
                        if (finalBox > 0 && finalBottle === 0) stockText = `${finalBox} Dus`
                        else if (finalBox === 0 && finalBottle > 0) stockText = `${finalBottle} Pcs`
                        else if (finalBox > 0 && finalBottle > 0) stockText = `${finalBox} Dus ${finalBottle} Pcs`

                        return (
                          <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                            {p.name} (Stok: {stockText}) {p.is_retail_allowed === false ? '- Grosir' : ''}
                          </option>
                        )
                      })}
                    </select>
                  </div>

                  {/* Qty Input */}
                  <div className="w-full sm:w-24">
                    <input 
                      type="number" 
                      min="1"
                      placeholder="Jumlah"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white text-center focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  {/* Unit Select */}
                  <div className="w-full sm:w-32">
                    <select
                      value={item.unit}
                      onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none font-medium focus:border-blue-500"
                    >
                      <option value="Dus" className="bg-slate-900 text-white">Dus</option>
                      {isRetailAllowed && <option value="Pcs" className="bg-slate-900 text-white">Pcs (Eceran)</option>}
                    </select>
                  </div>

                  {/* Price Input */}
                  <div className="w-full sm:w-36">
                    <input 
                      type="number" 
                      placeholder="Harga Satuan"
                      value={item.price}
                      onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-emerald-400 font-bold text-right focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  {/* Hapus Baris */}
                  {orderItems.length > 1 && (
                    <button 
                      type="button"
                      onClick={() => removeProductRow(index)}
                      className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                      title="Hapus baris ini"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Status Pembayaran & Total Tagihan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Status Pembayaran
              </label>
              <select 
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="PAID" className="bg-slate-900 text-white">PAID (Lunas)</option>
                <option value="UNPAID" className="bg-slate-900 text-white">UNPAID (Belum Bayar / Tempo)</option>
              </select>
            </div>

            <div className="flex flex-col justify-end items-end p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-0.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Tagihan Keseluruhan
              </span>
              <span className="text-2xl font-black text-blue-400">
                Rp {grandTotal.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          {/* Input Jatuh Tempo (Jika Tempo) */}
          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl space-y-1.5">
            <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider">
              Tanggal Jatuh Tempo (Tagihan Sales)
            </label>
            <input 
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 [color-scheme:dark]"
            />
            <p className="text-[11px] text-amber-300/80">
              Atur tanggal kapan sales harus menagih nota ini ke toko.
            </p>
          </div>

          {/* Tombol Submit */}
          <div className="pt-2">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-3.5 rounded-xl shadow-lg shadow-blue-600/30 transition transform active:scale-98 disabled:opacity-50 text-sm tracking-wide"
            >
              {loading ? 'Menyimpan...' : 'Simpan Nota & Potong Stok 🚀'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}