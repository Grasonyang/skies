import { useCallback, useEffect, useMemo, useState } from 'react';
import { AQIData } from '@/types';
import { ForecastResponse } from '@/types/forecast';
import { CommuteGuardianRoute } from '@/types/commute';

interface UseBriefingAgentOptions {
  enabled: boolean;
  cityName: string;
  aqiData: AQIData | null;
  forecastData: ForecastResponse | null;
  commuteRoutes: CommuteGuardianRoute[];
}

export interface BriefingLevel {
  title: string;
  body: string;
  callToAction?: string;
}

export interface BriefingAgentResponse {
  level1: BriefingLevel;
  level2: BriefingLevel;
  level3: BriefingLevel;
}

interface BriefingState {
  data: BriefingAgentResponse | null;
  loading: boolean;
  error: string | null;
}

export function useBriefingAgent({
  enabled,
  cityName,
  aqiData,
  forecastData,
  commuteRoutes,
}: UseBriefingAgentOptions) {
  const [state, setState] = useState<BriefingState>({
    data: null,
    loading: false,
    error: null,
  });

  const payload = useMemo(() => {
    if (!aqiData) return null;

    const peakForecast = forecastData?.hourlyForecasts?.reduce((prev, current) => {
      const prevAqi = prev?.indexes?.find((idx) => idx.code === 'uaqi')?.aqi ?? -Infinity;
      const currentAqi = current.indexes?.find((idx) => idx.code === 'uaqi')?.aqi ?? -Infinity;
      return currentAqi > prevAqi ? current : prev;
    }, forecastData?.hourlyForecasts[0]);

    const worstRoute = commuteRoutes.reduce((prev, route) => {
      const prevMax = prev?.aqiStats?.maxAqi ?? -Infinity;
      const currentMax = route.aqiStats?.maxAqi ?? -Infinity;
      return currentMax > prevMax ? route : prev;
    }, commuteRoutes[0] ?? null);

    return {
      cityName,
      airQuality: {
        aqi: aqiData.aqi,
        category: aqiData.category,
        dominantPollutant: aqiData.dominantPollutant,
        timestamp: aqiData.timestamp,
      },
      forecast: peakForecast
        ? {
            peakDateTime: peakForecast.dateTime,
            peakAqi: peakForecast.indexes?.find((idx) => idx.code === 'uaqi')?.aqi,
            peakCategory: peakForecast.indexes?.find((idx) => idx.code === 'uaqi')?.category,
          }
        : null,
      commute: worstRoute
        ? {
            routeName: worstRoute.summary?.id || worstRoute.summary?.mode || 'Commute',
            maxAqi: worstRoute.aqiStats?.maxAqi,
            averageAqi: worstRoute.aqiStats?.averageAqi,
          }
        : null,
    };
  }, [aqiData, forecastData, commuteRoutes, cityName]);

  const fetchBriefing = useCallback(async () => {
    if (!enabled || !payload) return;

    setState({ data: null, loading: true, error: null });

    try {
      const response = await fetch('/api/agent/briefing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ context: payload }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({} as { error?: string }));
        throw new Error(err.error || '無法取得多級摘要');
      }

      const data = (await response.json()) as BriefingAgentResponse;
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error.message : '多級摘要取得失敗',
      });
    }
  }, [enabled, payload]);

  useEffect(() => {
    fetchBriefing();
  }, [fetchBriefing]);

  return {
    ...state,
    refetch: fetchBriefing,
  };
}
