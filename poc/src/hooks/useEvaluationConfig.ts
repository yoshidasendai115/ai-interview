/**
 * 評価設定取得フック
 * APIから評価設定を取得し、キャッシュする
 */

import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_EVALUATION_CONFIG } from '@/data/defaultEvaluationConfig';
import { fetchAllEvaluationConfigs } from '@/services/configService';
import type {
  EvaluationConfigValues,
  JLPTConfig,
  ScoringConfig,
  WeakPointConfig,
} from '@/types/evaluationConfig';

interface UseEvaluationConfigReturn {
  config: EvaluationConfigValues;
  jlptConfig: JLPTConfig;
  scoringConfig: ScoringConfig;
  weakPointConfig: WeakPointConfig;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Module-level cache to avoid redundant API calls across component mounts
let cachedConfig: EvaluationConfigValues | null = null;
let fetchPromise: Promise<EvaluationConfigValues> | null = null;

/**
 * 評価設定を取得・管理するフック
 *
 * - 初回マウント時にAPIから設定を取得
 * - 取得失敗時はデフォルト値を使用
 * - モジュールレベルのキャッシュで重複リクエストを防止
 */
export function useEvaluationConfig(): UseEvaluationConfigReturn {
  const [config, setConfig] = useState<EvaluationConfigValues>(
    cachedConfig ?? DEFAULT_EVALUATION_CONFIG
  );
  const [isLoading, setIsLoading] = useState(cachedConfig === null);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Deduplicate in-flight requests
      if (fetchPromise === null) {
        fetchPromise = fetchAllEvaluationConfigs();
      }

      const result = await fetchPromise;
      cachedConfig = result;
      setConfig(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load config';
      setError(message);
      console.warn('[useEvaluationConfig] Using default config:', message);
    } finally {
      setIsLoading(false);
      fetchPromise = null;
    }
  }, []);

  useEffect(() => {
    if (cachedConfig !== null) {
      setConfig(cachedConfig);
      setIsLoading(false);
      return;
    }

    loadConfig();
  }, [loadConfig]);

  const refetch = useCallback(async () => {
    cachedConfig = null;
    fetchPromise = null;
    await loadConfig();
  }, [loadConfig]);

  return {
    config,
    jlptConfig: config.jlpt_config,
    scoringConfig: config.scoring_config,
    weakPointConfig: config.weak_point_config,
    isLoading,
    error,
    refetch,
  };
}
