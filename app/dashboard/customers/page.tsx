'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Customer {
  id: number
  name: string
  phone?: string
  address?: string
  created_at?: string
}

interface Transaction {
  id: number
  customer_name: string
  total_price: number
  paid_amount: number
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // State Modal Form Add/Edit
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' })
  const [submitting, setSubmitting] = useState(false)

  // Fetch Data Toko & Transaksi
  const fetchData = async () => {
    setLoading(true)
    const [custRes, txRes] = await Promise.all([
      supabase.from('customers').select('*').order('name', { ascending: true }),
      supabase.from('transactions').select('id, customer_name, total_price, paid_amount')
    ])

    if (custRes.data) setCustomers(custRes.data)
    if (txRes.data) setTransactions(txRes.data)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Buka Modal Tambah Toko
  const handleOpenAddModal = () => {
    setEditingCustomer(null)
    setFormData({ name: '', phone: '', address: '' })
    setIsModalOpen(true)
  }

  // Buka Modal Edit Toko
  const handleOpenEditModal = (customer: Customer) => {
    setEditingCustomer(customer)
    setFormData({
      name: customer.name || '',
      phone: customer.phone || '',
      address: customer.address || '',
    })
    setIsModalOpen(true)
  }

  // Simpan Data Toko (Insert / Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setSubmitting(true)
    if (editingCustomer) {
      // Update
      const { error } = await supabase
        .from('customers')
        .update({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          address: formData.address.trim(),
        })
        .eq('id', editingCustomer.id)

      if (error) alert('Gagal memperbarui toko: ' + error.message)
    } else {
      // Create Baru
      const { error } = await supabase.from('customers').insert([
        {
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          address: formData.address.trim(),
        },
      ])

      if (error) alert('Gagal menambah toko: ' + error.message)
    }

    setSubmitting(false)
    setIsModalOpen(false)
    fetchData()
  }

  // Hapus Data Toko
  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Yakin ingin menghapus toko "${name}"?`)) return

    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) {
      alert('Gagal menghapus toko: ' + error.message)
    } else {
      fetchData()
    }
  }

  // Filter Toko berdasarkan Search Bar
  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone && c.phone.includes(searchQuery)) ||
      (c.address && c.address.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="p-3.5 sm:p-6 max-w-7xl mx-auto space-y-6 text-slate-900 dark:text-slate-100">
      {/* Header & Navigasi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center text-xs sm:text-sm font-semibold text-slate-500 hover:text-blue-600 transition gap-1 mb-1"
          >
            ← Kembali ke Dashboard
          </Link>
          <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2">
            <span>🏪</span> Kelola Toko & Pelanggan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Master data pelanggan, kontak toko, dan ringkasan posisi piutang.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md transition flex items-center justify-center gap-2"
        >
          <span>➕</span> Tambah Toko Baru
        </button>
      </div>

      {/* Bar Pencarian & Stats Singkat */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="w-full md:w-80">
          <input
            type="text"
            placeholder="🔍 Cari nama toko, HP, atau alamat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="text-xs text-slate-400 font-medium self-end md:self-auto">
          Total Terdaftar: <strong className="text-slate-900 dark:text-white font-bold">{customers.length} Toko</strong>
        </div>
      </div>

      {/* Tabel Data Toko */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-slate-400 text-sm">Memuat data toko...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            {searchQuery ? 'Toko tidak ditemukan.' : 'Belum ada data toko terdaftar.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 uppercase bg-slate-50 dark:bg-slate-950">
                  <th className="p-3.5">Nama Toko / Pelanggan</th>
                  <th className="p-3.5">Kontak & Alamat</th>
                  <th className="p-3.5 text-right">Total Belanja</th>
                  <th className="p-3.5 text-right">Sisa Piutang</th>
                  <th className="p-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {filteredCustomers.map((cust) => {
                  // Hitung keuangan per toko
                  const custTxs = transactions.filter(
                    (tx) => tx.customer_name?.toLowerCase().trim() === cust.name.toLowerCase().trim()
                  )
                  const totalBelanja = custTxs.reduce((sum, tx) => sum + (Number(tx.total_price) || 0), 0)
                  const totalBayar = custTxs.reduce((sum, tx) => sum + (Number(tx.paid_amount) || 0), 0)
                  const sisaPiutang = totalBelanja - totalBayar

                  return (
                    <tr key={cust.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white">{cust.name}</div>
                        <div className="text-[10px] text-slate-400">{custTxs.length} Nota Transaksi</div>
                      </td>

                      <td className="p-3.5 text-xs">
                        <div className="text-slate-700 dark:text-slate-300 font-medium">
                          📱 {cust.phone || '-'}
                        </div>
                        <div className="text-slate-400 truncate max-w-xs">
                          📍 {cust.address || 'Alamat belum diisi'}
                        </div>
                      </td>

                      <td className="p-3.5 text-right font-semibold text-slate-700 dark:text-slate-300">
                        Rp {totalBelanja.toLocaleString('id-ID')}
                      </td>

                      <td className="p-3.5 text-right whitespace-nowrap">
                        {sisaPiutang > 0 ? (
                          <span className="font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/50 px-2.5 py-1 rounded-lg text-xs">
                            Rp {sisaPiutang.toLocaleString('id-ID')}
                          </span>
                        ) : (
                          <span className="font-semibold text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg text-xs">
                            Lunas (Rp 0)
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-center whitespace-nowrap space-x-2">
                        <button
                          onClick={() => handleOpenEditModal(cust)}
                          className="text-xs px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg font-semibold transition"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDelete(cust.id, cust.name)}
                          className="text-xs px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-600 dark:text-rose-400 rounded-lg font-semibold transition"
                        >
                          🗑️ Hapus
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL FORM ADD / EDIT TOKO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl p-6 space-y-4 shadow-xl">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{editingCustomer ? '✏️ Edit Data Toko' : '🏪 Tambah Toko Baru'}</span>
            </h2>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  Nama Toko / Pelanggan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Toko Sinar Jaya"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  Nomor HP / WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 08123456789"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  Alamat Lengkap Toko
                </label>
                <textarea
                  rows={3}
                  placeholder="Contoh: Jl. Merdeka No. 45, Pasar Induk..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : editingCustomer ? 'Simpan Perubahan' : 'Tambah Toko'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}