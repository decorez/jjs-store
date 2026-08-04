'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function Home() {
  const businessId = 1

  // State Data
  const [products, setProducts] = useState<any[]>([])
  const [stores, setStores] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // State Laporan Ringkas
  const [totalReceivable, setTotalReceivable] = useState(0)
  const [totalBoxStock, setTotalBoxStock] = useState(0)
  const [todayOmzet, setTodayOmzet] = useState(0)

  // State Filter & Pencarian
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')

  // State Form Tambah / Restok Produk
  const [selectedProductId, setSelectedProductId] = useState<string>('NEW')
  const [name, setName] = useState('')
  const [boxStock, setBoxStock] = useState<number | string>(0)
  const [sellingPricePerBox, setSellingPricePerBox] = useState('')
  const [isRetailAllowed, setIsRetailAllowed] = useState(false)
  const [unitsPerBox, setUnitsPerBox] = useState<number | string>(24)
  const [sellingPricePerBottle, setSellingPricePerBottle] = useState('')

  // State Form Barang Pecah / Rusak
  const [damagedProductId, setDamagedProductId] = useState('')
  const [damagedQty, setDamagedQty] = useState<number | string>(1)
  const [damagedUnit, setDamagedUnit] = useState('BOX')
  const [damagedNotes, setDamagedNotes] = useState('')

  // State Form Konversi Dus ke Botol
  const [convertProductId, setConvertProductId] = useState('')
  const [convertBoxQty, setConvertBoxQty] = useState<number | string>(1)

  // State Transaksi & Keranjang Belanja (Multi-Item)
  const [selectedStore, setSelectedStore] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('PAID')

  const [cartItems, setCartItems] = useState<any[]>([])
  const [selectedProduct, setSelectedProduct] = useState('')
  const [qty, setQty] = useState<number | string>(1)
  const [unitType, setUnitType] = useState('BOX')
  const [customUnitPrice, setCustomUnitPrice] = useState<number | string>('')

  // State Modal Nota Cetak
  const [receiptData, setReceiptData] = useState<any | null>(null)

  // Fetch Semua Data dari Supabase
  async function fetchData() {
    setLoading(true)

    // 1. Fetch Produk
    const { data: prodData } = await supabase
      .from('products')
      .select('*')
      .eq('business_id', businessId)
      .order('id', { ascending: true })

    if (prodData) {
      setProducts(prodData)
      const totalBoxes = prodData.reduce((acc, curr) => acc + (curr.box_stock || 0), 0)
      setTotalBoxStock(totalBoxes)
    }

    // 2. Fetch Toko / Pelanggan
    const { data: storeData } = await supabase
      .from('stores')
      .select('*')
      .eq('business_id', businessId)

    if (storeData) {
      setStores(storeData)
      if (storeData.length > 0 && !selectedStore) setSelectedStore(storeData[0].id.toString())

      const totalUtang = storeData.reduce((acc, curr) => acc + (parseFloat(curr.receivable_balance) || 0), 0)
      setTotalReceivable(totalUtang)
    }

    // 3. Fetch Riwayat Transaksi Penjualan
    const { data: trxData } = await supabase
      .from('transactions')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (trxData) {
      setTransactions(trxData)

      const today = new Date().toISOString().split('T')[0]
      const omzetToday = trxData
        .filter((t) => t.created_at.startsWith(today))
        .reduce((acc, curr) => acc + (parseFloat(curr.total_price) || 0), 0)

      setTodayOmzet(omzetToday)
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const lowStockProducts = products.filter((p) => p.box_stock <= 5)

  // Auto-fill saat memilih produk di form Restok
  const handleSelectProductToRestock = (productId: string) => {
    setSelectedProductId(productId)

    if (productId === 'NEW') {
      resetProductForm()
    } else {
      const existingProduct = products.find((p) => p.id === parseInt(productId))
      if (existingProduct) {
        setName(existingProduct.name)
        setBoxStock(0)
        setSellingPricePerBox(existingProduct.selling_price_per_box)
        setIsRetailAllowed(existingProduct.is_retail_allowed || false)
        setUnitsPerBox(existingProduct.units_per_box || 24)
        setSellingPricePerBottle(existingProduct.selling_price_per_bottle || '')
      }
    }
  }

  useEffect(() => {
    if (!selectedProduct) {
      setCustomUnitPrice('')
      return
    }
    const prod = products.find((p) => p.id === parseInt(selectedProduct))
    if (prod) {
      if (unitType === 'BOX') {
        setCustomUnitPrice(prod.selling_price_per_box)
      } else {
        setCustomUnitPrice(prod.selling_price_per_bottle || 0)
      }
    }
  }, [selectedProduct, unitType, products])

  // Handler Tambah/Update Produk
  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault()

    const inputStockToAdd = parseInt(boxStock.toString()) || 0
    const inputPriceBox = parseFloat(sellingPricePerBox) || 0
    const inputUnits = isRetailAllowed ? parseInt(unitsPerBox.toString()) || 24 : 0
    const inputPriceBottle = isRetailAllowed ? parseFloat(sellingPricePerBottle) || 0 : 0

    if (selectedProductId !== 'NEW') {
      const existingProduct = products.find((p) => p.id === parseInt(selectedProductId))
      if (!existingProduct) return

      const newTotalStock = existingProduct.box_stock + inputStockToAdd

      const { error } = await supabase
        .from('products')
        .update({
          box_stock: newTotalStock,
          selling_price_per_box: inputPriceBox > 0 ? inputPriceBox : existingProduct.selling_price_per_box,
          is_retail_allowed: isRetailAllowed,
          units_per_box: inputUnits,
          selling_price_per_bottle: inputPriceBottle > 0 ? inputPriceBottle : existingProduct.selling_price_per_bottle
        })
        .eq('id', existingProduct.id)

      if (error) {
        alert('Gagal memperbarui stok: ' + error.message)
      } else {
        alert(`Stok "${existingProduct.name}" berhasil ditambah ${inputStockToAdd} Dus!`)
        resetProductForm()
        fetchData()
      }
    } else {
      const inputNameTrimmed = name.trim()

      const { error } = await supabase.from('products').insert([
        {
          business_id: businessId,
          name: inputNameTrimmed,
          box_stock: inputStockToAdd,
          selling_price_per_box: inputPriceBox,
          is_retail_allowed: isRetailAllowed,
          units_per_box: inputUnits,
          selling_price_per_bottle: inputPriceBottle
        }
      ])

      if (error) {
        alert('Gagal menambah produk baru: ' + error.message)
      } else {
        alert('Produk baru berhasil ditambahkan!')
        resetProductForm()
        fetchData()
      }
    }
  }

  // --- LOGIKA CATAT BARANG PECAH / RUSAK ---
  async function handleDamagedItemSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!damagedProductId) return alert('Pilih produk yang pecah/rusak terlebih dahulu!')

    const prod = products.find((p) => p.id === parseInt(damagedProductId))
    if (!prod) return

    const qtyNum = parseInt(damagedQty.toString()) || 0
    if (qtyNum <= 0) return alert('Jumlah tidak valid!')

    let newBoxStock = prod.box_stock
    let newBottleStock = prod.bottle_stock || 0

    if (damagedUnit === 'BOX') {
      if (qtyNum > newBoxStock) return alert('Jumlah barang rusak melebihi stok dus yang tersedia!')
      newBoxStock -= qtyNum
    } else {
      if (qtyNum > newBottleStock) return alert('Jumlah barang rusak melebihi stok botol yang tersedia!')
      newBottleStock -= qtyNum
    }

    // Update stok produk di database
    const { error } = await supabase
      .from('products')
      .update({
        box_stock: newBoxStock,
        bottle_stock: newBottleStock
      })
      .eq('id', prod.id)

    if (error) {
      alert('Gagal memperbarui stok: ' + error.message)
    } else {
      // Simpan catatan ke tabel damaged_items (jika sudah dibuat)
      await supabase.from('damaged_items').insert([
        {
          business_id: businessId,
          product_id: prod.id,
          product_name: prod.name,
          qty: qtyNum,
          unit: damagedUnit === 'BOX' ? 'Dus' : 'Botol',
          notes: damagedNotes || 'Barang pecah/rusak'
        }
      ]).select()

      alert(`Berhasil mencatat ${qtyNum} ${damagedUnit === 'BOX' ? 'Dus' : 'Botol'} "${prod.name}" rusak/pecah. Stok otomatis dikurangi!`)
      setDamagedProductId('')
      setDamagedQty(1)
      setDamagedNotes('')
      fetchData()
    }
  }

  // --- LOGIKA KONVERSI STOK DUS ➜ BOTOL (ECERAN) ---
  async function handleConvertBoxToBottle(e: React.FormEvent) {
    e.preventDefault()
    if (!convertProductId) return alert('Pilih produk yang mau dikonversi terlebih dahulu!')

    const prod = products.find((p) => p.id === parseInt(convertProductId))
    if (!prod) return

    if (!prod.is_retail_allowed) {
      return alert('Produk ini belum diaktifkan untuk penjualan eceran. Aktifkan dulu opsi "Bisa Dijual Eceran" di form produk.')
    }

    const unitsPerBoxNum = parseInt(prod.units_per_box?.toString() || '0') || 0
    if (unitsPerBoxNum <= 0) {
      return alert('Isi Per Dus belum diatur untuk produk ini. Silakan lengkapi dulu di form produk.')
    }

    const boxQtyNum = parseInt(convertBoxQty.toString()) || 0
    if (boxQtyNum <= 0) return alert('Jumlah dus tidak valid!')

    if (boxQtyNum > prod.box_stock) {
      return alert(`Stok dus tidak cukup! Sisa stok "${prod.name}" hanya ${prod.box_stock} Dus.`)
    }

    const newBoxStock = prod.box_stock - boxQtyNum
    const bottlesAdded = boxQtyNum * unitsPerBoxNum
    const newBottleStock = (prod.bottle_stock || 0) + bottlesAdded

    const { error } = await supabase
      .from('products')
      .update({
        box_stock: newBoxStock,
        bottle_stock: newBottleStock
      })
      .eq('id', prod.id)

    if (error) {
      alert('Gagal melakukan konversi stok: ' + error.message)
    } else {
      alert(`Berhasil membuka ${boxQtyNum} Dus "${prod.name}" ➜ menambah ${bottlesAdded} Botol ke stok eceran!`)
      setConvertProductId('')
      setConvertBoxQty(1)
      fetchData()
    }
  }

  function resetProductForm() {
    setSelectedProductId('NEW')
    setName('')
    setBoxStock(0)
    setSellingPricePerBox('')
    setIsRetailAllowed(false)
    setUnitsPerBox(24)
    setSellingPricePerBottle('')
  }

  async function handleDeleteProduct(id: number, prodName: string) {
    const confirmDelete = confirm(`Apakah kamu yakin ingin menghapus produk "${prodName}"?`)
    if (!confirmDelete) return

    const { error } = await supabase.from('products').delete().eq('id', id)

    if (error) {
      alert('Gagal menghapus produk: ' + error.message)
    } else {
      alert(`Produk "${prodName}" berhasil dihapus!`)
      fetchData()
    }
  }

  // LOGIKA KERANJANG BELANJA MULTI-ITEM
  function handleAddToCart(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProduct) return alert('Pilih produk terlebih dahulu!')

    const prod = products.find((p) => p.id === parseInt(selectedProduct))
    if (!prod) return

    const parsedQty = parseInt(qty.toString()) || 1
    const pricePerUnit = parseFloat(customUnitPrice.toString()) || 0
    const subtotal = pricePerUnit * parsedQty

    const newItem = {
      productId: prod.id,
      productName: prod.name,
      qty: parsedQty,
      unit: unitType === 'BOX' ? 'Dus' : 'Botol',
      unitType: unitType,
      pricePerUnit: pricePerUnit,
      subtotal: subtotal
    }

    setCartItems([...cartItems, newItem])
    setSelectedProduct('')
    setQty(1)
    setCustomUnitPrice('')
  }

  function handleRemoveFromCart(index: number) {
    const updated = [...cartItems]
    updated.splice(index, 1)
    setCartItems(updated)
  }

  const cartGrandTotal = cartItems.reduce((acc, item) => acc + item.subtotal, 0)

  async function handleCheckout() {
    if (cartItems.length === 0) return alert('Keranjang masih kosong!')

    const store = stores.find((s) => s.id === parseInt(selectedStore))
    const storeName = store ? store.name : 'Penjualan Langsung'

    for (const item of cartItems) {
      const prod = products.find((p) => p.id === item.productId)
      if (prod) {
        let updatedBoxStock = prod.box_stock
        let updatedBottleStock = prod.bottle_stock || 0

        if (item.unitType === 'BOX') {
          updatedBoxStock -= item.qty
        } else {
          updatedBottleStock -= item.qty
        }

        await supabase
          .from('products')
          .update({
            box_stock: updatedBoxStock,
            bottle_stock: updatedBottleStock
          })
          .eq('id', prod.id)
      }
    }

    const summaryProductName = cartItems.map((i) => `${i.productName} (${i.qty} ${i.unit})`).join(', ')

    await supabase.from('transactions').insert([
      {
        business_id: businessId,
        store_id: store ? store.id : null,
        customer_name: storeName,
        product_name: summaryProductName,
        qty: cartItems.length,
        unit: 'Jenis',
        price_per_unit: 0,
        total_price: cartGrandTotal,
        payment_status: paymentStatus,
        items: cartItems
      }
    ])

    if (paymentStatus === 'UNPAID' && store) {
      const newBalance = (parseFloat(store.receivable_balance) || 0) + cartGrandTotal
      await supabase
        .from('stores')
        .update({ receivable_balance: newBalance })
        .eq('id', store.id)

      await supabase.from('receivable_mutations').insert([
        {
          business_id: businessId,
          store_id: store.id,
          mutation_type: 'NEW_INVOICE',
          amount: cartGrandTotal,
          notes: `Pembelian Multi-Item (${cartItems.length} jenis barang): ${summaryProductName}`
        }
      ])
    }

    setReceiptData({
      date: new Date().toLocaleString('id-ID'),
      customer: storeName,
      items: cartItems,
      total: cartGrandTotal,
      status: paymentStatus === 'PAID' ? 'LUNAS (CASH)' : 'BELUM BAYAR (NGUTANG)'
    })

    setCartItems([])
    fetchData()
  }

  function handleRePrintReceipt(trx: any) {
    const itemsList = trx.items || [
      {
        productName: trx.product_name,
        qty: trx.qty,
        unit: trx.unit,
        pricePerUnit: parseFloat(trx.price_per_unit),
        subtotal: parseFloat(trx.total_price)
      }
    ]

    setReceiptData({
      date: new Date(trx.created_at).toLocaleString('id-ID'),
      customer: trx.customer_name,
      items: itemsList,
      total: parseFloat(trx.total_price),
      status: trx.payment_status === 'PAID' ? 'LUNAS (CASH)' : 'BELUM BAYAR (NGUTANG)'
    })
  }

  const filteredTransactions = transactions.filter((t) => {
    const matchQuery =
      t.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.product_name.toLowerCase().includes(searchQuery.toLowerCase())

    const matchDate = filterDate ? t.created_at.startsWith(filterDate) : true
    const matchStatus = filterStatus === 'ALL' ? true : t.payment_status === filterStatus

    return matchQuery && matchDate && matchStatus
  })

  const filteredTotalOmzet = filteredTransactions.reduce(
    (acc, curr) => acc + (parseFloat(curr.total_price) || 0),
    0
  )

  return (
    <main className="min-h-screen bg-gray-100 p-6 text-gray-800">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border print:hidden">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">🍹 TOKO MINUMAN GROSIR</h1>
          <Link
            href="/invoice"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 transition"
          >
            🧾 Invoice & Tagihan ➔
          </Link>
        </div>

        {/* PERINGATAN STOK MENIPIS */}
        {lowStockProducts.length > 0 && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl shadow-sm flex items-start justify-between print:hidden">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-bold text-amber-900 text-sm md:text-base">
                  Peringatan: Ada {lowStockProducts.length} barang dengan stok menipis (≤ 5 Dus)!
                </h3>
                <p className="text-xs text-amber-700 mt-0.5">
                  Segera lakukan pemesanan ulang ke supplier untuk barang berikut:{' '}
                  <strong>{lowStockProducts.map((p) => `${p.name} (${p.box_stock} Dus)`).join(', ')}</strong>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* KARTU RINGKASAN LAPORAN */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
          <div className="bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center border-l-4 border-l-green-500">
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase">Omzet Penjualan Hari Ini</p>
              <p className="text-2xl font-extrabold text-green-600">Rp {todayOmzet.toLocaleString()}</p>
            </div>
            <span className="text-3xl">💰</span>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center border-l-4 border-l-blue-500">
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase">Total Stok Dus Tersedia</p>
              <p className="text-2xl font-extrabold text-blue-600">{totalBoxStock} Dus</p>
            </div>
            <span className="text-3xl">📦</span>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center border-l-4 border-l-red-500">
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase">Total Sisa Tagihan Pelanggan</p>
              <p className="text-2xl font-extrabold text-red-600">Rp {totalReceivable.toLocaleString()}</p>
            </div>
            <span className="text-3xl">💳</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">

          {/* FORM 1: TAMBAH / RESTOK PRODUK & CATAT BARANG PECAH */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <h2 className="text-xl font-bold mb-4 text-gray-700">➕ Tambah / Isi Stok Produk</h2>
              <form onSubmit={handleAddProduct} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-blue-900">Pilih Jenis Transaksi Stok</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => handleSelectProductToRestock(e.target.value)}
                    className="w-full border-2 border-blue-400 p-2 rounded mt-1 bg-blue-50 text-black font-semibold"
                  >
                    <option value="NEW">✨ + Buat / Tambah Produk Baru</option>
                    <optgroup label="--- Atau Tambah Stok Barang Yang Ada ---">
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          📦 {p.name} (Sisa Stok: {p.box_stock} Dus)
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium">Nama Produk</label>
                  <input
                    type="text"
                    required
                    disabled={selectedProductId !== 'NEW'}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Oasis 240 ml"
                    className={`w-full border p-2 rounded mt-1 ${
                      selectedProductId !== 'NEW' ? 'bg-gray-100 text-gray-600 cursor-not-allowed font-bold' : 'bg-white text-black'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-green-700 font-bold">
                      {selectedProductId === 'NEW' ? 'Stok Awal (Dus)' : 'Tambah Stok (Dus)'}
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={boxStock}
                      onChange={(e) => setBoxStock(e.target.value)}
                      className="w-full border-2 border-green-500 p-2 rounded mt-1 bg-white text-black font-bold text-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Harga Standar / Dus</label>
                    <input
                      type="number"
                      required
                      value={sellingPricePerBox}
                      onChange={(e) => setSellingPricePerBox(e.target.value)}
                      placeholder="Rp"
                      className="w-full border p-2 rounded mt-1 bg-white text-black"
                    />
                  </div>
                </div>

                <div className="p-3 bg-blue-50 rounded border border-blue-100">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-blue-900">
                    <input
                      type="checkbox"
                      checked={isRetailAllowed}
                      onChange={(e) => setIsRetailAllowed(e.target.checked)}
                      className="w-4 h-4 text-blue-600"
                    />
                    Bisa Dijual Eceran (Botol/Pcs)?
                  </label>

                  {isRetailAllowed && (
                    <div className="mt-3 grid grid-cols-2 gap-4 pt-3 border-t border-blue-200">
                      <div>
                        <label className="block text-xs font-medium">Isi Per Dus</label>
                        <input
                          type="number"
                          value={unitsPerBox}
                          onChange={(e) => setUnitsPerBox(e.target.value)}
                          className="w-full border p-2 rounded text-sm mt-1 bg-white text-black"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium">Harga Standar / Botol</label>
                        <input
                          type="number"
                          value={sellingPricePerBottle}
                          onChange={(e) => setSellingPricePerBottle(e.target.value)}
                          placeholder="Rp"
                          className="w-full border p-2 rounded text-sm mt-1 bg-white text-black"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2.5 rounded hover:bg-blue-700 transition">
                  {selectedProductId === 'NEW' ? '➕ Simpan Produk Baru' : '📥 Tambah Stok Ke Barang Ini'}
                </button>
              </form>
            </div>

            {/* FORM KHUSUS: KONVERSI DUS KE BOTOL (ECERAN) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-purple-200">
              <h2 className="text-lg font-bold mb-3 text-purple-700 flex items-center gap-2">
                <span>🔄</span> Konversi Stok Dus ➜ Botol
              </h2>
              <p className="text-xs text-gray-500 mb-3">
                Gunakan form ini saat membuka dus untuk dijual eceran per botol. Stok dus akan berkurang dan stok botol otomatis bertambah.
              </p>

              <form onSubmit={handleConvertBoxToBottle} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Pilih Produk</label>
                  <select
                    value={convertProductId}
                    onChange={(e) => setConvertProductId(e.target.value)}
                    className="w-full border p-2 rounded text-sm bg-white text-black"
                  >
                    <option value="">-- Pilih Barang --</option>
                    {products
                      .filter((p) => p.is_retail_allowed)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Stok Dus: {p.box_stock} | Stok Botol: {p.bottle_stock || 0})
                        </option>
                      ))}
                  </select>
                  {products.filter((p) => p.is_retail_allowed).length === 0 && (
                    <p className="text-[11px] text-amber-600 mt-1">
                      Belum ada produk yang diaktifkan untuk eceran. Aktifkan opsi "Bisa Dijual Eceran" saat menambah/edit produk.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700">Jumlah Dus yang Dibuka</label>
                  <input
                    type="number"
                    min="1"
                    value={convertBoxQty}
                    onChange={(e) => setConvertBoxQty(e.target.value)}
                    className="w-full border-2 border-purple-400 p-2 rounded text-sm bg-purple-50 text-black font-bold"
                  />
                </div>

                {convertProductId && (() => {
                  const prod = products.find((p) => p.id === parseInt(convertProductId))
                  const unitsPerBoxNum = parseInt(prod?.units_per_box?.toString() || '0') || 0
                  const boxQtyNum = parseInt(convertBoxQty.toString()) || 0
                  const bottlesResult = boxQtyNum * unitsPerBoxNum
                  return prod && bottlesResult > 0 ? (
                    <p className="text-xs bg-purple-50 border border-purple-200 rounded p-2 text-purple-800">
                      ➜ Akan menghasilkan <strong>{bottlesResult} Botol</strong> dari {boxQtyNum} Dus (isi {unitsPerBoxNum} botol/dus)
                    </p>
                  ) : null
                })()}

                <button
                  type="submit"
                  className="w-full bg-purple-600 text-white font-bold py-2 rounded hover:bg-purple-700 text-xs transition"
                >
                  🔄 Konversi Sekarang
                </button>
              </form>
            </div>

            {/* FORM KHUSUS: CATAT BARANG PECAH / RUSAK */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-red-200">
              <h2 className="text-lg font-bold mb-3 text-red-700 flex items-center gap-2">
                <span>⚠️</span> Catat Barang Pecah / Rusak
              </h2>
              <p className="text-xs text-gray-500 mb-3">Gunakan form ini jika ada botol pecah saat bongkar muat atau barang rusak agar stok gudang otomatis berkurang.</p>

              <form onSubmit={handleDamagedItemSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Pilih Produk Rusak</label>
                  <select
                    value={damagedProductId}
                    onChange={(e) => setDamagedProductId(e.target.value)}
                    className="w-full border p-2 rounded text-sm bg-white text-black"
                  >
                    <option value="">-- Pilih Barang --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Stok: {p.box_stock} Dus)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Jumlah Rusak</label>
                    <input
                      type="number"
                      min="1"
                      value={damagedQty}
                      onChange={(e) => setDamagedQty(e.target.value)}
                      className="w-full border p-2 rounded text-sm bg-white text-black font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Satuan</label>
                    <select
                      value={damagedUnit}
                      onChange={(e) => setDamagedUnit(e.target.value)}
                      className="w-full border p-2 rounded text-sm bg-white text-black"
                    >
                      <option value="BOX">Dus</option>
                      <option value="BOTTLE">Botol</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700">Keterangan / Alasan</label>
                  <input
                    type="text"
                    value={damagedNotes}
                    onChange={(e) => setDamagedNotes(e.target.value)}
                    placeholder="Contoh: Pecah saat bongkar muat / Kadaluarsa"
                    className="w-full border p-2 rounded text-sm bg-white text-black"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-red-600 text-white font-bold py-2 rounded hover:bg-red-700 text-xs transition"
                >
                  📉 Kurangi Stok (Barang Pecah/Rusak)
                </button>
              </form>
            </div>
          </div>

          {/* FORM 2: KASIR DENGAN KERANJANG BELANJA */}
          <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
            <h2 className="text-xl font-bold text-gray-700">🛒 Catat Penjualan (Keranjang)</h2>

            <div>
              <label className="block text-sm font-medium">Pembeli / Toko</label>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full border p-2 rounded mt-1 bg-white text-black font-semibold"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.receivable_balance > 0 ? `(Utang: Rp ${Number(s.receivable_balance).toLocaleString()})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* FORM TAMBAH ITEM KE KERANJANG */}
            <form onSubmit={handleAddToCart} className="p-3 bg-gray-50 border rounded-lg space-y-3">
              <p className="text-xs font-bold text-gray-600 uppercase">Pilih Barang Order</p>
              <div>
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="w-full border p-2 rounded text-sm bg-white text-black"
                >
                  <option value="">-- Pilih Produk --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stok: {p.box_stock} Dus) {p.box_stock <= 5 ? '⚠️' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-medium">Jumlah</label>
                  <input
                    type="number"
                    min="1"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className="w-full border p-1.5 rounded text-sm bg-white text-black"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium">Satuan</label>
                  <select
                    value={unitType}
                    onChange={(e) => setUnitType(e.target.value)}
                    className="w-full border p-1.5 rounded text-sm bg-white text-black"
                  >
                    <option value="BOX">Dus</option>
                    <option value="BOTTLE">Botol</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-blue-700">Harga Satuan</label>
                  <input
                    type="number"
                    value={customUnitPrice}
                    onChange={(e) => setCustomUnitPrice(e.target.value)}
                    placeholder="Rp"
                    className="w-full border-2 border-blue-400 p-1.5 rounded text-sm bg-yellow-50 text-black font-bold"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white font-bold py-1.5 rounded hover:bg-blue-700 text-xs transition"
              >
                + Tambah Item Ke Keranjang
              </button>
            </form>

            {/* DAFTAR ITEM DI KERANJANG */}
            <div className="border rounded-lg p-3 space-y-2">
              <p className="text-xs font-bold text-gray-700">Daftar Item Belanja ({cartItems.length}):</p>
              {cartItems.length === 0 ? (
                <p className="text-xs text-gray-400 italic text-center py-2">Keranjang masih kosong</p>
              ) : (
                <ul className="divide-y text-xs">
                  {cartItems.map((item, idx) => (
                    <li key={idx} className="py-1.5 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-gray-800">{item.productName}</p>
                        <p className="text-gray-500">
                          {item.qty} {item.unit} x Rp {item.pricePerUnit.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-blue-700">Rp {item.subtotal.toLocaleString()}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(idx)}
                          className="text-red-500 hover:text-red-700 font-bold px-1"
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="pt-2 border-t flex justify-between items-center text-sm font-extrabold">
                <span>TOTAL BELANJA:</span>
                <span className="text-green-600 text-base">Rp {cartGrandTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* STATUS BAYAR & PROSES CHECKOUT */}
            <div className="space-y-3 pt-2">
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="payment"
                    value="PAID"
                    checked={paymentStatus === 'PAID'}
                    onChange={() => setPaymentStatus('PAID')}
                  />
                  <span className="text-green-700 font-semibold">Lunas (Cash)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="payment"
                    value="UNPAID"
                    checked={paymentStatus === 'UNPAID'}
                    onChange={() => setPaymentStatus('UNPAID')}
                  />
                  <span className="text-red-600 font-semibold">Belum Bayar (Ngutang)</span>
                </label>
              </div>

              <button
                type="button"
                onClick={handleCheckout}
                disabled={cartItems.length === 0}
                className={`w-full font-bold py-2.5 rounded transition ${
                  cartItems.length > 0
                    ? 'bg-green-600 text-white hover:bg-green-700 cursor-pointer'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Proses Transaksi ({cartItems.length} Item)
              </button>
            </div>
          </div>
        </div>

        {/* TABEL 1: RIWAYAT PENJUALAN + FILTER */}
        <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-700">🧾 Riwayat Transaksi Penjualan</h2>
              <p className="text-xs text-gray-500">
                Total Nilai Terfilter: <strong className="text-green-600">Rp {filteredTotalOmzet.toLocaleString()}</strong> ({filteredTransactions.length} Transaksi)
              </p>
            </div>

            <button
              onClick={() => window.print()}
              className="bg-gray-800 text-white px-3.5 py-1.5 rounded text-xs font-bold hover:bg-gray-900 transition flex items-center gap-1.5 print:hidden"
            >
              🖨️ Cetak Rekap
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-gray-50 rounded-lg border print:hidden">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">🔍 Cari Pelanggan / Produk</label>
              <input
                type="text"
                placeholder="Cari nama toko atau produk..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border p-2 rounded text-xs bg-white text-black"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">📅 Filter Tanggal</label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full border p-2 rounded text-xs bg-white text-black"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">💳 Status Pembayaran</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full border p-2 rounded text-xs bg-white text-black"
              >
                <option value="ALL">Semua Status</option>
                <option value="PAID">Lunas (Cash)</option>
                <option value="UNPAID">Ngutang (Belum Bayar)</option>
              </select>
            </div>
          </div>

          {loading ? (
            <p className="text-gray-500 text-sm">Memuat riwayat...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b text-gray-600">
                    <th className="p-3 font-semibold">Waktu</th>
                    <th className="p-3 font-semibold">Pelanggan</th>
                    <th className="p-3 font-semibold">Daftar Barang</th>
                    <th className="p-3 font-semibold">Total (Rp)</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold text-center print:hidden">Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-gray-400">
                        Tidak ada transaksi yang cocok.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((t) => (
                      <tr key={t.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 text-xs text-gray-500">
                          {new Date(t.created_at).toLocaleString('id-ID')}
                        </td>
                        <td className="p-3 font-medium">{t.customer_name}</td>
                        <td className="p-3 font-semibold text-gray-700 max-w-xs truncate">
                          {t.product_name}
                        </td>
                        <td className="p-3 font-extrabold text-blue-700">
                          Rp {Number(t.total_price).toLocaleString()}
                        </td>
                        <td className="p-3">
                          {t.payment_status === 'PAID' ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-bold">
                              LUNAS
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded font-bold">
                              UTANG
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center print:hidden">
                          <button
                            onClick={() => handleRePrintReceipt(t)}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1 rounded text-xs font-semibold border transition"
                          >
                            🖨️ Cetak
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* TABEL 2: DAFTAR STOK BARANG */}
        <div className="bg-white p-6 rounded-xl shadow-sm border print:hidden">
          <h2 className="text-xl font-bold mb-4 text-gray-700">📦 Daftar Stok Barang</h2>
          {loading ? (
            <p className="text-gray-500">Memuat data...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="p-3 font-semibold">Nama Produk</th>
                    <th className="p-3 font-semibold">Stok Dus</th>
                    <th className="p-3 font-semibold">Status Stok</th>
                    <th className="p-3 font-semibold">Harga / Dus</th>
                    <th className="p-3 font-semibold">Eceran?</th>
                    <th className="p-3 font-semibold text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-gray-400">
                        Belum ada data produk.
                      </td>
                    </tr>
                  ) : (
                    products.map((p) => {
                      const isLowStock = p.box_stock <= 5
                      return (
                        <tr
                          key={p.id}
                          className={`border-b transition ${
                            isLowStock ? 'bg-red-50/70 hover:bg-red-100/70' : 'hover:bg-gray-50'
                          }`}
                        >
                          <td className="p-3 font-medium">{p.name}</td>
                          <td className={`p-3 font-extrabold ${isLowStock ? 'text-red-600' : 'text-blue-600'}`}>
                            {p.box_stock} Dus
                          </td>
                          <td className="p-3">
                            {isLowStock ? (
                              <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full font-bold inline-flex items-center gap-1 border border-red-300">
                                ⚠️ Stok Menipis
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full font-semibold">
                                ✅ Aman
                              </span>
                            )}
                          </td>
                          <td className="p-3">Rp {Number(p.selling_price_per_box).toLocaleString()}</td>
                          <td className="p-3">
                            {p.is_retail_allowed ? (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-semibold">
                                Ya ({p.units_per_box} btl)
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded font-semibold">
                                Khusus Dus
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleDeleteProduct(p.id, p.name)}
                              className="bg-red-100 text-red-600 hover:bg-red-200 px-3 py-1 rounded text-sm font-semibold transition"
                            >
                              🗑️ Hapus
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

      {/* POP-UP MODAL NOTA TRANSAKSI MULTI-ITEM */}
      {receiptData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-xl max-w-sm w-full space-y-4 border shadow-2xl">
            <div id="printable-receipt" className="p-4 border border-dashed rounded font-mono text-sm space-y-2">
              <div className="text-center border-b pb-2">
                <h2 className="font-bold text-base uppercase">TOKO MINUMAN GROSIR</h2>
                <p className="text-xs text-gray-500">{receiptData.date}</p>
              </div>

              <div className="text-xs space-y-1">
                <p>Pelanggan: <strong>{receiptData.customer}</strong></p>
                <p>Status: <strong>{receiptData.status}</strong></p>
              </div>

              <div className="border-t border-b py-2 space-y-2">
                {receiptData.items && receiptData.items.map((item: any, idx: number) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="font-bold text-xs">{item.productName}</div>
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>{item.qty} {item.unit} x Rp {Number(item.pricePerUnit).toLocaleString()}</span>
                      <span className="font-semibold">Rp {Number(item.subtotal).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between font-bold text-base pt-1">
                <span>TOTAL:</span>
                <span>Rp {Number(receiptData.total).toLocaleString()}</span>
              </div>

              <p className="text-center text-[10px] text-gray-400 mt-4">Terima kasih atas kunjungan Anda!</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700 text-sm"
              >
                🖨️ Cetak Nota / PDF
              </button>
              <button
                onClick={() => setReceiptData(null)}
                className="bg-gray-200 text-gray-800 font-bold px-4 py-2 rounded hover:bg-gray-300 text-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}