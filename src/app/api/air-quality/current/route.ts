import { NextRequest, NextResponse } from 'next/server';
import { cacheService } from '@/services/cacheService';
import { getCacheKey, isValidCoordinate } from '@/lib/utils';
import { AirQualityResponse, AQIData } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY_SERVER || process.env.GOOGLE_MAPS_API_KEY;
const AIR_QUALITY_API_URL = 'https://airquality.googleapis.com/v1/currentConditions:lookup';

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

/**
 * 轉換 API 回應為內部數據格式
 */
function transformResponse(
  response: AirQualityResponse,
  lat: number,
  lng: number
): AQIData {
  const universalAQI = response.indexes?.find((idx) => idx.code === 'uaqi');

  if (!universalAQI) {
    throw new Error('API 回應中缺少 AQI 數據');
  }

  return {
    aqi: universalAQI.aqi,
    category: universalAQI.category,
    dominantPollutant: universalAQI.dominantPollutant,
    pollutants: response.pollutants?.map((p) => ({
      code: p.code,
      displayName: p.displayName,
      fullName: p.fullName,
      concentration: p.concentration,
      additionalInfo: p.additionalInfo,
    })),
    timestamp: response.dateTime,
    location: { lat, lng },
    indexes: [
      {
        code: universalAQI.code,
        aqi: universalAQI.aqi,
        category: universalAQI.category,
        dominantPollutant: universalAQI.dominantPollutant,
      },
    ],
  };
}


/**
 * GET /api/air-quality/current
 * 查詢指定位置的當前空氣品質數據
 *
 * Query 參數:
 * - lat: 緯度 (必須)
 * - lng: 經度 (必須)
 */
async function fetchCurrentAirQuality(lat: number, lng: number) {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new HttpError(500, 'GOOGLE_MAPS_API_KEY 未設定');
  }

  const cacheKey = getCacheKey(lat, lng);
  const cached = await cacheService.get<AQIData>(cacheKey);

  if (cached) {
    return { data: cached, cacheHit: true } as const;
  }

  console.log(`🌐 調用 Google API: (${lat}, ${lng})`);
  const response = await fetch(`${AIR_QUALITY_API_URL}?key=${GOOGLE_MAPS_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      location: {
        latitude: lat,
        longitude: lng,
      },
      extraComputations: [
        'HEALTH_RECOMMENDATIONS',
        'DOMINANT_POLLUTANT_CONCENTRATION',
        'POLLUTANT_CONCENTRATION',
        'POLLUTANT_ADDITIONAL_INFO',
        'LOCAL_AQI',
      ],
      languageCode: 'zh-TW', // TODO: Make this dynamic based on request
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ API 錯誤回應:', errorText);
    throw new HttpError(
      response.status === 404 ? 404 : response.status || 502,
      response.status === 404
        ? '該地區暫無空氣品質數據'
        : `API 請求失敗: ${response.status} ${response.statusText}`
    );
  }

  const apiData: AirQualityResponse = await response.json();
  const data = transformResponse(apiData, lat, lng);

  await cacheService.set(cacheKey, data);

  return { data, cacheHit: false } as const;
}

export async function GET(request: NextRequest) {
  try {
    // 獲取查詢參數
    const { searchParams } = new URL(request.url);
    const latStr = searchParams.get('lat');
    const lngStr = searchParams.get('lng');

    // 驗證參數
    if (!latStr || !lngStr) {
      return NextResponse.json(
        { error: '缺少必要參數: lat 和 lng' },
        { status: 400 }
      );
    }

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (!isValidCoordinate(lat, lng)) {
      return NextResponse.json(
        { error: '無效的坐標參數' },
        { status: 400 }
      );
    }

    console.log(`📡 收到空氣品質查詢請求: (${lat}, ${lng})`);

    const { data, cacheHit } = await fetchCurrentAirQuality(lat, lng);

    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
        'X-Cache': cacheHit ? 'HIT' : 'MISS',
      },
    });
  } catch (error) {
    console.error('❌ API 路由錯誤:', error);

    if (error instanceof HttpError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        error: '伺服器錯誤',
        message: error instanceof Error ? error.message : '未知錯誤',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || !Array.isArray(body.locations)) {
      return NextResponse.json(
        { error: '請提供有效的 locations 陣列' },
        { status: 400 }
      );
    }

    const normalized: Array<{ lat: number; lng: number }> = [];
    for (const loc of body.locations as Array<{ lat?: unknown; lng?: unknown }>) {
      const latValue =
        typeof loc.lat === 'string' ? parseFloat(loc.lat) : Number(loc.lat ?? Number.NaN);
      const lngValue =
        typeof loc.lng === 'string' ? parseFloat(loc.lng) : Number(loc.lng ?? Number.NaN);

      if (!Number.isFinite(latValue) || !Number.isFinite(lngValue)) {
        continue;
      }

      normalized.push({ lat: latValue, lng: lngValue });
    }

    if (!normalized.length) {
      return NextResponse.json(
        { error: '缺少有效的緯經度資料' },
        { status: 400 }
      );
    }

    const uniqueLocations = Array.from(
      new Map(
        normalized
          .filter(({ lat, lng }) => isValidCoordinate(lat, lng))
          .map((loc) => [`${loc.lat.toFixed(6)}:${loc.lng.toFixed(6)}`, loc])
      ).values()
    ).slice(0, 25); // 避免一次性請求過多位置

    if (!uniqueLocations.length) {
      return NextResponse.json(
        { error: '所有提供的座標皆無效' },
        { status: 400 }
      );
    }

    const results = [] as AQIData[];
    const errors = [] as Array<{ lat: number; lng: number; error: string }>;

    const settled = await Promise.allSettled(
      uniqueLocations.map(async ({ lat, lng }) => {
        const { data } = await fetchCurrentAirQuality(lat, lng);
        return data;
      })
    );

    settled.forEach((item, index) => {
      const loc = uniqueLocations[index];
      if (item.status === 'fulfilled') {
        results.push(item.value);
      } else {
        const reason = item.reason;
        const message =
          reason instanceof HttpError
            ? reason.message
            : reason instanceof Error
              ? reason.message
              : '未知錯誤';
        errors.push({ lat: loc.lat, lng: loc.lng, error: message });
      }
    });

    return NextResponse.json(
      {
        count: results.length,
        data: results,
        errors,
      },
      {
        status: errors.length && !results.length ? 207 : 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    console.error('❌ 批量查詢失敗:', error);

    const message = error instanceof Error ? error.message : '伺服器錯誤';
    const status = error instanceof HttpError ? error.status : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
