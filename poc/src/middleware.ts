/**
 * Next.js ミドルウェア - 認証チェック
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'development-secret-key-please-change-in-production'
);
const COOKIE_NAME = 'admin_session';

// 認証が必要なパス（/admin/* で /admin/login 以外）
const PROTECTED_PATHS = ['/admin'];
const PUBLIC_ADMIN_PATHS = ['/admin/login'];

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // /admin配下でない場合はスキップ
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // ログインページは認証不要
  if (PUBLIC_ADMIN_PATHS.some((path) => pathname === path)) {
    // 既に認証済みならダッシュボードにリダイレクト
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (token) {
      try {
        await jwtVerify(token, JWT_SECRET);
        return NextResponse.redirect(new URL('/admin/questions', request.url));
      } catch {
        // トークンが無効な場合はそのままログインページへ
      }
    }
    return NextResponse.next();
  }

  // 保護されたパスの認証チェック
  if (PROTECTED_PATHS.some((path) => pathname.startsWith(path))) {
    const token = request.cookies.get(COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    try {
      await jwtVerify(token, JWT_SECRET);
      return NextResponse.next();
    } catch {
      // トークンが無効な場合はログインページにリダイレクト
      const response = NextResponse.redirect(new URL('/admin/login', request.url));
      response.cookies.delete(COOKIE_NAME);
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
