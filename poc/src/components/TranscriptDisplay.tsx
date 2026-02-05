'use client';

import { useRef, useEffect } from 'react';

interface TranscriptDisplayProps {
  /** 確定したテキスト */
  transcript: string;
  /** 中間結果（部分的なテキスト） */
  interimTranscript?: string;
  /** 録音中かどうか */
  isRecording?: boolean;
  /** 無音秒数 */
  silenceSeconds?: number;
  /** 自動停止までの秒数 */
  autoStopSeconds?: number;
  /** プレースホルダーテキスト */
  placeholder?: string;
  /** 最小高さ */
  minHeight?: number;
  /** 最大高さ */
  maxHeight?: number;
  /** 音声レベル（0-1） */
  audioLevel?: number;
}

export default function TranscriptDisplay({
  transcript,
  interimTranscript = '',
  isRecording = false,
  silenceSeconds = 0,
  autoStopSeconds = 5,
  placeholder = '回答を話してください...',
  minHeight = 100,
  maxHeight = 200,
  audioLevel = 0,
}: TranscriptDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // 新しいテキストが追加されたら自動スクロール
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [transcript, interimTranscript]);

  const hasContent = transcript.length > 0 || interimTranscript.length > 0;
  const showSilenceWarning = isRecording && silenceSeconds > 0;

  return (
    <div className="transcript-display">
      {/* ステータスバー（録音中 + 音声ゲージ融合） */}
      <div className="transcript-status">
        {isRecording ? (
          <div className="recording-meter-bar">
            <div
              className="recording-meter-fill"
              style={{ width: `${Math.min(100, audioLevel * 500)}%` }}
            />
            <div className="recording-label-overlay">
              <span className="recording-dot" />
              <span>録音中</span>
            </div>
          </div>
        ) : (
          <div className="idle-status">待機中</div>
        )}
      </div>

      {/* テキスト表示エリア */}
      <div
        ref={containerRef}
        className="transcript-content"
        style={{
          minHeight: `${minHeight}px`,
          maxHeight: `${maxHeight}px`,
        }}
      >
        {hasContent ? (
          <>
            {/* 確定テキスト */}
            <span className="transcript-final">{transcript}</span>
            {/* 中間結果（薄い色で表示） */}
            {interimTranscript && (
              <span className="transcript-interim">{interimTranscript}</span>
            )}
          </>
        ) : (
          <span className="transcript-placeholder">{placeholder}</span>
        )}
      </div>


      <style jsx>{`
        .transcript-display {
          background: #1a1a2e;
          border: 1px solid #333;
          border-radius: 8px;
          overflow: hidden;
        }

        .transcript-status {
          display: flex;
          align-items: center;
          padding: 0;
          background: #0f0f1a;
          border-bottom: 1px solid #333;
          min-height: 36px;
        }

        .recording-meter-bar {
          position: relative;
          width: 100%;
          height: 36px;
          background: #0f0f1a;
          overflow: hidden;
        }

        .recording-meter-fill {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          background: linear-gradient(90deg, #22c55e, #84cc16);
          transition: width 0.1s ease-out;
        }

        .recording-label-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0 12px;
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
          z-index: 1;
        }

        .recording-dot {
          width: 8px;
          height: 8px;
          background: #ef4444;
          border-radius: 50%;
          animation: pulse 1.5s ease-in-out infinite;
          box-shadow: 0 0 4px rgba(239, 68, 68, 0.5);
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
        }

        .idle-status {
          padding: 0 12px;
          color: #666;
          font-size: 13px;
          width: 100%;
        }

        .transcript-content {
          padding: 12px 16px;
          overflow-y: auto;
          font-size: 16px;
          line-height: 1.6;
          color: #e5e5e5;
        }

        .transcript-final {
          color: #e5e5e5;
        }

        .transcript-interim {
          color: #666;
          font-style: italic;
        }

        .transcript-placeholder {
          color: #555;
          font-style: italic;
        }

        /* スクロールバーのスタイル */
        .transcript-content::-webkit-scrollbar {
          width: 6px;
        }

        .transcript-content::-webkit-scrollbar-track {
          background: #1a1a2e;
        }

        .transcript-content::-webkit-scrollbar-thumb {
          background: #444;
          border-radius: 3px;
        }

        .transcript-content::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
    </div>
  );
}
