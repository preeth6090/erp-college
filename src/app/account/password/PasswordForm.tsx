'use client';

import { useActionState } from 'react';
import { changePassword } from '@/actions/auth';
import { SubmitButton } from '@/components/forms';
import { inputCls } from '@/components/ui';

export function PasswordForm({ rule }: { rule: string }) {
  const [state, action] = useActionState(changePassword, null);
  const f = (name: string, label: string, auto: string) => (
    <label className="block"><span className="mb-1 block text-xs font-medium text-slate-700">{label}</span>
      <input name={name} type="password" required autoComplete={auto} className={inputCls} /></label>
  );
  return (
    <form action={action} className="space-y-3">
      {state?.error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{state.error}</div>}
      {f('current', 'Current password', 'current-password')}
      {f('next', 'New password', 'new-password')}
      {f('confirm', 'Confirm new password', 'new-password')}
      <p className="text-[11px] text-slate-500">{rule}</p>
      <SubmitButton className="w-full py-2.5 text-sm">Update password</SubmitButton>
    </form>
  );
}
