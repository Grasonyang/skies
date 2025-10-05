import { NextRequest, NextResponse } from 'next/server';
import { airQualityService } from '@/services/airQualityService';
import { cacheService } from '@/services/cacheService';
import { samplePath } from '@/lib/polyline';
import { getCacheKey } from '@/lib/utils';
import {
  CommuteGuardianResponse,
  CommuteGuardianRoute,
  CommuteRequestBody,
  CommuteRouteSummary,
} from '@/types/commute';
import { isValidCoordinate } from '@/lib/utils';
import { decodePolyline } from '@/lib/polyline';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const DIRECTIONS_API_URL = 'https://maps.googleapis.com/maps/api/directions/json';
const DISTANCE_MATRIX_API_URL = 'https://maps.googleapis.com/maps/api/distancematrix/json';


interface DistanceMatrixResponse {
    status: string;
    rows: Array<{
      elements: Array<{
        status: string;
        duration: { text: string; value: number };
        distance: { text: string; value: number };
        duration_in_traffic?: { text: string; value: number };
      }>;
    }>;
    error_message?: string;
  }

  interface DirectionsResponse {
    routes: Array<{
      summary: string;
      warnings: string[];
      legs: Array<{
        distance: { text: string; value: number };
        duration: { text: string; value: number };
        end_address: string;
        start_address: string;
        steps: Array<{
          polyline: { points: string };
        }>;
      }>;
      overview_polyline: { points: string };
    }>;
    status: string;
    error_message?: string;
  }

  function metersToText(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)} 公尺`;
    }
    return `${(meters / 1000).toFixed(1)} 公里`;
  }

  function secondsToText(seconds: number): string {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
      return `${minutes} 分鐘`;
    }
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return remaining ? `${hours} 小時 ${remaining} 分` : `${hours} 小時`;
  }


async function getCommuteRoutes({
    origin,
    destination,
    mode = 'driving',
    alternatives = 1,
  }: CommuteRequestBody): Promise<CommuteRouteSummary[]> {

    const params = new URLSearchParams({
      origin: `${origin.lat},${origin.lng}`,
      destination: `${destination.lat},${destination.lng}`,
      mode,
      key: GOOGLE_MAPS_API_KEY!,
      alternatives: alternatives > 0 ? 'true' : 'false',
    });

    if (mode === 'driving' || mode === 'transit') {
      params.set('departure_time', 'now');
    }

    const directionsRes = await fetch(
      `${DIRECTIONS_API_URL}?${params.toString()}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!directionsRes.ok) {
      const message = await directionsRes.text();
      throw new Error(`Directions API 請求失敗: ${directionsRes.status} ${message}`);
    }

    const directionsData: DirectionsResponse = await directionsRes.json();

    if (directionsData.status !== 'OK') {
      throw new Error(
        `Directions API 回應異常: ${directionsData.status} ${directionsData.error_message ?? ''}`
      );
    }

    const matrixElement = await getDistanceMatrix({ origin, destination, mode });

    return directionsData.routes.map((route, index) => {
      const legs = route.legs.map((leg) => ({
        distance: leg.distance,
        duration: leg.duration,
        endAddress: leg.end_address,
        startAddress: leg.start_address,
        polyline: leg.steps.map((step) => step.polyline.points).join(''),
        points: leg.steps
          .flatMap((step) => decodePolyline(step.polyline.points))
          .filter((point, pointIndex, arr) => {
            if (pointIndex === 0) return true;
            const prev = arr[pointIndex - 1];
            return !(prev.lat === point.lat && prev.lng === point.lng);
          }),
      }));

      const overviewPath = decodePolyline(route.overview_polyline.points);
      const totalDistance = legs.reduce((sum, leg) => sum + leg.distance.value, 0);
      const totalDuration = legs.reduce((sum, leg) => sum + leg.duration.value, 0);

      return {
        id: `route-${index}`,
        mode,
        warnings: route.warnings ?? [],
        distanceText: metersToText(totalDistance),
        distanceValue: totalDistance,
        durationText: secondsToText(totalDuration),
        durationValue: totalDuration,
        legs,
        overviewPolyline: route.overview_polyline.points,
        overviewPath,
        durationInTrafficText: matrixElement?.durationInTrafficText ?? null,
        durationInTrafficValue: matrixElement?.durationInTrafficValue ?? null,
      };
    });
  }

  async function getDistanceMatrix({
    origin,
    destination,
    mode = 'driving',
  }: CommuteRequestBody): Promise<
    | {
        durationInTrafficText: string;
        durationInTrafficValue: number;
      }
    | null
  > {
    const params = new URLSearchParams({
      origins: `${origin.lat},${origin.lng}`,
      destinations: `${destination.lat},${destination.lng}`,
      key: GOOGLE_MAPS_API_KEY!,
      mode,
    });

    if (mode === 'driving' || mode === 'transit') {
      params.set('departure_time', 'now');
    }

    try {
      const res = await fetch(`${DISTANCE_MATRIX_API_URL}?${params.toString()}`);

      if (!res.ok) {
        return null;
      }

      const data: DistanceMatrixResponse = await res.json();
      if (data.status !== 'OK') {
        return null;
      }

      const element = data.rows?.[0]?.elements?.[0];
      if (!element || element.status !== 'OK') {
        return null;
      }

      const duration = element.duration_in_traffic ?? element.duration;

      return {
        durationInTrafficText: duration.text,
        durationInTrafficValue: duration.value,
      };
    } catch (error) {
      console.error('Distance Matrix API 調用失敗', error);
      return null;
    }
  }


export async function POST(request: NextRequest) {
  try {
    if (!GOOGLE_MAPS_API_KEY) {
        return NextResponse.json(
            { error: 'GOOGLE_MAPS_API_KEY 未設定' },
            { status: 500 }
        );
    }
    const body = (await request.json()) as CommuteRequestBody;

    if (!body?.origin || !body?.destination) {
      return NextResponse.json({ error: 'origin 與 destination 為必填參數' }, { status: 400 });
    }

    if (
      !isValidCoordinate(body.origin.lat, body.origin.lng) ||
      !isValidCoordinate(body.destination.lat, body.destination.lng)
    ) {
      return NextResponse.json({ error: '座標格式不正確' }, { status: 400 });
    }

    const cacheKey = buildCommuteCacheKey({
      origin: body.origin,
      destination: body.destination,
      mode: body.mode ?? 'driving',
    });

    const cached = await cacheService.get<CommuteGuardianResponse>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'public, s-maxage=600',
          'X-Cache': 'HIT',
        },
      });
    }

    const summaries = await getCommuteRoutes({
      origin: body.origin,
      destination: body.destination,
      mode: body.mode ?? 'driving',
      alternatives: body.alternatives ?? 1,
    });

    if (!summaries.length) {
      return NextResponse.json({ error: '無法取得路線建議' }, { status: 404 });
    }

    const sampleLookup = new Map<string, { lat: number; lng: number }>();
    const perRouteSamples = summaries.map((summary) => {
      const sampled = samplePath(summary.overviewPath, 900);
      return sampled.map((point) => {
        const key = buildKey(point.lat, point.lng);
        if (!sampleLookup.has(key)) {
          sampleLookup.set(key, point);
        }
        return { key, point };
      });
    });

    const uniqueSamples = Array.from(sampleLookup.values());
    const aqiResults = uniqueSamples.length
      ? await airQualityService.getBatchConditions(uniqueSamples)
      : [];

    const aqiByKey = new Map<string, number>();
    const pollutantByKey = new Map<string, string | undefined>();

    aqiResults.forEach((result) => {
      const key = buildKey(result.location.lat, result.location.lng);
      aqiByKey.set(key, result.aqi);
      pollutantByKey.set(key, result.dominantPollutant);
    });

    const routes: CommuteGuardianRoute[] = summaries.map((summary, index) => {
      const decoratedSamples = perRouteSamples[index].map(({ key, point }) => ({
        lat: point.lat,
        lng: point.lng,
        aqi: aqiByKey.get(key),
        dominantPollutant: pollutantByKey.get(key),
      }));

      const stats = computeRouteStats(decoratedSamples);

      return {
        summary,
        samples: decoratedSamples,
        aqiStats: stats,
      };
    });

    const response: CommuteGuardianResponse = {
      routes,
      origin: body.origin,
      destination: body.destination,
    };

    await cacheService.set(cacheKey, response, 10 * 60 * 1000);

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=600',
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('[CommuteGuardian] route error', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '伺服器錯誤',
      },
      { status: 500 }
    );
  }
}

function buildKey(lat: number, lng: number) {
  return `${lat.toFixed(4)}:${lng.toFixed(4)}`;
}

function computeRouteStats(
  samples: Array<{ aqi?: number; dominantPollutant?: string }>
) {
  const valid = samples.filter((sample) => typeof sample.aqi === 'number');

  if (!valid.length) {
    return undefined;
  }

  const total = valid.reduce((sum, item) => sum + (item.aqi ?? 0), 0);
  const max = valid.reduce((acc, item) => Math.max(acc, item.aqi ?? 0), 0);

  const pollutantCounts = valid.reduce((map, item) => {
    const code = item.dominantPollutant ?? 'unknown';
    map.set(code, (map.get(code) ?? 0) + 1);
    return map;
  }, new Map<string, number>());

  const dominantPollutants = Array.from(pollutantCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([code, count]) => ({ code, count }));

  return {
    averageAqi: Math.round(total / valid.length),
    maxAqi: max,
    dominantPollutants,
  };
}

function buildCommuteCacheKey({ origin, destination, mode }: { origin: { lat: number; lng: number }; destination: { lat: number; lng: number }; mode: string; }) {
  const originKey = getCacheKey(origin.lat, origin.lng, 'origin');
  const destinationKey = getCacheKey(destination.lat, destination.lng, 'destination');
  return `commute:${mode}:${originKey}:${destinationKey}`;
}
