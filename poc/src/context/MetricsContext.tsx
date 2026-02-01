'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface ServiceMetrics {
  initTime: number | null;
  speakLatency: number | null;
  totalSpeakTime: number | null;
  lastUpdated: Date | null;
}

interface MetricsContextType {
  heygenMetrics: ServiceMetrics;
  didMetrics: ServiceMetrics;
  updateHeygenMetrics: (metrics: Partial<ServiceMetrics>) => void;
  updateDidMetrics: (metrics: Partial<ServiceMetrics>) => void;
}

const defaultMetrics: ServiceMetrics = {
  initTime: null,
  speakLatency: null,
  totalSpeakTime: null,
  lastUpdated: null,
};

const MetricsContext = createContext<MetricsContextType | null>(null);

export function MetricsProvider({ children }: { children: ReactNode }) {
  const [heygenMetrics, setHeygenMetrics] = useState<ServiceMetrics>(defaultMetrics);
  const [didMetrics, setDidMetrics] = useState<ServiceMetrics>(defaultMetrics);

  const updateHeygenMetrics = useCallback((metrics: Partial<ServiceMetrics>) => {
    setHeygenMetrics((prev) => ({
      ...prev,
      ...metrics,
      lastUpdated: new Date(),
    }));
  }, []);

  const updateDidMetrics = useCallback((metrics: Partial<ServiceMetrics>) => {
    setDidMetrics((prev) => ({
      ...prev,
      ...metrics,
      lastUpdated: new Date(),
    }));
  }, []);

  return (
    <MetricsContext.Provider
      value={{
        heygenMetrics,
        didMetrics,
        updateHeygenMetrics,
        updateDidMetrics,
      }}
    >
      {children}
    </MetricsContext.Provider>
  );
}

export function useMetrics() {
  const context = useContext(MetricsContext);
  if (!context) {
    throw new Error('useMetrics must be used within a MetricsProvider');
  }
  return context;
}
