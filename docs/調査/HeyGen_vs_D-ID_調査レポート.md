# HeyGen API vs D-ID API 調査レポート

## 調査目的
AI面接練習プラットフォームにおける動的アバター生成（リップシンク対応）の技術選定

---

## 比較サマリー

| 項目 | HeyGen | D-ID |
|------|--------|------|
| **リップシンク精度** | 高精度（diffusionベース） | ±30ms以内（CTCベース） |
| **リアルタイム対応** | LiveAvatar（WebRTC） | Agents Streams（WebRTC） |
| **日本語対応** | ✅ 140言語以上 | ✅ 119言語以上 |
| **レイテンシ** | 低レイテンシ（未公開） | 200ms以下 |
| **SDK** | `@heygen/streaming-avatar` | `@d-id/client-sdk` |
| **月額料金（API）** | $99〜（Pro） | $49.99〜（Pro） |
| **1分あたりコスト** | $3〜$6 | 要確認 |
| **最大動画時間** | 3分（Photo-to-Video）| プランによる |

---

## HeyGen API

### 特徴
- **Avatar IV**: 単一画像から高品質なアバター生成
- **LiveAvatar**: GPT-4統合のリアルタイム対話
- 写真リアル、アニメ、スタイライズドキャラクター対応
- 自然な頭の動き、微細な表情、ハンドジェスチャー

### 料金体系

| プラン | クレジット/月 | 月額 | クレジット単価 |
|--------|--------------|------|---------------|
| Free | 10 | 無料 | - |
| Pro | 100 | $99 | $0.99 |
| Scale | 660 | $330 | $0.50 |
| Enterprise | カスタム | 要相談 | 交渉可 |

**クレジット消費**
- Avatar IV動画: 6クレジット/分
- 1分の面接動画コスト: $3〜$6

### 技術統合
```bash
npm i @heygen/streaming-avatar
```
- React/NextJS対応
- WebRTCストリーミング
- OpenAI Realtime API統合可能

---

## D-ID API

### 特徴
- **Express Avatars**: 高速・スケーラブルなアバター生成
- **Premium+ Avatars**: ハイパーリアリスティックな高品質
- リアルタイムLLM統合対応
- 100FPSレンダリング（事前生成時）

### 料金体系

| プラン | 時間/月 | 月額 |
|--------|---------|------|
| Free | 制限あり | 無料（透かし付き） |
| Lite | 10分 | $5.99 |
| Pro | 15分 | $49.99 |
| Advanced | 65分 | $299.99 |
| Enterprise | カスタム | 要相談 |

### 技術統合
```bash
npm install @d-id/client-sdk
```
- Node.js SDK: `@d-id/node-sdk`
- WebRTC対応
- REST API（Python等から直接呼び出し可）

---

## 面接練習アプリへの適用

### ユースケース別推奨

| ユースケース | 推奨 | 理由 |
|-------------|------|------|
| **MVP/コスト重視** | D-ID | 月額$49.99〜で開始可能 |
| **高品質リアルタイム** | HeyGen | LiveAvatar + GPT-4統合が成熟 |
| **日本語面接練習** | どちらも可 | 両方とも日本語対応 |
| **大量バッチ生成** | D-ID | 100FPSレンダリング |

### 技術構成案

```
┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│   Frontend   │────▶│   Backend   │────▶│ HeyGen/D-ID  │
│   (React)    │◀────│  (FastAPI)  │◀────│     API      │
│              │     │             │     └──────────────┘
│  WebRTC      │     │  OpenAI     │
│  Streaming   │     │  GPT-4o     │
└──────────────┘     └─────────────┘
```

---

## PoC実装

### 検証環境
- `/poc/` ディレクトリにNext.js検証プロジェクトを構築
- HeyGen Streaming Avatar SDK統合
- D-ID Client SDK統合
- 評価フォーム（5段階評価 + レイテンシ計測）

### セットアップ手順

```bash
cd poc
npm install
cp .env.example .env.local
# .env.localにAPI Keyを設定
npm run dev
```

### 検証項目

| 項目 | 確認内容 | 合格基準 |
|------|----------|----------|
| 日本語TTS品質 | 自然さ、イントネーション | ネイティブに近い発音 |
| リップシンク精度 | 口の動きと音声の同期 | 違和感なし |
| レイテンシ | 入力から応答までの時間 | 500ms以下 |
| SDK統合 | React/FastAPIとの連携 | 問題なく動作 |

---

## PoC検証結果

### 検証日
2025-01-31

### 評価結果

| 評価項目 | HeyGen | D-ID | 備考 |
|----------|--------|------|------|
| 日本語TTS品質 | 4/5 | 4/5 | 両方とも良好 |
| リップシンク精度 | 4/5 | 4/5 | 両方とも自然 |
| セリフ発話精度 | 5/5 | 3/5 | HeyGenはTaskType.REPEATで正確、D-IDはLLM解釈が入る |
| SDK使いやすさ | 4/5 | 3/5 | HeyGenはシンプル、D-IDはAgent設定が複雑 |
| ドキュメント充実度 | 4/5 | 3/5 | HeyGenの方が分かりやすい |
| **総合評価** | **21/25** | **17/25** | |

### 選定結果

**✅ HeyGen を採用**

### 選定理由

1. **正確なセリフ発話**: `TaskType.REPEAT` により、面接官のセリフを正確に発話可能
2. **シンプルな統合**: SDKがシンプルで、React/Next.jsとの統合が容易
3. **制御性**: LLMの解釈を介さず、意図通りの発話を実現
4. **ドキュメント**: 公式ドキュメントが充実

### D-IDを見送った理由

- Agent SDKはLLMとの対話を前提としており、固定セリフの発話に不向き
- セリフを送信してもLLMが解釈・変更してしまう
- 設定が複雑（embed設定、allowed_domains等）

---

## 成果物

- [x] HeyGen検証コード（`/poc/src/components/HeyGenAvatar.tsx`）
- [x] D-ID検証コード（`/poc/src/components/DIdAvatar.tsx`）
- [x] 評価フォーム（`/poc/src/components/EvaluationForm.tsx`）
- [x] メトリクス自動収集機能（`/poc/src/context/MetricsContext.tsx`）
- [x] 評価結果レポート
- [x] 設計書更新（選定理由含む）

---

## 今後の実装方針

### HeyGen統合アーキテクチャ

```
┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│   Frontend   │────▶│   Backend   │────▶│   HeyGen     │
│   (React)    │◀────│  (FastAPI)  │     │   API        │
│              │     │             │     └──────────────┘
│  WebRTC      │     │  OpenAI     │
│  Streaming   │     │  GPT-4o     │
└──────────────┘     └─────────────┘
                            │
                            ▼
                     ┌─────────────┐
                     │ Google STT  │
                     │ (音声認識)   │
                     └─────────────┘
```

### 実装ステップ

1. **Phase 2-1**: HeyGen SDK本番統合
   - 面接官アバター（Wayne）の実装
   - 面接フロー制御の実装

2. **Phase 2-2**: 音声認識連携
   - ユーザー音声 → Google STT → テキスト化
   - GPT-4oによる評価生成

3. **Phase 2-3**: 評価フィードバック
   - LLMによる回答評価
   - 次の質問の動的生成
