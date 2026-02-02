'use client';

/**
 * 質問一覧テーブルコンポーネント
 */

import Link from 'next/link';
import { CATEGORY_OPTIONS, DIFFICULTY_OPTIONS, type Question } from '@/types/admin';

interface QuestionTableProps {
  questions: Question[];
  onDeleteClick: (question: Question) => void;
}

export default function QuestionTable({ questions, onDeleteClick }: QuestionTableProps) {
  const getCategoryLabel = (categoryId: string): string => {
    const category = CATEGORY_OPTIONS.find((c) => c.value === categoryId);
    return category ? category.label : categoryId;
  };

  const getDifficultyLabel = (difficulty: number): string => {
    const option = DIFFICULTY_OPTIONS.find((d) => d.value === difficulty);
    return option ? option.label : String(difficulty);
  };

  const getDifficultyColor = (difficulty: number): string => {
    switch (difficulty) {
      case 1:
        return 'bg-green-100 text-green-800';
      case 2:
        return 'bg-yellow-100 text-yellow-800';
      case 3:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (questions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
        該当する質問が見つかりません
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                カテゴリ
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                質問文
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                難易度
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                フラグ
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {questions.map((question) => (
              <tr key={question.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {question.id}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {getCategoryLabel(question.category_id)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  <div className="max-w-md truncate" title={question.question_ja}>
                    {question.question_ja}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDifficultyColor(
                      question.difficulty
                    )}`}
                  >
                    {getDifficultyLabel(question.difficulty)}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex gap-1">
                    {question.is_ice_breaker && (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        Ice
                      </span>
                    )}
                    {question.is_condition_check && (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                        条件
                      </span>
                    )}
                    {question.is_closing_statement && (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                        締め
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                  <Link
                    href={`/admin/questions/${question.id}/edit`}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    編集
                  </Link>
                  <button
                    onClick={() => onDeleteClick(question)}
                    className="text-red-600 hover:text-red-900"
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
