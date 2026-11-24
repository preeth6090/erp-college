// The module catalogue and the default roles. Pure data (no server imports) so it is shared by the app and the seed script.

export type Level = 'view' | 'edit';

export const MODULES = [
  { key: 'dashboard', label: 'Dashboard & Analytics', group: 'Overview', href: '/dashboard' },
  { key: 'admissions', label: 'Online Admissions', group: 'Admissions & SIS', href: '/admissions' },
  { key: 'enquiries', label: 'Enquiry & CRM', group: 'Admissions & SIS', href: '/enquiries' },
  { key: 'students', label: 'Student Info (SIS)', group: 'Admissions & SIS', href: '/students' },
  { key: 'academics', label: 'Courses & NEP 2020', group: 'Academics & Exams', href: '/academics' },
  { key: 'timetable', label: 'Class & Timetable', group: 'Academics & Exams', href: '/timetable' },
  { key: 'attendance', label: 'Attendance', group: 'Academics & Exams', href: '/attendance' },
  { key: 'exams', label: 'Examinations & CGPA', group: 'Academics & Exams', href: '/exams' },
  { key: 'library', label: 'Library', group: 'Finance, HR & Assets', href: '/library' },
  { key: 'fees', label: 'Student Fees', group: 'Finance, HR & Assets', href: '/fees' },
  { key: 'finance', label: 'College Finance', group: 'Finance, HR & Assets', href: '/finance' },
  { key: 'hr', label: 'Faculty & Staff HR', group: 'Finance, HR & Assets', href: '/hr' },
  { key: 'payroll', label: 'Payroll (PF/ESI/TDS)', group: 'Finance, HR & Assets', href: '/payroll' },
  { key: 'procurement', label: 'Procurement & Stock', group: 'Finance, HR & Assets', href: '/procurement' },
  { key: 'hostel', label: 'Hostel & Mess', group: 'Campus & Learning', href: '/hostel' },
  { key: 'transport', label: 'Transport & GPS', group: 'Campus & Learning', href: '/transport' },
  { key: 'lms', label: 'LMS & E-Learning', group: 'Campus & Learning', href: '/lms' },
  { key: 'placements', label: 'Placement & Career', group: 'Career & Compliance', href: '/placements' },
  { key: 'scholarships', label: 'Scholarships', group: 'Career & Compliance', href: '/scholarships' },
  { key: 'certificates', label: 'Certificates & QR', group: 'Career & Compliance', href: '/certificates' },
  { key: 'grievances', label: 'Grievances & Discipline', group: 'Career & Compliance', href: '/grievances' },
  { key: 'events', label: 'Events & Alumni', group: 'Career & Compliance', href: '/events-alumni' },
  { key: 'accreditation', label: 'NAAC/NIRF & Research', group: 'Career & Compliance', href: '/accreditation-research' },
  { key: 'communication', label: 'Communication', group: 'Career & Compliance', href: '/communication' },
  { key: 'team', label: 'Team Members', group: 'People & Admin', href: '/team' },
  { key: 'access', label: 'Roles & Login Policy', group: 'People & Admin', href: '/access' },
  { key: 'settings', label: 'System Settings', group: 'People & Admin', href: '/settings' },
] as const;

export type ModuleKey = (typeof MODULES)[number]['key'];
export const MODULE_KEYS = MODULES.map((m) => m.key) as ModuleKey[];
export const GROUPS = [...new Set(MODULES.map((m) => m.group))];
export const permSlug = (k: string, l: Level) => `${k}:${l}`;

const edit = (...k: ModuleKey[]) => k.map((x) => [x, 'edit'] as const);
const view = (...k: ModuleKey[]) => k.map((x) => [x, 'view'] as const);

export type DefaultRole = { slug: string; name: string; description: string; system: boolean; grants: (readonly [ModuleKey, Level])[] };

export const DEFAULT_ROLES: DefaultRole[] = [
  { slug: 'owner', name: 'Software Owner', description: 'Platform owner: controls modules, limits and validity for this institution', system: true, grants: [] },
  { slug: 'super_admin', name: 'College Administrator', description: 'Runs the institution: manages team, roles and every module the owner has enabled', system: true, grants: [] },
  { slug: 'faculty', name: 'Faculty / Professor', description: 'Teaching, attendance, marks entry, LMS and leave', system: true,
    grants: [...edit('timetable', 'attendance', 'exams', 'lms', 'library')] },
  { slug: 'student', name: 'Student', description: 'Student portal, attendance, results, fees and LMS', system: true, grants: [] },
  { slug: 'parent', name: 'Parent / Guardian', description: 'Parent portal for linked children tracking', system: true, grants: [] },
  { slug: 'accountant', name: 'Finance & Accounts', description: 'Fees, vouchers, payroll and procurement', system: false,
    grants: [...edit('fees', 'finance', 'procurement', 'payroll')] },
  { slug: 'librarian', name: 'Librarian', description: 'Library catalog, issue/return and stock verification', system: false, grants: [...edit('library')] },
  { slug: 'registrar', name: 'Registrar', description: 'Student records, courses and certificates', system: false,
    grants: [...edit('students', 'academics', 'certificates'), ...view('admissions', 'enquiries', 'timetable', 'exams')] },
  { slug: 'admission_officer', name: 'Admission Officer', description: 'Enquiries, online applications and merit lists', system: false,
    grants: [...edit('admissions', 'enquiries'), ...view('students', 'communication')] },
  { slug: 'exam_controller', name: 'Exam Controller', description: 'Exam schedules, marks entry and result publication', system: false,
    grants: [...edit('exams'), ...view('attendance', 'students', 'academics', 'certificates')] },
  { slug: 'hod', name: 'Head of Department', description: 'Timetable, attendance and academic oversight for a department', system: false,
    grants: [...edit('timetable', 'attendance'), ...view('academics', 'exams', 'students', 'lms', 'hr')] },
  { slug: 'hostel_warden', name: 'Hostel Warden', description: 'Hostel allocation, visitors, complaints and outings', system: false,
    grants: [...edit('hostel'), ...view('students', 'grievances')] },
  { slug: 'transport_manager', name: 'Transport Manager', description: 'Vehicles, routes and student transport allocation', system: false,
    grants: [...edit('transport'), ...view('students')] },
  { slug: 'placement_officer', name: 'Placement Officer', description: 'Recruitment drives and student placements', system: false,
    grants: [...edit('placements'), ...view('students', 'scholarships', 'events')] },
  { slug: 'hr_manager', name: 'HR Manager', description: 'Staff records, leave approvals and payroll visibility', system: false,
    grants: [...edit('hr'), ...view('payroll', 'attendance')] },
  { slug: 'auditor', name: 'Auditor (read-only)', description: 'Read-only view of finance, fees and compliance — ideal for temporary access', system: false,
    grants: [...view('dashboard', 'fees', 'finance', 'payroll', 'procurement', 'students', 'attendance', 'exams', 'placements', 'accreditation', 'scholarships')] },
];

/** Demo accounts for each scenario (created by the seed / sync script). */
export const DEMO_USERS: { email: string; name: string; role: string }[] = [
  { email: 'accountant@college.edu.in', name: 'Meera Nair (Accounts)', role: 'accountant' },
  { email: 'librarian@college.edu.in', name: 'Suresh Pillai (Librarian)', role: 'librarian' },
  { email: 'registrar@college.edu.in', name: 'Dr. Anita Rao (Registrar)', role: 'registrar' },
  { email: 'admissions@college.edu.in', name: 'Karan Shah (Admissions)', role: 'admission_officer' },
  { email: 'exams@college.edu.in', name: 'Prof. R. Menon (Exam Controller)', role: 'exam_controller' },
  { email: 'warden@college.edu.in', name: 'Mahesh Hegde (Warden)', role: 'hostel_warden' },
  { email: 'transport@college.edu.in', name: 'Ramesh Gowda (Transport)', role: 'transport_manager' },
  { email: 'placement@college.edu.in', name: 'Divya Menon (Placements)', role: 'placement_officer' },
  { email: 'hr@college.edu.in', name: 'Lakshmi Iyer (HR)', role: 'hr_manager' },
  { email: 'auditor@college.edu.in', name: 'CA Vivek Sharma (Auditor)', role: 'auditor' },
];

/** Starting points for the owner when switching modules on for an institution. */
export const PRESETS: Record<string, { label: string; hint: string; modules: ModuleKey[] }> = {
  all: { label: 'Everything', hint: 'Every module', modules: MODULE_KEYS },
  college: { label: 'College / University', hint: 'Full higher-education suite', modules: MODULE_KEYS },
  essentials: {
    label: 'Admissions + Attendance + Transport', hint: 'Just the three, plus Team & Roles so the admin can add staff',
    modules: ['admissions', 'attendance', 'transport', 'team', 'access'],
  },
  pu_college: {
    label: 'PU / Junior college', hint: 'Admissions, academics, fees, transport, hostel',
    modules: ['dashboard', 'admissions', 'enquiries', 'students', 'academics', 'timetable', 'attendance', 'exams', 'fees', 'transport', 'hostel', 'library', 'certificates', 'communication', 'events', 'team', 'access', 'settings'],
  },
  school: {
    label: 'School', hint: 'Classes, fees, transport, parents',
    modules: ['dashboard', 'admissions', 'enquiries', 'students', 'academics', 'timetable', 'attendance', 'exams', 'fees', 'transport', 'hostel', 'library', 'certificates', 'grievances', 'communication', 'events', 'team', 'access', 'settings'],
  },
  coaching: {
    label: 'Coaching / Tutorial', hint: 'Batches, fees, attendance, tests',
    modules: ['dashboard', 'enquiries', 'students', 'timetable', 'attendance', 'exams', 'fees', 'communication', 'lms', 'team', 'access', 'settings'],
  },
};
