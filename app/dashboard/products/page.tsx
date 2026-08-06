'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  const [name, setName] = useState('')
  const [boxStock, setBoxStock] = useState('')
  const [bottleStock, setBottleStock] = useState('')
  const [unitsPerBox, setUnitsPerBox] = useState('12')
  const [priceBox, setPriceBox] = useState('')
  const [priceBottle, setPriceBottle] = useState('')
  const [isRetailAllowed, setIsRetailAllowed] = useState(true)

  const fetchProducts = async () => {
    const { data, error } = await supabase.from('products').select('*').order('name')
    if (data) setProducts(data)
    if (error) console.error('Error fetching products:', error.message)
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      alert('Nama produk harus diisi!')
      return
    }

    setLoading(true)
    const { error } = await supabase.from('products').insert([
      {
        name: name.trim(),
        box_stock: Number(boxStock) || 0,
        bottle_stock: Number(bottleStock) || 0,
        units_per_box: Number(unitsPerBox) || 12,
        selling_price_per_box: Number(priceBox) || 0,
        selling_price_per_bottle: Number(priceBottle) || 0,
        is_retail_allowed: isRetailAllowed,
      }
    ])

    if (error) {
      alert('Gagal menambah produk: ' + error.message)
    } else {
      alert('Produk baru berhasil ditambahkan!')
      setName('')
      setBoxStock('')
      setBottleStock('')
      setPriceBox('')
      setPriceBottle('')
      setIsRetailAllowed(true)
      setShowAddModal(false)
      fetchProducts()
    }
    setLoading(false)
  }

  // Fungsi untuk mengonversi dan memformat stok Dus dan Pcs dengan akurat
  const formatStock = (box: number, bottle: number, unitsPerBox: number) => {
    const bBox = box || 0
    const bBottle = bottle || 0
    const limit = unitsPerBox || 12

    // Konversi total ke Pcs lalu dipecah ulang ke Dus & Pcs
    const totalPcs = (bBox * limit) + bBottle
    const finalBox = Math.floor(totalPcs / limit)
    const finalBottle = totalPcs % limit

    if (finalBox === 0 && finalBottle === 0) return 'Habis'
    
    // Jika sisa Pcs adalah 0, tampilkan Dus-nya saja!
    if (finalBottle === 0) return `${finalBox} Dus`
    
    // Jika ada sisa Dus dan ada sisa Pcs, tampilkan keduanya
    if (finalBox === 0) return `${finalBottle} Pcs`
    return `${finalBox} Dus ${finalBottle} Pcs`
  }

  return (
    <div className="p-3.5 sm:p-6 max-w-6xl mx-auto space-y-6 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Top Header Controls */}
      <div className="flex justify-between items-center gap-4">
        <Link 
          href="/dashboard"
          className="inline-flex items-center text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition gap-1"
        >
          ← Kembali ke Dashboard
        </Link>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/20 active:scale-95 flex items-center gap-1.5"
        >
          <span>+</span> Tambah Produk Baru
        </button>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-2xl space-y-5 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-4">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>📦</span> Daftar Produk & Sisa Stok
          </h1>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Total: <span className="text-blue-600 dark:text-blue-400 font-bold">{products.length}</span> jenis produk
          </span>
        </div>

        {/* Product Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px] text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                <th className="p-4">Nama Produk</th>
                <th className="p-4 text-center">Sisa Stok (Dus & Pcs)</th>
                <th className="p-4 text-center">Aturan Jual</th>
                <th className="p-4 text-right">Harga Dus</th>
                <th className="p-4 text-right">Harga Pcs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-800 dark:text-slate-200">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400 dark:text-slate-500 font-medium">
                    Belum ada data produk.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const stockDisplay = formatStock(p.box_stock, p.bottle_stock, p.units_per_box)
                  const isCritical = (p.box_stock || 0) <= 1 && (p.bottle_stock || 0) === 0
                  
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="p-4 font-semibold text-slate-900 dark:text-slate-100">{p.name}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${
                          isCritical 
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50' 
                            : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50'
                        }`}>
                          {stockDisplay}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                          p.is_retail_allowed !== false 
                            ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50' 
                            : 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/50'
                        }`}>
                          {p.is_retail_allowed !== false ? 'Bisa Dus & Pcs' : 'Hanya Dus (Grosir)'}
                        </span>
                      </td>
                      <td className="p-4 text-right font-bold text-slate-900 dark:text-slate-200">
                        Rp {(p.selling_price_per_box || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="p-4 text-right font-bold text-slate-900 dark:text-slate-200">
                        {p.is_retail_allowed !== false 
                          ? `Rp ${(p.selling_price_per_bottle || 0).toLocaleString('id-ID')}` 
                          : <span className="text-slate-400 dark:text-slate-600">-</span>
                        }
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Produk Baru */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-xl dark:shadow-2xl text-slate-900 dark:text-slate-100 transition-colors">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>➕</span> Tambah Produk Baru
              </h2>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold text-lg transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Nama Produk
                </label>
                <input 
                  type="text" 
                  placeholder="Contoh: Oasis 600ml / Saltcheese"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Stok Dus
                  </label>
                  <input 
                    type="number" 
                    placeholder="0"
                    value={boxStock}
                    onChange={(e) => setBoxStock(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Stok Pcs
                  </label>
                  <input 
                    type="number" 
                    placeholder="0"
                    value={bottleStock}
                    onChange={(e) => setBottleStock(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Isi/Dus
                  </label>
                  <input 
                    type="number" 
                    placeholder="12"
                    value={unitsPerBox}
                    onChange={(e) => setUnitsPerBox(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Harga Dus (Rp)
                  </label>
                  <input 
                    type="number" 
                    placeholder="0"
                    value={priceBox}
                    onChange={(e) => setPriceBox(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Harga Pcs (Rp)
                  </label>
                  <input 
                    type="number" 
                    placeholder="0"
                    value={priceBottle}
                    onChange={(e) => setPriceBottle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <input 
                  type="checkbox" 
                  id="isRetailAllowed"
                  checked={isRetailAllowed}
                  onChange={(e) => setIsRetailAllowed(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                />
                <label htmlFor="isRetailAllowed" className="text-xs font-semibold text-slate-700 dark:text-slate-300 select-none cursor-pointer">
                  Boleh dijual eceran / satuan (Pcs)?
                </label>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-2.5 rounded-xl text-xs font-bold transition border border-slate-200 dark:border-slate-700/50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/25 active:scale-95 disabled:opacity-50"
                >
                  {loading ? 'Menyimpan...' : 'Simpan Produk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}