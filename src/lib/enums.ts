// Allowed values for enum-style columns (generated from the Prisma schema).
export const ENUMS = {
  "courses": {
    "level": [
      "Undergraduate",
      "Postgraduate",
      "Diploma",
      "Certificate"
    ]
  },
  "academic_sessions": {
    "term": [
      "Odd",
      "Even",
      "Annual"
    ]
  },
  "subjects": {
    "subject_type": [
      "Core",
      "Elective",
      "Practical",
      "AECC",
      "SEC",
      "GE",
      "Project"
    ]
  },
  "academic_calendars": {
    "event_type": [
      "Academic",
      "Holiday",
      "Examination",
      "Cultural",
      "Workshop"
    ]
  },
  "admission_enquiries": {
    "source": [
      "Walk-in",
      "Telephone",
      "Online",
      "Campaign",
      "Referral"
    ],
    "status": [
      "New",
      "Follow-up",
      "Converted",
      "Lost"
    ]
  },
  "admission_applications": {
    "gender": [
      "Male",
      "Female",
      "Other"
    ],
    "category": [
      "General",
      "OBC",
      "SC",
      "ST",
      "EWS"
    ],
    "application_fee_status": [
      "Pending",
      "Paid",
      "Refunded"
    ],
    "status": [
      "Submitted",
      "Verified",
      "Merit Listed",
      "Waiting List",
      "Approved",
      "Rejected",
      "Confirmed",
      "Cancelled"
    ]
  },
  "students": {
    "gender": [
      "Male",
      "Female",
      "Other"
    ],
    "category": [
      "General",
      "OBC",
      "SC",
      "ST",
      "EWS"
    ],
    "status": [
      "Active",
      "Passed Out",
      "Suspended",
      "Withdrawn"
    ]
  },
  "student_guardians": {
    "relation": [
      "Father",
      "Mother",
      "Guardian"
    ]
  },
  "employees": {
    "employee_type": [
      "Faculty",
      "Non-Teaching",
      "Admin"
    ],
    "status": [
      "Active",
      "On Leave",
      "Resigned"
    ]
  },
  "employee_leaves": {
    "leave_type": [
      "Casual",
      "Medical",
      "Earned",
      "Maternity",
      "Duty",
      "LWP"
    ],
    "status": [
      "Pending",
      "Approved",
      "Rejected"
    ]
  },
  "payrolls": {
    "status": [
      "Draft",
      "Processed",
      "Paid"
    ]
  },
  "timetable_slots": {
    "day_of_week": [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday"
    ],
    "slot_type": [
      "Lecture",
      "Practical",
      "Lab",
      "Special"
    ]
  },
  "student_attendances": {
    "status": [
      "Present",
      "Absent",
      "Late",
      "Excused"
    ],
    "method": [
      "Manual",
      "QR",
      "Biometric",
      "RFID"
    ]
  },
  "employee_attendances": {
    "status": [
      "Present",
      "Absent",
      "Late",
      "Half Day",
      "On Leave"
    ],
    "method": [
      "Manual",
      "Biometric",
      "RFID"
    ]
  },
  "attendance_corrections": {
    "status": [
      "Pending",
      "Approved",
      "Rejected"
    ]
  },
  "exams": {
    "exam_type": [
      "Internal",
      "Mid-Semester",
      "End-Semester",
      "Practical",
      "Supplementary",
      "Backlog"
    ]
  },
  "exam_marks": {
    "result_status": [
      "Pass",
      "Fail",
      "Backlog",
      "Absent"
    ],
    "reevaluation_status": [
      "None",
      "Applied",
      "Completed"
    ]
  },
  "library_books": {
    "book_type": [
      "Regular",
      "Reference",
      "Journal",
      "Magazine",
      "E-Book"
    ],
    "status": [
      "Available",
      "Out of Stock",
      "Damaged",
      "Lost"
    ]
  },
  "library_issues": {
    "member_type": [
      "Student",
      "Faculty"
    ],
    "status": [
      "Issued",
      "Returned",
      "Reserved",
      "Overdue",
      "Lost"
    ]
  },
  "fee_structures": {
    "category": [
      "All",
      "General",
      "OBC",
      "SC",
      "ST",
      "EWS"
    ]
  },
  "student_fee_accounts": {
    "status": [
      "Pending",
      "Partial",
      "Paid"
    ]
  },
  "fee_payments": {
    "payment_mode": [
      "UPI",
      "Card",
      "NetBanking",
      "Cash",
      "Cheque",
      "DD"
    ],
    "status": [
      "Completed",
      "Refunded"
    ]
  },
  "chart_of_accounts": {
    "account_type": [
      "Asset",
      "Liability",
      "Equity",
      "Income",
      "Expense"
    ]
  },
  "financial_vouchers": {
    "voucher_type": [
      "Payment",
      "Receipt",
      "Contra",
      "Journal"
    ]
  },
  "purchase_requisitions": {
    "status": [
      "Pending",
      "Approved",
      "PO Created",
      "Rejected"
    ]
  },
  "purchase_orders": {
    "status": [
      "Ordered",
      "Goods Received",
      "Invoiced",
      "Paid"
    ]
  },
  "inventory_items": {
    "category": [
      "Lab Equipment",
      "Furniture",
      "Stationery",
      "IT Hardware",
      "Sports"
    ],
    "condition_status": [
      "Good",
      "Needs Maintenance",
      "Damaged"
    ]
  },
  "hostels": {
    "type": [
      "Boys",
      "Girls",
      "Co-Ed"
    ]
  },
  "hostel_rooms": {
    "room_type": [
      "Single",
      "Double",
      "Triple",
      "Dormitory"
    ]
  },
  "hostel_allocations": {
    "status": [
      "Active",
      "Vacated"
    ]
  },
  "hostel_activities": {
    "activity_type": [
      "Visitor",
      "Complaint",
      "Maintenance",
      "Outing Request",
      "Attendance"
    ],
    "status": [
      "Open",
      "Approved",
      "Resolved",
      "Closed"
    ]
  },
  "transport_vehicles": {
    "vehicle_type": [
      "Bus",
      "Mini Bus",
      "Van"
    ]
  },
  "transport_allocations": {
    "status": [
      "Active",
      "Cancelled"
    ]
  },
  "lms_materials": {
    "material_type": [
      "PDF",
      "Document",
      "Video Lecture",
      "Recorded Class",
      "Quiz"
    ]
  },
  "placement_drives": {
    "drive_type": [
      "Full-Time",
      "Internship"
    ],
    "status": [
      "Upcoming",
      "Ongoing",
      "Completed"
    ]
  },
  "placement_applications": {
    "status": [
      "Applied",
      "Shortlisted",
      "Interviewed",
      "Selected",
      "Rejected"
    ]
  },
  "scholarships": {
    "scheme_type": [
      "Government",
      "Institutional",
      "Merit",
      "Need-Based",
      "SC/ST/OBC/EWS"
    ]
  },
  "scholarship_applications": {
    "status": [
      "Applied",
      "Verified",
      "Approved",
      "Disbursed",
      "Rejected"
    ]
  },
  "certificates": {
    "certificate_type": [
      "Bonafide",
      "Transfer",
      "Migration",
      "Character",
      "NOC",
      "Course Completion",
      "Provisional",
      "Degree",
      "Duplicate"
    ],
    "status": [
      "Requested",
      "Approved",
      "Issued",
      "Rejected"
    ]
  },
  "grievances": {
    "category": [
      "Academic",
      "Anti-Ragging",
      "Harassment",
      "Hostel",
      "Fee",
      "General"
    ],
    "status": [
      "Submitted",
      "Under Review",
      "Resolved",
      "Closed"
    ]
  },
  "campus_events": {
    "category": [
      "Cultural",
      "Sports",
      "Seminar",
      "Workshop",
      "Club",
      "Annual Fest"
    ],
    "status": [
      "Planned",
      "Ongoing",
      "Completed",
      "Cancelled"
    ]
  },
  "accreditation_records": {
    "framework": [
      "NAAC",
      "NIRF",
      "AISHE",
      "UGC",
      "AICTE",
      "NBA",
      "IQAC"
    ],
    "status": [
      "Draft",
      "Submitted",
      "Verified",
      "Approved"
    ]
  },
  "research_records": {
    "record_type": [
      "Faculty Publication",
      "Student Project",
      "Research Grant",
      "Patent",
      "Conference",
      "Incubation"
    ],
    "status": [
      "Ongoing",
      "Published",
      "Granted",
      "Completed"
    ]
  },
  "announcements": {
    "target_audience": [
      "All",
      "Students",
      "Faculty",
      "Parents",
      "Department"
    ],
    "channel": [
      "Portal",
      "Email",
      "SMS",
      "WhatsApp",
      "Push"
    ]
  },
  "notification_logs": {
    "channel": [
      "Email",
      "SMS",
      "WhatsApp",
      "Push"
    ],
    "status": [
      "Queued",
      "Sent",
      "Failed"
    ]
  }
} as const;
