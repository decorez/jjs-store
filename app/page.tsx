import Link from 'next/link'
import { Store, ArrowRight } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl">
        
        {/* Logo / Icon */}
        <div className="inline-flex p-4 bg-blue-600/10 border border-blue-500/20 text-blue-500 rounded-2xl">
          <Store size={40} />
        </div>
        
        {/* Judul & Deskripsi */}
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-white tracking-tight">
            JJ GROUP
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Sistem Manajemen Kasir & Operasional Toko. Kelola stok barang, catat piutang pelanggan, dan kontrol tagihan sales harian.
          </p>
        </div>
        
        {/* Tombol Masuk */}
        <div className="pt-2">
          <Link 
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-blue-600/25 text-xs active:scale-[0.99]"
          >
            <span>Masuk ke Dashboard</span>
            <ArrowRight size={16} />
          </Link>
        </div>

      </div>
      
      <p className="text-[11px] text-slate-500 mt-8 font-medium">
        © 2026 JJ GROUP Store System
      </p>
    </div>
  )
}