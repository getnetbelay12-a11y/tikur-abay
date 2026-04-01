export const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:6012/api/v1';
const healthUrl = process.env.NEXT_PUBLIC_API_HEALTH_URL || `${apiBase.replace(/\/api\/v1$/, '')}/api/v1/health`;

function readCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null;
}

function persistTokens(accessToken: string, refreshToken?: string, user?: unknown) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('tikur-abay-admin-token', accessToken);
  document.cookie = `tikur_abay_token=${accessToken}; path=/; max-age=86400; samesite=lax`;
  if (refreshToken) {
    window.localStorage.setItem('tikur-abay-admin-refresh-token', refreshToken);
    document.cookie = `tikur_abay_refresh_token=${refreshToken}; path=/; max-age=2592000; samesite=lax`;
  }
  if (user) {
    window.localStorage.setItem('tikur-abay-admin-user', JSON.stringify(user));
  }
}

function handleAuthFailure() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem('tikur-abay-admin-token');
  window.localStorage.removeItem('tikur-abay-admin-refresh-token');
  window.localStorage.removeItem('tikur-abay-admin-user');
  document.cookie = 'tikur_abay_token=; path=/; max-age=0; samesite=lax';
  document.cookie = 'tikur_abay_refresh_token=; path=/; max-age=0; samesite=lax';
  document.cookie = 'tikur_abay_role=; path=/; max-age=0; samesite=lax';

  if (!window.location.pathname.startsWith('/auth/login')) {
    window.location.assign('/auth/login?reason=session-expired');
  }
}

function authHeaders() {
  if (typeof window === 'undefined') {
    return {} as Record<string, string>;
  }

  const token = window.localStorage.getItem('tikur-abay-admin-token') || readCookie('tikur_abay_token');
  return token ? { Authorization: `Bearer ${token}` } : ({} as Record<string, string>);
}

async function tryRefreshToken() {
  if (typeof window === 'undefined') return false;
  const refreshToken = window.localStorage.getItem('tikur-abay-admin-refresh-token') || readCookie('tikur_abay_refresh_token');
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${apiBase}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) {
      return false;
    }
    const payload = (await response.json()) as { accessToken: string; refreshToken?: string; user?: unknown };
    persistTokens(payload.accessToken, payload.refreshToken, payload.user);
    return true;
  } catch {
    return false;
  }
}

export async function apiHealth() {
  const response = await fetch(healthUrl, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Backend unavailable');
  }
  return response.json() as Promise<{ status: string; database?: { connected?: boolean; name?: string | null } }>;
}

export async function apiGet<T>(path: string): Promise<T> {
  let response = await fetch(`${apiBase}${path}`, { cache: 'no-store', headers: authHeaders() });
  if (response.status === 401) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      response = await fetch(`${apiBase}${path}`, { cache: 'no-store', headers: authHeaders() });
    }
  }
  if (response.status === 401) {
    handleAuthFailure();
    throw new Error('Your session expired. Please sign in again.');
  }
  if (response.status === 403) {
    throw new Error('You do not have permission to perform this action.');
  }
  if (!response.ok) {
    throw new Error(`GET ${path} failed`);
  }
  return response.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBase}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(`API unavailable at ${apiBase}`);
  }

  if (response.status === 401) {
    const refreshed = path === '/auth/refresh-token' ? false : await tryRefreshToken();
    if (refreshed) {
      return apiPost<T>(path, body);
    }
  }
  if (response.status === 401) {
    handleAuthFailure();
    throw new Error('Your session expired. Please sign in again.');
  }
  if (response.status === 403) {
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message || 'You do not have permission to perform this action.');
  }

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message || `POST ${path} failed`);
  }

  return response.json() as Promise<T>;
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBase}${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(`API unavailable at ${apiBase}`);
  }

  if (response.status === 401) {
    const refreshed = path === '/auth/refresh-token' ? false : await tryRefreshToken();
    if (refreshed) {
      return apiPatch<T>(path, body);
    }
  }
  if (response.status === 401) {
    handleAuthFailure();
    throw new Error('Your session expired. Please sign in again.');
  }
  if (response.status === 403) {
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message || 'You do not have permission to perform this action.');
  }

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message || `PATCH ${path} failed`);
  }

  return response.json() as Promise<T>;
}

export async function apiLogout() {
  if (typeof window === 'undefined') return;
  const refreshToken = window.localStorage.getItem('tikur-abay-admin-refresh-token');
  if (!refreshToken) return;
  try {
    await fetch(`${apiBase}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    // best-effort
  }
}
