/**
 * 顔分析関連の型定義
 */

/** 感情スコア */
export interface EmotionScores {
  /** 怒りのスコア (0-100) */
  angry: number;
  /** 嫌悪のスコア (0-100) */
  disgust: number;
  /** 恐怖・不安のスコア (0-100) */
  fear: number;
  /** 喜びのスコア (0-100) */
  happy: number;
  /** 悲しみのスコア (0-100) */
  sad: number;
  /** 驚きのスコア (0-100) */
  surprise: number;
  /** 平静のスコア (0-100) */
  neutral: number;
}

/** 検出された顔の領域 */
export interface FaceRegion {
  /** 顔領域の左上X座標 */
  x: number;
  /** 顔領域の左上Y座標 */
  y: number;
  /** 顔領域の幅 */
  w: number;
  /** 顔領域の高さ */
  h: number;
}

/** フィードバックの種類 */
export type FeedbackType = 'positive' | 'neutral' | 'negative';

/** 緊張度分析結果 */
export interface TensionAnalysis {
  /** 緊張度 (0=リラックス, 1=緊張) */
  tensionLevel: number;
  /** リラックス度 (0=緊張, 1=リラックス) */
  relaxLevel: number;
  /** 最も強い感情 */
  dominantEmotion: string;
  /** ユーザーへのフィードバックメッセージ */
  feedbackMessage: string;
  /** フィードバックの種類 */
  feedbackType: FeedbackType;
}

/** 画像品質の状態 */
export type BrightnessStatus = 'ok' | 'too_dark' | 'too_bright' | 'unknown';

/** 画像品質分析結果 */
export interface ImageQuality {
  /** 平均明るさ (0-255) */
  averageBrightness: number;
  /** 明るさの状態 */
  brightnessStatus: BrightnessStatus;
  /** 暗すぎるかどうか */
  isTooDark: boolean;
  /** 明るすぎるかどうか */
  isTooBright: boolean;
}

/** 顔の向きの状態 */
export type FaceDirection = 'center' | 'left' | 'right' | 'up' | 'down' | 'away';

/** 顔の向き分析結果 */
export interface HeadPose {
  /** 左右の向き（度）: 負=左, 0=正面, 正=右 */
  yaw: number;
  /** 上下の向き（度）: 負=下, 0=正面, 正=上 */
  pitch: number;
  /** 首の傾き（度）: 負=左傾き, 0=正面, 正=右傾き */
  roll: number;
  /** カメラを見ているかどうか */
  isLookingAtCamera: boolean;
  /** 顔の向き */
  faceDirection: FaceDirection;
  /** ユーザーへのフィードバック */
  feedbackMessage: string;
}

/** 顔分析APIレスポンス（バックエンド形式） */
export interface FaceAnalysisApiResponse {
  success: boolean;
  face_detected: boolean;
  face_region: {
    x: number;
    y: number;
    w: number;
    h: number;
  } | null;
  emotions: {
    angry: number;
    disgust: number;
    fear: number;
    happy: number;
    sad: number;
    surprise: number;
    neutral: number;
  } | null;
  tension: {
    tension_level: number;
    relax_level: number;
    dominant_emotion: string;
    feedback_message: string;
    feedback_type: string;
  } | null;
  image_quality: {
    average_brightness: number;
    brightness_status: string;
    is_too_dark: boolean;
    is_too_bright: boolean;
  } | null;
  head_pose: {
    yaw: number;
    pitch: number;
    roll: number;
    is_looking_at_camera: boolean;
    face_direction: string;
    feedback_message: string;
  } | null;
  error_message: string | null;
}

/** 顔分析結果（フロントエンド形式） */
export interface FaceAnalysisResult {
  /** 分析が成功したかどうか */
  success: boolean;
  /** 顔が検出されたかどうか */
  faceDetected: boolean;
  /** 検出された顔の領域 */
  faceRegion: FaceRegion | null;
  /** 感情スコア */
  emotions: EmotionScores | null;
  /** 緊張度分析結果 */
  tension: TensionAnalysis | null;
  /** 画像品質分析結果 */
  imageQuality: ImageQuality | null;
  /** 顔の向き分析結果 */
  headPose: HeadPose | null;
  /** エラーメッセージ */
  errorMessage: string | null;
}

/** useFaceAnalysis フックの状態 */
export interface UseFaceAnalysisState {
  /** 最新の分析結果 */
  result: FaceAnalysisResult | null;
  /** 分析中かどうか */
  isAnalyzing: boolean;
  /** エラーメッセージ */
  error: string | null;
  /** 分析の有効/無効状態 */
  isEnabled: boolean;
}

/** useFaceAnalysis フックの戻り値 */
export interface UseFaceAnalysisReturn extends UseFaceAnalysisState {
  /** 分析を開始する */
  startAnalysis: () => void;
  /** 分析を停止する */
  stopAnalysis: () => void;
  /** 分析の有効/無効を切り替える */
  toggleAnalysis: () => void;
}
