import type { ReactNode } from 'react';
import Link from 'next/link';
import { PortalSessionActions } from './portal-session-actions';

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/bookings', label: 'Booking / Quote' },
  { href: '/shipments', label: 'Shipments' },
  { href: '/documents', label: 'Documents' },
  { href: '/payments', label: 'Payments' },
  { href: '/support', label: 'Support' },
];

function nextStepHint(currentPath: string) {
  if (currentPath === '/bookings') {
    return { tone: 'orange', label: 'Book shipment', text: 'Enter shipment details, get the quote, review the offer, and convert accepted quotes into bookings' };
  }
  if (currentPath === '/shipments') {
    return { tone: 'orange', label: 'Track shipment', text: 'Track the shipment from origin to empty return and confirm receipt when delivery completes' };
  }
  if (currentPath === '/documents') {
    return { tone: 'orange', label: 'Review documents', text: 'Review BL, POD, and return receipt visibility' };
  }
  if (currentPath === '/support') {
    return { tone: 'orange', label: 'Support action', text: 'Open support only if shortage or damage exists' };
  }
  return { tone: 'orange', label: 'Book shipment', text: 'Enter shipment details, get the quote, and book the shipment' };
}

export function PortalFrame({
  currentPath,
  title,
  subtitle,
  children,
}: {
  currentPath: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const nextHint = nextStepHint(currentPath);

  return (
    <main>
      <div className="portal-shell">
        <header className="portal-header">
          <div className="portal-header-main">
            <div className="portal-brand-mark">TA</div>
            <div className="portal-brand">
              <span>Tikur Abay Customer Portal</span>
              <h1>{title}</h1>
            </div>
          </div>
          <div className="portal-header-actions">
            <button type="button" className="portal-icon-button" aria-label="Notifications">N</button>
            <Link href="/support" className="portal-icon-button" aria-label="Support">S</Link>
            <PortalSessionActions />
          </div>
        </header>

        <div className="portal-topbar">
          <nav className="portal-nav" aria-label="Customer portal navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={item.href === currentPath || (item.href === '/dashboard' && currentPath === '/') ? 'active' : ''}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="portal-nav-summary">
            <div className={`portal-next-step portal-next-step-${nextHint.tone}`}>
              <span className="portal-next-step-dot" />
              <span className="portal-next-step-label">{nextHint.label}</span>
              <strong>{nextHint.text}</strong>
            </div>
            <Link className="portal-btn" href="/bookings">Get Quote / Book</Link>
          </div>
        </div>

        {children}
      </div>
    </main>
  );
}
