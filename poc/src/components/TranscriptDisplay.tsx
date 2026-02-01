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
      {/* ステータスバー */}
      <div className="transcript-status">
        {isRecording && (
          <div className="recording-indicator">
            <span className="recording-dot" />
            <span>録音中</span>
          </div>
        )}
        {showSilenceWarning && (
          <div className="silence-warning">
            無音検出: {silenceSeconds}秒 / {autoStopSeconds}秒で自動停止
          </div>
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
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: #0f0f1a;
          border-bottom: 1px solid #333;
          min-height: 36px;
        }

        .recording-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #ef4444;
          font-size: 14px;
        }

        .recording-dot {
          width: 10px;
          height: 10px;
          background: #ef4444;
          border-radius: 50%;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
        }

        .silence-warning {
          font-size: 12px;
          color: #f59e0b;
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
