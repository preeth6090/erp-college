import { db } from '@/lib/db';
import { describePolicy, getPolicy } from '@/lib/policy';
import { InviteForm } from './InviteForm';

export const metadata = { title: 'Join the team' };
export const dynamic = 'force-dynamic';

function Notice({ title, text }: { title: string; text: string }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-2xl text-rose-600">!</div>
      <h1 className="text-lg font-bold text-slate-900">{title}</h1><p className="mt-1 text-sm text-slate-500">{text}</p>
    </div>
  );
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const inv = await db.invite.findUnique({ where: { token }, include: { role: true } });
  if (!inv) return <Notice title="Invite not found" text="This link isn't valid. Please ask for a new invitation." />;
  if (inv.status === 'Accepted') return <Notice title="Already used" text="This invitation has already been accepted. Try signing in instead." />;
  if (inv.status === 'Revoked') return <Notice title="Invite cancelled" text="This invitation was withdrawn. Please contact the administrator." />;
  if (inv.expires_at < new Date()) return <Notice title="Invite expired" text="This invitation is no longer valid. Please ask for a new one." />;
  const policy = await getPolicy();
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-indigo-600">You&apos;re invited</div>
      <h1 className="text-xl font-bold text-slate-900">Join College ERP as {inv.role.name}</h1>
      <p className="mb-5 mt-1 text-sm text-slate-500">Create your sign-in below. {inv.role.description}</p>
      <InviteForm token={token} name={inv.name ?? ''} email={inv.email ?? ''} lockEmail={!!inv.email} rule={describePolicy(policy)} />
    </div>
  );
}
