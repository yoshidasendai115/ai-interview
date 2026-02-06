# ngrok公開 — Claude作業手順書

## 目的

ユーザーから「ngrokで公開して」と依頼された際に、Claudeが実行する手順をまとめたもの。

---

## 前提条件

- ngrokがインストール済み（`brew install ngrok`）
- ngrokのAuthTokenが設定済み
- フロントエンド（Next.js）がポート3000で起動済み

---

## 手順

### 1. ngrokのインストール確認

```bash
which ngrok && ngrok version
```

インストールされていない場合は `brew install ngrok` を案内する。

### 2. ローカルサーバーの起動確認

```bash
lsof -i :3000 -P -n | head -5
```

- 出力がある → サーバー起動中。手順3へ進む。
- 出力がない → ユーザーに「フロントエンドが起動していません。`cd poc && npm run dev` で起動してください」と案内する。

### 3. 既存のngrokプロセスを確認

```bash
pgrep -f "ngrok http" && echo "ngrok is running" || echo "ngrok not running"
```

- 既に起動中の場合 → 手順5へスキップ（URLの確認のみ行う）

### 4. ngrokを起動

```bash
ngrok http 3000 > /tmp/ngrok-output.log 2>&1 &
```

起動後、3秒待つ。

### 5. 公開URLを確認

Playwright MCPでngrok管理画面にアクセスする:

```
browser_navigate → http://127.0.0.1:4040
```

スナップショットの中に以下の形式のURLが表示される:

```
https://xxxx-xxx-xxx.ngrok-free.app
```

このURLをユーザーに伝える。

### 6. 完了通知

```bash
osascript -e 'display notification "ngrok公開完了: https://xxxx-xxx-xxx.ngrok-free.app" with title "ai-interview"'
```

---

## 停止が必要な場合

```bash
pkill -f ngrok
```

---

## やらないこと

- バックエンドの`.env`作成やvenv構築は不要（聞かれない限り対応しない）
- ngrok設定ファイル（`ngrok.yml`）のトンネル設定変更は不要
- CORS設定の変更は不要
- 複雑なセットアップは一切不要。`ngrok http 3000` の1コマンドで完了する
