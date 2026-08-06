import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-md max-w-md w-full text-center space-y-6 border border-gray-100">
        
        {/* Ikon / Logo Toko */}
        <div className="text-6xl mb-2">📦</div>
        
        {/* Judul & Deskripsi */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Sistem Manajemen Toko
          </h1>
          <p className="text-gray-500 text-sm mt-2">
            Kelola stok minuman, catat piutang tetangga, dan pantau tagihan sales harian dengan mudah.
          </p>
        </div>
        
        {/* Tombol Masuk ke Dashboard */}
        <div className="pt-4">
          <Link 
            href="/dashboard"
            className="block w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition duration-200 shadow-sm"
          >
            Masuk ke Dashboard 🚀
          </Link>
        </div>

      </div>
      
      <p className="text-xs text-gray-400 mt-8">
        © 2026 Internal App Toko
      </p>
    </div>
  )
}