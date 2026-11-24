// Seed data for the demo college.
// Demo logins (password: "password", or SEED_PASSWORD if set):
//   admin@college.edu.in, faculty@college.edu.in, student@college.edu.in, parent@college.edu.in
import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { syncRbac } from './rbac';

const prisma = new PrismaClient();

const lcFirst = (s: string) => s[0].toLowerCase() + s.slice(1);
const ucfirst = (s: string) => s[0].toUpperCase() + s.slice(1);
const round2 = (n: number) => Math.round(n * 100) / 100;
const rand = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
const randomStr = (n: number) => Array.from({ length: n }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[rand(0, 35)]).join('');
const daysFromNow = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

const dmmf = Prisma.dmmf.datamodel;
/** Create a row, coercing date strings to Date and arrays to JSON strings. */
async function mk(model: string, data: Record<string, any>): Promise<any> {
  const m = dmmf.models.find((x) => x.name === model)!;
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    const f = m.fields.find((x) => x.name === k);
    if (f?.type === 'DateTime' && typeof v === 'string') out[k] = new Date(v.length === 10 ? v + 'T00:00:00.000Z' : v);
    else if (Array.isArray(v) || (v && typeof v === 'object' && !(v instanceof Date))) out[k] = JSON.stringify(v);
    else out[k] = v;
  }
  return (prisma as any)[lcFirst(model)].create({ data: out });
}

async function main() {
  const password = bcrypt.hashSync(process.env.SEED_PASSWORD || 'password', 10);


        // 1. Campuses & Colleges
        const mainCampus = await mk('Campus', {
            code: 'BLR-01',
            name: 'Main Campus',
            city: 'Bengaluru',
            state: 'Karnataka',
            address: '120 Knowledge Park, Yelahanka, Bengaluru - 560064',
            phone: '+91-80-28460000',
            email: 'info@college.edu.in',
        });

        const northCampus = await mk('Campus', {
            code: 'PUN-02',
            name: 'Pune Campus',
            city: 'Pune',
            state: 'Maharashtra',
            address: '45 Hinjewadi Phase 2, Pune - 411057',
            phone: '+91-20-22930000',
            email: 'pune@college.edu.in',
        });

        const collegeTech = await mk('College', {
            campus_id: mainCampus.id,
            code: 'WAIT',
            name: 'Institute of Technology',
            university_affiliation: 'Visvesvaraya Technological University (VTU)',
            aishe_code: 'C-12345',
            naac_grade: 'A+',
            principal_name: 'Dr. Raghavendra Rao',
        });

        const collegeArts = await mk('College', {
            campus_id: northCampus.id,
            code: 'WACAC',
            name: 'College of Arts & Commerce',
            university_affiliation: 'Savitribai Phule Pune University (SPPU)',
            aishe_code: 'C-54321',
            naac_grade: 'A',
            principal_name: 'Dr. Meenakshi Deshmukh',
        });

        // 2. Academic & Financial Years
        const ay = await mk('AcademicYear', {
            name: '2026-27',
            start_date: '2026-07-01',
            end_date: '2027-06-30',
            is_current: true,
        });

        await mk('FinancialYear', {
            name: 'FY 2026-27',
            start_date: '2026-04-01',
            end_date: '2027-03-31',
            is_current: true,
        });

        const session = await mk('AcademicSession', {
            academic_year_id: ay.id,
            name: '2026-27 Odd Semester',
            term: 'Odd',
            start_date: '2026-07-15',
            end_date: '2026-12-20',
            is_active: true,
        });

        // 3. Roles & Permissions (module-based RBAC + demo logins for every role)
        await syncRbac(prisma, { demoUsers: true, password: process.env.SEED_PASSWORD || 'password' });
        const roles: Record<string, any> = Object.fromEntries((await prisma.role.findMany()).map((r) => [r.slug, r]));

        // 4. Demo Users
        const adminUser = await mk('User', {
            name: 'Dr. Raghavendra Rao (Admin)',
            email: 'admin@college.edu.in',
            password: password,
            role_id: roles['super_admin'].id,
            campus_id: mainCampus.id,
            college_id: collegeTech.id,
            phone: '9845012345',
        });

        const facultyUser = await mk('User', {
            name: 'Prof. Ananya Sharma',
            email: 'faculty@college.edu.in',
            password: password,
            role_id: roles['faculty'].id,
            campus_id: mainCampus.id,
            college_id: collegeTech.id,
            phone: '9845022222',
        });

        const studentUser = await mk('User', {
            name: 'Aarav Kulkarni',
            email: 'student@college.edu.in',
            password: password,
            role_id: roles['student'].id,
            campus_id: mainCampus.id,
            college_id: collegeTech.id,
            phone: '9900112233',
        });

        const parentUser = await mk('User', {
            name: 'Suresh Kulkarni',
            email: 'parent@college.edu.in',
            password: password,
            role_id: roles['parent'].id,
            campus_id: mainCampus.id,
            college_id: collegeTech.id,
            phone: '9845099887',
        });

        // 5. Departments & Courses
        const deptCse = await mk('Department', {college_id: collegeTech.id, code: 'CSE', name: 'Computer Science & Engineering', hod_name: 'Dr. Vikramaditya Nair'});
        const deptEce = await mk('Department', {college_id: collegeTech.id, code: 'ECE', name: 'Electronics & Communication', hod_name: 'Dr. Kavita Iyer'});
        const deptCom = await mk('Department', {college_id: collegeArts.id, code: 'COM', name: 'Commerce & Management', hod_name: 'Prof. Rajeshwari Joshi'});

        const courseBtech = await mk('Course', {
            department_id: deptCse.id,
            code: 'BTECH-CSE',
            name: 'B.Tech Computer Science & Engineering',
            level: 'Undergraduate',
            duration_years: 4,
            total_semesters: 8,
            total_credits: 160,
            intake_capacity: 120,
            cutoff_percentage: 75.00,
        });

        const courseMtech = await mk('Course', {
            department_id: deptCse.id,
            code: 'MTECH-AI',
            name: 'M.Tech Artificial Intelligence & Data Science',
            level: 'Postgraduate',
            duration_years: 2,
            total_semesters: 4,
            total_credits: 80,
            intake_capacity: 30,
            cutoff_percentage: 70.00,
        });

        const courseBcom = await mk('Course', {
            department_id: deptCom.id,
            code: 'BCOM-HONS',
            name: 'B.Com (Honours) Accounting & Finance',
            level: 'Undergraduate',
            duration_years: 3,
            total_semesters: 6,
            total_credits: 120,
            intake_capacity: 90,
            cutoff_percentage: 60.00,
        });

        const courseDiploma = await mk('Course', {
            department_id: deptEce.id,
            code: 'DIP-IOT',
            name: 'Diploma in Embedded Systems & IoT',
            level: 'Diploma',
            duration_years: 2,
            total_semesters: 4,
            total_credits: 80,
            intake_capacity: 60,
            cutoff_percentage: 50.00,
        });

        await mk('Course', {
            department_id: deptCse.id,
            code: 'CERT-FSWD',
            name: 'Certificate in Full-Stack Web Development',
            level: 'Certificate',
            duration_years: 1,
            total_semesters: 2,
            total_credits: 24,
            intake_capacity: 40,
            cutoff_percentage: 45.00,
        });

        // 6. Subjects & Academic Calendar
        const subDsa = await mk('Subject', {course_id: courseBtech.id, code: 'CS301', name: 'Data Structures & Algorithms', semester: 3, credits: 4.0, subject_type: 'Core', max_internal_marks: 30, max_external_marks: 70});
        const subDbms = await mk('Subject', {course_id: courseBtech.id, code: 'CS302', name: 'Database Management Systems', semester: 3, credits: 4.0, subject_type: 'Core', max_internal_marks: 30, max_external_marks: 70});
        const subOs = await mk('Subject', {course_id: courseBtech.id, code: 'CS303', name: 'Operating Systems', semester: 3, credits: 3.0, subject_type: 'Core', max_internal_marks: 30, max_external_marks: 70});
        const subIks = await mk('Subject', {course_id: courseBtech.id, code: 'NEP304', name: 'Indian Knowledge Systems (NEP)', semester: 3, credits: 2.0, subject_type: 'AECC', max_internal_marks: 40, max_external_marks: 60});
        const subLab = await mk('Subject', {course_id: courseBtech.id, code: 'CS305L', name: 'DBMS & DSA Laboratory', semester: 3, credits: 2.0, subject_type: 'Practical', max_internal_marks: 50, max_external_marks: 50});

        await mk('AcademicCalendar', {academic_session_id: session.id, title: 'Commencement of Odd Semester Classes', event_type: 'Academic', start_date: '2026-07-15'});
        await mk('AcademicCalendar', {academic_session_id: session.id, title: 'Independence Day Celebration', event_type: 'Holiday', start_date: '2026-08-15'});
        await mk('AcademicCalendar', {academic_session_id: session.id, title: 'Mid-Semester Examinations', event_type: 'Examination', start_date: '2026-10-05', end_date: '2026-10-12'});
        await mk('AcademicCalendar', {academic_session_id: session.id, title: 'End-Semester Theory Examinations', event_type: 'Examination', start_date: '2026-11-25', end_date: '2026-12-10'});

        // 7. Faculty & Staff + Salary & Payroll
        const fac1 = await mk('Employee', {
            user_id: facultyUser.id,
            college_id: collegeTech.id,
            department_id: deptCse.id,
            staff_id: 'FAC-101',
            full_name: 'Prof. Ananya Sharma',
            email: 'faculty@college.edu.in',
            phone: '9845022222',
            employee_type: 'Faculty',
            designation: 'Associate Professor',
            qualification: 'Ph.D. (IISc Bengaluru)',
            experience_years: 9,
            specialization: 'Database Systems & AI',
            joining_date: '2018-06-01',
            basic_salary: 68000,
            bank_account_no: '30124567890',
            ifsc_code: 'SBIN0004321',
            pan_number: 'ABCDE1234F',
            uan_number: '100987654321',
        });

        const fac2 = await mk('Employee', {
            college_id: collegeTech.id,
            department_id: deptCse.id,
            staff_id: 'FAC-102',
            full_name: 'Dr. Vikramaditya Nair',
            email: 'vikram.nair@college.edu.in',
            phone: '9845033333',
            employee_type: 'Faculty',
            designation: 'Professor & HOD',
            qualification: 'Ph.D. (IIT Madras)',
            experience_years: 15,
            specialization: 'Algorithms & Distributed Systems',
            joining_date: '2014-07-10',
            basic_salary: 95000,
        });

        const fac3 = await mk('Employee', {
            college_id: collegeTech.id,
            department_id: deptEce.id,
            staff_id: 'FAC-103',
            full_name: 'Dr. Kavita Iyer',
            email: 'kavita.iyer@college.edu.in',
            phone: '9845044444',
            employee_type: 'Faculty',
            designation: 'Professor',
            qualification: 'Ph.D. (NIT Surathkal)',
            experience_years: 12,
            specialization: 'VLSI & Embedded IoT',
            joining_date: '2016-08-01',
            basic_salary: 85000,
        });

        const staff1 = await mk('Employee', {
            college_id: collegeTech.id,
            department_id: deptCse.id,
            staff_id: 'STF-201',
            full_name: 'Mahesh Hegde',
            email: 'mahesh.hegde@college.edu.in',
            phone: '9845055555',
            employee_type: 'Non-Teaching',
            designation: 'Chief Warden & Lab Superintendent',
            qualification: 'M.Sc. Electronics',
            experience_years: 8,
            joining_date: '2019-01-15',
            basic_salary: 38000,
        });

        for (const emp of [fac1, fac2, fac3, staff1]) {
            const hra = round2(emp.basic_salary * 0.20);
            const da = round2(emp.basic_salary * 0.15);
            const ta = 3200;
            const gross = emp.basic_salary + hra + da + ta;
            const pf = round2(emp.basic_salary * 0.12);
            const pt = 200;
            const tds = gross > 80000 ? 4500 : 1200;

            await mk('SalaryStructure', {
                employee_id: emp.id,
                basic_salary: emp.basic_salary,
                hra: hra,
                da: da,
                ta: ta,
                special_allowance: 0,
                pf_enabled: true,
                esi_enabled: gross <= 21000,
                pt_enabled: true,
                tds_monthly: tds,
            });

            await mk('Payroll', {
                employee_id: emp.id,
                month: 10,
                year: 2026,
                working_days: 26,
                leave_deduction_days: 0,
                gross_salary: gross,
                pf_amount: pf,
                esi_amount: 0,
                professional_tax: pt,
                tds_amount: tds,
                net_salary: gross - pf - pt - tds,
                status: 'Paid',
                paid_at: '2026-10-31',
                bank_ref: 'NEFT-OCT26-' + emp.id + '99',
            });

            await mk('EmployeeAttendance', {
                employee_id: emp.id,
                attendance_date: daysFromNow(0),
                check_in: '09:05:00',
                check_out: '17:15:00',
                status: 'Present',
                method: 'Biometric',
            });
        }

        await mk('EmployeeLeave', {
            employee_id: fac1.id,
            leave_type: 'Casual',
            from_date: daysFromNow(5),
            to_date: daysFromNow(6),
            days: 2,
            reason: 'Attending IEEE Conference in Hyderabad',
            status: 'Pending',
        });

        // 8. Class Sections, Subject Allocations & Timetable
        const secA = await mk('ClassSection', {course_id: courseBtech.id, semester: 3, section_name: 'A', room_no: 'CS-301', class_teacher_id: fac1.id});
        const secB = await mk('ClassSection', {course_id: courseBcom.id, semester: 1, section_name: 'A', room_no: 'CM-101', class_teacher_id: fac2.id});

        await mk('SubjectAllocation', {academic_session_id: session.id, class_section_id: secA.id, subject_id: subDsa.id, faculty_id: fac2.id});
        await mk('SubjectAllocation', {academic_session_id: session.id, class_section_id: secA.id, subject_id: subDbms.id, faculty_id: fac1.id});
        await mk('SubjectAllocation', {academic_session_id: session.id, class_section_id: secA.id, subject_id: subLab.id, faculty_id: fac1.id});

        await mk('TimetableSlot', {class_section_id: secA.id, subject_id: subDsa.id, faculty_id: fac2.id, day_of_week: 'Monday', start_time: '09:30:00', end_time: '10:30:00', room_no: 'CS-301', slot_type: 'Lecture'});
        await mk('TimetableSlot', {class_section_id: secA.id, subject_id: subDbms.id, faculty_id: fac1.id, day_of_week: 'Monday', start_time: '10:45:00', end_time: '11:45:00', room_no: 'CS-301', slot_type: 'Lecture'});
        await mk('TimetableSlot', {class_section_id: secA.id, subject_id: subLab.id, faculty_id: fac1.id, day_of_week: 'Tuesday', start_time: '14:00:00', end_time: '16:00:00', room_no: 'LAB-02', slot_type: 'Lab'});
        await mk('TimetableSlot', {class_section_id: secA.id, subject_id: subOs.id, faculty_id: fac3.id, day_of_week: 'Wednesday', start_time: '09:30:00', end_time: '10:30:00', room_no: 'CS-301', slot_type: 'Lecture'});

        // 9. Students & Guardians
        const studentsData = [
            ['Aarav Kulkarni', 'student@college.edu.in', '9900112233', 'Male', 'General', 'WA26CS001', 'ADM-2026-001', '1WA25CS001', studentUser.id],
            ['Priya Deshpande', 'priya.d@college.edu.in', '9900112234', 'Female', 'EWS', 'WA26CS002', 'ADM-2026-002', '1WA25CS002', null],
            ['Rohan Verma', 'rohan.v@college.edu.in', '9900112235', 'Male', 'OBC', 'WA26CS003', 'ADM-2026-003', '1WA25CS003', null],
            ['Sneha Patil', 'sneha.p@college.edu.in', '9900112236', 'Female', 'SC', 'WA26CS004', 'ADM-2026-004', '1WA25CS004', null],
            ['Karthik Reddy', 'karthik.r@college.edu.in', '9900112237', 'Male', 'General', 'WA26CS005', 'ADM-2026-005', '1WA25CS005', null],
            ['Anjali Kumari', 'anjali.k@college.edu.in', '9900112238', 'Female', 'ST', 'WA26CS006', 'ADM-2026-006', '1WA25CS006', null],
        ];

        const students: any[] = [];
        for (const [idx, sd] of studentsData.entries()) {
            const stu = await mk('Student', {
                user_id: sd[8],
                college_id: collegeTech.id,
                department_id: deptCse.id,
                course_id: courseBtech.id,
                current_semester: 3,
                class_section_id: secA.id,
                unique_student_id: sd[5],
                admission_number: sd[6],
                registration_number: sd[7],
                roll_number: 'CS-0' + (idx + 1),
                full_name: sd[0],
                email: sd[1],
                phone: sd[2],
                dob: '2006-05-1' + (idx + 1),
                gender: sd[3],
                blood_group: 'O+',
                category: sd[4],
                aadhaar_last4: '432' + idx,
                permanent_address: 'Bengaluru, Karnataka',
                emergency_contact_name: 'Suresh ' + (sd[0].split(' ')[1] ?? 'Parent'),
                emergency_contact_phone: '984509988' + idx,
                admission_date: '2025-08-01',
                status: 'Active',
            });
            students.push(stu);

            await mk('StudentGuardian', {
                student_id: stu.id,
                parent_user_id: idx === 0 ? parentUser.id : null,
                relation: 'Father',
                name: idx === 0 ? 'Suresh Kulkarni' : 'Mr. ' + sd[0] + ' Sr.',
                phone: '984509988' + idx,
                email: idx === 0 ? 'parent@college.edu.in' : null,
                occupation: 'Engineer',
                annual_income: 850000,
            });
        }

        // Student Attendance (make student[2] have low attendance < 75%)
        for (let d = 0; d < 10; d++) {
            const date = daysFromNow(-(d));
            for (const [idx, stu] of students.entries()) {
                const status = (idx === 2 && d < 5) ? 'Absent' : ((d === 0 && idx === 1) ? 'Late' : 'Present');
                await mk('StudentAttendance', {
                    student_id: stu.id,
                    subject_id: subDbms.id,
                    class_section_id: secA.id,
                    attendance_date: date,
                    status: status,
                    method: d % 2 === 0 ? 'QR' : 'Manual',
                    marked_by: facultyUser.id,
                });
            }
        }

        // 10. Enquiries & Online Admission Applications
        await mk('AdmissionEnquiry', {
            enquiry_no: 'ENQ-2026-001',
            student_name: 'Siddharth Malhotra',
            phone: '9811223344',
            email: 'siddharth@example.com',
            source: 'Online',
            campaign_name: 'JEE Mains 2026 Drive',
            course_id: courseBtech.id,
            counsellor_id: adminUser.id,
            status: 'Follow-up',
            next_followup_date: daysFromNow(2),
            notes: 'Interested in CSE with hostel facility.',
        });

        await mk('AdmissionEnquiry', {
            enquiry_no: 'ENQ-2026-002',
            student_name: 'Meera Krishnan',
            phone: '9811223355',
            source: 'Walk-in',
            course_id: courseMtech.id,
            counsellor_id: adminUser.id,
            status: 'Converted',
            notes: 'GATE qualified, applied online.',
        });

        await mk('AdmissionApplication', {
            application_no: 'APP-2026-1001',
            academic_session_id: session.id,
            course_id: courseBtech.id,
            full_name: 'Ishaan Chatterjee',
            email: 'ishaan.c@example.com',
            phone: '9876543210',
            dob: '2008-03-14',
            gender: 'Male',
            category: 'General',
            aadhaar_number: '123456789012',
            aadhaar_consent: true,
            father_name: 'Subhash Chatterjee',
            class_10_board: 'CBSE',
            class_10_percentage: 94.20,
            class_12_board: 'CBSE',
            class_12_percentage: 91.50,
            entrance_exam_name: 'KCET / JEE',
            entrance_score: 89.40,
            merit_score: 90.45,
            application_fee_status: 'Paid',
            payment_txn_id: 'RZP_TXN_998877',
            status: 'Verified',
        });

        await mk('AdmissionApplication', {
            application_no: 'APP-2026-1002',
            academic_session_id: session.id,
            course_id: courseBtech.id,
            full_name: 'Neha Gupta',
            email: 'neha.g@example.com',
            phone: '9876543211',
            dob: '2008-07-21',
            gender: 'Female',
            category: 'EWS',
            class_10_board: 'ICSE',
            class_10_percentage: 92.00,
            class_12_board: 'ISC',
            class_12_percentage: 88.60,
            entrance_exam_name: 'JEE Main',
            entrance_score: 85.00,
            merit_score: 86.80,
            application_fee_status: 'Paid',
            payment_txn_id: 'RZP_TXN_998878',
            status: 'Submitted',
        });

        // 11. Examinations & Marks
        const exam = await mk('Exam', {
            name: 'Odd Semester End-Term Exam Nov 2026',
            exam_type: 'End-Semester',
            academic_session_id: session.id,
            course_id: courseBtech.id,
            semester: 3,
            start_date: '2026-11-25',
            end_date: '2026-12-05',
            is_published: true,
        });

        await mk('ExamSchedule', {exam_id: exam.id, subject_id: subDsa.id, exam_date: '2026-11-25', start_time: '10:00:00', end_time: '13:00:00', room_no: 'HALL-A', invigilator_id: fac2.id});
        await mk('ExamSchedule', {exam_id: exam.id, subject_id: subDbms.id, exam_date: '2026-11-27', start_time: '10:00:00', end_time: '13:00:00', room_no: 'HALL-A', invigilator_id: fac1.id});

        for (const [idx, stu] of students.entries()) {
            await mk('ExamRegistration', {
                exam_id: exam.id,
                student_id: stu.id,
                seat_no: 'SEAT-30' + (idx + 1),
                admit_card_number: 'ADM-NOV26-00' + (idx + 1),
                is_eligible: idx !== 2,
            });

            for (const [sIdx, subj] of [subDsa, subDbms, subIks].entries()) {
                const int = 24 + ((idx + sIdx) % 5);
                const ext = 52 + ((idx * 3 + sIdx * 4) % 18);
                const tot = int + ext;
                const gp = tot >= 90 ? 10 : (tot >= 80 ? 9 : (tot >= 70 ? 8 : 7));
                const grade = tot >= 90 ? 'O' : (tot >= 80 ? 'A+' : (tot >= 70 ? 'A' : 'B+'));
                await mk('ExamMark', {
                    exam_id: exam.id,
                    subject_id: subj.id,
                    student_id: stu.id,
                    internal_marks: int,
                    external_marks: ext,
                    total_marks: tot,
                    grade: grade,
                    grade_point: gp,
                    credits: subj.credits,
                    result_status: 'Pass',
                    is_verified: true,
                });
            }
        }

        // 12. Library Books & Issues
        const book1 = await mk('LibraryBook', {isbn: '978-0262046305', accession_no: 'ACC-1001', barcode: 'LIB1001', title: 'Introduction to Algorithms (CLRS)', author: 'Thomas H. Cormen', publisher: 'MIT Press', subject_category: 'Computer Science', rack_location: 'R1-A2', total_copies: 10, available_copies: 8});
        const book2 = await mk('LibraryBook', {isbn: '978-0078022159', accession_no: 'ACC-1002', barcode: 'LIB1002', title: 'Database System Concepts', author: 'Silberschatz, Korth', publisher: 'McGraw Hill', subject_category: 'Database', rack_location: 'R1-B4', total_copies: 8, available_copies: 7});
        await mk('LibraryBook', {isbn: '978-0134685991', accession_no: 'ACC-1003', barcode: 'LIB1003', title: 'Effective Java', author: 'Joshua Bloch', publisher: 'Addison-Wesley', subject_category: 'Programming', rack_location: 'R2-C1', book_type: 'E-Book', ebook_url: 'https://library.college.edu.in/ebooks/effective-java.pdf', total_copies: 1, available_copies: 1});

        await mk('LibraryIssue', {
            library_book_id: book1.id,
            user_id: studentUser.id,
            member_type: 'Student',
            issue_date: daysFromNow(-(20)),
            due_date: daysFromNow(-(6)),
            status: 'Overdue',
            fine_amount: 30.00,
        });

        // 13. Fees & Student Accounts + College Finance
        const feeStruct = await mk('FeeStructure', {
            course_id: courseBtech.id,
            semester: 3,
            category: 'All',
            admission_fee: 0,
            tuition_fee: 55000,
            exam_fee: 2500,
            library_fee: 1500,
            lab_fee: 4000,
            misc_fee: 2000,
            total_fee: 65000,
        });

        for (const [idx, stu] of students.entries()) {
            const paid = idx < 3 ? 65000 : 35000;
            const acc = await mk('StudentFeeAccount', {
                student_id: stu.id,
                fee_structure_id: feeStruct.id,
                academic_session_id: session.id,
                total_amount: 65000,
                concession_amount: stu.category === 'SC' ? 15000 : 0,
                paid_amount: paid,
                balance_amount: Math.max(0, 65000 - (stu.category === 'SC' ? 15000 : 0) - paid),
                due_date: '2026-11-30',
                status: paid >= 65000 ? 'Paid' : 'Partial',
            });

            await mk('FeePayment', {
                student_fee_account_id: acc.id,
                student_id: stu.id,
                receipt_no: 'RCPT-2026-00' + (idx + 1),
                amount: paid,
                payment_mode: idx % 2 === 0 ? 'UPI' : 'NetBanking',
                transaction_ref: 'UPI' + rand(10000000, 99999999),
                payment_date: daysFromNow(-(15 - idx)),
                status: 'Completed',
            });
        }

        const coaBank = await mk('ChartOfAccount', {code: '1002', name: 'SBI Main College Account', account_type: 'Asset', balance: 4850000});
        const coaCash = await mk('ChartOfAccount', {code: '1001', name: 'Cash in Hand', account_type: 'Asset', balance: 125000});
        const coaTuition = await mk('ChartOfAccount', {code: '4001', name: 'Tuition Fee Income', account_type: 'Income', balance: 3200000});
        const coaSalary = await mk('ChartOfAccount', {code: '5001', name: 'Faculty & Staff Salaries', account_type: 'Expense', balance: 1850000});
        const coaLabExp = await mk('ChartOfAccount', {code: '5002', name: 'Laboratory Consumables & Maintenance', account_type: 'Expense', balance: 240000});

        await mk('FinancialVoucher', {
            voucher_no: 'VCH-2026-001',
            voucher_type: 'Receipt',
            voucher_date: daysFromNow(-(5)),
            debit_account_id: coaBank.id,
            credit_account_id: coaTuition.id,
            amount: 320000,
            department_id: deptCse.id,
            narration: 'B.Tech Sem 3 Tuition Fee Batch Settlement',
            created_by: adminUser.id,
        });

        await mk('FinancialVoucher', {
            voucher_no: 'VCH-2026-002',
            voucher_type: 'Payment',
            voucher_date: daysFromNow(-(2)),
            debit_account_id: coaLabExp.id,
            credit_account_id: coaBank.id,
            amount: 45000,
            gst_amount: 8100,
            tds_amount: 900,
            department_id: deptCse.id,
            narration: 'Networking Switches & Lab Maintenance',
            created_by: adminUser.id,
        });

        await mk('DepartmentBudget', {department_id: deptCse.id, financial_year: 'FY 2026-27', allocated_amount: 1500000, utilized_amount: 485000});
        await mk('DepartmentBudget', {department_id: deptEce.id, financial_year: 'FY 2026-27', allocated_amount: 1200000, utilized_amount: 310000});

        await mk('FixedAsset', {asset_code: 'FA-CSE-01', name: 'HP ProLiant Campus Server', category: 'IT Infrastructure', department_id: deptCse.id, purchase_date: '2025-04-10', purchase_cost: 450000, depreciation_rate: 15, current_value: 382500});

        const vendor = await mk('Vendor', {name: 'TechBridge India Pvt Ltd', gstin: '29AABCT1234F1Z5', pan: 'AABCT1234F', contact_person: 'Arun Kumar', phone: '9880011223', email: 'sales@techbridge.in', category: 'IT & Lab Equipment'});
        const req = await mk('PurchaseRequisition', {req_no: 'PR-2026-001', department_id: deptCse.id, requested_by: facultyUser.id, item_description: '30x Dell OptiPlex Workstations for AI Lab', quantity: 30, estimated_cost: 1650000, status: 'PO Created'});
        await mk('PurchaseOrder', {po_no: 'PO-2026-001', vendor_id: vendor.id, purchase_requisition_id: req.id, order_date: daysFromNow(-(7)), total_amount: 1620000, status: 'Ordered'});
        await mk('InventoryItem', {item_code: 'INV-LAB-01', name: 'Digital Oscilloscope 100MHz', category: 'Lab Equipment', department_id: deptEce.id, quantity: 18, unit: 'Units', reorder_level: 5});

        // 14. Hostel & Transport
        const hostelBoys = await mk('Hostel', {name: 'Vivekananda Boys Hostel', type: 'Boys', warden_id: staff1.id, total_rooms: 60, capacity: 180, monthly_fee: 4500, mess_fee: 3500});
        await mk('Hostel', {name: 'Kalpana Chawla Girls Hostel', type: 'Girls', warden_id: fac1.id, total_rooms: 50, capacity: 150, monthly_fee: 4500, mess_fee: 3500});

        const room101 = await mk('HostelRoom', {hostel_id: hostelBoys.id, floor: '1st Floor', room_no: 'B-101', capacity: 3, occupied_beds: 1, room_type: 'Triple'});
        await mk('HostelAllocation', {hostel_id: hostelBoys.id, hostel_room_id: room101.id, student_id: students[0].id, bed_no: 'B1', check_in_date: '2026-07-15'});
        await mk('HostelActivity', {hostel_id: hostelBoys.id, student_id: students[0].id, activity_type: 'Outing Request', title: 'Weekend Home Visit', details: 'Leaving Friday 5 PM, returning Sunday 8 PM.', status: 'Approved'});

        const bus1 = await mk('TransportVehicle', {registration_no: 'KA-01-F-4521', vehicle_type: 'Bus', capacity: 50, driver_name: 'Ramesh Gowda', driver_phone: '9845111222', driver_license: 'KA01-20150045678', gps_device_id: 'GPS-BUS-01', last_fuel_liters: 120});
        const route1 = await mk('TransportRoute', {route_name: 'Route 1: Majestic - Hebbal - Campus', transport_vehicle_id: bus1.id, stops_json: ['Majestic', 'Mekhri Circle', 'Hebbal', 'Yelahanka', 'Campus'], monthly_fee: 1800});
        await mk('TransportAllocation', {transport_route_id: route1.id, student_id: students[1].id, pickup_stop: 'Hebbal', start_date: '2026-07-15'});

        // 15. LMS
        await mk('LmsMaterial', {subject_id: subDbms.id, faculty_id: fac1.id, title: 'Unit 1: ER Model & Relational Algebra Notes', material_type: 'PDF', file_url: 'https://lms.college.edu.in/dbms-unit1.pdf', description: 'Comprehensive lecture notes with solved GATE questions.'});
        const assign = await mk('LmsAssignment', {subject_id: subDbms.id, faculty_id: fac1.id, title: 'Assignment 1: Normalize College Schema to BCNF', description: 'Submit SQL DDL and normalization steps.', due_date: daysFromNow(7), max_marks: 20});
        await mk('LmsSubmission', {lms_assignment_id: assign.id, student_id: students[0].id, submission_url: 'https://github.com/aarav/dbms-bcnf', submission_notes: 'Completed all 5 relations.', submitted_at: new Date(), marks_obtained: 18, feedback: 'Well structured ER diagram.'});
        await mk('LmsDiscussion', {subject_id: subDbms.id, user_id: studentUser.id, topic: 'Difference between 3NF and BCNF', message: 'Can someone share a practical example where 3NF is satisfied but BCNF fails?'});

        // 16. Placements
        const comp1 = await mk('PlacementCompany', {name: 'Tata Consultancy Services (TCS)', industry: 'IT Services', hr_name: 'Divya Menon', hr_email: 'campus@tcs.com', hr_phone: '022-67789999'});
        const comp2 = await mk('PlacementCompany', {name: 'Razorpay', industry: 'FinTech', hr_name: 'Karan Mehta', hr_email: 'university@razorpay.com', hr_phone: '080-45678900'});
        const drive1 = await mk('PlacementDrive', {placement_company_id: comp1.id, job_title: 'Software Engineer (Digital)', package_lpa: 7.50, eligibility_cgpa: 6.50, drive_date: daysFromNow(15), drive_type: 'Full-Time', status: 'Upcoming'});
        const drive2 = await mk('PlacementDrive', {placement_company_id: comp2.id, job_title: 'Backend Engineering Intern', package_lpa: 14.00, eligibility_cgpa: 7.50, drive_date: daysFromNow(22), drive_type: 'Internship', status: 'Upcoming'});
        await mk('PlacementApplication', {placement_drive_id: drive1.id, student_id: students[0].id, aptitude_score: 86, status: 'Shortlisted'});
        await mk('PlacementApplication', {placement_drive_id: drive2.id, student_id: students[1].id, aptitude_score: 92, status: 'Selected'});

        // 17. Scholarships, Certificates, Grievances, Events, Alumni
        const sch1 = await mk('Scholarship', {name: 'NSP Post-Matric SC/ST Scholarship', scheme_type: 'Government', amount: 25000, eligibility_criteria: 'SC/ST category with family income < 2.5 LPA', academic_session_id: session.id});
        const sch2 = await mk('Scholarship', {name: 'Merit Excellence Award', scheme_type: 'Merit', amount: 15000, eligibility_criteria: 'SGPA >= 9.0', academic_session_id: session.id});
        await mk('ScholarshipApplication', {scholarship_id: sch1.id, student_id: students[3].id, status: 'Approved', disbursed_amount: 25000, disbursed_at: daysFromNow(-(10))});
        await mk('ScholarshipApplication', {scholarship_id: sch2.id, student_id: students[0].id, status: 'Verified'});

        await mk('Certificate', {
            certificate_no: 'CERT-BON-2026-001',
            student_id: students[0].id,
            certificate_type: 'Bonafide',
            issue_date: daysFromNow(0),
            status: 'Issued',
            verification_token: randomStr(32),
            remarks: 'Issued for Passport / Education Loan Verification',
        });

        await mk('Grievance', {
            ticket_no: 'GRV-2026-001',
            student_id: students[0].id,
            category: 'Hostel',
            is_confidential: false,
            subject: 'Wi-Fi Speed Issue in Block B 1st Floor',
            description: 'Wi-Fi disconnects frequently after 9 PM in B-101.',
            assigned_to: adminUser.id,
            status: 'Under Review',
        });

        await mk('CampusEvent', {title: 'TechUtsav 2026 - National Hackathon', category: 'Workshop', event_date: daysFromNow(12), venue: 'Main Auditorium', budget: 150000, department_id: deptCse.id, status: 'Planned'});
        await mk('Alumnus', {full_name: 'Nikhil Kamath (Batch 2021)', email: 'nikhil@alumni.college.edu.in', phone: '9880098800', graduation_year: 2021, course_id: courseBtech.id, current_company: 'Google India', designation: 'Senior Software Engineer', city: 'Bengaluru', is_mentor: true, donation_total: 50000});

        // 18. Accreditation (NAAC/NIRF/AISHE) & Research
        await mk('AccreditationRecord', {framework: 'NAAC', cycle_year: '2026-27', criterion: 'Criterion 1: Curricular Aspects', metric_code: '1.1.1', title: 'NEP 2020 & CBCS Curriculum Implementation', score_or_value: '3.65 / 4.00', department_id: deptCse.id, status: 'Verified'});
        await mk('AccreditationRecord', {framework: 'NIRF', cycle_year: '2026', criterion: 'TLR & Graduation Outcomes', metric_code: 'NIRF-ENGG', title: 'Faculty-Student Ratio & Placement Median Salary', score_or_value: 'Rank Band 101-150', status: 'Submitted'});
        await mk('AccreditationRecord', {framework: 'AISHE', cycle_year: '2025-26', criterion: 'DCF-II Institutional Data', metric_code: 'C-12345', title: 'Annual AISHE Portal Data Upload', score_or_value: 'Uploaded & Certified', status: 'Approved'});

        await mk('ResearchRecord', {record_type: 'Patent', title: 'AI-Based Low-Cost Soil Moisture Sensor for Indian Farmers', lead_name: 'Dr. Kavita Iyer', department_id: deptEce.id, patent_no: 'IN-202641009812', year: 2026, status: 'Granted'});
        await mk('ResearchRecord', {record_type: 'Research Grant', title: 'DST-SERB Grant on Multilingual Indic LLM', lead_name: 'Prof. Ananya Sharma', department_id: deptCse.id, funding_agency: 'DST-SERB, Govt. of India', grant_amount: 2400000, year: 2026, status: 'Ongoing'});

        // 19. Announcements, Notification Logs, Audit Logs & System Settings
        await mk('Announcement', {title: 'Odd Semester End-Term Exam Timetable Published', message: 'All B.Tech & B.Com students can download their Exam Timetable and Admit Cards from the Student Portal.', target_audience: 'All', channel: 'Portal', published_at: new Date(), created_by: adminUser.id});
        await mk('Announcement', {title: 'Fee Payment Reminder: Odd Semester Due 30 Nov', message: 'Students with pending tuition fees are requested to clear dues via UPI/NetBanking to avoid late penalty.', target_audience: 'Students', channel: 'WhatsApp', published_at: new Date(), created_by: adminUser.id});

        await mk('NotificationLog', {recipient_name: 'Aarav Kulkarni', recipient_contact: '9900112233', channel: 'WhatsApp', subject: 'Admit Card Ready', message: 'Your Nov 2026 Admit Card is ready for download.', status: 'Sent', sent_at: new Date()});
        await mk('AuditLog', {user_id: adminUser.id, action: 'SEED_INITIALIZED', module: 'System', description: 'Initialized College ERP.', ip_address: '127.0.0.1'});

        await mk('SystemSetting', {group_name: 'general', key: 'institution_name', value: 'University Group'});
        await mk('SystemSetting', {group_name: 'grading', key: 'grading_scale', value: JSON.stringify({ O: 10, 'A+': 9, A: 8, 'B+': 7, B: 6, C: 5, F: 0 })});
        await mk('SystemSetting', {group_name: 'integrations', key: 'payment_gateway', value: 'Razorpay (UPI / Cards / NetBanking)'});
        await mk('SystemSetting', {group_name: 'integrations', key: 'whatsapp_provider', value: 'Meta WhatsApp Business Cloud API'});
    }

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
