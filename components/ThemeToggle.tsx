'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="w-14 h-7 rounded-full bg-slate-800/20 animate-pulse" />
  }

  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer items-center rounded-full p-1 transition-colors duration-300 focus:outline-none ${
        isDark ? 'bg-slate-800 border border-slate-700' : 'bg-slate-300 border border-slate-400'
      }`}
      title={isDark ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
    >
      <span className="absolute left-1.5 text-[11px] select-none">🌙</span>
      <span className="absolute right-1.5 text-[11px] select-none">☀️</span>

      <span
        className={`inline-block h-5 w-5 transform rounded-full shadow-md transition-transform duration-300 ${
          isDark ? 'translate-x-7 bg-blue-500' : 'translate-x-0 bg-amber-400'
        }`}
      />
    </button>
  )
}