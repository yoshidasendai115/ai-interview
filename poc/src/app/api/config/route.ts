/**
 * 評価設定API（公開）
 * GET /api/config - 全設定を取得
 */

import { NextResponse } from 'next/server';
import { getAllConfigs } from '@/lib/data/evaluationConfig';
import type { EvaluationConfigListResponse } from '@/types/evaluationConfig';

export async function GET(): Promise<NextResponse<EvaluationConfigListResponse>> {
  try {
    const configs = await getAllConfigs();
    return NextResponse.json({ configs });
  } catch (error) {
    console.error('Get evaluation configs error:', error);
    return NextResponse.json({ configs: [] }, { status: 500 });
  }
}
