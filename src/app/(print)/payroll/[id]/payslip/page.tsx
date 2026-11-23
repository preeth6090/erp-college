import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { PrintButton } from '@/components/forms';
import { Signature } from '@/components/ui';
import { inr, monthName } from '@/lib/format';

export const metadata = { title: 'Payslip' };

export default async function Payslip({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole('super_admin', 'accountant', 'faculty');
  const p = await db.payroll.findUnique({ where: { id: Number(id) }, include: { employee: { include: { department: true, college: true } } } });
  if (!p) notFound();
  if (user.role?.slug === 'faculty' && p.employee.user_id !== user.id) notFound();
  const e = p.employee;
  const Row = ({ l, v, b }: { l: string; v: number; b?: boolean }) => (
    <div className="flex justify-between border-b border-slate-100 py-1.5 text-sm"><span>{l}</span><span className={b ? 'font-bold' : ''}>{inr(v)}</span></div>
  );
  return (
    <div className="print-full rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-5 flex items-start justify-between border-b pb-4">
        <div><h2 className="text-lg font-bold">{e.college.name}</h2><p className="text-xs text-slate-500">Salary Payslip for {monthName(p.month)} {p.year}</p></div>
        <PrintButton label="Print Payslip" />
      </div>
      <div className="mb-5 grid gap-1.5 text-sm sm:grid-cols-2">
        <div><strong>Employee Name:</strong> {e.full_name}</div><div><strong>Staff ID:</strong> {e.staff_id}</div>
        <div><strong>Designation:</strong> {e.designation}</div><div><strong>Department:</strong> {e.department?.name ?? 'Admin'}</div>
        <div><strong>UAN / PAN:</strong> {e.uan_number ?? 'N/A'} / {e.pan_number ?? 'N/A'}</div><div><strong>Bank Ref:</strong> {p.bank_ref}</div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div><div className="mb-1 text-xs font-semibold uppercase text-slate-500">Earnings</div><Row l="Gross Salary (Basic + HRA + DA + TA)" v={p.gross_salary} b /><Row l="Arrears" v={p.arrears} /></div>
        <div><div className="mb-1 text-xs font-semibold uppercase text-slate-500">Statutory Deductions</div>
          <Row l="Provident Fund (PF)" v={p.pf_amount} /><Row l="ESI" v={p.esi_amount} /><Row l="Professional Tax (PT)" v={p.professional_tax} /><Row l="TDS" v={p.tds_amount} /></div>
      </div>
      <div className="mt-5 flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3"><span className="font-medium">Net Salary Credited</span><span className="text-xl font-bold text-emerald-700">{inr(p.net_salary)}</span></div>
      <Signature label="Accounts Officer" />
    </div>
  );
}
