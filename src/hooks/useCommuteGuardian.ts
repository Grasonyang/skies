'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CommuteGuardianResponse,
  CommuteGuardianRoute,
  CommuteRequestBody,
  Coordinate,
} from '@/types/commute';

interface UseCommuteGuardianOptions {
  origin: Coordinate | null;
  destination: Coordinate | null;
  mode?: CommuteRequestBody['mode'];
  enabled?: boolean;
}

interface UseCommuteGuardianReturn {
  routes: CommuteGuardianRoute[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCommuteGuardian({
  origin,
  destination,
  mode = 'driving',
  enabled = true,
}: UseCommuteGuardianOptions): UseCommuteGuardianReturn {
  const [routes, setRoutes] = useState<CommuteGuardianRoute[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestBody: CommuteRequestBody | null = useMemo(() => {
    if (!origin || !destination) return null;
    return {
      origin,
      destination,
      mode,
      alternatives: 1,
    };
  }, [origin, destination, mode]);

  const fetchRoutes = useCallback(async () => {
    if (!enabled || !requestBody) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/routes/commute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || '無法取得通勤建議');
      }

      const data: CommuteGuardianResponse = await response.json();
      setRoutes(data.routes ?? []);
    } catch (err) {
      console.error('[useCommuteGuardian] failed', err);
      setRoutes([]);
      setError(err instanceof Error ? err.message : '未知錯誤');
    } finally {
      setLoading(false);
    }
  }, [enabled, requestBody]);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  return {
    routes,
    loading,
    error,
    refetch: fetchRoutes,
  };
}
