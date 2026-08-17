'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Store, Lock, Mail, Loader2, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Silakan isi email dan password terlebih dahulu.')
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setErrorMsg('Email atau password tidak sesuai.')
        setLoading(false)
        return
      }

      // Pastikan session terbentuk sebelum pindah halaman
      if (data?.session) {
        router.push('/dashboard')
        router.refresh()
      } else {
        setErrorMsg('Gagal membuat sesi login. Coba lagi.')
        setLoading(false)
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal terhubung ke server Supabase.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3.5 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20 mb-1">
            <Store size={32} />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            JJ GROUP
          </h1>
          <p className="text-xs text-slate-400">
            Masuk untuk mengakses sistem kasir dan manajemen toko
          </p>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-3 p-3.5 bg-rose-500/10 border border-rose-500/25 text-rose-400 rounded-xl text-xs font-semibold animate-in fade-in slide-in-from-top-1 duration-200">
            <AlertCircle size={18} className="shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 text-slate-500" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (errorMsg) setErrorMsg('')
                }}
                placeholder="admin@jjgroup.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-100 placeholder:text-slate-600 transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 text-slate-500" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (errorMsg) setErrorMsg('')
                }}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-100 placeholder:text-slate-600 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99]"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                <span>Memproses...</span>
              </>
            ) : (
              'Masuk ke Sistem'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}