import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFollowUpManager } from './useFollowUpManager';
import type { QuestionWithFollowUps } from '@/utils/followUpManager';

describe('useFollowUpManager', () => {
  const question: QuestionWithFollowUps = {
    id: 'Q06',
    follow_ups: [
      '日本の何に魅力を感じましたか？',
      '来日前はどんな準備をしましたか？',
      '日本での生活で驚いたことはありますか？',
    ],
  };

  it('should return correct maxFollowUpDepth for N3', () => {
    const { result } = renderHook(() => useFollowUpManager('N3'));
    expect(result.current.maxFollowUpDepth).toBe(2);
  });

  it('should return correct maxFollowUpDepth for N5', () => {
    const { result } = renderHook(() => useFollowUpManager('N5'));
    expect(result.current.maxFollowUpDepth).toBe(1);
  });

  it('should return useSimplified true for N4-N5', () => {
    const { result: n4Result } = renderHook(() => useFollowUpManager('N4'));
    const { result: n5Result } = renderHook(() => useFollowUpManager('N5'));

    expect(n4Result.current.useSimplified).toBe(true);
    expect(n5Result.current.useSimplified).toBe(true);
  });

  it('should return useSimplified false for N1-N3', () => {
    const { result: n1Result } = renderHook(() => useFollowUpManager('N1'));
    const { result: n2Result } = renderHook(() => useFollowUpManager('N2'));
    const { result: n3Result } = renderHook(() => useFollowUpManager('N3'));

    expect(n1Result.current.useSimplified).toBe(false);
    expect(n2Result.current.useSimplified).toBe(false);
    expect(n3Result.current.useSimplified).toBe(false);
  });

  it('should limit follow ups for N5 to 1', () => {
    const { result } = renderHook(() => useFollowUpManager('N5'));
    const limited = result.current.getLimitedFollowUpsForQuestion(question);

    expect(limited).toHaveLength(1);
    expect(limited[0]).toBe('日本の何に魅力を感じましたか？');
  });

  it('should use follow ups and track state', () => {
    const { result } = renderHook(() => useFollowUpManager('N3'));

    // Initially can follow up
    expect(result.current.canFollowUp('Q06')).toBe(true);
    expect(result.current.getRemainingFollowUps('Q06')).toBe(2);

    // Use first follow up
    let followUp: string | null = null;
    act(() => {
      followUp = result.current.useNextFollowUp(question);
    });
    expect(followUp).toBe('日本の何に魅力を感じましたか？');

    // Check remaining
    expect(result.current.getRemainingFollowUps('Q06')).toBe(1);
    expect(result.current.canFollowUp('Q06')).toBe(true);

    // Use second follow up
    act(() => {
      followUp = result.current.useNextFollowUp(question);
    });
    expect(followUp).toBe('来日前はどんな準備をしましたか？');

    // No more follow ups for N3
    expect(result.current.getRemainingFollowUps('Q06')).toBe(0);
    expect(result.current.canFollowUp('Q06')).toBe(false);

    // Should return null now
    act(() => {
      followUp = result.current.useNextFollowUp(question);
    });
    expect(followUp).toBeNull();
  });

  it('should reset state', () => {
    const { result } = renderHook(() => useFollowUpManager('N3'));

    // Use a follow up
    act(() => {
      result.current.useNextFollowUp(question);
    });
    expect(result.current.getRemainingFollowUps('Q06')).toBe(1);

    // Reset
    act(() => {
      result.current.reset();
    });

    // Should be back to initial state
    expect(result.current.getRemainingFollowUps('Q06')).toBe(2);
  });
});
