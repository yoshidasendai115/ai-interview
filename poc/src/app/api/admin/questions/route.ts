/**
 * 質問一覧・登録API
 * GET /api/admin/questions - 一覧取得
 * POST /api/admin/questions - 新規登録
 */

import { NextRequest, NextResponse } from 'next/server';
import { getQuestions, loadCategories, createQuestion, generateNextQuestionId } from '@/lib/data/questions';
import { createQuestionSchema } from '@/lib/validations/question';
import type { QuestionListResponse, QuestionMutationResponse, QuestionFilters, QuestionCategoryId, DifficultyLevel, IndustryType } from '@/types/admin';

export async function GET(request: NextRequest): Promise<NextResponse<QuestionListResponse>> {
  try {
    const { searchParams } = new URL(request.url);

    // フィルターパラメータの取得
    const filters: QuestionFilters = {};

    const categoryId = searchParams.get('category_id');
    if (categoryId) {
      filters.category_id = categoryId as QuestionCategoryId;
    }

    const difficulty = searchParams.get('difficulty');
    if (difficulty) {
      filters.difficulty = parseInt(difficulty, 10) as DifficultyLevel;
    }

    const industry = searchParams.get('industry');
    if (industry) {
      filters.industry = industry as IndustryType;
    }

    const search = searchParams.get('search');
    if (search) {
      filters.search = search;
    }

    // データ取得
    const [questions, categories] = await Promise.all([
      getQuestions(filters),
      loadCategories(),
    ]);

    return NextResponse.json({
      questions,
      total: questions.length,
      categories,
    });
  } catch (error) {
    console.error('Get questions error:', error);
    return NextResponse.json(
      { questions: [], total: 0, categories: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<QuestionMutationResponse>> {
  try {
    const body = await request.json();

    // バリデーション
    const validationResult = createQuestionSchema.safeParse(body);
    if (!validationResult.success) {
      const errors: Record<string, string[]> = {};
      validationResult.error.issues.forEach((err) => {
        const path = err.path.join('.');
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(err.message);
      });

      return NextResponse.json(
        { success: false, errors },
        { status: 400 }
      );
    }

    // IDが指定されていない場合は自動生成
    let questionData = validationResult.data;
    if (!questionData.id || questionData.id === '') {
      const nextId = await generateNextQuestionId();
      questionData = { ...questionData, id: nextId };
    }

    // 質問を作成
    const question = await createQuestion(questionData);

    return NextResponse.json({
      success: true,
      question,
    });
  } catch (error) {
    console.error('Create question error:', error);
    const message = error instanceof Error ? error.message : '質問の登録に失敗しました';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
