'use client';

/**
 * 新規質問登録ページ
 */

import Link from 'next/link';
import { QuestionForm } from '@/components/admin/questions';

export default function NewQuestionPage() {
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
          <li className="text-gray-900">新規登録</li>
        </ol>
      </nav>

      {/* ヘッダー */}
      <h1 className="text-2xl font-bold text-gray-900 mb-6">新規質問登録</h1>

      {/* フォーム */}
      <QuestionForm mode="create" />
    </div>
  );
}
