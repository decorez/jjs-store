interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b px-6 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          {title}
        </h1>

        <p className="text-sm text-slate-500">
          Sistem Kasir Grosir Minuman
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
          A
        </div>

        <div>
          <p className="font-semibold">
            Admin
          </p>

          <p className="text-xs text-slate-500">
            Owner
          </p>
        </div>
      </div>
    </header>
  );
}