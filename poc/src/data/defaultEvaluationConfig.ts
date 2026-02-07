/**
 * 評価設定のデフォルト値
 * API取得失敗時のフォールバック用
 */

import type {
  EvaluationConfigValues,
  JLPTConfig,
  ScoringConfig,
  WeakPointConfig,
} from '@/types/evaluationConfig';

export const DEFAULT_JLPT_CONFIG: JLPTConfig = {
  weights: {
    N1: { vocabulary: 0.20, grammar: 0.20, content: 0.25, honorifics: 0.35 },
    N2: { vocabulary: 0.20, grammar: 0.25, content: 0.25, honorifics: 0.30 },
    N3: { vocabulary: 0.25, grammar: 0.30, content: 0.25, honorifics: 0.20 },
    N4: { vocabulary: 0.30, grammar: 0.35, content: 0.25, honorifics: 0.10 },
    N5: { vocabulary: 0.35, grammar: 0.40, content: 0.20, honorifics: 0.05 },
  },
  settings: {
    N1: { speechRate: 1.0, useSimplified: false, followUpDepth: 3 },
    N2: { speechRate: 1.0, useSimplified: false, followUpDepth: 2 },
    N3: { speechRate: 0.75, useSimplified: false, followUpDepth: 2 },
    N4: { speechRate: 0.5, useSimplified: true, followUpDepth: 1 },
    N5: { speechRate: 0.5, useSimplified: true, followUpDepth: 1 },
  },
  estimationRanges: { N1: 80, N2: 70, N3: 60, N4: 50, N5: 40 },
};

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  gradeThresholds: [
    { grade: 'S', label: '優秀', minScore: 90, recommendation: '積極的に採用を推奨' },
    { grade: 'A', label: '非常に良い', minScore: 80, recommendation: '採用を推奨' },
    { grade: 'B', label: '良い', minScore: 70, recommendation: '採用を検討' },
    { grade: 'C', label: '普通', minScore: 60, recommendation: '追加面接を推奨' },
    { grade: 'D', label: '要改善', minScore: 0, recommendation: '現時点では採用非推奨' },
  ],
  performanceGrades: { excellentMin: 90, goodMin: 80, passMin: 70 },
  levelAdjustment: { highThreshold: 70, lowThreshold: 30, dailyChallengeLimit: 3 },
  jobSuitability: {
    basicService: { requiredLevel: 'N4', minScore: 70 },
    generalWork: { requiredLevel: 'N3', minScore: 70 },
    businessHonorifics: { requiredLevel: 'N2', minScore: 70 },
    advancedWork: { requiredLevel: 'N1', minScore: 70 },
  },
};

export const DEFAULT_WEAK_POINT_CONFIG: WeakPointConfig = {
  threshold: 70,
  tagThreshold: 3,
  resolutionCount: 3,
  resolutionScore: 80,
  priority: {
    occurrenceMultiplier: 10,
    recencyWindowDays: 30,
    highThreshold: 50,
    mediumThreshold: 25,
  },
};

export const DEFAULT_EVALUATION_CONFIG: EvaluationConfigValues = {
  jlpt_config: DEFAULT_JLPT_CONFIG,
  scoring_config: DEFAULT_SCORING_CONFIG,
  weak_point_config: DEFAULT_WEAK_POINT_CONFIG,
};
