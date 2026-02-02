/**
 * 管理画面 - 型定義
 */

// ============================================
// 管理者ユーザー
// ============================================

export interface AdminUser {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: 'admin' | 'editor';
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export interface AdminUserPublic {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor';
}

// ============================================
// 認証
// ============================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user?: AdminUserPublic;
  error?: string;
}

export interface AuthSession {
  userId: string;
  email: string;
  name: string;
  role: 'admin' | 'editor';
  exp: number;
  iat: number;
}

// ============================================
// 質問カテゴリ
// ============================================

export type QuestionCategoryId =
  | 'introduction'
  | 'past_experience'
  | 'present_ability'
  | 'future_vision'
  | 'conditions'
  | 'closing';

export interface QuestionCategory {
  id: QuestionCategoryId;
  name: string;
  name_en: string;
  time_axis: 'past' | 'present' | 'future' | null;
  duration_minutes: number;
  display_order: number;
  description: string;
  purpose: string;
}

// ============================================
// 質問
// ============================================

export type DifficultyLevel = 1 | 2 | 3;

export type IndustryType =
  | 'all'
  | 'nursing_care'
  | 'hospitality'
  | 'food_service'
  | 'manufacturing'
  | 'construction'
  | 'agriculture';

export type EvaluationPointType =
  | 'communication'
  | 'initiative'
  | 'adaptability'
  | 'cooperation'
  | 'retention';

export interface Question {
  id: string;
  category_id: QuestionCategoryId;
  question_ja: string;
  question_simplified: string;
  question_reading?: string;
  difficulty: DifficultyLevel;
  industries: IndustryType[];
  evaluation_points: EvaluationPointType[];
  follow_ups: string[];
  good_answer_indicators: string[];
  red_flags: string[];
  is_ice_breaker: boolean;
  is_condition_check?: boolean;
  is_closing_statement?: boolean;
  source?: string;
}

export interface QuestionBank {
  questions: Question[];
  metadata: {
    version: string;
    total_questions: number;
    created_at: string;
    updated_at: string;
    sources: string[];
  };
}

// ============================================
// 質問フォームデータ（入力用）
// ============================================

export interface QuestionFormData {
  id: string;
  category_id: QuestionCategoryId;
  question_ja: string;
  question_simplified: string;
  question_reading: string;
  difficulty: DifficultyLevel;
  industries: IndustryType[];
  evaluation_points: EvaluationPointType[];
  follow_ups: string[];
  good_answer_indicators: string[];
  red_flags: string[];
  is_ice_breaker: boolean;
  is_condition_check: boolean;
  is_closing_statement: boolean;
  source: string;
}

// ============================================
// API レスポンス
// ============================================

export interface QuestionListResponse {
  questions: Question[];
  total: number;
  categories: QuestionCategory[];
}

export interface QuestionDetailResponse {
  question: Question;
  category: QuestionCategory;
}

export interface QuestionMutationResponse {
  success: boolean;
  question?: Question;
  error?: string;
  errors?: Record<string, string[]>;
}

// ============================================
// フィルター
// ============================================

export interface QuestionFilters {
  category_id?: QuestionCategoryId;
  difficulty?: DifficultyLevel;
  industry?: IndustryType;
  search?: string;
}

// ============================================
// 定数
// ============================================

export const CATEGORY_OPTIONS: { value: QuestionCategoryId; label: string }[] = [
  { value: 'introduction', label: '導入・アイスブレイク' },
  { value: 'past_experience', label: '過去（経験・背景）' },
  { value: 'present_ability', label: '現在（能力・適性）' },
  { value: 'future_vision', label: '未来（意欲・ビジョン）' },
  { value: 'conditions', label: '条件確認' },
  { value: 'closing', label: 'クロージング' },
];

export const DIFFICULTY_OPTIONS: { value: DifficultyLevel; label: string }[] = [
  { value: 1, label: '易しい (1)' },
  { value: 2, label: '普通 (2)' },
  { value: 3, label: '難しい (3)' },
];

export const INDUSTRY_OPTIONS: { value: IndustryType; label: string }[] = [
  { value: 'all', label: '全業種共通' },
  { value: 'nursing_care', label: '介護' },
  { value: 'hospitality', label: 'ホスピタリティ' },
  { value: 'food_service', label: '飲食' },
  { value: 'manufacturing', label: '製造' },
  { value: 'construction', label: '建設' },
  { value: 'agriculture', label: '農業' },
];

export const EVALUATION_POINT_OPTIONS: { value: EvaluationPointType; label: string }[] = [
  { value: 'communication', label: 'コミュニケーション' },
  { value: 'initiative', label: '主体性' },
  { value: 'adaptability', label: '適応力' },
  { value: 'cooperation', label: '協調性' },
  { value: 'retention', label: '定着意向' },
];
