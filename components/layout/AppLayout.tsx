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
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <div className="flex flex-1 flex-col">
        <Header title={title} />

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}