'use server';

import { initialPasswordHash } from '@/lib/defaults';
import { z } from 'zod';
import { db } from '@/lib/db';
import { run, type ActionState } from '@/lib/action';
import { assertStaffCapacity } from '@/lib/license';
import { parse, str, optStr, date, oneOf, int, optInt, num } from '@/lib/validators';

const r2 = (n: number) => Math.round(n * 100) / 100;
const rand = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;

export async function storeEmployee(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run({ module: 'hr' }, async () => {
    const d = parse(
      z.object({
        college_id: int(1), department_id: optInt(1), full_name: str(), email: z.string().trim().email(), phone: str(20),
        employee_type: oneOf(['Faculty', 'Non-Teaching', 'Admin']), designation: str(100), qualification: optStr(255),
        experience_years: z.preprocess((v) => (v === '' ? 0 : v), int(0, 50)), joining_date: date(), basic_salary: num(5000),
      }),
      fd,
    );
    // Only teaching staff get a portal login (the original app granted super_admin to every non-faculty hire).
    let user_id: number | undefined;
    if (d.employee_type === 'Faculty') {
      await assertStaffCapacity('faculty');
      const role = await db.role.findUnique({ where: { slug: 'faculty' } });
      const user = (await db.user.findUnique({ where: { email: d.email } })) ?? (await db.user.create({
        data: { name: d.full_name, email: d.email, password: initialPasswordHash(), role_id: role?.id, college_id: d.college_id, phone: d.phone },
      }));
      user_id = user.id;
    }
    const emp = await db.employee.create({ data: { ...d, user_id, staff_id: `${d.employee_type === 'Faculty' ? 'FAC' : 'STF'}-${rand(300, 999)}` } });
    await db.salaryStructure.create({
      data: { employee_id: emp.id, basic_salary: emp.basic_salary, hra: r2(emp.basic_salary * 0.2), da: r2(emp.basic_salary * 0.15), ta: 3200, pf_enabled: true, pt_enabled: true, tds_monthly: emp.basic_salary > 60000 ? 3500 : 800 },
    });
    return `Employee ${emp.full_name} (${emp.staff_id}) registered.`;
  });
}

export async function updateLeave(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run({ module: 'hr' }, async (user) => {
    const d = parse(z.object({ id: int(1), status: oneOf(['Approved', 'Rejected']) }), fd);
    await db.employeeLeave.update({ where: { id: d.id }, data: { status: d.status, approved_by: user.id } });
    return `Leave request ${d.status}.`;
  });
}

export async function processPayroll(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run({ module: 'payroll' }, async () => {
    const d = parse(z.object({ month: int(1, 12), year: int(2000, 2100) }), fd);
    const employees = await db.employee.findMany({ where: { status: 'Active' }, include: { salaryStructures: true } });
    for (const emp of employees) {
      const ss = emp.salaryStructures[0];
      if (!ss) continue;
      const gross = ss.basic_salary + ss.hra + ss.da + ss.ta + ss.special_allowance;
      const pf = ss.pf_enabled ? r2(ss.basic_salary * 0.12) : 0;
      const esi = ss.esi_enabled ? r2(gross * 0.0075) : 0;
      const pt = ss.pt_enabled ? 200 : 0;
      const tds = ss.tds_monthly;
      const data = { working_days: 26, gross_salary: gross, pf_amount: pf, esi_amount: esi, professional_tax: pt, tds_amount: tds, net_salary: gross - (pf + esi + pt + tds), status: 'Paid', paid_at: new Date(), bank_ref: `NEFT-${d.year}${d.month}-${emp.id}` };
      await db.payroll.upsert({
        where: { employee_id_month_year: { employee_id: emp.id, month: d.month, year: d.year } },
        update: data, create: { employee_id: emp.id, month: d.month, year: d.year, ...data },
      });
    }
    return `Monthly payroll processed for ${d.month}/${d.year} (${employees.length} employees).`;
  });
}
