import Link from 'next/link';
import { APP_NAME, CREATOR_LINE } from '@/lib/brand';

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 px-6 py-4 text-white">
        <Link href="/" className="text-xl font-bold tracking-tight">
          College <span className="text-sm font-semibold text-indigo-400">ERP</span>
          <span className="ml-2 text-xs font-normal text-slate-400">University Group</span>
        </Link>
        <Link href="/login" className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium hover:bg-indigo-500">ERP Login</Link>
      </header>
      <main className="container mx-auto flex-1 px-4 py-8">{children}</main>
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        {APP_NAME} &bull; Complete 30-Module Institutional Suite (NEP 2020 &amp; NAAC Ready) &bull; {CREATOR_LINE}
      </footer>
    </div>
  );
}
