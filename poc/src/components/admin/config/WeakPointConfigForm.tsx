'use client';

/**
 * 弱点分析設定フォーム
 * 弱点検出閾値・優先度計算パラメータを編集
 */

import { useState } from 'react';
import type { WeakPointConfig } from '@/types/evaluationConfig';

interface WeakPointConfigFormProps {
  config: WeakPointConfig;
  onSave: (config: WeakPointConfig) => Promise<void>;
  isSaving: boolean;
}

export default function WeakPointConfigForm({
  config,
  onSave,
  isSaving,
}: WeakPointConfigFormProps) {
  const [formData, setFormData] = useState<WeakPointConfig>(config);
  const [errors, setErrors] = useState<string[]>([]);

  const handleChange = (field: string, value: string) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) return;

    setFormData((prev) => ({
      ...prev,
      [field]: numValue,
    }));
  };

  const handlePriorityChange = (field: string, value: string) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) return;

    setFormData((prev) => ({
      ...prev,
      priority: {
        ...prev.priority,
        [field]: numValue,
      },
    }));
  };

  const validate = (): boolean => {
    const newErrors: string[] = [];

    if (formData.resolutionScore <= formData.threshold) {
      newErrors.push('解消スコアは検出閾値より大きい必要があります');
    }

    if (formData.priority.highThreshold <= formData.priority.mediumThreshold) {
      newErrors.push('優先度の高閾値は中閾値より大きい必要があります');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* エラー表示 */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h4 className="text-red-800 font-medium mb-2">バリデーションエラー</h4>
          <ul className="text-red-600 text-sm list-disc list-inside">
            {errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 基本閾値 */}
      <section>
        <h3 className="text-lg font-semibold mb-4">基本閾値</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-1">
              苦手検出閾値
              <span className="text-gray-500 ml-1">（このスコア未満で苦手候補）</span>
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.threshold}
              onChange={(e) => handleChange('threshold', e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              タグ登録閾値
              <span className="text-gray-500 ml-1">（この回数以上で苦手タグ確定）</span>
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={formData.tagThreshold}
              onChange={(e) => handleChange('tagThreshold', e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              解消必要回数
              <span className="text-gray-500 ml-1">（連続高スコアの回数）</span>
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={formData.resolutionCount}
              onChange={(e) => handleChange('resolutionCount', e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              解消スコア
              <span className="text-gray-500 ml-1">（この以上で高スコア判定）</span>
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.resolutionScore}
              onChange={(e) => handleChange('resolutionScore', e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
        </div>
      </section>

      {/* 優先度計算パラメータ */}
      <section>
        <h3 className="text-lg font-semibold mb-4">優先度計算パラメータ</h3>
        <p className="text-sm text-gray-600 mb-4">
          優先度スコア = (発生回数 x 乗数) + max(0, ウィンドウ日数 - 最終発生からの日数)
        </p>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-1">発生回数乗数</label>
            <input
              type="number"
              min="1"
              max="100"
              value={formData.priority.occurrenceMultiplier}
              onChange={(e) => handlePriorityChange('occurrenceMultiplier', e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">直近ウィンドウ（日数）</label>
            <input
              type="number"
              min="1"
              max="365"
              value={formData.priority.recencyWindowDays}
              onChange={(e) => handlePriorityChange('recencyWindowDays', e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              高優先度閾値
              <span className="text-gray-500 ml-1">（スコア以上でhigh）</span>
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.priority.highThreshold}
              onChange={(e) => handlePriorityChange('highThreshold', e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              中優先度閾値
              <span className="text-gray-500 ml-1">（スコア以上でmedium）</span>
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.priority.mediumThreshold}
              onChange={(e) => handlePriorityChange('mediumThreshold', e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
        </div>
      </section>

      {/* 保存ボタン */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? '保存中...' : '設定を保存'}
        </button>
      </div>
    </form>
  );
}
