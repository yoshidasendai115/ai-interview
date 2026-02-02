/**
 * 質問管理のバリデーションスキーマ
 */

import { z } from 'zod';

// カテゴリID
const categoryIdSchema = z.enum([
  'introduction',
  'past_experience',
  'present_ability',
  'future_vision',
  'conditions',
  'closing',
]);

// 難易度
const difficultySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);

// 業種
const industrySchema = z.enum([
  'all',
  'nursing_care',
  'hospitality',
  'food_service',
  'manufacturing',
  'construction',
  'agriculture',
]);

// 評価ポイント
const evaluationPointSchema = z.enum([
  'communication',
  'initiative',
  'adaptability',
  'cooperation',
  'retention',
]);

// 質問IDのフォーマット（Q01-Q99）
const questionIdSchema = z
  .string()
  .regex(/^Q\d{2}$/, '質問IDはQ01〜Q99の形式で入力してください');

// 質問作成スキーマ
export const createQuestionSchema = z.object({
  id: questionIdSchema,
  category_id: categoryIdSchema,
  question_ja: z
    .string()
    .min(1, '標準版質問文を入力してください')
    .max(500, '標準版質問文は500文字以内で入力してください'),
  question_simplified: z
    .string()
    .min(1, '簡易版質問文を入力してください')
    .max(300, '簡易版質問文は300文字以内で入力してください'),
  question_reading: z
    .string()
    .max(500, 'ふりがなは500文字以内で入力してください')
    .optional()
    .default(''),
  difficulty: difficultySchema,
  industries: z
    .array(industrySchema)
    .min(1, '対象業種を1つ以上選択してください'),
  evaluation_points: z
    .array(evaluationPointSchema)
    .default([]),
  follow_ups: z
    .array(z.string().max(300, 'フォローアップ質問は300文字以内で入力してください'))
    .default([]),
  good_answer_indicators: z
    .array(z.string().max(200, '良い回答指標は200文字以内で入力してください'))
    .default([]),
  red_flags: z
    .array(z.string().max(200, '注意すべき回答は200文字以内で入力してください'))
    .default([]),
  is_ice_breaker: z.boolean().default(false),
  is_condition_check: z.boolean().optional().default(false),
  is_closing_statement: z.boolean().optional().default(false),
  source: z
    .string()
    .max(100, '出典は100文字以内で入力してください')
    .optional()
    .default(''),
});

// 質問更新スキーマ（IDは更新不可）
export const updateQuestionSchema = createQuestionSchema.omit({ id: true });

// フィルタースキーマ
export const questionFiltersSchema = z.object({
  category_id: categoryIdSchema.optional(),
  difficulty: difficultySchema.optional(),
  industry: industrySchema.optional(),
  search: z.string().max(100).optional(),
});

export type CreateQuestionSchema = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionSchema = z.infer<typeof updateQuestionSchema>;
export type QuestionFiltersSchema = z.infer<typeof questionFiltersSchema>;
