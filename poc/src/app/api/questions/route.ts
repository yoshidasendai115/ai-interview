import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { JLPTLevel } from '@/types/interview';

/**
 * 質問バンクの質問構造
 */
interface QuestionBankItem {
  id: string;
  category_id: string;
  question_ja: string;
  question_simplified: string;
  question_reading: string;
  difficulty: number;
  industries: string[];
  evaluation_points: string[];
  follow_ups: string[];
  good_answer_indicators: string[];
  red_flags: string[];
  is_ice_breaker?: boolean;
  source?: string;
}

/**
 * APIレスポンスの質問構造
 */
interface QuestionResponse {
  id: string;
  order: number;
  text: string;
  spokenText: string;
  expectedDurationSeconds: number;
  evaluationCriteria: string[];
}

/**
 * カテゴリ別の質問選択数
 */
const CATEGORY_SELECTION: Record<string, number> = {
  introduction: 2,
  past_experience: 2,
  present_ability: 2,
  future_vision: 2,
  closing: 2,
};

/**
 * JLPTレベルに応じて簡易版を使用するか判定
 */
function useSimplifiedText(jlptLevel: JLPTLevel): boolean {
  return jlptLevel === 'N4' || jlptLevel === 'N5';
}

/**
 * カテゴリごとに質問をランダムに選択
 */
function selectQuestionsByCategory(
  questions: QuestionBankItem[],
  categoryId: string,
  count: number
): QuestionBankItem[] {
  const categoryQuestions = questions.filter((q) => q.category_id === categoryId);

  // シャッフルして指定数を選択
  const shuffled = [...categoryQuestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * 質問バンクから10問を選択してフォーマット
 */
function selectAndFormatQuestions(
  questions: QuestionBankItem[],
  jlptLevel: JLPTLevel
): QuestionResponse[] {
  const useSimplified = useSimplifiedText(jlptLevel);
  const selectedQuestions: QuestionBankItem[] = [];

  // カテゴリ別に質問を選択
  for (const [categoryId, count] of Object.entries(CATEGORY_SELECTION)) {
    const selected = selectQuestionsByCategory(questions, categoryId, count);
    selectedQuestions.push(...selected);
  }

  // フォーマット変換
  return selectedQuestions.map((q, index) => ({
    id: q.id,
    order: index + 1,
    text: useSimplified ? q.question_simplified : q.question_ja,
    spokenText: q.question_reading,
    expectedDurationSeconds: 60,
    evaluationCriteria: q.evaluation_points,
  }));
}

/**
 * GET /api/questions?jlptLevel=N3
 */
export async function GET(request: NextRequest) {
  try {
    // クエリパラメータからJLPTレベルを取得
    const searchParams = request.nextUrl.searchParams;
    const jlptLevel = (searchParams.get('jlptLevel') || 'N3') as JLPTLevel;

    // JLPTレベルのバリデーション
    const validLevels: JLPTLevel[] = ['N1', 'N2', 'N3', 'N4', 'N5'];
    if (!validLevels.includes(jlptLevel)) {
      return NextResponse.json(
        { error: `Invalid JLPT level: ${jlptLevel}. Must be one of: ${validLevels.join(', ')}` },
        { status: 400 }
      );
    }

    // question_bank.json を読み込み
    const questionBankPath = path.join(
      process.cwd(),
      '..',
      'backend',
      'app',
      'data',
      'seed',
      'question_bank.json'
    );

    if (!fs.existsSync(questionBankPath)) {
      return NextResponse.json(
        { error: 'Question bank not found' },
        { status: 500 }
      );
    }

    const questionBankData = JSON.parse(fs.readFileSync(questionBankPath, 'utf-8'));
    const questions: QuestionBankItem[] = questionBankData.questions;

    // 質問を選択してフォーマット
    const formattedQuestions = selectAndFormatQuestions(questions, jlptLevel);

    return NextResponse.json({
      jlptLevel,
      totalQuestions: formattedQuestions.length,
      questions: formattedQuestions,
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}
