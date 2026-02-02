'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useSilenceDetector } from '@/hooks/useSilenceDetector';
import TranscriptDisplay from './TranscriptDisplay';

// Web Speech API型定義
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface WebSpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  start: () => void;
  stop: () => void;
}

interface WebSpeechRecognitionConstructor {
  new (): WebSpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition: WebSpeechRecognitionConstructor;
    webkitSpeechRecognition: WebSpeechRecognitionConstructor;
  }
}

interface AudioRecorderProps {
  /** 録音可能かどうか */
  isEnabled?: boolean;
  /** 自動的に録音を開始するかどうか */
  autoStart?: boolean;
  /** 自動停止までの無音秒数 */
  autoStopSeconds?: number;
  /** 最低録音時間（秒）- この時間は無音検出を無効化 */
  minRecordingSeconds?: number;
  /** 外部から渡されたMediaStream（マイク許可を一度だけにするため） */
  mediaStream?: MediaStream | null;
  /** 録音完了時のコールバック */
  onRecordingComplete?: (audioBlob: Blob, transcript: string) => void;
  /** スキップ時のコールバック */
  onSkip?: () => void;
  /** リアルタイムでトランスクリプトが更新されたときのコールバック */
  onTranscriptUpdate?: (transcript: string, isFinal: boolean) => void;
  /** WebSocket URL（バックエンドSTT用） */
  websocketUrl?: string;
}

export default function AudioRecorder({
  isEnabled = true,
  autoStart = false,
  autoStopSeconds = 5,
  mediaStream: externalMediaStream,
  onRecordingComplete,
  onSkip,
  onTranscriptUpdate,
  websocketUrl,
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [remainingTime, setRemainingTime] = useState(autoStopSeconds); // 残り時間
  const [skipCountdown, setSkipCountdown] = useState(5); // スキップボタン有効化までのカウントダウン

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const hasAutoStartedRef = useRef(false);
  const isSkippingRef = useRef(false); // スキップ中フラグ
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null); // カウントダウンタイマー

  // 無音検出フック
  const silenceDetector = useSilenceDetector({
    threshold: 0.01,
    silenceDuration: autoStopSeconds,
    onSilenceDetected: () => {
      console.log('[AudioRecorder] Silence detected after', autoStopSeconds, 'seconds, stopping recording');
      if (isRecording) {
        stopRecording();
      }
    },
  });

  // クリーンアップ
  const cleanup = useCallback(() => {
    console.log('[AudioRecorder] cleanup() called, MediaRecorder state:', mediaRecorderRef.current?.state);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      console.log('[AudioRecorder] Stopping MediaRecorder in cleanup');
      mediaRecorderRef.current.stop();
    }
    // 外部から渡されたストリームは停止しない（再利用するため）
    if (streamRef.current && !externalMediaStream) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
    silenceDetector.stop();
    audioChunksRef.current = [];
  }, [silenceDetector, externalMediaStream]);

  // 録音開始
  const startRecording = useCallback(async () => {
    console.log('[AudioRecorder] startRecording called');
    try {
      setError(null);
      setTranscript('');
      setInterimTranscript('');
      audioChunksRef.current = [];

      // 外部からのMediaStreamがあればそれを使用、なければ新規取得
      let stream: MediaStream;
      if (externalMediaStream) {
        // 外部ストリームのトラックが有効か確認
        const audioTracks = externalMediaStream.getAudioTracks();
        const hasActiveTracks = audioTracks.some(track => track.readyState === 'live');

        if (hasActiveTracks) {
          stream = externalMediaStream;
          console.log('[AudioRecorder] Using external MediaStream with active tracks');
        } else {
          // トラックが無効な場合は新規取得
          console.log('[AudioRecorder] External stream tracks inactive, getting new stream');
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              sampleRate: 48000,
            },
          });
        }
      } else {
        // マイク権限取得（外部から渡されていない場合のみ）
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 48000,
          },
        });
      }
      streamRef.current = stream;

      // MediaRecorder設定
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);

          // WebSocket経由でバックエンドに送信（STT用）
          if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
            event.data.arrayBuffer().then((buffer) => {
              websocketRef.current?.send(buffer);
            });
          }
        }
      };

      mediaRecorder.onstop = () => {
        console.log('[AudioRecorder] mediaRecorder.onstop fired, isSkipping:', isSkippingRef.current);
        // スキップ中の場合はonRecordingCompleteを呼ばない
        if (isSkippingRef.current) {
          console.log('[AudioRecorder] Skipping onRecordingComplete because skip was pressed');
          isSkippingRef.current = false;
          return;
        }
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const finalTranscript = transcript + interimTranscript;
        console.log('[AudioRecorder] Final transcript:', finalTranscript.slice(0, 50) || '(empty)');
        setTranscript(finalTranscript);
        setInterimTranscript('');
        onRecordingComplete?.(audioBlob, finalTranscript);
      };

      // WebSocket接続（バックエンドSTT用）
      if (websocketUrl) {
        const ws = new WebSocket(websocketUrl);

        ws.onopen = () => {
          console.log('WebSocket connected for STT');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.isFinal) {
              setTranscript((prev) => prev + data.text);
              setInterimTranscript('');
              onTranscriptUpdate?.(data.text, true);
            } else {
              setInterimTranscript(data.text);
              onTranscriptUpdate?.(data.text, false);
            }
          } catch (e) {
            console.error('Failed to parse STT response:', e);
          }
        };

        ws.onerror = (event) => {
          console.error('WebSocket error:', event);
          // フォールバック: Web Speech API使用
          startWebSpeechAPI();
        };

        ws.onclose = () => {
          console.log('WebSocket closed');
        };

        websocketRef.current = ws;
      } else {
        // WebSocketがない場合はWeb Speech APIを使用
        startWebSpeechAPI();
      }

      // 無音検出開始
      silenceDetector.start(stream);

      // 録音開始
      console.log('[AudioRecorder] Starting MediaRecorder...');
      mediaRecorder.start(250); // 250msごとにデータを取得
      console.log('[AudioRecorder] MediaRecorder started, state:', mediaRecorder.state);
      setIsRecording(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '録音を開始できませんでした';
      setError(errorMessage);
      console.error('Failed to start recording:', err);
    }
  }, [websocketUrl, silenceDetector, transcript, interimTranscript, onRecordingComplete, onTranscriptUpdate, externalMediaStream]);

  // Web Speech API（フォールバック用）
  const speechRecognitionRef = useRef<WebSpeechRecognition | null>(null);

  const startWebSpeechAPI = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Web Speech API not supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (final) {
        setTranscript((prev) => prev + final);
        onTranscriptUpdate?.(final, true);
      }
      setInterimTranscript(interim);
      if (interim) {
        onTranscriptUpdate?.(interim, false);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
    };

    recognition.start();
    speechRecognitionRef.current = recognition;
  }, [onTranscriptUpdate]);

  // 録音停止
  const stopRecording = useCallback(() => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      speechRecognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    silenceDetector.stop();
    setIsRecording(false);

    // 外部から渡されたストリームは停止しない（再利用するため）
    if (streamRef.current && !externalMediaStream) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
  }, [silenceDetector, externalMediaStream]);

  // スキップ
  const handleSkip = useCallback(() => {
    isSkippingRef.current = true; // スキップフラグを立てる
    stopRecording();
    setTranscript('');
    setInterimTranscript('');
    onSkip?.();
  }, [stopRecording, onSkip]);

  // autoStart: 自動で録音開始
  useEffect(() => {
    if (autoStart && isEnabled && !isRecording && !hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      // 少し遅延を入れてUIが安定してから開始
      const timer = setTimeout(() => {
        startRecording();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoStart, isEnabled, isRecording, startRecording]);

  // autoStartフラグのリセット（コンポーネントがリマウントされた時用）
  useEffect(() => {
    return () => {
      hasAutoStartedRef.current = false;
    };
  }, []);

  // タイムアウト時のスキップ処理
  const handleTimeoutSkip = useCallback(() => {
    console.log('[AudioRecorder] Time expired, auto-skipping');
    isSkippingRef.current = true;
    stopRecording();
    setTranscript('');
    setInterimTranscript('');
    onSkip?.();
  }, [stopRecording, onSkip]);

  // カウントダウンタイマー（録音中のみ動作）
  useEffect(() => {
    if (isRecording) {
      // 録音開始時にタイマーをリセット
      setRemainingTime(autoStopSeconds);
      setSkipCountdown(5); // スキップボタンカウントダウンをリセット

      let timeLeft = autoStopSeconds;

      countdownTimerRef.current = setInterval(() => {
        // スキップボタンカウントダウン
        setSkipCountdown((prev) => Math.max(0, prev - 1));

        // 残り時間カウントダウン
        timeLeft -= 1;
        setRemainingTime(timeLeft);

        if (timeLeft <= 0) {
          // タイマー停止
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          // 時間切れ：自動スキップ
          handleTimeoutSkip();
        }
      }, 1000);

      return () => {
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
      };
    }
  }, [isRecording, autoStopSeconds, handleTimeoutSkip]);

  // 音量レベルの更新
  useEffect(() => {
    setAudioLevel(silenceDetector.audioLevel);
  }, [silenceDetector.audioLevel]);

  // コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    console.log('[AudioRecorder] Cleanup effect setup');
    return () => {
      console.log('[AudioRecorder] Cleanup effect running (unmount or deps changed)');
      cleanup();
    };
  }, [cleanup]);

  return (
    <div className="audio-recorder">
      {/* トランスクリプト表示 */}
      <TranscriptDisplay
        transcript={transcript}
        interimTranscript={interimTranscript}
        isRecording={isRecording}
        silenceSeconds={silenceDetector.silenceSeconds}
        autoStopSeconds={autoStopSeconds}
      />

      {/* 音量メーター */}
      {isRecording && (
        <div className="audio-meter">
          <div
            className="audio-meter-fill"
            style={{ width: `${Math.min(100, audioLevel * 500)}%` }}
          />
        </div>
      )}

      {/* カウントダウンタイマー */}
      {isRecording && (
        <div className="countdown-timer">
          <div className="countdown-bar">
            <div
              className="countdown-fill"
              style={{ width: `${(remainingTime / autoStopSeconds) * 100}%` }}
            />
          </div>
          <span className="countdown-text">
            残り {remainingTime} 秒
          </span>
        </div>
      )}

      {/* エラー表示 */}
      {error && <div className="error-message">{error}</div>}

      {/* コントロールボタン */}
      <div className="controls">
        {!isRecording ? (
          <button
            className="btn-record"
            onClick={startRecording}
            disabled={!isEnabled}
          >
            <span className="record-icon" />
            回答を録音
          </button>
        ) : (
          <button className="btn-stop" onClick={stopRecording}>
            <span className="stop-icon" />
            録音停止
          </button>
        )}

        <button
          className="btn-skip"
          onClick={handleSkip}
          disabled={!isEnabled || !isRecording || skipCountdown > 0}
        >
          {isRecording && skipCountdown > 0 ? `スキップ (${skipCountdown})` : 'スキップ'}
        </button>
      </div>

      <style jsx>{`
        .audio-recorder {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .audio-meter {
          height: 8px;
          background: #1a1a2e;
          border-radius: 4px;
          overflow: hidden;
        }

        .audio-meter-fill {
          height: 100%;
          background: linear-gradient(90deg, #22c55e, #84cc16);
          transition: width 0.1s ease-out;
        }

        .countdown-timer {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .countdown-bar {
          flex: 1;
          height: 8px;
          background: #1a1a2e;
          border-radius: 4px;
          overflow: hidden;
        }

        .countdown-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #60a5fa);
          transition: width 1s linear;
        }

        .countdown-text {
          font-size: 14px;
          color: #9ca3af;
          min-width: 80px;
          text-align: right;
        }

        .error-message {
          padding: 12px;
          background: #7f1d1d;
          border: 1px solid #ef4444;
          border-radius: 8px;
          color: #fca5a5;
          font-size: 14px;
        }

        .controls {
          display: flex;
          gap: 12px;
          justify-content: center;
        }

        .btn-record,
        .btn-stop,
        .btn-skip {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-record {
          background: #3b82f6;
          color: white;
        }

        .btn-record:hover:not(:disabled) {
          background: #2563eb;
        }

        .btn-record:disabled {
          background: #4b5563;
          cursor: not-allowed;
        }

        .btn-stop {
          background: #ef4444;
          color: white;
        }

        .btn-stop:hover {
          background: #dc2626;
        }

        .btn-skip {
          background: #374151;
          color: #d1d5db;
        }

        .btn-skip:hover:not(:disabled) {
          background: #4b5563;
        }

        .btn-skip:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .record-icon {
          width: 12px;
          height: 12px;
          background: #ef4444;
          border-radius: 50%;
        }

        .stop-icon {
          width: 12px;
          height: 12px;
          background: white;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}
