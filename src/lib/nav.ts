import { GROUPS, MODULES, type ModuleKey } from './modules';

export type NavItem = { href: string; label: string; icon: string; module?: ModuleKey; roles?: string[] };
export type NavGroup = { title: string; items: NavItem[] };

/** Sidebar structure: every module (shown when the user has view access) plus the self-service portals (shown by role). */
export const NAV: NavGroup[] = [
  ...GROUPS.map((g) => ({ title: g, items: MODULES.filter((m) => m.group === g).map((m) => ({ href: m.href, label: m.label, icon: m.key, module: m.key })) })),
  {
    title: 'My Portal',
    items: [
      { href: '/portal/student', label: 'Student Portal', icon: 'portal', roles: ['student'] },
      { href: '/portal/faculty', label: 'Faculty Portal', icon: 'portal', roles: ['faculty'] },
      { href: '/portal/parent', label: 'Parent Portal', icon: 'portal', roles: ['parent'] },
    ],
  },
];
