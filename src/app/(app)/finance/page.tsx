import { db } from '@/lib/db';
import { requireModule } from '@/lib/auth';
import { ActionForm, SubmitButton } from '@/components/forms';
import { Card, FormGrid, Input, PageHeader, Select, Stat, Table, Td } from '@/components/ui';
import { storeVoucher } from '@/actions/finance';
import { fmtDate, inr, inr0, toInputDate } from '@/lib/format';

export const metadata = { title: 'College Finance & Accounting' };
export const dynamic = 'force-dynamic';

export default async function Finance() {
  await requireModule('finance');
  const [accounts, vouchers, budgets, assets, departments] = await Promise.all([
    db.chartOfAccount.findMany({ orderBy: { code: 'asc' } }),
    db.financialVoucher.findMany({ include: { debitAccount: true, creditAccount: true }, orderBy: { created_at: 'desc' } }),
    db.departmentBudget.findMany({ include: { department: true } }),
    db.fixedAsset.findMany(),
    db.department.findMany(),
  ]);
  const sum = (t: string) => accounts.filter((a) => a.account_type === t).reduce((s, a) => s + a.balance, 0);
  const accOpts = (p: string) => accounts.map((a) => ({ value: a.id, label: `${p}: ${a.code} - ${a.name}` }));
  return (
    <div className="space-y-4">
      <PageHeader title="College Finance, General Ledger & Budgets" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total Income (Ledger)" value={inr(sum('Income'))} tone="emerald" />
        <Stat label="Total Expenses (Ledger)" value={inr(sum('Expense'))} tone="rose" />
        <Stat label="Total Assets & Cash/Bank" value={inr(sum('Asset'))} tone="sky" />
      </div>
      <Card title="Post Financial Voucher (Payment / Receipt / Contra / Journal)">
        <ActionForm action={storeVoucher}>
          <FormGrid cols={4}>
            <Select label="Type" name="voucher_type" options={['Payment', 'Receipt', 'Contra', 'Journal']} />
            <Input label="Date" name="voucher_date" type="date" defaultValue={toInputDate(new Date())} />
            <Select label="Debit" name="debit_account_id" options={accOpts('Dr')} />
            <Select label="Credit" name="credit_account_id" options={accOpts('Cr')} />
            <Input label="Amount (₹) *" name="amount" type="number" step="0.01" required />
            <Input label="GST (₹)" name="gst_amount" type="number" step="0.01" defaultValue={0} />
            <Input label="TDS (₹)" name="tds_amount" type="number" step="0.01" defaultValue={0} />
            <Select label="Department" name="department_id" placeholder="Department" options={departments.map((d) => ({ value: d.id, label: d.code }))} />
            <Input label="Narration / Particulars *" name="narration" required className="sm:col-span-2" />
          </FormGrid>
          <SubmitButton>Post Voucher</SubmitButton>
        </ActionForm>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Chart of Accounts & Trial Balance">
          <Table head={['Code', 'Account', 'Type', 'Balance (₹)']}>
            {accounts.map((a) => <tr key={a.id}><Td>{a.code}</Td><Td>{a.name}</Td><Td>{a.account_type}</Td><Td>{inr(a.balance)}</Td></tr>)}
          </Table>
        </Card>
        <div className="space-y-4">
          <Card title="Department Budgets">
            {budgets.map((b) => (
              <div key={b.id} className="border-b border-slate-100 py-2 text-sm last:border-0">
                <div className="font-medium">{b.department.name} ({b.financial_year})</div>
                <div className="text-xs text-slate-500">Allocated: {inr0(b.allocated_amount)} • Utilized: {inr0(b.utilized_amount)}</div>
              </div>
            ))}
          </Card>
          <Card title="Fixed Assets & Depreciation">
            {assets.map((a) => (
              <div key={a.id} className="flex justify-between border-b border-slate-100 py-2 text-sm last:border-0">
                <span>{a.asset_code} - {a.name}</span><span className="text-xs text-slate-500">Value: {inr0(a.current_value)} ({a.depreciation_rate}% dep)</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
      <Card title="Recent Vouchers (Cashbook / Bankbook / Journal)">
        <Table head={['Voucher No', 'Type & Date', 'Debit / Credit', 'Amount / GST / TDS', 'Narration']}>
          {vouchers.map((v) => (
            <tr key={v.id}>
              <Td className="font-mono text-xs">{v.voucher_no}</Td><Td>{v.voucher_type} ({fmtDate(v.voucher_date)})</Td>
              <Td>Dr: {v.debitAccount.name}<div className="text-xs text-slate-500">Cr: {v.creditAccount.name}</div></Td>
              <Td>{inr(v.amount)}<div className="text-xs text-slate-500">GST: ₹{v.gst_amount} | TDS: ₹{v.tds_amount}</div></Td><Td>{v.narration}</Td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
