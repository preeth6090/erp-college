import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getLicense } from '@/lib/license';
import { ActionForm, SubmitButton } from '@/components/forms';
import { Checkbox, Field, FormGrid, Input, Select, Textarea, inputCls } from '@/components/ui';
import { submitPublicApplication } from '@/actions/admissions';

export const metadata = { title: 'Online Admission Portal' };
export const dynamic = 'force-dynamic';

export default async function ApplyPage() {
  const license = await getLicense();
  if (license.apply_url) redirect(license.apply_url); // the institution uses its own admission form
  const [courses, sessions] = await Promise.all([
    db.course.findMany({ where: { is_active: true } }),
    db.academicSession.findMany({ where: { is_active: true } }),
  ]);
  return (
    <div className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-bold text-slate-900">Online Admission Application Form (2026-27)</h1>
      <p className="mb-5 mt-1 text-xs text-slate-500">NEP 2020 &amp; CBCS Programmes • Application Fee: ₹500 (UPI / Card / NetBanking)</p>
      <ActionForm action={submitPublicApplication} reset={false} className="space-y-5">
        <FormGrid cols={2}>
          <Select label="Programme / Course *" name="course_id" required options={courses.map((c) => ({ value: c.id, label: `${c.name} (${c.level} - Cut-off ${c.cutoff_percentage}%)` }))} />
          <Select label="Academic Session" name="academic_session_id" options={sessions.map((s) => ({ value: s.id, label: s.name }))} />
          <Input label="Applicant Full Name *" name="full_name" required />
          <Input label="Email Address *" name="email" type="email" required />
          <Input label="Mobile Number *" name="phone" required />
          <Input label="Date of Birth" name="dob" type="date" />
          <Select label="Gender *" name="gender" options={['Male', 'Female', 'Other']} />
          <Select label="Category & Reservation *" name="category" options={['General', 'OBC', 'SC', 'ST', 'EWS']} />
          <Input label="Father's Name" name="father_name" />
          <Input label="Mother's Name" name="mother_name" />
        </FormGrid>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-800">Aadhaar Details (Optional, with Consent)</h3>
          <FormGrid cols={2}>
            <Input label="Aadhaar Number" name="aadhaar_number" maxLength={12} placeholder="12-digit Aadhaar Number (Optional)" />
            <div className="flex items-end pb-2"><Checkbox label="I voluntarily consent to share Aadhaar for student verification." name="aadhaar_consent" /></div>
          </FormGrid>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-800">Academic Qualifications &amp; Entrance Exam</h3>
          <FormGrid>
            <Input label="Class 10 Board" name="class_10_board" placeholder="e.g. CBSE" />
            <Input label="Class 10 %" name="class_10_percentage" type="number" step="0.01" />
            <Input label="Class 12 Board" name="class_12_board" />
            <Input label="Class 12 % *" name="class_12_percentage" type="number" step="0.01" required />
            <Input label="Entrance Exam" name="entrance_exam_name" placeholder="JEE / KCET / CUET" />
            <Input label="Entrance Score / Percentile" name="entrance_score" type="number" step="0.01" />
          </FormGrid>
        </div>
        <FormGrid cols={2}>
          <Field label="Passport Photograph"><input type="file" name="photo" accept="image/*" className={inputCls} /></Field>
          <Field label="Applicant Signature"><input type="file" name="signature" accept="image/*" className={inputCls} /></Field>
        </FormGrid>
        <Textarea label="Permanent Address" name="address" />
        <SubmitButton className="px-6 py-2.5 text-sm">Submit Application &amp; Pay ₹500</SubmitButton>
      </ActionForm>
    </div>
  );
}
