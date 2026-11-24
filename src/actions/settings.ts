'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { run, audit, type ActionState } from '@/lib/action';
import { parse, str, optStr, int } from '@/lib/validators';

const campusShape = { code: str(20), name: str(), city: str(100), state: str(100), address: optStr() };
const collegeShape = { campus_id: int(1), code: str(20), name: str(), university_affiliation: optStr(255), aishe_code: optStr(30), naac_grade: optStr(10), principal_name: optStr(255) };

export async function storeCampus(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run({ module: 'settings' }, async (user) => {
    const d = parse(z.object(campusShape), fd);
    await db.campus.create({ data: d });
    await audit(user, 'CAMPUS_CREATED', 'Settings', `Created campus: ${d.name} (${d.code})`);
    return 'Campus added.';
  });
}
export async function updateCampus(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run({ module: 'settings' }, async (user) => {
    const d = parse(z.object({ id: int(1), ...campusShape }), fd);
    const { id, ...data } = d;
    await db.campus.update({ where: { id }, data });
    await audit(user, 'CAMPUS_UPDATED', 'Settings', `Updated campus: ${d.name} (${d.code})`);
    return `Campus '${d.name}' updated successfully.`;
  });
}
export async function storeCollege(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run({ module: 'settings' }, async (user) => {
    const d = parse(z.object(collegeShape), fd);
    await db.college.create({ data: d });
    await audit(user, 'COLLEGE_CREATED', 'Settings', `Created college: ${d.name} (${d.code})`);
    return 'College unit added under university group.';
  });
}
export async function updateCollege(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run({ module: 'settings' }, async (user) => {
    const d = parse(z.object({ id: int(1), ...collegeShape }), fd);
    const { id, ...data } = d;
    await db.college.update({ where: { id }, data });
    await audit(user, 'COLLEGE_UPDATED', 'Settings', `Updated college: ${d.name} (${d.code})`);
    return `College '${d.name}' updated successfully.`;
  });
}
export async function updateSetting(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run({ module: 'settings' }, async (user) => {
    const d = parse(z.object({ key: str(100), group_name: str(50), value: optStr(100000) }), fd);
    await db.systemSetting.upsert({ where: { key: d.key }, update: { group_name: d.group_name, value: d.value }, create: d });
    await audit(user, 'SETTING_UPDATED', 'Settings', `Updated setting ${d.key}`);
    return 'System setting saved.';
  });
}
