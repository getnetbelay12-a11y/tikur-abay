'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { clearSession } from '../lib/auth-session';
import { apiLogout } from '../lib/api';
import type { ConsoleSession } from '../lib/console-config';
import { ChevronDownIcon, SearchIcon } from './console-icons';
import { ConsoleCommandHeader } from './console-command-header';

const chinaDeskNav = [
  { href: '/china-desk/queue', label: 'Origin Queue', icon: 'OQ', badge: '8' },
  { href: '/china-desk/queue#supplier-checklist', label: 'Readiness Checklist', icon: 'RC', badge: '5' },
  { href: '/china-desk/queue#supplier-handoff', label: 'Vessel Planning', icon: 'VP' },
  { href: '/china-desk/queue#supplier-container', label: 'Gate-in / Stuffing', icon: 'GS' },
  { href: '/china-desk/queue#supplier-documents', label: 'Documents', icon: 'DC', badge: '2' },
  { href: '/shipping', label: 'Shipping Workspace', icon: 'SW' },
  { href: '/china-desk/queue#supplier-handoff', label: 'Handoff', icon: 'HF' },
  { href: '/account', label: 'Desk Settings', icon: 'DS' },
] as const;

function normalizeSearchReference(value: string) {
  return String(value || '').trim().toUpperCase();
}

function normalizeBookingReference(value: string) {
  const normalized = normalizeSearchReference(value);
  if (normalized.startsWith('TRP-')) return normalized.slice(4);
  if (normalized.startsWith('TRIP-')) return normalized.slice(5);
  return normalized;
}

function deriveDeskSearchContext(query: string) {
  const normalized = normalizeSearchReference(query);
  const isBooking = normalized.startsWith('BK-') || normalized.startsWith('TRP-') || normalized.startsWith('TRIP-');
  const isContainer = /^[A-Z]{4}\d{6,7}$/.test(normalized);
  return {
    booking: isBooking ? normalizeBookingReference(normalized) : null,
    container: isContainer ? normalized : null,
  };
}

export function ChinaDeskShell({
  children,
  session,
}: {
  children: ReactNode;
  session: ConsoleSession;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(searchParams.get('query') || searchParams.get('q') || '');

  useEffect(() => {
    setSearchValue(searchParams.get('query') || searchParams.get('q') || '');
  }, [searchParams]);

  function updateQuery(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (!value || value === 'all') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  const handleLogout = async () => {
    await apiLogout();
    clearSession();
    router.replace('/auth/login');
  };

  return (
    <div className="china-desk-shell">
      <aside className="china-desk-sidebar">
        <div className="china-desk-sidebar-main">
          <div className="china-desk-identity">
            <div className="china-desk-identity-avatar">{session.firstName[0] ?? 'L'}{session.lastName[0] ?? 'M'}</div>
            <div className="china-desk-identity-copy">
              <span className="china-desk-identity-kicker">Origin Desk</span>
              <strong>{session.role === 'super_admin' ? 'Origin Operations Lead' : session.name}</strong>
              <span>{session.email || 'supplier.agent@tikurabay.com'}</span>
              <em>China port operations</em>
            </div>
          </div>
          <div className="china-desk-nav-label">Desk Navigation</div>
          <nav className="china-desk-nav" aria-label="Port agent navigation">
            {chinaDeskNav.map((item) => (
              <Link
                key={`${item.href}:${item.label}`}
                href={item.href}
                className={
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`) ||
                  (item.href === '/shipping' && (pathname.startsWith('/operations/shipping') || pathname.startsWith('/shipping')))
                    ? 'active'
                    : ''
                }
              >
                <span className="china-desk-nav-icon" aria-hidden="true">{item.icon}</span>
                <span className="china-desk-nav-text">{item.label}</span>
                {'badge' in item && item.badge ? <span className="china-desk-nav-badge">{item.badge}</span> : null}
              </Link>
            ))}
          </nav>

          <div className="china-desk-alert-card">
            <span className="china-desk-alert-kicker">Next Action</span>
            <strong>1 critical issue open</strong>
            <span>Clear origin blockers before vessel handoff and document release.</span>
            <Link href="/china-desk/queue#supplier-checklist" className="china-desk-alert-action">View Issues</Link>
          </div>
        </div>

        <div className="china-desk-sidebar-footer">
          <div className="china-desk-sidecard">
            <span className="china-desk-sidecard-kicker">Desk scope</span>
            <strong>Origin file, stuffing, documents, and handoff</strong>
            <span>Keep the origin file complete before release moves downstream.</span>
          </div>
        </div>
      </aside>

      <div className="china-desk-main">
        <div className="console-topbar china-command-topbar">
          <ConsoleCommandHeader
            title="China Port Agent Desk"
            subtitle="Origin operations desk"
            contextTitle=""
            contextSubtitle=""
            tools={
              <form
                className="search-box"
                onSubmit={(event) => {
                  event.preventDefault();
                  const normalized = searchValue.trim();
                  const context = deriveDeskSearchContext(normalized);
                  updateQuery({
                    query: normalized || null,
                    q: null,
                    booking: context.booking,
                    container: context.container,
                  });
                }}
              >
                <SearchIcon size={16} className="search-box-icon" />
                <input
                  className="field field-compact"
                  aria-label="Search shipment, container, supplier"
                  placeholder="Search shipment, container, supplier"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                />
              </form>
            }
            profile={
              <div className="profile-menu">
                <div className="profile-trigger" role="button" tabIndex={0} onClick={() => setMenuOpen((value) => !value)} onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setMenuOpen((value) => !value);
                  }
                }} data-testid="china-session-menu">
                  <span className="profile-avatar">{session.firstName[0] ?? 'C'}{session.lastName[0] ?? 'N'}</span>
                  <span className="profile-copy">
                    <strong>{session.role === 'super_admin' ? 'Origin Operations Lead' : session.name}</strong>
                    <small>Supplier Agent</small>
                    <button
                      type="button"
                      className="profile-inline-signout"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleLogout();
                      }}
                    >
                      Sign out
                    </button>
                  </span>
                  <ChevronDownIcon size={16} className={menuOpen ? 'rotate-180' : undefined} />
                </div>
                {menuOpen ? (
                  <div className="profile-dropdown">
                    <Link href="/profile" onClick={() => setMenuOpen(false)}>Profile</Link>
                    <Link href="/account" onClick={() => setMenuOpen(false)}>My Account</Link>
                    <button type="button" onClick={() => void handleLogout()}>
                      Sign out
                    </button>
                  </div>
                ) : null}
              </div>
            }
          />
        </div>
        <div className="china-desk-content">{children}</div>
      </div>
    </div>
  );
}
