/**
 * 質問データへのアクセス層
 */

import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { Question, QuestionBank, QuestionCategory, QuestionFilters } from '@/types/admin';

// データファイルのパス
const QUESTION_BANK_PATH = path.join(
  process.cwd(),
  '..',
  'backend',
  'app',
  'data',
  'seed',
  'question_bank.json'
);

const CATEGORIES_PATH = path.join(
  process.cwd(),
  '..',
  'backend',
  'app',
  'data',
  'seed',
  'question_categories.json'
);

/**
 * 質問バンクを読み込む
 */
export async function loadQuestionBank(): Promise<QuestionBank> {
  const data = await readFile(QUESTION_BANK_PATH, 'utf-8');
  return JSON.parse(data) as QuestionBank;
}

/**
 * 質問バンクを保存する
 */
export async function saveQuestionBank(questionBank: QuestionBank): Promise<void> {
  const data = JSON.stringify(questionBank, null, 2);
  await writeFile(QUESTION_BANK_PATH, data, 'utf-8');
}

/**
 * カテゴリ一覧を読み込む
 */
export async function loadCategories(): Promise<QuestionCategory[]> {
  const data = await readFile(CATEGORIES_PATH, 'utf-8');
  const parsed = JSON.parse(data) as { categories: QuestionCategory[] };
  return parsed.categories;
}

/**
 * 全質問を取得する（フィルタリング付き）
 */
export async function getQuestions(filters?: QuestionFilters): Promise<Question[]> {
  const questionBank = await loadQuestionBank();
  let questions = questionBank.questions;

  if (filters) {
    // カテゴリフィルタ
    if (filters.category_id) {
      questions = questions.filter((q) => q.category_id === filters.category_id);
    }

    // 難易度フィルタ
    if (filters.difficulty) {
      questions = questions.filter((q) => q.difficulty === filters.difficulty);
    }

    // 業種フィルタ
    if (filters.industry) {
      questions = questions.filter(
        (q) => q.industries.includes(filters.industry!) || q.industries.includes('all')
      );
    }

    // 検索フィルタ
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      questions = questions.filter(
        (q) =>
          q.id.toLowerCase().includes(searchLower) ||
          q.question_ja.toLowerCase().includes(searchLower) ||
          q.question_simplified.toLowerCase().includes(searchLower)
      );
    }
  }

  return questions;
}

/**
 * IDで質問を取得する
 */
export async function getQuestionById(id: string): Promise<Question | null> {
  const questionBank = await loadQuestionBank();
  return questionBank.questions.find((q) => q.id === id) || null;
}

/**
 * 質問を作成する
 */
export async function createQuestion(question: Question): Promise<Question> {
  const questionBank = await loadQuestionBank();

  // ID重複チェック
  const existingIndex = questionBank.questions.findIndex((q) => q.id === question.id);
  if (existingIndex !== -1) {
    throw new Error(`質問ID ${question.id} は既に存在します`);
  }

  // 質問を追加
  questionBank.questions.push(question);

  // メタデータ更新
  questionBank.metadata.total_questions = questionBank.questions.length;
  questionBank.metadata.updated_at = new Date().toISOString().split('T')[0];

  // 保存
  await saveQuestionBank(questionBank);

  return question;
}

/**
 * 質問を更新する
 */
export async function updateQuestion(id: string, updates: Partial<Question>): Promise<Question> {
  const questionBank = await loadQuestionBank();

  const index = questionBank.questions.findIndex((q) => q.id === id);
  if (index === -1) {
    throw new Error(`質問ID ${id} が見つかりません`);
  }

  // 更新（IDは変更不可）
  const updatedQuestion = {
    ...questionBank.questions[index],
    ...updates,
    id, // IDは元のまま維持
  };

  questionBank.questions[index] = updatedQuestion;

  // メタデータ更新
  questionBank.metadata.updated_at = new Date().toISOString().split('T')[0];

  // 保存
  await saveQuestionBank(questionBank);

  return updatedQuestion;
}

/**
 * 質問を削除する
 */
export async function deleteQuestion(id: string): Promise<void> {
  const questionBank = await loadQuestionBank();

  const index = questionBank.questions.findIndex((q) => q.id === id);
  if (index === -1) {
    throw new Error(`質問ID ${id} が見つかりません`);
  }

  // 削除
  questionBank.questions.splice(index, 1);

  // メタデータ更新
  questionBank.metadata.total_questions = questionBank.questions.length;
  questionBank.metadata.updated_at = new Date().toISOString().split('T')[0];

  // 保存
  await saveQuestionBank(questionBank);
}

/**
 * 次の質問IDを生成する
 */
export async function generateNextQuestionId(): Promise<string> {
  const questionBank = await loadQuestionBank();

  // 既存のIDから最大値を取得
  const maxId = questionBank.questions.reduce((max, q) => {
    const num = parseInt(q.id.replace('Q', ''), 10);
    return num > max ? num : max;
  }, 0);

  // 次のIDを生成
  const nextNum = maxId + 1;
  return `Q${nextNum.toString().padStart(2, '0')}`;
}
