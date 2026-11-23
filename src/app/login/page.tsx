import { redirect } from 'next/navigation';
import { getUser, homeForRole } from '@/lib/auth';
import { APP_NAME, CREATOR_LINE } from '@/lib/brand';
import { LoginForm } from './LoginForm';

export const metadata = { title: 'Sign In' };

export default async function LoginPage() {
  const user = await getUser();
  if (user) redirect(homeForRole(user.role?.slug));
  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <header className="bg-slate-900 px-6 py-4 text-white">
        <span className="text-xl font-bold tracking-tight">
          College <span className="text-sm font-semibold text-indigo-400">ERP</span>
        </span>
        <span className="ml-2 text-xs text-slate-400">University Group</span>
      </header>
      <main className="container mx-auto flex-1 px-4 py-8">
        <div className="mx-auto mt-8 max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <h1 className="text-xl font-bold text-slate-900">Sign in to {APP_NAME}</h1>
          <p className="mb-6 mt-1 text-xs text-slate-500">Authentication is required to access the College Management System.</p>
          <LoginForm />
        </div>
      </main>
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        {APP_NAME} &bull; Complete 30-Module Institutional Suite (NEP 2020 &amp; NAAC Ready) &bull; {CREATOR_LINE}
      </footer>
    </div>
  );
}
