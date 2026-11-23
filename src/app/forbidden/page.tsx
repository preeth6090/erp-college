import Link from 'next/link';
import { getUser, homeForRole } from '@/lib/auth';

export const metadata = { title: 'Access denied' };

export default async function Forbidden() {
  const user = await getUser();
  return (
    <div className="mx-4 mt-16 max-w-md rounded-xl border border-slate-200 bg-white p-6 sm:mx-auto sm:mt-24 sm:p-8 text-center shadow-sm">
      <h1 className="text-lg font-semibold text-slate-900">Access denied</h1>
      <p className="mt-2 text-sm text-slate-500">You do not have permission to access this module.</p>
      <Link href={user ? homeForRole(user.role?.slug) : '/login'} className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white">Go to my home</Link>
    </div>
  );
}
