'use client';

/**
 * スコア設定フォーム
 * グレード閾値・パフォーマンス評価・レベル調整・業務適性を編集
 */

import { useState } from 'react';
import type { ScoringConfig, GradeThreshold } from '@/types/evaluationConfig';

interface ScoringConfigFormProps {
  config: ScoringConfig;
  onSave: (config: ScoringConfig) => Promise<void>;
  isSaving: boolean;
}

export default function ScoringConfigForm({ config, onSave, isSaving }: ScoringConfigFormProps) {
  const [formData, setFormData] = useState<ScoringConfig>(config);
  const [errors, setErrors] = useState<string[]>([]);

  const handleGradeChange = (index: number, field: keyof GradeThreshold, value: string) => {
    setFormData((prev) => ({
      ...prev,
      gradeThresholds: prev.gradeThresholds.map((g, i) =>
        i === index
          ? { ...g, [field]: field === 'minScore' ? parseInt(value, 10) : value }
          : g
      ),
    }));
  };

  const handlePerformanceChange = (field: string, value: string) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) return;

    setFormData((prev) => ({
      ...prev,
      performanceGrades: {
        ...prev.performanceGrades,
        [field]: numValue,
      },
    }));
  };

  const handleLevelAdjustmentChange = (field: string, value: string) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) return;

    setFormData((prev) => ({
      ...prev,
      levelAdjustment: {
        ...prev.levelAdjustment,
        [field]: numValue,
      },
    }));
  };

  const handleJobSuitabilityChange = (key: string, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      jobSuitability: {
        ...prev.jobSuitability,
        [key]: {
          ...prev.jobSuitability[key],
          [field]: field === 'minScore' ? parseInt(value, 10) : value,
        },
      },
    }));
  };

  const validate = (): boolean => {
    const newErrors: string[] = [];

    // gradeThresholds must be in descending minScore order
    const minScores = formData.gradeThresholds.map((g) => g.minScore);
    for (let i = 0; i < minScores.length - 1; i++) {
      if (minScores[i] < minScores[i + 1]) {
        newErrors.push('グレードの最低スコアは降順である必要があります');
        break;
      }
    }

    // performanceGrades must be descending
    const { excellentMin, goodMin, passMin } = formData.performanceGrades;
    if (!(excellentMin > goodMin && goodMin > passMin)) {
      newErrors.push('パフォーマンスグレードは excellent > good > pass の降順である必要があります');
    }

    // levelAdjustment: high > low
    if (formData.levelAdjustment.highThreshold <= formData.levelAdjustment.lowThreshold) {
      newErrors.push('レベル上昇閾値はレベル下降閾値より大きい必要があります');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSave(formData);
  };

  const JOB_SUITABILITY_LABELS: Record<string, string> = {
    basicService: '基本接客（N4相当）',
    generalWork: '一般業務（N3相当）',
    businessHonorifics: 'ビジネス敬語（N2相当）',
    advancedWork: '高度業務（N1相当）',
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

      {/* グレード閾値 */}
      <section>
        <h3 className="text-lg font-semibold mb-4">グレード閾値</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border p-2 text-left">グレード</th>
                <th className="border p-2 text-center">ラベル</th>
                <th className="border p-2 text-center">最低スコア</th>
                <th className="border p-2 text-left">推奨事項</th>
              </tr>
            </thead>
            <tbody>
              {formData.gradeThresholds.map((grade, index) => (
                <tr key={grade.grade}>
                  <td className="border p-2 font-medium">{grade.grade}</td>
                  <td className="border p-2">
                    <input
                      type="text"
                      value={grade.label}
                      onChange={(e) => handleGradeChange(index, 'label', e.target.value)}
                      className="w-full px-2 py-1 border rounded"
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={grade.minScore}
                      onChange={(e) => handleGradeChange(index, 'minScore', e.target.value)}
                      className="w-20 px-2 py-1 border rounded text-center"
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      type="text"
                      value={grade.recommendation}
                      onChange={(e) =>
                        handleGradeChange(index, 'recommendation', e.target.value)
                      }
                      className="w-full px-2 py-1 border rounded"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* パフォーマンスグレード */}
      <section>
        <h3 className="text-lg font-semibold mb-4">パフォーマンスグレード</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Excellent (最低スコア)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.performanceGrades.excellentMin}
              onChange={(e) => handlePerformanceChange('excellentMin', e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Good (最低スコア)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.performanceGrades.goodMin}
              onChange={(e) => handlePerformanceChange('goodMin', e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Pass (最低スコア)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.performanceGrades.passMin}
              onChange={(e) => handlePerformanceChange('passMin', e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
        </div>
      </section>

      {/* レベル調整 */}
      <section>
        <h3 className="text-lg font-semibold mb-4">レベル調整</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">上昇閾値</label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.levelAdjustment.highThreshold}
              onChange={(e) =>
                handleLevelAdjustmentChange('highThreshold', e.target.value)
              }
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">下降閾値</label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.levelAdjustment.lowThreshold}
              onChange={(e) =>
                handleLevelAdjustmentChange('lowThreshold', e.target.value)
              }
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">1日のチャレンジ上限</label>
            <input
              type="number"
              min="1"
              max="100"
              value={formData.levelAdjustment.dailyChallengeLimit}
              onChange={(e) =>
                handleLevelAdjustmentChange('dailyChallengeLimit', e.target.value)
              }
              className="w-full px-3 py-2 border rounded"
            />
          </div>
        </div>
      </section>

      {/* 業務適性 */}
      <section>
        <h3 className="text-lg font-semibold mb-4">業務適性判定</h3>
        <div className="space-y-3">
          {Object.entries(JOB_SUITABILITY_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center gap-4">
              <span className="w-48 text-sm font-medium">{label}</span>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">必要レベル:</label>
                <select
                  value={formData.jobSuitability[key].requiredLevel}
                  onChange={(e) =>
                    handleJobSuitabilityChange(key, 'requiredLevel', e.target.value)
                  }
                  className="px-2 py-1 border rounded"
                >
                  {['N1', 'N2', 'N3', 'N4', 'N5'].map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">最低スコア:</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.jobSuitability[key].minScore}
                  onChange={(e) =>
                    handleJobSuitabilityChange(key, 'minScore', e.target.value)
                  }
                  className="w-20 px-2 py-1 border rounded text-center"
                />
              </div>
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
