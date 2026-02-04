# 10. API仕様

## 10.1 API設計方針

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
> 詳細は 12_面接フロー制御 12.10節 を参照。

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
  "jlpt_level": "N3",
  "industry_id": "construction",
  "is_challenge": false
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| jlpt_level | string | ○ | 練習時のJLPTレベル（N1-N5） |
| industry_id | string | △ | 業界ID（ユーザーの希望業界を使用、未指定時は汎用質問） |
| is_challenge | boolean | × | チャレンジモードかどうか（デフォルト: false） |

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

### GET /api/v1/evaluations/{session_id}
評価結果取得

**レスポンス（200 OK）**
```json
{
  "evaluation_id": "eval_123",
  "session_id": "ses_456",
  "total_score": 78,
  "grade": "B",
  "grade_label": "優秀",
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

> **詳細**: 乖離検出ロジックの詳細は 07_評価ロジック 7.9節 を参照。

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
> 管理者向けAPI（10.8節）を参照してください。

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
> - 詳細は 12_面接フロー制御 12.3節 を参照

## 10.6 外部API連携（mintoku work）

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
| 方式 | API Key または OAuth2 Client Credentials |
| ヘッダー | `Authorization: Bearer <api_key>` |

**リクエスト**
```json
{
  "user_id": "mintoku_user_123",
  "session_id": "ses_456",
  "completed_at": "2025-01-30T14:30:00Z",
  "total_score": 78,
  "grade": "B",
  "grade_label": "優秀",
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
| grade | string | ○ | グレード（S/A/B/C/D） |
| grade_label | string | ○ | グレードラベル（「優秀」等） |
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
   - 学習計画の再生成判定（12_面接フロー制御 12.10.3節参照）
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

> **※ 業界マスターの正式定義は `backend/app/data/seed/industries.json` を参照**

| industry_id | 業界名（日本語） |
|-------------|-----------------|
| nursing_care | 介護 |
| food_service | 飲食 |
| construction | 建設 |
| manufacturing | 製造 |
| hospitality | 宿泊 |
| agriculture | 農業 |
| building_cleaning | ビルクリーニング |

> **業界IDの追加**
> 新しい業界を追加する場合は、`backend/app/data/seed/industries.json` を更新し、両システムで同期が必要です。

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
> 詳細は11_データベーススキーマ 11.7節を参照。

## 10.9 セッション管理

### セッションタイムアウト

| 種別 | タイムアウト時間 | 備考 |
|------|-----------------|------|
| アクセストークン | 1時間 | リフレッシュトークンで延長可能 |
| リフレッシュトークン | 30日 | ローテーション方式 |
| 面接セッション | 60分 | 面接中は自動延長 |

> **面接中のセッション管理**
> 面接セッション中はアクティビティが継続する限りセッションタイムアウトを自動延長します。
> 面接時間（最大45分）を考慮し、面接セッションタイムアウトは60分に設定。
