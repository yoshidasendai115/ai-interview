'use client';

/**
 * 質問一覧ページ
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { QuestionTable, QuestionFilters, DeleteDialog } from '@/components/admin/questions';
import type {
  Question,
  QuestionCategory,
  QuestionCategoryId,
  DifficultyLevel,
  IndustryType,
} from '@/types/admin';

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<QuestionCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // フィルター状態
  const [categoryId, setCategoryId] = useState<QuestionCategoryId | ''>('');
  const [difficulty, setDifficulty] = useState<DifficultyLevel | ''>('');
  const [industry, setIndustry] = useState<IndustryType | ''>('');
  const [search, setSearch] = useState('');

  // 削除ダイアログ
  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null);

  // データ取得
  const fetchQuestions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (categoryId) params.append('category_id', categoryId);
      if (difficulty) params.append('difficulty', String(difficulty));
      if (industry) params.append('industry', industry);
      if (search) params.append('search', search);

      const response = await fetch(`/api/admin/questions?${params.toString()}`);
      if (!response.ok) {
        throw new Error('質問の取得に失敗しました');
      }

      const data = await response.json();
      setQuestions(data.questions);
      setCategories(data.categories);
    } catch (e) {
      setError(e instanceof Error ? e.message : '質問の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [categoryId, difficulty, industry, search]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // 検索のデバウンス
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // フィルターリセット
  const handleReset = () => {
    setCategoryId('');
    setDifficulty('');
    setIndustry('');
    setSearchInput('');
    setSearch('');
  };

  // 削除処理
  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/admin/questions/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || '削除に失敗しました');
    }

    // 一覧を再取得
    await fetchQuestions();
  };

  // カテゴリ別の質問数を計算
  const getCategoryStats = () => {
    const stats: Record<string, number> = {};
    questions.forEach((q) => {
      stats[q.category_id] = (stats[q.category_id] || 0) + 1;
    });
    return stats;
  };

  const categoryStats = getCategoryStats();

  return (
    <div>
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">質問管理</h1>
          <p className="text-gray-600 mt-1">
            {isLoading ? '読み込み中...' : `${questions.length}件の質問`}
          </p>
        </div>
        <Link
          href="/admin/questions/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          新規登録
        </Link>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* カテゴリ別統計 */}
      {!isLoading && categories.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {categories.map((category) => (
            <div
              key={category.id}
              className={`bg-white rounded-lg shadow p-4 cursor-pointer transition-colors ${
                categoryId === category.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() =>
                setCategoryId(categoryId === category.id ? '' : category.id)
              }
            >
              <p className="text-sm text-gray-500">{category.name}</p>
              <p className="text-2xl font-bold text-gray-900">
                {categoryStats[category.id] || 0}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* フィルター */}
      <QuestionFilters
        categoryId={categoryId}
        difficulty={difficulty}
        industry={industry}
        search={searchInput}
        onCategoryChange={setCategoryId}
        onDifficultyChange={setDifficulty}
        onIndustryChange={setIndustry}
        onSearchChange={setSearchInput}
        onReset={handleReset}
      />

      {/* テーブル */}
      {isLoading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          読み込み中...
        </div>
      ) : (
        <QuestionTable
          questions={questions}
          onDeleteClick={setDeleteTarget}
        />
      )}

      {/* 削除確認ダイアログ */}
      <DeleteDialog
        question={deleteTarget}
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
