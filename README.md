# WebotApp Indian College ERP — Complete Higher-Education Management System

A comprehensive Indian College & Higher-Education Management System built with **Next.js (React)**, **TypeScript**, **Tailwind CSS** and **Prisma** on **SQLite**. Compliant with **NEP 2020**, **CBCS**, **AISHE**, and **NAAC / NIRF** requirements.

*Created by Timestamp India.*

## Quick start

```bash
npm install
cp .env.example .env      # set SESSION_SECRET to a long random string
npm run setup             # generates the client, creates the SQLite DB and loads demo data
npm run dev               # http://localhost:3000
```

Demo logins (password for all: `password`):

| Role | Email |
| --- | --- |
| Super Admin | admin@webotapp.edu.in |
| Faculty | faculty@webotapp.edu.in |
| Student | student@webotapp.edu.in |
| Parent | parent@webotapp.edu.in |

Public pages (no login): `/apply` (online admission form), `/track-application`, `/verify-certificate/<token>`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js development, production build, production server |
| `npm run db:push` | Sync `prisma/schema.prisma` to the database |
| `npm run db:seed` | Load demo data (run on an empty database) |
| `npm run typecheck` | TypeScript check |

## Database

SQLite (`prisma/dev.db`) is used by default — free, zero-setup and fine for a single-server, small/mid-scale deployment (back up the file regularly). To move to PostgreSQL (e.g. Neon) later, change `provider` in `prisma/schema.prisma` to `postgresql`, point `DATABASE_URL` at the new database and run `npm run db:push`.

## Project layout

- `src/app/(app)` — authenticated ERP modules (sidebar layout)
- `src/app/(print)` — printable documents: ID card, marksheet, admit card, receipts, payslip, certificate
- `src/app/(public)` — public admission portal, application tracking, certificate verification
- `src/actions` — server actions (validation with zod, role checks, audit logging)
- `src/lib` — database client, session auth, role helpers, formatting
- `prisma` — schema and seed data

## 🚀 Key Modules (All 30 Included)

1. **Dashboard & Analytics**: Total students, faculty & staff metrics, admission conversion, fee collections, library overdues, placement charts, and Chart.js financial trends.
2. **Online Admission Management**: Public admission portal, Aadhaar consent, Class 10/12 & entrance marks, cut-off based automated Merit List and Waiting List generation, registration number generation, payment tracking, and receipts.
3. **Enquiry & Admission CRM**: Lead source tracking, counsellor assignments, scheduled follow-ups, lost enquiry analytics, and bulk communication.
4. **Student Information System (SIS)**: 360° student records, category & reservation details, guardians, document uploads, migration/transfer history, and digital Student ID Cards.
5. **Course & Academic Management (NEP 2020 / CBCS)**: UG, PG, Diploma, and Certificate courses, credit systems, syllabus summaries, and academic calendars.
6. **Class & Timetable Management**: Section allocations, classroom scheduling, substitute teachers, and real-time faculty/room timetable conflict detection.
7. **Attendance Management**: Manual, QR, Biometric, and RFID attendance recording, faculty attendance, and automated <75% attendance shortage alerts.
8. **Examination Management**: Internal, Mid-Sem & End-Sem exams, schedules, invigilator allocation, mark entry, automated Grade & SGPA/CGPA computation, admit cards, and transcripts.
9. **Library Management**: Book catalogue, accession numbering, barcodes, issue/return/renew, and ₹5/day overdue fine calculation.
10. **Fee & Student Accounts**: Course & category-wise fee structures, concessions, UPI/Cards/NetBanking/Cash payments, ledger tracking, and receipts.
11. **College Finance & Accounting**: Chart of Accounts, General Ledger, Cashbook/Bankbook, Vouchers with GST/TDS, department budgets, and fixed assets.
12. **Faculty & Staff HR**: Employee profiles, designations, qualification records, weekly workload tracking, and leave management.
13. **Payroll Management**: Indian salary structures (Basic, HRA, DA, TA, PF, ESI, Professional Tax, TDS), automated monthly payroll processing, and salary payslips.
14. **Hostel Management**: Boys' & Girls' hostels, floor/room/bed allocation, mess charges, visitor registers, complaints, and outing approvals.
15. **Transport Management**: Vehicle registration, bus routes, stops, fuel records, GPS device IDs, and student route allocation.
16. **Procurement & Inventory**: Purchase requisitions, Purchase Orders (PO), vendor records, lab equipment, and stock tracking.
17. **Student Portal**: Student self-service dashboard, weekly timetable, marksheet download, fee receipts, and assignment submission.
18. **Faculty Portal**: Faculty dashboard, teaching schedules, attendance marking, grading, and leave applications.
19. **Parent Portal**: Parent login with multi-child linking, attendance tracking, fee balances, and exam results.
20. **Learning Management System (LMS)**: Study materials, video lectures, online assignments, student submissions, and subject discussion forums.
21. **Placement & Career Management**: Corporate drives, job openings, packages (LPA), eligibility filters, student applications, and offer tracking.
22. **Scholarships & Financial Aid**: Government schemes (NSP, SC/ST/OBC/EWS), institutional awards, approval workflows, and disbursements.
23. **Certificates & Document Management**: Digital Bonafide, Transfer (TC), Migration, Character, and NOC certificates with instant QR verification tokens.
24. **Grievance & Discipline**: Confidential anti-ragging, harassment, academic grievance redressal, and disciplinary records.
25. **Campus Events & Clubs**: Cultural festivals, hackathons, sports meets, seminars, and event budgets.
26. **Alumni Association**: Batch directory, current employment, mentorship programs, and alumni donations.
27. **Accreditation & Compliance**: NAAC criteria documentation, NIRF metrics, AISHE data upload tracking, and IQAC records.
28. **Research & Innovation**: Faculty publications, funded grants, patents, conferences, and incubation center projects.
29. **Communication & Alerts**: College-wide notices, department announcements, WhatsApp, SMS, and emergency alerts.
30. **System Administration & RBAC**: Multi-campus and multi-college configurations, role-based access control (Admin, Faculty, Student, Parent, Accountant, Librarian), audit logging, student CSV exports, and database JSON backups.


---

Created by Timestamp India.
