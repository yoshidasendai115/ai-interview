/**
 * 管理者ログアウトAPI
 * POST /api/admin/auth/logout
 */

import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';

export async function POST(): Promise<NextResponse> {
  try {
    await clearSessionCookie();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'ログアウト処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
