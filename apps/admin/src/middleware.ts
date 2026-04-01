import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { canAccessPath, dashboardRouteByRole, type ConsoleRole } from './lib/console-config';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicTrackingRoute = pathname === '/shipping/track' || pathname === '/track' || pathname.startsWith('/track/');

  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.')) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/auth/login')) {
    return NextResponse.next();
  }

  if (isPublicTrackingRoute) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/access-denied')) {
    return NextResponse.next();
  }

  const token = request.cookies.get('tikur_abay_token')?.value;
  const role = request.cookies.get('tikur_abay_role')?.value as ConsoleRole | undefined;

  if (!token || !role) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  if (!canAccessPath(role, pathname)) {
    return NextResponse.redirect(new URL(dashboardRouteByRole[role], request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
