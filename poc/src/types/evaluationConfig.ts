/**
 * 評価設定の型定義
 * DB駆動の評価パラメータ設定
 */

import type { JLPTLevel } from './interview';

// ============================================
// JLPT Config
// ============================================

export interface JLPTLevelWeights {
  vocabulary: number;
  grammar: number;
  content: number;
  honorifics: number;
}

export interface JLPTLevelSettings {
  speechRate: number;
  useSimplified: boolean;
  followUpDepth: number;
}

export interface EstimationRanges {
  N1: number;
  N2: number;
  N3: number;
  N4: number;
  N5: number;
}

export interface JLPTConfig {
  weights: Record<JLPTLevel, JLPTLevelWeights>;
  settings: Record<JLPTLevel, JLPTLevelSettings>;
  estimationRanges: EstimationRanges;
}

// ============================================
// Scoring Config
// ============================================

export interface GradeThreshold {
  grade: string;
  label: string;
  minScore: number;
  recommendation: string;
}

export interface PerformanceGrades {
  excellentMin: number;
  goodMin: number;
  passMin: number;
}

export interface LevelAdjustment {
  highThreshold: number;
  lowThreshold: number;
  dailyChallengeLimit: number;
}

export interface JobSuitabilityEntry {
  requiredLevel: string;
  minScore: number;
}

export interface ScoringConfig {
  gradeThresholds: GradeThreshold[];
  performanceGrades: PerformanceGrades;
  levelAdjustment: LevelAdjustment;
  jobSuitability: Record<string, JobSuitabilityEntry>;
}

// ============================================
// Weak Point Config
// ============================================

export interface WeakPointPriorityConfig {
  occurrenceMultiplier: number;
  recencyWindowDays: number;
  highThreshold: number;
  mediumThreshold: number;
}

export interface WeakPointConfig {
  threshold: number;
  tagThreshold: number;
  resolutionCount: number;
  resolutionScore: number;
  priority: WeakPointPriorityConfig;
}

// ============================================
// Combined Config
// ============================================

export interface EvaluationConfigValues {
  jlpt_config: JLPTConfig;
  scoring_config: ScoringConfig;
  weak_point_config: WeakPointConfig;
}

// ============================================
// API Response types
// ============================================

export interface EvaluationConfigEntry {
  id: string;
  config_key: string;
  config_value: Record<string, unknown>;
  description: string | null;
  version: number;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EvaluationConfigListResponse {
  configs: EvaluationConfigEntry[];
}

export interface ConfigHistoryEntry {
  id: string;
  config_key: string;
  previous_value: Record<string, unknown>;
  new_value: Record<string, unknown>;
  version: number;
  changed_by: string | null;
  changed_at: string;
}

export interface ConfigHistoryListResponse {
  history: ConfigHistoryEntry[];
  total: number;
}
