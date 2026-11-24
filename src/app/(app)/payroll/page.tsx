import { db } from '@/lib/db';
import { requireModule } from '@/lib/auth';
import { ActionForm, SubmitButton } from '@/components/forms';
import { Card, LinkButton, PageHeader, Table, Td, inputCls } from '@/components/ui';
import { processPayroll } from '@/actions/hr';
import { inr, inr0, monthName } from '@/lib/format';

export const metadata = { title: 'Payroll Management' };
export const dynamic = 'force-dynamic';

export default async function Payroll({ searchParams }: { searchParams: Promise<{ month?: string; year?: string }> }) {
  await requireModule('payroll');
  const sp = await searchParams;
  const now = new Date();
  const month = Number(sp.month) || now.getMonth() + 1;
  const year = Number(sp.year) || now.getFullYear();
  const inMonth = await db.payroll.findMany({ where: { month, year }, include: { employee: true } });
  const rows = inMonth.length ? inMonth : await db.payroll.findMany({ include: { employee: true }, orderBy: { created_at: 'desc' }, take: 20 });
  return (
    <div className="space-y-4">
      <PageHeader title="Payroll Management (PF / ESI / PT / TDS)" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form method="GET" className="flex flex-wrap gap-2">
          <select name="month" defaultValue={month} className={inputCls + ' w-auto'}>
            {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{monthName(i + 1)}</option>)}
          </select>
          <input name="year" type="number" defaultValue={year} className={inputCls + ' w-28'} />
          <button className="rounded-lg bg-slate-800 px-4 text-xs font-semibold text-white">View Month</button>
        </form>
        <ActionForm action={processPayroll} hidden={{ month, year }} reset={false}>
          <SubmitButton tone="emerald">Process Monthly Payroll ({month}/{year})</SubmitButton>
        </ActionForm>
      </div>
      <Card>
        <Table head={['Employee', 'Month / Year', 'Gross Salary', 'PF / ESI / PT / TDS', 'Net Salary', 'Bank Ref', 'Payslip']}>
          {rows.map((p) => (
            <tr key={p.id}>
              <Td>{p.employee.full_name}<div className="text-xs text-slate-500">{p.employee.staff_id}</div></Td>
              <Td>{p.month}/{p.year}</Td><Td>{inr(p.gross_salary)}</Td>
              <Td className="text-xs">PF: {inr0(p.pf_amount)} | PT: {inr0(p.professional_tax)} | TDS: {inr0(p.tds_amount)}</Td>
              <Td className="font-semibold">{inr(p.net_salary)}</Td><Td className="text-xs">{p.bank_ref}</Td>
              <Td><LinkButton href={`/payroll/${p.id}/payslip`} target="_blank">Print Payslip</LinkButton></Td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
