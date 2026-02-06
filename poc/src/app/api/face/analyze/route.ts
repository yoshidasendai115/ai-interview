import { NextRequest, NextResponse } from 'next/server';

/**
 * 感情スコアから緊張度分析を計算
 */
function calculateTensionAnalysis(emotions: Record<string, number>): {
  tension_level: number;
  relax_level: number;
  dominant_emotion: string;
  feedback_message: string;
  feedback_type: string;
} {
  // スコアを0-1範囲に正規化
  const fear = (emotions.fear || 0) / 100;
  const neutral = (emotions.neutral || 0) / 100;
  const happy = (emotions.happy || 0) / 100;
  const angry = (emotions.angry || 0) / 100;
  const sad = (emotions.sad || 0) / 100;

  // 緊張度の計算
  // 高いfear、anger、sadは緊張を示す
  // 低いneutralは緊張を示す
  let tensionLevel = Math.min(1.0, fear * 1.5 + angry * 0.8 + sad * 0.5 + (1 - neutral) * 0.3);

  // リラックス度の計算
  // 高いneutralまたはhappyはリラックスを示す
  let relaxLevel = Math.min(1.0, neutral * 0.7 + happy * 0.3);

  // 範囲を0-1に制限
  tensionLevel = Math.max(0, Math.min(1, tensionLevel));
  relaxLevel = Math.max(0, Math.min(1, relaxLevel));

  // 最も強い感情を特定
  const dominantEmotion = Object.entries(emotions).reduce(
    (max, [emotion, score]) => (score > max.score ? { emotion, score } : max),
    { emotion: 'neutral', score: 0 }
  ).emotion;

  // フィードバックメッセージを生成
  let feedbackMessage: string;
  let feedbackType: string;

  if (tensionLevel > 0.6) {
    feedbackMessage = '緊張しているようです。深呼吸してリラックスしてみましょう';
    feedbackType = 'negative';
  } else if (tensionLevel > 0.4) {
    feedbackMessage = '少し緊張気味です。肩の力を抜いてみてください';
    feedbackType = 'neutral';
  } else if (relaxLevel > 0.7) {
    feedbackMessage = 'リラックスして話せていますね';
    feedbackType = 'positive';
  } else if (relaxLevel > 0.5) {
    feedbackMessage = '落ち着いて話せています';
    feedbackType = 'positive';
  } else {
    feedbackMessage = '自然体で大丈夫ですよ';
    feedbackType = 'neutral';
  }

  return {
    tension_level: Math.round(tensionLevel * 1000) / 1000,
    relax_level: Math.round(relaxLevel * 1000) / 1000,
    dominant_emotion: dominantEmotion,
    feedback_message: feedbackMessage,
    feedback_type: feedbackType,
  };
}

/**
 * POST /api/face/analyze
 *
 * PoC用の顔分析APIエンドポイント
 * 本番環境ではPythonバックエンドのDeepFace APIにプロキシする
 * 開発中はモック応答を返す
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image_base64 } = body;

    if (!image_base64) {
      return NextResponse.json(
        {
          success: false,
          face_detected: false,
          error_message: '画像データが必要です',
        },
        { status: 400 }
      );
    }

    // バックエンドURLを環境変数から取得
    const backendUrl = process.env.BACKEND_API_URL;

    if (backendUrl) {
      // バックエンドが設定されている場合はプロキシ
      try {
        const response = await fetch(`${backendUrl}/api/v1/face/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ image_base64 }),
        });

        if (!response.ok) {
          throw new Error(`Backend API error: ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
      } catch (proxyError) {
        console.error('[Face Analysis] Backend proxy failed, falling back to mock:', proxyError);
        // バックエンド接続失敗時はモック応答にフォールバック
      }
    }

    // モック応答（開発/PoC用）
    // ランダムな感情スコアを生成（リアルな分布を模擬）
    const baseNeutral = 50 + Math.random() * 30; // 50-80
    const remaining = 100 - baseNeutral;

    const emotions = {
      angry: Math.random() * remaining * 0.1,
      disgust: Math.random() * remaining * 0.05,
      fear: Math.random() * remaining * 0.3, // 緊張として表れやすい
      happy: Math.random() * remaining * 0.2,
      sad: Math.random() * remaining * 0.1,
      surprise: Math.random() * remaining * 0.1,
      neutral: baseNeutral,
    };

    // スコアの合計が100になるよう調整
    const total = Object.values(emotions).reduce((sum, v) => sum + v, 0);
    const normalizedEmotions = Object.fromEntries(
      Object.entries(emotions).map(([k, v]) => [k, (v / total) * 100])
    );

    const tension = calculateTensionAnalysis(normalizedEmotions);

    return NextResponse.json({
      success: true,
      face_detected: true,
      face_region: {
        x: 100,
        y: 50,
        w: 200,
        h: 200,
      },
      emotions: normalizedEmotions,
      tension,
      error_message: null,
    });
  } catch (error) {
    console.error('[Face Analysis] Error:', error);
    return NextResponse.json(
      {
        success: false,
        face_detected: false,
        error_message: '分析中にエラーが発生しました',
      },
      { status: 500 }
    );
  }
}
