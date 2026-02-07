/**
 * 適応型JLPTレベル管理フック
 * ユーザーの評価スコアに基づいてJLPTレベルを調整する
 *
 * 評価スコア別の調整ルール:
 * - 70点以上: レベルを上げる（推奨）
 * - 31〜69点: 同じレベルで再挑戦（推奨）、上のレベルへの挑戦も可能
 * - 30点以下: レベルを下げる（推奨）
 */

import { useState, useCallback, useEffect } from 'react';
import type {
  JLPTLevel,
  CategoryScores,
  WeakPoint,
  EnterpriseEvaluationReport,
  LevelPerformance,
  JobSuitability,
  PerformanceGrade,
  EstimationDirection,
  JobSuitabilityStatus,
  InterviewResultData,
  InterviewSessionResult,
} from '@/types/interview';
import {
  DEFAULT_SCORING_CONFIG,
  DEFAULT_JLPT_CONFIG,
} from '@/data/defaultEvaluationConfig';
import type { ScoringConfig, JLPTConfig } from '@/types/evaluationConfig';

// JLPT レベルの順序（低→高）
const JLPT_LEVELS: JLPTLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

// デフォルトのスコア閾値（フォールバック用）
const SCORE_THRESHOLD_HIGH = DEFAULT_SCORING_CONFIG.levelAdjustment.highThreshold;
const SCORE_THRESHOLD_LOW = DEFAULT_SCORING_CONFIG.levelAdjustment.lowThreshold;

// LocalStorage キー
const STORAGE_KEY = 'ai-interview-adaptive-level';

// デフォルトの1日あたりのチャレンジ回数制限
const DAILY_CHALLENGE_LIMIT = DEFAULT_SCORING_CONFIG.levelAdjustment.dailyChallengeLimit;

/**
 * セッション結果
 */
export interface SessionResult {
  level: JLPTLevel;
  score: number;
  timestamp: Date;
  /** チャレンジ枠でのセッションかどうか */
  isChallengeSession?: boolean;
  /** セッションID（時系列追跡用） */
  sessionId?: string;
  /** カテゴリ別スコア */
  categoryScores?: CategoryScores;
  /** 苦手項目 */
  weakPoints?: WeakPoint[];
  /** 総評 */
  overallFeedback?: string;
}

/**
 * レベル別の統計情報
 */
export interface LevelStats {
  level: JLPTLevel;
  sessionCount: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  latestScore: number;
}

/**
 * レベル調整の方向
 */
export type AdjustmentDirection = 'up' | 'down' | 'stable';

/**
 * 次のレベル計算結果
 */
export interface NextLevelResult {
  nextLevel: JLPTLevel;
  direction: AdjustmentDirection;
  canGoHigher: boolean;
  canGoLower: boolean;
}

/**
 * 適応型レベル状態
 */
export interface AdaptiveLevelState {
  /** ユーザーが最初に申請したレベル */
  declaredLevel: JLPTLevel;
  /** 現在のチャレンジレベル */
  currentLevel: JLPTLevel;
  /** セッション履歴 */
  sessionHistory: SessionResult[];
  /** 最新の調整方向 */
  adjustmentDirection: AdjustmentDirection;
  /** チャレンジ枠で挑戦中かどうか */
  isChallengeMode: boolean;
}

/**
 * LocalStorageに保存するデータ構造
 */
interface StoredState {
  declaredLevel: JLPTLevel;
  currentLevel: JLPTLevel;
  sessionHistory: Array<{
    level: JLPTLevel;
    score: number;
    timestamp: string;
    isChallengeSession?: boolean;
  }>;
  adjustmentDirection: AdjustmentDirection;
  isChallengeMode: boolean;
}

/**
 * 次のJLPTレベルを計算する
 * @param currentLevel 現在のレベル
 * @param score 評価スコア（0-100）
 * @param scoringConfig オプション: スコア設定。未指定時はデフォルト値使用
 * @returns 次のレベルと調整方向
 */
export function calculateNextLevel(
  currentLevel: JLPTLevel,
  score: number,
  scoringConfig?: ScoringConfig
): NextLevelResult {
  const highThreshold = scoringConfig ? scoringConfig.levelAdjustment.highThreshold : SCORE_THRESHOLD_HIGH;
  const lowThreshold = scoringConfig ? scoringConfig.levelAdjustment.lowThreshold : SCORE_THRESHOLD_LOW;

  const currentIndex = JLPT_LEVELS.indexOf(currentLevel);
  const canGoHigher = currentIndex < JLPT_LEVELS.length - 1;
  const canGoLower = currentIndex > 0;

  // highThreshold点以上: レベルを上げる
  if (score >= highThreshold && canGoHigher) {
    return {
      nextLevel: JLPT_LEVELS[currentIndex + 1],
      direction: 'up',
      canGoHigher: currentIndex + 1 < JLPT_LEVELS.length - 1,
      canGoLower: true,
    };
  }

  // lowThreshold点以下: レベルを下げる
  if (score <= lowThreshold && canGoLower) {
    return {
      nextLevel: JLPT_LEVELS[currentIndex - 1],
      direction: 'down',
      canGoHigher: true,
      canGoLower: currentIndex - 1 > 0,
    };
  }

  // それ以外 または 上限/下限に達している場合: 同じレベル
  return {
    nextLevel: currentLevel,
    direction: 'stable',
    canGoHigher,
    canGoLower,
  };
}

/**
 * 1つ上のレベルを取得する
 * @param level 現在のレベル
 * @returns 1つ上のレベル（N1の場合はN1を返す）
 */
export function getHigherLevel(level: JLPTLevel): JLPTLevel {
  const index = JLPT_LEVELS.indexOf(level);
  if (index < JLPT_LEVELS.length - 1) {
    return JLPT_LEVELS[index + 1];
  }
  return level;
}

/**
 * 1つ下のレベルを取得する
 * @param level 現在のレベル
 * @returns 1つ下のレベル（N5の場合はN5を返す）
 */
export function getLowerLevel(level: JLPTLevel): JLPTLevel {
  const index = JLPT_LEVELS.indexOf(level);
  if (index > 0) {
    return JLPT_LEVELS[index - 1];
  }
  return level;
}

/**
 * レベルが最高レベル（N1）かどうかを判定
 */
export function isHighestLevel(level: JLPTLevel): boolean {
  return level === 'N1';
}

/**
 * レベルが最低レベル（N5）かどうかを判定
 */
export function isLowestLevel(level: JLPTLevel): boolean {
  return level === 'N5';
}

/**
 * スコアに基づくボタン表示タイプを取得
 * @param score スコア
 * @param scoringConfig オプション: スコア設定。未指定時はデフォルト値使用
 */
export function getButtonType(
  score: number,
  scoringConfig?: ScoringConfig
): 'level_up' | 'stable_with_option' | 'level_down' {
  const highThreshold = scoringConfig ? scoringConfig.levelAdjustment.highThreshold : SCORE_THRESHOLD_HIGH;
  const lowThreshold = scoringConfig ? scoringConfig.levelAdjustment.lowThreshold : SCORE_THRESHOLD_LOW;

  if (score >= highThreshold) {
    return 'level_up';
  }
  if (score <= lowThreshold) {
    return 'level_down';
  }
  return 'stable_with_option';
}

/**
 * 特定レベルのセッション履歴から統計情報を計算する
 */
export function calculateLevelStats(
  sessionHistory: SessionResult[],
  level: JLPTLevel
): LevelStats | null {
  const levelSessions = sessionHistory.filter((s) => s.level === level);

  if (levelSessions.length === 0) {
    return null;
  }

  const scores = levelSessions.map((s) => s.score);
  const sum = scores.reduce((acc, score) => acc + score, 0);

  return {
    level,
    sessionCount: levelSessions.length,
    averageScore: Math.round(sum / levelSessions.length),
    highestScore: Math.max(...scores),
    lowestScore: Math.min(...scores),
    latestScore: levelSessions[levelSessions.length - 1].score,
  };
}

/**
 * 今日の日付の開始時刻を取得（00:00:00）
 */
function getStartOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * 今日のチャレンジセッション数を計算する
 */
export function countTodayChallenges(sessionHistory: SessionResult[]): number {
  const startOfToday = getStartOfToday();
  return sessionHistory.filter(
    (s) => s.isChallengeSession && s.timestamp >= startOfToday
  ).length;
}

/**
 * 残りのチャレンジ回数を取得
 */
export function getRemainingChallenges(sessionHistory: SessionResult[]): number {
  const todayChallenges = countTodayChallenges(sessionHistory);
  return Math.max(0, DAILY_CHALLENGE_LIMIT - todayChallenges);
}

/**
 * 適応型JLPTレベル管理フック
 */
export function useAdaptiveLevel(initialLevel: JLPTLevel = 'N3') {
  const [state, setState] = useState<AdaptiveLevelState>({
    declaredLevel: initialLevel,
    currentLevel: initialLevel,
    sessionHistory: [],
    adjustmentDirection: 'stable',
    isChallengeMode: false,
  });

  // LocalStorageから状態を復元
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: StoredState = JSON.parse(stored);
        setState({
          declaredLevel: parsed.declaredLevel,
          currentLevel: parsed.currentLevel,
          sessionHistory: parsed.sessionHistory.map((s) => ({
            ...s,
            timestamp: new Date(s.timestamp),
            isChallengeSession: s.isChallengeSession ?? false,
          })),
          adjustmentDirection: parsed.adjustmentDirection,
          isChallengeMode: parsed.isChallengeMode ?? false,
        });
      }
    } catch (error) {
      console.error('[useAdaptiveLevel] Failed to restore state:', error);
    }
  }, []);

  // 状態変更時にLocalStorageに保存
  useEffect(() => {
    try {
      const toStore: StoredState = {
        declaredLevel: state.declaredLevel,
        currentLevel: state.currentLevel,
        sessionHistory: state.sessionHistory.map((s) => ({
          level: s.level,
          score: s.score,
          timestamp: s.timestamp.toISOString(),
          isChallengeSession: s.isChallengeSession,
        })),
        adjustmentDirection: state.adjustmentDirection,
        isChallengeMode: state.isChallengeMode,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch (error) {
      console.error('[useAdaptiveLevel] Failed to save state:', error);
    }
  }, [state]);

  /**
   * セッション完了時に呼び出す
   * スコアに基づいて次のレベルを計算し、履歴に追加する
   */
  const recordSession = useCallback((score: number): NextLevelResult => {
    const result = calculateNextLevel(state.currentLevel, score);

    const newSession: SessionResult = {
      level: state.currentLevel,
      score,
      timestamp: new Date(),
      isChallengeSession: state.isChallengeMode,
    };

    setState((prev) => ({
      ...prev,
      currentLevel: result.nextLevel,
      sessionHistory: [...prev.sessionHistory, newSession],
      adjustmentDirection: result.direction,
      isChallengeMode: false, // セッション完了後はチャレンジモード解除
    }));

    return result;
  }, [state.currentLevel, state.isChallengeMode]);

  /**
   * レベルを手動で変更する（ユーザーが「上のレベルにチャレンジ」を選んだ場合など）
   */
  const setLevel = useCallback((level: JLPTLevel) => {
    setState((prev) => ({
      ...prev,
      currentLevel: level,
      adjustmentDirection: 'stable',
      isChallengeMode: false,
    }));
  }, []);

  /**
   * 申請レベルを設定する（初回設定時など）
   */
  const setDeclaredLevel = useCallback((level: JLPTLevel) => {
    setState((prev) => ({
      ...prev,
      declaredLevel: level,
      currentLevel: level,
      adjustmentDirection: 'stable',
      isChallengeMode: false,
    }));
  }, []);

  /**
   * チャレンジ枠で挑戦する（申告レベルより1つ上のレベルで開始）
   * @returns チャレンジ開始に成功したかどうか
   */
  const startChallengeMode = useCallback((): boolean => {
    const remainingChallenges = getRemainingChallenges(state.sessionHistory);
    if (remainingChallenges <= 0) {
      console.warn('[useAdaptiveLevel] Daily challenge limit reached');
      return false;
    }

    const higherLevel = getHigherLevel(state.declaredLevel);
    // N1の場合はチャレンジ枠不可（すでに最高レベル）
    if (higherLevel === state.declaredLevel) {
      return false;
    }

    setState((prev) => ({
      ...prev,
      currentLevel: higherLevel,
      isChallengeMode: true,
      adjustmentDirection: 'stable',
    }));

    return true;
  }, [state.sessionHistory, state.declaredLevel]);

  /**
   * チャレンジ枠を解除して申告レベルに戻る
   */
  const exitChallengeMode = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentLevel: prev.declaredLevel,
      isChallengeMode: false,
      adjustmentDirection: 'stable',
    }));
  }, []);

  /**
   * 状態をリセットする
   */
  const reset = useCallback(() => {
    setState({
      declaredLevel: initialLevel,
      currentLevel: initialLevel,
      sessionHistory: [],
      adjustmentDirection: 'stable',
      isChallengeMode: false,
    });
    localStorage.removeItem(STORAGE_KEY);
  }, [initialLevel]);

  /**
   * 最後のセッション結果を取得
   */
  const lastSession = state.sessionHistory.length > 0
    ? state.sessionHistory[state.sessionHistory.length - 1]
    : null;

  /**
   * 今日の残りチャレンジ回数
   */
  const remainingChallenges = getRemainingChallenges(state.sessionHistory);

  /**
   * 今日のチャレンジ回数
   */
  const todayChallengeCount = countTodayChallenges(state.sessionHistory);

  /**
   * チャレンジ枠が利用可能かどうか（申告レベルがN1以外かつ残り回数がある場合）
   */
  const canChallenge = !isHighestLevel(state.declaredLevel) && remainingChallenges > 0;

  /**
   * チャレンジ枠のレベル（申告レベルの1つ上）
   */
  const challengeLevel = getHigherLevel(state.declaredLevel);

  /**
   * 現在のレベルの統計情報（平均スコア等）
   */
  const currentLevelStats = calculateLevelStats(state.sessionHistory, state.currentLevel);

  /**
   * 全レベルの統計情報を取得
   */
  const getAllLevelStats = (): LevelStats[] => {
    return JLPT_LEVELS
      .map((level) => calculateLevelStats(state.sessionHistory, level))
      .filter((stats): stats is LevelStats => stats !== null);
  };

  /**
   * 企業向け統合評価レポートを生成
   */
  const generateReport = useCallback(
    (latestCategoryScores?: CategoryScores, latestWeakPoints?: WeakPoint[]) => {
      return generateEnterpriseReport(
        state.declaredLevel,
        state.sessionHistory,
        latestCategoryScores,
        latestWeakPoints
      );
    },
    [state.declaredLevel, state.sessionHistory]
  );

  /**
   * 面談結果データをJSON形式で取得（時系列順）
   */
  const getInterviewResultData = useCallback(
    (
      userId: string,
      latestCategoryScores?: CategoryScores,
      latestWeakPoints?: WeakPoint[]
    ) => {
      return generateInterviewResultData(
        userId,
        state.declaredLevel,
        state.sessionHistory,
        latestCategoryScores,
        latestWeakPoints
      );
    },
    [state.declaredLevel, state.sessionHistory]
  );

  /**
   * 推定実力レベル
   */
  const { estimatedLevel, reason: estimationReason } = calculateEstimatedLevel(
    state.declaredLevel,
    state.sessionHistory
  );

  return {
    // 状態
    declaredLevel: state.declaredLevel,
    currentLevel: state.currentLevel,
    sessionHistory: state.sessionHistory,
    adjustmentDirection: state.adjustmentDirection,
    isChallengeMode: state.isChallengeMode,
    lastSession,

    // チャレンジ枠関連
    canChallenge,
    challengeLevel,
    remainingChallenges,
    todayChallengeCount,
    dailyChallengeLimit: DAILY_CHALLENGE_LIMIT,

    // 統計情報（平均スコア方式）
    currentLevelStats,
    getAllLevelStats,

    // 推定実力レベル
    estimatedLevel,
    estimationReason,

    // アクション
    recordSession,
    setLevel,
    setDeclaredLevel,
    startChallengeMode,
    exitChallengeMode,
    reset,

    // 企業向けレポート生成
    generateReport,
    getInterviewResultData,

    // ユーティリティ
    isHighestLevel: isHighestLevel(state.currentLevel),
    isLowestLevel: isLowestLevel(state.currentLevel),
    getHigherLevel: () => getHigherLevel(state.currentLevel),
    getLowerLevel: () => getLowerLevel(state.currentLevel),
  };
}

export type UseAdaptiveLevelReturn = ReturnType<typeof useAdaptiveLevel>;

// ============================================
// 推定実力レベル算出ロジック
// ============================================

/**
 * スコアから推定JLPTレベルを算出
 * 設計書: 07_評価ロジック.md 7.9.5節
 * @param score スコア
 * @param jlptConfig オプション: JLPT設定（estimationRanges使用）。未指定時はデフォルト値使用
 */
export function estimateLevelFromScore(
  score: number,
  jlptConfig?: JLPTConfig
): JLPTLevel | 'below_N5' {
  const ranges = jlptConfig ? jlptConfig.estimationRanges : DEFAULT_JLPT_CONFIG.estimationRanges;

  if (score >= ranges.N1) return 'N1';
  if (score >= ranges.N2) return 'N2';
  if (score >= ranges.N3) return 'N3';
  if (score >= ranges.N4) return 'N4';
  if (score >= ranges.N5) return 'N5';
  return 'below_N5';
}

/**
 * パフォーマンスグレードを算出
 * @param score スコア
 * @param scoringConfig オプション: スコア設定。未指定時はデフォルト値使用
 */
export function calculatePerformanceGrade(
  score: number | null,
  scoringConfig?: ScoringConfig
): PerformanceGrade {
  if (score === null) return 'not_tested';

  const grades = scoringConfig ? scoringConfig.performanceGrades : DEFAULT_SCORING_CONFIG.performanceGrades;

  if (score >= grades.excellentMin) return 'excellent';
  if (score >= grades.goodMin) return 'good';
  if (score >= grades.passMin) return 'pass';
  return 'fail';
}

/**
 * 推定方向を計算
 */
function getEstimationDirection(
  declaredLevel: JLPTLevel,
  estimatedLevel: JLPTLevel | 'below_N5'
): EstimationDirection {
  const levels: (JLPTLevel | 'below_N5')[] = ['below_N5', 'N5', 'N4', 'N3', 'N2', 'N1'];
  const declaredIndex = levels.indexOf(declaredLevel);
  const estimatedIndex = levels.indexOf(estimatedLevel);

  if (estimatedIndex > declaredIndex) return 'higher';
  if (estimatedIndex < declaredIndex) return 'lower';
  return 'same';
}

/**
 * 業務適性を判定
 * @param levelPerformances レベル別パフォーマンス
 * @param scoringConfig オプション: スコア設定。未指定時はデフォルト値使用
 */
export function calculateJobSuitability(
  levelPerformances: LevelPerformance[],
  scoringConfig?: ScoringConfig
): JobSuitability {
  const suitabilityConfig = scoringConfig
    ? scoringConfig.jobSuitability
    : DEFAULT_SCORING_CONFIG.jobSuitability;

  const getStatus = (
    requiredLevel: JLPTLevel,
    minScore: number
  ): JobSuitabilityStatus => {
    const levels: JLPTLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];
    const requiredIndex = levels.indexOf(requiredLevel);

    // 必要レベル以上のレベルで合格スコアを取得しているかチェック
    for (let i = requiredIndex; i < levels.length; i++) {
      const perf = levelPerformances.find((p) => p.level === levels[i]);
      if (perf && perf.averageScore !== null && perf.averageScore >= minScore) {
        return 'capable';
      }
    }

    // 必要レベルで受験しているが合格スコアに達していない場合
    const directPerf = levelPerformances.find((p) => p.level === requiredLevel);
    if (directPerf && directPerf.averageScore !== null) {
      return directPerf.averageScore >= minScore - 20 ? 'needs_practice' : 'not_verified';
    }

    return 'not_verified';
  };

  return {
    basicService: getStatus(
      suitabilityConfig.basicService.requiredLevel as JLPTLevel,
      suitabilityConfig.basicService.minScore
    ),
    generalWork: getStatus(
      suitabilityConfig.generalWork.requiredLevel as JLPTLevel,
      suitabilityConfig.generalWork.minScore
    ),
    businessHonorifics: getStatus(
      suitabilityConfig.businessHonorifics.requiredLevel as JLPTLevel,
      suitabilityConfig.businessHonorifics.minScore
    ),
    advancedWork: getStatus(
      suitabilityConfig.advancedWork.requiredLevel as JLPTLevel,
      suitabilityConfig.advancedWork.minScore
    ),
  };
}

/**
 * 推定実力レベルと判定根拠を算出
 */
export function calculateEstimatedLevel(
  declaredLevel: JLPTLevel,
  sessionHistory: SessionResult[]
): { estimatedLevel: JLPTLevel | 'below_N5'; reason: string } {
  if (sessionHistory.length === 0) {
    return {
      estimatedLevel: declaredLevel,
      reason: 'セッション履歴がないため、申告レベルをそのまま使用',
    };
  }

  // 申告レベルでのセッションを抽出
  const declaredLevelSessions = sessionHistory.filter(
    (s) => s.level === declaredLevel && !s.isChallengeSession
  );

  // チャレンジセッション（上位レベル）を抽出
  const challengeSessions = sessionHistory.filter((s) => s.isChallengeSession);

  // 申告レベルでの平均スコアを計算
  const declaredAvgScore =
    declaredLevelSessions.length > 0
      ? declaredLevelSessions.reduce((sum, s) => sum + s.score, 0) /
        declaredLevelSessions.length
      : null;

  // チャレンジレベルでの最高スコアを取得
  const challengeHighScore =
    challengeSessions.length > 0
      ? Math.max(...challengeSessions.map((s) => s.score))
      : null;

  // 推定ロジック
  // 条件1: 申告レベルで80点以上 & チャレンジで70点以上 → 上位レベル相当
  if (
    declaredAvgScore !== null &&
    declaredAvgScore >= 80 &&
    challengeHighScore !== null &&
    challengeHighScore >= 70
  ) {
    const higherLevel = getHigherLevel(declaredLevel);
    return {
      estimatedLevel: higherLevel,
      reason: `${declaredLevel}で平均${Math.round(declaredAvgScore)}点、チャレンジ${higherLevel}で${challengeHighScore}点を達成`,
    };
  }

  // 条件2: 申告レベルで80点以上 & チャレンジ未受験 → 上位レベル相当（推定）
  if (
    declaredAvgScore !== null &&
    declaredAvgScore >= 80 &&
    challengeHighScore === null
  ) {
    const higherLevel = getHigherLevel(declaredLevel);
    if (higherLevel !== declaredLevel) {
      return {
        estimatedLevel: higherLevel,
        reason: `${declaredLevel}で平均${Math.round(declaredAvgScore)}点（優秀）のため、${higherLevel}相当と推定`,
      };
    }
  }

  // 条件3: 申告レベルで70-79点 → 申告レベル相当
  if (declaredAvgScore !== null && declaredAvgScore >= 70) {
    return {
      estimatedLevel: declaredLevel,
      reason: `${declaredLevel}で平均${Math.round(declaredAvgScore)}点（合格水準）`,
    };
  }

  // 条件4: 申告レベルで50-69点 → 申告レベル相当（下位寄り）
  if (declaredAvgScore !== null && declaredAvgScore >= 50) {
    return {
      estimatedLevel: declaredLevel,
      reason: `${declaredLevel}で平均${Math.round(declaredAvgScore)}点（やや苦手あり）`,
    };
  }

  // 条件5: 申告レベルで50点未満 → 下位レベル相当
  if (declaredAvgScore !== null && declaredAvgScore < 50) {
    const lowerLevel = getLowerLevel(declaredLevel);
    if (lowerLevel !== declaredLevel) {
      return {
        estimatedLevel: lowerLevel,
        reason: `${declaredLevel}で平均${Math.round(declaredAvgScore)}点のため、${lowerLevel}相当と推定`,
      };
    }
    // N5で50点未満の場合
    if (declaredAvgScore < 40) {
      return {
        estimatedLevel: 'below_N5',
        reason: `${declaredLevel}で平均${Math.round(declaredAvgScore)}点のため、N5未満と推定`,
      };
    }
  }

  // デフォルト: 申告レベル
  return {
    estimatedLevel: declaredLevel,
    reason: '評価データに基づき申告レベル相当と判定',
  };
}

/**
 * 企業向け統合評価レポートを生成
 */
export function generateEnterpriseReport(
  declaredLevel: JLPTLevel,
  sessionHistory: SessionResult[],
  latestCategoryScores?: CategoryScores,
  latestWeakPoints?: WeakPoint[]
): EnterpriseEvaluationReport {
  // レベル別パフォーマンスを計算
  const levelPerformances: LevelPerformance[] = JLPT_LEVELS.map((level) => {
    const levelSessions = sessionHistory.filter((s) => s.level === level);
    const challengeSessions = levelSessions.filter((s) => s.isChallengeSession);

    if (levelSessions.length === 0) {
      return {
        level,
        averageScore: null,
        sessionCount: 0,
        grade: 'not_tested' as PerformanceGrade,
        isChallengeSession: false,
      };
    }

    const avgScore =
      levelSessions.reduce((sum, s) => sum + s.score, 0) / levelSessions.length;

    return {
      level,
      averageScore: Math.round(avgScore),
      sessionCount: levelSessions.length,
      grade: calculatePerformanceGrade(avgScore),
      isChallengeSession: challengeSessions.length > 0,
    };
  });

  // 推定実力レベルを計算
  const { estimatedLevel, reason } = calculateEstimatedLevel(
    declaredLevel,
    sessionHistory
  );

  // 業務適性を計算
  const jobSuitability = calculateJobSuitability(levelPerformances);

  // デフォルトスコア
  const defaultScores: CategoryScores = {
    vocabulary: 0,
    grammar: 0,
    content: 0,
    honorifics: 0,
  };

  // 最新セッションの情報を取得
  const latestSession =
    sessionHistory.length > 0
      ? sessionHistory[sessionHistory.length - 1]
      : null;

  return {
    generatedAt: new Date().toISOString(),
    declaredLevel,
    estimatedLevel,
    estimationDirection: getEstimationDirection(declaredLevel, estimatedLevel),
    estimationReason: reason,
    levelPerformances,
    jobSuitability,
    detailedScores:
      latestCategoryScores ?? latestSession?.categoryScores ?? defaultScores,
    weakPoints: latestWeakPoints ?? latestSession?.weakPoints ?? [],
    totalSessions: sessionHistory.length,
    totalChallengeSessions: sessionHistory.filter((s) => s.isChallengeSession)
      .length,
  };
}

/**
 * 面談結果データをJSON形式で生成（時系列順）
 */
export function generateInterviewResultData(
  userId: string,
  declaredLevel: JLPTLevel,
  sessionHistory: SessionResult[],
  latestCategoryScores?: CategoryScores,
  latestWeakPoints?: WeakPoint[]
): InterviewResultData {
  // セッション履歴を時系列順（古い順）にソート
  const sortedSessions = [...sessionHistory].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  // 各セッションをInterviewSessionResult形式に変換
  const sessions: InterviewSessionResult[] = sortedSessions.map((s, index) => ({
    sessionId: s.sessionId ?? `session_${index + 1}`,
    conductedAt: s.timestamp.toISOString(),
    level: s.level,
    isChallengeSession: s.isChallengeSession ?? false,
    totalScore: s.score,
    categoryScores: s.categoryScores ?? {
      vocabulary: 0,
      grammar: 0,
      content: 0,
      honorifics: 0,
    },
    categoryFeedback: {
      vocabulary: '',
      grammar: '',
      content: '',
      honorifics: '',
    },
    weakPoints:
      s.weakPoints?.map((wp) => ({
        category: wp.category,
        description: wp.description,
        example: wp.example,
        suggestion: wp.suggestion,
      })) ?? [],
    overallFeedback: s.overallFeedback ?? '',
  }));

  // 企業向けレポートを生成
  const enterpriseReport = generateEnterpriseReport(
    declaredLevel,
    sessionHistory,
    latestCategoryScores,
    latestWeakPoints
  );

  return {
    userId,
    lastUpdatedAt: new Date().toISOString(),
    declaredLevel,
    sessions,
    enterpriseReport,
  };
}
