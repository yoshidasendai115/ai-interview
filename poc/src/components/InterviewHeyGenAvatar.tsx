'use client';

import { useState, useRef, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import type StreamingAvatarType from '@heygen/streaming-avatar';
import type { ConnectionStatus, Question, HeyGenMetrics } from '@/types/interview';

interface InterviewHeyGenAvatarProps {
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

export interface InterviewHeyGenAvatarRef {
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

const InterviewHeyGenAvatar = forwardRef<InterviewHeyGenAvatarRef, InterviewHeyGenAvatarProps>(
  function InterviewHeyGenAvatar(
    { onSpeakStart, onSpeakEnd, onConnected, onError, onMetricsUpdate },
    ref
  ) {
    const [status, setStatus] = useState<ConnectionStatus>('disconnected');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [metrics, setMetrics] = useState<HeyGenMetrics>({
      initTime: null,
      speakLatency: null,
      totalSpeakTime: null,
    });

    const avatarRef = useRef<StreamingAvatarType | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const initStartTimeRef = useRef<number>(0);
    const speakStartTimeRef = useRef<number>(0);
    const taskTypeRef = useRef<typeof import('@heygen/streaming-avatar').TaskType | null>(null);

    // メトリクス更新通知
    useEffect(() => {
      onMetricsUpdate?.(metrics);
    }, [metrics, onMetricsUpdate]);

    // 接続処理
    const connect = useCallback(async () => {
      const apiKey = process.env.NEXT_PUBLIC_HEYGEN_API_KEY;
      if (!apiKey) {
        const error = 'NEXT_PUBLIC_HEYGEN_API_KEY が設定されていません';
        onError?.(error);
        return;
      }

      setStatus('connecting');
      initStartTimeRef.current = performance.now();

      try {
        const { default: StreamingAvatar, AvatarQuality, StreamingEvents, TaskType } = await import(
          '@heygen/streaming-avatar'
        );

        taskTypeRef.current = TaskType;

        avatarRef.current = new StreamingAvatar({
          token: apiKey,
        });

        // イベントリスナー設定
        avatarRef.current.on(StreamingEvents.STREAM_READY, (event) => {
          if (videoRef.current && event.detail) {
            videoRef.current.srcObject = event.detail;
            videoRef.current.play();
          }
          const initTime = performance.now() - initStartTimeRef.current;
          setMetrics((prev) => ({ ...prev, initTime: Math.round(initTime) }));
        });

        avatarRef.current.on(StreamingEvents.AVATAR_START_TALKING, () => {
          const latency = performance.now() - speakStartTimeRef.current;
          setMetrics((prev) => ({ ...prev, speakLatency: Math.round(latency) }));
          setIsSpeaking(true);
          onSpeakStart?.();
        });

        avatarRef.current.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
          const totalTime = performance.now() - speakStartTimeRef.current;
          setMetrics((prev) => ({ ...prev, totalSpeakTime: Math.round(totalTime) }));
          setIsSpeaking(false);
          onSpeakEnd?.();
        });

        await avatarRef.current.createStartAvatar({
          quality: AvatarQuality.High,
          avatarName: 'Wayne_20240711',
          language: 'ja',
        });

        setStatus('connected');
        onConnected?.('heygen-session-' + Date.now());
      } catch (error) {
        setStatus('disconnected');
        const errorMessage = error instanceof Error ? error.message : '不明なエラー';
        onError?.(errorMessage);
      }
    }, [onConnected, onError, onSpeakStart, onSpeakEnd]);

    // 切断処理
    const disconnect = useCallback(async () => {
      if (avatarRef.current) {
        await avatarRef.current.stopAvatar();
        avatarRef.current = null;
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
        if (!avatarRef.current || status !== 'connected') {
          onError?.('アバターが接続されていません');
          return;
        }

        speakStartTimeRef.current = performance.now();

        try {
          await avatarRef.current.speak({
            text,
            taskType: taskTypeRef.current?.REPEAT,
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
        if (avatarRef.current) {
          avatarRef.current.stopAvatar();
        }
      };
    }, []);

    return (
      <div className="interview-avatar">
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

        {/* メトリクス表示 */}
        <div className="metrics-debug">
          <span>初期化: {metrics.initTime ?? '-'}ms</span>
          <span>発話遅延: {metrics.speakLatency ?? '-'}ms</span>
          <span>発話時間: {metrics.totalSpeakTime ?? '-'}ms</span>
        </div>

        <style jsx>{`
          .interview-avatar {
            display: flex;
            flex-direction: column;
            gap: 8px;
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

          video {
            width: 100%;
            height: 100%;
            object-fit: cover;
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

          .loading-spinner {
            width: 32px;
            height: 32px;
            border: 3px solid #333;
            border-top-color: #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
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
            background: rgba(59, 130, 246, 0.9);
            border-radius: 16px;
          }

          .speaking-dots {
            display: flex;
            gap: 4px;
          }

          .speaking-dots span {
            width: 6px;
            height: 6px;
            background: white;
            border-radius: 50%;
            animation: bounce 1.4s ease-in-out infinite;
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
        `}</style>
      </div>
    );
  }
);

export default InterviewHeyGenAvatar;
