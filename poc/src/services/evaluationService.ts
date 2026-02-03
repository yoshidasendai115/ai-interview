/**
 * 評価サービス - GPT-4o評価ロジック
 */

import type {
  JLPTLevel,
  JLPTWeights,
  CategoryScores,
  CategoryFeedback,
  EvaluationResult,
  EvaluationCategory,
  GPTEvaluationRequest,
  GPTEvaluationResponse,
  WeakPointDetection,
  JLPT_WEIGHTS,
} from '@/types/interview';

// JLPTレベル別重み付けを再定義（importの問題を回避）
const JLPT_LEVEL_WEIGHTS: Record<JLPTLevel, JLPTWeights> = {
  N1: { vocabulary: 0.20, grammar: 0.20, content: 0.25, honorifics: 0.35 },
  N2: { vocabulary: 0.20, grammar: 0.25, content: 0.25, honorifics: 0.30 },
  N3: { vocabulary: 0.25, grammar: 0.30, content: 0.25, honorifics: 0.20 },
  N4: { vocabulary: 0.30, grammar: 0.35, content: 0.25, honorifics: 0.10 },
  N5: { vocabulary: 0.35, grammar: 0.40, content: 0.20, honorifics: 0.05 },
};

// カテゴリ別苦手検出閾値
const WEAK_POINT_THRESHOLD = 70;

/**
 * GPT-4o評価用システムプロンプト生成
 */
export function generateSystemPrompt(jlptLevel: JLPTLevel): string {
  return `あなたは日本語能力試験（JLPT）の評価専門家です。
外国人求職者の面接練習における回答を評価し、改善点を具体的にフィードバックします。

評価対象者のJLPTレベル: ${jlptLevel}
評価基準:
1. 語彙（vocabulary）: 適切な語彙選択、語彙の豊富さ、専門用語の使用
2. 文法（grammar）: 文法の正確性、文構造、接続表現の適切さ
3. 内容（content）: 質問への適切な応答、論理性、具体例の使用
4. 敬語（honorifics）: 尊敬語・謙譲語・丁寧語の正確な使い分け

JLPTレベル別の評価重点:
${getLevelGuidance(jlptLevel)}

出力形式はJSON形式で、以下の構造に従ってください。`;
}

/**
 * JLPTレベル別の評価ガイダンス取得
 */
function getLevelGuidance(level: JLPTLevel): string {
  switch (level) {
    case 'N1':
    case 'N2':
      return `- ビジネス即戦力レベル
- 尊敬語・謙譲語の使い分けを厳しく評価
- 論理的思考と逆質問の妥当性を重視
- 専門用語の適切な使用を確認`;
    case 'N3':
      return `- 実務・接客対応レベル
- 丁寧語（です・ます）の維持を確認
- 質問の意図解釈能力を評価
- 定型表現の使用を確認`;
    case 'N4':
    case 'N5':
      return `- 基本意思疎通レベル
- 基本挨拶の使用を確認
- 語順の正しさを重視
- 聞き取りと応答の適切さを評価`;
    default:
      return '';
  }
}

/**
 * GPT-4o評価用ユーザープロンプト生成
 */
export function generateUserPrompt(request: GPTEvaluationRequest): string {
  const criteriaText = request.evaluationCriteria.length > 0
    ? request.evaluationCriteria.join('、')
    : '明瞭さ、構成、適切な敬語使用';

  return `以下の面接質問に対する回答を評価してください。

【質問】
${request.questionText}

【回答】
${request.answerText}

【評価基準】
${criteriaText}

以下のJSON形式で回答してください:
{
  "scores": {
    "vocabulary": <0-100の整数>,
    "grammar": <0-100の整数>,
    "content": <0-100の整数>,
    "honorifics": <0-100の整数>
  },
  "feedback": {
    "vocabulary": "<具体的なフィードバック>",
    "grammar": "<具体的なフィードバック>",
    "content": "<具体的なフィードバック>",
    "honorifics": "<具体的なフィードバック>"
  },
  "weak_points": [
    {
      "category": "<カテゴリ: vocabulary/grammar/content/honorifics>",
      "description": "<問題点の説明>",
      "example": "<具体例>",
      "suggestion": "<改善提案>"
    }
  ],
  "overall_feedback": "<全体的な総評>"
}`;
}

/**
 * 総合スコア計算（JLPTレベル別重み付け適用）
 */
export function calculateTotalScore(
  scores: CategoryScores,
  jlptLevel: JLPTLevel
): number {
  const weights = JLPT_LEVEL_WEIGHTS[jlptLevel];

  const total =
    scores.vocabulary * weights.vocabulary +
    scores.grammar * weights.grammar +
    scores.content * weights.content +
    scores.honorifics * weights.honorifics;

  return Math.round(total);
}

/**
 * 苦手項目検出
 */
export function detectWeakPoints(
  scores: CategoryScores,
  feedback: CategoryFeedback
): WeakPointDetection[] {
  const weakPoints: WeakPointDetection[] = [];
  const categories: EvaluationCategory[] = ['vocabulary', 'grammar', 'content', 'honorifics'];

  for (const category of categories) {
    if (scores[category] < WEAK_POINT_THRESHOLD) {
      weakPoints.push({
        category,
        description: getWeakPointDescription(category, scores[category]),
        example: feedback[category],
        suggestion: getImprovementSuggestion(category),
      });
    }
  }

  return weakPoints;
}

/**
 * 苦手項目の説明生成
 */
function getWeakPointDescription(category: EvaluationCategory, score: number): string {
  const severity = score < 50 ? '大きな改善が必要' : '改善の余地あり';

  switch (category) {
    case 'vocabulary':
      return `語彙力に${severity}です`;
    case 'grammar':
      return `文法に${severity}です`;
    case 'content':
      return `回答内容に${severity}です`;
    case 'honorifics':
      return `敬語の使用に${severity}です`;
    default:
      return `${severity}です`;
  }
}

/**
 * 改善提案生成
 */
function getImprovementSuggestion(category: EvaluationCategory): string {
  switch (category) {
    case 'vocabulary':
      return 'ビジネス用語や専門用語の学習を増やし、語彙力を強化しましょう。';
    case 'grammar':
      return '基本的な文法パターンを復習し、特に接続表現に注意しましょう。';
    case 'content':
      return '質問の意図を正確に理解し、具体例を交えた論理的な回答を心がけましょう。';
    case 'honorifics':
      return '尊敬語・謙譲語・丁寧語の違いを学び、場面に応じた使い分けを練習しましょう。';
    default:
      return '継続的な練習で改善を目指しましょう。';
  }
}

/**
 * GPT-4oレスポンスのパース
 */
export function parseGPTResponse(responseText: string): GPTEvaluationResponse | null {
  try {
    // JSONブロックを抽出（```json ... ``` 形式にも対応）
    let jsonText = responseText;
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonText);

    // 必須フィールドの検証
    if (
      !parsed.scores ||
      typeof parsed.scores.vocabulary !== 'number' ||
      typeof parsed.scores.grammar !== 'number' ||
      typeof parsed.scores.content !== 'number' ||
      typeof parsed.scores.honorifics !== 'number'
    ) {
      console.error('Invalid GPT response: missing or invalid scores');
      return null;
    }

    return parsed as GPTEvaluationResponse;
  } catch (error) {
    console.error('Failed to parse GPT response:', error);
    return null;
  }
}

/**
 * 評価結果の整形
 */
export function formatEvaluationResult(
  gptResponse: GPTEvaluationResponse,
  jlptLevel: JLPTLevel
): EvaluationResult {
  const totalScore = calculateTotalScore(gptResponse.scores, jlptLevel);
  const detectedWeakPoints = detectWeakPoints(gptResponse.scores, gptResponse.feedback);

  // GPTからのweak_pointsとdetectedWeakPointsをマージ
  const weakPoints = [
    ...gptResponse.weak_points.map((wp, index) => ({
      id: `wp-${Date.now()}-${index}`,
      category: wp.category as EvaluationCategory,
      description: wp.description,
      example: wp.example,
      suggestion: wp.suggestion,
      priority: determinePriority(gptResponse.scores[wp.category as keyof CategoryScores] || 50),
      occurrenceCount: 1,
      lastOccurredAt: new Date(),
      resolved: false,
    })),
    ...detectedWeakPoints.map((wp, index) => ({
      id: `wp-detected-${Date.now()}-${index}`,
      ...wp,
      priority: determinePriority(gptResponse.scores[wp.category] || 50),
      occurrenceCount: 1,
      lastOccurredAt: new Date(),
      resolved: false,
    })),
  ];

  // 重複を除去
  const uniqueWeakPoints = weakPoints.filter(
    (wp, index, self) =>
      index === self.findIndex((t) => t.category === wp.category)
  );

  return {
    scores: gptResponse.scores,
    feedback: gptResponse.feedback,
    weakPoints: uniqueWeakPoints,
    overallFeedback: gptResponse.overall_feedback,
    totalScore,
  };
}

/**
 * 優先度判定
 */
function determinePriority(score: number): 'high' | 'medium' | 'low' {
  if (score < 50) return 'high';
  if (score < 70) return 'medium';
  return 'low';
}

/**
 * 開発用：モック評価結果生成
 *
 * 注意：これは開発用のモック関数です。
 * 本番環境ではGPT-4o APIを使用した実際の評価を行う必要があります。
 */
export function generateMockEvaluation(
  questionText: string,
  answerText: string,
  jlptLevel: JLPTLevel
): EvaluationResult {
  // デバッグ用：実際のトランスクリプトをコンソールに出力
  console.log('[Evaluation] Question:', questionText.slice(0, 50));
  console.log('[Evaluation] Answer transcript:', answerText || '(empty)');
  console.log('[Evaluation] Answer length:', answerText.length);

  // 回答の長さに基づいて基本スコアを計算
  // 空の回答の場合は低スコア、十分な長さがあれば高スコア
  let baseScore: number;
  if (answerText.length === 0) {
    // 回答なし：音声認識が動作していない可能性
    baseScore = 35;
  } else if (answerText.length < 20) {
    // 非常に短い回答
    baseScore = 50;
  } else if (answerText.length < 50) {
    // 短い回答
    baseScore = 65;
  } else if (answerText.length < 100) {
    // 普通の長さ
    baseScore = 75;
  } else {
    // 十分な長さ
    baseScore = 85;
  }

  const variation = () => Math.floor(Math.random() * 10) - 5;

  const scores: CategoryScores = {
    vocabulary: Math.min(100, Math.max(0, baseScore + variation())),
    grammar: Math.min(100, Math.max(0, baseScore + variation())),
    content: Math.min(100, Math.max(0, baseScore + variation())),
    honorifics: Math.min(100, Math.max(0, baseScore + variation())),
  };

  // 回答が空の場合は特別なフィードバック
  const feedback: CategoryFeedback = answerText.length === 0 ? {
    vocabulary: '【デバッグ】音声が認識されませんでした。マイクの設定を確認してください。',
    grammar: '【デバッグ】トランスクリプトが空です。録音が正しく行われているか確認してください。',
    content: '【デバッグ】回答が記録されていません。',
    honorifics: '【デバッグ】評価できません。',
  } : {
    vocabulary: '適切な語彙を使用しています。より専門的な表現を増やすとさらに良くなります。',
    grammar: '基本的な文法は正確です。複文の構造に注意しましょう。',
    content: '質問の意図を理解した回答ができています。具体例を追加するとより説得力が増します。',
    honorifics: '丁寧語は適切に使用できています。謙譲語と尊敬語の区別を意識しましょう。',
  };

  const totalScore = calculateTotalScore(scores, jlptLevel);
  const weakPoints = detectWeakPoints(scores, feedback);

  // デバッグ情報を含めた総評
  const debugInfo = answerText.length === 0
    ? '\n\n【デバッグ情報】音声認識でトランスクリプトが取得できませんでした。マイクが正しく動作しているか、またはアバターの発話終了を待っているか確認してください。'
    : `\n\n【デバッグ情報】トランスクリプト長: ${answerText.length}文字`;

  return {
    scores,
    feedback,
    weakPoints: weakPoints.map((wp, index) => ({
      id: `mock-wp-${Date.now()}-${index}`,
      ...wp,
      priority: determinePriority(scores[wp.category]),
      occurrenceCount: 1,
      lastOccurredAt: new Date(),
      resolved: false,
    })),
    overallFeedback: `【モック評価】${totalScore >= 70 ? '良い回答でした。' : '改善が必要な回答でした。'}${
      totalScore >= 70
        ? '引き続き練習を重ねて、さらなる向上を目指しましょう。'
        : '特に敬語の使い方と文法に注意して、繰り返し練習しましょう。'
    }${debugInfo}`,
    totalScore,
  };
}
