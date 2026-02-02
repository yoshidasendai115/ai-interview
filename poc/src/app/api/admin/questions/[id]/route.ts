/**
 * 質問詳細・更新・削除API
 * GET /api/admin/questions/[id] - 詳細取得
 * PUT /api/admin/questions/[id] - 更新
 * DELETE /api/admin/questions/[id] - 削除
 */

import { NextRequest, NextResponse } from 'next/server';
import { getQuestionById, updateQuestion, deleteQuestion, loadCategories } from '@/lib/data/questions';
import { updateQuestionSchema } from '@/lib/validations/question';
import type { QuestionDetailResponse, QuestionMutationResponse } from '@/types/admin';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<QuestionDetailResponse | { error: string }>> {
  try {
    const { id } = await params;
    const question = await getQuestionById(id);

    if (!question) {
      return NextResponse.json(
        { error: '質問が見つかりません' },
        { status: 404 }
      );
    }

    const categories = await loadCategories();
    const category = categories.find((c) => c.id === question.category_id);

    if (!category) {
      return NextResponse.json(
        { error: 'カテゴリが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      question,
      category,
    });
  } catch (error) {
    console.error('Get question error:', error);
    return NextResponse.json(
      { error: '質問の取得に失敗しました' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<QuestionMutationResponse>> {
  try {
    const { id } = await params;
    const body = await request.json();

    // バリデーション
    const validationResult = updateQuestionSchema.safeParse(body);
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

    // 質問を更新
    const question = await updateQuestion(id, validationResult.data);

    return NextResponse.json({
      success: true,
      question,
    });
  } catch (error) {
    console.error('Update question error:', error);
    const message = error instanceof Error ? error.message : '質問の更新に失敗しました';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<QuestionMutationResponse>> {
  try {
    const { id } = await params;

    // 質問を削除
    await deleteQuestion(id);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Delete question error:', error);
    const message = error instanceof Error ? error.message : '質問の削除に失敗しました';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
