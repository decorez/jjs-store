import Sidebar from "./Sidebar";
import Header from "./Header";

interface AppLayoutProps {
  title: string;
  children: React.ReactNode;
}

export default function AppLayout({
  title,
  children,
}: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-100 flex">
      <Sidebar />

      <main className="flex-1">
        <Header title={title} />

        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}