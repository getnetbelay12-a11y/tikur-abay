'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveSession } from '../../../lib/auth-session';
import { apiPost } from '../../../lib/api';
import { ConsoleSession } from '../../../lib/console-config';
import { persistConsoleLanguage, translate, type ConsoleLanguage } from '../../../lib/i18n';

type LoginResult = {
  accessToken: string;
  refreshToken: string;
  user: ConsoleSession;
};

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('superadmin@tikurabay.com');
  const [password, setPassword] = useState('ChangeMe123!');
  const [language, setLanguage] = useState<ConsoleLanguage>(() => {
    if (typeof window === 'undefined') return 'en';
    const stored = window.localStorage.getItem('tikur-abay-console-language');
    return stored === 'am' ? 'am' : 'en';
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const t = (key: string, fallback?: string) => translate(language, key, fallback);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await apiPost<LoginResult>('/auth/login', { email, password });
      saveSession(result.accessToken, result.refreshToken, result.user);
      router.push(result.user.dashboardRoute);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form id="login-card" onSubmit={submit} className="card login-card">
      <div className="login-brand-block login-card-brand-block">
        <div className="login-logo-shell">
          <img
            src="/branding/tikur-abay-logo.png"
            alt="Tikur Abay Transport logo"
            className="login-logo"
          />
        </div>
        <div className="login-brand-label">Tikur Abay</div>
        <h1 className="login-brand-title">Tikur Abay Manager Console</h1>
        <p className="login-brand-subtitle">China origin, ocean handoff, Djibouti release, inland tracking, customer approval, and empty return in one workspace.</p>
      </div>

      <div className="login-card-topline">
        <label className="workspace-filter-field">
          <span>{t('language', 'Language')}</span>
          <select
            className="field"
            value={language}
            onChange={(event) => {
              const nextLanguage = event.target.value as ConsoleLanguage;
              setLanguage(nextLanguage);
              persistConsoleLanguage(nextLanguage, { explicit: true });
            }}
          >
            <option value="en">{t('languageEnglish', 'English')}</option>
            <option value="am">{t('languageAmharic', 'Amharic')}</option>
          </select>
        </label>
      </div>

      <div className="login-card-copy">
        <h2>Sign in to access your workspace.</h2>
        <p>Trusted access for shipment, release, dispatch, yard, finance, and customer-support teams.</p>
      </div>

      <div className="login-form-grid">
        <label className="login-field">
          <span>Email</span>
          <input
            className="field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@tikurabay.com"
            autoComplete="email"
          />
        </label>

        <label className="login-field">
          <span>{t('password', 'Password')}</span>
          <input
            className="field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('password', 'Password')}
            type="password"
            autoComplete="current-password"
          />
        </label>

        {error ? <div className="login-error">{error}</div> : null}

        <button className="btn login-submit-btn" disabled={loading} type="submit">
          {loading ? (
            <span className="login-loading">
              <span className="login-spinner" aria-hidden="true" />
              Signing in...
            </span>
          ) : t('enterConsole', 'Sign in')}
        </button>

        <div className="login-support-row">
          <a href="#">Forgot password</a>
          <a href="#">Support</a>
        </div>

        <div className="login-secure-note">Secure access for authorized Tikur Abay teams.</div>
      </div>
    </form>
  );
}
