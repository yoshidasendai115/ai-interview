'use client';

import { useRef, useCallback, useEffect, useState } from 'react';

interface UseSilenceDetectorOptions {
  /** 無音と判定する閾値（0-1、デフォルト: 0.01） */
  threshold?: number;
  /** 無音判定までの秒数（デフォルト: 5） */
  silenceDuration?: number;
  /** 検出間隔（ミリ秒、デフォルト: 100） */
  checkInterval?: number;
  /** 無音検出時のコールバック */
  onSilenceDetected?: () => void;
}

interface UseSilenceDetectorReturn {
  /** 検出を開始 */
  start: (stream: MediaStream) => void;
  /** 検出を停止 */
  stop: () => void;
  /** 現在の無音秒数 */
  silenceSeconds: number;
  /** 検出中かどうか */
  isDetecting: boolean;
  /** 現在の音量レベル（0-1） */
  audioLevel: number;
}

export function useSilenceDetector(
  options: UseSilenceDetectorOptions = {}
): UseSilenceDetectorReturn {
  const {
    threshold = 0.01,
    silenceDuration = 5,
    checkInterval = 100,
    onSilenceDetected,
  } = options;

  const [silenceSeconds, setSilenceSeconds] = useState(0);
  const [isDetecting, setIsDetecting] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const callbackFiredRef = useRef(false);

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    silenceStartRef.current = null;
    callbackFiredRef.current = false;
    setSilenceSeconds(0);
    setAudioLevel(0);
    setIsDetecting(false);
  }, []);

  const start = useCallback((stream: MediaStream) => {
    cleanup();

    try {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      sourceRef.current = source;
      callbackFiredRef.current = false;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      intervalRef.current = setInterval(() => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);

        // RMS（二乗平均平方根）で音量レベルを計算
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const normalized = dataArray[i] / 255;
          sum += normalized * normalized;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        setAudioLevel(rms);

        const now = Date.now();

        if (rms < threshold) {
          // 無音状態
          if (silenceStartRef.current === null) {
            silenceStartRef.current = now;
          }
          const elapsed = (now - silenceStartRef.current) / 1000;
          setSilenceSeconds(Math.floor(elapsed));

          if (elapsed >= silenceDuration && !callbackFiredRef.current) {
            callbackFiredRef.current = true;
            onSilenceDetected?.();
          }
        } else {
          // 音声検出
          silenceStartRef.current = null;
          callbackFiredRef.current = false;
          setSilenceSeconds(0);
        }
      }, checkInterval);

      setIsDetecting(true);
    } catch (error) {
      console.error('Failed to start silence detector:', error);
      cleanup();
    }
  }, [threshold, silenceDuration, checkInterval, onSilenceDetected, cleanup]);

  const stop = useCallback(() => {
    cleanup();
  }, [cleanup]);

  // コンポーネントアンマウント時にクリーンアップ
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // 安定したオブジェクト参照を返す（毎レンダリングで新しいオブジェクトを作成しない）
  const returnValue = useRef<UseSilenceDetectorReturn>({
    start,
    stop,
    silenceSeconds,
    isDetecting,
    audioLevel,
  });

  // 値を更新（参照は維持）
  returnValue.current.start = start;
  returnValue.current.stop = stop;
  returnValue.current.silenceSeconds = silenceSeconds;
  returnValue.current.isDetecting = isDetecting;
  returnValue.current.audioLevel = audioLevel;

  return returnValue.current;
}
