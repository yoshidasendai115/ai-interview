'use client';

/**
 * 質問登録・編集フォームコンポーネント
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CATEGORY_OPTIONS,
  DIFFICULTY_OPTIONS,
  INDUSTRY_OPTIONS,
  EVALUATION_POINT_OPTIONS,
  type Question,
  type QuestionFormData,
  type QuestionCategoryId,
  type DifficultyLevel,
  type IndustryType,
  type EvaluationPointType,
} from '@/types/admin';

interface QuestionFormProps {
  mode: 'create' | 'edit';
  initialData?: Question;
}

const emptyFormData: QuestionFormData = {
  id: '',
  category_id: 'introduction',
  question_ja: '',
  question_simplified: '',
  question_reading: '',
  difficulty: 2,
  industries: ['all'],
  evaluation_points: [],
  follow_ups: [],
  good_answer_indicators: [],
  red_flags: [],
  is_ice_breaker: false,
  is_condition_check: false,
  is_closing_statement: false,
  source: '',
};

export default function QuestionForm({ mode, initialData }: QuestionFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<QuestionFormData>(() => {
    if (initialData) {
      return {
        ...emptyFormData,
        ...initialData,
        question_reading: initialData.question_reading || '',
        is_condition_check: initialData.is_condition_check || false,
        is_closing_statement: initialData.is_closing_statement || false,
        source: initialData.source || '',
      };
    }
    return emptyFormData;
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 基本フィールドの変更ハンドラー
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;

      if (type === 'checkbox') {
        const checked = (e.target as HTMLInputElement).checked;
        setFormData((prev) => ({ ...prev, [name]: checked }));
      } else if (name === 'difficulty') {
        setFormData((prev) => ({ ...prev, [name]: parseInt(value, 10) as DifficultyLevel }));
      } else {
        setFormData((prev) => ({ ...prev, [name]: value }));
      }

      // エラーをクリア
      if (errors[name]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
    },
    [errors]
  );

  // 業種の変更ハンドラー
  const handleIndustryChange = useCallback((industry: IndustryType, checked: boolean) => {
    setFormData((prev) => {
      let newIndustries: IndustryType[];

      if (industry === 'all') {
        newIndustries = checked ? ['all'] : [];
      } else {
        if (checked) {
          newIndustries = prev.industries.filter((i) => i !== 'all');
          newIndustries.push(industry);
        } else {
          newIndustries = prev.industries.filter((i) => i !== industry);
        }
      }

      return { ...prev, industries: newIndustries };
    });
  }, []);

  // 評価ポイントの変更ハンドラー
  const handleEvaluationPointChange = useCallback((point: EvaluationPointType, checked: boolean) => {
    setFormData((prev) => {
      const newPoints = checked
        ? [...prev.evaluation_points, point]
        : prev.evaluation_points.filter((p) => p !== point);
      return { ...prev, evaluation_points: newPoints };
    });
  }, []);

  // 配列フィールドの追加ハンドラー
  const handleAddArrayItem = useCallback((field: keyof QuestionFormData) => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...(prev[field] as string[]), ''],
    }));
  }, []);

  // 配列フィールドの変更ハンドラー
  const handleArrayItemChange = useCallback(
    (field: keyof QuestionFormData, index: number, value: string) => {
      setFormData((prev) => {
        const newArray = [...(prev[field] as string[])];
        newArray[index] = value;
        return { ...prev, [field]: newArray };
      });
    },
    []
  );

  // 配列フィールドの削除ハンドラー
  const handleRemoveArrayItem = useCallback((field: keyof QuestionFormData, index: number) => {
    setFormData((prev) => {
      const newArray = [...(prev[field] as string[])];
      newArray.splice(index, 1);
      return { ...prev, [field]: newArray };
    });
  }, []);

  // 送信ハンドラー
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    setErrors({});

    try {
      // 空の配列要素を除去
      const cleanedData = {
        ...formData,
        follow_ups: formData.follow_ups.filter((item) => item.trim() !== ''),
        good_answer_indicators: formData.good_answer_indicators.filter((item) => item.trim() !== ''),
        red_flags: formData.red_flags.filter((item) => item.trim() !== ''),
      };

      const url =
        mode === 'create'
          ? '/api/admin/questions'
          : `/api/admin/questions/${initialData?.id}`;
      const method = mode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanedData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (data.errors) {
          setErrors(data.errors);
        } else {
          setSubmitError(data.error || '保存に失敗しました');
        }
        return;
      }

      router.push('/admin/questions');
      router.refresh();
    } catch {
      setSubmitError('ネットワークエラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 配列フィールドのレンダリング
  const renderArrayField = (
    field: 'follow_ups' | 'good_answer_indicators' | 'red_flags',
    label: string,
    placeholder: string
  ) => {
    const items = formData[field];
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={item}
                onChange={(e) => handleArrayItemChange(field, index, e.target.value)}
                placeholder={placeholder}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <button
                type="button"
                onClick={() => handleRemoveArrayItem(field, index)}
                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
              >
                x
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => handleAddArrayItem(field)}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            + 追加
          </button>
        </div>
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {submitError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {submitError}
        </div>
      )}

      {/* 基本情報 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">基本情報</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ID（新規作成時のみ編集可） */}
          <div>
            <label htmlFor="id" className="block text-sm font-medium text-gray-700 mb-1">
              質問ID
            </label>
            <input
              id="id"
              name="id"
              type="text"
              value={formData.id}
              onChange={handleChange}
              disabled={mode === 'edit'}
              placeholder="Q51（空欄で自動生成）"
              className={`w-full px-3 py-2 border rounded-md text-sm ${
                mode === 'edit' ? 'bg-gray-100' : ''
              } ${errors.id ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
            />
            {errors.id && (
              <p className="mt-1 text-sm text-red-600">{errors.id[0]}</p>
            )}
          </div>

          {/* カテゴリ */}
          <div>
            <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 mb-1">
              カテゴリ <span className="text-red-500">*</span>
            </label>
            <select
              id="category_id"
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* 難易度 */}
          <div>
            <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">
              難易度 <span className="text-red-500">*</span>
            </label>
            <select
              id="difficulty"
              name="difficulty"
              value={formData.difficulty}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              {DIFFICULTY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* 出典 */}
          <div>
            <label htmlFor="source" className="block text-sm font-medium text-gray-700 mb-1">
              出典
            </label>
            <input
              id="source"
              name="source"
              type="text"
              value={formData.source}
              onChange={handleChange}
              placeholder="standard, jinzaiplus.jp など"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>
      </div>

      {/* 質問文 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">質問文</h2>

        <div className="space-y-4">
          {/* 標準版質問文 */}
          <div>
            <label htmlFor="question_ja" className="block text-sm font-medium text-gray-700 mb-1">
              標準版質問文 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="question_ja"
              name="question_ja"
              value={formData.question_ja}
              onChange={handleChange}
              rows={3}
              placeholder="N1-N3向けの質問文"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm ${
                errors.question_ja ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.question_ja && (
              <p className="mt-1 text-sm text-red-600">{errors.question_ja[0]}</p>
            )}
          </div>

          {/* 簡易版質問文 */}
          <div>
            <label htmlFor="question_simplified" className="block text-sm font-medium text-gray-700 mb-1">
              簡易版質問文 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="question_simplified"
              name="question_simplified"
              value={formData.question_simplified}
              onChange={handleChange}
              rows={2}
              placeholder="N4-N5向けの簡易化した質問文"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm ${
                errors.question_simplified ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.question_simplified && (
              <p className="mt-1 text-sm text-red-600">{errors.question_simplified[0]}</p>
            )}
          </div>

          {/* ふりがな */}
          <div>
            <label htmlFor="question_reading" className="block text-sm font-medium text-gray-700 mb-1">
              ふりがな
            </label>
            <textarea
              id="question_reading"
              name="question_reading"
              value={formData.question_reading}
              onChange={handleChange}
              rows={2}
              placeholder="ひらがなでの読み"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>
      </div>

      {/* 対象業種 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">対象業種</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {INDUSTRY_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center">
              <input
                type="checkbox"
                checked={formData.industries.includes(option.value)}
                onChange={(e) => handleIndustryChange(option.value, e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
        {errors.industries && (
          <p className="mt-2 text-sm text-red-600">{errors.industries[0]}</p>
        )}
      </div>

      {/* 評価ポイント */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">評価ポイント</h2>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {EVALUATION_POINT_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center">
              <input
                type="checkbox"
                checked={formData.evaluation_points.includes(option.value)}
                onChange={(e) => handleEvaluationPointChange(option.value, e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* フラグ */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">フラグ</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="is_ice_breaker"
              checked={formData.is_ice_breaker}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">アイスブレイク質問</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              name="is_condition_check"
              checked={formData.is_condition_check}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">条件確認質問</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              name="is_closing_statement"
              checked={formData.is_closing_statement}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">クロージング発言</span>
          </label>
        </div>
      </div>

      {/* 追加情報 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">追加情報</h2>

        <div className="space-y-6">
          {renderArrayField('follow_ups', 'フォローアップ質問', '追加で聞く質問を入力...')}
          {renderArrayField('good_answer_indicators', '良い回答指標', '良い回答の特徴を入力...')}
          {renderArrayField('red_flags', '注意すべき回答', '要注意の回答パターンを入力...')}
        </div>
      </div>

      {/* 送信ボタン */}
      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className={`px-6 py-2 text-white rounded-md transition-colors ${
            isSubmitting
              ? 'bg-blue-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isSubmitting ? '保存中...' : mode === 'create' ? '登録する' : '更新する'}
        </button>
      </div>
    </form>
  );
}
