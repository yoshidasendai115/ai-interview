/**
 * 評価設定 個別API（管理者用）
 * GET  /api/admin/config/:key - 単一設定を取得
 * PUT  /api/admin/config/:key - 設定を更新
 */

import { NextRequest, NextResponse } from 'next/server';
import { getConfigByKey, updateConfig } from '@/lib/data/evaluationConfig';
import type { EvaluationConfigEntry } from '@/types/evaluationConfig';

interface RouteParams {
  params: Promise<{ key: string }>;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<EvaluationConfigEntry | { error: string }>> {
  try {
    const { key } = await params;
    const config = await getConfigByKey(key);

    if (!config) {
      return NextResponse.json(
        { error: `設定キー ${key} が見つかりません` },
        { status: 404 }
      );
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Get config error:', error);
    return NextResponse.json(
      { error: '設定の取得に失敗しました' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<EvaluationConfigEntry | { error: string }>> {
  try {
    const { key } = await params;
    const body = await request.json();

    const configValue = body.config_value as Record<string, unknown>;
    if (!configValue) {
      return NextResponse.json(
        { error: 'config_value は必須です' },
        { status: 400 }
      );
    }

    const updated = await updateConfig(key, configValue, body.description as string | undefined);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update config error:', error);
    const message = error instanceof Error ? error.message : '設定の更新に失敗しました';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
