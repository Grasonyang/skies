import { NextRequest, NextResponse } from 'next/server';
import { airQualityService } from '@/services/airQualityService';
import { isValidCoordinate } from '@/lib/utils';

/**
 * 空氣品質預測 API · Air Quality Forecast API
 * GET /api/air-quality/forecast?lat=24.147736&lng=120.673648&hours=24
 */

function buildErrorResponse(
  zh: string,
  en: string,
  status: number,
  extras: Record<string, unknown> = {}
) {
  return NextResponse.json(
    {
      error: `${zh} / ${en}`,
      translations: {
        zh,
        en,
      },
      ...extras,
    },
    { status }
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '0');
  const lng = parseFloat(searchParams.get('lng') || '0');
  const hours = parseInt(searchParams.get('hours') || '24', 10);

  if (!isValidCoordinate(lat, lng)) {
    return buildErrorResponse(
      '無效的坐標參數',
      'Invalid coordinate parameters',
      400,
      { lat, lng }
    );
  }

  if (Number.isNaN(hours) || hours < 1 || hours > 96) {
    return buildErrorResponse(
      '預測時數必須在 1-96 小時之間',
      'Forecast hours must be between 1 and 96',
      400,
      { hours }
    );
  }

  try {
    const forecast = await airQualityService.getHourlyForecast(lat, lng, hours);

    return NextResponse.json(forecast, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800',
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    const messageZh = error instanceof Error ? error.message : '伺服器錯誤';

    if (messageZh.includes('暫無')) {
      return buildErrorResponse(
        messageZh,
        'No forecast data available for the requested coordinates',
        404,
        { lat, lng }
      );
    }

    return buildErrorResponse(
      messageZh,
      'Server error. Please try again later.',
      500
    );
  }
}
