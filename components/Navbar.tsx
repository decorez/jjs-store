'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import ThemeToggle from './ThemeToggle'
import { supabase } from '@/lib/supabase'
import {
  LayoutDashboard,
  Receipt,
  FileSpreadsheet,
  Motorbike,
  Wallet,
  Truck,
  Package,
  BarChart3,
  Store,
  LogOut,
} from 'lucide-react'

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Pelanggan', href: '/dashboard/customers', icon: Store },
  { name: 'Input Nota', href: '/dashboard/invoice', icon: Receipt },
  { name: 'Rekap Piutang', href: '/dashboard/sales', icon: FileSpreadsheet },
  { name: 'Tagihan', href: '/dashboard/collections', icon: Motorbike },
  { name: 'Setoran Sales', href: '/dashboard/settlement', icon: Wallet },
  { name: 'Stok Produk', href: '/dashboard/products', icon: Package },
  { name: 'Laporan', href: '/dashboard/reports', icon: BarChart3 },
  { name: 'Rekap Delivery', href: '/dashboard/delivery', icon: Truck },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [userName, setUserName] = useState<string>('Memuat...')
  const [userEmail, setUserEmail] = useState<string>('')

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setUserEmail(user.email)
        const rawName = user.user_metadata?.full_name || user.email.split('@')[0]
        const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1)
        setUserName(formattedName)
      } else {
        setUserName('Kasir')
        setUserEmail('-')
      }
    }
    fetchUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* ==================== DESKTOP SIDEBAR ==================== */}
      <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-5 fixed left-0 top-0 z-40 transition-colors duration-300">
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-500/20">
              <Store size={22} />
            </div>
            <div>
              <h1 className="font-bold text-lg text-blue-600 dark:text-blue-400 leading-none">
                JJ GROUP
              </h1>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 mt-6">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* User Info / Footer */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="rounded-xl bg-slate-100 dark:bg-slate-800/60 p-2.5 flex-1 mr-2 overflow-hidden">
            <p className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
              {userName}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate" title={userEmail}>
              {userEmail}
            </p>
          </div>
          <button
            onClick={handleLogout}
            title="Keluar Sistem"
            className="p-2.5 text-rose-500 hover:bg-rose-500/10 rounded-xl transition shrink-0"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* ==================== MOBILE HEADER (TOP) ==================== */}
      <header className="lg:hidden sticky top-0 z-30 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-blue-600 text-white rounded-lg">
            <Store size={18} />
          </div>
          <span className="font-bold text-blue-600 dark:text-blue-400 text-base">
            JJ GROUP
          </span>
        </div>
        <ThemeToggle />
      </header>

      {/* ==================== MOBILE BOTTOM BAR ==================== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 py-1 flex items-center overflow-x-auto justify-between transition-colors duration-300">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all min-w-[58px] shrink-0 ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon size={18} />
              <span className="text-[9px] mt-1 tracking-tight whitespace-nowrap">
                {item.name}
              </span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}