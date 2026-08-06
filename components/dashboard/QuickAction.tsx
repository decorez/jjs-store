import React from 'react'
import Link from 'next/link'

export const QuickAction = () => {
  const actions = [
    { label: '➕ Input Pesanan', href: '/dashboard/invoice', color: 'bg-blue-600 hover:bg-blue-700' },
    { label: '📦 Kelola Produk', href: '/dashboard/products', color: 'bg-emerald-600 hover:bg-emerald-700' },
    { label: '📄 Rekap Sales', href: '/dashboard/sales', color: 'bg-purple-600 hover:bg-purple-700' },
    { label: '📊 Laporan', href: '/dashboard/reports', color: 'bg-orange-600 hover:bg-orange-700' },
    { label: '🚚 Tagihan Sales', href: '/dashboard/collections', color: 'bg-orange-600 hover:bg-orange-700' }
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {actions.map((act, idx) => (
        <Link 
          key={idx} 
          href={act.href}
          className={`${act.color} text-white p-4 rounded-xl font-semibold text-center text-sm shadow-sm transition transform active:scale-95`}
        >
          {act.label}
        </Link>
      ))}
    </div>
  )
}