'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type {
  FaceAnalysisResult,
  FaceAnalysisApiResponse,
  UseFaceAnalysisReturn,
  BrightnessStatus,
  FaceDirection,
} from '@/types/faceAnalysis';

/** 分析間隔（ミリ秒） */
const ANALYSIS_INTERVAL_MS = 2000;

/** APIエンドポイント */
const API_ENDPOINT = '/api/face/analyze';

/**
 * APIレスポンスをフロントエンド形式に変換
 */
function transformApiResponse(response: FaceAnalysisApiResponse): FaceAnalysisResult {
  return {
    success: response.success,
    faceDetected: response.face_detected,
    faceRegion: response.face_region,
    emotions: response.emotions,
    tension: response.tension
      ? {
          tensionLevel: response.tension.tension_level,
          relaxLevel: response.tension.relax_level,
          dominantEmotion: response.tension.dominant_emotion,
          feedbackMessage: response.tension.feedback_message,
          feedbackType: response.tension.feedback_type as 'positive' | 'neutral' | 'negative',
        }
      : null,
    imageQuality: response.image_quality
      ? {
          averageBrightness: response.image_quality.average_brightness,
          brightnessStatus: response.image_quality.brightness_status as BrightnessStatus,
          isTooDark: response.image_quality.is_too_dark,
          isTooBright: response.image_quality.is_too_bright,
        }
      : null,
    headPose: response.head_pose
      ? {
          yaw: response.head_pose.yaw,
          pitch: response.head_pose.pitch,
          roll: response.head_pose.roll,
          isLookingAtCamera: response.head_pose.is_looking_at_camera,
          faceDirection: response.head_pose.face_direction as FaceDirection,
          feedbackMessage: response.head_pose.feedback_message,
        }
      : null,
    errorMessage: response.error_message,
  };
}

/**
 * videoElementから画像をキャプチャしてBase64に変換
 */
function captureFrameAsBase64(videoElement: HTMLVideoElement): string | null {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    return null;
  }

  // ビデオのサイズを取得
  const { videoWidth, videoHeight } = videoElement;

  if (videoWidth === 0 || videoHeight === 0) {
    return null;
  }

  // キャンバスサイズを設定（小さめにして転送量を削減）
  const maxSize = 320;
  const scale = Math.min(maxSize / videoWidth, maxSize / videoHeight, 1);
  canvas.width = Math.floor(videoWidth * scale);
  canvas.height = Math.floor(videoHeight * scale);

  // 画像を描画
  context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

  // Base64に変換（JPEG形式、品質80%）
  return canvas.toDataURL('image/jpeg', 0.8);
}

/**
 * MediaStreamから画像をキャプチャしてBase64に変換
 */
function captureStreamAsBase64(stream: MediaStream): string | null {
  const videoTrack = stream.getVideoTracks()[0];

  if (!videoTrack) {
    return null;
  }

  // ImageCaptureが利用可能な場合は使用
  if ('ImageCapture' in window) {
    // ImageCaptureを使用する場合は非同期になるため、
    // このシンプルな同期関数では使用しない
  }

  // VideoElementを使用してキャプチャ
  const videoElement = document.createElement('video');
  videoElement.srcObject = stream;
  videoElement.autoplay = true;
  videoElement.muted = true;

  // ビデオが準備できていない場合はnullを返す
  if (videoElement.readyState < 2) {
    return null;
  }

  return captureFrameAsBase64(videoElement);
}

interface UseFaceAnalysisOptions {
  /** 分析対象のMediaStream */
  stream: MediaStream | null;
  /** 分析対象のVideoElement（streamがない場合に使用） */
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  /** 分析間隔（ミリ秒） */
  intervalMs?: number;
  /** 初期有効状態 */
  initialEnabled?: boolean;
  /** 分析結果のコールバック */
  onResult?: (result: FaceAnalysisResult) => void;
}

/**
 * 顔分析を実行するカスタムフック
 *
 * MediaStreamまたはVideoElementから定期的にフレームをキャプチャし、
 * バックエンドAPIに送信して顔分析を行います。
 */
export function useFaceAnalysis({
  stream,
  videoRef,
  intervalMs = ANALYSIS_INTERVAL_MS,
  initialEnabled = false,
  onResult,
}: UseFaceAnalysisOptions): UseFaceAnalysisReturn {
  const [result, setResult] = useState<FaceAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(initialEnabled);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const onResultRef = useRef(onResult);

  // streamとvideoRefの最新値を保持するref（stale closure対策）
  const streamRef = useRef(stream);
  const videoRefRef = useRef(videoRef);

  // コールバックの参照を更新
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  // streamとvideoRefの参照を更新
  useEffect(() => {
    streamRef.current = stream;
    console.log('[useFaceAnalysis] streamRef updated:', !!stream);
  }, [stream]);

  useEffect(() => {
    videoRefRef.current = videoRef;
  }, [videoRef]);

  /**
   * 顔分析APIを呼び出す
   */
  const analyzeFrame = useCallback(async (imageBase64: string) => {
    // 前回のリクエストをキャンセル
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      console.log('[useFaceAnalysis] Calling API...');
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image_base64: imageBase64 }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: FaceAnalysisApiResponse = await response.json();
      console.log('[useFaceAnalysis] API response:', {
        success: data.success,
        faceDetected: data.face_detected,
        hasTension: !!data.tension,
        errorMessage: data.error_message,
      });
      const transformedResult = transformApiResponse(data);

      setResult(transformedResult);
      setError(null);

      // コールバックを呼び出す
      if (onResultRef.current) {
        onResultRef.current(transformedResult);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // キャンセルされた場合は無視
        return;
      }
      const errorMessage = err instanceof Error ? err.message : '分析に失敗しました';
      setError(errorMessage);
      console.error('[useFaceAnalysis] Analysis failed:', err);
    }
  }, []);

  /**
   * フレームをキャプチャして分析を実行
   * ※ refを使用してstale closure問題を回避
   */
  const captureAndAnalyze = useCallback(() => {
    let imageBase64: string | null = null;

    // 最新のstreamとvideoRefをrefから取得
    const currentStream = streamRef.current;
    const currentVideoRef = videoRefRef.current;

    // VideoElementから取得を試みる
    if (currentVideoRef?.current) {
      console.log('[useFaceAnalysis] Capturing from videoRef');
      imageBase64 = captureFrameAsBase64(currentVideoRef.current);
    }
    // MediaStreamから取得を試みる
    else if (currentStream) {
      // 既存のvideo要素を探す、または一時的に作成
      const existingVideo = document.querySelector('video.preview-video') as HTMLVideoElement;
      if (existingVideo && existingVideo.readyState >= 2) {
        console.log('[useFaceAnalysis] Capturing from existing video.preview-video element');
        imageBase64 = captureFrameAsBase64(existingVideo);
      } else if (existingVideo) {
        console.log('[useFaceAnalysis] video.preview-video found but not ready (readyState:', existingVideo.readyState, ')');
      } else {
        // streamから直接キャプチャ（フォールバック）
        console.log('[useFaceAnalysis] Capturing from stream (fallback)');
        imageBase64 = captureStreamAsBase64(currentStream);
      }
    } else {
      console.log('[useFaceAnalysis] No stream or videoRef available (streamRef.current:', !!streamRef.current, ')');
    }

    if (imageBase64) {
      console.log('[useFaceAnalysis] Frame captured, sending to API...');
      analyzeFrame(imageBase64);
    } else {
      console.warn('[useFaceAnalysis] Failed to capture frame (imageBase64 is null)');
    }
  }, [analyzeFrame]);

  /**
   * 分析を開始
   */
  const startAnalysis = useCallback(() => {
    console.log('[useFaceAnalysis] startAnalysis called, already running:', !!intervalRef.current);
    if (intervalRef.current) {
      return; // 既に実行中
    }

    console.log('[useFaceAnalysis] Starting face analysis with interval:', intervalMs, 'ms');
    setIsEnabled(true);
    setIsAnalyzing(true);

    // 初回は即座に実行
    captureAndAnalyze();

    // 定期的に実行
    intervalRef.current = setInterval(() => {
      captureAndAnalyze();
    }, intervalMs);
  }, [captureAndAnalyze, intervalMs]);

  /**
   * 分析を停止
   */
  const stopAnalysis = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setIsEnabled(false);
    setIsAnalyzing(false);
  }, []);

  /**
   * 分析の有効/無効を切り替え
   */
  const toggleAnalysis = useCallback(() => {
    if (isEnabled) {
      stopAnalysis();
    } else {
      startAnalysis();
    }
  }, [isEnabled, startAnalysis, stopAnalysis]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // streamが変更されたらリセット
  useEffect(() => {
    if (!stream && isEnabled) {
      stopAnalysis();
    }
  }, [stream, isEnabled, stopAnalysis]);

  return {
    result,
    isAnalyzing,
    error,
    isEnabled,
    startAnalysis,
    stopAnalysis,
    toggleAnalysis,
  };
}
