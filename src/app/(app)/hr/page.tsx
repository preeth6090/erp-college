import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ActionForm, SubmitButton } from '@/components/forms';
import { Badge, Card, FormGrid, Input, PageHeader, Select, Table, Td } from '@/components/ui';
import { storeEmployee, updateLeave } from '@/actions/hr';
import { fmtDate, toInputDate } from '@/lib/format';

export const metadata = { title: 'Faculty & Staff HR' };
export const dynamic = 'force-dynamic';

export default async function HR() {
  await requireRole('super_admin');
  const [employees, leaves, departments, colleges] = await Promise.all([
    db.employee.findMany({ include: { department: true }, orderBy: { created_at: 'desc' } }),
    db.employeeLeave.findMany({ include: { employee: true }, orderBy: { created_at: 'desc' } }),
    db.department.findMany(), db.college.findMany(),
  ]);
  return (
    <div className="space-y-4">
      <PageHeader title="Faculty & Staff HR, Workload & Leave" />
      <Card title="Register Faculty / Staff Member">
        <ActionForm action={storeEmployee}>
          <FormGrid cols={4}>
            <Select label="College" name="college_id" options={colleges.map((c) => ({ value: c.id, label: c.code }))} />
            <Select label="Department" name="department_id" placeholder="Department" options={departments.map((d) => ({ value: d.id, label: d.code }))} />
            <Select label="Type" name="employee_type" options={['Faculty', 'Non-Teaching', 'Admin']} />
            <Input label="Designation *" name="designation" required />
            <Input label="Full Name *" name="full_name" required />
            <Input label="Email *" name="email" type="email" required />
            <Input label="Mobile *" name="phone" required />
            <Input label="Qualification" name="qualification" placeholder="e.g. Ph.D." />
            <Input label="Experience (Yrs)" name="experience_years" type="number" defaultValue={5} />
            <Input label="Joining Date" name="joining_date" type="date" defaultValue={toInputDate(new Date())} />
            <Input label="Basic Salary (₹)" name="basic_salary" type="number" defaultValue={50000} required />
          </FormGrid>
          <SubmitButton>Add Employee</SubmitButton>
        </ActionForm>
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Staff Directory & Workload" className="lg:col-span-2">
          <Table head={['Staff ID', 'Name & Qualification', 'Type / Dept', 'Workload', 'Status']}>
            {employees.map((e) => (
              <tr key={e.id}>
                <Td className="font-mono text-xs">{e.staff_id}</Td>
                <Td><div className="font-medium">{e.full_name}</div><div className="text-xs text-slate-500">{e.designation} • {e.qualification}</div></Td>
                <Td>{e.employee_type} ({e.department?.code ?? 'Admin'})</Td><Td>{e.weekly_workload_hours} hrs/wk</Td><Td><Badge>{e.status}</Badge></Td>
              </tr>
            ))}
          </Table>
        </Card>
        <Card title="Leave Requests">
          <div className="space-y-3">
            {leaves.map((l) => (
              <div key={l.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <div className="flex justify-between"><strong>{l.employee.full_name}</strong><Badge>{l.status}</Badge></div>
                <div className="text-xs text-slate-500">{l.leave_type} ({l.days}d): {fmtDate(l.from_date)} to {fmtDate(l.to_date)}</div>
                <div className="text-xs">{l.reason}</div>
                {l.status === 'Pending' && (
                  <div className="mt-2 flex gap-2">
                    <ActionForm action={updateLeave} hidden={{ id: l.id, status: 'Approved' }} inline reset={false}><SubmitButton tone="emerald">Approve</SubmitButton></ActionForm>
                    <ActionForm action={updateLeave} hidden={{ id: l.id, status: 'Rejected' }} inline reset={false}><SubmitButton tone="rose">Reject</SubmitButton></ActionForm>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
