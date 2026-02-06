'use client';

import { useEffect, useState } from 'react';
import type { FaceAnalysisResult, TensionAnalysis } from '@/types/faceAnalysis';

interface TensionFeedbackProps {
  /** 顔分析結果 */
  analysisResult: FaceAnalysisResult | null;
  /** フィードバック表示の有効/無効 */
  isVisible: boolean;
}

/**
 * 緊張度に応じたゲージの色を返す
 */
function getTensionGaugeColor(tensionLevel: number): string {
  if (tensionLevel > 0.6) {
    return '#ef4444'; // red - 高緊張
  } else if (tensionLevel > 0.4) {
    return '#f59e0b'; // amber - 中緊張
  } else {
    return '#22c55e'; // green - 低緊張
  }
}

/**
 * 感情に応じた絵文字を返す
 */
function getEmotionEmoji(emotion: string): string {
  const emojis: Record<string, string> = {
    angry: '😠',
    disgust: '😒',
    fear: '😰',
    happy: '😊',
    sad: '😢',
    surprise: '😮',
    neutral: '😐',
  };
  return emojis[emotion] || '😐';
}

/**
 * 感情を日本語に変換
 */
function translateEmotion(emotion: string): string {
  const translations: Record<string, string> = {
    angry: '怒り',
    disgust: '嫌悪',
    fear: '不安',
    happy: '喜び',
    sad: '悲しみ',
    surprise: '驚き',
    neutral: '平静',
  };
  return translations[emotion] || emotion;
}

/**
 * 緊張度フィードバックUIコンポーネント（コンパクト版）
 *
 * インカメラプレビューと同じサイズ・スタイルで
 * 緊張度・リラックス度・感情をシンプルに表示します。
 */
export default function TensionFeedback({
  analysisResult,
  isVisible,
}: TensionFeedbackProps) {
  const [displayedTension, setDisplayedTension] = useState<TensionAnalysis | null>(null);

  useEffect(() => {
    if (analysisResult?.tension) {
      setDisplayedTension(analysisResult.tension);
    }
  }, [analysisResult]);

  if (!isVisible || !displayedTension) {
    return null;
  }

  const tensionPercent = Math.round(displayedTension.tensionLevel * 100);
  const relaxPercent = Math.round(displayedTension.relaxLevel * 100);
  const tensionColor = getTensionGaugeColor(displayedTension.tensionLevel);
  const emoji = getEmotionEmoji(displayedTension.dominantEmotion);
  const emotionText = translateEmotion(displayedTension.dominantEmotion);

  return (
    <div className="tension-feedback">
      {/* 感情絵文字と感情名 */}
      <div className="emotion-section">
        <span className="emotion-emoji">{emoji}</span>
        <span className="emotion-text">{emotionText}</span>
      </div>

      {/* ゲージエリア */}
      <div className="gauges-section">
        {/* 緊張度ゲージ */}
        <div className="gauge-row">
          <span className="gauge-label">緊張</span>
          <div className="gauge-bar">
            <div
              className="gauge-fill"
              style={{
                width: `${tensionPercent}%`,
                backgroundColor: tensionColor,
              }}
            />
          </div>
          <span className="gauge-value">{tensionPercent}%</span>
        </div>

        {/* リラックス度ゲージ */}
        <div className="gauge-row">
          <span className="gauge-label">リラックス</span>
          <div className="gauge-bar">
            <div
              className="gauge-fill relax"
              style={{
                width: `${relaxPercent}%`,
                backgroundColor: '#22c55e',
              }}
            />
          </div>
          <span className="gauge-value">{relaxPercent}%</span>
        </div>
      </div>

      <style jsx>{`
        .tension-feedback {
          position: fixed;
          z-index: 20;
          top: 80px;
          left: 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 6px 8px;
          background: rgba(26, 26, 26, 0.9);
          border-radius: 8px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(8px);
          width: 100px;
          height: 75px;
          box-sizing: border-box;
        }

        .emotion-section {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .emotion-emoji {
          font-size: 16px;
          line-height: 1;
        }

        .emotion-text {
          font-size: 10px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
        }

        .gauges-section {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .gauge-row {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .gauge-label {
          font-size: 8px;
          color: rgba(255, 255, 255, 0.5);
          width: 42px;
          flex-shrink: 0;
          white-space: nowrap;
        }

        .gauge-bar {
          flex: 1;
          height: 4px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 2px;
          overflow: hidden;
        }

        .gauge-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.5s ease, background-color 0.5s ease;
        }

        .gauge-value {
          font-size: 9px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.8);
          width: 24px;
          text-align: right;
          flex-shrink: 0;
        }

        /* ===== SP（スマートフォン）: ~640px ===== */
        @media (max-width: 640px) {
          .tension-feedback {
            top: 80px;
            left: 12px;
            width: 100px;
            height: 75px;
            padding: 6px 8px;
            gap: 3px;
          }

          .emotion-emoji {
            font-size: 14px;
          }

          .emotion-text {
            font-size: 9px;
          }

          .gauge-label {
            font-size: 7px;
            width: 38px;
          }

          .gauge-bar {
            height: 3px;
          }

          .gauge-value {
            font-size: 8px;
            width: 22px;
          }
        }

        /* ===== MD（タブレット）: 641px ~ 1024px ===== */
        /* 右端上下中央、インカメラの上に配置 */
        @media (min-width: 641px) and (max-width: 1024px) {
          .tension-feedback {
            top: 50%;
            left: auto;
            bottom: auto;
            right: 14px;
            transform: translateY(calc(-50% - 49px)); /* 中央から上に: (90px + 8px gap) / 2 */
            width: 120px;
            height: 90px;
            padding: 8px 10px;
            gap: 4px;
          }

          .emotion-emoji {
            font-size: 18px;
          }

          .emotion-text {
            font-size: 11px;
          }

          .gauge-label {
            font-size: 8px;
            width: 44px;
          }

          .gauge-bar {
            height: 5px;
          }

          .gauge-value {
            font-size: 9px;
          }
        }

        /* ===== PC（デスクトップ）: 1025px~ ===== */
        /* 右端上下中央、インカメラの上に配置 */
        @media (min-width: 1025px) {
          .tension-feedback {
            top: 50%;
            left: auto;
            bottom: auto;
            right: 16px;
            transform: translateY(calc(-50% - 64px)); /* 中央から上に: (120px + 8px gap) / 2 */
            width: 160px;
            height: 120px;
            padding: 10px 12px;
            gap: 6px;
          }

          .emotion-emoji {
            font-size: 24px;
          }

          .emotion-text {
            font-size: 14px;
          }

          .gauges-section {
            gap: 6px;
          }

          .gauge-row {
            gap: 6px;
          }

          .gauge-label {
            font-size: 10px;
            width: 55px;
          }

          .gauge-bar {
            height: 6px;
          }

          .gauge-value {
            font-size: 11px;
            width: 28px;
          }
        }

        /* ===== ランドスケープ（横向き）モバイル対応 ===== */
        @media (max-height: 500px) and (orientation: landscape) {
          .tension-feedback {
            top: 80px;
            left: 8px;
            width: 80px;
            height: 60px;
            padding: 4px 6px;
            gap: 2px;
          }

          .emotion-emoji {
            font-size: 12px;
          }

          .emotion-text {
            font-size: 8px;
          }

          .gauge-label {
            font-size: 6px;
            width: 34px;
          }

          .gauge-bar {
            height: 3px;
          }

          .gauge-value {
            font-size: 7px;
            width: 18px;
          }
        }
      `}</style>
    </div>
  );
}
