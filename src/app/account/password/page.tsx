import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser, homeFor } from '@/lib/auth';
import { describePolicy, getPolicy } from '@/lib/policy';
import { CREATOR_LINE } from '@/lib/brand';
import { PasswordForm } from './PasswordForm';

export const metadata = { title: 'Change password' };
export const dynamic = 'force-dynamic';

export default async function ChangePassword() {
  const user = await getUser();
  if (!user) redirect('/login');
  const policy = await getPolicy();
  return (
    <div className="flex min-h-dvh flex-col bg-slate-100">
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-bold text-slate-900">{user.must_change_password ? 'Set a new password' : 'Change your password'}</h1>
          <p className="mb-5 mt-1 text-sm text-slate-500">
            {user.must_change_password ? 'For your security, please choose a new password before continuing.' : `Signed in as ${user.email}.`}
          </p>
          <PasswordForm rule={describePolicy(policy)} />
          {!user.must_change_password && <Link href={homeFor(user)} className="mt-4 block text-center text-xs text-slate-500 hover:text-slate-800">← Back</Link>}
        </div>
      </main>
      <footer className="py-4 text-center text-xs text-slate-500">{CREATOR_LINE}</footer>
    </div>
  );
}
