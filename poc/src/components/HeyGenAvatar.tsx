'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type StreamingAvatarType from '@heygen/streaming-avatar';
import { useMetrics } from '@/context/MetricsContext';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

interface LogEntry {
  time: string;
  type: 'info' | 'error' | 'success';
  message: string;
}

interface Metrics {
  initTime: number | null;
  speakLatency: number | null;
  totalSpeakTime: number | null;
}

// 面接官（アバター）が話すセリフ
const INTERVIEWER_PHRASES = [
  'こんにちは。本日は面接にお越しいただきありがとうございます。',
  'それでは、まず自己紹介をお願いできますか？',
  'ありがとうございます。あなたの強みを教えてください。',
  '前職ではどのような業務を担当されていましたか？',
  '弊社を志望された理由をお聞かせください。',
  '最後に、何かご質問はありますか？',
];

export default function HeyGenAvatar() {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    initTime: null,
    speakLatency: null,
    totalSpeakTime: null,
  });
  const [customText, setCustomText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);

  const { updateHeygenMetrics } = useMetrics();

  const avatarRef = useRef<StreamingAvatarType | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const initStartTimeRef = useRef<number>(0);
  const speakStartTimeRef = useRef<number>(0);
  const taskTypeRef = useRef<typeof import('@heygen/streaming-avatar').TaskType | null>(null);

  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    const time = new Date().toLocaleTimeString('ja-JP');
    setLogs((prev) => [...prev.slice(-49), { time, type, message }]);
  }, []);

  // メトリクスが更新されたらコンテキストにも反映
  useEffect(() => {
    updateHeygenMetrics({
      initTime: metrics.initTime,
      speakLatency: metrics.speakLatency,
      totalSpeakTime: metrics.totalSpeakTime,
    });
  }, [metrics, updateHeygenMetrics]);

  const initAvatar = useCallback(async () => {
    const apiKey = process.env.NEXT_PUBLIC_HEYGEN_API_KEY;
    if (!apiKey) {
      addLog('error', 'NEXT_PUBLIC_HEYGEN_API_KEY が設定されていません');
      return;
    }

    setStatus('connecting');
    initStartTimeRef.current = performance.now();
    addLog('info', 'HeyGen アバターを初期化中...');

    try {
      // Dynamic import to avoid SSR issues
      const { default: StreamingAvatar, AvatarQuality, StreamingEvents, TaskType } = await import(
        '@heygen/streaming-avatar'
      );

      // TaskTypeを保存して speak関数で使用
      taskTypeRef.current = TaskType;

      avatarRef.current = new StreamingAvatar({
        token: apiKey,
      });

      // Event listeners
      avatarRef.current.on(StreamingEvents.STREAM_READY, (event) => {
        if (videoRef.current && event.detail) {
          videoRef.current.srcObject = event.detail;
          videoRef.current.play();
        }
        const initTime = performance.now() - initStartTimeRef.current;
        setMetrics((prev) => ({ ...prev, initTime: Math.round(initTime) }));
        addLog('success', `ストリーム準備完了 (${Math.round(initTime)}ms)`);
      });

      avatarRef.current.on(StreamingEvents.AVATAR_START_TALKING, () => {
        const latency = performance.now() - speakStartTimeRef.current;
        setMetrics((prev) => ({ ...prev, speakLatency: Math.round(latency) }));
        setIsSpeaking(true);
        addLog('info', `発話開始 (レイテンシ: ${Math.round(latency)}ms)`);
      });

      avatarRef.current.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
        const totalTime = performance.now() - speakStartTimeRef.current;
        setMetrics((prev) => ({ ...prev, totalSpeakTime: Math.round(totalTime) }));
        setIsSpeaking(false);
        addLog('info', `発話終了 (総時間: ${Math.round(totalTime)}ms)`);
      });

      await avatarRef.current.createStartAvatar({
        quality: AvatarQuality.High,
        avatarName: 'Wayne_20240711', // Wayne (アジア系男性、ストリーミング対応)
        language: 'ja',
      });

      setStatus('connected');
      addLog('success', 'HeyGen アバター接続完了');
    } catch (error) {
      setStatus('disconnected');
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      addLog('error', `初期化エラー: ${errorMessage}`);
    }
  }, [addLog]);

  const speak = useCallback(
    async (text: string) => {
      if (!avatarRef.current || status !== 'connected') {
        addLog('error', 'アバターが接続されていません');
        return;
      }

      speakStartTimeRef.current = performance.now();
      addLog('info', `発話リクエスト: "${text}"`);

      try {
        // TaskType.REPEAT を使用してセリフ通りに発話させる
        await avatarRef.current.speak({
          text,
          taskType: taskTypeRef.current?.REPEAT,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '不明なエラー';
        addLog('error', `発話エラー: ${errorMessage}`);
      }
    },
    [status, addLog]
  );

  const disconnect = useCallback(async () => {
    if (avatarRef.current) {
      await avatarRef.current.stopAvatar();
      avatarRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus('disconnected');
    addLog('info', 'アバター切断完了');
  }, [addLog]);

  useEffect(() => {
    return () => {
      if (avatarRef.current) {
        avatarRef.current.stopAvatar();
      }
    };
  }, []);

  const handleCustomSpeak = () => {
    if (customText.trim()) {
      speak(customText);
    }
  };

  return (
    <div className="card">
      <h2>HeyGen Streaming Avatar - Wayne</h2>

      <div className={`status ${status}`}>
        {status === 'connected' && '接続済み'}
        {status === 'connecting' && '接続中...'}
        {status === 'disconnected' && '未接続'}
      </div>

      <div className="video-container">
        <video ref={videoRef} autoPlay playsInline muted={false} />
      </div>

      <div className="controls">
        {status === 'disconnected' && (
          <button className="btn-primary" onClick={initAvatar}>
            アバターを起動
          </button>
        )}
        {status === 'connected' && (
          <button className="btn-danger" onClick={disconnect}>
            切断
          </button>
        )}
      </div>

      {status === 'connected' && (
        <>
          <h3 style={{ marginTop: 24 }}>面接官セリフ</h3>
          <div className="controls">
            {INTERVIEWER_PHRASES.map((phrase, index) => (
              <button
                key={index}
                className="btn-secondary"
                onClick={() => speak(phrase)}
                disabled={isSpeaking}
                style={{ fontSize: 13 }}
              >
                {phrase.slice(0, 15)}...
              </button>
            ))}
          </div>

          <h3 style={{ marginTop: 24 }}>カスタム発話</h3>
          <input
            type="text"
            className="text-input"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="発話させたいテキストを入力..."
            onKeyDown={(e) => e.key === 'Enter' && handleCustomSpeak()}
          />
          <button
            className="btn-primary"
            onClick={handleCustomSpeak}
            disabled={isSpeaking || !customText.trim()}
          >
            発話
          </button>
        </>
      )}

      <div className="metrics">
        <div className="metric">
          <div className="metric-value">
            {metrics.initTime !== null ? `${metrics.initTime}ms` : '-'}
          </div>
          <div className="metric-label">初期化時間</div>
        </div>
        <div className="metric">
          <div className="metric-value">
            {metrics.speakLatency !== null ? `${metrics.speakLatency}ms` : '-'}
          </div>
          <div className="metric-label">発話レイテンシ</div>
        </div>
        <div className="metric">
          <div className="metric-value">
            {metrics.totalSpeakTime !== null ? `${metrics.totalSpeakTime}ms` : '-'}
          </div>
          <div className="metric-label">総発話時間</div>
        </div>
      </div>

      <div className="log-container">
        {logs.length === 0 ? (
          <div className="log-entry">ログはまだありません</div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="log-entry">
              <span className="log-time">{log.time}</span>
              <span className={`log-type ${log.type}`}>{log.type.toUpperCase()}</span>
              <span>{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
