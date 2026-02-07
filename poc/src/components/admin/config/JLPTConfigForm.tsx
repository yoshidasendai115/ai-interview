'use client';

/**
 * JLPT設定フォーム
 * レベル別の重み・設定・推定レベル範囲を編集
 */

import { useState } from 'react';
import type { JLPTConfig, JLPTLevelWeights, JLPTLevelSettings } from '@/types/evaluationConfig';
import type { JLPTLevel } from '@/types/interview';

const JLPT_LEVELS: JLPTLevel[] = ['N1', 'N2', 'N3', 'N4', 'N5'];
const WEIGHT_CATEGORIES = ['vocabulary', 'grammar', 'content', 'honorifics'] as const;
const WEIGHT_LABELS: Record<string, string> = {
  vocabulary: '語彙',
  grammar: '文法',
  content: '内容',
  honorifics: '敬語',
};

interface JLPTConfigFormProps {
  config: JLPTConfig;
  onSave: (config: JLPTConfig) => Promise<void>;
  isSaving: boolean;
}

export default function JLPTConfigForm({ config, onSave, isSaving }: JLPTConfigFormProps) {
  const [formData, setFormData] = useState<JLPTConfig>(config);
  const [errors, setErrors] = useState<string[]>([]);

  const handleWeightChange = (level: JLPTLevel, category: string, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    setFormData((prev) => ({
      ...prev,
      weights: {
        ...prev.weights,
        [level]: {
          ...prev.weights[level],
          [category]: numValue,
        },
      },
    }));
  };

  const handleSettingChange = (
    level: JLPTLevel,
    field: keyof JLPTLevelSettings,
    value: string | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        [level]: {
          ...prev.settings[level],
          [field]: typeof value === 'boolean' ? value : parseFloat(value as string),
        },
      },
    }));
  };

  const handleEstimationRangeChange = (level: JLPTLevel, value: string) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) return;

    setFormData((prev) => ({
      ...prev,
      estimationRanges: {
        ...prev.estimationRanges,
        [level]: numValue,
      },
    }));
  };

  const validate = (): boolean => {
    const newErrors: string[] = [];

    for (const level of JLPT_LEVELS) {
      const weights = formData.weights[level];
      const sum = weights.vocabulary + weights.grammar + weights.content + weights.honorifics;
      if (Math.abs(sum - 1.0) > 0.001) {
        newErrors.push(`${level} の重みの合計が1.0ではありません（現在: ${sum.toFixed(4)}）`);
      }
    }

    const ranges = formData.estimationRanges;
    if (!(ranges.N1 > ranges.N2 && ranges.N2 > ranges.N3 && ranges.N3 > ranges.N4 && ranges.N4 > ranges.N5)) {
      newErrors.push('推定レベル範囲はN1 > N2 > N3 > N4 > N5の降順である必要があります');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSave(formData);
  };

  const getWeightsSum = (level: JLPTLevel): number => {
    const w = formData.weights[level];
    return w.vocabulary + w.grammar + w.content + w.honorifics;
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

      {/* レベル別重み */}
      <section>
        <h3 className="text-lg font-semibold mb-4">レベル別評価重み</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border p-2 text-left">レベル</th>
                {WEIGHT_CATEGORIES.map((cat) => (
                  <th key={cat} className="border p-2 text-center">
                    {WEIGHT_LABELS[cat]}
                  </th>
                ))}
                <th className="border p-2 text-center">合計</th>
              </tr>
            </thead>
            <tbody>
              {JLPT_LEVELS.map((level) => {
                const sum = getWeightsSum(level);
                const isValid = Math.abs(sum - 1.0) <= 0.001;
                return (
                  <tr key={level}>
                    <td className="border p-2 font-medium">{level}</td>
                    {WEIGHT_CATEGORIES.map((cat) => (
                      <td key={cat} className="border p-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value={formData.weights[level][cat]}
                          onChange={(e) => handleWeightChange(level, cat, e.target.value)}
                          className="w-20 px-2 py-1 border rounded text-center"
                        />
                      </td>
                    ))}
                    <td
                      className={`border p-2 text-center font-medium ${
                        isValid ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {sum.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* レベル別設定 */}
      <section>
        <h3 className="text-lg font-semibold mb-4">レベル別話速・フォローアップ設定</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border p-2 text-left">レベル</th>
                <th className="border p-2 text-center">話速</th>
                <th className="border p-2 text-center">簡易版使用</th>
                <th className="border p-2 text-center">フォローアップ深度</th>
              </tr>
            </thead>
            <tbody>
              {JLPT_LEVELS.map((level) => (
                <tr key={level}>
                  <td className="border p-2 font-medium">{level}</td>
                  <td className="border p-2">
                    <input
                      type="number"
                      step="0.05"
                      min="0.1"
                      max="2.0"
                      value={formData.settings[level].speechRate}
                      onChange={(e) => handleSettingChange(level, 'speechRate', e.target.value)}
                      className="w-20 px-2 py-1 border rounded text-center"
                    />
                  </td>
                  <td className="border p-2 text-center">
                    <input
                      type="checkbox"
                      checked={formData.settings[level].useSimplified}
                      onChange={(e) =>
                        handleSettingChange(level, 'useSimplified', e.target.checked)
                      }
                      className="w-4 h-4"
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={formData.settings[level].followUpDepth}
                      onChange={(e) =>
                        handleSettingChange(level, 'followUpDepth', e.target.value)
                      }
                      className="w-20 px-2 py-1 border rounded text-center"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 推定レベル範囲 */}
      <section>
        <h3 className="text-lg font-semibold mb-4">推定レベル範囲（最低スコア）</h3>
        <div className="grid grid-cols-5 gap-4">
          {JLPT_LEVELS.map((level) => (
            <div key={level}>
              <label className="block text-sm font-medium mb-1">{level}</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.estimationRanges[level]}
                onChange={(e) => handleEstimationRangeChange(level, e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
          ))}
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
