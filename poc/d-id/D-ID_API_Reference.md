# D-ID API リファレンス

## 概要

D-IDは2つの主要な開発パスを提供:
1. **リアルタイムAIエージェント** - WebRTCによる低レイテンシ対話
2. **非同期ビデオ生成** - 写真からの動画生成

---

## 認証

### Basic認証

```
Authorization: Basic API_USERNAME:API_PASSWORD
```

### API Key取得方法
1. [D-ID Studio](https://studio.d-id.com/account-settings) にアクセス
2. Account Settings → API Keys で生成

---

## SDK インストール

```bash
npm i @d-id/client-sdk
```

---

## SDK 初期化

```javascript
import * as sdk from "@d-id/client-sdk"

// 認証情報
const agentId = "agt_xxxxx"  // D-ID Studioで取得
const auth = { type: 'key', clientKey: "your_client_key" }

// コールバック関数
const callbacks = {
  // 必須: ビデオストリームをHTML要素に接続
  onSrcObjectReady(value) {
    videoElement.srcObject = value
    return value
  },

  // ストリーミング状態の監視
  onVideoStateChange(state) {
    // state: "STOP" | "PLAYING"
    console.log('Video state:', state)
  },

  // 接続状態の監視
  onConnectionStateChange(state) {
    // state: "new" | "fail" | "connecting" | "connected" | "disconnected" | "closed"
    console.log('Connection:', state)
  },

  // チャットメッセージの受信
  onNewMessage(messages, type) {
    // type: "partial" | "answer"
    console.log('Message:', messages)
  },

  // エラーハンドリング
  onError(error, errorData) {
    console.error('Error:', error, errorData)
  }
}

// ストリーム設定
const streamOptions = {
  compatibilityMode: "auto",  // "on"(VP8) | "off"(H264) | "auto"
  streamWarmup: true,          // ウォームアップビデオを有効化
  sessionTimeout: 300,         // セッションタイムアウト（秒）
  outputResolution: 512,       // 出力解像度（150-1080）
  fluent: true                 // V3 Proアバター用の連続ストリーミング
}

// AgentManager作成
const agentManager = await sdk.createAgentManager(agentId, {
  auth,
  callbacks,
  streamOptions
})
```

---

## コアメソッド

### 接続管理

```javascript
// 新しいWebRTC接続を確立
await agentManager.connect()

// 同じチャットIDでセッションを復元
await agentManager.reconnect()

// 接続を閉じる
await agentManager.disconnect()
```

### エージェントとの対話

```javascript
// テキストから動画をストリーミング
await agentManager.speak({
  type: 'text',
  input: 'こんにちは、面接を始めましょう。'
})

// 音声入力からストリーミング（音声データを渡す場合）
await agentManager.speak({
  type: 'audio',
  input: audioBlob
})

// チャットメッセージを送信（LLMが応答を生成）
await agentManager.chat('自己紹介をしてください')

// レスポンスを評価
await agentManager.rate(messageId, score)
```

### プロパティ

```javascript
// エージェント情報
const agentInfo = agentManager.agent

// 会話スターター
const starters = agentManager.starterMessages
```

---

## ストリームオプション

| オプション | 型 | 説明 |
|-----------|-----|------|
| `compatibilityMode` | string | `"on"`(VP8), `"off"`(H264), `"auto"` |
| `streamWarmup` | boolean | ウォームアップビデオを有効化 |
| `sessionTimeout` | number | メッセージ間の最大時間（秒、最大300） |
| `outputResolution` | number | 動画の高さ/幅（150-1080） |
| `fluent` | boolean | V3 Proアバター用連続ストリーミング |

---

## コールバック関数

| コールバック | 説明 | 引数 |
|-------------|------|------|
| `onSrcObjectReady` | **必須** ビデオストリームを接続 | `MediaStream` |
| `onVideoStateChange` | ストリーミング状態変更 | `"STOP"` \| `"PLAYING"` |
| `onConnectionStateChange` | 接続状態変更 | 接続状態文字列 |
| `onNewMessage` | チャットメッセージ受信 | `messages`, `type` |
| `onError` | エラー発生 | `error`, `errorData` |

---

## API エンドポイント

### Agents API

| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/agents` | POST | 新しいエージェントを作成 |
| `/agents` | GET | エージェント一覧を取得 |
| `/agents/{id}` | GET | 特定のエージェントを取得 |
| `/agents/{id}` | PATCH | エージェントを更新 |
| `/agents/{id}` | DELETE | エージェントを削除 |

### エージェント作成リクエスト例

```javascript
const response = await fetch('https://api.d-id.com/agents', {
  method: 'POST',
  headers: {
    'Authorization': 'Basic ' + btoa('username:password'),
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: '面接官アバター',
    presenter: {
      type: 'talk',
      source_url: 'https://example.com/avatar.jpg'
    },
    voice: {
      type: 'microsoft',
      voice_id: 'ja-JP-NanamiNeural'
    },
    llm: {
      type: 'openai',
      instructions: '日本語面接官として振る舞ってください'
    }
  })
})
```

---

## Knowledge（ナレッジベース）

### 概要
RAGベースのナレッジベースを作成し、エージェントにコンテキストを提供

### 作成方法
1. D-ID Studioで直接作成
2. Knowledge APIを使用

### エージェントへの紐付け
エージェント作成時または更新時にKnowledge IDを指定

---

## 実装例（React/Next.js）

```typescript
'use client'

import { useRef, useState, useCallback } from 'react'
import * as sdk from '@d-id/client-sdk'

export default function InterviewAvatar() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [agentManager, setAgentManager] = useState<any>(null)
  const [isConnected, setIsConnected] = useState(false)

  const connect = useCallback(async () => {
    const manager = await sdk.createAgentManager(
      process.env.NEXT_PUBLIC_DID_AGENT_ID!,
      {
        auth: {
          type: 'key',
          clientKey: process.env.NEXT_PUBLIC_DID_API_KEY!
        },
        callbacks: {
          onSrcObjectReady: (stream) => {
            if (videoRef.current) {
              videoRef.current.srcObject = stream
            }
            return stream
          },
          onConnectionStateChange: (state) => {
            setIsConnected(state === 'connected')
          }
        },
        streamOptions: {
          compatibilityMode: 'auto',
          streamWarmup: true
        }
      }
    )

    await manager.connect()
    setAgentManager(manager)
  }, [])

  const speak = useCallback(async (text: string) => {
    if (agentManager) {
      await agentManager.speak({ type: 'text', input: text })
    }
  }, [agentManager])

  const chat = useCallback(async (message: string) => {
    if (agentManager) {
      await agentManager.chat(message)
    }
  }, [agentManager])

  return (
    <div>
      <video ref={videoRef} autoPlay playsInline />
      <button onClick={connect} disabled={isConnected}>
        接続
      </button>
      <button onClick={() => speak('こんにちは')}>
        発話テスト
      </button>
    </div>
  )
}
```

---

## 参考リンク

- [Agents SDK Overview](https://docs.d-id.com/reference/agents-sdk-overview)
- [Getting Started](https://docs.d-id.com/reference/get-started)
- [GitHub Demo](https://github.com/de-id/agents-sdk-demo)
- [D-ID Studio](https://studio.d-id.com/)

---

## 注意事項

1. **SDKはフロントエンド専用** - エージェントとナレッジベースの作成はAPI経由またはD-ID Studioで行う
2. **ドメイン許可設定が必要** - D-ID StudioでエージェントのAllowed Domainsを設定
3. **Talks/Clips Streamsはレガシー** - 新規開発はAgents SDKを推奨
4. **V3 Proアバターのみ** - fluent streaming（連続ストリーミング）対応
