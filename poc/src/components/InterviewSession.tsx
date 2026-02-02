'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import InterviewHeyGenAvatar, { type InterviewHeyGenAvatarRef } from './InterviewHeyGenAvatar';
import AudioRecorder from './AudioRecorder';
import FeedbackDisplay from './FeedbackDisplay';
import { useInterviewStateMachine } from '@/hooks/useInterviewStateMachine';
import { generateMockEvaluation } from '@/services/evaluationService';
import type {
  Question,
  Answer,
  EvaluationResult,
  JLPTLevel,
  InterviewState,
} from '@/types/interview';

import type { LevelStats } from '@/hooks/useAdaptiveLevel';

interface InterviewSessionProps {
  /** JLPTレベル */
  jlptLevel?: JLPTLevel;
  /** セッション完了時のコールバック */
  onComplete?: (evaluation: EvaluationResult) => void;
  /** 次のレベルで挑戦するコールバック */
  onNextLevel?: (level: JLPTLevel) => void;
  /** 終了時のコールバック */
  onExit?: () => void;
  /** チャレンジ枠で挑戦可能かどうか */
  canChallenge?: boolean;
  /** チャレンジ枠のレベル */
  challengeLevel?: JLPTLevel;
  /** チャレンジ枠で挑戦中かどうか */
  isChallengeMode?: boolean;
  /** チャレンジ枠を開始するコールバック */
  onStartChallenge?: () => void;
  /** 現在のレベルの統計情報 */
  levelStats?: LevelStats | null;
  /** 残りチャレンジ回数 */
  remainingChallenges?: number;
  /** 1日のチャレンジ制限 */
  dailyChallengeLimit?: number;
}

export default function InterviewSession({
  jlptLevel = 'N3',
  onComplete,
  onNextLevel,
  onExit,
  canChallenge = false,
  challengeLevel,
  isChallengeMode = false,
  onStartChallenge,
  levelStats,
  remainingChallenges = 3,
  dailyChallengeLimit = 3,
}: InterviewSessionProps) {
  const avatarRef = useRef<InterviewHeyGenAvatarRef>(null);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  const stateMachine = useInterviewStateMachine();

  // 初期状態をログ
  useEffect(() => {
    console.log('[InterviewSession] Initial state:', stateMachine.state);
    console.log('[InterviewSession] isConnecting:', isConnecting);
    console.log('[InterviewSession] evaluation:', evaluation);
  }, []);

  // 状態変更をログ
  useEffect(() => {
    console.log('[InterviewSession] State changed to:', stateMachine.state);
  }, [stateMachine.state]);

  // ログ追加
  const addLog = useCallback((message: string) => {
    const time = new Date().toLocaleTimeString('ja-JP');
    setLogs((prev) => [...prev.slice(-19), `[${time}] ${message}`]);
  }, []);

  // 状態に応じた説明テキスト
  const getStateDescription = (state: InterviewState): string => {
    switch (state) {
      case 'initializing':
        return 'アバターを準備しています...';
      case 'ready':
        return '準備完了！「面接を開始」ボタンを押してください。';
      case 'avatar_speaking':
        return '面接官が質問しています...';
      case 'listening':
        return 'あなたの回答を録音しています。';
      case 'processing':
        return '回答を処理しています...';
      case 'completed':
        return '面接が完了しました！';
      case 'error':
        return `エラーが発生しました: ${stateMachine.error}`;
      default:
        return '';
    }
  };

  // アバター接続
  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    stateMachine.initialize();
    addLog('HeyGenアバターに接続中...');

    if (avatarRef.current) {
      await avatarRef.current.connect();
    }
  }, [stateMachine, addLog]);

  // アバター接続完了
  const handleConnected = useCallback(
    (sessionId: string) => {
      setIsConnecting(false);
      stateMachine.connected(sessionId);
      addLog(`接続完了: ${sessionId}`);
    },
    [stateMachine, addLog]
  );

  // APIから質問を取得
  const fetchQuestions = useCallback(async (): Promise<Question[]> => {
    setIsLoadingQuestions(true);
    addLog(`質問を取得中（JLPTレベル: ${jlptLevel}）...`);

    try {
      const response = await fetch(`/api/questions?jlptLevel=${jlptLevel}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch questions: ${response.statusText}`);
      }
      const data = await response.json();
      const fetchedQuestions: Question[] = data.questions;
      setQuestions(fetchedQuestions);
      addLog(`質問を${fetchedQuestions.length}問取得しました`);
      return fetchedQuestions;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '質問の取得に失敗しました';
      addLog(`エラー: ${errorMessage}`);
      throw err;
    } finally {
      setIsLoadingQuestions(false);
    }
  }, [jlptLevel, addLog]);

  // 面接開始
  const handleStartInterview = useCallback(async () => {
    addLog(`面接を開始します（JLPTレベル: ${jlptLevel}）`);

    // 質問をAPIから取得
    let fetchedQuestions: Question[];
    try {
      fetchedQuestions = await fetchQuestions();
    } catch {
      stateMachine.setError('質問の取得に失敗しました');
      return;
    }

    // マイク許可を取得
    try {
      addLog('マイク許可を取得中...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
        },
      });
      setMediaStream(stream);
      addLog('マイク許可取得完了');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'マイク許可を取得できませんでした';
      stateMachine.setError(errorMessage);
      addLog(`エラー: ${errorMessage}`);
      return;
    }

    stateMachine.startInterview(fetchedQuestions);

    // 最初の質問を発話
    if (avatarRef.current && fetchedQuestions[0]) {
      await avatarRef.current.speakQuestion(fetchedQuestions[0]);
    }
  }, [stateMachine, addLog, jlptLevel, fetchQuestions]);

  // アバター発話開始
  const handleSpeakStart = useCallback(() => {
    console.log('[InterviewSession] handleSpeakStart called, current state:', stateMachine.state);
    stateMachine.avatarStartSpeaking();
    addLog('アバター発話開始');
  }, [stateMachine, addLog]);

  // アバター発話終了
  const handleSpeakEnd = useCallback(() => {
    console.log('[InterviewSession] handleSpeakEnd called, current state:', stateMachine.state);
    stateMachine.avatarStopSpeaking();
    addLog('アバター発話終了 → 録音待機');
    console.log('[InterviewSession] after avatarStopSpeaking, new state:', stateMachine.state);
  }, [stateMachine, addLog]);

  // 録音完了
  const handleRecordingComplete = useCallback(
    async (audioBlob: Blob, transcript: string) => {
      const currentQuestion = stateMachine.currentQuestion;
      if (!currentQuestion) return;

      addLog(`回答録音完了: ${transcript.slice(0, 30)}...`);

      const answer: Answer = {
        questionId: currentQuestion.id,
        questionOrder: currentQuestion.order,
        audioUrl: URL.createObjectURL(audioBlob),
        transcript,
        answeredAt: new Date(),
        skipped: false,
      };

      stateMachine.submitAnswer(answer);

      // 次の質問へ
      setTimeout(async () => {
        const nextIndex = stateMachine.currentQuestionIndex + 1;

        if (nextIndex >= questions.length) {
          // 面接完了
          addLog('全ての質問が完了しました');
          stateMachine.completeSession();

          // 評価を生成（モック）
          const allAnswers = [...stateMachine.answers, answer];
          const combinedTranscript = allAnswers
            .filter((a) => !a.skipped)
            .map((a) => a.transcript)
            .join('\n');

          const evalResult = generateMockEvaluation(
            '面接全体',
            combinedTranscript,
            jlptLevel
          );
          setEvaluation(evalResult);
          onComplete?.(evalResult);
        } else {
          // 次の質問
          stateMachine.nextQuestion();
          const nextQuestion = questions[nextIndex];
          addLog(`次の質問: Q${nextIndex + 1}`);

          if (avatarRef.current && nextQuestion) {
            await avatarRef.current.speakQuestion(nextQuestion);
          }
        }
      }, 500);
    },
    [stateMachine, jlptLevel, addLog, onComplete, questions]
  );

  // スキップ
  const handleSkip = useCallback(async () => {
    addLog('質問をスキップしました');
    stateMachine.skipQuestion();

    setTimeout(async () => {
      const nextIndex = stateMachine.currentQuestionIndex + 1;

      if (nextIndex >= questions.length) {
        stateMachine.completeSession();

        const evalResult = generateMockEvaluation(
          '面接全体',
          stateMachine.answers.filter((a) => !a.skipped).map((a) => a.transcript).join('\n'),
          jlptLevel
        );
        setEvaluation(evalResult);
        onComplete?.(evalResult);
      } else {
        stateMachine.nextQuestion();
        const nextQuestion = questions[nextIndex];

        if (avatarRef.current && nextQuestion) {
          await avatarRef.current.speakQuestion(nextQuestion);
        }
      }
    }, 500);
  }, [stateMachine, jlptLevel, addLog, onComplete, questions]);

  // エラーハンドリング
  const handleError = useCallback(
    (error: string) => {
      setIsConnecting(false);
      stateMachine.setError(error);
      addLog(`エラー: ${error}`);
    },
    [stateMachine, addLog]
  );

  // MediaStreamの解放
  const releaseMediaStream = useCallback(() => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      setMediaStream(null);
    }
  }, [mediaStream]);

  // リトライ
  const handleRetry = useCallback(() => {
    setIsConnecting(false);
    releaseMediaStream();
    setEvaluation(null);
    stateMachine.reset();
  }, [stateMachine, releaseMediaStream]);

  // 終了処理
  const handleExit = useCallback(async () => {
    addLog('面接を終了します');

    // アバター切断
    if (avatarRef.current) {
      await avatarRef.current.disconnect();
    }

    // MediaStream解放
    releaseMediaStream();

    // 状態リセット
    setIsConnecting(false);
    stateMachine.reset();

    addLog('面接を終了しました');

    // 終了コールバック
    onExit?.();
  }, [addLog, releaseMediaStream, stateMachine, onExit]);

  // コンポーネントアンマウント時にMediaStreamを解放
  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [mediaStream]);

  // 次のレベルで挑戦する処理
  const handleNextLevel = useCallback(
    (level: JLPTLevel) => {
      setIsConnecting(false);
      releaseMediaStream();
      setEvaluation(null);
      stateMachine.reset();
      onNextLevel?.(level);
    },
    [releaseMediaStream, stateMachine, onNextLevel]
  );

  // 評価完了画面
  if (evaluation) {
    return (
      <FeedbackDisplay
        evaluation={evaluation}
        currentLevel={jlptLevel}
        levelStats={levelStats}
        onRetry={handleRetry}
        onNextLevel={handleNextLevel}
        onClose={() => setEvaluation(null)}
      />
    );
  }

  return (
    <div className="interview-session">
      {/* フルスクリーンアバター（背景） */}
      <InterviewHeyGenAvatar
        ref={avatarRef}
        jlptLevel={jlptLevel}
        fullscreen={true}
        showMetrics={false}
        onSpeakStart={handleSpeakStart}
        onSpeakEnd={handleSpeakEnd}
        onConnected={handleConnected}
        onError={handleError}
      />

      {/* オーバーレイUI */}
      <div className="overlay-container">
        {/* ヘッダー */}
        <div className="overlay-header">
          <div className="session-header">
            <h2>AI面接練習</h2>
            <div className="header-controls">
              <span className="jlpt-badge">JLPT {jlptLevel}</span>
              <button className="btn-exit" onClick={handleExit} title="面接を終了">
                <span className="exit-icon">✕</span>
                <span className="exit-text">終了</span>
              </button>
            </div>
          </div>

          {/* プログレスバー */}
          {stateMachine.totalQuestions > 0 && (
            <div className="progress-section">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${stateMachine.progress}%` }}
                />
              </div>
              <span className="progress-text">
                {stateMachine.currentQuestionIndex + 1} / {stateMachine.totalQuestions}
              </span>
            </div>
          )}
        </div>

        {/* 中央エリア：接続・開始ボタン */}
        <div className="overlay-center">
          {/* 接続中ローディング */}
          {isConnecting && (
            <div className="connecting-overlay">
              <div className="connecting-spinner" />
              <span className="connecting-text">アバターを準備しています...</span>
            </div>
          )}

          {/* 接続ボタン（接続中でない場合のみ表示） */}
          {stateMachine.state === 'initializing' && !isConnecting && (
            <button className="btn-connect" onClick={handleConnect}>
              アバターに接続
            </button>
          )}

          {/* 開始ボタン */}
          {stateMachine.isReady && (
            <div className="start-options">
              <button className="btn-start" onClick={handleStartInterview}>
                面接を開始
              </button>

              {/* チャレンジ枠オプション */}
              {canChallenge && challengeLevel && !isChallengeMode && onStartChallenge && (
                <div className="challenge-option">
                  <button className="btn-challenge-mode" onClick={onStartChallenge}>
                    チャレンジ枠で挑戦（{challengeLevel}）
                  </button>
                  <span className="challenge-remaining">
                    残り{remainingChallenges}/{dailyChallengeLimit}回
                  </span>
                </div>
              )}

              {/* チャレンジ回数制限に達した場合 */}
              {!canChallenge && challengeLevel && !isChallengeMode && remainingChallenges === 0 && (
                <div className="challenge-limit-reached">
                  本日のチャレンジ枠は終了しました（{dailyChallengeLimit}回/日）
                </div>
              )}

              {/* チャレンジ枠中の表示 */}
              {isChallengeMode && (
                <div className="challenge-mode-badge">
                  チャレンジ枠で挑戦中
                </div>
              )}
            </div>
          )}

          {/* 状態説明（接続・開始待ち時のみ表示、接続中は非表示） */}
          {(stateMachine.state === 'initializing' || stateMachine.state === 'ready') && !isConnecting && (
            <div className="state-description">
              {getStateDescription(stateMachine.state)}
            </div>
          )}
        </div>

        {/* 下部エリア */}
        <div className="overlay-bottom">
          {/* 質問表示 */}
          {stateMachine.currentQuestion && (
            <div className="question-section">
              <div className="question-label">質問 {stateMachine.currentQuestionIndex + 1}</div>
              <p className="question-text">{stateMachine.currentQuestion.text}</p>
            </div>
          )}

          {/* 録音セクション */}
          {stateMachine.isListening && (
            <div className="recorder-section">
              <AudioRecorder
                isEnabled={true}
                autoStart={true}
                autoStopSeconds={30}
                mediaStream={mediaStream}
                onRecordingComplete={handleRecordingComplete}
                onSkip={handleSkip}
              />
            </div>
          )}

          {/* エラー表示 */}
          {stateMachine.state === 'error' && (
            <div className="error-section">
              {getStateDescription(stateMachine.state)}
            </div>
          )}
        </div>

        {/* ログ表示（デバッグ用） - 非表示 */}
        {/* <div className="log-section">
          <div className="log-toggle">
            <span>ログ ({logs.length})</span>
          </div>
          <div className="log-list">
            {logs.slice(-5).map((log, i) => (
              <div key={i} className="log-item">
                {log}
              </div>
            ))}
          </div>
        </div> */}
      </div>

      <style jsx>{`
        .interview-session {
          position: relative;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          background: #000;
        }

        .overlay-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 10;
          display: flex;
          flex-direction: column;
          pointer-events: none;
        }

        .overlay-container > * {
          pointer-events: auto;
        }

        /* ヘッダーエリア - 臨場感を損なわないよう控えめに */
        .overlay-header {
          padding: 20px 24px;
          background: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0.6) 0%,
            rgba(0, 0, 0, 0.3) 50%,
            rgba(0, 0, 0, 0) 100%
          );
          transition: opacity 0.3s ease;
        }

        /* 面接中はヘッダーを控えめに */
        .interview-session:has(.question-section) .overlay-header {
          opacity: 0.8;
        }

        .session-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .session-header h2 {
          margin: 0;
          font-size: 20px;
          color: #fff;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
        }

        .header-controls {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .jlpt-badge {
          padding: 6px 14px;
          background: rgba(59, 130, 246, 0.9);
          color: white;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          backdrop-filter: blur(4px);
        }

        .btn-exit {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border: none;
          background: rgba(239, 68, 68, 0.7);
          color: white;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          backdrop-filter: blur(4px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .btn-exit:hover {
          background: rgba(239, 68, 68, 0.9);
          transform: scale(1.02);
        }

        .exit-icon {
          font-size: 12px;
          font-weight: bold;
        }

        .exit-text {
          font-size: 12px;
        }

        .progress-section {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .progress-bar {
          flex: 1;
          height: 6px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: #3b82f6;
          transition: width 0.3s ease;
        }

        .progress-text {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.8);
          min-width: 50px;
          text-align: right;
        }

        /* 中央エリア */
        .overlay-center {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 20px;
          pointer-events: none;
        }

        .overlay-center > * {
          pointer-events: auto;
        }

        .state-description {
          text-align: center;
          color: rgba(255, 255, 255, 0.85);
          font-size: 16px;
          padding: 12px 24px;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 24px;
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        /* 接続中ローディング */
        .connecting-overlay {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 20px;
          padding: 32px 48px;
          background: rgba(0, 0, 0, 0.6);
          border-radius: 20px;
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }

        .connecting-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid rgba(255, 255, 255, 0.2);
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .connecting-text {
          font-size: 18px;
          color: rgba(255, 255, 255, 0.9);
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .btn-connect,
        .btn-start {
          padding: 18px 56px;
          border: none;
          border-radius: 16px;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(12px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }

        .btn-connect {
          background: rgba(80, 90, 100, 0.8);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .btn-connect:hover {
          background: rgba(100, 110, 120, 0.9);
          transform: scale(1.03);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
        }

        .btn-start {
          background: transparent;
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.4);
        }

        .btn-start:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: scale(1.03);
          box-shadow: 0 12px 40px rgba(255, 255, 255, 0.1);
        }

        .start-options {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .btn-challenge-mode {
          padding: 12px 32px;
          border: 2px solid rgba(251, 191, 36, 0.6);
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(12px);
          background: rgba(251, 191, 36, 0.1);
          color: #fbbf24;
        }

        .btn-challenge-mode:hover {
          background: rgba(251, 191, 36, 0.2);
          border-color: #fbbf24;
          transform: scale(1.02);
        }

        .challenge-option {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .challenge-remaining {
          font-size: 12px;
          color: rgba(251, 191, 36, 0.8);
        }

        .challenge-limit-reached {
          padding: 10px 20px;
          background: rgba(107, 114, 128, 0.2);
          border: 1px solid rgba(107, 114, 128, 0.4);
          border-radius: 12px;
          color: #9ca3af;
          font-size: 13px;
          backdrop-filter: blur(8px);
        }

        .challenge-mode-badge {
          padding: 8px 20px;
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.2) 100%);
          border: 1px solid rgba(251, 191, 36, 0.5);
          border-radius: 20px;
          color: #fbbf24;
          font-size: 13px;
          font-weight: 600;
          backdrop-filter: blur(8px);
        }

        /* 下部エリア - アバターに溶け込むグラデーション */
        .overlay-bottom {
          padding: 0 24px 24px;
          background: linear-gradient(
            to top,
            rgba(0, 0, 0, 0.75) 0%,
            rgba(0, 0, 0, 0.5) 30%,
            rgba(0, 0, 0, 0.2) 60%,
            rgba(0, 0, 0, 0) 100%
          );
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding-top: 40px;
        }

        .question-section {
          padding: 16px 20px;
          background: rgba(10, 10, 20, 0.75);
          border-radius: 12px;
          border-left: 4px solid rgba(59, 130, 246, 0.8);
          backdrop-filter: blur(12px);
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
        }

        .question-label {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.6);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 8px;
        }

        .question-text {
          font-size: 17px;
          color: #fff;
          line-height: 1.6;
          margin: 0;
        }

        .recorder-section {
          padding: 16px 20px;
          background: rgba(10, 10, 20, 0.7);
          border-radius: 12px;
          backdrop-filter: blur(12px);
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
        }

        .error-section {
          padding: 16px 20px;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.4);
          border-radius: 12px;
          color: #fca5a5;
          text-align: center;
          backdrop-filter: blur(8px);
        }

        /* ログセクション（下部中央に表示） */
        .log-section {
          position: fixed;
          bottom: 32px;
          left: 50%;
          transform: translateX(-50%);
          width: 90%;
          max-width: 90vw;
          background: rgba(10, 10, 10, 0.8);
          border-radius: 8px;
          overflow: hidden;
          backdrop-filter: blur(8px);
          opacity: 0.7;
          transition: opacity 0.3s ease;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.5);
        }

        .log-section:hover {
          opacity: 0.9;
        }

        .log-toggle {
          padding: 8px 12px;
          font-size: 11px;
          color: #888;
          background: rgba(10, 10, 10, 0.9);
        }

        .log-list {
          max-height: 80px;
          overflow-y: auto;
          padding: 6px 12px;
          font-family: monospace;
          font-size: 10px;
        }

        .log-item {
          padding: 2px 0;
          color: #666;
        }

        /* ===== SP（スマートフォン）: ~640px ===== */
        @media (max-width: 640px) {
          .overlay-header {
            padding: 12px 16px;
          }

          .session-header h2 {
            font-size: 16px;
          }

          .session-header {
            margin-bottom: 8px;
          }

          .header-controls {
            gap: 8px;
          }

          .jlpt-badge {
            padding: 4px 10px;
            font-size: 11px;
          }

          .progress-bar {
            height: 4px;
          }

          .progress-text {
            font-size: 11px;
            min-width: 40px;
          }

          .btn-connect,
          .btn-start {
            padding: 14px 36px;
            font-size: 16px;
            border-radius: 10px;
          }

          .state-description {
            font-size: 14px;
            padding: 10px 16px;
          }

          .connecting-overlay {
            padding: 24px 32px;
            gap: 16px;
          }

          .connecting-spinner {
            width: 36px;
            height: 36px;
            border-width: 3px;
          }

          .connecting-text {
            font-size: 15px;
          }

          .overlay-bottom {
            padding: 0 12px 12px;
            gap: 12px;
          }

          .question-section {
            padding: 12px 14px;
            border-radius: 10px;
          }

          .question-label {
            font-size: 10px;
            margin-bottom: 6px;
          }

          .question-text {
            font-size: 15px;
            line-height: 1.5;
          }

          .recorder-section {
            padding: 12px 14px;
            border-radius: 10px;
          }

          .log-section {
            width: 90%;
            bottom: 24px;
          }

          .btn-exit {
            padding: 4px 10px;
          }

          .exit-icon {
            font-size: 10px;
          }

          .exit-text {
            font-size: 10px;
          }

          .log-toggle {
            padding: 6px 10px;
            font-size: 10px;
          }

          .log-list {
            max-height: 60px;
            padding: 4px 10px;
            font-size: 9px;
          }
        }

        /* ===== MD（タブレット）: 641px ~ 1024px ===== */
        @media (min-width: 641px) and (max-width: 1024px) {
          .overlay-header {
            padding: 20px 32px;
          }

          .session-header h2 {
            font-size: 22px;
          }

          .header-controls {
            gap: 14px;
          }

          .jlpt-badge {
            padding: 6px 16px;
            font-size: 14px;
          }

          .progress-bar {
            height: 6px;
          }

          .btn-connect,
          .btn-start {
            padding: 16px 48px;
            font-size: 18px;
          }

          .state-description {
            font-size: 16px;
            padding: 14px 28px;
          }

          .overlay-bottom {
            padding: 0 32px 32px;
            max-width: 700px;
            margin: 0 auto;
            width: 100%;
          }

          .question-section {
            padding: 18px 22px;
          }

          .question-text {
            font-size: 18px;
          }

          .log-section {
            width: 90%;
            bottom: 32px;
          }

          .btn-exit {
            padding: 6px 14px;
          }

          .exit-icon {
            font-size: 12px;
          }

          .exit-text {
            font-size: 12px;
          }
        }

        /* ===== PC（デスクトップ）: 1025px~ ===== */
        @media (min-width: 1025px) {
          .overlay-header {
            padding: 24px 48px;
          }

          .session-header h2 {
            font-size: 24px;
          }

          .header-controls {
            gap: 16px;
          }

          .jlpt-badge {
            padding: 8px 20px;
            font-size: 15px;
          }

          .progress-bar {
            height: 8px;
            max-width: 600px;
          }

          .progress-section {
            max-width: 700px;
          }

          .btn-connect,
          .btn-start {
            padding: 18px 56px;
            font-size: 20px;
            border-radius: 14px;
          }

          .btn-connect:hover,
          .btn-start:hover {
            transform: scale(1.03);
          }

          .state-description {
            font-size: 18px;
            padding: 16px 32px;
          }

          .connecting-overlay {
            padding: 40px 60px;
            gap: 24px;
          }

          .connecting-spinner {
            width: 56px;
            height: 56px;
            border-width: 5px;
          }

          .connecting-text {
            font-size: 20px;
          }

          .overlay-bottom {
            padding: 0 48px 48px;
            max-width: 800px;
            margin: 0 auto;
            width: 100%;
          }

          .question-section {
            padding: 20px 28px;
            border-radius: 16px;
          }

          .question-label {
            font-size: 12px;
          }

          .question-text {
            font-size: 20px;
          }

          .recorder-section {
            padding: 20px 28px;
            border-radius: 16px;
          }

          .log-section {
            width: 90%;
            bottom: 40px;
          }

          .btn-exit {
            padding: 8px 16px;
            font-size: 14px;
            border-radius: 10px;
          }

          .exit-icon {
            font-size: 14px;
          }

          .exit-text {
            font-size: 13px;
          }

          .log-toggle {
            padding: 10px 14px;
            font-size: 12px;
          }

          .log-list {
            max-height: 100px;
            font-size: 11px;
          }
        }

        /* ===== ランドスケープ（横向き）モバイル対応 ===== */
        @media (max-height: 500px) and (orientation: landscape) {
          .overlay-header {
            padding: 8px 16px;
          }

          .session-header {
            margin-bottom: 4px;
          }

          .session-header h2 {
            font-size: 14px;
          }

          .header-controls {
            gap: 8px;
          }

          .btn-exit {
            padding: 3px 8px;
          }

          .exit-icon {
            font-size: 10px;
          }

          .exit-text {
            display: none;
          }

          .progress-bar {
            height: 3px;
          }

          .overlay-center {
            gap: 12px;
          }

          .btn-connect,
          .btn-start {
            padding: 10px 32px;
            font-size: 14px;
          }

          .state-description {
            font-size: 12px;
            padding: 8px 16px;
          }

          .connecting-overlay {
            padding: 16px 24px;
            gap: 12px;
          }

          .connecting-spinner {
            width: 32px;
            height: 32px;
            border-width: 3px;
          }

          .connecting-text {
            font-size: 14px;
          }

          .overlay-bottom {
            padding: 0 16px 8px;
            gap: 8px;
          }

          .question-section {
            padding: 10px 14px;
          }

          .question-text {
            font-size: 14px;
            line-height: 1.4;
          }

          .recorder-section {
            padding: 10px 14px;
          }

          .log-section {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
