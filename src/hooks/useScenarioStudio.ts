import { useState, useCallback } from 'react';
import { ForecastResponse } from '@/types/forecast';

export interface Place {
  name: string;
  location: {
    lat: number;
    lng: number;
  };
  types: string[];
  address?: string;
  rating?: number;
}

export interface TimeSlot {
  time: string;
  dateTime: string;
  aqi: number;
  category: string;
  dominantPollutant: string;
  riskLevel: 'safe' | 'warning' | 'danger';
}

export interface ScenarioAnalysis {
  activity: string;
  location: Place;
  timeSlots: TimeSlot[];
  bestTimeSlot?: TimeSlot;
  worstTimeSlot?: TimeSlot;
  averageAqi: number;
  recommendation?: string;
  loading: boolean;
  error?: string;
}

interface UseScenarioStudioReturn {
  scenarios: ScenarioAnalysis[];
  loading: boolean;
  error: string | null;
  generateScenario: (activity: string, location: { lat: number; lng: number }, activityType?: string[]) => Promise<void>;
  clearScenarios: () => void;
}

/**
 * Scenario Studio Hook
 * 生成 24 小時活動劇本，結合 Places 與 AQI 預測
 */
export function useScenarioStudio(): UseScenarioStudioReturn {
  const [scenarios, setScenarios] = useState<ScenarioAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 獲取附近場域
   */
  const getNearbyPlaces = async (
    location: { lat: number; lng: number },
    activityType: string[] = ['park']
  ): Promise<Place[]> => {
    try {
      const response = await fetch('/api/places/nearby', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location: {
            latitude: location.lat,
            longitude: location.lng,
          },
          radius: 5000,
          type: activityType,
          languageCode: 'zh-TW', // TODO: Make this dynamic
        }),
      });

      if (!response.ok) {
        throw new Error('無法獲取附近場域');
      }

      const data = await response.json();
      return data.places || [];
    } catch (err) {
      console.error('❌ 獲取場域失敗:', err);
      // 返回預設場域
      return [
        {
          name: '目標地點',
          location,
          types: activityType,
          address: '使用者選擇的位置',
        },
      ];
    }
  };

  /**
   * 分析場域的 24 小時 AQI
   */
  const analyzeLocation = async (place: Place): Promise<TimeSlot[]> => {
    try {
      const searchParams = new URLSearchParams({
        lat: place.location.lat.toString(),
        lng: place.location.lng.toString(),
        hours: '24',
      });

      const response = await fetch(`/api/air-quality/forecast?${searchParams.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      let forecastPayload: ForecastResponse;

      if (!response.ok) {
        let errorMessage = '無法獲取預測資料';
        try {
          const data = await response.json();
          errorMessage = data?.error ?? errorMessage;
        } catch (parseError) {
          console.warn('無法解析預測 API 錯誤回應', parseError);
        }
        throw new Error(errorMessage);
      }

      try {
        forecastPayload = await response.json();
      } catch (parseError) {
        console.error('預測 API 回應格式錯誤', parseError);
        throw new Error('預測資料格式錯誤');
      }

      // 取樣關鍵時段（每 3 小時）
      const sampledForecasts = forecastPayload.hourlyForecasts.filter((_, index) => index % 3 === 0);

      return sampledForecasts.map((hourly) => {
        const dateTime = new Date(hourly.dateTime);
        const hour = dateTime.getHours();
        const timeLabel = `${hour.toString().padStart(2, '0')}:00`;

  const uaqiIndex = hourly.indexes.find((idx) => idx.code === 'uaqi');
        const aqi = uaqiIndex?.aqi || 0;
        const category = uaqiIndex?.category || 'UNKNOWN';
        const dominantPollutant = uaqiIndex?.dominantPollutant || 'unknown';

        return {
          time: timeLabel,
          dateTime: hourly.dateTime,
          aqi,
          category,
          dominantPollutant,
          riskLevel: getRiskLevel(aqi),
        };
      });
    } catch (err) {
      console.error('❌ 分析場域失敗:', err);
      throw err;
    }
  };

  /**
   * 獲取 AI 建議
   */
  const getAIRecommendation = async (
    activity: string,
    place: Place,
    timeSlots: TimeSlot[]
  ): Promise<string> => {
    try {
      const bestSlot = timeSlots.reduce((best, slot) =>
        slot.aqi < best.aqi ? slot : best
      );
      const worstSlot = timeSlots.reduce((worst, slot) =>
        slot.aqi > worst.aqi ? slot : worst
      );

      const response = await fetch('/api/agent/recommendation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activity,
          scenario: {
            location: place.name,
            timeSlots: timeSlots.slice(0, 8), // 只傳送前 8 個時段給 AI
            bestTime: bestSlot.time,
            worstTime: worstSlot.time,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('AI 建議請求失敗');
      }

      const data = await response.json();
      return data.recommendation || '暫無建議';
    } catch (err) {
      console.error('❌ 獲取 AI 建議失敗:', err);
      return '建議根據空氣品質選擇合適的活動時段。';
    }
  };

  /**
   * 生成情境劇本
   */
  const generateScenario = useCallback(
    async (
      activity: string,
      location: { lat: number; lng: number },
      activityType: string[] = ['park']
    ) => {
      setLoading(true);
      setError(null);

      try {
        // 1. 獲取附近場域
        const places = await getNearbyPlaces(location, activityType);
        
        if (places.length === 0) {
          throw new Error('找不到合適的場域');
        }

        // 2. 分析每個場域（最多 3 個）
        const placesToAnalyze = places.slice(0, 3);
        const analyses: ScenarioAnalysis[] = [];

        for (const place of placesToAnalyze) {
          try {
            // 分析 24 小時 AQI
            const timeSlots = await analyzeLocation(place);

            // 計算平均 AQI
            const averageAqi =
              timeSlots.reduce((sum, slot) => sum + slot.aqi, 0) / timeSlots.length;

            // 找出最佳/最差時段
            const bestTimeSlot = timeSlots.reduce((best, slot) =>
              slot.aqi < best.aqi ? slot : best
            );
            const worstTimeSlot = timeSlots.reduce((worst, slot) =>
              slot.aqi > worst.aqi ? slot : worst
            );

            // 初始化分析結果（不包含 recommendation）
            const analysis: ScenarioAnalysis = {
              activity,
              location: place,
              timeSlots,
              bestTimeSlot,
              worstTimeSlot,
              averageAqi: Math.round(averageAqi),
              loading: true, // AI 建議載入中
            };

            analyses.push(analysis);

            // 先更新 UI（顯示資料但 recommendation 載入中）
            setScenarios((prev) => [...prev, analysis]);

            // 3. 非同步獲取 AI 建議
            getAIRecommendation(activity, place, timeSlots)
              .then((recommendation) => {
                setScenarios((prev) =>
                  prev.map((s) =>
                    s.location.name === place.name
                      ? { ...s, recommendation, loading: false }
                      : s
                  )
                );
              })
              .catch((err) => {
                console.error('AI 建議失敗:', err);
                setScenarios((prev) =>
                  prev.map((s) =>
                    s.location.name === place.name
                      ? {
                          ...s,
                          recommendation: '建議根據空氣品質選擇合適的活動時段。',
                          loading: false,
                        }
                      : s
                  )
                );
              });
          } catch (err) {
            console.error(`場域 ${place.name} 分析失敗:`, err);
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '生成情境失敗';
        setError(errorMessage);
        console.error('❌ 生成情境失敗:', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const clearScenarios = useCallback(() => {
    setScenarios([]);
    setError(null);
  }, []);

  return {
    scenarios,
    loading,
    error,
    generateScenario,
    clearScenarios,
  };
}

/**
 * 計算風險等級
 */
function getRiskLevel(aqi: number): 'safe' | 'warning' | 'danger' {
  if (aqi <= 100) return 'safe';
  if (aqi <= 150) return 'warning';
  return 'danger';
}
