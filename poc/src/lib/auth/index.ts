/**
 * 認証ユーティリティ
 */

import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import type { AuthSession, AdminUser, AdminUserPublic } from '@/types/admin';

// JWT設定
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'development-secret-key-please-change-in-production'
);
const JWT_EXPIRES_IN = '24h';
const COOKIE_NAME = 'admin_session';

/**
 * パスワードをハッシュ化する
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * パスワードを検証する
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * JWTトークンを生成する
 */
export async function generateToken(user: AdminUserPublic): Promise<string> {
  const token = await new SignJWT({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(JWT_SECRET);

  return token;
}

/**
 * JWTトークンを検証してセッション情報を取得する
 */
export async function verifyToken(token: string): Promise<AuthSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AuthSession;
  } catch {
    return null;
  }
}

/**
 * セッションCookieを設定する
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24時間
    path: '/',
  });
}

/**
 * セッションCookieを削除する
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * 現在のセッションを取得する
 */
export async function getSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifyToken(token);
}

/**
 * AdminUserからAdminUserPublicに変換する
 */
export function toPublicUser(user: AdminUser): AdminUserPublic {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

// 開発用のデフォルト管理者（本番環境ではデータベースから取得）
export const DEFAULT_ADMIN_USERS: AdminUser[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'admin@ai-interview.local',
    // パスワード: admin12345
    password_hash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4oa7O9oK/Eg5J8ee',
    name: '管理者',
    role: 'admin',
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-02-01T00:00:00Z',
    last_login_at: null,
  },
];

/**
 * メールアドレスで管理者を検索する（開発用）
 * 本番環境ではデータベースクエリに置き換える
 */
export function findAdminByEmail(email: string): AdminUser | undefined {
  return DEFAULT_ADMIN_USERS.find((user) => user.email === email);
}
