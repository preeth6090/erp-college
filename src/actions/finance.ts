'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { run, UserError, type ActionState } from '@/lib/action';
import { parse, str, optStr, date, oneOf, int, optInt, num, optNum } from '@/lib/validators';
import { inr } from '@/lib/format';

const FIN = ['super_admin', 'accountant'] as const;
const year = () => new Date().getFullYear();
const rand = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
const fee = () => z.preprocess((v) => (v === '' || v == null ? 0 : v), num(0));

export async function storeFeeStructure(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run([...FIN], async () => {
    const d = parse(
      z.object({ course_id: int(1), semester: int(1, 12), category: oneOf(['All', 'General', 'OBC', 'SC', 'ST', 'EWS']), admission_fee: fee(), tuition_fee: fee(), exam_fee: fee(), library_fee: fee(), lab_fee: fee(), hostel_fee: fee(), transport_fee: fee(), misc_fee: fee() }),
      fd,
    );
    const total = d.admission_fee + d.tuition_fee + d.exam_fee + d.library_fee + d.lab_fee + d.hostel_fee + d.transport_fee + d.misc_fee;
    await db.feeStructure.create({ data: { ...d, total_fee: total } });
    return `Fee structure created (Total: ${inr(total)}).`;
  });
}

export async function collectFee(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run([...FIN], async () => {
    const d = parse(z.object({ id: int(1), amount: num(1), payment_mode: oneOf(['UPI', 'Card', 'NetBanking', 'Cash', 'Cheque', 'DD']), transaction_ref: optStr(80), remarks: optStr() }), fd);
    const acc = await db.studentFeeAccount.findUniqueOrThrow({ where: { id: d.id } });
    if (d.amount > Math.max(1, acc.balance_amount)) throw new UserError(`Amount cannot exceed the outstanding balance (${inr(acc.balance_amount)}).`);
    const payment = await db.feePayment.create({
      data: {
        student_fee_account_id: acc.id, student_id: acc.student_id, receipt_no: `RCPT-${year()}-${rand(1000, 9999)}`, amount: d.amount,
        payment_mode: d.payment_mode, transaction_ref: d.transaction_ref ?? `TXN${rand(100000, 999999)}`, payment_date: new Date(), status: 'Completed', remarks: d.remarks,
      },
    });
    const paid = acc.paid_amount + d.amount;
    const balance = Math.max(0, acc.total_amount - acc.concession_amount - acc.scholarship_amount + acc.late_penalty - paid);
    await db.studentFeeAccount.update({ where: { id: acc.id }, data: { paid_amount: paid, balance_amount: balance, status: balance <= 0 ? 'Paid' : 'Partial' } });
    return `Fee collected! Receipt #${payment.receipt_no} generated.`;
  });
}

export async function storeVoucher(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run([...FIN], async (user) => {
    const d = parse(
      z.object({ voucher_type: oneOf(['Payment', 'Receipt', 'Contra', 'Journal']), voucher_date: date(), debit_account_id: int(1), credit_account_id: int(1), amount: num(1), gst_amount: fee(), tds_amount: fee(), department_id: optInt(1), narration: str(5000) }),
      fd,
    );
    if (d.debit_account_id === d.credit_account_id) throw new UserError('Debit and credit accounts must be different.');
    const voucher_no = `VCH-${year()}-${rand(100, 999)}`;
    await db.$transaction([
      db.financialVoucher.create({ data: { ...d, voucher_no, created_by: user.id } }),
      db.chartOfAccount.update({ where: { id: d.debit_account_id }, data: { balance: { increment: d.amount } } }),
      db.chartOfAccount.update({ where: { id: d.credit_account_id }, data: { balance: { increment: d.amount } } }),
    ]);
    return `Voucher ${voucher_no} posted to General Ledger.`;
  });
}

export async function storeRequisition(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run([...FIN], async (user) => {
    const d = parse(z.object({ department_id: int(1), item_description: str(255), quantity: int(1), estimated_cost: num(1) }), fd);
    await db.purchaseRequisition.create({ data: { ...d, req_no: `PR-${year()}-${rand(100, 999)}`, requested_by: user.id } });
    return 'Purchase requisition submitted.';
  });
}

export async function storePurchaseOrder(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run([...FIN], async () => {
    const d = parse(z.object({ vendor_id: int(1), purchase_requisition_id: optInt(1), order_date: date(), total_amount: num(1) }), fd);
    const po_no = `PO-${year()}-${rand(100, 999)}`;
    await db.purchaseOrder.create({ data: { ...d, po_no } });
    if (d.purchase_requisition_id) await db.purchaseRequisition.update({ where: { id: d.purchase_requisition_id }, data: { status: 'PO Created' } });
    return `Purchase Order ${po_no} issued.`;
  });
}
void optNum;
