import { NextRequest, NextResponse } from 'next/server';
import { routesService } from '@/services/routesService';
import { airQualityService } from '@/services/airQualityService';
import { cacheService } from '@/services/cacheService';
import { samplePath } from '@/lib/polyline';
import { getCacheKey } from '@/lib/utils';
import {
  CommuteGuardianResponse,
  CommuteGuardianRoute,
  CommuteRequestBody,
} from '@/types/commute';
import { isValidCoordinate } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
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

    const summaries = await routesService.getCommuteRoutes({
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
