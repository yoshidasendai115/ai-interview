/**
 * 評価設定データへのアクセス層
 * fs/promises で evaluation_config.json を読み書き
 */

import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import type {
  EvaluationConfigEntry,
  ConfigHistoryEntry,
} from '@/types/evaluationConfig';

interface EvaluationConfigFile {
  configs: EvaluationConfigEntry[];
  history: ConfigHistoryEntry[];
}

const CONFIG_FILE_PATH = path.join(
  process.cwd(),
  '..',
  'backend',
  'app',
  'data',
  'seed',
  'evaluation_config.json'
);

/**
 * 設定ファイルを読み込む
 */
async function loadConfigFile(): Promise<EvaluationConfigFile> {
  const data = await readFile(CONFIG_FILE_PATH, 'utf-8');
  return JSON.parse(data) as EvaluationConfigFile;
}

/**
 * 設定ファイルを保存する
 */
async function saveConfigFile(configFile: EvaluationConfigFile): Promise<void> {
  const data = JSON.stringify(configFile, null, 2);
  await writeFile(CONFIG_FILE_PATH, data, 'utf-8');
}

/**
 * 全設定を取得
 */
export async function getAllConfigs(): Promise<EvaluationConfigEntry[]> {
  const file = await loadConfigFile();
  return file.configs;
}

/**
 * 設定キーで単一設定を取得
 */
export async function getConfigByKey(configKey: string): Promise<EvaluationConfigEntry | null> {
  const file = await loadConfigFile();
  return file.configs.find((c) => c.config_key === configKey) ?? null;
}

/**
 * 設定を更新（履歴も記録）
 */
export async function updateConfig(
  configKey: string,
  configValue: Record<string, unknown>,
  description?: string
): Promise<EvaluationConfigEntry> {
  const file = await loadConfigFile();

  const index = file.configs.findIndex((c) => c.config_key === configKey);
  if (index === -1) {
    throw new Error(`設定キー ${configKey} が見つかりません`);
  }

  const existing = file.configs[index];
  const previousValue = existing.config_value;
  const newVersion = existing.version + 1;
  const now = new Date().toISOString();

  // 変更履歴を追加
  const historyEntry: ConfigHistoryEntry = {
    id: randomUUID(),
    config_key: configKey,
    previous_value: previousValue,
    new_value: configValue,
    version: newVersion,
    changed_by: null,
    changed_at: now,
  };
  file.history.unshift(historyEntry);

  // 設定を更新
  const updatedEntry: EvaluationConfigEntry = {
    ...existing,
    config_value: configValue,
    description: description ?? existing.description,
    version: newVersion,
    updated_at: now,
  };
  file.configs[index] = updatedEntry;

  await saveConfigFile(file);

  return updatedEntry;
}

/**
 * 設定キーの変更履歴を取得
 */
export async function getConfigHistory(
  configKey: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ history: ConfigHistoryEntry[]; total: number }> {
  const file = await loadConfigFile();

  const filtered = file.history.filter((h) => h.config_key === configKey);
  const total = filtered.length;
  const sliced = filtered.slice(offset, offset + limit);

  return { history: sliced, total };
}
