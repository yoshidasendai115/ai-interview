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
  text: string;
  expectedDurationSeconds: number;
  evaluationCriteria: string[];
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
