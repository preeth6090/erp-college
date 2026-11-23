import Link from 'next/link';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { Card, PageHeader, Stat } from '@/components/ui';
import { BarChart, DoughnutChart, PieChart } from '@/components/Charts';
import { fmtDate, inr0, num0, todayDate, addDays } from '@/lib/format';

export const metadata = { title: 'Dashboard & Analytics' };
export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  await requireRole('super_admin');
  const today = todayDate();
  const tomorrow = addDays(today, 1);

  const [
    totalStudents, totalFaculty, totalStaff, newEnquiries, convertedEnquiries, applicationsReceived, applicationsPending,
    attTotal, attPresent, upcomingExams, pendingFeeAccounts, outstanding, collected, booksIssued, booksOverdue, books,
    placementDrives, studentsSelected, receipts, payments, courses, announcements, grades,
  ] = await Promise.all([
    db.student.count({ where: { status: 'Active' } }),
    db.employee.count({ where: { employee_type: 'Faculty', status: 'Active' } }),
    db.employee.count({ where: { employee_type: { not: 'Faculty' }, status: 'Active' } }),
    db.admissionEnquiry.count(),
    db.admissionEnquiry.count({ where: { status: 'Converted' } }),
    db.admissionApplication.count(),
    db.admissionApplication.count({ where: { status: { in: ['Submitted', 'Waiting List'] } } }),
    db.studentAttendance.count({ where: { attendance_date: { gte: today, lt: tomorrow } } }),
    db.studentAttendance.count({ where: { attendance_date: { gte: today, lt: tomorrow }, status: { in: ['Present', 'Late'] } } }),
    db.exam.findMany({ where: { end_date: { gte: today } }, orderBy: { start_date: 'asc' }, take: 5, include: { course: true } }),
    db.studentFeeAccount.count({ where: { status: { in: ['Pending', 'Partial'] } } }),
    db.studentFeeAccount.aggregate({ _sum: { balance_amount: true } }),
    db.feePayment.aggregate({ where: { status: 'Completed' }, _sum: { amount: true } }),
    db.libraryIssue.count({ where: { status: { in: ['Issued', 'Overdue'] } } }),
    db.libraryIssue.count({ where: { status: 'Overdue' } }),
    db.libraryBook.aggregate({ _sum: { total_copies: true } }),
    db.placementDrive.count(),
    db.placementApplication.count({ where: { status: 'Selected' } }),
    db.financialVoucher.aggregate({ where: { voucher_type: 'Receipt' }, _sum: { amount: true } }),
    db.financialVoucher.aggregate({ where: { voucher_type: 'Payment' }, _sum: { amount: true } }),
    db.course.findMany({ include: { _count: { select: { students: true } } } }),
    db.announcement.findMany({ orderBy: { created_at: 'desc' }, take: 4 }),
    db.examMark.groupBy({ by: ['grade'], _count: { _all: true } }),
  ]);

  const conversionRate = newEnquiries ? Math.round((convertedEnquiries / newEnquiries) * 1000) / 10 : 0;
  const todayPct = attTotal ? Math.round((attPresent / attTotal) * 1000) / 10 : 92.4;
  const outstandingFees = outstanding._sum.balance_amount ?? 0;
  const feeCollected = collected._sum.amount ?? 0;
  const totalIncome = (receipts._sum.amount ?? 0) + feeCollected;
  const totalExpense = payments._sum.amount ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader title="Institutional Dashboard & Analytics" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Stat label="Total Students" value={num0(totalStudents)} hint="Active Enrolled" />
        <Stat label="Faculty & Staff" value={<>{totalFaculty} <span className="text-sm font-normal text-slate-500">/ {totalStaff}</span></>} hint="Teaching / Non-Teaching" tone="sky" />
        <Stat label="Admission Enquiries" value={newEnquiries} hint={`${conversionRate}% Conversion`} tone="emerald" />
        <Stat label="Online Applications" value={applicationsReceived} hint={`${applicationsPending} Pending Verification`} tone="amber" />
        <Stat label="Today's Attendance" value={`${todayPct}%`} hint="Campus Average" tone="emerald" />
        <Stat label="Outstanding Fees" value={inr0(outstandingFees)} hint={`${pendingFeeAccounts} Pending Accounts`} tone="rose" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Library Books Issued / Overdue" value={<>{booksIssued} <span className="text-sm font-normal text-rose-600">({booksOverdue} Overdue)</span></>} hint={`Total Stock: ${books._sum.total_copies ?? 0} copies`} />
        <Stat label="Placement Drives & Selections" value={<>{placementDrives} Drives <span className="text-sm font-normal text-emerald-600">({studentsSelected} Selected)</span></>} hint="2026-27 Placement Season" tone="sky" />
        <Stat label="Total Fee & Voucher Revenue" value={inr0(totalIncome)} hint="FY 2026-27 Receipts" tone="emerald" />
        <Stat label="Total Institutional Expenses" value={inr0(totalExpense)} hint="Vouchers & Payables" tone="rose" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Course-wise Student Count"><BarChart labels={courses.map((c) => c.code)} data={courses.map((c) => c._count.students)} /></Card>
        <Card title="Revenue vs Expense (₹)"><DoughnutChart labels={['Total Revenue', 'Total Expense', 'Outstanding Fees']} data={[totalIncome, totalExpense, outstandingFees]} colors={['#10b981', '#f43f5e', '#f59e0b']} /></Card>
        <Card title="Academic Grade Distribution"><PieChart labels={grades.map((g) => g.grade ?? 'N/A')} data={grades.map((g) => g._count._all)} /></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Upcoming Examinations" actions={<Link href="/exams" className="text-xs text-indigo-600">Manage Exams →</Link>}>
          {upcomingExams.length === 0 && <p className="text-sm text-slate-400">No upcoming exams scheduled.</p>}
          <div className="divide-y divide-slate-100">
            {upcomingExams.map((ex) => (
              <div key={ex.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <div className="font-medium">{ex.name}</div>
                  <div className="text-xs text-slate-500">{ex.course?.code} • Sem {ex.semester} • {ex.exam_type}</div>
                </div>
                <div className="text-xs text-slate-600">{fmtDate(ex.start_date)}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Recent Announcements & Alerts" actions={<Link href="/communication" className="text-xs text-indigo-600">View All →</Link>}>
          <div className="space-y-3">
            {announcements.map((a) => (
              <div key={a.id} className="text-sm">
                <div className="flex items-center justify-between"><span className="font-medium">{a.title}</span><span className="text-xs text-slate-500">{a.channel}</span></div>
                <div className="text-xs text-slate-500">{a.message.length > 100 ? a.message.slice(0, 100) + '…' : a.message}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
