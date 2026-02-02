/**
 * 現在のセッション情報取得API
 * GET /api/admin/auth/me
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import type { AdminUserPublic } from '@/types/admin';

interface MeResponse {
  authenticated: boolean;
  user?: AdminUserPublic;
}

export async function GET(): Promise<NextResponse<MeResponse>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.userId,
        email: session.email,
        name: session.name,
        role: session.role,
      },
    });
  } catch (error) {
    console.error('Get session error:', error);
    return NextResponse.json({ authenticated: false });
  }
}
