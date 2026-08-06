'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ThemeToggle from './ThemeToggle'

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Input Nota', href: '/dashboard/invoice', icon: '📄' },
  { name: 'Rekap Piutang', href: '/dashboard/sales', icon: '📜' },
  { name: 'Tagihan Sales', href: '/dashboard/collections', icon: '🚚' },
  { name: 'Stok Produk', href: '/dashboard/products', icon: '📦' },
  { name: 'Laporan', href: '/dashboard/reports', icon: '📈' },
]

export default function Navbar() {
  const pathname = usePathname()

  return (
    <>
      {/* ==================== DESKTOP SIDEBAR ==================== */}
      <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-5 fixed left-0 top-0 z-40 transition-colors duration-300">
        <div className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl p-2 bg-blue-600/10 text-blue-600 dark:text-blue-400 rounded-xl">🛒</span>
            <div>
              <h1 className="font-black text-lg text-slate-900 dark:text-white leading-none">JJ's APP</h1>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Store System</span>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <nav className="flex-1 space-y-1.5 mt-6">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-sm transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-400 text-center">
          © 2026 JJ's App v2.0
        </div>
      </aside>

      {/* ==================== MOBILE HEADER (TOP) ==================== */}
      <header className="lg:hidden sticky top-0 z-30 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🛒</span>
          <span className="font-black text-slate-900 dark:text-white text-base">JJ's APP</span>
        </div>
        <ThemeToggle />
      </header>

      {/* ==================== MOBILE BOTTOM BAR (FIXED & SCROLLABLE) ==================== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-1 py-1 flex items-center overflow-x-auto justify-between transition-colors duration-300">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all min-w-[64px] shrink-0 ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              <span className="text-[9px] mt-1 tracking-tight whitespace-nowrap">{item.name}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}