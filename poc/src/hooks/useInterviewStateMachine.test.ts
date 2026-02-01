import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInterviewStateMachine } from './useInterviewStateMachine';
import type { Question, Answer } from '@/types/interview';

describe('useInterviewStateMachine', () => {
  const mockQuestions: Question[] = [
    {
      id: 'q1',
      order: 1,
      text: '自己紹介をしてください',
      expectedDurationSeconds: 60,
      evaluationCriteria: ['明瞭さ'],
    },
    {
      id: 'q2',
      order: 2,
      text: '強みを教えてください',
      expectedDurationSeconds: 60,
      evaluationCriteria: ['具体性'],
    },
  ];

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useInterviewStateMachine());

    expect(result.current.state).toBe('initializing');
    expect(result.current.currentQuestionIndex).toBe(0);
    expect(result.current.answers).toHaveLength(0);
    expect(result.current.heygenSessionId).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should transition to ready state on connected', () => {
    const { result } = renderHook(() => useInterviewStateMachine());

    act(() => {
      result.current.connected('session-123');
    });

    expect(result.current.state).toBe('ready');
    expect(result.current.heygenSessionId).toBe('session-123');
    expect(result.current.isReady).toBe(true);
  });

  it('should start interview with questions', () => {
    const { result } = renderHook(() => useInterviewStateMachine());

    act(() => {
      result.current.connected('session-123');
    });

    act(() => {
      result.current.startInterview(mockQuestions);
    });

    expect(result.current.state).toBe('avatar_speaking');
    expect(result.current.totalQuestions).toBe(2);
    expect(result.current.currentQuestion?.id).toBe('q1');
  });

  it('should transition through avatar speaking to listening', () => {
    const { result } = renderHook(() => useInterviewStateMachine());

    act(() => {
      result.current.connected('session-123');
    });

    act(() => {
      result.current.startInterview(mockQuestions);
    });

    expect(result.current.isAvatarSpeaking).toBe(true);

    act(() => {
      result.current.avatarStopSpeaking();
    });

    expect(result.current.state).toBe('listening');
    expect(result.current.isListening).toBe(true);
  });

  it('should submit answer and move to processing', () => {
    const { result } = renderHook(() => useInterviewStateMachine());

    act(() => {
      result.current.connected('session-123');
      result.current.startInterview(mockQuestions);
      result.current.avatarStopSpeaking();
    });

    const answer: Answer = {
      questionId: 'q1',
      questionOrder: 1,
      audioUrl: 'http://example.com/audio.webm',
      transcript: '私の名前は田中です',
      answeredAt: new Date(),
      skipped: false,
    };

    act(() => {
      result.current.submitAnswer(answer);
    });

    expect(result.current.state).toBe('processing');
    expect(result.current.answers).toHaveLength(1);
    expect(result.current.answers[0].transcript).toBe('私の名前は田中です');
  });

  it('should move to next question', () => {
    const { result } = renderHook(() => useInterviewStateMachine());

    act(() => {
      result.current.connected('session-123');
      result.current.startInterview(mockQuestions);
      result.current.avatarStopSpeaking();
    });

    const answer: Answer = {
      questionId: 'q1',
      questionOrder: 1,
      audioUrl: null,
      transcript: 'Test answer',
      answeredAt: new Date(),
      skipped: false,
    };

    act(() => {
      result.current.submitAnswer(answer);
    });

    act(() => {
      result.current.nextQuestion();
    });

    expect(result.current.state).toBe('avatar_speaking');
    expect(result.current.currentQuestionIndex).toBe(1);
    expect(result.current.currentQuestion?.id).toBe('q2');
  });

  it('should complete session after last question', () => {
    const { result } = renderHook(() => useInterviewStateMachine());

    act(() => {
      result.current.connected('session-123');
      result.current.startInterview(mockQuestions);
    });

    // First question
    act(() => {
      result.current.avatarStopSpeaking();
      result.current.submitAnswer({
        questionId: 'q1',
        questionOrder: 1,
        audioUrl: null,
        transcript: 'Answer 1',
        answeredAt: new Date(),
        skipped: false,
      });
      result.current.nextQuestion();
    });

    // Second question (last)
    act(() => {
      result.current.avatarStopSpeaking();
      result.current.submitAnswer({
        questionId: 'q2',
        questionOrder: 2,
        audioUrl: null,
        transcript: 'Answer 2',
        answeredAt: new Date(),
        skipped: false,
      });
      result.current.nextQuestion();
    });

    expect(result.current.state).toBe('completed');
    expect(result.current.isCompleted).toBe(true);
    expect(result.current.answers).toHaveLength(2);
  });

  it('should handle skip question', () => {
    const { result } = renderHook(() => useInterviewStateMachine());

    act(() => {
      result.current.connected('session-123');
      result.current.startInterview(mockQuestions);
      result.current.avatarStopSpeaking();
    });

    act(() => {
      result.current.skipQuestion();
    });

    expect(result.current.state).toBe('processing');
    expect(result.current.answers).toHaveLength(1);
    expect(result.current.answers[0].skipped).toBe(true);
    expect(result.current.answers[0].transcript).toBe('');
  });

  it('should handle error state', () => {
    const { result } = renderHook(() => useInterviewStateMachine());

    act(() => {
      result.current.setError('Connection failed');
    });

    expect(result.current.state).toBe('error');
    expect(result.current.error).toBe('Connection failed');
    expect(result.current.isError).toBe(true);
  });

  it('should clear error and return to ready', () => {
    const { result } = renderHook(() => useInterviewStateMachine());

    act(() => {
      result.current.connected('session-123');
      result.current.setError('Some error');
    });

    act(() => {
      result.current.clearError();
    });

    expect(result.current.state).toBe('ready');
    expect(result.current.error).toBeNull();
  });

  it('should reset to initial state', () => {
    const { result } = renderHook(() => useInterviewStateMachine());

    act(() => {
      result.current.connected('session-123');
      result.current.startInterview(mockQuestions);
      result.current.avatarStopSpeaking();
      result.current.submitAnswer({
        questionId: 'q1',
        questionOrder: 1,
        audioUrl: null,
        transcript: 'Test',
        answeredAt: new Date(),
        skipped: false,
      });
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.state).toBe('initializing');
    expect(result.current.answers).toHaveLength(0);
    expect(result.current.currentQuestionIndex).toBe(0);
    expect(result.current.heygenSessionId).toBeNull();
  });

  it('should calculate progress correctly', () => {
    const { result } = renderHook(() => useInterviewStateMachine());

    act(() => {
      result.current.connected('session-123');
      result.current.startInterview(mockQuestions);
    });

    expect(result.current.progress).toBe(0);

    act(() => {
      result.current.avatarStopSpeaking();
      result.current.submitAnswer({
        questionId: 'q1',
        questionOrder: 1,
        audioUrl: null,
        transcript: 'Test',
        answeredAt: new Date(),
        skipped: false,
      });
      result.current.nextQuestion();
    });

    expect(result.current.progress).toBe(50);
  });
});
