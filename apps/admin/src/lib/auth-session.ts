'use client';

import { ConsoleSession, dashboardRouteByRole } from './console-config';

function readCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null;
}

export function saveSession(accessToken: string, refreshToken: string, user: ConsoleSession) {
  localStorage.setItem('tikur-abay-admin-token', accessToken);
  localStorage.setItem('tikur-abay-admin-refresh-token', refreshToken);
  localStorage.setItem('tikur-abay-admin-user', JSON.stringify(user));
  document.cookie = `tikur_abay_token=${accessToken}; path=/; max-age=86400; samesite=lax`;
  document.cookie = `tikur_abay_refresh_token=${refreshToken}; path=/; max-age=2592000; samesite=lax`;
  document.cookie = `tikur_abay_role=${user.role}; path=/; max-age=86400; samesite=lax`;
}

export function clearSession() {
  localStorage.removeItem('tikur-abay-admin-token');
  localStorage.removeItem('tikur-abay-admin-refresh-token');
  localStorage.removeItem('tikur-abay-admin-user');
  sessionStorage.removeItem('tikur-abay-admin-user');
  document.cookie = 'tikur_abay_token=; path=/; max-age=0; samesite=lax';
  document.cookie = 'tikur_abay_refresh_token=; path=/; max-age=0; samesite=lax';
  document.cookie = 'tikur_abay_role=; path=/; max-age=0; samesite=lax';
}

export function readSession(): ConsoleSession | null {
  let raw: string | null = null;
  let token: string | null = null;
  try {
    raw = localStorage.getItem('tikur-abay-admin-user');
    token = localStorage.getItem('tikur-abay-admin-token') || readCookie('tikur_abay_token');
  } catch {
    return null;
  }

  if (!raw || !token) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as ConsoleSession;
    if (!parsed?.role || !(parsed.role in dashboardRouteByRole)) {
      clearSession();
      return null;
    }
    return {
      ...parsed,
      dashboardRoute: parsed.dashboardRoute || dashboardRouteByRole[parsed.role],
    };
  } catch {
    clearSession();
    return null;
  }
}

export function readToken() {
  return localStorage.getItem('tikur-abay-admin-token') || readCookie('tikur_abay_token');
}

export function readRefreshToken() {
  return localStorage.getItem('tikur-abay-admin-refresh-token') || readCookie('tikur_abay_refresh_token');
}
