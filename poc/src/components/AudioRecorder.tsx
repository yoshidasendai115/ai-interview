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
  /** 自動停止までの無音秒数 */
  autoStopSeconds?: number;
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
  autoStopSeconds = 5,
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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);

  // 無音検出フック
  const silenceDetector = useSilenceDetector({
    threshold: 0.01,
    silenceDuration: autoStopSeconds,
    onSilenceDetected: () => {
      if (isRecording) {
        stopRecording();
      }
    },
  });

  // クリーンアップ
  const cleanup = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
    silenceDetector.stop();
    audioChunksRef.current = [];
  }, [silenceDetector]);

  // 録音開始
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setTranscript('');
      setInterimTranscript('');
      audioChunksRef.current = [];

      // マイク権限取得
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
        },
      });
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
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const finalTranscript = transcript + interimTranscript;
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
      mediaRecorder.start(250); // 250msごとにデータを取得
      setIsRecording(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '録音を開始できませんでした';
      setError(errorMessage);
      console.error('Failed to start recording:', err);
    }
  }, [websocketUrl, silenceDetector, transcript, interimTranscript, onRecordingComplete, onTranscriptUpdate]);

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

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
  }, [silenceDetector]);

  // スキップ
  const handleSkip = useCallback(() => {
    stopRecording();
    setTranscript('');
    setInterimTranscript('');
    onSkip?.();
  }, [stopRecording, onSkip]);

  // 音量レベルの更新
  useEffect(() => {
    setAudioLevel(silenceDetector.audioLevel);
  }, [silenceDetector.audioLevel]);

  // コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
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
          disabled={!isEnabled}
        >
          スキップ
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
