/**
 * 質問文のプレースホルダー置換ユーティリティ
 * ハイブリッド方式: マスターデータ + GPT選択
 */

// 業界別都道府県マスターデータ
export const INDUSTRY_PREFECTURES: Record<string, {
  name: string;
  prefectures: string[];
  reason: string;
}> = {
  nursing_care: {
    name: "介護",
    prefectures: ["東京都", "神奈川県", "愛知県"],
    reason: "高齢化率が高く介護施設が多い都市部"
  },
  food_service: {
    name: "飲食",
    prefectures: ["東京都", "大阪府", "愛知県"],
    reason: "飲食店が集中する大都市圏"
  },
  construction: {
    name: "建設",
    prefectures: ["東京都", "愛知県", "大阪府"],
    reason: "再開発・インフラ整備が活発な地域"
  },
  manufacturing: {
    name: "製造",
    prefectures: ["愛知県", "静岡県", "大阪府"],
    reason: "自動車・機械製造業の集積地"
  },
  hospitality: {
    name: "宿泊",
    prefectures: ["東京都", "大阪府", "京都府"],
    reason: "観光需要が高い主要都市"
  },
  agriculture: {
    name: "農業",
    prefectures: ["茨城県", "千葉県", "長野県"],
    reason: "大規模農業・園芸農業が盛んな地域"
  },
  building_cleaning: {
    name: "ビルクリーニング",
    prefectures: ["東京都", "大阪府", "神奈川県"],
    reason: "オフィスビル・商業施設が多い都市部"
  }
};

// デフォルト都道府県（業界不明の場合）
const DEFAULT_PREFECTURES = ["東京都", "大阪府", "愛知県"];

/**
 * 業界に基づいて都道府県をランダムに選択
 * @param industryId 業界ID
 * @returns 選択された都道府県
 */
export function selectRandomPrefecture(industryId: string): string {
  const industryData = INDUSTRY_PREFECTURES[industryId];
  const prefectures = industryData?.prefectures ?? DEFAULT_PREFECTURES;
  const randomIndex = Math.floor(Math.random() * prefectures.length);
  return prefectures[randomIndex];
}

/**
 * GPTを使用して業界に最適な都道府県を選択
 * @param industryId 業界ID
 * @param context 追加コンテキスト（オプション）
 * @returns 選択された都道府県
 */
export async function selectPrefectureWithGPT(
  industryId: string,
  context?: string
): Promise<string> {
  const industryData = INDUSTRY_PREFECTURES[industryId];

  if (!industryData) {
    // 業界が見つからない場合はランダム選択にフォールバック
    return selectRandomPrefecture(industryId);
  }

  const prompt = buildPrefectureSelectionPrompt(industryData, context);

  try {
    const response = await callGPT(prompt, industryData.prefectures);
    return response;
  } catch (error) {
    // GPT呼び出し失敗時はランダム選択にフォールバック
    console.error("GPT prefecture selection failed, falling back to random:", error);
    return selectRandomPrefecture(industryId);
  }
}

/**
 * GPT用のプロンプトを構築
 */
function buildPrefectureSelectionPrompt(
  industryData: { name: string; prefectures: string[]; reason: string },
  context?: string
): string {
  return `あなたは日本の外国人労働者向け面接練習システムのアシスタントです。

業界: ${industryData.name}
選択可能な都道府県: ${industryData.prefectures.join("、")}
選定理由: ${industryData.reason}
${context ? `追加情報: ${context}` : ""}

上記の選択可能な都道府県から1つを選んでください。
面接練習として現実的で、その業界で働く外国人労働者にとって馴染みのある地域を選択してください。

回答は都道府県名のみを返してください（例: 東京都）。`;
}

/**
 * GPT APIを呼び出し
 * @param prompt プロンプト
 * @param validOptions 有効な選択肢（バリデーション用）
 * @returns 選択された都道府県
 */
async function callGPT(prompt: string, validOptions: string[]): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "あなたは指示に従って都道府県名のみを返すアシスタントです。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 20,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const result = data.choices[0]?.message?.content?.trim();

  // バリデーション: 返された値が有効な選択肢に含まれているか確認
  if (result && validOptions.includes(result)) {
    return result;
  }

  // 部分一致でも許容（「東京」→「東京都」など）
  const matched = validOptions.find(option =>
    option.includes(result) || result.includes(option.replace(/[都道府県]$/, ""))
  );

  if (matched) {
    return matched;
  }

  // マッチしない場合はランダム選択
  console.warn(`GPT returned invalid prefecture: ${result}, using random selection`);
  return validOptions[Math.floor(Math.random() * validOptions.length)];
}

/**
 * 質問文のプレースホルダーを置換
 * @param questionText 質問文（〇〇を含む）
 * @param industryId 業界ID
 * @param useGPT GPTを使用するかどうか
 * @returns 置換後の質問文
 */
export async function replacePlaceholder(
  questionText: string,
  industryId: string,
  useGPT: boolean = false
): Promise<string> {
  if (!questionText.includes("〇〇")) {
    return questionText;
  }

  const prefecture = useGPT
    ? await selectPrefectureWithGPT(industryId)
    : selectRandomPrefecture(industryId);

  return questionText.replace(/〇〇/g, prefecture);
}

/**
 * 複数の質問文を一括置換
 * @param questions 質問文の配列
 * @param industryId 業界ID
 * @param useGPT GPTを使用するかどうか
 * @returns 置換後の質問文の配列
 */
export async function replacePlaceholders(
  questions: string[],
  industryId: string,
  useGPT: boolean = false
): Promise<string[]> {
  // GPT使用時は同じ都道府県を使用（一貫性のため）
  if (useGPT) {
    const prefecture = await selectPrefectureWithGPT(industryId);
    return questions.map(q => q.replace(/〇〇/g, prefecture));
  }

  // 非GPT時は各質問で同じ都道府県を使用
  const prefecture = selectRandomPrefecture(industryId);
  return questions.map(q => q.replace(/〇〇/g, prefecture));
}
