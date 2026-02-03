# Avatar PoC - HeyGen vs D-ID

AI面接練習プラットフォーム用アバター技術の検証プロジェクト

## 目的

HeyGenとD-IDの無料トライアルを使用し、面接練習アプリに適したサービスを選定する。

## 検証項目

| 項目 | 確認内容 | 合格基準 |
|------|----------|----------|
| 日本語TTS品質 | 自然さ、イントネーション | ネイティブに近い発音 |
| リップシンク精度 | 口の動きと音声の同期 | 違和感なし |
| レイテンシ | 入力から応答までの時間 | 500ms以下 |
| SDK統合 | React/NextJSとの連携 | 問題なく動作 |

## セットアップ

### 1. API Keyの取得

#### HeyGen
1. [HeyGen](https://app.heygen.com/)でアカウント作成
2. Settings > API > Copy API Token

#### D-ID
1. [D-ID Studio](https://studio.d-id.com/)でアカウント作成
2. Account Settings > API Keys
3. エージェントを作成してAgent IDを取得

### 2. 環境変数の設定

```bash
cp .env.example .env.local
```

`.env.local`を編集:

```
NEXT_PUBLIC_HEYGEN_API_KEY=your_heygen_api_key_here
NEXT_PUBLIC_HEYGEN_AVATAR_ID=Ann_Therapist_public
NEXT_PUBLIC_DID_API_KEY=your_did_api_key_here
NEXT_PUBLIC_DID_AGENT_ID=your_did_agent_id_here
```

#### 利用可能なパブリックアバターID

| アバターID | 説明 |
|------------|------|
| `Ann_Therapist_public` | セラピスト（女性） - デフォルト |
| `Shawn_Therapist_public` | セラピスト（男性） |
| `Bryan_FitnessCoach_public` | フィットネスコーチ |
| `Dexter_Doctor_Standing2_public` | 医師（立ち姿） |
| `Elenora_IT_Sitting_public` | IT専門家（着席） |

カスタムアバターを使用する場合は、[HeyGenダッシュボード](https://app.heygen.com/)からアバターIDを取得してください。

### 3. 依存関係のインストール

```bash
npm install
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開く。

## 使い方

### HeyGen検証

1. 「HeyGen」タブを選択
2. 「アバターを起動」をクリック
3. テスト発話ボタンで日本語発話を確認
4. メトリクス（初期化時間、レイテンシ）を記録

### D-ID検証

1. 「D-ID」タブを選択
2. 「エージェントを起動」をクリック
3. テスト発話ボタンで日本語発話を確認
4. メトリクス（初期化時間、レイテンシ）を記録

### 評価

1. 「評価比較」タブを選択
2. 各項目を5段階で評価
3. レイテンシを記入
4. 備考を追加
5. 「評価レポートをエクスポート」でJSONファイルを保存

## プロジェクト構造

```
poc/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   └── components/
│       ├── HeyGenAvatar.tsx
│       ├── DIdAvatar.tsx
│       └── EvaluationForm.tsx
├── package.json
├── tsconfig.json
├── next.config.mjs
├── .env.example
└── README.md
```

## トラブルシューティング

### HeyGen接続エラー

- API Keyが正しいか確認
- ブラウザのコンソールでエラーメッセージを確認
- CORS設定を確認

### HeyGen 400 Bad Request エラー

`POST https://api.heygen.com/v1/streaming.new 400 (Bad Request)` が発生する場合:

1. **アバターIDを確認**: 無効なアバターIDを使用している可能性があります
   - `NEXT_PUBLIC_HEYGEN_AVATAR_ID` に有効なパブリックアバターIDを設定
   - 例: `Ann_Therapist_public`
2. **APIプランを確認**: 一部のアバターは特定のプランでのみ利用可能
3. **トークン取得を確認**: コンソールに `[HeyGen] Session token obtained` が表示されているか確認

### D-ID接続エラー

- API KeyとAgent IDが正しいか確認
- エージェントが正しく設定されているか確認
- WebRTC接続がブロックされていないか確認

### 音声が出ない

- ブラウザのサウンド設定を確認
- `muted`属性が設定されていないか確認
- ブラウザの自動再生ポリシーを確認（ユーザー操作後に再生）

## 評価結果テンプレート

| 評価項目 | HeyGen | D-ID | 備考 |
|----------|--------|------|------|
| 日本語TTS品質 | /5 | /5 | |
| リップシンク精度 | /5 | /5 | |
| レイテンシ | ms | ms | |
| SDK使いやすさ | /5 | /5 | |
| ドキュメント充実度 | /5 | /5 | |
| **総合評価** | /20 | /20 | |
