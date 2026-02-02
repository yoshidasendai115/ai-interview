'use client';

/**
 * 質問編集ページ
 */

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QuestionForm } from '@/components/admin/questions';
import type { Question } from '@/types/admin';

interface EditQuestionPageProps {
  params: Promise<{ id: string }>;
}

export default function EditQuestionPage({ params }: EditQuestionPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [question, setQuestion] = useState<Question | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuestion = async () => {
      try {
        const response = await fetch(`/api/admin/questions/${id}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('質問が見つかりません');
            return;
          }
          throw new Error('質問の取得に失敗しました');
        }

        const data = await response.json();
        setQuestion(data.question);
      } catch (e) {
        setError(e instanceof Error ? e.message : '質問の取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestion();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        <p>{error || '質問が見つかりません'}</p>
        <button
          onClick={() => router.push('/admin/questions')}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          一覧に戻る
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* パンくず */}
      <nav className="mb-4">
        <ol className="flex items-center space-x-2 text-sm text-gray-500">
          <li>
            <Link href="/admin/questions" className="hover:text-blue-600">
              質問管理
            </Link>
          </li>
          <li>/</li>
          <li className="text-gray-900">{question.id} を編集</li>
        </ol>
      </nav>

      {/* ヘッダー */}
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        質問を編集 - {question.id}
      </h1>

      {/* フォーム */}
      <QuestionForm mode="edit" initialData={question} />
    </div>
  );
}
