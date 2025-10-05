import { useState, useEffect, useCallback } from 'react';
import { ForecastResponse } from '@/types/forecast';

interface UseAirQualityForecastProps {
  lat: number;
  lng: number;
  hours?: number; // 預測時數（預設 24 小時）
  enabled?: boolean; // 是否啟用查詢
}

interface UseAirQualityForecastReturn {
  data: ForecastResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * 空氣品質預測 Hook
 * 
 * 功能：
 * - 獲取未來 24-96 小時的空氣品質預測
 * - 自動錯誤處理
 * - 支援手動重新查詢
 * 
 * @example
 * const { data, loading, error } = useAirQualityForecast({
 *   lat: 25.033,
 *   lng: 121.5654,
 *   hours: 24,
 * });
 */
export function useAirQualityForecast({
  lat,
  lng,
  hours = 24,
  enabled = true,
}: UseAirQualityForecastProps): UseAirQualityForecastReturn {
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchForecast = useCallback(async () => {
    if (!enabled || !lat || !lng) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/air-quality/forecast?lat=${lat}&lng=${lng}&hours=${hours}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '獲取預測數據失敗');
      }

      const forecastData = await response.json();
      setData(forecastData);
    } catch (err) {
      console.error('❌ 獲取預測數據失敗:', err);
      setError(err instanceof Error ? err.message : '未知錯誤');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [enabled, hours, lat, lng]);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  return {
    data,
    loading,
    error,
    refetch: fetchForecast,
  };
}
