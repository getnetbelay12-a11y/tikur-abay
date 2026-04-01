import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const serverApiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:6012/api/v1';

export class ServerApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: 'network' | 'unauthorized' | 'forbidden' | 'empty' | 'unknown',
  ) {
    super(message);
    this.name = 'ServerApiError';
  }
}

export async function serverApiGet<T>(
  path: string,
  options?: { revalidate?: number },
): Promise<T> {
  const token = (await cookies()).get('tikur_abay_token')?.value;
  if (!token) {
    redirect('/auth/login');
  }

  let response: Response;
  try {
    response = await fetch(`${serverApiBase}${path}`, {
      cache: options?.revalidate ? 'force-cache' : 'no-store',
      next: options?.revalidate ? { revalidate: options.revalidate } : undefined,
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new ServerApiError(`Unable to reach ${serverApiBase}${path}`, undefined, 'network');
  }

  if (response.status === 401 || response.status === 403) {
    redirect('/auth/login');
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    throw new ServerApiError(
      payload.message || `GET ${path} failed`,
      response.status,
      response.status === 403 ? 'forbidden' : 'unknown',
    );
  }

  return response.json() as Promise<T>;
}
