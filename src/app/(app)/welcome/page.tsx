import { redirect } from 'next/navigation';
import { getUser, homeFor } from '@/lib/auth';
import { Card, PageHeader } from '@/components/ui';

export const metadata = { title: 'Welcome' };
export const dynamic = 'force-dynamic';

export default async function Welcome() {
  const user = await getUser();
  if (!user) redirect('/login');
  const home = homeFor(user);
  if (home !== '/welcome') redirect(home);
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={`Welcome, ${user.name.split(' (')[0]}`} />
      <Card>
        <p className="text-sm text-slate-600">Your account <strong>{user.email}</strong> is active, but no modules have been assigned to your role{user.role ? ` (${user.role.name})` : ''} yet.</p>
        <p className="mt-2 text-sm text-slate-500">Please ask your administrator to grant access under <em>Roles &amp; Login Policy</em>.</p>
      </Card>
    </div>
  );
}
