import Navbar from '@/components/Navbar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Navbar / Sidebar Global */}
      <Navbar />

      {/* Area Konten Utama */}
      {/* pb-28 memberikan jarak aman agar konten terbawah tidak terhalang Bottom Bar di HP */}
      <main className="lg:pl-64 pb-28 lg:pb-8 transition-all">
        {children}
      </main>
    </div>
  )
}