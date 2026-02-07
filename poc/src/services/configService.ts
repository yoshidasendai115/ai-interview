/**
 * 評価設定取得サービス
 * PoC API Routes（Next.js）から評価設定を取得し、フォールバック処理を行う
 */

import { DEFAULT_EVALUATION_CONFIG } from '@/data/defaultEvaluationConfig';
import type {
  ConfigHistoryListResponse,
  EvaluationConfigEntry,
  EvaluationConfigListResponse,
  EvaluationConfigValues,
  JLPTConfig,
  ScoringConfig,
  WeakPointConfig,
} from '@/types/evaluationConfig';

/**
 * 全評価設定を取得
 */
export async function fetchAllEvaluationConfigs(): Promise<EvaluationConfigValues> {
  try {
    const response = await fetch('/api/config');

    if (!response.ok) {
      console.warn('[configService] Failed to fetch configs, using defaults');
      return DEFAULT_EVALUATION_CONFIG;
    }

    const data: EvaluationConfigListResponse = await response.json();
    return parseConfigList(data.configs);
  } catch (error) {
    console.warn('[configService] Error fetching configs, using defaults:', error);
    return DEFAULT_EVALUATION_CONFIG;
  }
}

/**
 * 単一の設定を取得
 */
export async function fetchEvaluationConfig(
  configKey: string
): Promise<EvaluationConfigEntry | null> {
  try {
    const response = await fetch(`/api/admin/config/${configKey}`);

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.warn(`[configService] Error fetching config ${configKey}:`, error);
    return null;
  }
}

/**
 * 設定を更新（管理者用）
 * Next.js API Routes はcookieで認証するためtokenは不要
 */
export async function updateEvaluationConfig(
  configKey: string,
  configValue: Record<string, unknown>,
  _token?: string,
  description?: string
): Promise<EvaluationConfigEntry> {
  const response = await fetch(`/api/admin/config/${configKey}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      config_value: configValue,
      description,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update config');
  }

  return await response.json();
}

/**
 * 設定変更履歴を取得（管理者用）
 * Next.js API Routes はcookieで認証するためtokenは不要
 */
export async function fetchConfigHistory(
  configKey: string,
  _token?: string,
  limit: number = 20,
  offset: number = 0
): Promise<ConfigHistoryListResponse> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });

  const response = await fetch(
    `/api/admin/config/${configKey}/history?${params}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch config history');
  }

  return await response.json();
}

/**
 * APIレスポンスをパースしてEvaluationConfigValuesに変換
 */
function parseConfigList(configs: EvaluationConfigEntry[]): EvaluationConfigValues {
  const result: EvaluationConfigValues = { ...DEFAULT_EVALUATION_CONFIG };

  for (const config of configs) {
    switch (config.config_key) {
      case 'jlpt_config':
        result.jlpt_config = config.config_value as unknown as JLPTConfig;
        break;
      case 'scoring_config':
        result.scoring_config = config.config_value as unknown as ScoringConfig;
        break;
      case 'weak_point_config':
        result.weak_point_config = config.config_value as unknown as WeakPointConfig;
        break;
    }
  }

  return result;
}
