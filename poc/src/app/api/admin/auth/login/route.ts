/**
 * 管理者ログインAPI
 * POST /api/admin/auth/login
 */

import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/lib/validations/auth';
import {
  findAdminByEmail,
  verifyPassword,
  generateToken,
  setSessionCookie,
  toPublicUser,
} from '@/lib/auth';
import type { LoginResponse } from '@/types/admin';

export async function POST(request: NextRequest): Promise<NextResponse<LoginResponse>> {
  try {
    const body = await request.json();

    // バリデーション
    const validationResult = loginSchema.safeParse(body);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return NextResponse.json(
        { success: false, error: firstError.message },
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data;

    // ユーザー検索
    const user = findAdminByEmail(email);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'メールアドレスまたはパスワードが正しくありません' },
        { status: 401 }
      );
    }

    // パスワード検証
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'メールアドレスまたはパスワードが正しくありません' },
        { status: 401 }
      );
    }

    // JWTトークン生成
    const publicUser = toPublicUser(user);
    const token = await generateToken(publicUser);

    // Cookieにセット
    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      user: publicUser,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'ログイン処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
