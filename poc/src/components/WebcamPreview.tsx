'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

interface WebcamPreviewProps {
  /** カメラのMediaStream（ビデオトラックを含む） */
  stream: MediaStream | null;
  /** プレビューの表示/非表示 */
  isVisible: boolean;
  /** 初期位置 */
  position?: 'bottom-right' | 'bottom-left';
  /** 初期サイズ */
  initialSize?: 'small' | 'medium';
}

type PreviewSize = 'small' | 'medium';

export default function WebcamPreview({
  stream,
  isVisible,
  position = 'bottom-right',
  initialSize = 'small',
}: WebcamPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [size, setSize] = useState<PreviewSize>(initialSize);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ストリームにビデオトラックがあるか確認（レンダリング前に判定）
  const hasVideoTrack = stream ? stream.getVideoTracks().length > 0 : false;

  // ストリームをビデオ要素に接続
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !stream || !hasVideoTrack) {
      return;
    }

    videoElement.srcObject = stream;
    videoElement.play().catch((err) => {
      console.error('[WebcamPreview] Video play failed:', err);
    });

    return () => {
      videoElement.srcObject = null;
    };
  }, [stream, hasVideoTrack]);

  // サイズ切り替え（タップ/クリック）
  const handleClick = useCallback(() => {
    setSize((prev) => (prev === 'small' ? 'medium' : 'small'));
  }, []);

  // カメラON/OFF（長押し）
  const handleMouseDown = useCallback(() => {
    longPressTimerRef.current = setTimeout(() => {
      setIsCameraEnabled((prev) => !prev);
      longPressTimerRef.current = null;
    }, 500);
  }, []);

  const handleMouseUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // タッチイベント用
  const handleTouchStart = useCallback(() => {
    longPressTimerRef.current = setTimeout(() => {
      setIsCameraEnabled((prev) => !prev);
      longPressTimerRef.current = null;
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // コンポーネントアンマウント時にタイマーをクリア
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  // 非表示またはビデオトラックがない場合は何も表示しない
  if (!isVisible || !hasVideoTrack) {
    return null;
  }

  return (
    <div
      className={`webcam-preview ${position} ${size}`}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="button"
      tabIndex={0}
      aria-label="カメラプレビュー。タップでサイズ変更、長押しでカメラON/OFF"
    >
      {isCameraEnabled ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="preview-video"
        />
      ) : (
        <div className="camera-off-placeholder">
          <span className="camera-off-icon">📷</span>
          <span className="camera-off-text">OFF</span>
        </div>
      )}
      <div className="preview-controls">
        <span className={`camera-status ${isCameraEnabled ? 'on' : 'off'}`}>
          {isCameraEnabled ? '●' : '○'}
        </span>
      </div>

      <style jsx>{`
        .webcam-preview {
          position: fixed;
          z-index: 20;
          border-radius: 8px;
          overflow: hidden;
          border: 2px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          cursor: pointer;
          transition: all 0.2s ease;
          background: #1a1a1a;
          user-select: none;
        }

        .webcam-preview:hover {
          border-color: rgba(255, 255, 255, 0.5);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
        }

        .webcam-preview:active {
          transform: scale(0.98);
        }

        /* 位置 */
        .webcam-preview.bottom-right {
          bottom: 16px;
          right: 16px;
        }

        .webcam-preview.bottom-left {
          bottom: 16px;
          left: 16px;
        }

        /* サイズ（デフォルト：PC） */
        .webcam-preview.small {
          width: 160px;
          height: 120px;
        }

        .webcam-preview.medium {
          width: 213px;
          height: 160px;
        }

        .preview-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scaleX(-1); /* ミラー表示 */
        }

        .camera-off-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          background: rgba(30, 30, 30, 0.95);
        }

        .camera-off-icon {
          font-size: 24px;
          opacity: 0.5;
        }

        .camera-off-text {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.4);
          font-weight: 600;
          letter-spacing: 1px;
        }

        .preview-controls {
          position: absolute;
          top: 6px;
          right: 6px;
        }

        .camera-status {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 10px;
          background: rgba(0, 0, 0, 0.5);
        }

        .camera-status.on {
          color: #22c55e;
        }

        .camera-status.off {
          color: #ef4444;
        }

        /* ===== SP（スマートフォン）: ~640px ===== */
        @media (max-width: 640px) {
          .webcam-preview.small {
            width: 100px;
            height: 75px;
          }

          .webcam-preview.medium {
            width: 133px;
            height: 100px;
          }

          /* SP: 進捗ゲージの下に配置 */
          .webcam-preview.bottom-right {
            top: 80px;
            bottom: auto;
            right: 12px;
          }

          .webcam-preview.bottom-left {
            top: 80px;
            bottom: auto;
            left: 12px;
          }

          .camera-off-icon {
            font-size: 18px;
          }

          .camera-off-text {
            font-size: 8px;
          }

          .preview-controls {
            top: 4px;
            right: 4px;
          }

          .camera-status {
            font-size: 8px;
            padding: 1px 4px;
          }
        }

        /* ===== MD（タブレット）: 641px ~ 1024px ===== */
        /* 右端上下中央、TensionFeedbackの下に配置 */
        @media (min-width: 641px) and (max-width: 1024px) {
          .webcam-preview.small {
            width: 120px;
            height: 90px;
          }

          .webcam-preview.medium {
            width: 160px;
            height: 120px;
          }

          .webcam-preview.bottom-right {
            top: 50%;
            bottom: auto;
            right: 14px;
            transform: translateY(calc(-50% + 49px)); /* 中央から下に: (90px + 8px gap) / 2 */
          }

          .webcam-preview.bottom-left {
            bottom: 14px;
            left: 14px;
          }
        }

        /* ===== PC（デスクトップ）: 1025px~ ===== */
        /* 右端上下中央、TensionFeedbackの下に配置 */
        @media (min-width: 1025px) {
          .webcam-preview.small {
            width: 160px;
            height: 120px;
          }

          .webcam-preview.medium {
            width: 213px;
            height: 160px;
          }

          .webcam-preview.bottom-right {
            top: 50%;
            bottom: auto;
            right: 16px;
            transform: translateY(calc(-50% + 64px)); /* 中央から下に: (120px + 8px gap) / 2 */
          }

          .webcam-preview.bottom-left {
            bottom: 16px;
            left: 16px;
          }
        }

        /* ===== ランドスケープ（横向き）モバイル対応 ===== */
        @media (max-height: 500px) and (orientation: landscape) {
          .webcam-preview.small {
            width: 80px;
            height: 60px;
          }

          .webcam-preview.medium {
            width: 107px;
            height: 80px;
          }

          .webcam-preview.bottom-right {
            bottom: 80px; /* ボタンエリアの上に配置 */
            right: 8px;
          }

          .webcam-preview.bottom-left {
            bottom: 80px; /* ボタンエリアの上に配置 */
            left: 8px;
          }

          .camera-off-icon {
            font-size: 14px;
          }

          .camera-off-text {
            font-size: 7px;
          }

          .preview-controls {
            top: 2px;
            right: 2px;
          }

          .camera-status {
            font-size: 7px;
            padding: 1px 3px;
          }
        }
      `}</style>
    </div>
  );
}
