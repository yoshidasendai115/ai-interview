'use client';

import { useState, useRef, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import type { ConnectionStatus, Question, HeyGenMetrics, JLPTLevel } from '@/types/interview';
import { JLPT_SETTINGS } from '@/types/interview';

interface DIdAgentManager {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  reconnect: () => Promise<void>;
  speak: (params: { type: string; input: string }) => Promise<unknown>;
  chat: (message: string) => Promise<void>;
  agent: {
    preview_name: string;
    greetings?: string[];
  };
}

interface InterviewDIdAvatarProps {
  /** JLPTレベル（話速制御に使用） */
  jlptLevel?: JLPTLevel;
  /** フルスクリーン表示モード */
  fullscreen?: boolean;
  /** デバッグメトリクス表示 */
  showMetrics?: boolean;
  /** 発話開始時のコールバック */
  onSpeakStart?: () => void;
  /** 発話終了時のコールバック */
  onSpeakEnd?: () => void;
  /** 接続完了時のコールバック */
  onConnected?: (sessionId: string) => void;
  /** 接続エラー時のコールバック */
  onError?: (error: string) => void;
  /** メトリクス更新時のコールバック */
  onMetricsUpdate?: (metrics: HeyGenMetrics) => void;
}

export interface InterviewDIdAvatarRef {
  /** アバターを初期化・接続 */
  connect: () => Promise<void>;
  /** アバターを切断 */
  disconnect: () => Promise<void>;
  /** 指定テキストを発話 */
  speak: (text: string) => Promise<void>;
  /** 質問を発話 */
  speakQuestion: (question: Question) => Promise<void>;
  /** 接続状態 */
  status: ConnectionStatus;
  /** 発話中かどうか */
  isSpeaking: boolean;
}

const InterviewDIdAvatar = forwardRef<InterviewDIdAvatarRef, InterviewDIdAvatarProps>(
  function InterviewDIdAvatar(
    { jlptLevel = 'N3', fullscreen = false, showMetrics = false, onSpeakStart, onSpeakEnd, onConnected, onError, onMetricsUpdate },
    ref
  ) {
    const [status, setStatus] = useState<ConnectionStatus>('disconnected');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [metrics, setMetrics] = useState<HeyGenMetrics>({
      initTime: null,
      speakLatency: null,
      totalSpeakTime: null,
    });

    const agentManagerRef = useRef<DIdAgentManager | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const initStartTimeRef = useRef<number>(0);
    const speakStartTimeRef = useRef<number>(0);

    // メトリクス更新通知
    useEffect(() => {
      onMetricsUpdate?.(metrics);
    }, [metrics, onMetricsUpdate]);

    // 接続処理
    const connect = useCallback(async () => {
      const clientKey = process.env.NEXT_PUBLIC_DID_CLIENT_KEY;
      const agentId = process.env.NEXT_PUBLIC_DID_AGENT_ID;

      if (!clientKey) {
        const error = 'NEXT_PUBLIC_DID_CLIENT_KEY が設定されていません';
        onError?.(error);
        return;
      }

      if (!agentId) {
        const error = 'NEXT_PUBLIC_DID_AGENT_ID が設定されていません';
        onError?.(error);
        return;
      }

      setStatus('connecting');
      initStartTimeRef.current = performance.now();

      try {
        const sdk = await import('@d-id/client-sdk');

        const agentManager = await sdk.createAgentManager(agentId, {
          auth: { type: 'key', clientKey: clientKey },
          callbacks: {
            onConnectionStateChange: (state: string) => {
              if (state === 'connected') {
                setStatus('connected');
              }
            },
            onVideoStateChange: (state: string) => {
              if (state === 'PLAYING') {
                const initTime = performance.now() - initStartTimeRef.current;
                setMetrics((prev) => ({ ...prev, initTime: Math.round(initTime) }));
                const latency = performance.now() - speakStartTimeRef.current;
                setMetrics((prev) => ({ ...prev, speakLatency: Math.round(latency) }));
                setIsSpeaking(true);
                onSpeakStart?.();
              } else if (state === 'STOP') {
                const totalTime = performance.now() - speakStartTimeRef.current;
                setMetrics((prev) => ({ ...prev, totalSpeakTime: Math.round(totalTime) }));
                setIsSpeaking(false);
                onSpeakEnd?.();
              }
            },
            onSrcObjectReady: (srcObject: MediaStream) => {
              if (videoRef.current) {
                videoRef.current.srcObject = srcObject;
                videoRef.current.play().catch(() => {});
              }
            },
            onError: (error: Error) => {
              onError?.(error.message);
            },
          },
          streamOptions: {
            compatibilityMode: 'auto',
            streamWarmup: true,
          },
        }) as unknown as DIdAgentManager;

        agentManagerRef.current = agentManager;

        await agentManager.connect();
        setStatus('connected');
        onConnected?.('did-session-' + Date.now());
      } catch (error) {
        setStatus('disconnected');
        const errorMessage = error instanceof Error ? error.message : '不明なエラー';
        onError?.(errorMessage);
      }
    }, [onConnected, onError, onSpeakStart, onSpeakEnd]);

    // 切断処理
    const disconnect = useCallback(async () => {
      try {
        if (agentManagerRef.current) {
          await agentManagerRef.current.disconnect();
          agentManagerRef.current = null;
        }
      } catch {
        // Ignore disconnect errors
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setStatus('disconnected');
      setIsSpeaking(false);
    }, []);

    // 発話処理
    const speak = useCallback(
      async (text: string) => {
        if (!agentManagerRef.current || status !== 'connected') {
          onError?.('エージェントが接続されていません');
          return;
        }

        speakStartTimeRef.current = performance.now();

        try {
          await agentManagerRef.current.speak({
            type: 'text',
            input: text,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '発話エラー';
          onError?.(errorMessage);
        }
      },
      [status, onError]
    );

    // 質問を発話
    const speakQuestion = useCallback(
      async (question: Question) => {
        await speak(question.text);
      },
      [speak]
    );

    // refで公開するメソッド
    useImperativeHandle(
      ref,
      () => ({
        connect,
        disconnect,
        speak,
        speakQuestion,
        status,
        isSpeaking,
      }),
      [connect, disconnect, speak, speakQuestion, status, isSpeaking]
    );

    // アンマウント時のクリーンアップ
    useEffect(() => {
      return () => {
        if (agentManagerRef.current) {
          agentManagerRef.current.disconnect().catch(() => {});
        }
      };
    }, []);

    return (
      <div className={`interview-avatar ${fullscreen ? 'fullscreen' : ''}`}>
        <div className="video-container">
          <video ref={videoRef} autoPlay playsInline muted={false} />

          {/* ステータスオーバーレイ */}
          {status === 'connecting' && (
            <div className="status-overlay">
              <div className="loading-spinner" />
              <span>接続中...</span>
            </div>
          )}

          {status === 'disconnected' && (
            <div className="status-overlay">
              <span>未接続</span>
            </div>
          )}

          {/* 発話中インジケーター */}
          {isSpeaking && (
            <div className="speaking-indicator">
              <div className="speaking-dots">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}
        </div>

        {/* メトリクス表示（デバッグ用） */}
        {showMetrics && (
          <div className="metrics-debug">
            <span>初期化: {metrics.initTime ?? '-'}ms</span>
            <span>発話遅延: {metrics.speakLatency ?? '-'}ms</span>
            <span>発話時間: {metrics.totalSpeakTime ?? '-'}ms</span>
          </div>
        )}

        <style jsx>{`
          .interview-avatar {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .interview-avatar.fullscreen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: 0;
          }

          .video-container {
            position: relative;
            width: 100%;
            max-width: 400px;
            aspect-ratio: 16 / 9;
            background: #0a0a0a;
            border-radius: 12px;
            overflow: hidden;
          }

          .fullscreen .video-container {
            max-width: none;
            width: 100%;
            height: 100%;
            aspect-ratio: auto;
            border-radius: 0;
          }

          /* ビネットエフェクト（臨場感を高める周辺減光） */
          .fullscreen .video-container::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
            background: radial-gradient(
              ellipse at center,
              transparent 50%,
              rgba(0, 0, 0, 0.15) 70%,
              rgba(0, 0, 0, 0.4) 100%
            );
          }

          video {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .fullscreen video {
            object-fit: cover;
            object-position: center top;
          }

          .status-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 12px;
            background: rgba(0, 0, 0, 0.7);
            color: #888;
            font-size: 14px;
          }

          .fullscreen .status-overlay {
            font-size: 18px;
            gap: 16px;
          }

          .loading-spinner {
            width: 32px;
            height: 32px;
            border: 3px solid #333;
            border-top-color: #10b981;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          .fullscreen .loading-spinner {
            width: 48px;
            height: 48px;
            border-width: 4px;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }

          .speaking-indicator {
            position: absolute;
            bottom: 12px;
            left: 50%;
            transform: translateX(-50%);
            padding: 6px 12px;
            background: rgba(16, 185, 129, 0.9);
            border-radius: 16px;
          }

          .fullscreen .speaking-indicator {
            bottom: 24px;
            padding: 8px 16px;
          }

          .speaking-dots {
            display: flex;
            gap: 4px;
          }

          .fullscreen .speaking-dots {
            gap: 6px;
          }

          .speaking-dots span {
            width: 6px;
            height: 6px;
            background: white;
            border-radius: 50%;
            animation: bounce 1.4s ease-in-out infinite;
          }

          .fullscreen .speaking-dots span {
            width: 8px;
            height: 8px;
          }

          .speaking-dots span:nth-child(1) {
            animation-delay: 0s;
          }

          .speaking-dots span:nth-child(2) {
            animation-delay: 0.2s;
          }

          .speaking-dots span:nth-child(3) {
            animation-delay: 0.4s;
          }

          @keyframes bounce {
            0%, 80%, 100% {
              transform: translateY(0);
            }
            40% {
              transform: translateY(-6px);
            }
          }

          .metrics-debug {
            display: flex;
            justify-content: center;
            gap: 24px;
            font-size: 12px;
            color: #666;
            padding: 8px 16px;
            background: #1a1a1a;
            border-radius: 4px;
          }

          .fullscreen .metrics-debug {
            position: fixed;
            bottom: 16px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10;
            background: rgba(26, 26, 26, 0.9);
          }

          /* ===== SP（スマートフォン）: ~640px ===== */
          @media (max-width: 640px) {
            .fullscreen .status-overlay {
              font-size: 14px;
              gap: 12px;
            }

            .fullscreen .loading-spinner {
              width: 36px;
              height: 36px;
              border-width: 3px;
            }

            .fullscreen .speaking-indicator {
              bottom: 16px;
              padding: 6px 12px;
            }

            .fullscreen .speaking-dots span {
              width: 6px;
              height: 6px;
            }

            .fullscreen .metrics-debug {
              bottom: 8px;
              font-size: 10px;
              padding: 6px 12px;
              gap: 12px;
            }
          }

          /* ===== MD（タブレット）: 641px ~ 1024px ===== */
          @media (min-width: 641px) and (max-width: 1024px) {
            .fullscreen .status-overlay {
              font-size: 18px;
            }

            .fullscreen .loading-spinner {
              width: 44px;
              height: 44px;
            }

            .fullscreen .speaking-indicator {
              bottom: 20px;
            }
          }

          /* ===== PC（デスクトップ）: 1025px~ ===== */
          @media (min-width: 1025px) {
            .fullscreen .status-overlay {
              font-size: 20px;
              gap: 20px;
            }

            .fullscreen .loading-spinner {
              width: 56px;
              height: 56px;
              border-width: 5px;
            }

            .fullscreen .speaking-indicator {
              bottom: 32px;
              padding: 10px 20px;
            }

            .fullscreen .speaking-dots {
              gap: 8px;
            }

            .fullscreen .speaking-dots span {
              width: 10px;
              height: 10px;
            }

            .fullscreen .metrics-debug {
              bottom: 24px;
              font-size: 13px;
              padding: 10px 20px;
              gap: 32px;
            }
          }

          /* ===== ランドスケープ（横向き）モバイル対応 ===== */
          @media (max-height: 500px) and (orientation: landscape) {
            .fullscreen .status-overlay {
              font-size: 14px;
              gap: 10px;
            }

            .fullscreen .loading-spinner {
              width: 32px;
              height: 32px;
            }

            .fullscreen .speaking-indicator {
              bottom: 12px;
              padding: 4px 10px;
            }

            .fullscreen .speaking-dots span {
              width: 5px;
              height: 5px;
            }

            .fullscreen .metrics-debug {
              display: none;
            }
          }
        `}</style>
      </div>
    );
  }
);

export default InterviewDIdAvatar;
