import {
  Award, BadgeCheck, BedDouble, BookOpen, Briefcase, Bus, CalendarCheck, CalendarDays, ClipboardCheck, FileText, FlaskConical, GraduationCap,
  Headset, KeyRound, Landmark, LayoutDashboard, Megaphone, MonitorPlay, Package, PartyPopper, School, Settings, ShieldAlert, UserCog, UserRound,
  Users, Wallet, Banknote, type LucideIcon,
} from 'lucide-react';

const MAP: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard, admissions: FileText, enquiries: Headset, students: GraduationCap, academics: School, timetable: CalendarDays,
  attendance: CalendarCheck, exams: ClipboardCheck, library: BookOpen, fees: Wallet, finance: Landmark, hr: Users, payroll: Banknote,
  procurement: Package, hostel: BedDouble, transport: Bus, lms: MonitorPlay, placements: Briefcase, scholarships: Award, certificates: BadgeCheck,
  grievances: ShieldAlert, events: PartyPopper, accreditation: FlaskConical, communication: Megaphone, team: UserCog, access: KeyRound,
  settings: Settings, portal: UserRound,
};

/** Icon for a module key (or a portal). Falls back to a neutral icon. */
export function ModuleIcon({ name, className = 'h-4 w-4' }: { name: string; className?: string }) {
  const Icon = MAP[name] ?? LayoutDashboard;
  return <Icon className={className} aria-hidden strokeWidth={1.9} />;
}
