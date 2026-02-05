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
  /** 現在の質問テキスト（エコー除去用） */
  questionText?: string;
  /** 録音完了時のコールバック */
  onRecordingComplete?: (audioBlob: Blob, transcript: string) => void;
  /** スキップ時のコールバック */
  onSkip?: () => void;
  /** リアルタイムでトランスクリプトが更新されたときのコールバック */
  onTranscriptUpdate?: (transcript: string, isFinal: boolean) => void;
  /** 残り時間更新時のコールバック */
  onRemainingTimeChange?: (remainingTime: number) => void;
  /** WebSocket URL（バックエンドSTT用） */
  websocketUrl?: string;
}

// 質問テキストの一部がトランスクリプトに含まれているかチェックし、除去する
function filterQuestionEcho(transcript: string, questionText: string | undefined): string {
  if (!questionText || !transcript) return transcript;

  // 質問テキストを正規化（句読点、スペース、記号を除去）
  const normalizeText = (text: string) =>
    text.replace(/[。、？！\s　．，.?,!]/g, '').toLowerCase();

  const normalizedQuestion = normalizeText(questionText);
  const normalizedTranscript = normalizeText(transcript);

  // 質問文の後半部分（最後の10文字程度）がトランスクリプトの先頭に含まれているかチェック
  // エコーは通常、質問の最後の部分が録音の最初に入る
  for (let len = Math.min(normalizedQuestion.length, 15); len >= 3; len--) {
    const questionSuffix = normalizedQuestion.slice(-len);
    if (normalizedTranscript.startsWith(questionSuffix)) {
      // 元のトランスクリプトから該当部分を除去
      // 正規化前の文字数で切り取る（おおよその位置）
      const originalLen = Math.ceil(len * 1.2); // 句読点等を考慮して少し多めに
      const filtered = transcript.slice(originalLen).trim();
      console.log(`[AudioRecorder] Filtered echo: "${transcript.slice(0, originalLen)}" -> remaining: "${filtered}"`);
      return filtered;
    }
  }

  return transcript;
}

export default function AudioRecorder({
  isEnabled = true,
  autoStart = false,
  autoStopSeconds = 5,
  mediaStream: externalMediaStream,
  questionText,
  onRecordingComplete,
  onSkip,
  onTranscriptUpdate,
  onRemainingTimeChange,
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
  const isCleanupStoppingRef = useRef(false); // cleanup()での停止中フラグ
  const recordingStartTimeRef = useRef<number>(0); // 録音開始時刻
  const speechRecognitionStartDelayRef = useRef<NodeJS.Timeout | null>(null); // 音声認識開始遅延タイマー
  const SPEECH_RECOGNITION_DELAY_MS = 300; // 録音開始からこの時間後に音声認識を開始（ビデオミュートによりエコー対策済みのため短縮）
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null); // カウントダウンタイマー
  const startRecordingRef = useRef<() => Promise<void>>(() => Promise.resolve()); // startRecording関数を保持するref
  const stopRecordingRef = useRef<() => void>(() => {}); // stopRecording関数を保持するref
  const handleTimeoutSkipRef = useRef<() => void>(() => {}); // handleTimeoutSkip関数を保持するref
  const onRemainingTimeChangeRef = useRef<((time: number) => void) | undefined>(undefined); // onRemainingTimeChange関数を保持するref

  // onSilenceDetected コールバックをメモ化（無音検出フック用）
  const onSilenceDetected = useCallback(() => {
    console.log('[AudioRecorder] Silence detected after', autoStopSeconds, 'seconds, stopping recording');
    stopRecordingRef.current();
  }, [autoStopSeconds]);

  // 無音検出フック
  const silenceDetector = useSilenceDetector({
    threshold: 0.01,
    silenceDuration: autoStopSeconds,
    onSilenceDetected,
  });

  // クリーンアップ
  const cleanup = useCallback(() => {
    console.log('[AudioRecorder] cleanup() called, MediaRecorder state:', mediaRecorderRef.current?.state);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      console.log('[AudioRecorder] Stopping MediaRecorder in cleanup');
      // cleanup()での停止であることをマーク（onstopでonRecordingCompleteを呼ばないため）
      isCleanupStoppingRef.current = true;
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
    // 音声認識開始遅延タイマーをクリア
    if (speechRecognitionStartDelayRef.current) {
      clearTimeout(speechRecognitionStartDelayRef.current);
      speechRecognitionStartDelayRef.current = null;
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
      // フラグをリセット
      isSkippingRef.current = false;
      isCleanupStoppingRef.current = false;

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
        console.log('[AudioRecorder] mediaRecorder.onstop fired, isSkipping:', isSkippingRef.current, 'isCleanupStopping:', isCleanupStoppingRef.current);
        // スキップ中またはcleanup()での停止の場合はonRecordingCompleteを呼ばない
        if (isSkippingRef.current) {
          console.log('[AudioRecorder] Skipping onRecordingComplete because skip was pressed');
          isSkippingRef.current = false;
          return;
        }
        if (isCleanupStoppingRef.current) {
          console.log('[AudioRecorder] Skipping onRecordingComplete because cleanup stopped the recorder');
          isCleanupStoppingRef.current = false;
          return;
        }
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const rawTranscript = transcript + interimTranscript;
        // 質問文のエコーを除去
        const finalTranscript = filterQuestionEcho(rawTranscript, questionText);
        console.log('[AudioRecorder] Raw transcript:', rawTranscript.slice(0, 50) || '(empty)');
        console.log('[AudioRecorder] Final transcript (after echo filter):', finalTranscript.slice(0, 50) || '(empty)');
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
        // アバターの残響を避けるため、遅延して開始
        console.log('[AudioRecorder] Delaying Web Speech API start by', SPEECH_RECOGNITION_DELAY_MS, 'ms');
        speechRecognitionStartDelayRef.current = setTimeout(() => {
          console.log('[AudioRecorder] Starting Web Speech API now');
          startWebSpeechAPI();
        }, SPEECH_RECOGNITION_DELAY_MS);
      }

      // 無音検出開始
      silenceDetector.start(stream);

      // 録音開始
      console.log('[AudioRecorder] Starting MediaRecorder...');
      recordingStartTimeRef.current = Date.now(); // 録音開始時刻を記録
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

    console.log('[AudioRecorder] Web Speech API started');

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
    // 音声認識開始遅延タイマーをクリア
    if (speechRecognitionStartDelayRef.current) {
      clearTimeout(speechRecognitionStartDelayRef.current);
      speechRecognitionStartDelayRef.current = null;
    }

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

  // startRecording/stopRecording関数をrefに保持（autoStart/onSilenceDetectedの安定化用）
  useEffect(() => {
    startRecordingRef.current = startRecording;
  }, [startRecording]);

  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  }, [stopRecording]);

  useEffect(() => {
    onRemainingTimeChangeRef.current = onRemainingTimeChange;
  }, [onRemainingTimeChange]);

  // スキップ
  const handleSkip = useCallback(() => {
    isSkippingRef.current = true; // スキップフラグを立てる
    stopRecording();
    setTranscript('');
    setInterimTranscript('');
    onSkip?.();
  }, [stopRecording, onSkip]);

  // autoStart: 自動で録音開始
  // 注意: startRecordingを依存関係から外してrefで呼び出すことで、
  // startRecordingの再生成によるeffectの再実行を防ぐ
  useEffect(() => {
    console.log('[AudioRecorder] autoStart effect:', { autoStart, isEnabled, isRecording, hasAutoStarted: hasAutoStartedRef.current });
    if (autoStart && isEnabled && !isRecording && !hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      console.log('[AudioRecorder] Auto-starting recording in 300ms...');
      // 少し遅延を入れてUIが安定してから開始
      const timer = setTimeout(() => {
        console.log('[AudioRecorder] Calling startRecording() via ref');
        startRecordingRef.current();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoStart, isEnabled, isRecording]); // startRecordingを依存関係から削除

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

  useEffect(() => {
    handleTimeoutSkipRef.current = handleTimeoutSkip;
  }, [handleTimeoutSkip]);

  // カウントダウンタイマー（録音中のみ動作）
  // 注意: handleTimeoutSkip/onRemainingTimeChangeを依存関係から外してrefで呼び出すことで、
  // これらの関数の再生成によるeffectの再実行（タイマーリセット）を防ぐ
  useEffect(() => {
    console.log('[AudioRecorder] Countdown effect, isRecording:', isRecording);
    if (isRecording) {
      console.log('[AudioRecorder] Starting countdown timer from', autoStopSeconds, 'seconds');
      // 録音開始時にタイマーをリセット
      setRemainingTime(autoStopSeconds);
      setSkipCountdown(5); // スキップボタンカウントダウンをリセット
      onRemainingTimeChangeRef.current?.(autoStopSeconds);

      let timeLeft = autoStopSeconds;

      countdownTimerRef.current = setInterval(() => {
        // スキップボタンカウントダウン
        setSkipCountdown((prev) => Math.max(0, prev - 1));

        // 残り時間カウントダウン
        timeLeft -= 1;
        setRemainingTime(timeLeft);
        console.log('[AudioRecorder] Countdown:', timeLeft);
        onRemainingTimeChangeRef.current?.(timeLeft);

        if (timeLeft <= 0) {
          // タイマー停止
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          // 時間切れ：自動スキップ
          handleTimeoutSkipRef.current();
        }
      }, 1000);

      return () => {
        console.log('[AudioRecorder] Clearing countdown timer');
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
      };
    }
  }, [isRecording, autoStopSeconds]); // handleTimeoutSkip, onRemainingTimeChangeを依存関係から削除

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
      {/* トランスクリプト表示（音声ゲージ含む） */}
      <TranscriptDisplay
        transcript={transcript}
        interimTranscript={interimTranscript}
        isRecording={isRecording}
        silenceSeconds={silenceDetector.silenceSeconds}
        autoStopSeconds={autoStopSeconds}
        audioLevel={audioLevel}
      />

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
          <button
            className="btn-stop"
            onClick={stopRecording}
            disabled={transcript.length === 0}
            title={transcript.length === 0 ? '音声入力が確定するまでお待ちください' : '録音を停止して回答を送信'}
          >
            <span className="stop-icon" />
            {transcript.length === 0 ? '音声入力待ち...' : '録音停止'}
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
          gap: 0;
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
          flex-direction: row;
          flex-wrap: nowrap;
          gap: 12px;
          justify-content: center;
          align-items: center;
          margin-top: 10px;
        }

        .btn-record,
        .btn-stop,
        .btn-skip {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
          flex-shrink: 0;
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

        .btn-stop:hover:not(:disabled) {
          background: #dc2626;
        }

        .btn-stop:disabled {
          background: #6b7280;
          cursor: not-allowed;
          opacity: 0.7;
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

        /* スマートフォン対応 */
        @media (max-width: 640px) {
          .controls {
            gap: 8px;
          }

          .btn-record,
          .btn-stop,
          .btn-skip {
            padding: 10px 16px;
            font-size: 14px;
            gap: 6px;
          }

          .record-icon,
          .stop-icon {
            width: 10px;
            height: 10px;
          }
        }
      `}</style>
    </div>
  );
}
