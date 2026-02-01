'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useMetrics } from '@/context/MetricsContext';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

interface LogEntry {
  time: string;
  type: 'info' | 'error' | 'success' | 'chat';
  message: string;
}

interface Metrics {
  initTime: number | null;
  speakLatency: number | null;
  totalSpeakTime: number | null;
}

// 面接官（アバター）が話すセリフ
const INTERVIEWER_PHRASES = [
  'こんにちは。本日は面接にお越しいただきありがとうございます。',
  'それでは、まず自己紹介をお願いできますか？',
  'ありがとうございます。あなたの強みを教えてください。',
  '前職ではどのような業務を担当されていましたか？',
  '弊社を志望された理由をお聞かせください。',
  '最後に、何かご質問はありますか？',
];

// ユーザーからエージェントへの会話開始メッセージ
const STARTER_MESSAGES = [
  '面接を始めてください',
  '自己紹介の練習をしたいです',
  '志望動機の練習をしたいです',
];

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface DIdAgentManager {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  reconnect: () => Promise<void>;
  speak: (params: { type: string; input: string }) => Promise<unknown>;
  chat: (message: string) => Promise<void>;
  agent: {
    preview_name: string;
    greetings?: string[];
  };
  starterMessages?: string[];
}

export default function DIdAvatar() {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    initTime: null,
    speakLatency: null,
    totalSpeakTime: null,
  });
  const [userInput, setUserInput] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [agentName, setAgentName] = useState<string>('');

  const { updateDidMetrics } = useMetrics();

  const agentManagerRef = useRef<DIdAgentManager | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const initStartTimeRef = useRef<number>(0);
  const speakStartTimeRef = useRef<number>(0);

  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    const time = new Date().toLocaleTimeString('ja-JP');
    setLogs((prev) => [...prev.slice(-49), { time, type, message }]);
  }, []);

  const addChatMessage = useCallback((role: ChatMessage['role'], content: string) => {
    setChatMessages((prev) => [...prev, { role, content, timestamp: new Date() }]);
  }, []);

  // メトリクスが更新されたらコンテキストにも反映
  useEffect(() => {
    updateDidMetrics({
      initTime: metrics.initTime,
      speakLatency: metrics.speakLatency,
      totalSpeakTime: metrics.totalSpeakTime,
    });
  }, [metrics, updateDidMetrics]);

  // チャットコンテナを最下部にスクロール
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const initAgent = useCallback(async () => {
    // Client Key（SDK用）- 環境変数から取得
    const clientKey = process.env.NEXT_PUBLIC_DID_CLIENT_KEY;
    // エージェントID - 環境変数から取得
    const agentId = process.env.NEXT_PUBLIC_DID_AGENT_ID;

    if (!clientKey) {
      addLog('error', 'NEXT_PUBLIC_DID_CLIENT_KEY が設定されていません');
      return;
    }

    if (!agentId) {
      addLog('error', 'NEXT_PUBLIC_DID_AGENT_ID が設定されていません');
      return;
    }

    setStatus('connecting');
    initStartTimeRef.current = performance.now();
    addLog('info', 'mintoku面接エージェントを初期化中...');

    try {
      const sdk = await import('@d-id/client-sdk');

      const agentManager = await sdk.createAgentManager(agentId, {
        auth: { type: 'key', clientKey: clientKey },
        callbacks: {
          onConnectionStateChange: (state: string) => {
            addLog('info', `接続状態: ${state}`);
            if (state === 'connected') {
              setStatus('connected');
            }
            // 注意: 'disconnected'/'closed'は自動再接続のため、ここでは状態を変更しない
            // 明示的なdisconnect()呼び出し時のみstatusを'disconnected'に設定
          },
          onVideoStateChange: (state: string) => {
            addLog('info', `ビデオ状態: ${state}`);
            if (state === 'PLAYING') {
              const initTime = performance.now() - initStartTimeRef.current;
              setMetrics((prev) => ({ ...prev, initTime: Math.round(initTime) }));
              // 発話開始
              const latency = performance.now() - speakStartTimeRef.current;
              setMetrics((prev) => ({ ...prev, speakLatency: Math.round(latency) }));
              setIsSpeaking(true);
            } else if (state === 'STOP') {
              // 発話終了
              const totalTime = performance.now() - speakStartTimeRef.current;
              setMetrics((prev) => ({ ...prev, totalSpeakTime: Math.round(totalTime) }));
              setIsSpeaking(false);
            }
          },
          onSrcObjectReady: (srcObject: MediaStream) => {
            if (videoRef.current) {
              videoRef.current.srcObject = srcObject;
              videoRef.current.play().catch(() => {});
            }
          },
          onNewMessage: (messages: Array<{ role?: string; content?: string }>, type: string) => {
            if (type === 'answer' && messages.length > 0) {
              const lastMessage = messages[messages.length - 1];
              if (lastMessage.role === 'assistant' && lastMessage.content) {
                addChatMessage('assistant', lastMessage.content);
                addLog('chat', `田中: ${lastMessage.content.slice(0, 50)}...`);
              }
            }
          },
          onError: (error: Error, errorData?: unknown) => {
            addLog('error', `エラー: ${error.message}`);
            console.error('D-ID Error:', error, errorData);
          },
        },
        streamOptions: {
          compatibilityMode: 'auto',
          streamWarmup: true,
        },
      }) as unknown as DIdAgentManager;

      agentManagerRef.current = agentManager;

      // エージェント情報を取得
      if (agentManager.agent) {
        setAgentName(agentManager.agent.preview_name || 'mintoku');
      }

      await agentManager.connect();
      setStatus('connected');
      addLog('success', 'mintoku面接エージェント接続完了');

      // 挨拶メッセージを追加
      const greeting = 'こんにちは、面接練習アシスタントの田中です。本日は面接練習にお越しいただきありがとうございます。リラックスして、実際の面接のように練習しましょう。';
      addChatMessage('assistant', greeting);

    } catch (error) {
      setStatus('disconnected');
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      addLog('error', `初期化エラー: ${errorMessage}`);
      console.error('Init error:', error);
    }
  }, [addLog, addChatMessage]);

  const sendChat = useCallback(
    async (message: string) => {
      if (!agentManagerRef.current || status !== 'connected') {
        addLog('error', 'エージェントが接続されていません');
        return;
      }

      speakStartTimeRef.current = performance.now();
      addChatMessage('user', message);
      addLog('info', `送信: "${message}"`);

      try {
        await agentManagerRef.current.chat(message);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '不明なエラー';
        addLog('error', `チャットエラー: ${errorMessage}`);
      }
    },
    [status, addLog, addChatMessage]
  );

  // speak関数は直接テキストを発話させる（LLM応答なし）
  const speak = useCallback(
    async (text: string) => {
      if (!agentManagerRef.current || status !== 'connected') {
        addLog('error', 'エージェントが接続されていません');
        return;
      }

      speakStartTimeRef.current = performance.now();
      addLog('info', `面接官発話: "${text.slice(0, 30)}..."`);

      try {
        await agentManagerRef.current.speak({
          type: 'text',
          input: text,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '不明なエラー';
        addLog('error', `発話エラー: ${errorMessage}`);
      }
    },
    [status, addLog]
  );

  const disconnect = useCallback(async () => {
    try {
      if (agentManagerRef.current) {
        await agentManagerRef.current.disconnect();
        agentManagerRef.current = null;
      }
    } catch {
      // Ignore disconnect errors
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus('disconnected');
    setChatMessages([]);
    addLog('info', 'エージェント切断完了');
  }, [addLog]);

  useEffect(() => {
    return () => {
      if (agentManagerRef.current) {
        agentManagerRef.current.disconnect().catch(() => {});
      }
    };
  }, []);

  const handleSendMessage = () => {
    if (userInput.trim()) {
      sendChat(userInput);
      setUserInput('');
    }
  };

  return (
    <div className="card">
      <h2>mintoku 面接練習エージェント</h2>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
        D-ID Agents SDK - 田中（採用担当マネージャー）
      </p>

      <div className={`status ${status}`}>
        {status === 'connected' && `接続済み - ${agentName || 'mintoku'}`}
        {status === 'connecting' && '接続中...'}
        {status === 'disconnected' && '未接続'}
      </div>

      <div className="video-container" style={{ position: 'relative' }}>
        <video ref={videoRef} autoPlay playsInline muted={false} />
        {isSpeaking && (
          <div style={{
            position: 'absolute',
            bottom: 10,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.7)',
            color: '#fff',
            padding: '4px 12px',
            borderRadius: 16,
            fontSize: 12,
          }}>
            🎙️ 話し中...
          </div>
        )}
      </div>

      <div className="controls">
        {status === 'disconnected' && (
          <button className="btn-primary" onClick={initAgent}>
            面接練習を開始
          </button>
        )}
        {status === 'connected' && (
          <button className="btn-danger" onClick={disconnect}>
            終了
          </button>
        )}
      </div>

      {status === 'connected' && (
        <>
          {/* チャット履歴 */}
          <div
            ref={chatContainerRef}
            style={{
              marginTop: 16,
              maxHeight: 200,
              overflowY: 'auto',
              border: '1px solid #e0e0e0',
              borderRadius: 8,
              padding: 12,
              background: '#fafafa',
            }}
          >
            {chatMessages.length === 0 ? (
              <div style={{ color: '#999', textAlign: 'center' }}>
                メッセージがありません
              </div>
            ) : (
              chatMessages.map((msg, index) => (
                <div
                  key={index}
                  style={{
                    marginBottom: 8,
                    textAlign: msg.role === 'user' ? 'right' : 'left',
                  }}
                >
                  <div
                    style={{
                      display: 'inline-block',
                      maxWidth: '80%',
                      padding: '8px 12px',
                      borderRadius: 12,
                      background: msg.role === 'user' ? '#007bff' : '#e9ecef',
                      color: msg.role === 'user' ? '#fff' : '#333',
                      fontSize: 14,
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 面接官セリフ（直接発話） */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
              面接官セリフ:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {INTERVIEWER_PHRASES.map((phrase, index) => (
                <button
                  key={index}
                  className="btn-secondary"
                  onClick={() => speak(phrase)}
                  disabled={isSpeaking}
                  style={{ fontSize: 12, padding: '6px 12px' }}
                >
                  {phrase.slice(0, 12)}...
                </button>
              ))}
            </div>
          </div>

          {/* 会話開始メッセージ（LLMに送信） */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
              会話を開始:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {STARTER_MESSAGES.map((msg, index) => (
                <button
                  key={index}
                  className="btn-primary"
                  onClick={() => sendChat(msg)}
                  disabled={isSpeaking}
                  style={{ fontSize: 12, padding: '6px 12px' }}
                >
                  {msg}
                </button>
              ))}
            </div>
          </div>

          {/* メッセージ入力 */}
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <input
              type="text"
              className="text-input"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="メッセージを入力..."
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              style={{ flex: 1 }}
            />
            <button
              className="btn-primary"
              onClick={handleSendMessage}
              disabled={isSpeaking || !userInput.trim()}
            >
              送信
            </button>
          </div>
        </>
      )}

      {/* メトリクス */}
      <div className="metrics">
        <div className="metric">
          <div className="metric-value">
            {metrics.initTime !== null ? `${metrics.initTime}ms` : '-'}
          </div>
          <div className="metric-label">初期化時間</div>
        </div>
        <div className="metric">
          <div className="metric-value">
            {metrics.speakLatency !== null ? `${metrics.speakLatency}ms` : '-'}
          </div>
          <div className="metric-label">応答レイテンシ</div>
        </div>
        <div className="metric">
          <div className="metric-value">
            {metrics.totalSpeakTime !== null ? `${metrics.totalSpeakTime}ms` : '-'}
          </div>
          <div className="metric-label">総発話時間</div>
        </div>
      </div>

      {/* ログ */}
      <details style={{ marginTop: 16 }}>
        <summary style={{ cursor: 'pointer', color: '#666' }}>
          デバッグログ ({logs.length})
        </summary>
        <div className="log-container" style={{ marginTop: 8 }}>
          {logs.length === 0 ? (
            <div className="log-entry">ログはまだありません</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="log-entry">
                <span className="log-time">{log.time}</span>
                <span className={`log-type ${log.type}`}>{log.type.toUpperCase()}</span>
                <span>{log.message}</span>
              </div>
            ))
          )}
        </div>
      </details>
    </div>
  );
}
