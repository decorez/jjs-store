'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function InvoicePage() {
  const businessId = 1

  const [stores, setStores] = useState<any[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState<string>('')
  const [mutations, setMutations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Form Tambah Toko
  const [newStoreName, setNewStoreName] = useState('')
  const [newStorePhone, setNewStorePhone] = useState('')

  // Form Bayar Utang
  const [payAmount, setPayAmount] = useState('')
  const [payNotes, setPayNotes] = useState('')

  // Fetch daftar toko
  async function fetchStores() {
    setLoading(true)
    const { data } = await supabase
      .from('stores')
      .select('*')
      .eq('business_id', businessId)
      .order('name', { ascending: true })

    if (data) {
      setStores(data)
      if (data.length > 0 && !selectedStoreId) {
        setSelectedStoreId(data[0].id.toString())
      }
    }
    setLoading(false)
  }

  // Fetch mutasi tagihan toko terpilih
  async function fetchMutations(storeId: string) {
    if (!storeId) return
    const { data } = await supabase
      .from('receivable_mutations')
      .select('*')
      .eq('store_id', parseInt(storeId))
      .order('created_at', { ascending: false })

    if (data) setMutations(data)
  }

  useEffect(() => {
    fetchStores()
  }, [])

  useEffect(() => {
    if (selectedStoreId) {
      fetchMutations(selectedStoreId)
    }
  }, [selectedStoreId])

  // Handler Tambah Toko Baru
  async function handleAddStore(e: React.FormEvent) {
    e.preventDefault()
    if (!newStoreName) return

    const { error } = await supabase.from('stores').insert([
      {
        business_id: businessId,
        name: newStoreName,
        phone: newStorePhone,
        receivable_balance: 0
      }
    ])

    if (error) {
      alert('Gagal menambah toko: ' + error.message)
    } else {
      alert('Toko/Pelanggan berhasil ditambahkan!')
      setNewStoreName('')
      setNewStorePhone('')
      fetchStores()
    }
  }

  // Handler Bayar Utang / Cicilan
  async function handlePayReceivable(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedStoreId || !payAmount) return

    const amount = parseFloat(payAmount) || 0
    const store = stores.find((s) => s.id === parseInt(selectedStoreId))

    if (!store) return

    const newBalance = (parseFloat(store.receivable_balance) || 0) - amount

    // Update Sisa Tagihan Toko
    await supabase
      .from('stores')
      .update({ receivable_balance: newBalance })
      .eq('id', store.id)

    // Catat Riwayat Pembayaran
    await supabase.from('receivable_mutations').insert([
      {
        business_id: businessId,
        store_id: store.id,
        mutation_type: 'PAYMENT',
        amount: amount,
        notes: payNotes || 'Pembayaran / Pelunasan Utang'
      }
    ])

    alert('Pembayaran berhasil dicatat!')
    setPayAmount('')
    setPayNotes('')
    fetchStores()
    fetchMutations(selectedStoreId)
  }

  // FUNGSI UTAMA: Kirim Tagihan via WhatsApp
  function handleSendWhatsApp(store: any) {
    let phone = store.phone ? store.phone.replace(/[^0-9]/g, '') : ''
    
    // Konversi nomor 08xx jadi 628xx
    if (phone.startsWith('0')) {
      phone = '62' + phone.slice(1)
    }

    const message = `Halo ${store.name},%0A%0AMengingatkan rincian total tagihan utang belanja minuman saat ini sebesar *Rp ${Number(store.receivable_balance || 0).toLocaleString()}*.%0A%0AMohon konfirmasi jika sudah melakukan pembayaran. Terima kasih! 🙏`

    const waUrl = phone 
      ? `https://wa.me/${phone}?text=${message}`
      : `https://wa.me/?text=${message}`

    window.open(waUrl, '_blank')
  }

  const selectedStore = stores.find((s) => s.id === parseInt(selectedStoreId))

  return (
    <main className="min-h-screen bg-gray-100 p-6 text-gray-800">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* HEADER & NAVIGASI */}
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">🧾 Manajemen Invoice & Tagihan</h1>
            <p className="text-xs text-gray-500">Kelola utang pelanggan dan catat pembayaran/pelunasan</p>
          </div>
          <Link
            href="/"
            className="bg-gray-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-700 transition"
          >
            ⬅️ Kembali ke Kasir
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* FORM 1: TAMBAH PELANGGAN / TOKO BARU */}
          <div className="bg-white p-6 rounded-xl shadow-sm border md:col-span-1 space-y-4">
            <h2 className="text-lg font-bold text-gray-700">➕ Tambah Pelanggan / Toko</h2>
            <form onSubmit={handleAddStore} className="space-y-3">
              <div>
                <label className="block text-xs font-medium">Nama Toko / Pemilik</label>
                <input
                  type="text"
                  required
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  placeholder="Contoh: Toko Berkah / Pak Budi"
                  className="w-full border p-2 rounded mt-1 text-sm bg-white text-black"
                />
              </div>
              <div>
                <label className="block text-xs font-medium">Nomor WhatsApp (Opsional)</label>
                <input
                  type="text"
                  value={newStorePhone}
                  onChange={(e) => setNewStorePhone(e.target.value)}
                  placeholder="Contoh: 08123456789"
                  className="w-full border p-2 rounded mt-1 text-sm bg-white text-black"
                />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700 text-sm">
                Simpan Toko Baru
              </button>
            </form>
          </div>

          {/* DETAIL TOKO & FORM BAYAR UTANG */}
          <div className="bg-white p-6 rounded-xl shadow-sm border md:col-span-2 space-y-4">
            <h2 className="text-lg font-bold text-gray-700">💳 Pilih Toko & Catat Pelunasan</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium">Pilih Pelanggan / Toko</label>
                <select
                  value={selectedStoreId}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                  className="w-full border p-2 rounded mt-1 font-semibold text-black bg-white"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Sisa Utang: Rp {Number(s.receivable_balance || 0).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              {/* CARD INFO UTANG & TOMBOL WA HIJAU (SELALU MUNCUL) */}
              {selectedStore && (
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 flex flex-wrap justify-between items-center gap-3">
                  <div>
                    <span className="text-xs text-gray-500 font-semibold uppercase">Total Tagihan {selectedStore.name}:</span>
                    <p className="text-2xl font-extrabold text-red-600">
                      Rp {Number(selectedStore.receivable_balance || 0).toLocaleString()}
                    </p>
                    {selectedStore.phone && (
                      <p className="text-xs text-gray-600 mt-0.5">📱 WA: {selectedStore.phone}</p>
                    )}
                  </div>

                  {/* TOMBOL WA DIPASTIKAN MUNCUL DI SINI */}
                  <button
                    type="button"
                    onClick={() => handleSendWhatsApp(selectedStore)}
                    className="bg-green-600 text-white text-sm font-bold px-4 py-2.5 rounded-lg hover:bg-green-700 transition flex items-center gap-2 shadow-sm"
                  >
                    💬 Kirim Tagihan via WA
                  </button>
                </div>
              )}
            </div>

            {/* FORM BAYAR UTANG */}
            {selectedStore && (
              <form onSubmit={handlePayReceivable} className="p-4 bg-gray-50 rounded-lg border space-y-3 mt-4">
                <h3 className="font-bold text-sm text-gray-700">📥 Form Catat Pembayaran / Cicilan</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium">Jumlah Bayar (Rp)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder="Rp"
                      className="w-full border p-2 rounded mt-1 text-sm bg-white text-black font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium">Catatan / Keterangan</label>
                    <input
                      type="text"
                      value={payNotes}
                      onChange={(e) => setPayNotes(e.target.value)}
                      placeholder="Contoh: Transfer BCA / Titip Tunai"
                      className="w-full border p-2 rounded mt-1 text-sm bg-white text-black"
                    />
                  </div>
                </div>
                <button type="submit" className="w-full bg-green-600 text-white font-bold py-2 rounded hover:bg-green-700 text-sm">
                  Simpan Pembayaran
                </button>
              </form>
            )}
          </div>

        </div>

        {/* TABEL RIWAYAT MUTASI */}
        <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
          <h2 className="text-lg font-bold text-gray-700">📜 Riwayat Transaksi & Pembayaran Toko Ini</h2>
          {loading ? (
            <p className="text-gray-500 text-sm">Memuat riwayat...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b text-gray-600">
                    <th className="p-3 font-semibold">Tanggal</th>
                    <th className="p-3 font-semibold">Jenis Transaksi</th>
                    <th className="p-3 font-semibold">Keterangan</th>
                    <th className="p-3 font-semibold text-right">Jumlah (Rp)</th>
                  </tr>
                </thead>
                <tbody>
                  {mutations.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-gray-400">
                        Belum ada riwayat transaksi untuk toko ini.
                      </td>
                    </tr>
                  ) : (
                    mutations.map((m) => (
                      <tr key={m.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 text-xs text-gray-500">
                          {new Date(m.created_at).toLocaleString('id-ID')}
                        </td>
                        <td className="p-3">
                          {m.mutation_type === 'NEW_INVOICE' ? (
                            <span className="px-2 py-1 bg-red-100 text-red-700 font-semibold text-xs rounded">
                              ➕ Utang Baru (Bon)
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-green-100 text-green-700 font-semibold text-xs rounded">
                              ➖ Bayar Utang
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-medium">{m.notes || '-'}</td>
                        <td className={`p-3 font-bold text-right ${m.mutation_type === 'NEW_INVOICE' ? 'text-red-600' : 'text-green-600'}`}>
                          {m.mutation_type === 'NEW_INVOICE' ? '+' : '-'} Rp {Number(m.amount).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </main>
  )
}