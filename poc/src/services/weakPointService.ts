/**
 * 苦手分析サービス
 *
 * 設計書 6.5 苦手分析の仕組み に基づく実装
 */

import type {
  WeakPoint,
  WeakPointPriority,
  EvaluationCategory,
  CategoryScores,
  WEAK_POINT_THRESHOLD,
  WEAK_POINT_TAG_THRESHOLD,
  WEAK_POINT_RESOLUTION_COUNT,
  WEAK_POINT_RESOLUTION_SCORE,
} from '@/types/interview';

// 定数を再定義（importの問題を回避）
const THRESHOLD = 70;
const TAG_THRESHOLD = 3;
const RESOLUTION_COUNT = 3;
const RESOLUTION_SCORE = 80;

/**
 * 苦手項目の永続化用インターフェース
 */
export interface WeakPointRecord {
  id: string;
  userId: string;
  category: EvaluationCategory;
  description: string;
  priority: WeakPointPriority;
  occurrenceCount: number;
  lastOccurredAt: Date;
  consecutiveHighScores: number;
  resolved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 優先度スコア計算
 *
 * 優先度スコア = (発生回数 × 10) + (30 - 最終発生からの日数)
 *
 * 優先度判定:
 * - high: 優先度スコア >= 50
 * - medium: 優先度スコア >= 25
 * - low: 優先度スコア < 25
 */
export function calculatePriorityScore(
  occurrenceCount: number,
  lastOccurredAt: Date
): number {
  const now = new Date();
  const daysSinceLastOccurrence = Math.floor(
    (now.getTime() - lastOccurredAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  const score = (occurrenceCount * 10) + Math.max(0, 30 - daysSinceLastOccurrence);
  return score;
}

/**
 * 優先度スコアから優先度レベルを判定
 */
export function determinePriorityLevel(priorityScore: number): WeakPointPriority {
  if (priorityScore >= 50) return 'high';
  if (priorityScore >= 25) return 'medium';
  return 'low';
}

/**
 * スコアから苦手候補を検出
 */
export function detectWeakPointCandidates(
  scores: CategoryScores
): EvaluationCategory[] {
  const categories: EvaluationCategory[] = ['vocabulary', 'grammar', 'content', 'honorifics'];
  return categories.filter((category) => scores[category] < THRESHOLD);
}

/**
 * 苦手項目リストを更新
 *
 * - 新しい苦手候補が既存リストにあれば発生回数を増加
 * - なければ新規追加（ただしTAG_THRESHOLD回未満は候補のまま）
 * - 高スコアが連続したら解消判定
 */
export function updateWeakPoints(
  existingWeakPoints: WeakPointRecord[],
  scores: CategoryScores,
  userId: string
): WeakPointRecord[] {
  const now = new Date();
  const candidates = detectWeakPointCandidates(scores);
  const categories: EvaluationCategory[] = ['vocabulary', 'grammar', 'content', 'honorifics'];

  const updatedWeakPoints = existingWeakPoints.map((wp) => {
    const score = scores[wp.category];

    // 苦手カテゴリで再度低スコアだった場合
    if (candidates.includes(wp.category)) {
      return {
        ...wp,
        occurrenceCount: wp.occurrenceCount + 1,
        lastOccurredAt: now,
        consecutiveHighScores: 0,
        priority: determinePriorityLevel(
          calculatePriorityScore(wp.occurrenceCount + 1, now)
        ),
        updatedAt: now,
      };
    }

    // 高スコアを取得した場合
    if (score >= RESOLUTION_SCORE) {
      const newConsecutiveHighScores = wp.consecutiveHighScores + 1;

      // 解消条件を満たした場合
      if (newConsecutiveHighScores >= RESOLUTION_COUNT) {
        return {
          ...wp,
          consecutiveHighScores: newConsecutiveHighScores,
          resolved: true,
          updatedAt: now,
        };
      }

      return {
        ...wp,
        consecutiveHighScores: newConsecutiveHighScores,
        updatedAt: now,
      };
    }

    // それ以外（普通のスコア）
    return {
      ...wp,
      consecutiveHighScores: 0,
      updatedAt: now,
    };
  });

  // 新しい苦手候補の追加
  for (const category of candidates) {
    const existing = updatedWeakPoints.find((wp) => wp.category === category && !wp.resolved);

    if (!existing) {
      updatedWeakPoints.push({
        id: `wp-${userId}-${category}-${Date.now()}`,
        userId,
        category,
        description: getDefaultDescription(category),
        priority: 'low',
        occurrenceCount: 1,
        lastOccurredAt: now,
        consecutiveHighScores: 0,
        resolved: false,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  return updatedWeakPoints;
}

/**
 * カテゴリのデフォルト説明文
 */
function getDefaultDescription(category: EvaluationCategory): string {
  switch (category) {
    case 'vocabulary':
      return '語彙力の改善が必要です';
    case 'grammar':
      return '文法の正確性に課題があります';
    case 'content':
      return '回答内容の充実が必要です';
    case 'honorifics':
      return '敬語の使い方に課題があります';
  }
}

/**
 * 苦手項目を苦手タグとして確定すべきか判定
 */
export function shouldRegisterAsTag(record: WeakPointRecord): boolean {
  return record.occurrenceCount >= TAG_THRESHOLD && !record.resolved;
}

/**
 * 未解決の苦手項目を優先度順にソート
 */
export function sortWeakPointsByPriority(
  weakPoints: WeakPointRecord[]
): WeakPointRecord[] {
  return [...weakPoints]
    .filter((wp) => !wp.resolved)
    .sort((a, b) => {
      const scoreA = calculatePriorityScore(a.occurrenceCount, a.lastOccurredAt);
      const scoreB = calculatePriorityScore(b.occurrenceCount, b.lastOccurredAt);
      return scoreB - scoreA; // 降順
    });
}

/**
 * 苦手項目に関連する質問を優先選択するためのカテゴリリスト取得
 */
export function getHighPriorityCategories(
  weakPoints: WeakPointRecord[]
): EvaluationCategory[] {
  const sorted = sortWeakPointsByPriority(weakPoints);
  const highPriority = sorted.filter((wp) => wp.priority === 'high');
  return highPriority.map((wp) => wp.category);
}

/**
 * 学習進捗サマリー生成
 */
export interface LearningProgressSummary {
  totalWeakPoints: number;
  resolvedCount: number;
  activeCount: number;
  highPriorityCount: number;
  mediumPriorityCount: number;
  lowPriorityCount: number;
  categoryBreakdown: Record<EvaluationCategory, {
    isWeak: boolean;
    occurrenceCount: number;
    priority: WeakPointPriority | null;
  }>;
}

export function generateLearningProgressSummary(
  weakPoints: WeakPointRecord[]
): LearningProgressSummary {
  const active = weakPoints.filter((wp) => !wp.resolved);
  const categories: EvaluationCategory[] = ['vocabulary', 'grammar', 'content', 'honorifics'];

  const categoryBreakdown = categories.reduce((acc, category) => {
    const record = active.find((wp) => wp.category === category);
    acc[category] = {
      isWeak: !!record,
      occurrenceCount: record?.occurrenceCount ?? 0,
      priority: record?.priority ?? null,
    };
    return acc;
  }, {} as LearningProgressSummary['categoryBreakdown']);

  return {
    totalWeakPoints: weakPoints.length,
    resolvedCount: weakPoints.filter((wp) => wp.resolved).length,
    activeCount: active.length,
    highPriorityCount: active.filter((wp) => wp.priority === 'high').length,
    mediumPriorityCount: active.filter((wp) => wp.priority === 'medium').length,
    lowPriorityCount: active.filter((wp) => wp.priority === 'low').length,
    categoryBreakdown,
  };
}

/**
 * WeakPointRecordをWeakPoint型に変換
 */
export function toWeakPoint(record: WeakPointRecord): WeakPoint {
  return {
    id: record.id,
    category: record.category,
    description: record.description,
    example: '',
    suggestion: getSuggestionForCategory(record.category),
    priority: record.priority,
    occurrenceCount: record.occurrenceCount,
    lastOccurredAt: record.lastOccurredAt,
    resolved: record.resolved,
  };
}

/**
 * カテゴリ別の改善提案
 */
function getSuggestionForCategory(category: EvaluationCategory): string {
  switch (category) {
    case 'vocabulary':
      return 'ビジネス用語や専門用語の学習を増やし、語彙力を強化しましょう。毎日5つの新しい単語を覚えることをお勧めします。';
    case 'grammar':
      return '基本的な文法パターンを復習し、特に接続表現に注意しましょう。JLPTの文法問題集を活用することをお勧めします。';
    case 'content':
      return '質問の意図を正確に理解し、STAR法（状況→課題→行動→結果）を使って具体的に回答することを心がけましょう。';
    case 'honorifics':
      return '尊敬語・謙譲語・丁寧語の違いを学び、場面に応じた使い分けを練習しましょう。ロールプレイ形式の練習が効果的です。';
  }
}
