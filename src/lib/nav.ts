import { GROUPS, MODULES, type ModuleKey } from './modules';

export type NavItem = { href: string; label: string; module?: ModuleKey; roles?: string[] };
export type NavGroup = { title: string; items: NavItem[] };

/** Sidebar structure: every module (shown when the user has view access) plus the self-service portals (shown by role). */
export const NAV: NavGroup[] = [
  ...GROUPS.map((g) => ({ title: g, items: MODULES.filter((m) => m.group === g).map((m) => ({ href: m.href, label: m.label, module: m.key })) })),
  {
    title: 'My Portal',
    items: [
      { href: '/portal/student', label: 'Student Portal', roles: ['student'] },
      { href: '/portal/faculty', label: 'Faculty Portal', roles: ['faculty'] },
      { href: '/portal/parent', label: 'Parent Portal', roles: ['parent'] },
    ],
  },
];
