/**
 * フォローアップ質問管理ユーティリティ
 * 設計書: 13_面接シナリオ設計.md 13.3.3節
 * JLPTレベルに応じたフォローアップ深度制御を実装
 */

import type { JLPTLevel } from '@/types/interview';
import { JLPT_SETTINGS } from '@/types/interview';

/**
 * 質問バンクの質問構造（フォローアップ関連のみ抜粋）
 */
export interface QuestionWithFollowUps {
  id: string;
  follow_ups?: string[];
}

/**
 * フォローアップ状態を管理するインターフェース
 */
export interface FollowUpState {
  questionId: string;
  currentDepth: number;
  maxDepth: number;
  usedFollowUps: string[];
}

/**
 * JLPTレベルに応じたフォローアップの最大深度を取得
 * @param jlptLevel JLPTレベル
 * @returns フォローアップの最大回数
 */
export function getMaxFollowUpDepth(jlptLevel: JLPTLevel): number {
  return JLPT_SETTINGS[jlptLevel].followUpDepth;
}

/**
 * フォローアップ可能かどうかを判定
 * @param state 現在のフォローアップ状態
 * @returns フォローアップ可能な場合true
 */
export function canAskFollowUp(state: FollowUpState): boolean {
  return state.currentDepth < state.maxDepth;
}

/**
 * 質問に対するフォローアップをJLPTレベルに応じて制限して取得
 * @param question 質問オブジェクト
 * @param jlptLevel JLPTレベル
 * @returns 制限されたフォローアップ質問の配列
 */
export function getLimitedFollowUps(
  question: QuestionWithFollowUps,
  jlptLevel: JLPTLevel
): string[] {
  const followUps = question.follow_ups ?? [];
  const maxDepth = getMaxFollowUpDepth(jlptLevel);

  // フォローアップ深度に応じて配列を制限
  return followUps.slice(0, maxDepth);
}

/**
 * 次のフォローアップ質問を取得
 * @param question 元の質問
 * @param state 現在のフォローアップ状態
 * @returns 次のフォローアップ質問（ない場合はnull）
 */
export function getNextFollowUp(
  question: QuestionWithFollowUps,
  state: FollowUpState
): string | null {
  if (!canAskFollowUp(state)) {
    return null;
  }

  const followUps = question.follow_ups ?? [];
  const nextFollowUp = followUps[state.currentDepth];

  if (!nextFollowUp || state.usedFollowUps.includes(nextFollowUp)) {
    return null;
  }

  return nextFollowUp;
}

/**
 * フォローアップ状態を初期化
 * @param questionId 質問ID
 * @param jlptLevel JLPTレベル
 * @returns 初期化されたフォローアップ状態
 */
export function initFollowUpState(
  questionId: string,
  jlptLevel: JLPTLevel
): FollowUpState {
  return {
    questionId,
    currentDepth: 0,
    maxDepth: getMaxFollowUpDepth(jlptLevel),
    usedFollowUps: [],
  };
}

/**
 * フォローアップ使用後に状態を更新
 * @param state 現在の状態
 * @param usedFollowUp 使用したフォローアップ質問
 * @returns 更新された状態
 */
export function updateFollowUpState(
  state: FollowUpState,
  usedFollowUp: string
): FollowUpState {
  return {
    ...state,
    currentDepth: state.currentDepth + 1,
    usedFollowUps: [...state.usedFollowUps, usedFollowUp],
  };
}

/**
 * フォローアップ管理クラス
 * セッション全体でフォローアップ状態を管理
 */
export class FollowUpManager {
  private states: Map<string, FollowUpState> = new Map();
  private jlptLevel: JLPTLevel;

  constructor(jlptLevel: JLPTLevel) {
    this.jlptLevel = jlptLevel;
  }

  /**
   * 質問に対するフォローアップ状態を取得（なければ初期化）
   */
  getState(questionId: string): FollowUpState {
    const existing = this.states.get(questionId);
    if (existing) {
      return existing;
    }

    const newState = initFollowUpState(questionId, this.jlptLevel);
    this.states.set(questionId, newState);
    return newState;
  }

  /**
   * 次のフォローアップを取得して状態を更新
   */
  useNextFollowUp(question: QuestionWithFollowUps): string | null {
    const state = this.getState(question.id);
    const nextFollowUp = getNextFollowUp(question, state);

    if (nextFollowUp) {
      const updatedState = updateFollowUpState(state, nextFollowUp);
      this.states.set(question.id, updatedState);
    }

    return nextFollowUp;
  }

  /**
   * フォローアップ可能かどうかを判定
   */
  canFollowUp(questionId: string): boolean {
    const state = this.getState(questionId);
    return canAskFollowUp(state);
  }

  /**
   * 残りのフォローアップ回数を取得
   */
  getRemainingFollowUps(questionId: string): number {
    const state = this.getState(questionId);
    return Math.max(0, state.maxDepth - state.currentDepth);
  }

  /**
   * 状態をリセット
   */
  reset(): void {
    this.states.clear();
  }

  /**
   * JLPTレベルを変更（状態もリセット）
   */
  setJlptLevel(level: JLPTLevel): void {
    this.jlptLevel = level;
    this.reset();
  }
}
