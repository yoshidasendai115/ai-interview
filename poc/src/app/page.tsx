'use client';

import { useCallback } from 'react';
import InterviewSession from '@/components/InterviewSession';
import { MetricsProvider } from '@/context/MetricsContext';
import { useAdaptiveLevel } from '@/hooks/useAdaptiveLevel';
import type { JLPTLevel, EvaluationResult } from '@/types/interview';

export default function Home() {
  const adaptiveLevel = useAdaptiveLevel('N3');

  /**
   * セッション完了時の処理
   * 評価スコアに基づいてレベルを自動調整
   */
  const handleComplete = useCallback(
    (evaluation: EvaluationResult) => {
      // セッション結果を記録（レベル調整は内部で自動計算）
      adaptiveLevel.recordSession(evaluation.totalScore);
    },
    [adaptiveLevel]
  );

  /**
   * 次のレベルで挑戦する
   */
  const handleNextLevel = useCallback(
    (level: JLPTLevel) => {
      adaptiveLevel.setLevel(level);
    },
    [adaptiveLevel]
  );

  /**
   * チャレンジ枠を開始する
   */
  const handleStartChallenge = useCallback(() => {
    adaptiveLevel.startChallengeMode();
  }, [adaptiveLevel]);

  return (
    <MetricsProvider>
      <InterviewSession
        jlptLevel={adaptiveLevel.currentLevel}
        onComplete={handleComplete}
        onNextLevel={handleNextLevel}
        canChallenge={adaptiveLevel.canChallenge}
        challengeLevel={adaptiveLevel.challengeLevel}
        isChallengeMode={adaptiveLevel.isChallengeMode}
        onStartChallenge={handleStartChallenge}
        levelStats={adaptiveLevel.currentLevelStats}
        remainingChallenges={adaptiveLevel.remainingChallenges}
        dailyChallengeLimit={adaptiveLevel.dailyChallengeLimit}
      />
    </MetricsProvider>
  );
}
