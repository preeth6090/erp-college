'use server';

import { updateTag } from 'next/cache';
import { z } from 'zod';
import { run, audit } from '@/lib/action';
import { parse, optDate, optInt, optStr, oneOf } from '@/lib/validators';
import { MODULE_KEYS, PRESETS } from '@/lib/modules';
import { saveLicense } from '@/lib/license';
import type { ActionState } from '@/lib/action';

export async function saveSubscription(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run('owner', async (actor) => {
    const d = parse(
      z.object({ status: oneOf(['Active', 'Suspended'] as const), valid_until: optDate(), max_students: optInt(1, 1000000), max_users: optInt(1, 100000), type: oneOf(Object.keys(PRESETS) as [string, ...string[]]), institution_name: optStr(255), apply_url: z.preprocess((v) => (v === '' || v == null ? undefined : v), z.string().trim().max(500).url('must be a full link starting with https://').refine((u) => /^https?:\/\//i.test(u), 'must start with http:// or https://').optional()) }),
      fd,
    );
    await saveLicense({
      status: d.status, valid_until: d.valid_until ? d.valid_until.toISOString().slice(0, 10) : null,
      max_students: d.max_students ?? null, max_users: d.max_users ?? null, type: d.type, ...(d.institution_name ? { institution_name: d.institution_name } : {}), apply_url: d.apply_url ?? '',
    });
    updateTag('license');
    await audit(actor, 'LICENSE_UPDATED', 'Owner', `Subscription: ${d.status}, until ${d.valid_until?.toISOString().slice(0, 10) ?? 'no end'}, students ${d.max_students ?? '∞'}, staff logins ${d.max_users ?? '∞'}`);
    return 'Subscription saved.';
  });
}

export async function saveModules(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run('owner', async (actor) => {
    const chosen = fd.getAll('module').map(String).filter((k) => MODULE_KEYS.includes(k as never));
    await saveLicense({ modules: chosen.length === MODULE_KEYS.length ? null : chosen });
    updateTag('license');
    await audit(actor, 'LICENSE_MODULES_UPDATED', 'Owner', `Modules enabled: ${chosen.length} of ${MODULE_KEYS.length}`);
    return `${chosen.length} module${chosen.length === 1 ? '' : 's'} enabled. The institution sees the change within a minute.`;
  });
}
