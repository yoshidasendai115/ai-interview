# 10. API仕様

## 10.1 API設計方針

### API接続構成図

![API接続構成図](./images/設計書_10.1_API接続構成図.png)

本システムのAPIは、クライアント（ブラウザ）からのリクエストを受け付け、外部サービス（mintoku work、HeyGen、OpenAI GPT-4o）およびデータ層（PostgreSQL、Redis、S3）と連携して処理を行う。

| 項目 | 内容 |
|------|------|
| 設計スタイル | RESTful API |
| データ形式 | JSON |
| 認証方式 | JWT Bearer Token |
| バージョニング | URLパスベース（`/api/v1/`） |
| エラーレスポンス | RFC 7807 Problem Details形式 |

## 10.2 認証API

### POST /api/v1/auth/sso/callback
SSO認証コールバック（mintoku workからのリダイレクト後）

**リクエスト**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**レスポンス（200 OK）**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...",
  "user": {
    "id": "usr_123456",
    "mintoku_user_id": "mintoku_user_123",
    "email": "user@example.com",
    "name": "山田 太郎",
    "organization": "ABC日本語学校",
    "jlpt_level": "N3",
    "preferred_industry": {
      "industry_id": "construction",
      "industry_name": "建設"
    }
  },
  "learning_plan": {
    "id": "lp_789",
    "industry_id": "construction",
    "industry_name": "建設業界マスターコース",
    "status": "active",
    "progress": {
      "completed_steps": 2,
      "total_steps": 6,
      "percentage": 33
    },
    "current_step": {
      "step_number": 3,
      "step_type": "practice",
      "jlpt_level": "N4"
    }
  }
}
```

#### preferred_industry フィールド説明

| フィールド | 型 | 説明 |
|-----------|-----|------|
| industry_id | string | 業界ID（construction, food_service, nursing_care等） |
| industry_name | string | 業界名（日本語） |

> **学習計画の自動生成**
> SSO認証時に `preferred_industry` が含まれる場合、その業界に基づいて学習計画を同期生成します。
> 既存の学習計画があり、業界が変更されていない場合は新規生成をスキップします。
> - 学習計画存在判定ロジック: 12_面接フロー制御 12.10.3
> - 学習計画生成ロジック: 12_面接フロー制御 12.10.4

### POST /api/v1/auth/refresh
トークンリフレッシュ

**リクエスト**
```json
{
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..."
}
```

**レスポンス（200 OK）**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "bmV3IHJlZnJlc2ggdG9rZW4..."
}
```

### POST /api/v1/auth/logout
ログアウト

**レスポンス（204 No Content）**

## 10.3 面接セッションAPI

### POST /api/v1/sessions
面接セッション開始

**リクエスト**
```json
{
  "script_id": "script_uuid",
  "jlpt_level": "N3"
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| script_id | string | ○ | 使用するスクリプトのUUID（10.5.1参照） |
| jlpt_level | string | ○ | 練習時のJLPTレベル（N1-N5） |

> **注意**: スクリプトには業界情報が含まれているため、`industry_id`の指定は不要です。
> スクリプト一覧は GET /api/v1/scripts で取得できます（10.5.1参照）。

#### 用語の対応関係

| API用語 | DB用語 | 説明 |
|---------|--------|------|
| script / script_id | scenario_templates / scenario_template_id | 面接シナリオテンプレート。業界・JLPTレベル別の質問セットを定義 |

> **背景**: APIでは「スクリプト」（面接台本）という直感的な用語を使用し、DBでは「シナリオテンプレート」（設計上の正式名称）を使用している。
> 実装時は `scripts` テーブルを `scenario_templates` テーブルとしてマッピングする。

**レスポンス（201 Created）**
```json
{
  "session_id": "ses_456",
  "jlpt_level": "N3",
  "industry_id": "construction",
  "industry_name": "建設",
  "total_questions": 10,
  "heygen_session": {
    "session_token": "heygen_token_xxx",
    "avatar_id": "wayne_asian_male"
  },
  "started_at": "2025-01-30T14:00:00Z"
}
```

### GET /api/v1/sessions/{session_id}
セッション情報取得

**レスポンス（200 OK）**
```json
{
  "session_id": "ses_456",
  "status": "in_progress",
  "current_question": 3,
  "total_questions": 10,
  "answers": [
    {
      "question_id": 1,
      "question_text": "自己紹介をお願いします。",
      "answer_text": "はじめまして。山田太郎と申します...",
      "answered_at": "2025-01-30T14:02:00Z"
    }
  ],
  "started_at": "2025-01-30T14:00:00Z"
}
```

### POST /api/v1/sessions/{session_id}/answers
回答送信

**リクエスト**
```json
{
  "question_id": 3,
  "audio_data": "base64_encoded_audio...",
  "transcript": "私の強みは..."
}
```

**レスポンス（200 OK）**
```json
{
  "answer_id": "ans_789",
  "question_id": 3,
  "transcript": "私の強みは...",
  "next_question": {
    "id": 4,
    "text": "チームワークについて教えてください。"
  }
}
```

#### 音声ファイル処理フロー

リクエストで受け取った`audio_data`（base64エンコード）は以下のフローで処理される。

```
1. クライアント → API: base64エンコードされた音声データを送信
   ↓
2. API: base64をデコードしてバイナリデータに変換
   ↓
3. API → S3: 音声ファイルをアップロード
   - バケット: {環境}-ai-interview-audio
   - キー: sessions/{session_id}/answers/{answer_id}.webm
   - Content-Type: audio/webm
   ↓
4. S3: 署名付きURLまたは内部URLを返却
   ↓
5. API → DB: session_answers.audio_url にS3 URLを保存
   ↓
6. API → クライアント: レスポンス返却
```

| 項目 | 値 |
|------|-----|
| 保存形式 | WebM (Opus codec) |
| 最大ファイルサイズ | 10MB |
| 保存期間 | 90日（ライフサイクルポリシー適用） |
| アクセス制御 | 署名付きURL（有効期限: 1時間） |

### PUT /api/v1/sessions/{session_id}/complete
セッション完了（評価実行をトリガー）

**レスポンス（200 OK）**
```json
{
  "session_id": "ses_456",
  "status": "completed",
  "completed_at": "2025-01-30T14:30:00Z",
  "evaluation_id": "eval_123"
}
```

#### 評価処理〜mintoku work同期の非同期フロー

セッション完了時、評価処理とmintoku work同期は以下の非同期フローで実行される。

```
1. PUT /api/v1/sessions/{id}/complete 受信
   ↓
2. interview_sessions.status = 'completed' に更新
   ↓
3. evaluations レコード作成
   - evaluation_status = 'pending'
   - mintoku_sync_status = 'pending'
   ↓
4. APIレスポンス返却（ここでクライアントへの応答完了）
   ↓
5. 非同期: 評価処理開始
   - evaluations.evaluation_status = 'processing'
   ↓
6. GPT-4o呼び出し
   ├─ 成功 → evaluation_status = 'completed'
   │         evaluated_at = NOW()
   │         → ステップ7へ
   │
   └─ 失敗 → リトライ（最大3回）
             ├─ リトライ成功 → evaluation_status = 'completed'
             └─ リトライ失敗 → evaluation_status = 'failed'
                              last_error = エラーメッセージ
                              → 処理終了（管理者通知）
   ↓
7. mintoku work送信開始
   ↓
8. POST https://api.mintoku-work.com/v1/interview-results
   ├─ 成功（200 OK）
   │   → mintoku_sync_status = 'synced'
   │   → mintoku_synced_at = NOW()
   │
   └─ 失敗 → リトライ（最大3回、指数バックオフ: 1秒→2秒→4秒）
             ├─ リトライ成功 → mintoku_sync_status = 'synced'
             └─ リトライ失敗 → mintoku_sync_status = 'failed'
                              → 処理終了（管理者通知、手動再送可能）
```

#### 評価ステータスの状態遷移

> **詳細**: 11_データベーススキーマ 11.3 evaluationsテーブル参照

| 現在の状態 | イベント | 次の状態 |
|-----------|---------|---------|
| pending | 評価処理開始 | processing |
| processing | GPT-4o評価成功 | completed |
| processing | GPT-4o評価失敗（リトライ上限到達） | failed |
| failed | 手動再評価実行 | processing |

#### mintoku work同期ステータスの状態遷移

| 現在の状態 | イベント | 次の状態 |
|-----------|---------|---------|
| pending | 評価完了後、同期開始 | synced / failed |
| failed | 手動再送信実行 | synced / failed |

#### 失敗時の対応

| 失敗種別 | 対応 |
|---------|------|
| 評価処理失敗（failed） | 管理者に通知。管理画面から手動で再評価可能。ユーザー画面には「評価処理中にエラーが発生しました。しばらくお待ちください。」と表示 |
| mintoku work同期失敗（failed） | 管理者に通知。バッチ処理で定期的に再送試行（1時間ごと、最大24時間）。評価結果自体はユーザーに表示可能 |

### GET /api/v1/sessions/history
履歴取得

**クエリパラメータ**
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| limit | integer | 取得件数（デフォルト: 20） |
| offset | integer | オフセット（デフォルト: 0） |

**レスポンス（200 OK）**
```json
{
  "sessions": [
    {
      "session_id": "ses_456",
      "script_title": "IT企業向け基本面接",
      "total_score": 78,
      "completed_at": "2025-01-30T14:30:00Z"
    }
  ],
  "total": 24,
  "limit": 20,
  "offset": 0
}
```

## 10.4 評価API

> **評価体系について**
> 本システムでは、日本語能力評価（07_評価ロジック）と採用適性評価（13_面接シナリオ設計）の2つの評価を実施する。

### GET /api/v1/evaluations/{session_id}/status
評価ステータス取得（ポーリング用）

フィードバック画面でリアルタイムに評価処理の進捗を表示するためのポーリングAPI。

**レスポンス（200 OK）**
```json
{
  "session_id": "ses_456",
  "evaluation_status": "processing",
  "progress_percentage": 60,
  "estimated_remaining_seconds": 15
}
```

#### フィールド説明

| フィールド | 型 | 説明 |
|-----------|-----|------|
| session_id | string | セッションID |
| evaluation_status | string | 評価ステータス（pending, processing, completed, failed） |
| progress_percentage | number | 評価処理の進捗率（0-100） |
| estimated_remaining_seconds | number | 残り推定時間（秒）。completedの場合は0 |

#### evaluation_status の値

| 値 | 説明 |
|-----|------|
| pending | 評価処理待ち |
| processing | 評価処理中（GPT-4o呼び出し中） |
| completed | 評価完了 |
| failed | 評価失敗 |

#### クライアント側ポーリング仕様

| 項目 | 値 |
|------|-----|
| ポーリング間隔 | 2秒 |
| タイムアウト | 60秒（評価処理が60秒以内に完了しない場合はエラー表示） |
| 停止条件 | `evaluation_status` が `completed` または `failed` |

#### ポーリングフロー

```
1. セッション完了後、フィードバック画面に遷移
   ↓
2. GET /api/v1/evaluations/{session_id}/status を2秒間隔でポーリング
   ↓
3. evaluation_status を確認
   ├─ pending/processing → ローディング表示継続、2秒後に再ポーリング
   ├─ completed → GET /api/v1/evaluations/{session_id} で詳細取得、結果表示
   └─ failed → エラーモーダル表示
   ↓
4. 60秒経過してもcompleted/failedにならない場合
   → タイムアウトエラーモーダル表示
```

### GET /api/v1/evaluations/{session_id}
評価結果取得

**レスポンス（200 OK）**
```json
{
  "evaluation_id": "eval_123",
  "session_id": "ses_456",
  "total_score": 78,
  "recommendation": "採用を推奨",
  "japanese_proficiency": {
    "score": 71,
    "scores": {
      "vocabulary": 80,
      "grammar": 65,
      "content": 85,
      "honorifics": 55
    },
    "feedback": {
      "vocabulary": "適切な語彙を使用しています。",
      "grammar": "基本的な文法は正確ですが、複文の構造に注意が必要です。",
      "content": "質問の意図を正確に理解し、具体的な例を挙げて回答しています。",
      "honorifics": "謙譲語と尊敬語の区別が不明確な箇所がありました。"
    }
  },
  "aptitude": {
    "score": 4.0,
    "scores": {
      "adaptability": 4.0,
      "communication": 4.5,
      "initiative": 4.0,
      "retention": 4.0,
      "cooperation": 3.5
    },
    "feedback": {
      "adaptability": "日本文化への理解があり、困難を前向きに乗り越えている。",
      "communication": "日本語で明確に自分の意見を伝えることができる。",
      "initiative": "自ら学ぶ姿勢があり、成長への意欲が高い。",
      "retention": "長期的なビジョンがあり、定着意向が明確。",
      "cooperation": "チームワークを理解しているが、もう少し協調性が必要。"
    }
  },
  "overall_feedback": "全体的に良い回答でした。敬語の使い方に改善の余地がありますが、採用適性は高く評価できます。",
  "weak_points": [
    {
      "category": "honorifics",
      "category_type": "japanese_proficiency",
      "description": "謙譲語の使い方",
      "priority": "high",
      "example": "「いらっしゃる」と「おる」の使い分け"
    },
    {
      "category": "grammar",
      "category_type": "japanese_proficiency",
      "description": "接続助詞の選択",
      "priority": "medium",
      "example": "「〜ので」と「〜から」の使い分け"
    }
  ],
  "level_mismatch": {
    "detected": true,
    "declared_level": "N2",
    "actual_score": 52,
    "estimated_level": "N4",
    "gap_severity": "critical",
    "evidence": [
      "敬語スコア: 45点（N2期待: 70点以上）",
      "文法スコア: 52点（N2期待: 70点以上）",
      "語彙スコア: 58点（N2期待: 70点以上）"
    ],
    "recommendation": "申告レベルと実際の能力に大きな乖離があります。N4レベルでの再評価を推奨します。"
  },
  "evaluated_at": "2025-01-30T14:31:00Z"
}
```

#### level_mismatchフィールド説明

| フィールド | 型 | 説明 |
|-----------|-----|------|
| level_mismatch | object | JLPTレベル乖離検出結果 |
| level_mismatch.detected | boolean | 乖離が検出されたか |
| level_mismatch.declared_level | string | 申告されたJLPTレベル |
| level_mismatch.actual_score | number | 実際の日本語能力スコア（0-100） |
| level_mismatch.estimated_level | string | スコアから推定されるレベル |
| level_mismatch.gap_severity | string | 乖離の深刻度（none/minor/major/critical） |
| level_mismatch.evidence | string[] | 乖離の根拠となるスコア詳細 |
| level_mismatch.recommendation | string | 推奨アクション |

> **詳細**: 乖離検出ロジックの詳細は 07_評価ロジック 7.9 を参照。

### GET /api/v1/evaluations/summary
サマリー取得（学習進捗用）

**レスポンス（200 OK）**
```json
{
  "user_id": "usr_123456",
  "total_sessions": 24,
  "average_total_score": 72,
  "average_japanese_proficiency_score": 70,
  "average_aptitude_score": 3.8,
  "score_trend": [
    {"date": "2025-01-24", "total_score": 65, "japanese_proficiency": 62, "aptitude": 3.6},
    {"date": "2025-01-27", "total_score": 70, "japanese_proficiency": 68, "aptitude": 3.8},
    {"date": "2025-01-30", "total_score": 78, "japanese_proficiency": 71, "aptitude": 4.0}
  ],
  "weak_points_summary": [
    {"category": "honorifics", "category_type": "japanese_proficiency", "label": "敬語", "frequency": 15, "priority": "high"},
    {"category": "grammar", "category_type": "japanese_proficiency", "label": "文法", "frequency": 8, "priority": "medium"}
  ],
  "aptitude_summary": {
    "average_scores": {
      "adaptability": 3.9,
      "communication": 4.2,
      "initiative": 3.8,
      "retention": 3.6,
      "cooperation": 3.7
    },
    "strongest": "communication",
    "weakest": "retention"
  },
  "practice_time_minutes": 420,
  "jlpt_level": "N3"
}
```

## 10.5 質問API

> **注意**: 質問の作成・編集・削除は本システムの管理画面で行います。
> 管理者向けAPI（10.8）を参照してください。

### GET /api/v1/questions
質問一覧取得（セッション用）

**クエリパラメータ**
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| jlpt_level | string | JLPTレベル（N1-N5）（必須） |
| industry_id | string | 業界ID（任意） |

**レスポンス（200 OK）**
```json
{
  "jlptLevel": "N3",
  "industryId": "construction",
  "totalQuestions": 10,
  "questions": [
    {
      "id": "Q01",
      "order": 1,
      "text": "本日はお越しいただきありがとうございます。緊張していませんか？",
      "spokenText": "ほんじつはおこしいただきありがとうございます。きんちょうしていませんか？",
      "expectedDurationSeconds": 60,
      "evaluationCriteria": ["communication"]
    }
  ]
}
```

> **質問選択ロジック**
> - 質問バンク（60問）からカテゴリ別に10問を選択
> - JLPTレベルに応じてテキストを選択（N1-N3: `question_ja` / N4-N5: `question_simplified`）
> - 詳細は 12_面接フロー制御 12.3 を参照

#### API/DBフィールドの対応関係

| APIレスポンス | DBカラム | 説明 |
|--------------|---------|------|
| `id` | `question_bank.id` | 質問ID（Q01〜Q60） |
| `order` | 動的生成 | セッション内での質問順序（1〜10）。DBには保存せず、選択時に付与 |
| `text` | `question_bank.question_ja` または `question_simplified` | JLPTレベルに応じて選択 |
| `spokenText` | `question_bank.question_reading` | ふりがな付きテキスト（HeyGen発話用） |
| `expectedDurationSeconds` | 固定値（60秒） | 想定回答時間 |
| `evaluationCriteria` | `question_bank.evaluation_points` | 評価ポイント（JSON配列） |

#### データ変換フロー

```
DB: question_bank
├─ id: "Q01"
├─ question_ja: "本日はお越しいただきありがとうございます。緊張していませんか？"
├─ question_simplified: "今日は来てくれてありがとう。緊張していない？"
├─ question_reading: "ほんじつはおこしいただきありがとうございます。きんちょうしていませんか？"
└─ evaluation_points: ["communication"]

        ↓ 変換（JLPTレベル=N3の場合）

API Response:
├─ id: "Q01"
├─ order: 1  ← 動的に付与
├─ text: "本日はお越しいただきありがとうございます。緊張していませんか？"  ← question_ja
├─ spokenText: "ほんじつはおこしいただきありがとうございます..."  ← question_reading
├─ expectedDurationSeconds: 60  ← 固定値
└─ evaluationCriteria: ["communication"]  ← evaluation_points
```

### 10.5.1 スクリプトAPI

> **注意**: 実際の面接セッションではスクリプト（事前定義されたシナリオ）を使用します。
> セッション開始前にスクリプトを選択する必要があります。

#### GET /api/v1/scripts
スクリプト一覧取得

**クエリパラメータ**
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| industry_id | string | 業界ID（任意、フィルタリング用） |

**レスポンス（200 OK）**
```json
{
  "scripts": [
    {
      "id": "script_uuid",
      "title": "建設業界向け基本面接",
      "industry_id": "construction",
      "industry_name": "建設",
      "question_count": 10,
      "description": "建設業界で働く外国人向けの基本的な面接練習シナリオです。",
      "created_at": "2025-01-15T10:00:00Z"
    }
  ],
  "total": 7
}
```

#### GET /api/v1/scripts/{script_id}
スクリプト詳細取得（質問一覧含む）

**レスポンス（200 OK）**
```json
{
  "id": "script_uuid",
  "title": "建設業界向け基本面接",
  "industry_id": "construction",
  "industry_name": "建設",
  "description": "建設業界で働く外国人向けの基本的な面接練習シナリオです。",
  "questions": [
    {
      "id": "Q01",
      "order": 1,
      "text": "自己紹介をお願いします。",
      "spokenText": "じこしょうかいをおねがいします。",
      "expectedDurationSeconds": 60,
      "category": "introduction"
    }
  ],
  "question_count": 10,
  "created_at": "2025-01-15T10:00:00Z"
}
```

> **スクリプトと質問の関係**
> スクリプトは事前定義された質問セットを持ち、面接の流れが固定されています。
> 各スクリプトは特定の業界に紐づいており、その業界に関連する質問が含まれます。

## 10.6 外部API連携（mintoku work）

> **注意**: 本節のmintoku work連携API仕様（エンドポイントURL、リクエスト/レスポンス形式等）は設計時点での想定に基づく。mintoku work側のAPI仕様が正式公開された時点で確定・更新すること。

mintoku workとの連携は以下の2種類のAPIで構成されます。

| 連携方向 | API | 説明 |
|---------|-----|------|
| 本システム → mintoku work | POST /v1/interview-results | 練習完了時に評価結果を送信 |
| mintoku work → 本システム | POST /api/v1/webhooks/mintoku/user-update | ユーザー情報更新時に受信 |

### 10.6.1 評価結果送信API（本システム → mintoku work）

#### POST https://api.mintoku-work.com/v1/interview-results
練習完了時にmintoku workへ結果送信

> **送信データについて**
> 日本語能力評価（07_評価ロジック）と採用適性評価（13_面接シナリオ設計）の両方を送信する。

**認証**
| 項目 | 内容 |
|------|------|
| 方式 | API Key または OAuth2 Client Credentials **（※要確認: mintoku work側と認証方式を確定すること）** |
| ヘッダー | `Authorization: Bearer <api_key>` |

**リクエスト**
```json
{
  "user_id": "mintoku_user_123",
  "session_id": "ses_456",
  "completed_at": "2025-01-30T14:30:00Z",
  "total_score": 78,
  "recommendation": "採用を推奨",
  "japanese_proficiency": {
    "score": 71,
    "vocabulary": 80,
    "grammar": 65,
    "content": 85,
    "honorifics": 55
  },
  "aptitude": {
    "score": 4.0,
    "adaptability": 4.0,
    "communication": 4.5,
    "initiative": 4.0,
    "retention": 4.0,
    "cooperation": 3.5
  },
  "weak_points": [
    {"category": "honorifics", "category_type": "japanese_proficiency", "description": "謙譲語の使い方", "priority": "high"},
    {"category": "grammar", "category_type": "japanese_proficiency", "description": "接続助詞の選択", "priority": "medium"}
  ],
  "learning_plan": {
    "industry_id": "construction",
    "industry_name": "建設",
    "progress": {
      "completed_steps": 3,
      "total_steps": 6,
      "percentage": 50
    }
  },
  "level_mismatch": {
    "detected": false,
    "declared_level": "N3",
    "estimated_level": "N3"
  },
  "script_type": "建設業界向け基本面接",
  "jlpt_level": "N3",
  "practice_count": 24,
  "duration_seconds": 420
}
```

#### フィールド説明

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| user_id | string | ○ | mintoku work側のユーザーID |
| session_id | string | ○ | 本システムのセッションID |
| completed_at | string | ○ | セッション完了日時（ISO 8601） |
| total_score | number | ○ | 総合スコア（0-100） |
| recommendation | string | ○ | 採用推奨度（「採用を推奨」等） |
| japanese_proficiency | object | ○ | 日本語能力評価（詳細下記） |
| aptitude | object | ○ | 採用適性評価（詳細下記） |
| weak_points | array | ○ | 苦手項目リスト |
| learning_plan | object | △ | 学習計画進捗（業界設定時のみ） |
| level_mismatch | object | ○ | JLPTレベル乖離検出結果 |
| script_type | string | ○ | 使用したスクリプト種別 |
| jlpt_level | string | ○ | 申告JLPTレベル |
| practice_count | number | ○ | 累計練習回数 |
| duration_seconds | number | ○ | セッション所要時間（秒） |

**レスポンス（200 OK）**
```json
{
  "status": "received",
  "result_id": "mintoku_result_789"
}
```

**エラー時のリトライ**
| 項目 | 内容 |
|------|------|
| リトライ回数 | 最大3回 |
| リトライ間隔 | 指数バックオフ（1秒、2秒、4秒） |
| 失敗時 | ログ記録、管理者通知 |

### 10.6.2 ユーザー情報更新Webhook（mintoku work → 本システム）

#### POST /api/v1/webhooks/mintoku/user-update
mintoku workでユーザー情報が更新された際に呼び出される

**認証**
| 項目 | 内容 |
|------|------|
| 方式 | HMAC署名検証 |
| ヘッダー | `X-Mintoku-Signature: sha256=<signature>` |
| シークレット | 環境変数 `MINTOKU_WEBHOOK_SECRET` |

**リクエスト**
```json
{
  "event_type": "user.updated",
  "event_id": "evt_123456",
  "timestamp": "2025-01-30T14:00:00Z",
  "data": {
    "user_id": "mintoku_user_123",
    "updated_fields": ["preferred_industry", "jlpt_level"],
    "user": {
      "email": "user@example.com",
      "name": "山田 太郎",
      "organization": "ABC日本語学校",
      "jlpt_level": "N3",
      "preferred_industry": {
        "industry_id": "construction",
        "industry_name": "建設"
      }
    }
  }
}
```

#### 処理フロー

```
1. 署名検証
2. ユーザー存在確認（本システムに登録済みか）
3. 更新対象フィールドの判定
4. preferred_industryが更新された場合:
   - user_preferred_industries テーブル更新
   - 学習計画の再生成判定（12_面接フロー制御 12.10.3参照）
5. jlpt_levelが更新された場合:
   - users テーブル更新
```

**レスポンス（200 OK）**
```json
{
  "status": "processed",
  "actions": [
    "user_industries_updated",
    "learning_plan_regenerated"
  ]
}
```

**レスポンス（404 Not Found）** - ユーザーが未登録の場合
```json
{
  "status": "ignored",
  "reason": "user_not_found"
}
```

### 10.6.3 サポートする業界ID

| industry_id | 業界名（日本語） |
|-------------|-----------------|
| nursing_care | 介護 |
| food_service | 飲食 |
| construction | 建設 |
| manufacturing | 製造 |
| hospitality | 宿泊 |
| agriculture | 農業 |
| building_cleaning | ビルクリーニング |

## 10.7 エラーレスポンス形式

すべてのAPIは以下の形式でエラーを返します（RFC 7807準拠）。

```json
{
  "type": "https://api.example.com/errors/validation",
  "title": "Validation Error",
  "status": 400,
  "detail": "リクエストパラメータが不正です。",
  "instance": "/api/v1/sessions",
  "errors": [
    {
      "field": "jlpt_level",
      "message": "JLPTレベルは必須です。"
    }
  ]
}
```

| ステータスコード | 説明 |
|-----------------|------|
| 400 | Bad Request - リクエストパラメータエラー |
| 401 | Unauthorized - 認証エラー |
| 403 | Forbidden - 権限エラー |
| 404 | Not Found - リソース未発見 |
| 429 | Too Many Requests - レート制限 |
| 500 | Internal Server Error - サーバーエラー |

## 10.8 管理者向けAPI

### 認証

管理者向けAPIは本システム独自の認証を使用します。

#### POST /api/v1/admin/auth/login
管理者ログイン

**リクエスト**
```json
{
  "email": "admin@example.com",
  "password": "********"
}
```

**レスポンス（200 OK）**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "admin": {
    "id": "adm_123456",
    "email": "admin@example.com",
    "name": "管理者名",
    "role": "admin"
  }
}
```

### 質問管理

#### GET /api/v1/admin/questions
質問一覧取得

**クエリパラメータ**
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| category | string | カテゴリ（導入、過去、現在、未来、条件確認、クロージング） |
| jlpt_level | string | JLPTレベル（N1-N5） |
| industry | string | 業界 |
| limit | integer | 取得件数（デフォルト: 20） |
| offset | integer | オフセット（デフォルト: 0） |

**レスポンス（200 OK）**
```json
{
  "questions": [
    {
      "id": "Q01",
      "category": "introduction",
      "question_ja": "自己紹介をお願いします。",
      "question_simplified": "あなたの名前と、どこの国から来たか教えてください。",
      "difficulty": 1,
      "industries": ["all"],
      "created_at": "2025-01-30T10:00:00Z"
    }
  ],
  "total": 50,
  "limit": 20,
  "offset": 0
}
```

#### POST /api/v1/admin/questions
質問作成

**リクエスト**
```json
{
  "category_id": "introduction",
  "question_ja": "新しい質問文",
  "question_simplified": "簡易版の質問文",
  "difficulty": 2,
  "industries": ["nursing_care", "food_service"],
  "evaluation_points": ["日本語能力", "コミュニケーション力"]
}
```

**レスポンス（201 Created）**
```json
{
  "id": "Q51",
  "category_id": "introduction",
  "question_ja": "新しい質問文",
  "created_at": "2025-02-01T10:00:00Z"
}
```

#### PUT /api/v1/admin/questions/{question_id}
質問更新

#### DELETE /api/v1/admin/questions/{question_id}
質問削除（論理削除）

> **注意**: 回答データとの整合性を保つため、質問は論理削除のみ対応。
> 詳細は11_データベーススキーマ 11.7を参照。

### ユーザー管理

#### GET /api/v1/admin/users
ユーザー一覧取得

**クエリパラメータ**
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| search | string | 名前またはメールアドレスで検索（任意） |
| limit | integer | 取得件数（デフォルト: 20） |
| offset | integer | オフセット（デフォルト: 0） |

**レスポンス（200 OK）**
```json
{
  "users": [
    {
      "id": "usr_123456",
      "email": "user@example.com",
      "name": "山田 太郎",
      "organization": "ABC日本語学校",
      "jlpt_level": "N3",
      "total_sessions": 24,
      "last_session_at": "2025-01-30T14:30:00Z",
      "created_at": "2025-01-15T10:00:00Z"
    }
  ],
  "total": 100,
  "limit": 20,
  "offset": 0
}
```

### セッション管理（管理者向け）

#### GET /api/v1/admin/sessions
セッション一覧取得（管理者向け）

**クエリパラメータ**
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| user_id | string | ユーザーID（任意） |
| status | string | ステータス（in_progress, completed, cancelled）（任意） |
| from_date | string | 開始日（ISO 8601）（任意） |
| to_date | string | 終了日（ISO 8601）（任意） |
| limit | integer | 取得件数（デフォルト: 20） |
| offset | integer | オフセット（デフォルト: 0） |

**レスポンス（200 OK）**
```json
{
  "sessions": [
    {
      "session_id": "ses_456",
      "user_id": "usr_123456",
      "user_name": "山田 太郎",
      "script_title": "建設業界向け基本面接",
      "status": "completed",
      "total_score": 78,
      "started_at": "2025-01-30T14:00:00Z",
      "completed_at": "2025-01-30T14:30:00Z"
    }
  ],
  "total": 500,
  "limit": 20,
  "offset": 0
}
```

### 統計情報

#### GET /api/v1/admin/statistics
プラットフォーム統計情報取得

**クエリパラメータ**
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| from_date | string | 開始日（ISO 8601）（任意） |
| to_date | string | 終了日（ISO 8601）（任意） |

**レスポンス（200 OK）**
```json
{
  "total_users": 1250,
  "total_sessions": 8500,
  "completed_sessions": 7800,
  "average_score": 72.5,
  "score_distribution": {
    "85_100": 120,
    "70_84": 980,
    "55_69": 3200,
    "40_54": 2800,
    "0_39": 700
  },
  "sessions_today": 45,
  "sessions_this_week": 320,
  "sessions_this_month": 1200,
  "active_users_last_7_days": 320,
  "active_users_last_30_days": 850,
  "average_session_duration_seconds": 1800,
  "industry_breakdown": [
    {"industry_id": "construction", "industry_name": "建設", "session_count": 2500},
    {"industry_id": "nursing_care", "industry_name": "介護", "session_count": 2100},
    {"industry_id": "food_service", "industry_name": "飲食", "session_count": 1800}
  ]
}
```

## 10.9 顔分析API

面接中のユーザーの表情をリアルタイムで分析し、緊張度や感情状態をフィードバックするためのAPI。

### POST /api/v1/face/analyze
顔分析実行

**リクエスト**
```json
{
  "image_base64": "/9j/4AAQSkZJRgABAQEASABIAAD..."
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| image_base64 | string | ○ | Base64エンコード画像（JPEG推奨、最大幅320px） |

**レスポンス（200 OK - 顔検出成功）**
```json
{
  "success": true,
  "face_detected": true,
  "face_region": {
    "x": 100,
    "y": 50,
    "w": 200,
    "h": 200
  },
  "emotions": {
    "angry": 0.5,
    "disgust": 0.1,
    "fear": 15.3,
    "happy": 10.2,
    "sad": 3.1,
    "surprise": 2.5,
    "neutral": 68.3
  },
  "tension": {
    "tension_level": 0.25,
    "relax_level": 0.75,
    "dominant_emotion": "neutral",
    "feedback_message": "リラックスして話せていますね",
    "feedback_type": "positive"
  },
  "image_quality": {
    "average_brightness": 128.5,
    "brightness_status": "ok",
    "is_too_dark": false,
    "is_too_bright": false
  },
  "head_pose": {
    "yaw": -5.2,
    "pitch": 3.1,
    "roll": 1.5,
    "is_looking_at_camera": true,
    "face_direction": "center",
    "feedback_message": "カメラをしっかり見ていますね"
  }
}
```

**レスポンス（200 OK - 顔未検出）**
```json
{
  "success": true,
  "face_detected": false,
  "image_quality": {
    "average_brightness": 35.2,
    "brightness_status": "too_dark",
    "is_too_dark": true,
    "is_too_bright": false
  },
  "error_message": "照明が暗すぎて顔を検出できません。明るい場所に移動してください"
}
```

#### レスポンスフィールド説明

| フィールド | 型 | 説明 |
|-----------|-----|------|
| success | boolean | API処理成功フラグ |
| face_detected | boolean | 顔検出成功フラグ |
| face_region | object | 検出された顔の領域座標 |
| emotions | object | 7種類の感情スコア（0-100） |
| tension | object | 緊張度分析結果 |
| image_quality | object | 画像品質情報 |
| head_pose | object | 顔の向き情報 |
| error_message | string | エラーメッセージ（顔未検出時等） |

#### emotions フィールド詳細

| フィールド | 型 | 説明 |
|-----------|-----|------|
| angry | float | 怒りのスコア（0-100） |
| disgust | float | 嫌悪のスコア（0-100） |
| fear | float | 恐怖・不安のスコア（0-100） |
| happy | float | 喜びのスコア（0-100） |
| sad | float | 悲しみのスコア（0-100） |
| surprise | float | 驚きのスコア（0-100） |
| neutral | float | 平静のスコア（0-100） |

#### tension フィールド詳細

| フィールド | 型 | 説明 |
|-----------|-----|------|
| tension_level | float | 緊張度（0.0=リラックス〜1.0=緊張） |
| relax_level | float | リラックス度（0.0=緊張〜1.0=リラックス） |
| dominant_emotion | string | 最も強い感情（angry/disgust/fear/happy/sad/surprise/neutral） |
| feedback_message | string | ユーザーへのフィードバックメッセージ |
| feedback_type | string | フィードバックの種類（positive/neutral/negative） |

#### 緊張度算出ロジック

```
緊張度 = min(1.0, fear×1.5 + angry×0.8 + sad×0.5 + (1-neutral)×0.3)
リラックス度 = min(1.0, neutral×0.7 + happy×0.3)
```

#### image_quality フィールド詳細

| フィールド | 型 | 説明 |
|-----------|-----|------|
| average_brightness | float | 平均明るさ（0=黒〜255=白） |
| brightness_status | string | 明るさ状態（ok/too_dark/too_bright/unknown） |
| is_too_dark | boolean | 暗すぎるかどうか（閾値: 50未満） |
| is_too_bright | boolean | 明るすぎるかどうか（閾値: 220超過） |

#### head_pose フィールド詳細

| フィールド | 型 | 説明 |
|-----------|-----|------|
| yaw | float | 左右の向き（度）: 負=左, 0=正面, 正=右 |
| pitch | float | 上下の向き（度）: 負=下, 0=正面, 正=上 |
| roll | float | 首の傾き（度）: 負=左傾き, 0=正面, 正=右傾き |
| is_looking_at_camera | boolean | カメラを見ているか（yaw/pitchが±15度以内） |
| face_direction | string | 顔の向き（center/left/right/up/down/away） |
| feedback_message | string | ユーザーへのフィードバック |

#### 使用技術

| 機能 | 技術 | 説明 |
|------|------|------|
| 感情認識 | DeepFace | 7種類の感情を検出 |
| 顔の向き検出 | MediaPipe Face Mesh | 3D座標からEuler角を算出 |
| 画像品質分析 | OpenCV/PIL | グレースケール変換後の平均輝度を計算 |

#### クライアント側の実装仕様

| 項目 | 値 |
|------|-----|
| 分析間隔 | 2秒ごと |
| 画像フォーマット | JPEG（品質80%） |
| 最大画像サイズ | 幅320px（パフォーマンスのため縮小推奨） |
| タイムアウト | 5秒 |

---

## 10.10 セッション管理

### セッションタイムアウト

| 種別 | タイムアウト時間 | 備考 |
|------|-----------------|------|
| アクセストークン | 1時間 | リフレッシュトークンで延長可能 |
| リフレッシュトークン | 30日 | ローテーション方式 |
| 面接セッション | 60分 | 面接中は自動延長 |

> **面接中のセッション管理**
> 面接セッション中はアクティビティが継続する限りセッションタイムアウトを自動延長します。
> 面接時間（最大45分）を考慮し、面接セッションタイムアウトは60分に設定。
