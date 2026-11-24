import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import QRCode from 'qrcode';
import { db } from '@/lib/db';
import { requireAccess } from '@/lib/auth';
import { PrintButton } from '@/components/forms';
import { Signature } from '@/components/ui';
import { fmtDate } from '@/lib/format';

export const metadata = { title: 'Certificate' };

export default async function PrintCertificate({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAccess({ module: 'certificates', roles: ['student', 'parent'] });
  const c = await db.certificate.findUnique({ where: { id: Number(id) }, include: { student: { include: { college: true, course: true, department: true, studentGuardians: true } } } });
  if (!c) notFound();
  if (user.role?.slug === 'student' && c.student.user_id !== user.id) notFound();
  if (user.role?.slug === 'parent' && !c.student.studentGuardians.some((g) => g.parent_user_id === user.id)) notFound();
  const h = await headers();
  const origin = `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}`;
  const verifyUrl = `${origin}/verify-certificate/${c.verification_token}`;
  const qr = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 160 });
  const s = c.student;
  return (
    <div className="print-full rounded-xl border-4 border-double border-slate-700 bg-white p-5 sm:p-10">
      <div className="mb-6 flex items-start justify-between">
        <div className="text-center flex-1">
          <h2 className="text-2xl font-bold">{s.college.name}</h2>
          <p className="text-xs text-slate-500">{s.college.university_affiliation} • NAAC {s.college.naac_grade ?? 'A+'}</p>
          <div className="mt-4 inline-block border-y-2 border-slate-700 px-6 py-1 text-lg font-bold tracking-widest">{c.certificate_type.toUpperCase()} CERTIFICATE</div>
        </div>
        <PrintButton label="Print Certificate" />
      </div>
      <div className="mb-4 text-sm">Certificate No: <strong>{c.certificate_no}</strong> • Date: <strong>{fmtDate(c.issue_date)}</strong></div>
      <p className="text-sm leading-7">
        This is to certify that <strong>{s.full_name}</strong>, bearing Unique Student ID <strong>{s.unique_student_id}</strong> and University Registration Number{' '}
        <strong>{s.registration_number}</strong>, is a bonafide student of this institution pursuing <strong>{s.course.name}</strong> (Semester {s.current_semester}) in the Department of{' '}
        <strong>{s.department.name}</strong>.
        {c.remarks && <><br /><br /><em>Remarks / Purpose: {c.remarks}</em></>}
      </p>
      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div className="text-xs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="Verification QR code" width={110} height={110} />
          <div className="mt-1 text-slate-500">Scan to verify authenticity</div>
          <code className="text-[10px] text-slate-400">{c.verification_token}</code>
        </div>
        <div className="text-center text-xs"><div className="mb-1 w-44 border-t border-slate-500" />Principal / Registrar</div>
      </div>
      <Signature label="Authorised Signatory" />
    </div>
  );
}
