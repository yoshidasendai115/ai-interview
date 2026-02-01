'use client';

import { useReducer, useCallback, useMemo } from 'react';
import type {
  InterviewState,
  Answer,
  Question,
  SessionContext,
} from '@/types/interview';

// ============================================
// Actions
// ============================================

type InterviewAction =
  | { type: 'INITIALIZE' }
  | { type: 'CONNECTED'; heygenSessionId: string }
  | { type: 'START_INTERVIEW'; questions: Question[] }
  | { type: 'AVATAR_START_SPEAKING' }
  | { type: 'AVATAR_STOP_SPEAKING' }
  | { type: 'START_LISTENING' }
  | { type: 'SUBMIT_ANSWER'; answer: Answer }
  | { type: 'SKIP_QUESTION' }
  | { type: 'PROCESS_ANSWER' }
  | { type: 'NEXT_QUESTION' }
  | { type: 'COMPLETE_SESSION' }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET' };

// ============================================
// State
// ============================================

interface InterviewStateMachineState {
  state: InterviewState;
  currentQuestionIndex: number;
  questions: Question[];
  answers: Answer[];
  heygenSessionId: string | null;
  error: string | null;
}

const initialState: InterviewStateMachineState = {
  state: 'initializing',
  currentQuestionIndex: 0,
  questions: [],
  answers: [],
  heygenSessionId: null,
  error: null,
};

// ============================================
// Reducer
// ============================================

function interviewReducer(
  state: InterviewStateMachineState,
  action: InterviewAction
): InterviewStateMachineState {
  switch (action.type) {
    case 'INITIALIZE':
      return {
        ...initialState,
        state: 'initializing',
      };

    case 'CONNECTED':
      return {
        ...state,
        state: 'ready',
        heygenSessionId: action.heygenSessionId,
        error: null,
      };

    case 'START_INTERVIEW':
      return {
        ...state,
        state: 'avatar_speaking',
        questions: action.questions,
        currentQuestionIndex: 0,
      };

    case 'AVATAR_START_SPEAKING':
      if (state.state === 'ready' || state.state === 'processing') {
        return {
          ...state,
          state: 'avatar_speaking',
        };
      }
      return state;

    case 'AVATAR_STOP_SPEAKING':
      if (state.state === 'avatar_speaking') {
        return {
          ...state,
          state: 'listening',
        };
      }
      return state;

    case 'START_LISTENING':
      return {
        ...state,
        state: 'listening',
      };

    case 'SUBMIT_ANSWER':
      return {
        ...state,
        state: 'processing',
        answers: [...state.answers, action.answer],
      };

    case 'SKIP_QUESTION': {
      const currentQuestion = state.questions[state.currentQuestionIndex];
      if (!currentQuestion) return state;

      const skippedAnswer: Answer = {
        questionId: currentQuestion.id,
        questionOrder: state.currentQuestionIndex + 1,
        audioUrl: null,
        transcript: '',
        answeredAt: new Date(),
        skipped: true,
      };
      return {
        ...state,
        state: 'processing',
        answers: [...state.answers, skippedAnswer],
      };
    }

    case 'PROCESS_ANSWER':
      return {
        ...state,
        state: 'processing',
      };

    case 'NEXT_QUESTION': {
      const nextIndex = state.currentQuestionIndex + 1;
      const isLastQuestion = nextIndex >= state.questions.length;

      if (isLastQuestion) {
        return {
          ...state,
          state: 'completed',
          currentQuestionIndex: nextIndex,
        };
      }

      return {
        ...state,
        state: 'avatar_speaking',
        currentQuestionIndex: nextIndex,
      };
    }

    case 'COMPLETE_SESSION':
      return {
        ...state,
        state: 'completed',
      };

    case 'SET_ERROR':
      return {
        ...state,
        state: 'error',
        error: action.error,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        state: 'ready',
        error: null,
      };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

// ============================================
// Hook
// ============================================

export interface UseInterviewStateMachineReturn {
  // State
  state: InterviewState;
  currentQuestionIndex: number;
  totalQuestions: number;
  currentQuestion: Question | null;
  answers: Answer[];
  heygenSessionId: string | null;
  error: string | null;

  // Computed
  isInitializing: boolean;
  isReady: boolean;
  isAvatarSpeaking: boolean;
  isListening: boolean;
  isProcessing: boolean;
  isCompleted: boolean;
  isError: boolean;
  progress: number;

  // Actions
  initialize: () => void;
  connected: (heygenSessionId: string) => void;
  startInterview: (questions: Question[]) => void;
  avatarStartSpeaking: () => void;
  avatarStopSpeaking: () => void;
  startListening: () => void;
  submitAnswer: (answer: Answer) => void;
  skipQuestion: () => void;
  nextQuestion: () => void;
  completeSession: () => void;
  setError: (error: string) => void;
  clearError: () => void;
  reset: () => void;

  // Context for components
  context: SessionContext;
}

export function useInterviewStateMachine(): UseInterviewStateMachineReturn {
  const [machineState, dispatch] = useReducer(interviewReducer, initialState);

  // Actions
  const initialize = useCallback(() => dispatch({ type: 'INITIALIZE' }), []);
  const connected = useCallback(
    (heygenSessionId: string) => dispatch({ type: 'CONNECTED', heygenSessionId }),
    []
  );
  const startInterview = useCallback(
    (questions: Question[]) => dispatch({ type: 'START_INTERVIEW', questions }),
    []
  );
  const avatarStartSpeaking = useCallback(() => dispatch({ type: 'AVATAR_START_SPEAKING' }), []);
  const avatarStopSpeaking = useCallback(() => dispatch({ type: 'AVATAR_STOP_SPEAKING' }), []);
  const startListening = useCallback(() => dispatch({ type: 'START_LISTENING' }), []);
  const submitAnswer = useCallback(
    (answer: Answer) => dispatch({ type: 'SUBMIT_ANSWER', answer }),
    []
  );
  const skipQuestion = useCallback(() => dispatch({ type: 'SKIP_QUESTION' }), []);
  const nextQuestion = useCallback(() => dispatch({ type: 'NEXT_QUESTION' }), []);
  const completeSession = useCallback(() => dispatch({ type: 'COMPLETE_SESSION' }), []);
  const setError = useCallback((error: string) => dispatch({ type: 'SET_ERROR', error }), []);
  const clearError = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), []);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  // Computed values
  const totalQuestions = machineState.questions.length;
  const currentQuestion = machineState.questions[machineState.currentQuestionIndex] ?? null;
  const progress = totalQuestions > 0
    ? Math.round((machineState.currentQuestionIndex / totalQuestions) * 100)
    : 0;

  const context: SessionContext = useMemo(() => ({
    state: machineState.state,
    currentQuestion: machineState.currentQuestionIndex + 1,
    totalQuestions,
    answers: machineState.answers,
    heygenSessionId: machineState.heygenSessionId,
    error: machineState.error,
  }), [machineState, totalQuestions]);

  return {
    // State
    state: machineState.state,
    currentQuestionIndex: machineState.currentQuestionIndex,
    totalQuestions,
    currentQuestion,
    answers: machineState.answers,
    heygenSessionId: machineState.heygenSessionId,
    error: machineState.error,

    // Computed
    isInitializing: machineState.state === 'initializing',
    isReady: machineState.state === 'ready',
    isAvatarSpeaking: machineState.state === 'avatar_speaking',
    isListening: machineState.state === 'listening',
    isProcessing: machineState.state === 'processing',
    isCompleted: machineState.state === 'completed',
    isError: machineState.state === 'error',
    progress,

    // Actions
    initialize,
    connected,
    startInterview,
    avatarStartSpeaking,
    avatarStopSpeaking,
    startListening,
    submitAnswer,
    skipQuestion,
    nextQuestion,
    completeSession,
    setError,
    clearError,
    reset,

    // Context
    context,
  };
}
