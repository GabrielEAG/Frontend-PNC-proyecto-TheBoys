import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicRoutes = ['/', '/login', '/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = publicRoutes.some(r => pathname === r || pathname.startsWith('/api'));
  if (isPublic) return NextResponse.next();


  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
