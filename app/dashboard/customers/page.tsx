'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Customer {
  id: number
  name: string
  phone: string | null
  address: string | null
  created_at?: string
}

interface CustomerWithStats extends Customer {
  totalNota: number
  totalBelanja: number
  sisaPiutang: number
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // State Custom Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'error') => {
    setToast({ message, type })
    setTimeout(() => {
      setToast(null)
    }, 3000)
  }

  // State Modal Form
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
  })

  // State Modal Konfirmasi Hapus
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)

  const fetchCustomers = async () => {
    setLoading(true)

    // Ambil data toko & transaksi untuk rekap total belanja & piutang
    const [resCust, resTx] = await Promise.all([
      supabase.from('customers').select('*').order('name', { ascending: true }),
      supabase.from('transactions').select('customer_name, total_price, paid_amount'),
    ])

    if (resCust.error) {
      showToast('Gagal mengambil data toko: ' + resCust.error.message, 'error')
      setLoading(false)
      return
    }

    const custData = resCust.data || []
    const txData = resTx.data || []

    // Agregasi statistik nota, belanja, dan piutang per pelanggan
    const combined: CustomerWithStats[] = custData.map((cust) => {
      const myTxs = txData.filter(
        (tx) => tx.customer_name?.toLowerCase().trim() === cust.name?.toLowerCase().trim()
      )
      const totalNota = myTxs.length
      const totalBelanja = myTxs.reduce((sum, tx) => sum + (tx.total_price || 0), 0)
      const sisaPiutang = myTxs.reduce(
        (sum, tx) => sum + Math.max(0, (tx.total_price || 0) - (tx.paid_amount || 0)),
        0
      )

      return {
        ...cust,
        totalNota,
        totalBelanja,
        sisaPiutang,
      }
    })

    setCustomers(combined)
    setLoading(false)
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  // Filter pencarian
  const filteredCustomers = customers.filter((item) => {
    const q = searchQuery.toLowerCase()
    return (
      item.name?.toLowerCase().includes(q) ||
      item.phone?.toLowerCase().includes(q) ||
      item.address?.toLowerCase().includes(q)
    )
  })

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer)
      setFormData({
        name: customer.name || '',
        phone: customer.phone || '',
        address: customer.address || '',
      })
    } else {
      setEditingCustomer(null)
      setFormData({ name: '', phone: '', address: '' })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingCustomer(null)
    setFormData({ name: '', phone: '', address: '' })
  }

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      showToast('Nama toko / pelanggan tidak boleh kosong!', 'error')
      return
    }

    setSaving(true)

    const payload = {
      name: formData.name.trim(),
      phone: formData.phone.trim() || null,
      address: formData.address.trim() || null,
    }

    let error

    if (editingCustomer) {
      const res = await supabase
        .from('customers')
        .update(payload)
        .eq('id', editingCustomer.id)
      error = res.error
    } else {
      const res = await supabase.from('customers').insert([payload])
      error = res.error
    }

    setSaving(false)

    if (error) {
      showToast('Gagal menyimpan data toko: ' + error.message, 'error')
    } else {
      showToast(
        editingCustomer ? 'Data toko berhasil diperbarui!' : 'Toko baru berhasil ditambahkan!',
        'success'
      )
      handleCloseModal()
      fetchCustomers()
    }
  }

  const executeDeleteCustomer = async () => {
    if (!deleteTarget) return

    const { error } = await supabase.from('customers').delete().eq('id', deleteTarget.id)

    if (error) {
      showToast('Gagal menghapus toko: ' + error.message, 'error')
    } else {
      showToast(`Toko "${deleteTarget.name}" berhasil dihapus!`, 'success')
      setDeleteTarget(null)
      fetchCustomers()
    }
  }

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

      {/* Header Page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-blue-400 transition gap-1 mb-1"
          >
            ← Kembali ke Dashboard
          </Link>
          <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2 text-white">
            <span>🏪</span> Kelola Toko & Pelanggan
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Master data pelanggan, kontak toko, dan ringkasan posisi piutang.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg transition flex items-center justify-center gap-2 shrink-0"
        >
          ➕ Tambah Toko Baru
        </button>
      </div>

      {/* 🔍 Search & Total Count Bar */}
      <div className="bg-[#0b1329] border border-slate-800/80 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">
            🔍
          </span>
          <input
            type="text"
            placeholder="Cari nama toko, HP, atau alamat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#070c1a] border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>
        <div className="text-xs text-slate-400 font-medium self-end sm:self-center">
          Total Terdaftar: <strong className="text-white font-bold">{filteredCustomers.length} Toko</strong>
        </div>
      </div>

      {/* 📊 Daftar Tabel Toko */}
      <div className="bg-[#0b1329] border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Memuat data toko & piutang...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Data toko tidak ditemukan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#070c1a] text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-5">Nama Toko / Pelanggan</th>
                  <th className="py-3.5 px-5">Kontak & Alamat</th>
                  <th className="py-3.5 px-5">Total Belanja</th>
                  <th className="py-3.5 px-5">Sisa Piutang</th>
                  <th className="py-3.5 px-5 text-center w-36">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredCustomers.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition">
                    {/* Column 1: Name & Nota Count */}
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-slate-100 text-sm">{item.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-normal">
                        {item.totalNota} Nota Transaksi
                      </div>
                    </td>

                    {/* Column 2: Phone & Address */}
                    <td className="py-3.5 px-5 text-slate-300 space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <span>📱</span>
                        <span>{item.phone || '-'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <span>📍</span>
                        <span>{item.address || 'Alamat belum diisi'}</span>
                      </div>
                    </td>

                    {/* Column 3: Total Belanja */}
                    <td className="py-3.5 px-5 text-sm font-bold text-slate-100">
                      Rp {item.totalBelanja.toLocaleString('id-ID')}
                    </td>

                    {/* Column 4: Sisa Piutang Badge */}
                    <td className="py-3.5 px-5">
                      {item.sisaPiutang > 0 ? (
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-rose-950/80 text-rose-400 border border-rose-800/60">
                          Belum Lunas (Rp {item.sisaPiutang.toLocaleString('id-ID')})
                        </span>
                      ) : (
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                          Lunas (Rp 0)
                        </span>
                      )}
                    </td>

                    {/* Column 5: Action Buttons */}
                    <td className="py-3.5 px-5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenModal(item)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-900/50 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                        >
                          🗑️ Hapus
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

      {/* ✏️ MODAL EDIT / TAMBAH TOKO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b1329] border border-slate-800 w-full max-w-md rounded-2xl p-6 space-y-4 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <span>✏️</span> {editingCustomer ? 'Edit Data Toko' : 'Tambah Toko Baru'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-white font-bold text-lg px-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Nama Toko / Pelanggan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Toko Aldo"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full bg-[#070c1a] border border-slate-800 rounded-xl px-3.5 py-2.5 font-bold focus:outline-none focus:border-blue-500 text-slate-100"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Nomor HP / WhatsApp</label>
                <input
                  type="text"
                  placeholder="Contoh: 08123456789"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-[#070c1a] border border-slate-800 rounded-xl px-3.5 py-2.5 font-bold focus:outline-none focus:border-blue-500 text-slate-100"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Alamat Lengkap Toko</label>
                <textarea
                  rows={3}
                  placeholder="Contoh: Perumnas Sako, Palembang"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-[#070c1a] border border-slate-800 rounded-xl px-3.5 py-2.5 font-bold focus:outline-none focus:border-blue-500 text-slate-100 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 font-bold text-slate-400 hover:text-slate-200 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2 rounded-xl transition shadow"
                >
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ⚠️ MODAL KONFIRMASI HAPUS */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-[#0b1329] border border-slate-800 p-6 rounded-2xl max-w-md w-full space-y-4 text-center text-slate-100 shadow-2xl">
            <div className="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-full flex items-center justify-center text-2xl mx-auto border border-rose-500/20">
              ⚠️
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-100">Hapus Data Toko?</h3>
              <p className="text-xs text-slate-400">
                Apakah Anda yakin ingin menghapus toko <strong className="text-slate-200">"{deleteTarget.name}"</strong>?
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="w-full py-2.5 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition"
              >
                Batal
              </button>
              <button
                onClick={executeDeleteCustomer}
                className="w-full py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-lg transition"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}