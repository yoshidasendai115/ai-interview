'use client';

import { useState, useCallback, useEffect } from 'react';
import { useMetrics, ServiceMetrics } from '@/context/MetricsContext';

interface EvaluationScores {
  heygen: {
    ttsQuality: number;
    lipSyncAccuracy: number;
    latency: string;
    sdkEase: number;
    documentation: number;
  };
  did: {
    ttsQuality: number;
    lipSyncAccuracy: number;
    latency: string;
    sdkEase: number;
    documentation: number;
  };
}

const EVALUATION_ITEMS = [
  { key: 'ttsQuality', label: '日本語TTS品質', description: '発音の自然さ、イントネーション' },
  { key: 'lipSyncAccuracy', label: 'リップシンク精度', description: '口の動きと音声の同期' },
  { key: 'sdkEase', label: 'SDK使いやすさ', description: 'API設計、統合の容易さ' },
  { key: 'documentation', label: 'ドキュメント充実度', description: '公式ドキュメントの質と量' },
] as const;

type EvaluationKey = (typeof EVALUATION_ITEMS)[number]['key'];

function formatMetricValue(value: number | null): string {
  return value !== null ? `${value}ms` : '-';
}

function MetricsDisplay({ metrics, label, color }: { metrics: ServiceMetrics; label: string; color: string }) {
  return (
    <div style={{
      background: '#f8f9fa',
      padding: 16,
      borderRadius: 8,
      marginBottom: 16,
      border: `2px solid ${color}20`
    }}>
      <h4 style={{ color, marginBottom: 12, fontSize: 14 }}>
        {label} - 自動取得メトリクス
      </h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 'bold', color }}>
            {formatMetricValue(metrics.initTime)}
          </div>
          <div style={{ fontSize: 11, color: '#666' }}>初期化時間</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 'bold', color }}>
            {formatMetricValue(metrics.speakLatency)}
          </div>
          <div style={{ fontSize: 11, color: '#666' }}>発話レイテンシ</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 'bold', color }}>
            {formatMetricValue(metrics.totalSpeakTime)}
          </div>
          <div style={{ fontSize: 11, color: '#666' }}>総発話時間</div>
        </div>
      </div>
      {metrics.lastUpdated && (
        <div style={{ fontSize: 10, color: '#999', marginTop: 8, textAlign: 'right' }}>
          最終更新: {metrics.lastUpdated.toLocaleTimeString('ja-JP')}
        </div>
      )}
    </div>
  );
}

export default function EvaluationForm() {
  const { heygenMetrics, didMetrics } = useMetrics();

  const [scores, setScores] = useState<EvaluationScores>({
    heygen: {
      ttsQuality: 0,
      lipSyncAccuracy: 0,
      latency: '',
      sdkEase: 0,
      documentation: 0,
    },
    did: {
      ttsQuality: 0,
      lipSyncAccuracy: 0,
      latency: '',
      sdkEase: 0,
      documentation: 0,
    },
  });

  const [notes, setNotes] = useState({
    heygen: '',
    did: '',
  });

  const [recommendation, setRecommendation] = useState<'heygen' | 'd-id' | ''>('');

  // メトリクスが更新されたらレイテンシフィールドを自動更新
  useEffect(() => {
    if (heygenMetrics.speakLatency !== null) {
      setScores((prev) => ({
        ...prev,
        heygen: {
          ...prev.heygen,
          latency: `${heygenMetrics.speakLatency}ms`,
        },
      }));
    }
  }, [heygenMetrics.speakLatency]);

  useEffect(() => {
    if (didMetrics.speakLatency !== null) {
      setScores((prev) => ({
        ...prev,
        did: {
          ...prev.did,
          latency: `${didMetrics.speakLatency}ms`,
        },
      }));
    }
  }, [didMetrics.speakLatency]);

  const updateScore = useCallback(
    (service: 'heygen' | 'did', key: EvaluationKey | 'latency', value: number | string) => {
      setScores((prev) => ({
        ...prev,
        [service]: {
          ...prev[service],
          [key]: value,
        },
      }));
    },
    []
  );

  const calculateTotal = (service: 'heygen' | 'did'): number => {
    const s = scores[service];
    return s.ttsQuality + s.lipSyncAccuracy + s.sdkEase + s.documentation;
  };

  const exportReport = () => {
    const report = {
      evaluationDate: new Date().toISOString(),
      scores,
      automatedMetrics: {
        heygen: {
          initTime: heygenMetrics.initTime,
          speakLatency: heygenMetrics.speakLatency,
          totalSpeakTime: heygenMetrics.totalSpeakTime,
        },
        did: {
          initTime: didMetrics.initTime,
          speakLatency: didMetrics.speakLatency,
          totalSpeakTime: didMetrics.totalSpeakTime,
        },
      },
      notes,
      recommendation,
      totals: {
        heygen: calculateTotal('heygen'),
        did: calculateTotal('did'),
      },
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `avatar-evaluation-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderScoreButtons = (
    service: 'heygen' | 'did',
    key: EvaluationKey,
    currentValue: number
  ) => {
    return (
      <div style={{ display: 'flex', gap: 8 }}>
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            onClick={() => updateScore(service, key, score)}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              border: currentValue === score ? '2px solid #0066cc' : '1px solid #ddd',
              background: currentValue === score ? '#0066cc' : 'white',
              color: currentValue === score ? 'white' : '#333',
              fontWeight: 'bold',
            }}
          >
            {score}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="card">
      <h2>評価比較フォーム</h2>
      <p style={{ color: '#666', marginBottom: 24 }}>
        各項目を5段階で評価してください（1: 低い ～ 5: 高い）
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* HeyGen Column */}
        <div>
          <h3 style={{ color: '#0066cc', marginBottom: 16 }}>HeyGen</h3>

          {/* 自動取得メトリクス */}
          <MetricsDisplay metrics={heygenMetrics} label="HeyGen" color="#0066cc" />

          {EVALUATION_ITEMS.map((item) => (
            <div key={item.key} style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>{item.description}</div>
              {renderScoreButtons('heygen', item.key, scores.heygen[item.key])}
            </div>
          ))}

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>
              レイテンシ（ms）
              <span style={{ fontSize: 11, color: '#0066cc', marginLeft: 8 }}>
                ※自動入力
              </span>
            </div>
            <input
              type="text"
              className="text-input"
              value={scores.heygen.latency}
              onChange={(e) => updateScore('heygen', 'latency', e.target.value)}
              placeholder="例: 350ms"
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>備考</div>
            <textarea
              className="text-input"
              value={notes.heygen}
              onChange={(e) => setNotes((prev) => ({ ...prev, heygen: e.target.value }))}
              placeholder="気づいた点、問題点など..."
              rows={4}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div
            style={{
              background: '#f8f9fa',
              padding: 16,
              borderRadius: 8,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 14, color: '#666' }}>スコア合計</div>
            <div style={{ fontSize: 32, fontWeight: 'bold', color: '#0066cc' }}>
              {calculateTotal('heygen')} / 20
            </div>
          </div>
        </div>

        {/* D-ID Column */}
        <div>
          <h3 style={{ color: '#28a745', marginBottom: 16 }}>D-ID</h3>

          {/* 自動取得メトリクス */}
          <MetricsDisplay metrics={didMetrics} label="D-ID" color="#28a745" />

          {EVALUATION_ITEMS.map((item) => (
            <div key={item.key} style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>{item.description}</div>
              {renderScoreButtons('did', item.key, scores.did[item.key])}
            </div>
          ))}

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>
              レイテンシ（ms）
              <span style={{ fontSize: 11, color: '#28a745', marginLeft: 8 }}>
                ※自動入力
              </span>
            </div>
            <input
              type="text"
              className="text-input"
              value={scores.did.latency}
              onChange={(e) => updateScore('did', 'latency', e.target.value)}
              placeholder="例: 280ms"
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>備考</div>
            <textarea
              className="text-input"
              value={notes.did}
              onChange={(e) => setNotes((prev) => ({ ...prev, did: e.target.value }))}
              placeholder="気づいた点、問題点など..."
              rows={4}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div
            style={{
              background: '#f8f9fa',
              padding: 16,
              borderRadius: 8,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 14, color: '#666' }}>スコア合計</div>
            <div style={{ fontSize: 32, fontWeight: 'bold', color: '#28a745' }}>
              {calculateTotal('did')} / 20
            </div>
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <div style={{ marginTop: 32, padding: 24, background: '#f8f9fa', borderRadius: 8 }}>
        <h3 style={{ marginBottom: 16 }}>最終推奨</h3>
        <div style={{ display: 'flex', gap: 16 }}>
          <button
            className={recommendation === 'heygen' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setRecommendation('heygen')}
            style={{ flex: 1 }}
          >
            HeyGen を推奨
          </button>
          <button
            className={recommendation === 'd-id' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setRecommendation('d-id')}
            style={{ flex: 1 }}
          >
            D-ID を推奨
          </button>
        </div>
      </div>

      {/* Export */}
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <button className="btn-primary" onClick={exportReport}>
          📥 評価レポートをエクスポート
        </button>
      </div>

      {/* Comparison Table */}
      <div style={{ marginTop: 32 }}>
        <h3 style={{ marginBottom: 16 }}>比較サマリー</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              <th style={{ padding: 12, textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                項目
              </th>
              <th style={{ padding: 12, textAlign: 'center', borderBottom: '2px solid #ddd' }}>
                HeyGen
              </th>
              <th style={{ padding: 12, textAlign: 'center', borderBottom: '2px solid #ddd' }}>
                D-ID
              </th>
            </tr>
          </thead>
          <tbody>
            {/* 自動取得メトリクス */}
            <tr style={{ background: '#e3f2fd' }}>
              <td style={{ padding: 12, borderBottom: '1px solid #eee', fontWeight: 500 }}>
                初期化時間（自動）
              </td>
              <td style={{ padding: 12, textAlign: 'center', borderBottom: '1px solid #eee' }}>
                {formatMetricValue(heygenMetrics.initTime)}
              </td>
              <td style={{ padding: 12, textAlign: 'center', borderBottom: '1px solid #eee' }}>
                {formatMetricValue(didMetrics.initTime)}
              </td>
            </tr>
            <tr style={{ background: '#e3f2fd' }}>
              <td style={{ padding: 12, borderBottom: '1px solid #eee', fontWeight: 500 }}>
                発話レイテンシ（自動）
              </td>
              <td style={{ padding: 12, textAlign: 'center', borderBottom: '1px solid #eee' }}>
                {formatMetricValue(heygenMetrics.speakLatency)}
              </td>
              <td style={{ padding: 12, textAlign: 'center', borderBottom: '1px solid #eee' }}>
                {formatMetricValue(didMetrics.speakLatency)}
              </td>
            </tr>
            <tr style={{ background: '#e3f2fd' }}>
              <td style={{ padding: 12, borderBottom: '1px solid #eee', fontWeight: 500 }}>
                総発話時間（自動）
              </td>
              <td style={{ padding: 12, textAlign: 'center', borderBottom: '1px solid #eee' }}>
                {formatMetricValue(heygenMetrics.totalSpeakTime)}
              </td>
              <td style={{ padding: 12, textAlign: 'center', borderBottom: '1px solid #eee' }}>
                {formatMetricValue(didMetrics.totalSpeakTime)}
              </td>
            </tr>
            {/* 手動評価項目 */}
            {EVALUATION_ITEMS.map((item) => (
              <tr key={item.key}>
                <td style={{ padding: 12, borderBottom: '1px solid #eee' }}>{item.label}</td>
                <td
                  style={{ padding: 12, textAlign: 'center', borderBottom: '1px solid #eee' }}
                >
                  {scores.heygen[item.key] || '-'} / 5
                </td>
                <td
                  style={{ padding: 12, textAlign: 'center', borderBottom: '1px solid #eee' }}
                >
                  {scores.did[item.key] || '-'} / 5
                </td>
              </tr>
            ))}
            <tr style={{ fontWeight: 'bold', background: '#f8f9fa' }}>
              <td style={{ padding: 12 }}>総合評価</td>
              <td style={{ padding: 12, textAlign: 'center', color: '#0066cc' }}>
                {calculateTotal('heygen')} / 20
              </td>
              <td style={{ padding: 12, textAlign: 'center', color: '#28a745' }}>
                {calculateTotal('did')} / 20
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
