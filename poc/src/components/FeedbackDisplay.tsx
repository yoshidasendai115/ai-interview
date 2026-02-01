'use client';

import type {
  EvaluationResult,
  EvaluationCategory,
  WeakPoint,
  CategoryScores,
  CATEGORY_LABELS,
} from '@/types/interview';

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
  /** 閉じるボタンのコールバック */
  onClose?: () => void;
  /** もう一度練習するコールバック */
  onRetry?: () => void;
}

export default function FeedbackDisplay({
  evaluation,
  previousScore,
  onClose,
  onRetry,
}: FeedbackDisplayProps) {
  const { scores, feedback, weakPoints, overallFeedback, totalScore } = evaluation;

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

      {/* アクションボタン */}
      <div className="action-buttons">
        {onRetry && (
          <button className="btn-retry" onClick={onRetry}>
            もう一度練習する
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
      `}</style>
    </div>
  );
}
