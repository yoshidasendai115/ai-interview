'use client';

import type {
  EvaluationResult,
  EvaluationCategory,
  JLPTLevel,
  EnterpriseEvaluationReport,
  PerformanceGrade,
  JobSuitabilityStatus,
} from '@/types/interview';
import {
  getButtonType,
  getHigherLevel,
  getLowerLevel,
  isHighestLevel,
  isLowestLevel,
} from '@/hooks/useAdaptiveLevel';
import type { LevelStats } from '@/hooks/useAdaptiveLevel';

// カテゴリラベル再定義
const LABELS: Record<EvaluationCategory, string> = {
  vocabulary: '語彙',
  grammar: '文法',
  content: '内容',
  honorifics: '敬語',
};

interface FeedbackDisplayProps {
  /** 評価結果 */
  evaluation: EvaluationResult;
  /** 前回のスコア（比較用） */
  previousScore?: number;
  /** 現在のJLPTレベル */
  currentLevel?: JLPTLevel;
  /** 現在のレベルの統計情報（平均スコア等） */
  levelStats?: LevelStats | null;
  /** 企業向け統合評価レポート */
  enterpriseReport?: EnterpriseEvaluationReport | null;
  /** 企業向けレポートを表示するかどうか */
  showEnterpriseReport?: boolean;
  /** 閉じるボタンのコールバック */
  onClose?: () => void;
  /** もう一度練習するコールバック（同じレベルで再挑戦） */
  onRetry?: () => void;
  /** 次のレベルで挑戦するコールバック */
  onNextLevel?: (level: JLPTLevel) => void;
}

// グレードに応じた星マークを生成
function getGradeStars(grade: PerformanceGrade): string {
  switch (grade) {
    case 'excellent':
      return '★★★★★';
    case 'good':
      return '★★★★☆';
    case 'pass':
      return '★★★☆☆';
    case 'fail':
      return '★★☆☆☆';
    case 'not_tested':
      return '－';
    default:
      return '';
  }
}

// グレードに応じたラベルを取得
function getGradeLabel(grade: PerformanceGrade): string {
  switch (grade) {
    case 'excellent':
      return '優秀';
    case 'good':
      return '良好';
    case 'pass':
      return '合格';
    case 'fail':
      return '要練習';
    case 'not_tested':
      return '未受験';
    default:
      return '';
  }
}

// 業務適性のステータスに応じたアイコンを取得
function getSuitabilityIcon(status: JobSuitabilityStatus): string {
  switch (status) {
    case 'capable':
      return '✅';
    case 'needs_practice':
      return '⚠️';
    case 'not_verified':
      return '❓';
    default:
      return '';
  }
}

// 業務適性のステータスに応じたラベルを取得
function getSuitabilityLabel(status: JobSuitabilityStatus): string {
  switch (status) {
    case 'capable':
      return '十分対応可能';
    case 'needs_practice':
      return '対応可能（要練習）';
    case 'not_verified':
      return '未検証';
    default:
      return '';
  }
}

// 推定方向に応じたアイコンを取得
function getEstimationDirectionIcon(direction: string): string {
  switch (direction) {
    case 'higher':
      return '⬆️';
    case 'lower':
      return '⬇️';
    case 'same':
      return '➡️';
    default:
      return '';
  }
}

export default function FeedbackDisplay({
  evaluation,
  previousScore,
  currentLevel = 'N3',
  levelStats,
  enterpriseReport,
  showEnterpriseReport = false,
  onClose,
  onRetry,
  onNextLevel,
}: FeedbackDisplayProps) {
  const { scores, feedback, weakPoints, overallFeedback, totalScore } = evaluation;
  const buttonType = getButtonType(totalScore);
  const higherLevel = getHigherLevel(currentLevel);
  const lowerLevel = getLowerLevel(currentLevel);
  const isAtHighest = isHighestLevel(currentLevel);
  const isAtLowest = isLowestLevel(currentLevel);

  // 最終評価（平均スコア）- 複数セッションがある場合に表示
  const hasMultipleSessions = levelStats && levelStats.sessionCount > 1;
  const finalScore = levelStats?.averageScore;

  // スコアに応じた色を取得
  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#22c55e'; // green
    if (score >= 60) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  // スコアに応じたラベルを取得
  const getScoreLabel = (score: number): string => {
    if (score >= 90) return '優秀';
    if (score >= 80) return '良好';
    if (score >= 70) return '合格';
    if (score >= 60) return '要改善';
    return '要注意';
  };

  // 前回比較
  const scoreDiff = previousScore ? totalScore - previousScore : null;

  return (
    <div className="feedback-display">
      {/* 総合スコアセクション */}
      <div className="total-score-section">
        <div className="score-circle" style={{ borderColor: getScoreColor(totalScore) }}>
          <span className="score-value">{totalScore}</span>
          <span className="score-max">/100</span>
        </div>
        <div className="score-info">
          <span className="score-label\" style={{ color: getScoreColor(totalScore) }}>
            {getScoreLabel(totalScore)}
          </span>
          {scoreDiff !== null && (
            <span className={`score-diff ${scoreDiff >= 0 ? 'positive' : 'negative'}`}>
              {scoreDiff >= 0 ? '+' : ''}{scoreDiff}点
            </span>
          )}
        </div>
      </div>

      {/* 最終評価（平均スコア） - 複数セッションがある場合のみ表示 */}
      {hasMultipleSessions && finalScore !== undefined && (
        <div className="final-score-section">
          <div className="final-score-header">
            <span className="final-score-label">最終評価（平均）</span>
            <span className="final-score-level">{currentLevel}</span>
          </div>
          <div className="final-score-content">
            <div className="final-score-value" style={{ color: getScoreColor(finalScore) }}>
              {finalScore}点
            </div>
            <div className="final-score-stats">
              <span>受験回数: {levelStats.sessionCount}回</span>
              <span>最高: {levelStats.highestScore}点</span>
              <span>最低: {levelStats.lowestScore}点</span>
            </div>
          </div>
        </div>
      )}

      {/* 総評 */}
      <div className="overall-feedback">
        <p>{overallFeedback}</p>
      </div>

      {/* カテゴリ別スコア */}
      <div className="category-scores">
        <h3>カテゴリ別評価</h3>
        <div className="category-grid">
          {(Object.keys(LABELS) as EvaluationCategory[]).map((category) => (
            <div key={category} className="category-item">
              <div className="category-header">
                <span className="category-name">{LABELS[category]}</span>
                <span
                  className="category-score"
                  style={{ color: getScoreColor(scores[category]) }}
                >
                  {scores[category]}点
                </span>
              </div>
              <div className="category-bar">
                <div
                  className="category-bar-fill"
                  style={{
                    width: `${scores[category]}%`,
                    backgroundColor: getScoreColor(scores[category]),
                  }}
                />
              </div>
              <p className="category-feedback">{feedback[category]}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 苦手項目 */}
      {weakPoints.length > 0 && (
        <div className="weak-points-section">
          <h3>改善ポイント</h3>
          <div className="weak-points-list">
            {weakPoints.map((wp) => (
              <div key={wp.id} className="weak-point-item">
                <div className="weak-point-header">
                  <span className={`priority-badge ${wp.priority}`}>
                    {wp.priority === 'high' ? '高優先' : wp.priority === 'medium' ? '中優先' : '低優先'}
                  </span>
                  <span className="weak-point-category">{LABELS[wp.category]}</span>
                </div>
                <p className="weak-point-description">{wp.description}</p>
                {wp.example && (
                  <div className="weak-point-example">
                    <span className="example-label">例:</span>
                    <span>{wp.example}</span>
                  </div>
                )}
                <p className="weak-point-suggestion">{wp.suggestion}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* レベル調整メッセージ */}
      <div className="level-adjustment-section">
        {buttonType === 'level_up' && !isAtHighest && (
          <div className="level-message level-up">
            <span className="level-icon">🎉</span>
            <span>素晴らしい！{higherLevel}にチャレンジしましょう！</span>
          </div>
        )}
        {buttonType === 'level_up' && isAtHighest && (
          <div className="level-message level-max">
            <span className="level-icon">🏆</span>
            <span>最高レベル（N1）で優秀な成績です！</span>
          </div>
        )}
        {buttonType === 'stable_with_option' && (
          <div className="level-message level-stable">
            <span className="level-icon">💪</span>
            <span>もう少し練習しましょう。</span>
          </div>
        )}
        {buttonType === 'level_down' && !isAtLowest && (
          <div className="level-message level-down">
            <span className="level-icon">📚</span>
            <span>基礎から練習しましょう。</span>
          </div>
        )}
        {buttonType === 'level_down' && isAtLowest && (
          <div className="level-message level-min">
            <span className="level-icon">📖</span>
            <span>N5で基礎を固めましょう。</span>
          </div>
        )}
      </div>

      {/* 企業向け統合評価レポート */}
      {showEnterpriseReport && enterpriseReport && (
        <div className="enterprise-report-section">
          <h2 className="enterprise-report-title">日本語能力 総合評価レポート</h2>

          {/* 1. 推定実力レベル */}
          <div className="report-block estimated-level-block">
            <h3>1. 推定実力レベル</h3>
            <div className="estimated-level-content">
              <div className="level-comparison">
                <div className="level-item">
                  <span className="level-label">申告レベル</span>
                  <span className="level-value">{enterpriseReport.declaredLevel}</span>
                </div>
                <div className="level-arrow">
                  {getEstimationDirectionIcon(enterpriseReport.estimationDirection)}
                </div>
                <div className="level-item estimated">
                  <span className="level-label">推定実力レベル</span>
                  <span className="level-value">
                    {enterpriseReport.estimatedLevel === 'below_N5'
                      ? 'N5未満'
                      : `${enterpriseReport.estimatedLevel}相当`}
                  </span>
                </div>
              </div>
              <p className="estimation-reason">
                判定根拠: {enterpriseReport.estimationReason}
              </p>
            </div>
          </div>

          {/* 2. レベル別パフォーマンス */}
          <div className="report-block level-performance-block">
            <h3>2. レベル別パフォーマンス</h3>
            <div className="level-performance-list">
              {enterpriseReport.levelPerformances.map((perf) => (
                <div
                  key={perf.level}
                  className={`level-performance-item ${perf.grade !== 'not_tested' ? 'tested' : ''}`}
                >
                  <span className="perf-level">{perf.level}</span>
                  <span className="perf-score">
                    {perf.averageScore !== null ? `${perf.averageScore}点` : '－'}
                  </span>
                  <span className="perf-stars">{getGradeStars(perf.grade)}</span>
                  <span className="perf-label">{getGradeLabel(perf.grade)}</span>
                  {perf.sessionCount > 0 && (
                    <span className="perf-sessions">
                      ({perf.sessionCount}回受験{perf.isChallengeSession ? '、チャレンジ含む' : ''})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 3. 業務適性判定 */}
          <div className="report-block job-suitability-block">
            <h3>3. 業務適性判定</h3>
            <div className="job-suitability-list">
              <div className="suitability-item">
                <span className="suitability-icon">
                  {getSuitabilityIcon(enterpriseReport.jobSuitability.basicService)}
                </span>
                <span className="suitability-job">基本接客（N4相当）</span>
                <span className="suitability-status">
                  {getSuitabilityLabel(enterpriseReport.jobSuitability.basicService)}
                </span>
              </div>
              <div className="suitability-item">
                <span className="suitability-icon">
                  {getSuitabilityIcon(enterpriseReport.jobSuitability.generalWork)}
                </span>
                <span className="suitability-job">一般業務（N3相当）</span>
                <span className="suitability-status">
                  {getSuitabilityLabel(enterpriseReport.jobSuitability.generalWork)}
                </span>
              </div>
              <div className="suitability-item">
                <span className="suitability-icon">
                  {getSuitabilityIcon(enterpriseReport.jobSuitability.businessHonorifics)}
                </span>
                <span className="suitability-job">ビジネス敬語（N2相当）</span>
                <span className="suitability-status">
                  {getSuitabilityLabel(enterpriseReport.jobSuitability.businessHonorifics)}
                </span>
              </div>
              <div className="suitability-item">
                <span className="suitability-icon">
                  {getSuitabilityIcon(enterpriseReport.jobSuitability.advancedWork)}
                </span>
                <span className="suitability-job">高度業務（N1相当）</span>
                <span className="suitability-status">
                  {getSuitabilityLabel(enterpriseReport.jobSuitability.advancedWork)}
                </span>
              </div>
            </div>
          </div>

          {/* 4. 詳細スコア */}
          <div className="report-block detailed-scores-block">
            <h3>4. 詳細スコア</h3>
            <div className="detailed-scores-grid">
              <div className="detail-score-item">
                <span className="detail-label">語彙</span>
                <span className="detail-value">{enterpriseReport.detailedScores.vocabulary}点</span>
              </div>
              <div className="detail-score-item">
                <span className="detail-label">文法</span>
                <span className="detail-value">{enterpriseReport.detailedScores.grammar}点</span>
              </div>
              <div className="detail-score-item">
                <span className="detail-label">内容</span>
                <span className="detail-value">{enterpriseReport.detailedScores.content}点</span>
              </div>
              <div className="detail-score-item">
                <span className="detail-label">敬語</span>
                <span className="detail-value">{enterpriseReport.detailedScores.honorifics}点</span>
              </div>
            </div>
            {enterpriseReport.weakPoints.length > 0 && (
              <div className="weak-points-summary">
                <span className="weak-label">苦手項目:</span>
                <span className="weak-items">
                  {enterpriseReport.weakPoints.map((wp) => wp.description).join('、')}
                </span>
              </div>
            )}
          </div>

          {/* セッションサマリー */}
          <div className="session-summary">
            <span>総セッション数: {enterpriseReport.totalSessions}回</span>
            <span>チャレンジセッション: {enterpriseReport.totalChallengeSessions}回</span>
            <span>レポート生成: {new Date(enterpriseReport.generatedAt).toLocaleString('ja-JP')}</span>
          </div>
        </div>
      )}

      {/* アクションボタン */}
      <div className="action-buttons">
        {/* 70点以上: レベルアップボタン */}
        {buttonType === 'level_up' && !isAtHighest && onNextLevel && (
          <button
            className="btn-level-up"
            onClick={() => onNextLevel(higherLevel)}
          >
            {higherLevel}にチャレンジ！
          </button>
        )}

        {/* 70点以上 & N1: 同じレベルで継続 */}
        {buttonType === 'level_up' && isAtHighest && onRetry && (
          <button className="btn-retry" onClick={onRetry}>
            N1で練習を続ける
          </button>
        )}

        {/* 31〜69点: 同じレベルで再挑戦 + 上のレベルオプション */}
        {buttonType === 'stable_with_option' && (
          <>
            {onRetry && (
              <button className="btn-retry" onClick={onRetry}>
                同じレベルで再挑戦
              </button>
            )}
            {!isAtHighest && onNextLevel && (
              <button
                className="btn-challenge"
                onClick={() => onNextLevel(higherLevel)}
              >
                上のレベルにチャレンジ
              </button>
            )}
          </>
        )}

        {/* 30点以下: レベルダウンボタン */}
        {buttonType === 'level_down' && !isAtLowest && onNextLevel && (
          <button
            className="btn-level-down"
            onClick={() => onNextLevel(lowerLevel)}
          >
            {lowerLevel}で練習する
          </button>
        )}

        {/* 30点以下 & N5: 同じレベルで継続 */}
        {buttonType === 'level_down' && isAtLowest && onRetry && (
          <button className="btn-retry" onClick={onRetry}>
            N5で練習を続ける
          </button>
        )}

        {onClose && (
          <button className="btn-close" onClick={onClose}>
            閉じる
          </button>
        )}
      </div>

      <style jsx>{`
        .feedback-display {
          display: flex;
          flex-direction: column;
          gap: 24px;
          padding: 24px;
          background: #1a1a2e;
          border-radius: 12px;
          max-width: 600px;
          margin: 0 auto;
        }

        .total-score-section {
          display: flex;
          align-items: center;
          gap: 24px;
          justify-content: center;
        }

        .score-circle {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          border: 4px solid;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #0f0f1a;
        }

        .score-value {
          font-size: 36px;
          font-weight: 700;
          color: #fff;
        }

        .score-max {
          font-size: 14px;
          color: #888;
        }

        .score-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .score-label {
          font-size: 24px;
          font-weight: 600;
        }

        .score-diff {
          font-size: 14px;
          font-weight: 500;
        }

        .score-diff.positive {
          color: #22c55e;
        }

        .score-diff.negative {
          color: #ef4444;
        }

        /* 最終評価（平均スコア）セクション */
        .final-score-section {
          padding: 16px 20px;
          background: linear-gradient(135deg, #1e1e3f 0%, #2d1f4e 100%);
          border-radius: 12px;
          border: 1px solid rgba(139, 92, 246, 0.3);
        }

        .final-score-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .final-score-label {
          font-size: 14px;
          font-weight: 600;
          color: #a78bfa;
        }

        .final-score-level {
          padding: 4px 12px;
          background: rgba(139, 92, 246, 0.2);
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          color: #c4b5fd;
        }

        .final-score-content {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .final-score-value {
          font-size: 32px;
          font-weight: 700;
        }

        .final-score-stats {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 13px;
          color: #9ca3af;
        }

        .overall-feedback {
          padding: 16px;
          background: #0f0f1a;
          border-radius: 8px;
          border-left: 4px solid #3b82f6;
        }

        .overall-feedback p {
          color: #d1d5db;
          line-height: 1.6;
          margin: 0;
        }

        .category-scores h3,
        .weak-points-section h3 {
          font-size: 18px;
          font-weight: 600;
          color: #fff;
          margin: 0 0 16px 0;
        }

        .category-grid {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .category-item {
          padding: 16px;
          background: #0f0f1a;
          border-radius: 8px;
        }

        .category-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .category-name {
          font-weight: 600;
          color: #fff;
        }

        .category-score {
          font-weight: 700;
          font-size: 18px;
        }

        .category-bar {
          height: 8px;
          background: #333;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .category-bar-fill {
          height: 100%;
          transition: width 0.5s ease-out;
        }

        .category-feedback {
          font-size: 14px;
          color: #9ca3af;
          margin: 0;
          line-height: 1.5;
        }

        .weak-points-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .weak-point-item {
          padding: 16px;
          background: #0f0f1a;
          border-radius: 8px;
          border-left: 4px solid #f59e0b;
        }

        .weak-point-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .priority-badge {
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .priority-badge.high {
          background: #7f1d1d;
          color: #fca5a5;
        }

        .priority-badge.medium {
          background: #78350f;
          color: #fcd34d;
        }

        .priority-badge.low {
          background: #1e3a5f;
          color: #93c5fd;
        }

        .weak-point-category {
          font-size: 14px;
          color: #9ca3af;
        }

        .weak-point-description {
          color: #fff;
          margin: 0 0 8px 0;
          font-weight: 500;
        }

        .weak-point-example {
          display: flex;
          gap: 8px;
          padding: 8px 12px;
          background: #1a1a2e;
          border-radius: 4px;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .example-label {
          color: #6b7280;
        }

        .weak-point-suggestion {
          font-size: 14px;
          color: #9ca3af;
          margin: 0;
          line-height: 1.5;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-top: 8px;
        }

        .btn-retry,
        .btn-close {
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }

        .btn-retry {
          background: #3b82f6;
          color: white;
        }

        .btn-retry:hover {
          background: #2563eb;
        }

        .btn-close {
          background: #374151;
          color: #d1d5db;
        }

        .btn-close:hover {
          background: #4b5563;
        }

        /* レベル調整セクション */
        .level-adjustment-section {
          margin-bottom: 8px;
        }

        .level-message {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
        }

        .level-icon {
          font-size: 24px;
        }

        .level-up {
          background: linear-gradient(135deg, #065f46 0%, #047857 100%);
          color: #ecfdf5;
          border: 1px solid #10b981;
        }

        .level-max {
          background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%);
          color: #f5f3ff;
          border: 1px solid #a78bfa;
        }

        .level-stable {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
          color: #eff6ff;
          border: 1px solid #60a5fa;
        }

        .level-down {
          background: linear-gradient(135deg, #9a3412 0%, #ea580c 100%);
          color: #fff7ed;
          border: 1px solid #fb923c;
        }

        .level-min {
          background: linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%);
          color: #fef2f2;
          border: 1px solid #f87171;
        }

        /* レベルアップボタン */
        .btn-level-up {
          padding: 14px 28px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
          background: linear-gradient(135deg, #059669 0%, #10b981 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .btn-level-up:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
        }

        /* チャレンジボタン（31-69点時のオプション） */
        .btn-challenge {
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 2px solid #60a5fa;
          background: transparent;
          color: #60a5fa;
        }

        .btn-challenge:hover {
          background: rgba(96, 165, 250, 0.1);
          border-color: #3b82f6;
          color: #3b82f6;
        }

        /* レベルダウンボタン */
        .btn-level-down {
          padding: 14px 28px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
          background: linear-gradient(135deg, #ea580c 0%, #f97316 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
        }

        .btn-level-down:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(249, 115, 22, 0.4);
        }

        /* 企業向け統合評価レポート */
        .enterprise-report-section {
          margin-top: 32px;
          padding: 24px;
          background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
          border-radius: 16px;
          border: 2px solid #4f46e5;
        }

        .enterprise-report-title {
          font-size: 20px;
          font-weight: 700;
          color: #c7d2fe;
          text-align: center;
          margin: 0 0 24px 0;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(99, 102, 241, 0.3);
        }

        .report-block {
          margin-bottom: 24px;
          padding: 16px;
          background: rgba(15, 23, 42, 0.6);
          border-radius: 12px;
          border: 1px solid rgba(99, 102, 241, 0.2);
        }

        .report-block h3 {
          font-size: 14px;
          font-weight: 600;
          color: #a5b4fc;
          margin: 0 0 16px 0;
          padding-bottom: 8px;
          border-bottom: 1px dashed rgba(99, 102, 241, 0.3);
        }

        /* 推定実力レベル */
        .estimated-level-content {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .level-comparison {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 24px;
        }

        .level-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .level-item .level-label {
          font-size: 12px;
          color: #9ca3af;
        }

        .level-item .level-value {
          font-size: 24px;
          font-weight: 700;
          color: #fff;
        }

        .level-item.estimated .level-value {
          color: #22c55e;
        }

        .level-arrow {
          font-size: 28px;
        }

        .estimation-reason {
          font-size: 13px;
          color: #9ca3af;
          margin: 0;
          text-align: center;
          font-style: italic;
        }

        /* レベル別パフォーマンス */
        .level-performance-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .level-performance-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          background: rgba(31, 41, 55, 0.5);
          border-radius: 8px;
          opacity: 0.6;
        }

        .level-performance-item.tested {
          opacity: 1;
          background: rgba(31, 41, 55, 0.8);
        }

        .perf-level {
          font-weight: 700;
          color: #c7d2fe;
          width: 32px;
        }

        .perf-score {
          font-weight: 600;
          color: #fff;
          width: 50px;
        }

        .perf-stars {
          color: #fbbf24;
          font-size: 14px;
          width: 80px;
        }

        .perf-label {
          font-size: 13px;
          color: #9ca3af;
          width: 60px;
        }

        .perf-sessions {
          font-size: 12px;
          color: #6b7280;
        }

        /* 業務適性判定 */
        .job-suitability-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .suitability-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: rgba(31, 41, 55, 0.5);
          border-radius: 8px;
        }

        .suitability-icon {
          font-size: 20px;
          width: 28px;
        }

        .suitability-job {
          flex: 1;
          font-weight: 500;
          color: #e5e7eb;
        }

        .suitability-status {
          font-size: 13px;
          color: #9ca3af;
        }

        /* 詳細スコア */
        .detailed-scores-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }

        .detail-score-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 12px 8px;
          background: rgba(31, 41, 55, 0.5);
          border-radius: 8px;
        }

        .detail-label {
          font-size: 12px;
          color: #9ca3af;
        }

        .detail-value {
          font-size: 18px;
          font-weight: 700;
          color: #fff;
        }

        .weak-points-summary {
          display: flex;
          gap: 8px;
          padding: 12px;
          background: rgba(239, 68, 68, 0.1);
          border-radius: 8px;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .weak-label {
          font-size: 13px;
          font-weight: 600;
          color: #fca5a5;
          white-space: nowrap;
        }

        .weak-items {
          font-size: 13px;
          color: #f87171;
        }

        /* セッションサマリー */
        .session-summary {
          display: flex;
          justify-content: center;
          gap: 24px;
          padding-top: 16px;
          border-top: 1px solid rgba(99, 102, 241, 0.2);
          font-size: 12px;
          color: #6b7280;
        }

        @media (max-width: 600px) {
          .detailed-scores-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .level-comparison {
            flex-direction: column;
            gap: 12px;
          }

          .level-arrow {
            transform: rotate(90deg);
          }

          .session-summary {
            flex-direction: column;
            align-items: center;
            gap: 8px;
          }
        }
      `}</style>
    </div>
  );
}
