import { NextRequest, NextResponse } from 'next/server';
import { airQualityService } from '@/services/airQualityService';
import { cacheService } from '@/services/cacheService';
import { getCacheKey, isValidCoordinate } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/air-quality/current
 * 查詢指定位置的當前空氣品質數據
 * 
 * Query 參數:
 * - lat: 緯度 (必須)
 * - lng: 經度 (必須)
 */
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

    // 檢查快取
    const cacheKey = getCacheKey(lat, lng);
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      console.log(`✅ 返回快取數據: ${cacheKey}`);
      return NextResponse.json(cached, {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
          'X-Cache': 'HIT',
        },
      });
    }

    // 調用 Google Air Quality API
    console.log(`🌐 調用 Google API: (${lat}, ${lng})`);
    const data = await airQualityService.getCurrentConditions(lat, lng);

    if (!data) {
      return NextResponse.json(
        { error: '無法獲取空氣品質數據' },
        { status: 500 }
      );
    }

    // 存入快取
    await cacheService.set(cacheKey, data);

    // 返回數據
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('❌ API 路由錯誤:', error);

    return NextResponse.json(
      {
        error: '伺服器錯誤',
        message: error instanceof Error ? error.message : '未知錯誤',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/air-quality/current/batch
 * 批量查詢多個位置的當前空氣品質數據
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { locations } = body;

    if (!Array.isArray(locations) || locations.length === 0) {
      return NextResponse.json(
        { error: '無效的請求體' },
        { status: 400 }
      );
    }

    // 驗證所有坐標
    for (const loc of locations) {
      if (!isValidCoordinate(loc.lat, loc.lng)) {
        return NextResponse.json(
          { error: '包含無效的坐標' },
          { status: 400 }
        );
      }
    }

    console.log(`📡 收到批量查詢請求: ${locations.length} 個位置`);

    // 批量查詢（帶快取）
    const results = await Promise.all(
      locations.map(async (loc: { lat: number; lng: number }) => {
        const cacheKey = getCacheKey(loc.lat, loc.lng);
        const cached = await cacheService.get(cacheKey);

        if (cached) {
          return cached;
        }

        const data = await airQualityService.getCurrentConditions(
          loc.lat,
          loc.lng
        );

        if (data) {
          await cacheService.set(cacheKey, data);
        }

        return data;
      })
    );

    const validResults = results.filter((r) => r !== null);

    return NextResponse.json(
      {
        count: validResults.length,
        data: validResults,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    console.error('❌ 批量查詢錯誤:', error);

    return NextResponse.json(
      {
        error: '伺服器錯誤',
        message: error instanceof Error ? error.message : '未知錯誤',
      },
      { status: 500 }
    );
  }
}
