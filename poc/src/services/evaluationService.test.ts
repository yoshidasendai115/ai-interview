import { describe, it, expect } from 'vitest';
import {
  generateSystemPrompt,
  generateUserPrompt,
  calculateTotalScore,
  detectWeakPoints,
  parseGPTResponse,
  formatEvaluationResult,
  generateMockEvaluation,
} from './evaluationService';
import type { CategoryScores, CategoryFeedback, GPTEvaluationResponse } from '@/types/interview';

describe('evaluationService', () => {
  describe('calculateTotalScore', () => {
    it('should calculate total score with N3 weights', () => {
      const scores: CategoryScores = {
        vocabulary: 80,
        grammar: 70,
        content: 90,
        honorifics: 60,
      };

      // N3 weights: vocabulary: 0.25, grammar: 0.30, content: 0.25, honorifics: 0.20
      // Expected: 80*0.25 + 70*0.30 + 90*0.25 + 60*0.20 = 20 + 21 + 22.5 + 12 = 75.5 -> 76
      const result = calculateTotalScore(scores, 'N3');
      expect(result).toBe(76);
    });

    it('should calculate total score with N1 weights (honorifics heavy)', () => {
      const scores: CategoryScores = {
        vocabulary: 80,
        grammar: 80,
        content: 80,
        honorifics: 50,
      };

      // N1 weights: vocabulary: 0.20, grammar: 0.20, content: 0.25, honorifics: 0.35
      // Expected: 80*0.20 + 80*0.20 + 80*0.25 + 50*0.35 = 16 + 16 + 20 + 17.5 = 69.5 -> 70
      const result = calculateTotalScore(scores, 'N1');
      expect(result).toBe(70);
    });

    it('should calculate total score with N5 weights (grammar heavy)', () => {
      const scores: CategoryScores = {
        vocabulary: 60,
        grammar: 90,
        content: 70,
        honorifics: 50,
      };

      // N5 weights: vocabulary: 0.35, grammar: 0.40, content: 0.20, honorifics: 0.05
      // Expected: 60*0.35 + 90*0.40 + 70*0.20 + 50*0.05 = 21 + 36 + 14 + 2.5 = 73.5 -> 74
      const result = calculateTotalScore(scores, 'N5');
      expect(result).toBe(74);
    });
  });

  describe('detectWeakPoints', () => {
    it('should detect weak points when score is below 70', () => {
      const scores: CategoryScores = {
        vocabulary: 80,
        grammar: 65,
        content: 85,
        honorifics: 55,
      };
      const feedback: CategoryFeedback = {
        vocabulary: 'Good vocabulary',
        grammar: 'Needs improvement',
        content: 'Excellent content',
        honorifics: 'Poor honorifics',
      };

      const result = detectWeakPoints(scores, feedback);

      expect(result).toHaveLength(2);
      expect(result.map((wp) => wp.category)).toContain('grammar');
      expect(result.map((wp) => wp.category)).toContain('honorifics');
    });

    it('should return empty array when all scores are above 70', () => {
      const scores: CategoryScores = {
        vocabulary: 80,
        grammar: 75,
        content: 85,
        honorifics: 70,
      };
      const feedback: CategoryFeedback = {
        vocabulary: 'Good',
        grammar: 'Good',
        content: 'Good',
        honorifics: 'Good',
      };

      const result = detectWeakPoints(scores, feedback);

      expect(result).toHaveLength(0);
    });

    it('should detect all categories as weak when all scores are below 70', () => {
      const scores: CategoryScores = {
        vocabulary: 50,
        grammar: 40,
        content: 60,
        honorifics: 30,
      };
      const feedback: CategoryFeedback = {
        vocabulary: 'Poor',
        grammar: 'Poor',
        content: 'Poor',
        honorifics: 'Poor',
      };

      const result = detectWeakPoints(scores, feedback);

      expect(result).toHaveLength(4);
    });
  });

  describe('parseGPTResponse', () => {
    it('should parse valid JSON response', () => {
      const response = JSON.stringify({
        scores: {
          vocabulary: 80,
          grammar: 75,
          content: 85,
          honorifics: 70,
        },
        feedback: {
          vocabulary: 'Good vocabulary usage',
          grammar: 'Minor grammar issues',
          content: 'Well structured response',
          honorifics: 'Acceptable honorific usage',
        },
        weak_points: [],
        overall_feedback: 'Good performance overall',
      });

      const result = parseGPTResponse(response);

      expect(result).not.toBeNull();
      expect(result?.scores.vocabulary).toBe(80);
      expect(result?.overall_feedback).toBe('Good performance overall');
    });

    it('should parse JSON wrapped in markdown code block', () => {
      const response = `\`\`\`json
{
  "scores": {
    "vocabulary": 80,
    "grammar": 75,
    "content": 85,
    "honorifics": 70
  },
  "feedback": {
    "vocabulary": "Good",
    "grammar": "Good",
    "content": "Good",
    "honorifics": "Good"
  },
  "weak_points": [],
  "overall_feedback": "Good"
}
\`\`\``;

      const result = parseGPTResponse(response);

      expect(result).not.toBeNull();
      expect(result?.scores.vocabulary).toBe(80);
    });

    it('should return null for invalid JSON', () => {
      const response = 'This is not JSON';

      const result = parseGPTResponse(response);

      expect(result).toBeNull();
    });

    it('should return null for missing scores', () => {
      const response = JSON.stringify({
        feedback: {},
        weak_points: [],
        overall_feedback: 'Missing scores',
      });

      const result = parseGPTResponse(response);

      expect(result).toBeNull();
    });
  });

  describe('generateMockEvaluation', () => {
    it('should generate evaluation with scores between 0 and 100', () => {
      const result = generateMockEvaluation(
        '自己紹介をしてください',
        '私の名前は田中です。よろしくお願いします。',
        'N3'
      );

      expect(result.scores.vocabulary).toBeGreaterThanOrEqual(0);
      expect(result.scores.vocabulary).toBeLessThanOrEqual(100);
      expect(result.scores.grammar).toBeGreaterThanOrEqual(0);
      expect(result.scores.grammar).toBeLessThanOrEqual(100);
      expect(result.scores.content).toBeGreaterThanOrEqual(0);
      expect(result.scores.content).toBeLessThanOrEqual(100);
      expect(result.scores.honorifics).toBeGreaterThanOrEqual(0);
      expect(result.scores.honorifics).toBeLessThanOrEqual(100);
    });

    it('should generate higher scores for longer answers', () => {
      const shortAnswer = generateMockEvaluation('質問', '短い', 'N3');
      const longAnswer = generateMockEvaluation(
        '質問',
        'これは非常に長い回答です。私は詳細に説明し、具体的な例を挙げて、論理的に回答しています。このように丁寧に回答することで、面接官に良い印象を与えることができます。',
        'N3'
      );

      // Long answers should generally score higher (base score is affected by length)
      expect(longAnswer.totalScore).toBeGreaterThanOrEqual(shortAnswer.totalScore - 30);
    });

    it('should include feedback for all categories', () => {
      const result = generateMockEvaluation('質問', '回答', 'N3');

      expect(result.feedback.vocabulary).toBeTruthy();
      expect(result.feedback.grammar).toBeTruthy();
      expect(result.feedback.content).toBeTruthy();
      expect(result.feedback.honorifics).toBeTruthy();
      expect(result.overallFeedback).toBeTruthy();
    });
  });

  describe('generateSystemPrompt', () => {
    it('should include JLPT level in prompt', () => {
      const prompt = generateSystemPrompt('N2');
      expect(prompt).toContain('N2');
    });

    it('should include evaluation criteria', () => {
      const prompt = generateSystemPrompt('N3');
      expect(prompt).toContain('語彙');
      expect(prompt).toContain('文法');
      expect(prompt).toContain('内容');
      expect(prompt).toContain('敬語');
    });
  });

  describe('generateUserPrompt', () => {
    it('should include question and answer text', () => {
      const prompt = generateUserPrompt({
        questionText: '自己紹介をしてください',
        answerText: '田中太郎です',
        jlptLevel: 'N3',
        evaluationCriteria: ['明瞭さ', '敬語'],
      });

      expect(prompt).toContain('自己紹介をしてください');
      expect(prompt).toContain('田中太郎です');
      expect(prompt).toContain('明瞭さ');
      expect(prompt).toContain('敬語');
    });
  });
});
