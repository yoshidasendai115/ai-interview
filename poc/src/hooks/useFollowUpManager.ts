/**
 * フォローアップ管理カスタムフック
 * JLPTレベルに応じたフォローアップ深度制御を提供
 */

import { useRef, useCallback, useMemo } from 'react';
import type { JLPTLevel } from '@/types/interview';
import { JLPT_SETTINGS } from '@/types/interview';
import {
  FollowUpManager,
  type QuestionWithFollowUps,
  getMaxFollowUpDepth,
  getLimitedFollowUps,
} from '@/utils/followUpManager';

interface UseFollowUpManagerResult {
  /** 次のフォローアップ質問を取得して状態を更新 */
  useNextFollowUp: (question: QuestionWithFollowUps) => string | null;
  /** フォローアップ可能かどうかを判定 */
  canFollowUp: (questionId: string) => boolean;
  /** 残りのフォローアップ回数を取得 */
  getRemainingFollowUps: (questionId: string) => number;
  /** 質問に対する制限されたフォローアップリストを取得 */
  getLimitedFollowUpsForQuestion: (question: QuestionWithFollowUps) => string[];
  /** 状態をリセット */
  reset: () => void;
  /** 現在のJLPTレベルの最大フォローアップ深度 */
  maxFollowUpDepth: number;
  /** 簡易版質問を使用すべきか */
  useSimplified: boolean;
}

/**
 * フォローアップ管理カスタムフック
 * @param jlptLevel JLPTレベル
 * @returns フォローアップ管理機能
 */
export function useFollowUpManager(jlptLevel: JLPTLevel): UseFollowUpManagerResult {
  const managerRef = useRef<FollowUpManager>(new FollowUpManager(jlptLevel));

  // JLPTレベルが変更されたらマネージャーを更新
  if (managerRef.current) {
    managerRef.current.setJlptLevel(jlptLevel);
  }

  const useNextFollowUp = useCallback(
    (question: QuestionWithFollowUps): string | null => {
      return managerRef.current.useNextFollowUp(question);
    },
    []
  );

  const canFollowUp = useCallback((questionId: string): boolean => {
    return managerRef.current.canFollowUp(questionId);
  }, []);

  const getRemainingFollowUps = useCallback((questionId: string): number => {
    return managerRef.current.getRemainingFollowUps(questionId);
  }, []);

  const getLimitedFollowUpsForQuestion = useCallback(
    (question: QuestionWithFollowUps): string[] => {
      return getLimitedFollowUps(question, jlptLevel);
    },
    [jlptLevel]
  );

  const reset = useCallback(() => {
    managerRef.current.reset();
  }, []);

  const maxFollowUpDepth = useMemo(() => getMaxFollowUpDepth(jlptLevel), [jlptLevel]);
  const useSimplified = useMemo(() => JLPT_SETTINGS[jlptLevel].useSimplified, [jlptLevel]);

  return {
    useNextFollowUp,
    canFollowUp,
    getRemainingFollowUps,
    getLimitedFollowUpsForQuestion,
    reset,
    maxFollowUpDepth,
    useSimplified,
  };
}
