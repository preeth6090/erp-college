import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ActionForm, SubmitButton } from '@/components/forms';
import { Badge, Card, FormGrid, Input, LinkButton, PageHeader, Select, Table, Td, inputCls } from '@/components/ui';
import { collectFee, storeFeeStructure } from '@/actions/finance';
import { inr, inr0 } from '@/lib/format';

export const metadata = { title: 'Fee & Student Accounts' };
export const dynamic = 'force-dynamic';

export default async function Fees() {
  await requireRole('super_admin', 'accountant');
  const [courses, accounts, payments] = await Promise.all([
    db.course.findMany(),
    db.studentFeeAccount.findMany({ include: { student: true }, orderBy: { created_at: 'desc' } }),
    db.feePayment.findMany({ include: { student: true }, orderBy: { created_at: 'desc' }, take: 30 }),
  ]);
  return (
    <div className="space-y-4">
      <PageHeader title="Fee Structures, Student Ledgers & Collection" />
      <Card title="Configure Course & Semester Fee Structure">
        <ActionForm action={storeFeeStructure}>
          <FormGrid cols={4}>
            <Select label="Course" name="course_id" options={courses.map((c) => ({ value: c.id, label: c.code }))} />
            <Input label="Semester" name="semester" type="number" defaultValue={1} />
            <Select label="Category" name="category" options={['All', 'General', 'OBC', 'SC', 'ST', 'EWS']} />
            <Input label="Tuition Fee" name="tuition_fee" type="number" defaultValue={50000} />
            <Input label="Exam Fee" name="exam_fee" type="number" defaultValue={2500} />
            <Input label="Library Fee" name="library_fee" type="number" defaultValue={1500} />
            <Input label="Lab Fee" name="lab_fee" type="number" defaultValue={4000} />
            <Input label="Admission Fee" name="admission_fee" type="number" defaultValue={0} />
            <Input label="Hostel Fee" name="hostel_fee" type="number" defaultValue={0} />
            <Input label="Transport Fee" name="transport_fee" type="number" defaultValue={0} />
            <Input label="Misc Fee" name="misc_fee" type="number" defaultValue={1000} />
          </FormGrid>
          <SubmitButton>Save Structure</SubmitButton>
        </ActionForm>
      </Card>
      <Card title="Student Fee Ledgers & Collection">
        <Table head={['Student', 'Total / Concession', 'Paid / Balance', 'Collect Payment']}>
          {accounts.map((a) => (
            <tr key={a.id}>
              <Td><div className="font-medium">{a.student.full_name}</div><div className="text-xs text-slate-500">{a.student.unique_student_id}</div></Td>
              <Td>{inr0(a.total_amount)}<div className="text-xs text-slate-500">Concession: {inr0(a.concession_amount)}</div></Td>
              <Td>{inr0(a.paid_amount)}<div className="text-xs text-rose-600">Bal: {inr0(a.balance_amount)}</div></Td>
              <Td>
                {a.balance_amount > 0 ? (
                  <ActionForm action={collectFee} hidden={{ id: a.id }} className="flex flex-wrap items-center gap-1" inline>
                    <input type="number" name="amount" defaultValue={a.balance_amount} max={a.balance_amount} step="0.01" className={inputCls + ' w-28 min-w-0 py-1 text-xs'} />
                    <select name="payment_mode" className={inputCls + ' w-auto py-1 text-xs'}>{['UPI', 'Card', 'NetBanking', 'Cash', 'DD'].map((m) => <option key={m}>{m}</option>)}</select>
                    <SubmitButton tone="emerald">Pay</SubmitButton>
                  </ActionForm>
                ) : <Badge tone="green">Paid ✓</Badge>}
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
      <Card title="Recent Fee Receipts">
        <div className="divide-y divide-slate-100">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-2 text-sm">
              <div><div className="font-mono text-xs">{p.receipt_no}</div><div className="text-xs text-slate-500">{p.student.full_name} • {p.payment_mode}</div></div>
              <div className="flex items-center gap-3"><span className="font-semibold">{inr(p.amount)}</span><LinkButton href={`/fees/payments/${p.id}/receipt`} target="_blank">Print Receipt</LinkButton></div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
