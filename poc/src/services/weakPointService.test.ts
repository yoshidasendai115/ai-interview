import { describe, it, expect } from 'vitest';
import {
  calculatePriorityScore,
  determinePriorityLevel,
  detectWeakPointCandidates,
  updateWeakPoints,
  shouldRegisterAsTag,
  sortWeakPointsByPriority,
  getHighPriorityCategories,
  generateLearningProgressSummary,
  toWeakPoint,
  type WeakPointRecord,
} from './weakPointService';
import type { CategoryScores } from '@/types/interview';

describe('weakPointService', () => {
  describe('calculatePriorityScore', () => {
    it('should calculate priority score based on occurrence count and recency', () => {
      const now = new Date();
      const score = calculatePriorityScore(3, now);

      // (3 * 10) + (30 - 0) = 30 + 30 = 60
      expect(score).toBe(60);
    });

    it('should decrease score for older occurrences', () => {
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      const score = calculatePriorityScore(3, tenDaysAgo);

      // (3 * 10) + (30 - 10) = 30 + 20 = 50
      expect(score).toBe(50);
    });

    it('should not go negative for very old occurrences', () => {
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 45);

      const score = calculatePriorityScore(1, monthAgo);

      // (1 * 10) + Math.max(0, 30 - 45) = 10 + 0 = 10
      expect(score).toBe(10);
    });
  });

  describe('determinePriorityLevel', () => {
    it('should return high for score >= 50', () => {
      expect(determinePriorityLevel(50)).toBe('high');
      expect(determinePriorityLevel(100)).toBe('high');
    });

    it('should return medium for score >= 25 and < 50', () => {
      expect(determinePriorityLevel(25)).toBe('medium');
      expect(determinePriorityLevel(49)).toBe('medium');
    });

    it('should return low for score < 25', () => {
      expect(determinePriorityLevel(0)).toBe('low');
      expect(determinePriorityLevel(24)).toBe('low');
    });
  });

  describe('detectWeakPointCandidates', () => {
    it('should detect categories with score below 70', () => {
      const scores: CategoryScores = {
        vocabulary: 80,
        grammar: 65,
        content: 85,
        honorifics: 50,
      };

      const result = detectWeakPointCandidates(scores);

      expect(result).toContain('grammar');
      expect(result).toContain('honorifics');
      expect(result).not.toContain('vocabulary');
      expect(result).not.toContain('content');
    });

    it('should return empty array when all scores are above 70', () => {
      const scores: CategoryScores = {
        vocabulary: 80,
        grammar: 75,
        content: 90,
        honorifics: 70,
      };

      const result = detectWeakPointCandidates(scores);

      expect(result).toHaveLength(0);
    });
  });

  describe('updateWeakPoints', () => {
    const now = new Date();
    const userId = 'test-user';

    it('should add new weak point for low score category', () => {
      const existingWeakPoints: WeakPointRecord[] = [];
      const scores: CategoryScores = {
        vocabulary: 80,
        grammar: 60,
        content: 85,
        honorifics: 80,
      };

      const result = updateWeakPoints(existingWeakPoints, scores, userId);

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('grammar');
      expect(result[0].occurrenceCount).toBe(1);
    });

    it('should increment occurrence count for existing weak point', () => {
      const existingWeakPoints: WeakPointRecord[] = [
        {
          id: 'wp-1',
          userId,
          category: 'grammar',
          description: 'Grammar issues',
          priority: 'low',
          occurrenceCount: 2,
          lastOccurredAt: new Date(now.getTime() - 86400000), // yesterday
          consecutiveHighScores: 0,
          resolved: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const scores: CategoryScores = {
        vocabulary: 80,
        grammar: 60,
        content: 85,
        honorifics: 80,
      };

      const result = updateWeakPoints(existingWeakPoints, scores, userId);

      expect(result).toHaveLength(1);
      expect(result[0].occurrenceCount).toBe(3);
    });

    it('should increment consecutiveHighScores for high score', () => {
      const existingWeakPoints: WeakPointRecord[] = [
        {
          id: 'wp-1',
          userId,
          category: 'grammar',
          description: 'Grammar issues',
          priority: 'medium',
          occurrenceCount: 3,
          lastOccurredAt: new Date(),
          consecutiveHighScores: 1,
          resolved: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const scores: CategoryScores = {
        vocabulary: 80,
        grammar: 85, // High score
        content: 85,
        honorifics: 80,
      };

      const result = updateWeakPoints(existingWeakPoints, scores, userId);

      expect(result[0].consecutiveHighScores).toBe(2);
    });

    it('should resolve weak point after 3 consecutive high scores', () => {
      const existingWeakPoints: WeakPointRecord[] = [
        {
          id: 'wp-1',
          userId,
          category: 'grammar',
          description: 'Grammar issues',
          priority: 'medium',
          occurrenceCount: 3,
          lastOccurredAt: new Date(),
          consecutiveHighScores: 2,
          resolved: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const scores: CategoryScores = {
        vocabulary: 80,
        grammar: 85, // 3rd consecutive high score
        content: 85,
        honorifics: 80,
      };

      const result = updateWeakPoints(existingWeakPoints, scores, userId);

      expect(result[0].resolved).toBe(true);
      expect(result[0].consecutiveHighScores).toBe(3);
    });
  });

  describe('shouldRegisterAsTag', () => {
    it('should return true for occurrence count >= 3 and not resolved', () => {
      const record: WeakPointRecord = {
        id: 'wp-1',
        userId: 'user',
        category: 'grammar',
        description: 'Test',
        priority: 'medium',
        occurrenceCount: 3,
        lastOccurredAt: new Date(),
        consecutiveHighScores: 0,
        resolved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(shouldRegisterAsTag(record)).toBe(true);
    });

    it('should return false for occurrence count < 3', () => {
      const record: WeakPointRecord = {
        id: 'wp-1',
        userId: 'user',
        category: 'grammar',
        description: 'Test',
        priority: 'low',
        occurrenceCount: 2,
        lastOccurredAt: new Date(),
        consecutiveHighScores: 0,
        resolved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(shouldRegisterAsTag(record)).toBe(false);
    });

    it('should return false for resolved weak points', () => {
      const record: WeakPointRecord = {
        id: 'wp-1',
        userId: 'user',
        category: 'grammar',
        description: 'Test',
        priority: 'medium',
        occurrenceCount: 5,
        lastOccurredAt: new Date(),
        consecutiveHighScores: 3,
        resolved: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(shouldRegisterAsTag(record)).toBe(false);
    });
  });

  describe('sortWeakPointsByPriority', () => {
    it('should sort by priority score in descending order', () => {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 86400000);

      const weakPoints: WeakPointRecord[] = [
        {
          id: 'wp-1',
          userId: 'user',
          category: 'grammar',
          description: 'Test',
          priority: 'low',
          occurrenceCount: 1,
          lastOccurredAt: weekAgo,
          consecutiveHighScores: 0,
          resolved: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'wp-2',
          userId: 'user',
          category: 'honorifics',
          description: 'Test',
          priority: 'high',
          occurrenceCount: 5,
          lastOccurredAt: now,
          consecutiveHighScores: 0,
          resolved: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const result = sortWeakPointsByPriority(weakPoints);

      expect(result[0].category).toBe('honorifics');
      expect(result[1].category).toBe('grammar');
    });

    it('should exclude resolved weak points', () => {
      const weakPoints: WeakPointRecord[] = [
        {
          id: 'wp-1',
          userId: 'user',
          category: 'grammar',
          description: 'Test',
          priority: 'high',
          occurrenceCount: 5,
          lastOccurredAt: new Date(),
          consecutiveHighScores: 3,
          resolved: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const result = sortWeakPointsByPriority(weakPoints);

      expect(result).toHaveLength(0);
    });
  });

  describe('generateLearningProgressSummary', () => {
    it('should generate correct summary statistics', () => {
      const weakPoints: WeakPointRecord[] = [
        {
          id: 'wp-1',
          userId: 'user',
          category: 'grammar',
          description: 'Test',
          priority: 'high',
          occurrenceCount: 5,
          lastOccurredAt: new Date(),
          consecutiveHighScores: 0,
          resolved: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'wp-2',
          userId: 'user',
          category: 'honorifics',
          description: 'Test',
          priority: 'medium',
          occurrenceCount: 3,
          lastOccurredAt: new Date(),
          consecutiveHighScores: 0,
          resolved: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'wp-3',
          userId: 'user',
          category: 'vocabulary',
          description: 'Test',
          priority: 'low',
          occurrenceCount: 2,
          lastOccurredAt: new Date(),
          consecutiveHighScores: 3,
          resolved: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const result = generateLearningProgressSummary(weakPoints);

      expect(result.totalWeakPoints).toBe(3);
      expect(result.resolvedCount).toBe(1);
      expect(result.activeCount).toBe(2);
      expect(result.highPriorityCount).toBe(1);
      expect(result.mediumPriorityCount).toBe(1);
      expect(result.lowPriorityCount).toBe(0);
      expect(result.categoryBreakdown.grammar.isWeak).toBe(true);
      expect(result.categoryBreakdown.vocabulary.isWeak).toBe(false); // resolved
    });
  });

  describe('toWeakPoint', () => {
    it('should convert WeakPointRecord to WeakPoint', () => {
      const record: WeakPointRecord = {
        id: 'wp-1',
        userId: 'user',
        category: 'grammar',
        description: 'Grammar issues',
        priority: 'high',
        occurrenceCount: 5,
        lastOccurredAt: new Date(),
        consecutiveHighScores: 0,
        resolved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = toWeakPoint(record);

      expect(result.id).toBe('wp-1');
      expect(result.category).toBe('grammar');
      expect(result.description).toBe('Grammar issues');
      expect(result.priority).toBe('high');
      expect(result.suggestion).toBeTruthy();
    });
  });
});
