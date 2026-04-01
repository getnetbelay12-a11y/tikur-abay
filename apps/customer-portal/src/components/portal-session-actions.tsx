'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiLogout, customerPortalSessionKey } from '../lib/api';

type PortalSessionSnapshot = {
  email?: string;
  contactName?: string;
  companyName?: string;
  customerCode?: string;
  loggedInAt?: string;
};

function inferCustomerIdentity(session: PortalSessionSnapshot | null) {
  if (!session) {
    return {
      companyName: 'Tikur Abay Customer Workspace',
      contactName: 'Customer user',
      customerCode: 'LIVE',
    };
  }

  const email = String(session.email || '').trim();
  const companyName = String(session.companyName || '').trim()
    || (email ? `${email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (part) => part.toUpperCase())}` : 'Customer account');
  const contactName = String(session.contactName || '').trim()
    || (email ? email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (part) => part.toUpperCase()) : 'Customer user');
  const customerCode = String(session.customerCode || '').trim()
    || (email ? email.split('@')[0].toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 12) : 'LIVE');

  return { companyName, contactName, customerCode };
}

export function PortalSessionActions() {
  const router = useRouter();
  const [session, setSession] = useState<PortalSessionSnapshot | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw =
      window.localStorage.getItem(customerPortalSessionKey) ||
      window.sessionStorage.getItem(customerPortalSessionKey);
    if (!raw) return;
    try {
      setSession(JSON.parse(raw) as PortalSessionSnapshot);
    } catch {
      setSession(null);
    }
  }, []);

  const identity = useMemo(() => inferCustomerIdentity(session), [session]);

  async function handleLogout() {
    await apiLogout();
    router.push('/auth/login');
    router.refresh();
  }

  return (
    <>
      <div className="portal-identity">
        <strong>{identity.companyName}</strong>
        <span>{identity.contactName} · {identity.customerCode}</span>
      </div>
      <button type="button" className="portal-profile-pill">{identity.contactName}</button>
      <button type="button" className="portal-icon-button" onClick={handleLogout} aria-label="Sign out">
        Log out
      </button>
    </>
  );
}
