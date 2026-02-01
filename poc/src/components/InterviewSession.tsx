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

// サンプル質問データ
const SAMPLE_QUESTIONS: Question[] = [
  {
    id: 'q1',
    order: 1,
    text: 'こんにちは。本日は面接にお越しいただきありがとうございます。まず、自己紹介をお願いできますか？',
    expectedDurationSeconds: 60,
    evaluationCriteria: ['明瞭さ', '構成', '敬語'],
  },
  {
    id: 'q2',
    order: 2,
    text: 'ありがとうございます。それでは、あなたの強みを教えてください。',
    expectedDurationSeconds: 60,
    evaluationCriteria: ['具体性', '自己分析', '表現力'],
  },
  {
    id: 'q3',
    order: 3,
    text: '前職ではどのような業務を担当されていましたか？',
    expectedDurationSeconds: 90,
    evaluationCriteria: ['説明力', '経験の具体性', '敬語'],
  },
  {
    id: 'q4',
    order: 4,
    text: 'チームで働く際に大切にしていることは何ですか？',
    expectedDurationSeconds: 60,
    evaluationCriteria: ['協調性', '具体例', '論理性'],
  },
  {
    id: 'q5',
    order: 5,
    text: '弊社を志望された理由をお聞かせください。',
    expectedDurationSeconds: 90,
    evaluationCriteria: ['志望動機', '企業理解', '熱意'],
  },
  {
    id: 'q6',
    order: 6,
    text: 'これまでに困難を乗り越えた経験を教えてください。',
    expectedDurationSeconds: 90,
    evaluationCriteria: ['問題解決力', 'STAR法', '成長'],
  },
  {
    id: 'q7',
    order: 7,
    text: '5年後のキャリアプランをお聞かせください。',
    expectedDurationSeconds: 60,
    evaluationCriteria: ['目標設定', '現実性', '意欲'],
  },
  {
    id: 'q8',
    order: 8,
    text: '日本で働きたいと思った理由は何ですか？',
    expectedDurationSeconds: 60,
    evaluationCriteria: ['動機', '文化理解', '適応力'],
  },
  {
    id: 'q9',
    order: 9,
    text: 'ストレスを感じた時、どのように対処しますか？',
    expectedDurationSeconds: 60,
    evaluationCriteria: ['自己管理', '具体例', '成熟度'],
  },
  {
    id: 'q10',
    order: 10,
    text: '最後に、何かご質問はありますか？',
    expectedDurationSeconds: 60,
    evaluationCriteria: ['逆質問', '関心度', '敬語'],
  },
];

interface InterviewSessionProps {
  /** JLPTレベル */
  jlptLevel?: JLPTLevel;
  /** セッション完了時のコールバック */
  onComplete?: (evaluation: EvaluationResult) => void;
}

export default function InterviewSession({
  jlptLevel = 'N3',
  onComplete,
}: InterviewSessionProps) {
  const avatarRef = useRef<InterviewHeyGenAvatarRef>(null);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const stateMachine = useInterviewStateMachine();

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
    stateMachine.initialize();
    addLog('HeyGenアバターに接続中...');

    if (avatarRef.current) {
      await avatarRef.current.connect();
    }
  }, [stateMachine, addLog]);

  // アバター接続完了
  const handleConnected = useCallback(
    (sessionId: string) => {
      stateMachine.connected(sessionId);
      addLog(`接続完了: ${sessionId}`);
    },
    [stateMachine, addLog]
  );

  // 面接開始
  const handleStartInterview = useCallback(async () => {
    addLog('面接を開始します');
    stateMachine.startInterview(SAMPLE_QUESTIONS);

    // 最初の質問を発話
    if (avatarRef.current && SAMPLE_QUESTIONS[0]) {
      await avatarRef.current.speakQuestion(SAMPLE_QUESTIONS[0]);
    }
  }, [stateMachine, addLog]);

  // アバター発話開始
  const handleSpeakStart = useCallback(() => {
    stateMachine.avatarStartSpeaking();
    addLog('アバター発話開始');
  }, [stateMachine, addLog]);

  // アバター発話終了
  const handleSpeakEnd = useCallback(() => {
    stateMachine.avatarStopSpeaking();
    addLog('アバター発話終了 → 録音待機');
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

        if (nextIndex >= SAMPLE_QUESTIONS.length) {
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
          const nextQuestion = SAMPLE_QUESTIONS[nextIndex];
          addLog(`次の質問: Q${nextIndex + 1}`);

          if (avatarRef.current && nextQuestion) {
            await avatarRef.current.speakQuestion(nextQuestion);
          }
        }
      }, 500);
    },
    [stateMachine, jlptLevel, addLog, onComplete]
  );

  // スキップ
  const handleSkip = useCallback(async () => {
    addLog('質問をスキップしました');
    stateMachine.skipQuestion();

    setTimeout(async () => {
      const nextIndex = stateMachine.currentQuestionIndex + 1;

      if (nextIndex >= SAMPLE_QUESTIONS.length) {
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
        const nextQuestion = SAMPLE_QUESTIONS[nextIndex];

        if (avatarRef.current && nextQuestion) {
          await avatarRef.current.speakQuestion(nextQuestion);
        }
      }
    }, 500);
  }, [stateMachine, jlptLevel, addLog, onComplete]);

  // エラーハンドリング
  const handleError = useCallback(
    (error: string) => {
      stateMachine.setError(error);
      addLog(`エラー: ${error}`);
    },
    [stateMachine, addLog]
  );

  // リトライ
  const handleRetry = useCallback(() => {
    setEvaluation(null);
    stateMachine.reset();
  }, [stateMachine]);

  // 評価完了画面
  if (evaluation) {
    return (
      <FeedbackDisplay
        evaluation={evaluation}
        onRetry={handleRetry}
        onClose={() => setEvaluation(null)}
      />
    );
  }

  return (
    <div className="interview-session">
      {/* ヘッダー */}
      <div className="session-header">
        <h2>AI面接練習</h2>
        <span className="jlpt-badge">JLPT {jlptLevel}</span>
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

      {/* 状態説明 */}
      <div className="state-description">
        {getStateDescription(stateMachine.state)}
      </div>

      {/* メインコンテンツ */}
      <div className="main-content">
        {/* アバター */}
        <div className="avatar-section">
          <InterviewHeyGenAvatar
            ref={avatarRef}
            onSpeakStart={handleSpeakStart}
            onSpeakEnd={handleSpeakEnd}
            onConnected={handleConnected}
            onError={handleError}
          />

          {/* 接続ボタン */}
          {stateMachine.state === 'initializing' && (
            <button className="btn-connect" onClick={handleConnect}>
              アバターに接続
            </button>
          )}

          {/* 開始ボタン */}
          {stateMachine.isReady && (
            <button className="btn-start" onClick={handleStartInterview}>
              面接を開始
            </button>
          )}
        </div>

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
              autoStopSeconds={5}
              onRecordingComplete={handleRecordingComplete}
              onSkip={handleSkip}
            />
          </div>
        )}
      </div>

      {/* ログ表示 */}
      <div className="log-section">
        <div className="log-header">ログ</div>
        <div className="log-list">
          {logs.length === 0 ? (
            <div className="log-empty">ログはまだありません</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="log-item">
                {log}
              </div>
            ))
          )}
        </div>
      </div>

      <style jsx>{`
        .interview-session {
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 24px;
          max-width: 800px;
          margin: 0 auto;
        }

        .session-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .session-header h2 {
          margin: 0;
          font-size: 24px;
          color: #fff;
        }

        .jlpt-badge {
          padding: 4px 12px;
          background: #3b82f6;
          color: white;
          border-radius: 16px;
          font-size: 14px;
          font-weight: 600;
        }

        .progress-section {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .progress-bar {
          flex: 1;
          height: 8px;
          background: #333;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: #3b82f6;
          transition: width 0.3s ease;
        }

        .progress-text {
          font-size: 14px;
          color: #888;
          min-width: 60px;
          text-align: right;
        }

        .state-description {
          text-align: center;
          color: #9ca3af;
          font-size: 16px;
          padding: 12px;
          background: #1a1a2e;
          border-radius: 8px;
        }

        .main-content {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .avatar-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .btn-connect,
        .btn-start {
          padding: 12px 32px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-connect {
          background: #6b7280;
          color: white;
        }

        .btn-connect:hover {
          background: #4b5563;
        }

        .btn-start {
          background: #22c55e;
          color: white;
        }

        .btn-start:hover {
          background: #16a34a;
        }

        .question-section {
          padding: 20px;
          background: #1a1a2e;
          border-radius: 12px;
          border-left: 4px solid #3b82f6;
        }

        .question-label {
          font-size: 12px;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 8px;
        }

        .question-text {
          font-size: 18px;
          color: #fff;
          line-height: 1.6;
          margin: 0;
        }

        .recorder-section {
          padding: 20px;
          background: #0f0f1a;
          border-radius: 12px;
        }

        .log-section {
          background: #111;
          border-radius: 8px;
          overflow: hidden;
        }

        .log-header {
          padding: 12px 16px;
          font-size: 14px;
          color: #888;
          background: #0a0a0a;
        }

        .log-list {
          max-height: 120px;
          overflow-y: auto;
          padding: 8px 16px;
          font-family: monospace;
          font-size: 12px;
        }

        .log-item {
          padding: 4px 0;
          color: #666;
        }

        .log-empty {
          color: #444;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
