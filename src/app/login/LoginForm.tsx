'use client';

import { useActionState } from 'react';
import { login } from '@/actions/auth';
import { SubmitButton } from '@/components/forms';
import { inputCls } from '@/components/ui';

export function LoginForm() {
  const [state, action] = useActionState(login, null);
  return (
    <form action={action} className="space-y-4">
      {state?.error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{state.error}</div>}
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-700">Email Address</span>
        <input name="email" type="email" required autoFocus autoComplete="email" defaultValue={state?.email} placeholder="you@college.edu.in" className={inputCls} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-700">Password</span>
        <input name="password" type="password" required autoComplete="current-password" placeholder="••••••••" className={inputCls} />
      </label>
      <label className="flex items-center gap-2 text-xs text-slate-600">
        <input type="checkbox" name="remember" value="1" className="rounded border-slate-300" /> Keep me signed in
      </label>
      <SubmitButton className="w-full py-2.5 text-sm">Sign In</SubmitButton>
    </form>
  );
}
