'use client';

/**
 * 設定変更履歴パネル
 * 選択された設定キーの変更履歴を表示
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchConfigHistory } from '@/services/configService';
import type { ConfigHistoryEntry, ConfigHistoryListResponse } from '@/types/evaluationConfig';

interface ConfigHistoryPanelProps {
  configKey: string;
  token: string;
}

export default function ConfigHistoryPanel({ configKey, token }: ConfigHistoryPanelProps) {
  const [history, setHistory] = useState<ConfigHistoryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data: ConfigHistoryListResponse = await fetchConfigHistory(configKey, token);
      setHistory(data.history);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setIsLoading(false);
    }
  }, [configKey, token]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
        <span className="ml-2 text-gray-600">履歴を読み込み中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadHistory}
          className="mt-2 text-sm text-blue-600 hover:underline"
        >
          再読み込み
        </button>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        変更履歴はありません
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        全{total}件の変更履歴
      </p>

      {history.map((entry) => (
        <div
          key={entry.id}
          className="border rounded-md overflow-hidden"
        >
          <button
            onClick={() =>
              setExpandedId(expandedId === entry.id ? null : entry.id)
            }
            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                v{entry.version}
              </span>
              <span className="text-sm text-gray-600">
                {formatDate(entry.changed_at)}
              </span>
            </div>
            <span className="text-gray-400">
              {expandedId === entry.id ? '[-]' : '[+]'}
            </span>
          </button>

          {expandedId === entry.id && (
            <div className="p-3 border-t bg-white">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">変更前</h5>
                  <pre className="text-xs bg-red-50 p-2 rounded overflow-auto max-h-64">
                    {JSON.stringify(entry.previous_value, null, 2)}
                  </pre>
                </div>
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">変更後</h5>
                  <pre className="text-xs bg-green-50 p-2 rounded overflow-auto max-h-64">
                    {JSON.stringify(entry.new_value, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
