'use client';

export const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:6012/api/v1';
export const customerPortalSessionKey = 'tikur-abay:customer-portal:session';
const accessTokenStorageKey = 'tikur-abay:customer-portal:access-token';
const refreshTokenStorageKey = 'tikur-abay:customer-portal:refresh-token';
const userStorageKey = 'tikur-abay:customer-portal:user';

type PortalPersistedSession = {
  email?: string;
  contactName?: string;
  companyName?: string;
  customerCode?: string;
  loggedInAt?: string;
};

function readCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null;
}

function writeCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; samesite=lax`;
}

function clearCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
}

export function readPortalSession(): PortalPersistedSession | null {
  if (typeof window === 'undefined') return null;
  const raw =
    window.localStorage.getItem(customerPortalSessionKey) ||
    window.sessionStorage.getItem(customerPortalSessionKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PortalPersistedSession;
  } catch {
    return null;
  }
}

export function hasPortalAuth() {
  if (typeof window === 'undefined') return false;
  return Boolean(
    window.localStorage.getItem(accessTokenStorageKey) ||
    window.sessionStorage.getItem(accessTokenStorageKey) ||
    readCookie('tikur_abay_customer_token'),
  );
}

export function persistPortalAuth(payload: {
  accessToken: string;
  refreshToken?: string | null;
  user?: Record<string, unknown> | null;
  session?: PortalPersistedSession | null;
}) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(accessTokenStorageKey, payload.accessToken);
  window.sessionStorage.setItem(accessTokenStorageKey, payload.accessToken);
  writeCookie('tikur_abay_customer_token', payload.accessToken, 86400);

  if (payload.refreshToken) {
    window.localStorage.setItem(refreshTokenStorageKey, payload.refreshToken);
    window.sessionStorage.setItem(refreshTokenStorageKey, payload.refreshToken);
    writeCookie('tikur_abay_customer_refresh_token', payload.refreshToken, 2592000);
  }

  if (payload.user) {
    const rawUser = JSON.stringify(payload.user);
    window.localStorage.setItem(userStorageKey, rawUser);
    window.sessionStorage.setItem(userStorageKey, rawUser);
  }

  if (payload.session) {
    const rawSession = JSON.stringify(payload.session);
    window.localStorage.setItem(customerPortalSessionKey, rawSession);
    window.sessionStorage.setItem(customerPortalSessionKey, rawSession);
  }
}

export function clearPortalAuth() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(accessTokenStorageKey);
  window.localStorage.removeItem(refreshTokenStorageKey);
  window.localStorage.removeItem(userStorageKey);
  window.localStorage.removeItem(customerPortalSessionKey);
  window.sessionStorage.removeItem(accessTokenStorageKey);
  window.sessionStorage.removeItem(refreshTokenStorageKey);
  window.sessionStorage.removeItem(userStorageKey);
  window.sessionStorage.removeItem(customerPortalSessionKey);
  clearCookie('tikur_abay_customer_token');
  clearCookie('tikur_abay_customer_refresh_token');
}

function authHeaders() {
  if (typeof window === 'undefined') {
    return {} as Record<string, string>;
  }
  const token =
    window.localStorage.getItem(accessTokenStorageKey) ||
    window.sessionStorage.getItem(accessTokenStorageKey) ||
    readCookie('tikur_abay_customer_token');
  return token ? { Authorization: `Bearer ${token}` } : ({} as Record<string, string>);
}

async function tryRefreshToken() {
  if (typeof window === 'undefined') return false;
  const refreshToken =
    window.localStorage.getItem(refreshTokenStorageKey) ||
    window.sessionStorage.getItem(refreshTokenStorageKey) ||
    readCookie('tikur_abay_customer_refresh_token');
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${apiBase}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return false;
    const payload = (await response.json()) as {
      accessToken: string;
      refreshToken?: string;
      user?: Record<string, unknown>;
    };
    persistPortalAuth({
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      user: payload.user,
      session: readPortalSession(),
    });
    return true;
  } catch {
    return false;
  }
}

function handleAuthFailure() {
  clearPortalAuth();
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth/login')) {
    window.location.assign('/auth/login?reason=session-expired');
  }
}

async function request<T>(method: 'GET' | 'POST' | 'PATCH', path: string, body?: unknown): Promise<T> {
  const doFetch = () =>
    fetch(`${apiBase}${path}`, {
      method,
      cache: 'no-store',
      headers: {
        ...(method === 'GET' ? {} : { 'Content-Type': 'application/json' }),
        ...authHeaders(),
      },
      body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
    });

  let response: Response;
  try {
    response = await doFetch();
  } catch {
    throw new Error('Customer platform is unavailable right now.');
  }

  if (response.status === 401 && path !== '/auth/refresh-token') {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      response = await doFetch();
    }
  }

  if (response.status === 401) {
    handleAuthFailure();
    throw new Error('Your session expired. Please sign in again.');
  }

  if (response.status === 403) {
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(payload.message || 'You do not have access to this record.');
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(payload.message || `${method} ${path} failed`);
  }

  return response.json() as Promise<T>;
}

export function apiGet<T>(path: string) {
  return request<T>('GET', path);
}

export function apiPost<T>(path: string, body: unknown) {
  return request<T>('POST', path, body);
}

export function apiPatch<T>(path: string, body: unknown) {
  return request<T>('PATCH', path, body);
}

export async function apiLogout() {
  if (typeof window === 'undefined') return;
  const refreshToken =
    window.localStorage.getItem(refreshTokenStorageKey) ||
    window.sessionStorage.getItem(refreshTokenStorageKey) ||
    readCookie('tikur_abay_customer_refresh_token');
  try {
    if (refreshToken) {
      await fetch(`${apiBase}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
    }
  } catch {
    // best effort
  } finally {
    clearPortalAuth();
  }
}
