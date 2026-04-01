export type CanonicalConsoleRole =
  | 'super_admin'
  | 'executive_supervisor'
  | 'supplier_agent'
  | 'djibouti_release_agent'
  | 'djibouti_clearing_agent'
  | 'corridor_dispatch_agent'
  | 'dry_port_yard_agent'
  | 'finance_customs_control'
  | 'customer_support_agent'
  | 'customer_user'
  | 'customer_agent'
  | 'hr_officer'
  | 'driver_console_user';

export type ConsoleRole =
  | CanonicalConsoleRole
  | 'executive'
  | 'operations_manager'
  | 'dispatcher'
  | 'technical_manager'
  | 'finance_officer'
  | 'marketing_officer'
  | 'customer'
  | 'driver';

export const roleAliases: Record<ConsoleRole, CanonicalConsoleRole> = {
  super_admin: 'super_admin',
  executive_supervisor: 'executive_supervisor',
  executive: 'executive_supervisor',
  supplier_agent: 'supplier_agent',
  marketing_officer: 'supplier_agent',
  djibouti_release_agent: 'djibouti_release_agent',
  djibouti_clearing_agent: 'djibouti_clearing_agent',
  operations_manager: 'executive_supervisor',
  corridor_dispatch_agent: 'corridor_dispatch_agent',
  dispatcher: 'corridor_dispatch_agent',
  dry_port_yard_agent: 'dry_port_yard_agent',
  technical_manager: 'dry_port_yard_agent',
  finance_customs_control: 'finance_customs_control',
  finance_officer: 'finance_customs_control',
  customer_support_agent: 'customer_support_agent',
  customer_user: 'customer_user',
  customer_agent: 'customer_agent',
  customer: 'customer_user',
  hr_officer: 'hr_officer',
  driver: 'driver_console_user',
  driver_console_user: 'driver_console_user',
};

export function normalizeConsoleRole(role: ConsoleRole | string | null | undefined): CanonicalConsoleRole | null {
  if (!role) return null;
  return roleAliases[role as ConsoleRole] ?? null;
}

const sharedCorridorRoutes = [
  '/shipments/intake',
  '/bookings/new',
  '/booking',
  '/operations/booking',
  '/operations/booking-quote',
  '/shipping',
  '/operations/shipping',
  '/track',
  '/china-desk',
  '/china-desk/queue',
  '/china-desk/files',
  '/supplier-agent',
  '/operations/supplier-agent',
  '/djibouti-release',
  '/operations/djibouti-release',
  '/corridor/djibouti',
  '/operations/transitor-clearance',
  '/operations/clearance',
  '/operations/corridor-dispatch',
  '/corridor-dispatch',
  '/corridor/dispatch',
  '/operations/dry-port-yard',
  '/operations/empty-return',
  '/corridor/empty-return',
  '/operations/yard-desk',
  '/corridor/yard',
  '/tracking',
] as const;

const accessByCanonicalRole: Record<CanonicalConsoleRole, string[]> = {
  super_admin: ['/', '/dashboards/executive', '/operations-status', '/profile', '/account', '/settings', '/users', ...sharedCorridorRoutes],
  executive_supervisor: ['/dashboards/executive', '/operations-status', '/profile', '/account', ...sharedCorridorRoutes],
  supplier_agent: [
    '/shipments/intake',
    '/bookings/new',
    '/booking',
    '/operations/booking',
    '/operations/booking-quote',
    '/shipping',
    '/operations/shipping',
    '/china-desk',
    '/china-desk/queue',
    '/china-desk/files',
    '/supplier-agent',
    '/operations/supplier-agent',
    '/profile',
    '/account',
  ],
  djibouti_release_agent: ['/djibouti-release', '/operations/djibouti-release', '/corridor/djibouti', '/profile', '/account'],
  djibouti_clearing_agent: ['/operations/transitor-clearance', '/operations/clearance', '/profile', '/account'],
  corridor_dispatch_agent: ['/operations/corridor-dispatch', '/corridor-dispatch', '/corridor/dispatch', '/profile', '/account'],
  dry_port_yard_agent: ['/operations/dry-port-yard', '/operations/empty-return', '/corridor/empty-return', '/operations/yard-desk', '/corridor/yard', '/profile', '/account'],
  finance_customs_control: ['/corridor/finance-control', '/finance', '/profile', '/account'],
  customer_support_agent: ['/chat', '/profile', '/account'],
  customer_user: ['/customer', '/profile', '/account'],
  customer_agent: ['/customer', '/profile', '/account'],
  hr_officer: ['/hr', '/profile', '/account'],
  driver_console_user: ['/tracking', '/profile', '/account'],
};

export const dashboardRouteByCanonicalRole: Record<CanonicalConsoleRole, string> = {
  super_admin: '/',
  executive_supervisor: '/dashboards/executive',
  supplier_agent: '/china-desk/queue',
  djibouti_release_agent: '/operations/djibouti-release',
  djibouti_clearing_agent: '/operations/transitor-clearance',
  corridor_dispatch_agent: '/operations/corridor-dispatch',
  dry_port_yard_agent: '/operations/dry-port-yard',
  finance_customs_control: '/finance',
  customer_support_agent: '/customer',
  customer_user: '/customer',
  customer_agent: '/customer',
  hr_officer: '/hr',
  driver_console_user: '/tracking',
};

export const dashboardRouteByRole = Object.fromEntries(
  Object.keys(roleAliases).map((role) => {
    const normalized = roleAliases[role as ConsoleRole];
    return [role, dashboardRouteByCanonicalRole[normalized]];
  }),
) as Record<ConsoleRole, string>;

export function canAccessConsolePath(role: ConsoleRole | string | null | undefined, pathname: string) {
  if (pathname === '/auth/login') return true;
  const normalized = normalizeConsoleRole(role);
  if (!normalized) return false;
  const allowed = accessByCanonicalRole[normalized];
  return allowed.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function roleCanSeeNav(role: ConsoleRole, itemRoles: readonly ConsoleRole[]) {
  const normalized = normalizeConsoleRole(role);
  return itemRoles.some((itemRole) => {
    const itemNormalized = normalizeConsoleRole(itemRole);
    return itemRole === role || (normalized !== null && itemNormalized === normalized);
  });
}
