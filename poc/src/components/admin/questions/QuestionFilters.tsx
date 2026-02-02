'use client';

/**
 * 質問フィルターコンポーネント
 */

import { useCallback } from 'react';
import {
  CATEGORY_OPTIONS,
  DIFFICULTY_OPTIONS,
  INDUSTRY_OPTIONS,
  type QuestionCategoryId,
  type DifficultyLevel,
  type IndustryType,
} from '@/types/admin';

interface QuestionFiltersProps {
  categoryId: QuestionCategoryId | '';
  difficulty: DifficultyLevel | '';
  industry: IndustryType | '';
  search: string;
  onCategoryChange: (value: QuestionCategoryId | '') => void;
  onDifficultyChange: (value: DifficultyLevel | '') => void;
  onIndustryChange: (value: IndustryType | '') => void;
  onSearchChange: (value: string) => void;
  onReset: () => void;
}

export default function QuestionFilters({
  categoryId,
  difficulty,
  industry,
  search,
  onCategoryChange,
  onDifficultyChange,
  onIndustryChange,
  onSearchChange,
  onReset,
}: QuestionFiltersProps) {
  const handleCategoryChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onCategoryChange(e.target.value as QuestionCategoryId | '');
    },
    [onCategoryChange]
  );

  const handleDifficultyChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      onDifficultyChange(value === '' ? '' : (parseInt(value, 10) as DifficultyLevel));
    },
    [onDifficultyChange]
  );

  const handleIndustryChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onIndustryChange(e.target.value as IndustryType | '');
    },
    [onIndustryChange]
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange(e.target.value);
    },
    [onSearchChange]
  );

  const hasFilters = categoryId !== '' || difficulty !== '' || industry !== '' || search !== '';

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 検索 */}
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
            キーワード検索
          </label>
          <input
            id="search"
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="ID、質問文で検索..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>

        {/* カテゴリ */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            カテゴリ
          </label>
          <select
            id="category"
            value={categoryId}
            onChange={handleCategoryChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="">全てのカテゴリ</option>
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
            難易度
          </label>
          <select
            id="difficulty"
            value={difficulty}
            onChange={handleDifficultyChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="">全ての難易度</option>
            {DIFFICULTY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* 業種 */}
        <div>
          <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">
            対象業種
          </label>
          <select
            id="industry"
            value={industry}
            onChange={handleIndustryChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="">全ての業種</option>
            {INDUSTRY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* リセットボタン */}
        <div className="flex items-end">
          <button
            onClick={onReset}
            disabled={!hasFilters}
            className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              hasFilters
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            フィルターをリセット
          </button>
        </div>
      </div>
    </div>
  );
}
