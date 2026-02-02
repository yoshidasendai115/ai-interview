import { describe, it, expect, beforeEach } from 'vitest';
import {
  getMaxFollowUpDepth,
  canAskFollowUp,
  getLimitedFollowUps,
  getNextFollowUp,
  initFollowUpState,
  updateFollowUpState,
  FollowUpManager,
  type QuestionWithFollowUps,
} from './followUpManager';

describe('followUpManager', () => {
  describe('getMaxFollowUpDepth', () => {
    it('should return 3 for N1', () => {
      expect(getMaxFollowUpDepth('N1')).toBe(3);
    });

    it('should return 2 for N2', () => {
      expect(getMaxFollowUpDepth('N2')).toBe(2);
    });

    it('should return 2 for N3', () => {
      expect(getMaxFollowUpDepth('N3')).toBe(2);
    });

    it('should return 1 for N4', () => {
      expect(getMaxFollowUpDepth('N4')).toBe(1);
    });

    it('should return 1 for N5', () => {
      expect(getMaxFollowUpDepth('N5')).toBe(1);
    });
  });

  describe('canAskFollowUp', () => {
    it('should return true when currentDepth < maxDepth', () => {
      const state = {
        questionId: 'Q01',
        currentDepth: 0,
        maxDepth: 2,
        usedFollowUps: [],
      };
      expect(canAskFollowUp(state)).toBe(true);
    });

    it('should return false when currentDepth >= maxDepth', () => {
      const state = {
        questionId: 'Q01',
        currentDepth: 2,
        maxDepth: 2,
        usedFollowUps: [],
      };
      expect(canAskFollowUp(state)).toBe(false);
    });
  });

  describe('getLimitedFollowUps', () => {
    const question: QuestionWithFollowUps = {
      id: 'Q06',
      follow_ups: [
        '日本の何に魅力を感じましたか？',
        '来日前はどんな準備をしましたか？',
        '日本での生活で驚いたことはありますか？',
      ],
    };

    it('should limit follow_ups to maxDepth for N5 (1)', () => {
      const limited = getLimitedFollowUps(question, 'N5');
      expect(limited).toHaveLength(1);
      expect(limited[0]).toBe('日本の何に魅力を感じましたか？');
    });

    it('should limit follow_ups to maxDepth for N3 (2)', () => {
      const limited = getLimitedFollowUps(question, 'N3');
      expect(limited).toHaveLength(2);
    });

    it('should limit follow_ups to maxDepth for N1 (3)', () => {
      const limited = getLimitedFollowUps(question, 'N1');
      expect(limited).toHaveLength(3);
    });

    it('should handle questions without follow_ups', () => {
      const questionNoFollowUps: QuestionWithFollowUps = { id: 'Q01' };
      const limited = getLimitedFollowUps(questionNoFollowUps, 'N1');
      expect(limited).toHaveLength(0);
    });
  });

  describe('getNextFollowUp', () => {
    const question: QuestionWithFollowUps = {
      id: 'Q06',
      follow_ups: ['Follow up 1', 'Follow up 2', 'Follow up 3'],
    };

    it('should return next follow up when available', () => {
      const state = initFollowUpState('Q06', 'N1');
      const next = getNextFollowUp(question, state);
      expect(next).toBe('Follow up 1');
    });

    it('should return null when maxDepth reached', () => {
      const state = {
        questionId: 'Q06',
        currentDepth: 1,
        maxDepth: 1,
        usedFollowUps: ['Follow up 1'],
      };
      const next = getNextFollowUp(question, state);
      expect(next).toBeNull();
    });

    it('should return null when follow up already used', () => {
      const state = {
        questionId: 'Q06',
        currentDepth: 0,
        maxDepth: 2,
        usedFollowUps: ['Follow up 1'],
      };
      const next = getNextFollowUp(question, state);
      expect(next).toBeNull();
    });
  });

  describe('updateFollowUpState', () => {
    it('should increment currentDepth and add to usedFollowUps', () => {
      const state = initFollowUpState('Q06', 'N3');
      const updated = updateFollowUpState(state, 'Follow up 1');

      expect(updated.currentDepth).toBe(1);
      expect(updated.usedFollowUps).toContain('Follow up 1');
    });
  });

  describe('FollowUpManager', () => {
    let manager: FollowUpManager;
    const question: QuestionWithFollowUps = {
      id: 'Q06',
      follow_ups: ['Follow up 1', 'Follow up 2', 'Follow up 3'],
    };

    beforeEach(() => {
      manager = new FollowUpManager('N3');
    });

    it('should initialize state for new question', () => {
      const state = manager.getState('Q06');
      expect(state.questionId).toBe('Q06');
      expect(state.currentDepth).toBe(0);
      expect(state.maxDepth).toBe(2); // N3 = 2
    });

    it('should use follow ups and update state', () => {
      const first = manager.useNextFollowUp(question);
      expect(first).toBe('Follow up 1');

      const second = manager.useNextFollowUp(question);
      expect(second).toBe('Follow up 2');

      // N3 allows only 2 follow ups
      const third = manager.useNextFollowUp(question);
      expect(third).toBeNull();
    });

    it('should track canFollowUp correctly', () => {
      expect(manager.canFollowUp('Q06')).toBe(true);

      manager.useNextFollowUp(question);
      expect(manager.canFollowUp('Q06')).toBe(true);

      manager.useNextFollowUp(question);
      expect(manager.canFollowUp('Q06')).toBe(false);
    });

    it('should track remaining follow ups', () => {
      expect(manager.getRemainingFollowUps('Q06')).toBe(2);

      manager.useNextFollowUp(question);
      expect(manager.getRemainingFollowUps('Q06')).toBe(1);

      manager.useNextFollowUp(question);
      expect(manager.getRemainingFollowUps('Q06')).toBe(0);
    });

    it('should reset state', () => {
      manager.useNextFollowUp(question);
      manager.reset();

      const state = manager.getState('Q06');
      expect(state.currentDepth).toBe(0);
    });

    it('should respect N5 limit of 1 follow up', () => {
      const n5Manager = new FollowUpManager('N5');

      const first = n5Manager.useNextFollowUp(question);
      expect(first).toBe('Follow up 1');

      const second = n5Manager.useNextFollowUp(question);
      expect(second).toBeNull();
    });

    it('should respect N1 limit of 3 follow ups', () => {
      const n1Manager = new FollowUpManager('N1');

      expect(n1Manager.useNextFollowUp(question)).toBe('Follow up 1');
      expect(n1Manager.useNextFollowUp(question)).toBe('Follow up 2');
      expect(n1Manager.useNextFollowUp(question)).toBe('Follow up 3');
      expect(n1Manager.useNextFollowUp(question)).toBeNull();
    });
  });
});
