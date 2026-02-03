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
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [isGreetingInProgress, setIsGreetingInProgress] = useState(false);
  // アバター発話完了後のバッファ（録音セクション表示を遅延させる）
  const [isAvatarSpeakingDelayed, setIsAvatarSpeakingDelayed] = useState(false);
  // 質問発話中フラグ（質問セクションの表示制御用）
  const [isSpeakingQuestion, setIsSpeakingQuestion] = useState(false);
  // 質問間の遷移中フラグ（「ありがとうございます」等の発話中）
  const [isTransitioning, setIsTransitioning] = useState(false);
  // 結果表示フラグ（結果表示ボタンを押すまでFeedbackDisplayを非表示にする）
  const [showResults, setShowResults] = useState(false);

  const stateMachine = useInterviewStateMachine();

  // 自動接続開始フラグ
  const hasAutoConnectStarted = useRef(false);
  // 終了処理中フラグ（録音完了コールバック等がexiting中に実行されないようにする）
  const isExitingRef = useRef(false);
  // 面接終了シーケンス中フラグ（最後の質問回答後の挨拶中）
  const isEndingSequenceRef = useRef(false);
  // 発話終了後の遅延タイマーID（連続発話時にキャンセルするため）
  const speakingDelayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ログ追加（早い段階で定義）
  const addLog = useCallback((message: string) => {
    const time = new Date().toLocaleTimeString('ja-JP');
    setLogs((prev) => [...prev.slice(-19), `[${time}] ${message}`]);
  }, []);

  // 初期状態をログ（マウント時のみ実行）
  useEffect(() => {
    console.log('[InterviewSession] Initial state:', stateMachine.state);
    console.log('[InterviewSession] isConnecting:', isConnecting);
    console.log('[InterviewSession] evaluation:', evaluation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 状態変更をログ
  useEffect(() => {
    console.log('[InterviewSession] State changed to:', stateMachine.state);
  }, [stateMachine.state]);


  // 面接開始ボタン押下時の処理（接続→質問取得→発話開始）
  const handleStartInterview = useCallback(async () => {
    console.log('[InterviewSession] Start interview button clicked');

    if (!avatarRef.current) {
      console.error('[InterviewSession] avatarRef not ready');
      return;
    }

    // HeyGen接続開始
    setIsConnecting(true);
    stateMachine.initialize();
    addLog('HeyGenアバターに接続中...');

    try {
      await avatarRef.current.connect();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'HeyGen接続に失敗しました';
      setIsConnecting(false);
      stateMachine.setError(errorMessage);
      addLog(`エラー: ${errorMessage}`);
      return;
    }

    // 接続成功後、質問取得と面接開始
    addLog(`面接を開始します（JLPTレベル: ${jlptLevel}）`);

    // 質問をAPIから取得
    let fetchedQuestions: Question[];
    try {
      setIsLoadingQuestions(true);
      addLog(`質問を取得中（JLPTレベル: ${jlptLevel}）...`);

      const response = await fetch(`/api/questions?jlptLevel=${jlptLevel}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch questions: ${response.statusText}`);
      }
      const data = await response.json();
      fetchedQuestions = data.questions;
      setQuestions(fetchedQuestions);
      addLog(`質問を${fetchedQuestions.length}問取得しました`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '質問の取得に失敗しました';
      stateMachine.setError(errorMessage);
      addLog(`エラー: ${errorMessage}`);
      return;
    } finally {
      setIsLoadingQuestions(false);
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

    // 挨拶中フラグを先に立てる（質問枠が表示されないように）
    setIsGreetingInProgress(true);

    stateMachine.startInterview(fetchedQuestions);

    // HeyGenセッションが安定するまで少し待機
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (avatarRef.current) {
      addLog('面接開始の挨拶...');
      await avatarRef.current.speak('本日はお越しいただき、ありがとうございます。');
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await avatarRef.current.speak('緊張されていませんか？');
      // ユーザーがリラックスする時間を設ける
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await avatarRef.current.speak('リラックスして、普段通りお話しいただければ大丈夫ですよ。');
      // リラックスの言葉の余韻を残す
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await avatarRef.current.speak('それでは、面接を始めさせていただきます。');
      // 面接開始前に十分な間を空ける
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }

    // 最初の質問を発話（質問表示と同時に発話開始）
    if (avatarRef.current && fetchedQuestions[0]) {
      setIsGreetingInProgress(false); // 質問表示を有効化
      setIsSpeakingQuestion(true); // 質問発話中フラグを立てる
      addLog('最初の質問を発話します...');
      await avatarRef.current.speakQuestion(fetchedQuestions[0]);
    } else {
      setIsGreetingInProgress(false);
    }
  }, [stateMachine, addLog, jlptLevel]);

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

  // アバター接続完了
  const handleConnected = useCallback(
    (sessionId: string) => {
      setIsConnecting(false);
      stateMachine.connected(sessionId);
      addLog(`接続完了: ${sessionId}`);
    },
    [stateMachine, addLog]
  );

  // アバター発話開始
  const handleSpeakStart = useCallback(() => {
    console.log('[InterviewSession] handleSpeakStart called, current state:', stateMachine.state);
    // 前の遅延タイマーをキャンセル（連続発話時に録音が開始されないようにする）
    if (speakingDelayTimerRef.current) {
      console.log('[InterviewSession] Cancelling previous speaking delay timer');
      clearTimeout(speakingDelayTimerRef.current);
      speakingDelayTimerRef.current = null;
    }
    setIsAvatarSpeakingDelayed(true);
    stateMachine.avatarStartSpeaking();
    addLog('アバター発話開始');
  }, [stateMachine, addLog]);

  // アバター発話終了
  const handleSpeakEnd = useCallback(() => {
    console.log('[InterviewSession] handleSpeakEnd called, current state:', stateMachine.state);
    // スピーカーからの残響が消えるまで少し待機してから録音開始
    addLog('アバター発話終了 → 録音準備中...');
    // タイマーIDを保持して、次の発話開始時にキャンセルできるようにする
    speakingDelayTimerRef.current = setTimeout(() => {
      speakingDelayTimerRef.current = null;
      setIsAvatarSpeakingDelayed(false);
      setIsSpeakingQuestion(false); // 質問発話中フラグを下ろす
      stateMachine.avatarStopSpeaking();
      addLog('録音開始');
      console.log('[InterviewSession] after avatarStopSpeaking, new state:', stateMachine.state);
    }, 500); // 500ms待機で残響を回避
  }, [stateMachine, addLog]);

  // 録音完了
  const handleRecordingComplete = useCallback(
    async (audioBlob: Blob, transcript: string) => {
      // 終了処理中または終了シーケンス中は何もしない
      if (isExitingRef.current || isEndingSequenceRef.current) {
        console.log('[InterviewSession] handleRecordingComplete skipped (exiting or ending sequence)');
        return;
      }
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
          // 面接完了 - 終了シーケンス開始
          isEndingSequenceRef.current = true;
          addLog('全ての質問が完了しました');

          // 終了の挨拶
          if (avatarRef.current) {
            await avatarRef.current.speak('ありがとうございます。');
            await new Promise((resolve) => setTimeout(resolve, 1000));
            await avatarRef.current.speak('以上で本日の面接は終了となります。');
            await new Promise((resolve) => setTimeout(resolve, 1500));
            await avatarRef.current.speak('本日はお時間をいただき、ありがとうございました。');
            await new Promise((resolve) => setTimeout(resolve, 1500));
            await avatarRef.current.speak('結果につきましては、後日ご連絡いたします。');
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }

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
            // 遷移中フラグを立てる（録音モーダルを非表示にする）
            setIsTransitioning(true);
            // お礼を言ってから次の質問へ
            await avatarRef.current.speak('ありがとうございます。');
            // お礼の後に間を空ける
            await new Promise((resolve) => setTimeout(resolve, 1500));
            await avatarRef.current.speak('では、次の質問に移らせていただきます。');
            // 次の質問の前に間を空ける
            await new Promise((resolve) => setTimeout(resolve, 1500));
            // 遷移中フラグを下ろし、質問発話中フラグを立てる
            setIsTransitioning(false);
            setIsSpeakingQuestion(true);
            await avatarRef.current.speakQuestion(nextQuestion);
          }
        }
      }, 500);
    },
    [stateMachine, jlptLevel, addLog, onComplete, questions]
  );

  // スキップ
  const handleSkip = useCallback(async () => {
    // 終了処理中または終了シーケンス中は何もしない
    if (isExitingRef.current || isEndingSequenceRef.current) {
      console.log('[InterviewSession] handleSkip skipped (exiting or ending sequence)');
      return;
    }
    addLog('質問をスキップしました');
    stateMachine.skipQuestion();

    setTimeout(async () => {
      const nextIndex = stateMachine.currentQuestionIndex + 1;

      if (nextIndex >= questions.length) {
        // 終了シーケンス開始
        isEndingSequenceRef.current = true;
        // 終了の挨拶
        if (avatarRef.current) {
          await avatarRef.current.speak('以上で本日の面接は終了となります。');
          await new Promise((resolve) => setTimeout(resolve, 1500));
          await avatarRef.current.speak('本日はお時間をいただき、ありがとうございました。');
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

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
          // 遷移中フラグを立てる（録音モーダルを非表示にする）
          setIsTransitioning(true);
          // 次の質問へ
          await avatarRef.current.speak('では、次の質問に移らせていただきます。');
          // 次の質問の前に間を空ける
          await new Promise((resolve) => setTimeout(resolve, 1500));
          // 遷移中フラグを下ろし、質問発話中フラグを立てる
          setIsTransitioning(false);
          setIsSpeakingQuestion(true);
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

  // 残り時間更新
  const handleRemainingTimeChange = useCallback((time: number) => {
    setRemainingTime(time);
  }, []);

  // MediaStreamの解放
  const releaseMediaStream = useCallback(() => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      setMediaStream(null);
    }
  }, [mediaStream]);

  // リトライ
  const handleRetry = useCallback(() => {
    // 発話遅延タイマーをクリア
    if (speakingDelayTimerRef.current) {
      clearTimeout(speakingDelayTimerRef.current);
      speakingDelayTimerRef.current = null;
    }
    setIsConnecting(false);
    releaseMediaStream();
    setEvaluation(null);
    setShowResults(false);
    setIsAvatarSpeakingDelayed(false);
    setIsSpeakingQuestion(false);
    setIsTransitioning(false);
    isEndingSequenceRef.current = false;
    isExitingRef.current = false;
    stateMachine.reset();
  }, [stateMachine, releaseMediaStream]);

  // 終了処理
  const handleExit = useCallback(async () => {
    console.log('[InterviewSession] handleExit called');
    isExitingRef.current = true; // 終了処理中フラグを立てる
    addLog('面接を終了します');

    // 発話遅延タイマーをクリア
    if (speakingDelayTimerRef.current) {
      clearTimeout(speakingDelayTimerRef.current);
      speakingDelayTimerRef.current = null;
    }

    // アバター切断
    if (avatarRef.current) {
      console.log('[InterviewSession] Disconnecting avatar...');
      await avatarRef.current.disconnect();
      console.log('[InterviewSession] Avatar disconnected');
    }

    // MediaStream解放
    releaseMediaStream();

    // 残り時間リセット
    setRemainingTime(null);

    // 状態リセット
    setIsConnecting(false);
    stateMachine.reset();

    addLog('面接を終了しました');
    console.log('[InterviewSession] Exit complete');

    // 終了コールバック
    onExit?.();
  }, [addLog, releaseMediaStream, stateMachine, onExit]);

  // MediaStreamの変更時に古いストリームを解放
  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [mediaStream]);

  // コンポーネントアンマウント時にアバター切断
  useEffect(() => {
    return () => {
      if (avatarRef.current) {
        avatarRef.current.disconnect();
      }
    };
  }, []);

  // コンポーネントアンマウント時に発話遅延タイマーをクリア
  useEffect(() => {
    return () => {
      if (speakingDelayTimerRef.current) {
        clearTimeout(speakingDelayTimerRef.current);
      }
    };
  }, []);

  // 次のレベルで挑戦する処理
  const handleNextLevel = useCallback(
    (level: JLPTLevel) => {
      setIsConnecting(false);
      releaseMediaStream();
      setEvaluation(null);
      setShowResults(false);
      stateMachine.reset();
      onNextLevel?.(level);
    },
    [releaseMediaStream, stateMachine, onNextLevel]
  );

  // 評価完了画面（結果表示ボタン押下後に表示）
  if (evaluation && showResults) {
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
        isRecording={stateMachine.isListening && !isGreetingInProgress}
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
            <div className="header-left">
              <h2>AI面接練習</h2>
              <span className={`connection-status ${
                isConnecting ? 'connecting' :
                stateMachine.isReady || stateMachine.state !== 'initializing' ? 'connected' : 'disconnected'
              }`}>
                {isConnecting ? '接続中...' :
                 stateMachine.isReady || stateMachine.state !== 'initializing' ? '接続中' : '未接続'}
              </span>
            </div>
            <div className="header-controls">
              <span className="jlpt-badge">JLPT {jlptLevel}</span>
              <button className="btn-exit" onClick={handleExit} title="面接を終了">
                <span className="exit-icon">✕</span>
                <span className="exit-text">終了</span>
              </button>
            </div>
          </div>

          {/* プログレスバー（挨拶中は非表示） */}
          {stateMachine.totalQuestions > 0 && !isGreetingInProgress && (
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

          {/* 質問表示（質問発話中または録音中のみ表示） */}
          {stateMachine.currentQuestion && !isGreetingInProgress && stateMachine.state !== 'completed' && (isSpeakingQuestion || stateMachine.isListening) && (
            <div className="question-section">
              <div className="question-header">
                <div className="question-label">質問 {stateMachine.currentQuestionIndex + 1}</div>
                <div className={`remaining-time ${stateMachine.isListening && !isAvatarSpeakingDelayed ? 'visible' : 'hidden'}`}>
                  残り {remainingTime ?? 30} 秒
                </div>
              </div>
              <p className="question-text">{stateMachine.currentQuestion.text}</p>
            </div>
          )}

          {/* 挨拶中メッセージ */}
          {isGreetingInProgress && (
            <div className="greeting-section">
              <p className="greeting-text">面接官が挨拶しています...</p>
            </div>
          )}
        </div>

        {/* 中央エリア：開始ボタンまたはローディング */}
        <div className="overlay-center">
          {/* 開始ボタン（初期状態で表示） */}
          {stateMachine.state === 'initializing' && !isConnecting && !isLoadingQuestions && (
            <button className="btn-start-interview" onClick={handleStartInterview}>
              面接を開始
            </button>
          )}

          {/* 接続中・質問取得中ローディング */}
          {(isConnecting || isLoadingQuestions) && (
            <div className="connecting-overlay">
              <div className="connecting-spinner" />
              <span className="connecting-text">
                {isLoadingQuestions ? '質問を準備しています...' : 'アバターを準備しています...'}
              </span>
            </div>
          )}

          {/* チャレンジ枠中の表示（面接中に表示） */}
          {isChallengeMode && stateMachine.currentQuestion && (
            <div className="challenge-mode-badge">
              チャレンジ枠で挑戦中
            </div>
          )}

          {/* エラー表示（中央に表示） */}
          {stateMachine.state === 'error' && (
            <div className="error-overlay">
              <div className="error-message-box">
                <p>{stateMachine.error}</p>
                <button className="btn-retry" onClick={() => window.location.reload()}>
                  再読み込み
                </button>
              </div>
            </div>
          )}

          {/* 面接完了後の結果表示ボタン */}
          {evaluation && !showResults && (
            <div className="result-button-section">
              <div className="result-button-box">
                <p className="completion-message">面接お疲れさまでした</p>
                <button
                  className="btn-show-results"
                  onClick={() => setShowResults(true)}
                >
                  結果表示
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 下部エリア */}
        <div className="overlay-bottom">
          {/* 録音セクション（挨拶中・面接完了時・アバター発話中・遷移中は非表示） */}
          {stateMachine.isListening && !isGreetingInProgress && stateMachine.state !== 'completed' && !isAvatarSpeakingDelayed && !isTransitioning && (
            <div className="recorder-section">
              <AudioRecorder
                isEnabled={true}
                autoStart={true}
                autoStopSeconds={30}
                mediaStream={mediaStream}
                questionText={stateMachine.currentQuestion?.text}
                onRecordingComplete={handleRecordingComplete}
                onSkip={handleSkip}
                onRemainingTimeChange={handleRemainingTimeChange}
              />
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

        /* ヘッダーエリア - 質問と録音セクションを含む */
        .overlay-header {
          padding: 20px 24px;
          background: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0.6) 0%,
            rgba(0, 0, 0, 0.4) 60%,
            rgba(0, 0, 0, 0.2) 80%,
            rgba(0, 0, 0, 0) 100%
          );
          transition: opacity 0.3s ease;
          padding-bottom: 40px;
        }

        .session-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .session-header h2 {
          margin: 0;
          font-size: 20px;
          color: #fff;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
        }

        .connection-status {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
        }

        .connection-status.disconnected {
          background: rgba(107, 114, 128, 0.4);
          color: #9ca3af;
          border: 1px solid rgba(107, 114, 128, 0.5);
        }

        .connection-status.connecting {
          background: rgba(251, 191, 36, 0.2);
          color: #fbbf24;
          border: 1px solid rgba(251, 191, 36, 0.4);
        }

        .connection-status.connected {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
          border: 1px solid rgba(34, 197, 94, 0.4);
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

        .error-overlay {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }

        .error-message-box {
          padding: 24px 32px;
          background: rgba(127, 29, 29, 0.9);
          border: 1px solid rgba(239, 68, 68, 0.5);
          border-radius: 16px;
          backdrop-filter: blur(12px);
          text-align: center;
        }

        .error-message-box p {
          margin: 0 0 16px 0;
          color: #fca5a5;
          font-size: 16px;
        }

        .btn-retry {
          padding: 12px 32px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          background: #ef4444;
          color: white;
          transition: all 0.2s ease;
        }

        .btn-retry:hover {
          background: #dc2626;
          transform: scale(1.02);
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
        .btn-start,
        .btn-start-interview {
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

        .btn-start-interview {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.8) 0%, rgba(37, 99, 235, 0.8) 100%);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .btn-start-interview:hover {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.95) 0%, rgba(37, 99, 235, 0.95) 100%);
          transform: scale(1.03);
          box-shadow: 0 12px 40px rgba(59, 130, 246, 0.3);
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

        /* 結果表示ボタンセクション */
        .result-button-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .result-button-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
          padding: 40px 56px;
          background: rgba(0, 0, 0, 0.7);
          border-radius: 24px;
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }

        .completion-message {
          margin: 0;
          font-size: 20px;
          color: rgba(255, 255, 255, 0.9);
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .btn-show-results {
          padding: 16px 48px;
          border: none;
          border-radius: 12px;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.9) 0%, rgba(22, 163, 74, 0.9) 100%);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 4px 16px rgba(34, 197, 94, 0.3);
        }

        .btn-show-results:hover {
          background: linear-gradient(135deg, rgba(34, 197, 94, 1) 0%, rgba(22, 163, 74, 1) 100%);
          transform: scale(1.03);
          box-shadow: 0 8px 24px rgba(34, 197, 94, 0.4);
        }

        /* 下部エリア - アバターに溶け込むグラデーション */
        .overlay-bottom {
          padding: 0 24px 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .greeting-section {
          padding: 16px 20px;
          background: rgba(10, 10, 20, 0.4);
          border-radius: 12px;
          backdrop-filter: blur(8px);
          text-align: center;
          margin-top: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .greeting-text {
          color: rgba(255, 255, 255, 0.8);
          font-size: 16px;
          margin: 0;
        }

        .question-section {
          padding: 16px 20px;
          background: rgba(10, 10, 20, 0.4);
          border-radius: 12px;
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          margin-top: 12px;
        }

        .question-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .question-label {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.6);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .remaining-time {
          font-size: 13px;
          color: #60a5fa;
          font-weight: 500;
          padding: 4px 10px;
          background: rgba(59, 130, 246, 0.15);
          border-radius: 12px;
          border: 1px solid rgba(59, 130, 246, 0.3);
          transition: opacity 0.2s ease;
        }

        .remaining-time.visible {
          opacity: 1;
        }

        .remaining-time.hidden {
          opacity: 0;
        }

        .question-text {
          font-size: 17px;
          color: #fff;
          line-height: 1.6;
          margin: 0;
        }

        .recorder-section {
          padding: 16px 20px;
          background: rgba(10, 10, 20, 0.4);
          border-radius: 12px;
          backdrop-filter: blur(8px);
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.1);
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
            padding-bottom: 24px;
          }

          .session-header h2 {
            font-size: 16px;
          }

          .session-header {
            margin-bottom: 8px;
          }

          .header-left {
            gap: 8px;
          }

          .connection-status {
            padding: 3px 8px;
            font-size: 10px;
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
          .btn-start,
          .btn-start-interview {
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

          .result-button-box {
            padding: 28px 36px;
            gap: 20px;
          }

          .completion-message {
            font-size: 16px;
          }

          .btn-show-results {
            padding: 14px 36px;
            font-size: 16px;
          }
        }

        /* ===== MD（タブレット）: 641px ~ 1024px ===== */
        @media (min-width: 641px) and (max-width: 1024px) {
          .overlay-header {
            padding: 20px 32px;
            padding-bottom: 32px;
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
          .btn-start,
          .btn-start-interview {
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
            padding-bottom: 48px;
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
          .btn-start,
          .btn-start-interview {
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
            padding-bottom: 16px;
          }

          .session-header {
            margin-bottom: 4px;
          }

          .session-header h2 {
            font-size: 14px;
          }

          .header-left {
            gap: 6px;
          }

          .connection-status {
            padding: 2px 6px;
            font-size: 9px;
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
          .btn-start,
          .btn-start-interview {
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
