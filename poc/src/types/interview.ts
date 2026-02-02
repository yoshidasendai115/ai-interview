/**
 * AI面接練習システム - 型定義
 */

// ============================================
// セッション状態
// ============================================

export type InterviewState =
  | 'initializing'    // HeyGen接続中
  | 'ready'           // 接続完了、開始待ち
  | 'avatar_speaking' // アバター発話中
  | 'listening'       // ユーザー回答待ち（録音中）
  | 'processing'      // 回答処理中
  | 'completed'       // セッション完了
  | 'error';          // エラー状態

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

// ============================================
// JLPTレベル
// ============================================

export type JLPTLevel = 'N1' | 'N2' | 'N3' | 'N4' | 'N5';

export interface JLPTWeights {
  vocabulary: number;
  grammar: number;
  content: number;
  honorifics: number;
}

export const JLPT_WEIGHTS: Record<JLPTLevel, JLPTWeights> = {
  N1: { vocabulary: 0.20, grammar: 0.20, content: 0.25, honorifics: 0.35 },
  N2: { vocabulary: 0.20, grammar: 0.25, content: 0.25, honorifics: 0.30 },
  N3: { vocabulary: 0.25, grammar: 0.30, content: 0.25, honorifics: 0.20 },
  N4: { vocabulary: 0.30, grammar: 0.35, content: 0.25, honorifics: 0.10 },
  N5: { vocabulary: 0.35, grammar: 0.40, content: 0.20, honorifics: 0.05 },
};

// ============================================
// JLPTレベル別設定
// ============================================

export interface JLPTSettings {
  speechRate: number;
  useSimplified: boolean;
  followUpDepth: number;
}

/**
 * JLPTレベル別の話速・フォローアップ深度設定
 * 設計書: 13_面接シナリオ設計.md 13.3.3節
 * - voice.rate: HeyGenアバターの話速制御（0.5〜1.5）
 * - useSimplified: 簡易版質問文の使用
 * - followUpDepth: フォローアップ質問の最大回数
 */
export const JLPT_SETTINGS: Record<JLPTLevel, JLPTSettings> = {
  N1: { speechRate: 1.0, useSimplified: false, followUpDepth: 3 },
  N2: { speechRate: 1.0, useSimplified: false, followUpDepth: 2 },
  N3: { speechRate: 0.75, useSimplified: false, followUpDepth: 2 },
  N4: { speechRate: 0.5, useSimplified: true, followUpDepth: 1 },
  N5: { speechRate: 0.5, useSimplified: true, followUpDepth: 1 },
};

// ============================================
// 評価カテゴリ
// ============================================

export type EvaluationCategory = 'vocabulary' | 'grammar' | 'content' | 'honorifics';

export const EVALUATION_CATEGORIES: readonly EvaluationCategory[] = [
  'vocabulary',
  'grammar',
  'content',
  'honorifics',
] as const;

export const CATEGORY_LABELS: Record<EvaluationCategory, string> = {
  vocabulary: '語彙',
  grammar: '文法',
  content: '内容',
  honorifics: '敬語',
};

// ============================================
// 評価スコア
// ============================================

export interface CategoryScores {
  vocabulary: number;
  grammar: number;
  content: number;
  honorifics: number;
}

export interface CategoryFeedback {
  vocabulary: string;
  grammar: string;
  content: string;
  honorifics: string;
}

export interface EvaluationResult {
  scores: CategoryScores;
  feedback: CategoryFeedback;
  weakPoints: WeakPoint[];
  overallFeedback: string;
  totalScore: number;
}

// ============================================
// 苦手項目
// ============================================

export type WeakPointPriority = 'high' | 'medium' | 'low';

export interface WeakPoint {
  id: string;
  category: EvaluationCategory;
  description: string;
  example: string;
  suggestion: string;
  priority: WeakPointPriority;
  occurrenceCount: number;
  lastOccurredAt: Date;
  resolved: boolean;
}

export interface WeakPointDetection {
  category: EvaluationCategory;
  description: string;
  example: string;
  suggestion: string;
}

// 苦手検出の閾値
export const WEAK_POINT_THRESHOLD = 70;
// 苦手タグ登録に必要な発生回数
export const WEAK_POINT_TAG_THRESHOLD = 3;
// 苦手解消に必要な連続高得点回数
export const WEAK_POINT_RESOLUTION_COUNT = 3;
// 苦手解消の最低スコア
export const WEAK_POINT_RESOLUTION_SCORE = 80;

// ============================================
// 質問・回答
// ============================================

export interface Question {
  id: string;
  order: number;
  /** 画面表示用テキスト（漢字） */
  text: string;
  /** HeyGen発話用テキスト（読み仮名）- 省略時はtextを使用 */
  spokenText?: string;
  expectedDurationSeconds: number;
  evaluationCriteria: string[];
}

/**
 * 質問バンクの質問構造
 * 設計書: 13_面接シナリオ設計.md 13.4.1節
 */
export interface QuestionBankItem {
  id: string;
  category_id: string;
  question_ja: string;
  question_simplified: string;
  question_reading: string;
  difficulty: 1 | 2 | 3;
  industries: string[];
  evaluation_points: string[];
  follow_ups: string[];
  good_answer_indicators: string[];
  red_flags: string[];
  is_ice_breaker?: boolean;
  source?: string;
}

export interface Answer {
  questionId: string;
  questionOrder: number;
  audioUrl: string | null;
  transcript: string;
  answeredAt: Date;
  skipped: boolean;
}

// ============================================
// セッション
// ============================================

export interface InterviewSession {
  sessionId: string;
  userId: string;
  scriptId: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  currentQuestionIndex: number;
  questions: Question[];
  answers: Answer[];
  startedAt: Date;
  completedAt: Date | null;
  heygenSessionId: string | null;
}

export interface SessionContext {
  state: InterviewState;
  currentQuestion: number;
  totalQuestions: number;
  answers: Answer[];
  heygenSessionId: string | null;
  error: string | null;
}

// ============================================
// 音声認識
// ============================================

export interface TranscriptionResult {
  text: string;
  isFinal: boolean;
  confidence: number;
}

export interface AudioRecorderState {
  isRecording: boolean;
  transcript: string;
  interimTranscript: string;
  silenceSeconds: number;
}

// ============================================
// HeyGen関連
// ============================================

export interface HeyGenSessionInfo {
  sessionToken: string;
  avatarId: string;
}

export interface HeyGenMetrics {
  initTime: number | null;
  speakLatency: number | null;
  totalSpeakTime: number | null;
}

// ============================================
// API レスポンス
// ============================================

export interface SessionStartResponse {
  sessionId: string;
  script: {
    id: string;
    title: string;
    totalQuestions: number;
  };
  heygenSession: HeyGenSessionInfo;
  startedAt: string;
}

export interface AnswerSubmitResponse {
  answerId: string;
  questionId: string;
  transcript: string;
  nextQuestion: Question | null;
}

export interface SessionCompleteResponse {
  sessionId: string;
  status: 'completed';
  completedAt: string;
  evaluationId: string;
}

export interface EvaluationResponse {
  evaluationId: string;
  sessionId: string;
  scores: CategoryScores & { total: number };
  feedback: CategoryFeedback & { overall: string };
  weakPoints: Array<{
    category: string;
    description: string;
    priority: WeakPointPriority;
    example: string;
  }>;
  evaluatedAt: string;
}

// ============================================
// GPT-4o 評価プロンプト用
// ============================================

export interface GPTEvaluationRequest {
  questionText: string;
  answerText: string;
  jlptLevel: JLPTLevel;
  evaluationCriteria: string[];
}

export interface GPTEvaluationResponse {
  scores: CategoryScores;
  feedback: CategoryFeedback;
  weak_points: Array<{
    category: string;
    description: string;
    example: string;
    suggestion: string;
  }>;
  overall_feedback: string;
}

// ============================================
// ログエントリ
// ============================================

export interface LogEntry {
  time: string;
  type: 'info' | 'error' | 'success' | 'warning';
  message: string;
}

// ============================================
// 企業向け統合評価レポート
// ============================================

/**
 * 推定実力レベルの方向
 */
export type EstimationDirection = 'higher' | 'same' | 'lower';

/**
 * 業務適性の判定結果
 */
export type JobSuitabilityStatus = 'capable' | 'needs_practice' | 'not_verified';

/**
 * レベル別パフォーマンスのグレード
 */
export type PerformanceGrade = 'excellent' | 'good' | 'pass' | 'fail' | 'not_tested';

/**
 * レベル別パフォーマンス情報
 */
export interface LevelPerformance {
  level: JLPTLevel;
  averageScore: number | null;
  sessionCount: number;
  grade: PerformanceGrade;
  /** チャレンジセッションでの受験か */
  isChallengeSession: boolean;
}

/**
 * 業務適性判定
 */
export interface JobSuitability {
  /** 基本接客（N4相当） */
  basicService: JobSuitabilityStatus;
  /** 一般業務（N3相当） */
  generalWork: JobSuitabilityStatus;
  /** ビジネス敬語（N2相当） */
  businessHonorifics: JobSuitabilityStatus;
  /** 高度業務（N1相当） */
  advancedWork: JobSuitabilityStatus;
}

/**
 * 企業向け統合評価レポート
 * 設計書: 07_評価ロジック.md 7.11節
 */
export interface EnterpriseEvaluationReport {
  /** レポート生成日時 */
  generatedAt: string;

  // 1. 推定実力レベル
  /** ユーザーが申告したレベル */
  declaredLevel: JLPTLevel;
  /** 推定実力レベル */
  estimatedLevel: JLPTLevel | 'below_N5';
  /** 推定方向（申告レベルより上/同じ/下） */
  estimationDirection: EstimationDirection;
  /** 判定根拠 */
  estimationReason: string;

  // 2. レベル別パフォーマンス
  /** 各レベルでのパフォーマンス履歴 */
  levelPerformances: LevelPerformance[];

  // 3. 業務適性判定
  /** 業務レベル別の適性 */
  jobSuitability: JobSuitability;

  // 4. 詳細スコア
  /** カテゴリ別スコア（最新セッション） */
  detailedScores: CategoryScores;
  /** 苦手項目 */
  weakPoints: WeakPoint[];

  // 5. セッション履歴サマリー
  /** 総セッション数 */
  totalSessions: number;
  /** 総チャレンジセッション数 */
  totalChallengeSessions: number;
}

/**
 * JSON形式で格納する面談結果データ
 * 全てのセッション結果を格納する構造
 */
export interface InterviewResultData {
  /** ユーザーID */
  userId: string;
  /** 最終更新日時 */
  lastUpdatedAt: string;
  /** 申告レベル */
  declaredLevel: JLPTLevel;
  /** 全セッション結果 */
  sessions: InterviewSessionResult[];
  /** 企業向け統合評価レポート */
  enterpriseReport: EnterpriseEvaluationReport | null;
}

/**
 * 個別セッションの結果データ
 */
export interface InterviewSessionResult {
  /** セッションID */
  sessionId: string;
  /** セッション実施日時 */
  conductedAt: string;
  /** 面接レベル */
  level: JLPTLevel;
  /** チャレンジセッションかどうか */
  isChallengeSession: boolean;
  /** 総合スコア */
  totalScore: number;
  /** カテゴリ別スコア */
  categoryScores: CategoryScores;
  /** カテゴリ別フィードバック */
  categoryFeedback: CategoryFeedback;
  /** 苦手項目 */
  weakPoints: WeakPointDetection[];
  /** 総評 */
  overallFeedback: string;
}
