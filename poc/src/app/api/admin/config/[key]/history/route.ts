/**
 * 評価設定 変更履歴API（管理者用）
 * GET /api/admin/config/:key/history - 変更履歴を取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { getConfigHistory } from '@/lib/data/evaluationConfig';
import type { ConfigHistoryListResponse } from '@/types/evaluationConfig';

interface RouteParams {
  params: Promise<{ key: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ConfigHistoryListResponse | { error: string }>> {
  try {
    const { key } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const result = await getConfigHistory(key, limit, offset);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Get config history error:', error);
    return NextResponse.json(
      { error: '変更履歴の取得に失敗しました' },
      { status: 500 }
    );
  }
}
