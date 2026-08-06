"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  BarChart3,
  Settings,
} from "lucide-react";

const menus = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Penjualan",
    href: "/sales",
    icon: ShoppingCart,
  },
  {
    title: "Produk",
    href: "/products",
    icon: Package,
  },
  {
    title: "Invoice",
    href: "/invoice",
    icon: Receipt,
  },
  {
    title: "Laporan",
    href: "/reports",
    icon: BarChart3,
  },
  {
    title: "Pengaturan",
    href: "/settings",
    icon: Settings,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-64 flex-col border-r bg-white">
      {/* Logo */}
      <div className="border-b px-6 py-5">
        <h1 className="text-2xl font-bold text-blue-600">
          🥤 GrosirPOS
        </h1>

        <p className="text-sm text-gray-500">
          Sistem Kasir
        </p>
      </div>

      {/* Menu */}
      <nav className="flex-1 space-y-2 p-4">
        {menus.map((menu) => {
          const Icon = menu.icon;
          const active = pathname === menu.href;

          return (
            <Link
              key={menu.href}
              href={menu.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all ${
                active
                  ? "bg-blue-600 text-white shadow"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icon size={20} />
              <span>{menu.title}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <div className="rounded-xl bg-slate-100 p-3">
          <p className="font-semibold">Admin</p>
          <p className="text-sm text-gray-500">
            owner@grosirpos.com
          </p>
        </div>
      </div>
    </aside>
  );
}