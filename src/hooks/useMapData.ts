import { useMemo, useEffect, useState, useCallback } from 'react';
import { AQIData, Location } from '@/types';
import { ForecastResponse } from '@/types/forecast';
import { useAirQuality } from './useAirQuality';
import { useAirQualityForecast } from './useAirQualityForecast';
import { useCommuteZones } from './useCommuteZones';
import { useCommuteGuardian } from './useCommuteGuardian';
import { DEFAULT_LOCATION } from '@/lib/constants';

export interface Coordinates {
  lat: number;
  lng: number;
}

interface UseMapDataOptions {
  queryLocation: Coordinates | null;
  userLocation: Location | null;
  commuteDestination: Coordinates | null;
  commuteEnabled: boolean;
  hours?: number;
}

export interface PeakPollutionEvent {
  dateTime: string;
  aqi: number;
  category: string;
}

export interface ReverseGeocodeResult {
  city?: string;
  district?: string;

  country?: string;
  formattedAddress?: string;
}

export interface MapDataResult {
  aqiData: AQIData | null;
  aqiLoading: boolean;
  aqiError: string | null;
  forecastData: ForecastResponse | null;
  forecastLoading: boolean;
  forecastError: string | null;
  commuteZones: ReturnType<typeof useCommuteZones>;
  commuteRoutes: ReturnType<typeof useCommuteGuardian>['routes'];
  commuteLoading: boolean;
  commuteError: string | null;
  refetchCommute: ReturnType<typeof useCommuteGuardian>['refetch'];
  peakEvent: PeakPollutionEvent | null;
  briefingContext: {
    cityName: string;
    formattedAddress?: string;
    mayorHandle?: string;
  };
  geocode: {
    data: ReverseGeocodeResult | null;
    loading: boolean;
    error: string | null;
    refetch: () => void;
  };
}

interface GeocodeState {
  data: ReverseGeocodeResult | null;
  loading: boolean;
  error: string | null;
}

const DEFAULT_BRIEFING_CONTEXT = {
  cityName: DEFAULT_LOCATION.name,
  formattedAddress: undefined,
  mayorHandle: undefined,
};

export function useMapData({
  queryLocation,
  userLocation,
  commuteDestination,
  commuteEnabled,
  hours = 24,
}: UseMapDataOptions): MapDataResult {
  const { data: aqiData, loading: aqiLoading, error: aqiError, refetch: refetchAqi } = useAirQuality({
    lat: queryLocation?.lat ?? DEFAULT_LOCATION.lat,
    lng: queryLocation?.lng ?? DEFAULT_LOCATION.lng,
    enabled: Boolean(queryLocation),
  });

  const {
    data: forecastData,
    loading: forecastLoading,
    error: forecastError,
    refetch: refetchForecast,
  } = useAirQualityForecast({
    lat: queryLocation?.lat ?? DEFAULT_LOCATION.lat,
    lng: queryLocation?.lng ?? DEFAULT_LOCATION.lng,
    hours,
    enabled: Boolean(queryLocation),
  });

  const commuteZones = useCommuteZones({
    location: userLocation,
    aqiData,
  });

  const commuteOrigin = useMemo<Coordinates>(() => ({
    lat: userLocation?.lat ?? DEFAULT_LOCATION.lat,
    lng: userLocation?.lng ?? DEFAULT_LOCATION.lng,
  }), [userLocation]);

  const {
    routes: commuteRoutes,
    loading: commuteLoading,
    error: commuteError,
    refetch: refetchCommute,
  } = useCommuteGuardian({
    origin: commuteOrigin,
    destination: commuteDestination,
    mode: 'driving',
    enabled: commuteEnabled && Boolean(commuteDestination),
  });

  const peakEvent = useMemo<PeakPollutionEvent | null>(() => {
    if (!forecastData?.hourlyForecasts?.length) return null;

    const peak = forecastData.hourlyForecasts
      .map((entry) => {
        const index = entry.indexes?.find((idx) => idx.code === 'uaqi');
        return index
          ? {
              dateTime: entry.dateTime,
              aqi: index.aqi,
              category: index.category,
            }
          : null;
      })
      .filter((value): value is PeakPollutionEvent => value !== null)
      .sort((a, b) => b.aqi - a.aqi)[0];

    return peak ?? null;
  }, [forecastData]);

  const [geocodeState, setGeocodeState] = useState<GeocodeState>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchGeocode = useCallback(async () => {
    if (!queryLocation) {
      setGeocodeState({ data: null, loading: false, error: null });
      return;
    }

    setGeocodeState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const params = new URLSearchParams({
        lat: String(queryLocation.lat),
        lng: String(queryLocation.lng),
      });

      const res = await fetch(`/api/places/geocode?${params.toString()}`);

      if (!res.ok) {
        const err = await res.json().catch(() => ({} as { error?: string }));
        throw new Error(err.error || '地理資訊取得失敗');
      }

      const data: ReverseGeocodeResult = await res.json();
      setGeocodeState({ data, loading: false, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : '地理資訊取得失敗';
      setGeocodeState({ data: null, loading: false, error: message });
    }
  }, [queryLocation]);

  useEffect(() => {
    fetchGeocode();
  }, [fetchGeocode]);

  const briefingContext = useMemo(() => {
    if (!geocodeState.data) return DEFAULT_BRIEFING_CONTEXT;

    return {
      cityName:
        geocodeState.data.city ||
        geocodeState.data.district ||
        DEFAULT_LOCATION.name,
      formattedAddress: geocodeState.data.formattedAddress,
      mayorHandle: undefined,
    };
  }, [geocodeState.data]);

  useEffect(() => {
    if (!queryLocation) return;

    // 當查詢位置更新時，同步重新抓取 AQI 與 Forecast
    refetchAqi();
    refetchForecast();
  }, [queryLocation, refetchAqi, refetchForecast]);

  return {
    aqiData,
    aqiLoading,
    aqiError,
    forecastData,
    forecastLoading,
    forecastError,
    commuteZones,
    commuteRoutes,
    commuteLoading,
    commuteError,
    refetchCommute,
    peakEvent,
    briefingContext,
    geocode: {
      ...geocodeState,
      refetch: fetchGeocode,
    },
  };
}
