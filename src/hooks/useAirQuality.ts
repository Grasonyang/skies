'use client';

import { useState, useEffect, useCallback } from 'react';
import { AQIData } from '@/types';
import { API_ENDPOINTS } from '@/lib/constants';

interface UseAirQualityOptions {
  lat: number;
  lng: number;
  enabled?: boolean;
}

interface UseAirQualityReturn {
  data: AQIData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * 獲取空氣品質數據的 Hook
 */
export function useAirQuality({
  lat,
  lng,
  enabled = true,
}: UseAirQualityOptions): UseAirQualityReturn {
  const [data, setData] = useState<AQIData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAirQuality = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      console.log(`🌤️ 獲取空氣品質數據: (${lat}, ${lng})`);

      const response = await fetch(
        `${API_ENDPOINTS.CURRENT}?lat=${lat}&lng=${lng}`,
        {
          cache: 'default',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '獲取數據失敗');
      }

      const result = await response.json();
      setData(result);
      console.log('✅ 空氣品質數據獲取成功:', result);
    } catch (err) {
      const message = err instanceof Error ? err.message : '未知錯誤';
      setError(message);
      console.error('❌ 獲取空氣品質數據失敗:', message);
    } finally {
      setLoading(false);
    }
  }, [lat, lng, enabled]);

  useEffect(() => {
    fetchAirQuality();
  }, [fetchAirQuality]);

  return {
    data,
    loading,
    error,
    refetch: fetchAirQuality,
  };
}

/**
 * 批量獲取多個位置的空氣品質數據
 */
export function useBatchAirQuality(
  locations: Array<{ lat: number; lng: number }>
) {
  const [data, setData] = useState<AQIData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBatchAirQuality = useCallback(async () => {
    if (locations.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      console.log(`🌤️ 批量獲取空氣品質數據: ${locations.length} 個位置`);

      const response = await fetch(`${API_ENDPOINTS.CURRENT}/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ locations }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '批量獲取數據失敗');
      }

      const result = await response.json();
      setData(result.data || []);
      console.log('✅ 批量數據獲取成功:', result.count);
    } catch (err) {
      const message = err instanceof Error ? err.message : '未知錯誤';
      setError(message);
      console.error('❌ 批量獲取數據失敗:', message);
    } finally {
      setLoading(false);
    }
  }, [locations]);

  useEffect(() => {
    fetchBatchAirQuality();
  }, [fetchBatchAirQuality]);

  return {
    data,
    loading,
    error,
    refetch: fetchBatchAirQuality,
  };
}
