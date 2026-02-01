'use client';

import { useState } from 'react';
import HeyGenAvatar from '@/components/HeyGenAvatar';
import DIdAvatar from '@/components/DIdAvatar';
import EvaluationForm from '@/components/EvaluationForm';
import InterviewSession from '@/components/InterviewSession';
import { MetricsProvider } from '@/context/MetricsContext';

type TabType = 'interview' | 'heygen' | 'd-id' | 'comparison';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('interview');

  return (
    <MetricsProvider>
      <div className="container">
        <h1>AI面接練習プラットフォーム</h1>
        <p style={{ marginBottom: 24, color: '#666' }}>
          HeyGenアバターとGoogle STTを活用した面接練習システム
        </p>

        <div className="tabs">
          <button
            className={`tab ${activeTab === 'interview' ? 'active' : ''}`}
            onClick={() => setActiveTab('interview')}
          >
            面接練習
          </button>
          <button
            className={`tab ${activeTab === 'heygen' ? 'active' : ''}`}
            onClick={() => setActiveTab('heygen')}
          >
            HeyGen PoC
          </button>
          <button
            className={`tab ${activeTab === 'd-id' ? 'active' : ''}`}
            onClick={() => setActiveTab('d-id')}
          >
            D-ID PoC
          </button>
          <button
            className={`tab ${activeTab === 'comparison' ? 'active' : ''}`}
            onClick={() => setActiveTab('comparison')}
          >
            評価比較
          </button>
        </div>

        {activeTab === 'interview' && <InterviewSession jlptLevel="N3" />}
        {activeTab === 'heygen' && <HeyGenAvatar />}
        {activeTab === 'd-id' && <DIdAvatar />}
        {activeTab === 'comparison' && <EvaluationForm />}
      </div>
    </MetricsProvider>
  );
}
