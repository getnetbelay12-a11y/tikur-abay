'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiBase, persistPortalAuth } from '../../../lib/api';

export function CustomerLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('customer1@tikurabay.com');
  const [password, setPassword] = useState('ChangeMe123!');
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const response = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      setError('Login failed');
      return;
    }

    const payload = (await response.json()) as {
      accessToken?: string;
      refreshToken?: string;
      user?: Record<string, unknown>;
    };
    const localName = email.split('@')[0] || 'customer';
    const inferredName = localName
      .replace(/[._-]+/g, ' ')
      .replace(/\b\w/g, (part) => part.toUpperCase());
    persistPortalAuth({
      accessToken: payload.accessToken || '',
      refreshToken: payload.refreshToken,
      user: payload.user,
      session: {
        email,
        contactName: String(payload.user?.name || inferredName),
        companyName: String(payload.user?.companyName || payload.user?.customerName || `${inferredName} Account`),
        customerCode: String(payload.user?.customerCode || localName.toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 12) || 'LIVE'),
        loggedInAt: new Date().toISOString(),
      },
    });

    router.push('/dashboard');
  }

  return (
    <form className="portal-auth-form" onSubmit={submit}>
      <label className="portal-auth-field">
        <span>Email address</span>
        <input
          className="portal-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="customer1@tikurabay.com"
          autoComplete="email"
        />
      </label>
      <label className="portal-auth-field">
        <span>Password</span>
        <input
          className="portal-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          autoComplete="current-password"
        />
      </label>
      {error ? <div className="portal-auth-error">{error}</div> : null}
      <button className="portal-auth-submit" type="submit">Sign in</button>
      <p className="portal-auth-helper">
        Customer access is limited to shipment tracking, documents, support, receipt confirmation, and empty-return visibility.
      </p>
    </form>
  );
}
