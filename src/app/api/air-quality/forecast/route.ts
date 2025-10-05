import { NextRequest, NextResponse } from 'next/server';
import { airQualityService } from '@/services/airQualityService';
import { isValidCoordinate } from '@/lib/utils';

/**
 * 空氣品質預測 API
 * GET /api/air-quality/forecast?lat=25.033&lng=121.5654&hours=24
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '0');
  const lng = parseFloat(searchParams.get('lng') || '0');
  const hours = parseInt(searchParams.get('hours') || '24', 10);

  if (!isValidCoordinate(lat, lng)) {
    return NextResponse.json(
      { error: '無效的坐標參數' },
      { status: 400 }
    );
  }

  if (Number.isNaN(hours) || hours < 1 || hours > 96) {
    return NextResponse.json(
      { error: '預測時數必須在 1-96 小時之間' },
      { status: 400 }
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
    const message = error instanceof Error ? error.message : '伺服器錯誤';

    if (message.includes('暫無')) {
      return NextResponse.json({ error: message, lat, lng }, { status: 404 });
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
