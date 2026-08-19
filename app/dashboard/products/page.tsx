'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Product {
  id: number
  name: string
  box_stock: number
  bottle_stock: number
  units_per_box: number
  selling_price_per_box: number
  selling_price_per_bottle: number
  is_retail_allowed: boolean
}

interface ToastState {
  message: string
  type: 'error' | 'success' | 'warning'
}

export default function ProductsMasterPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // State Modal (Tambah / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // State Modal Restock (Barang Masuk)
  const [restockProduct, setRestockProduct] = useState<Product | null>(null)
  const [restockBox, setRestockBox] = useState<number>(0)
  const [restockBottle, setRestockBottle] = useState<number>(0)

  // State Confirmation Modal (Hapus)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)

  // State Custom Toast
  const [toast, setToast] = useState<ToastState | null>(null)

  // State Form Input Produk
  const [formData, setFormData] = useState({
    name: '',
    box_stock: 0,
    bottle_stock: 0,
    units_per_box: 1,
    selling_price_per_box: 0,
    selling_price_per_bottle: 0,
    is_retail_allowed: false,
  })

  const showToast = (message: string, type: 'error' | 'success' | 'warning' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Fetch Semua Produk
  const fetchProducts = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      showToast('Gagal memuat daftar produk: ' + error.message, 'error')
    } else if (data) {
      setProducts(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  // Buka Modal untuk Tambah Produk Baru
  const handleOpenAddModal = () => {
    setEditingProduct(null)
    setFormData({
      name: '',
      box_stock: 0,
      bottle_stock: 0,
      units_per_box: 12,
      selling_price_per_box: 0,
      selling_price_per_bottle: 0,
      is_retail_allowed: false,
    })
    setIsModalOpen(true)
  }

  // Buka Modal untuk Edit Produk
  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      box_stock: product.box_stock || 0,
      bottle_stock: product.bottle_stock || 0,
      units_per_box: product.units_per_box || 1,
      selling_price_per_box: product.selling_price_per_box || 0,
      selling_price_per_bottle: product.selling_price_per_bottle || 0,
      is_retail_allowed: product.is_retail_allowed || false,
    })
    setIsModalOpen(true)
  }

  // Buka Modal Restock / Barang Masuk
  const handleOpenRestockModal = (product: Product) => {
    setRestockProduct(product)
    setRestockBox(0)
    setRestockBottle(0)
  }

  // Submit Restock (Penambahan Stok Otomatis)
  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!restockProduct) return

    if (restockBox <= 0 && restockBottle <= 0) {
      showToast('⚠️ Masukkan jumlah barang masuk minimal 1 Dus atau 1 Pcs!', 'warning')
      return
    }

    setSubmitting(true)

    const newBoxStock = (restockProduct.box_stock || 0) + Number(restockBox)
    const newBottleStock = (restockProduct.bottle_stock || 0) + Number(restockBottle)

    const { error } = await supabase
      .from('products')
      .update({
        box_stock: newBoxStock,
        bottle_stock: newBottleStock,
      })
      .eq('id', restockProduct.id)

    if (error) {
      showToast('Gagal menambahkan stok: ' + error.message, 'error')
    } else {
      showToast(
        `✅ Stok "${restockProduct.name}" berhasil ditambahkan (+${restockBox} Dus)!`,
        'success'
      )
      setRestockProduct(null)
      fetchProducts()
    }

    setSubmitting(false)
  }

  // Submit Handler (Tambah / Update Produk)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      showToast('⚠️ Nama produk tidak boleh kosong!', 'warning')
      return
    }

    setSubmitting(true)

    const payload = {
      name: formData.name.trim(),
      box_stock: Number(formData.box_stock),
      bottle_stock: Number(formData.bottle_stock),
      units_per_box: Number(formData.units_per_box),
      selling_price_per_box: Number(formData.selling_price_per_box),
      selling_price_per_bottle: Number(formData.selling_price_per_bottle),
      is_retail_allowed: formData.is_retail_allowed,
    }

    if (editingProduct) {
      const { error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', editingProduct.id)

      if (error) {
        showToast('Gagal memperbarui produk: ' + error.message, 'error')
      } else {
        showToast(`✅ Produk "${formData.name}" berhasil diperbarui!`, 'success')
        setIsModalOpen(false)
        fetchProducts()
      }
    } else {
      const { error } = await supabase.from('products').insert([payload])

      if (error) {
        showToast('Gagal menambahkan produk: ' + error.message, 'error')
      } else {
        showToast(`✅ Produk "${formData.name}" berhasil ditambahkan!`, 'success')
        setIsModalOpen(false)
        fetchProducts()
      }
    }

    setSubmitting(false)
  }

  // Handler Hapus Produk
  const ConfirmDeleteProduct = async () => {
    if (!deletingProduct) return

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', deletingProduct.id)

    if (error) {
      showToast('Gagal menghapus produk: ' + error.message, 'error')
    } else {
      showToast(`🗑️ Produk "${deletingProduct.name}" berhasil dihapus.`, 'success')
      fetchProducts()
    }

    setDeletingProduct(null)
  }

  // Filter Search
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-3.5 sm:p-6 max-w-6xl mx-auto space-y-6 text-slate-900 dark:text-slate-100 relative">
      {/* 🔔 CUSTOM TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 max-w-md animate-bounce-short">
          <div
            className={`flex items-center gap-3 p-4 rounded-2xl shadow-2xl border backdrop-blur-md transition-all ${
              toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
                : toast.type === 'warning'
                ? 'bg-amber-950/90 border-amber-500/50 text-amber-200'
                : 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
            }`}
          >
            <span className="text-xl">
              {toast.type === 'error' ? '❌' : toast.type === 'warning' ? '⚠️' : '✅'}
            </span>
            <span className="text-xs sm:text-sm font-semibold">{toast.message}</span>
          </div>
        </div>
      )}

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
            <span>📦</span> Master Data Katalog Produk
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Kelola data barang, harga jual Dus/Pcs, serta input barang masuk gudang.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl shadow-md transition gap-2"
        >
          <span>➕</span> Tambah Produk Baru
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <input
          type="text"
          placeholder="🔍 Cari nama produk di katalog..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Table Data Produk */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Memuat katalog produk...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">Tidak ada produk ditemukan.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-400 uppercase text-[10px] sm:text-xs font-bold tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Nama Produk</th>
                  <th className="py-3 px-4 text-center">Stok Dus</th>
                  <th className="py-3 px-4 text-center">Stok Ecer (Pcs)</th>
                  <th className="py-3 px-4 text-right">Harga / Dus</th>
                  <th className="py-3 px-4 text-right">Harga / Pcs</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/50 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                      📦 {p.name}
                      <div className="text-[10px] text-slate-400 font-normal">
                        1 Dus = {p.units_per_box || 1} Pcs
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-black text-blue-500">
                      {p.box_stock || 0} Dus
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                      {p.is_retail_allowed ? `${p.bottle_stock || 0} Pcs` : '❌ Tidak Dijual Ecer'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-500">
                      Rp {(p.selling_price_per_box || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-400">
                      {p.is_retail_allowed
                        ? `Rp ${(p.selling_price_per_bottle || 0).toLocaleString('id-ID')}`
                        : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* 📥 Tombol Cepat Barang Masuk / Restock */}
                        <button
                          onClick={() => handleOpenRestockModal(p)}
                          className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 text-xs font-bold px-2.5 py-1.5 rounded-lg transition"
                          title="Input Barang Masuk"
                        >
                          📥 Restock
                        </button>

                        {/* Tombol Edit */}
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 text-xs font-bold px-2.5 py-1.5 rounded-lg transition"
                          title="Edit Produk"
                        >
                          ✏️ Edit
                        </button>

                        {/* Tombol Hapus */}
                        <button
                          onClick={() => setDeletingProduct(p)}
                          className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 text-xs font-bold px-2.5 py-1.5 rounded-lg transition"
                          title="Hapus Produk"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 📥 MODAL INPUT BARANG MASUK / RESTOCK */}
      {restockProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-emerald-500/5">
              <h2 className="text-base font-black flex items-center gap-2 text-emerald-500">
                <span>📥</span>
                <span>Barang Masuk: {restockProduct.name}</span>
              </h2>
              <button
                onClick={() => setRestockProduct(null)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRestockSubmit} className="p-5 space-y-4">
              {/* Ringkasan Stok Saat Ini */}
              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-2 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Stok Dus Saat Ini</span>
                  <span className="text-sm font-black text-blue-500">{restockProduct.box_stock || 0} Dus</span>
                </div>
                {restockProduct.is_retail_allowed && (
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Stok Pcs Saat Ini</span>
                    <span className="text-sm font-black text-slate-300">{restockProduct.bottle_stock || 0} Pcs</span>
                  </div>
                )}
              </div>

              {/* Input Tambahan Masuk */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">
                    (+) Tambahan Jumlah Dus Masuk
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={restockBox || ''}
                    onChange={(e) => setRestockBox(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-emerald-500/50 rounded-xl px-3.5 py-2 text-sm font-bold text-emerald-500 focus:outline-none focus:border-emerald-500"
                    autoFocus
                  />
                </div>

                {restockProduct.is_retail_allowed && (
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">
                      (+) Tambahan Jumlah Pcs Masuk (Ecer)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={restockBottle || ''}
                      onChange={(e) => setRestockBottle(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}
              </div>

              {/* Live Preview Stok Akhir */}
              <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-xs font-bold text-emerald-400 flex justify-between items-center">
                <span>Total Stok Akhir Nanti:</span>
                <span className="text-sm font-black">
                  {(restockProduct.box_stock || 0) + Number(restockBox)} Dus
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRestockProduct(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-1"
                >
                  {submitting ? 'Menyimpan...' : '📥 Tambah Stok Masuk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📝 MODAL DIALOG (TAMBAH / EDIT PRODUK) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h2 className="text-base font-black flex items-center gap-2">
                <span>{editingProduct ? '✏️' : '➕'}</span>
                <span>{editingProduct ? 'Edit Data Produk' : 'Tambah Produk Baru'}</span>
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Nama Produk *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Oasis 600 ml"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Stok Awal (Dus)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.box_stock}
                    onChange={(e) => setFormData({ ...formData, box_stock: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Harga / Dus (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.selling_price_per_box}
                    onChange={(e) => setFormData({ ...formData, selling_price_per_box: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-emerald-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Opsi Penjualan Eceran */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_retail_allowed}
                    onChange={(e) => setFormData({ ...formData, is_retail_allowed: e.target.checked })}
                    className="rounded accent-blue-600 w-4 h-4"
                  />
                  <span className="text-xs font-bold">Izinkan Penjualan Eceran (Pcs)</span>
                </label>

                {formData.is_retail_allowed && (
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Isi / Dus (Pcs)</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.units_per_box}
                        onChange={(e) => setFormData({ ...formData, units_per_box: Number(e.target.value) })}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-xs font-bold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Stok Pcs</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.bottle_stock}
                        onChange={(e) => setFormData({ ...formData, bottle_stock: Number(e.target.value) })}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-xs font-bold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Harga / Pcs (Rp)</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.selling_price_per_bottle}
                        onChange={(e) => setFormData({ ...formData, selling_price_per_bottle: Number(e.target.value) })}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-xs font-bold text-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : '💾 Simpan Produk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ⚠️ MODAL KONFIRMASI HAPUS PRODUK */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 text-center">
            <div className="text-4xl">⚠️</div>
            <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
              Konfirmasi Hapus Produk
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Apakah Anda yakin ingin menghapus produk <strong className="text-slate-100">"{deletingProduct.name}"</strong>? Data yang dihapus tidak dapat dikembalikan.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeletingProduct(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-100 dark:bg-slate-800"
              >
                Batal
              </button>
              <button
                onClick={ConfirmDeleteProduct}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-md transition"
              >
                Ya, Hapus Produk
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}