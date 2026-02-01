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
    "jlpt_level": "N3"
  }
}
```

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
  "script_id": "scr_789",
  "jlpt_level": "N3"
}
```

**レスポンス（201 Created）**
```json
{
  "session_id": "ses_456",
  "script": {
    "id": "scr_789",
    "title": "IT企業向け基本面接",
    "total_questions": 10
  },
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

## 10.5 スクリプトAPI（読み取り専用）

> **注意**: スクリプトの作成・編集・削除はmintoku workの管理画面で行います。
> 本システムはスクリプトの読み取りのみ対応します。

### GET /api/v1/scripts
スクリプト一覧取得

**クエリパラメータ**
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| jlpt_level | string | JLPTレベル（N1-N5） |
| industry | string | 業界 |
| job_type | string | 職種 |

**レスポンス（200 OK）**
```json
{
  "scripts": [
    {
      "id": "scr_789",
      "title": "IT企業向け基本面接",
      "industry": "IT",
      "job_type": "エンジニア",
      "jlpt_level": "N3",
      "question_count": 10,
      "estimated_duration_minutes": 15
    }
  ]
}
```

### GET /api/v1/scripts/{script_id}
スクリプト詳細取得

**レスポンス（200 OK）**
```json
{
  "id": "scr_789",
  "title": "IT企業向け基本面接",
  "industry": "IT",
  "job_type": "エンジニア",
  "jlpt_level": "N3",
  "questions": [
    {
      "id": 1,
      "order": 1,
      "text": "自己紹介をお願いします。",
      "expected_duration_seconds": 60,
      "evaluation_criteria": ["明瞭さ", "構成", "敬語"]
    }
  ]
}
```

## 10.6 外部API連携（mintoku work）

### POST https://api.mintoku-work.com/v1/interview-results
練習完了時にmintoku workへ結果送信

> **送信データについて**
> 日本語能力評価（07_評価ロジック）と採用適性評価（13_面接シナリオ設計）の両方を送信する。

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
    {"category": "honorifics", "description": "謙譲語の使い方", "priority": "high"},
    {"category": "grammar", "description": "接続助詞の選択", "priority": "medium"}
  ],
  "script_type": "IT企業向け基本面接",
  "jlpt_level": "N3",
  "practice_count": 24,
  "duration_seconds": 420
}
```

**レスポンス（200 OK）**
```json
{
  "status": "received",
  "result_id": "mintoku_result_789"
}
```

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
      "field": "script_id",
      "message": "スクリプトIDは必須です。"
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
