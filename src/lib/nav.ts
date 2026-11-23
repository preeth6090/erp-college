import type { Role } from './auth';

export type NavItem = { href: string; label: string; roles: Role[] };
export type NavGroup = { title: string; items: NavItem[] };

const A: Role = 'super_admin';
export const NAV: NavGroup[] = [
  { title: 'Overview', items: [{ href: '/dashboard', label: 'Dashboard & Analytics', roles: [A] }] },
  {
    title: 'Admissions & SIS',
    items: [
      { href: '/admissions', label: 'Online Admissions', roles: [A] },
      { href: '/enquiries', label: 'Enquiry & CRM', roles: [A] },
      { href: '/students', label: 'Student Info (SIS)', roles: [A] },
    ],
  },
  {
    title: 'Academics & Exams',
    items: [
      { href: '/academics', label: 'Courses & NEP 2020', roles: [A] },
      { href: '/timetable', label: 'Class & Timetable', roles: [A, 'faculty'] },
      { href: '/attendance', label: 'Attendance', roles: [A, 'faculty'] },
      { href: '/exams', label: 'Examinations & CGPA', roles: [A, 'faculty'] },
    ],
  },
  {
    title: 'Finance, HR & Assets',
    items: [
      { href: '/library', label: 'Library', roles: [A, 'librarian', 'faculty'] },
      { href: '/fees', label: 'Student Fees', roles: [A, 'accountant'] },
      { href: '/finance', label: 'College Finance', roles: [A, 'accountant'] },
      { href: '/hr', label: 'Faculty & Staff HR', roles: [A] },
      { href: '/payroll', label: 'Payroll (PF/ESI/TDS)', roles: [A, 'accountant'] },
      { href: '/procurement', label: 'Procurement & Stock', roles: [A, 'accountant'] },
    ],
  },
  {
    title: 'Campus & Portals',
    items: [
      { href: '/hostel', label: 'Hostel & Mess', roles: [A] },
      { href: '/transport', label: 'Transport & GPS', roles: [A] },
      { href: '/portal/student', label: 'Student Portal', roles: [A, 'student'] },
      { href: '/portal/faculty', label: 'Faculty Portal', roles: [A, 'faculty'] },
      { href: '/portal/parent', label: 'Parent Portal', roles: [A, 'parent'] },
      { href: '/lms', label: 'LMS & E-Learning', roles: [A, 'faculty'] },
    ],
  },
  {
    title: 'Career, Compliance & Admin',
    items: [
      { href: '/placements', label: 'Placement & Career', roles: [A] },
      { href: '/scholarships', label: 'Scholarships', roles: [A] },
      { href: '/certificates', label: 'Certificates & QR', roles: [A] },
      { href: '/grievances', label: 'Grievances & Discipline', roles: [A] },
      { href: '/events-alumni', label: 'Events & Alumni', roles: [A] },
      { href: '/accreditation-research', label: 'NAAC/NIRF & Research', roles: [A] },
      { href: '/communication', label: 'Communication', roles: [A] },
      { href: '/settings', label: 'System & RBAC', roles: [A] },
    ],
  },
];
