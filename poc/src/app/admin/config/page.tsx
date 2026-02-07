'use client';

/**
 * 評価設定管理ページ
 * タブUIでJLPT・スコア・弱点分析の設定を管理
 */

import { useState, useEffect, useCallback } from 'react';
import JLPTConfigForm from '@/components/admin/config/JLPTConfigForm';
import ScoringConfigForm from '@/components/admin/config/ScoringConfigForm';
import WeakPointConfigForm from '@/components/admin/config/WeakPointConfigForm';
import ConfigHistoryPanel from '@/components/admin/config/ConfigHistoryPanel';
import {
  DEFAULT_JLPT_CONFIG,
  DEFAULT_SCORING_CONFIG,
  DEFAULT_WEAK_POINT_CONFIG,
} from '@/data/defaultEvaluationConfig';
import {
  fetchAllEvaluationConfigs,
  updateEvaluationConfig,
} from '@/services/configService';
import type {
  JLPTConfig,
  ScoringConfig,
  WeakPointConfig,
} from '@/types/evaluationConfig';

type TabId = 'jlpt' | 'scoring' | 'weakpoint' | 'history';

interface Tab {
  id: TabId;
  label: string;
  configKey?: string;
}

const TABS: Tab[] = [
  { id: 'jlpt', label: 'JLPT設定', configKey: 'jlpt_config' },
  { id: 'scoring', label: 'スコア設定', configKey: 'scoring_config' },
  { id: 'weakpoint', label: '弱点分析設定', configKey: 'weak_point_config' },
  { id: 'history', label: '変更履歴' },
];

export default function EvaluationConfigPage() {
  const [activeTab, setActiveTab] = useState<TabId>('jlpt');
  const [jlptConfig, setJlptConfig] = useState<JLPTConfig>(DEFAULT_JLPT_CONFIG);
  const [scoringConfig, setScoringConfig] = useState<ScoringConfig>(DEFAULT_SCORING_CONFIG);
  const [weakPointConfig, setWeakPointConfig] = useState<WeakPointConfig>(DEFAULT_WEAK_POINT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [historyConfigKey, setHistoryConfigKey] = useState('jlpt_config');

  const loadConfigs = useCallback(async () => {
    setIsLoading(true);
    try {
      const configs = await fetchAllEvaluationConfigs();
      setJlptConfig(configs.jlpt_config);
      setScoringConfig(configs.scoring_config);
      setWeakPointConfig(configs.weak_point_config);
    } catch {
      setErrorMessage('設定の読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setErrorMessage(null);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setSuccessMessage(null);
  };

  const handleSaveJLPT = async (config: JLPTConfig) => {
    setIsSaving(true);
    try {
      await updateEvaluationConfig('jlpt_config', config as unknown as Record<string, unknown>);
      setJlptConfig(config);
      showSuccess('JLPT設定を保存しました');
    } catch (err) {
      showError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveScoring = async (config: ScoringConfig) => {
    setIsSaving(true);
    try {
      await updateEvaluationConfig('scoring_config', config as unknown as Record<string, unknown>);
      setScoringConfig(config);
      showSuccess('スコア設定を保存しました');
    } catch (err) {
      showError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveWeakPoint = async (config: WeakPointConfig) => {
    setIsSaving(true);
    try {
      await updateEvaluationConfig('weak_point_config', config as unknown as Record<string, unknown>);
      setWeakPointConfig(config);
      showSuccess('弱点分析設定を保存しました');
    } catch (err) {
      showError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <span className="ml-3 text-gray-600">設定を読み込み中...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">評価設定管理</h1>

      {/* 成功/エラーメッセージ */}
      {successMessage && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-3 text-green-700">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3 text-red-700">
          {errorMessage}
        </div>
      )}

      {/* タブ */}
      <div className="border-b mb-6">
        <nav className="flex space-x-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* タブコンテンツ */}
      <div className="bg-white rounded-lg shadow p-6">
        {activeTab === 'jlpt' && (
          <JLPTConfigForm
            config={jlptConfig}
            onSave={handleSaveJLPT}
            isSaving={isSaving}
          />
        )}

        {activeTab === 'scoring' && (
          <ScoringConfigForm
            config={scoringConfig}
            onSave={handleSaveScoring}
            isSaving={isSaving}
          />
        )}

        {activeTab === 'weakpoint' && (
          <WeakPointConfigForm
            config={weakPointConfig}
            onSave={handleSaveWeakPoint}
            isSaving={isSaving}
          />
        )}

        {activeTab === 'history' && (
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">設定キー</label>
              <select
                value={historyConfigKey}
                onChange={(e) => setHistoryConfigKey(e.target.value)}
                className="px-3 py-2 border rounded"
              >
                <option value="jlpt_config">JLPT設定</option>
                <option value="scoring_config">スコア設定</option>
                <option value="weak_point_config">弱点分析設定</option>
              </select>
            </div>
            <ConfigHistoryPanel
              configKey={historyConfigKey}
              token=""
            />
          </div>
        )}
      </div>
    </div>
  );
}
