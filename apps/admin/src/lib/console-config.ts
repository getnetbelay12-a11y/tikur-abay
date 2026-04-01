import {
  canAccessConsolePath,
  dashboardRouteByRole,
  roleCanSeeNav,
  type ConsoleRole,
} from './corridor-permissions';

export type { ConsoleRole } from './corridor-permissions';
export { dashboardRouteByRole } from './corridor-permissions';

export type ConsoleSession = {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  role: ConsoleRole;
  permissions: string[];
  branch: string;
  branchId: string;
  status: string;
  dashboardRoute: string;
  customerCode?: string;
};

export type NavGroupKey =
  | 'dashboard'
  | 'shipping'
  | 'operations'
  | 'finance'
  | 'commercial'
  | 'communication'
  | 'settings';

type NavItem = {
  href: string;
  label: string;
  icon: string;
  group: NavGroupKey;
  roles: ConsoleRole[];
};

export const navGroups: Array<{ key: NavGroupKey; label: string }> = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'shipping', label: 'Shipping' },
  { key: 'operations', label: 'Corridor Workspaces' },
  { key: 'settings', label: 'Settings' },
];

export const sidebarItems: NavItem[] = [
  { href: '/', label: 'Executive Dashboard', icon: 'DB', group: 'dashboard', roles: ['super_admin'] },
  { href: '/dashboards/executive', label: 'Executive Dashboard', icon: 'EX', group: 'dashboard', roles: ['executive'] },
  { href: '/tracking', label: 'Container Track', icon: 'CT', group: 'dashboard', roles: ['super_admin', 'executive', 'driver'] },
  { href: '/shipping', label: 'Shipping Workspace', icon: 'SH', group: 'shipping', roles: ['super_admin', 'executive', 'supplier_agent'] },
  { href: '/operations/booking', label: 'Booking / Quote Desk', icon: 'BQ', group: 'operations', roles: ['marketing_officer', 'operations_manager', 'supplier_agent'] },
  { href: '/operations/supplier-agent', label: 'Tikur Abay Port Agent Desk (China)', icon: 'SU', group: 'operations', roles: ['marketing_officer', 'operations_manager'] },
  { href: '/operations/djibouti-release', label: 'Multimodal / Djibouti Release Desk', icon: 'DJ', group: 'operations', roles: ['djibouti_release_agent', 'operations_manager'] },
  { href: '/operations/transitor-clearance', label: 'Transitor / Clearance Desk', icon: 'TC', group: 'operations', roles: ['djibouti_clearing_agent', 'operations_manager', 'finance_officer'] },
  { href: '/operations/corridor-dispatch', label: 'Corridor Dispatch', icon: 'DP', group: 'operations', roles: ['corridor_dispatch_agent', 'dispatcher'] },
  { href: '/operations/dry-port-yard', label: 'Yard / Delivery Desk', icon: 'YD', group: 'operations', roles: ['dry_port_yard_agent', 'technical_manager'] },
  { href: '/operations/empty-return', label: 'Empty Return Control', icon: 'RT', group: 'operations', roles: ['dry_port_yard_agent', 'technical_manager'] },
  { href: '/finance', label: 'Finance / Customs Control', icon: 'FC', group: 'operations', roles: ['finance_officer'] },
  { href: '/chat', label: 'Support / Communications', icon: 'CH', group: 'operations', roles: ['customer_support_agent'] },
  { href: '/customer', label: 'Customer Portal', icon: 'CU', group: 'operations', roles: ['customer'] },
  { href: '/profile', label: 'Profile', icon: 'PR', group: 'settings', roles: ['super_admin', 'executive', 'operations_manager', 'dispatcher', 'technical_manager', 'finance_officer', 'hr_officer', 'marketing_officer', 'customer'] },
  { href: '/account', label: 'My Account', icon: 'AC', group: 'settings', roles: ['super_admin', 'executive', 'operations_manager', 'dispatcher', 'technical_manager', 'finance_officer', 'hr_officer', 'marketing_officer', 'customer'] },
  { href: '/operations-status', label: 'Operations Status', icon: 'OS', group: 'settings', roles: ['super_admin', 'executive'] },
  { href: '/settings', label: 'System Settings', icon: 'ST', group: 'settings', roles: ['super_admin'] },
  { href: '/users', label: 'User Access', icon: 'UA', group: 'settings', roles: ['super_admin'] },
];

export const protectedRouteConfig: Array<{ prefix: string; roles: ConsoleRole[] }> = [
  { prefix: '/', roles: ['super_admin'] },
  { prefix: '/dashboards/executive', roles: ['super_admin', 'executive'] },
  { prefix: '/tracking', roles: ['super_admin', 'executive', 'driver'] },
  { prefix: '/shipping', roles: ['super_admin', 'executive', 'supplier_agent'] },
  { prefix: '/operations/shipping', roles: ['super_admin', 'executive', 'supplier_agent'] },
  { prefix: '/shipments/intake', roles: ['super_admin', 'executive', 'operations_manager', 'marketing_officer', 'supplier_agent'] },
  { prefix: '/bookings/new', roles: ['super_admin', 'executive', 'operations_manager', 'marketing_officer', 'supplier_agent'] },
  { prefix: '/china-desk', roles: ['super_admin', 'executive', 'operations_manager', 'marketing_officer'] },
  { prefix: '/operations/booking', roles: ['super_admin', 'executive', 'operations_manager', 'marketing_officer', 'supplier_agent'] },
  { prefix: '/operations/booking-quote', roles: ['super_admin', 'executive', 'operations_manager', 'marketing_officer', 'supplier_agent'] },
  { prefix: '/booking', roles: ['super_admin', 'executive', 'operations_manager', 'marketing_officer', 'supplier_agent'] },
  { prefix: '/supplier-agent', roles: ['super_admin', 'executive', 'marketing_officer', 'supplier_agent'] },
  { prefix: '/operations/supplier-agent', roles: ['super_admin', 'executive', 'marketing_officer', 'supplier_agent'] },
  { prefix: '/djibouti-release', roles: ['super_admin', 'executive', 'operations_manager'] },
  { prefix: '/operations/djibouti-release', roles: ['super_admin', 'executive', 'operations_manager'] },
  { prefix: '/corridor/djibouti', roles: ['super_admin', 'executive', 'operations_manager'] },
  { prefix: '/operations/transitor-clearance', roles: ['super_admin', 'executive', 'operations_manager', 'finance_officer', 'djibouti_clearing_agent'] },
  { prefix: '/operations/clearance', roles: ['super_admin', 'executive', 'operations_manager', 'finance_officer', 'djibouti_clearing_agent'] },
  { prefix: '/operations/corridor-dispatch', roles: ['super_admin', 'executive', 'operations_manager', 'dispatcher', 'corridor_dispatch_agent'] },
  { prefix: '/corridor-dispatch', roles: ['super_admin', 'executive', 'operations_manager', 'dispatcher'] },
  { prefix: '/corridor/dispatch', roles: ['super_admin', 'executive', 'operations_manager', 'dispatcher'] },
  { prefix: '/operations/dry-port-yard', roles: ['super_admin', 'executive', 'operations_manager', 'technical_manager', 'dry_port_yard_agent'] },
  { prefix: '/operations/empty-return', roles: ['super_admin', 'executive', 'operations_manager', 'technical_manager', 'dry_port_yard_agent'] },
  { prefix: '/corridor/empty-return', roles: ['super_admin', 'executive', 'operations_manager', 'technical_manager'] },
  { prefix: '/operations/yard-desk', roles: ['super_admin', 'executive', 'operations_manager', 'technical_manager'] },
  { prefix: '/corridor/yard', roles: ['super_admin', 'executive', 'operations_manager', 'technical_manager'] },
  { prefix: '/corridor/finance-control', roles: ['super_admin', 'executive', 'finance_officer'] },
  { prefix: '/hr', roles: ['super_admin', 'hr_officer'] },
  { prefix: '/payments', roles: ['super_admin', 'finance_officer', 'customer'] },
  { prefix: '/chat', roles: ['super_admin', 'operations_manager', 'dispatcher', 'customer'] },
  { prefix: '/notifications', roles: ['super_admin', 'executive', 'operations_manager', 'dispatcher', 'technical_manager', 'finance_officer', 'hr_officer', 'marketing_officer', 'customer'] },
  { prefix: '/users', roles: ['super_admin'] },
  { prefix: '/profile', roles: ['super_admin', 'executive', 'operations_manager', 'dispatcher', 'technical_manager', 'finance_officer', 'hr_officer', 'marketing_officer', 'customer'] },
  { prefix: '/account', roles: ['super_admin', 'executive', 'operations_manager', 'dispatcher', 'technical_manager', 'finance_officer', 'hr_officer', 'marketing_officer', 'customer'] },
  { prefix: '/operations-status', roles: ['super_admin', 'executive'] },
  { prefix: '/settings', roles: ['super_admin'] },
  { prefix: '/customer', roles: ['customer'] },
];

export function navForRole(role: ConsoleRole) {
  return navGroups
    .map((group) => ({
      ...group,
      items: sidebarItems.filter((item) => item.group === group.key && roleCanSeeNav(role, item.roles)),
    }))
    .filter((group) => group.items.length);
}

export function routeMeta(pathname: string) {
  const match = sidebarItems
    .filter((item) => item.href !== '/')
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  if (pathname === '/') {
    return { title: 'Executive Dashboard', subtitle: '' };
  }

  const corridorMeta: Record<string, { title: string; subtitle: string }> = {
    '/supplier-agent': {
      title: 'Tikur Abay Port Agent Desk (China)',
      subtitle: '',
    },
    '/china-desk': {
      title: 'China Port Agent Desk',
      subtitle: 'Shenzhen / Yantian origin operations',
    },
    '/china-desk/queue': {
      title: 'China Port Agent Desk',
      subtitle: 'Shenzhen / Yantian origin operations',
    },
    '/china-desk/files': {
      title: 'China Port Agent Desk',
      subtitle: 'Shenzhen / Yantian origin operations',
    },
    '/operations/supplier-agent': {
      title: 'Tikur Abay Port Agent Desk (China)',
      subtitle: '',
    },
    '/djibouti-release': {
      title: 'Multimodal / Djibouti Release Desk',
      subtitle: '',
    },
    '/operations/djibouti-release': {
      title: 'Multimodal / Djibouti Release Desk',
      subtitle: '',
    },
    '/corridor/djibouti': {
      title: 'Multimodal / Djibouti Release Desk',
      subtitle: '',
    },
    '/operations/booking-quote': {
      title: 'Booking / Quote Desk',
      subtitle: '',
    },
    '/operations/booking': {
      title: 'Booking / Quote Desk',
      subtitle: '',
    },
    '/shipping': {
      title: 'Shipping Workspace',
      subtitle: 'Shipping instructions, BL, manifest, and release orchestration',
    },
    '/operations/shipping': {
      title: 'Shipping Workspace',
      subtitle: 'Shipping instructions, BL, manifest, and release orchestration',
    },
    '/bookings/new': {
      title: 'Booking / Quote Desk',
      subtitle: '',
    },
    '/shipments/intake': {
      title: 'Booking / Quote Desk',
      subtitle: '',
    },
    '/booking': {
      title: 'Booking / Quote Desk',
      subtitle: '',
    },
    '/operations/transitor-clearance': {
      title: 'Transitor / Clearance Desk',
      subtitle: '',
    },
    '/operations/clearance': {
      title: 'Transitor / Clearance Desk',
      subtitle: '',
    },
    '/operations/corridor-dispatch': {
      title: 'Corridor Dispatch',
      subtitle: '',
    },
    '/corridor-dispatch': {
      title: 'Corridor Dispatch',
      subtitle: '',
    },
    '/corridor/dispatch': {
      title: 'Corridor Dispatch',
      subtitle: '',
    },
    '/corridor/yard': {
      title: 'Yard / Delivery Desk',
      subtitle: '',
    },
    '/operations/dry-port-yard': {
      title: 'Yard / Delivery Desk',
      subtitle: '',
    },
    '/operations/empty-return': {
      title: 'Empty Return Control',
      subtitle: '',
    },
    '/corridor/empty-return': {
      title: 'Empty Return Control',
      subtitle: '',
    },
    '/operations/yard-desk': {
      title: 'Yard / Delivery Desk',
      subtitle: '',
    },
    '/corridor/finance-control': {
      title: 'Finance / Customs Control',
      subtitle: '',
    },
    '/tracking': {
      title: 'Container Track',
      subtitle: 'Container, trip, and live location visibility',
    },
  };

  const corridorMatch = Object.entries(corridorMeta).find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (corridorMatch) {
    return corridorMatch[1];
  }

  if (match) {
    return { title: match.label, subtitle: '' };
  }

  return { title: 'Tikur Abay', subtitle: '' };
}

export function canAccessPath(role: ConsoleRole, pathname: string) {
  return canAccessConsolePath(role, pathname);
}
