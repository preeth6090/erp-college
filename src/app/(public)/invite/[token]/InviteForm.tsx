'use client';

import { ActionForm, SubmitButton } from '@/components/forms';
import { Input } from '@/components/ui';
import { acceptInvite } from '@/actions/team';

export function InviteForm({ token, name, email, lockEmail, rule }: { token: string; name: string; email: string; lockEmail: boolean; rule: string }) {
  return (
    <ActionForm action={acceptInvite} hidden={{ token }} reset={false}>
      <Input label="Full name *" name="name" defaultValue={name} required autoComplete="name" />
      <Input label="Email *" name="email" type="email" defaultValue={email} readOnly={lockEmail} required autoComplete="email" />
      <Input label="Mobile" name="phone" autoComplete="tel" />
      <Input label="Create password *" name="password" type="password" required autoComplete="new-password" />
      <Input label="Confirm password *" name="confirm" type="password" required autoComplete="new-password" />
      <p className="text-[11px] text-slate-500">{rule}</p>
      <SubmitButton className="w-full py-2.5 text-sm">Create my login</SubmitButton>
    </ActionForm>
  );
}
