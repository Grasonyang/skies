import { NextRequest, NextResponse } from 'next/server';
import { cacheService } from '@/services/cacheService';
import { getCacheKey, isValidCoordinate } from '@/lib/utils';
import { AirQualityResponse, AQIData } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const AIR_QUALITY_API_URL = 'https://airquality.googleapis.com/v1/currentConditions:lookup';

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
export async function GET(request: NextRequest) {
  try {
    if (!GOOGLE_MAPS_API_KEY) {
        return NextResponse.json(
            { error: 'GOOGLE_MAPS_API_KEY 未設定' },
            { status: 500 }
        );
    }
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
    const cached = await cacheService.get<AQIData>(cacheKey);

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

    try {
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
              languageCode: 'zh-TW',
            }),
          });


      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API 錯誤回應:', errorText);
        throw new Error(
          `API 請求失敗: ${response.status} ${response.statusText}`
        );
      }
      const apiData: AirQualityResponse = await response.json();
      const data = transformResponse(apiData, lat, lng);


      if (!data) {
        return NextResponse.json(
          { error: '該地區暫無空氣品質數據' },
          { status: 404 }
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
    } catch (apiError) {
      console.error('❌ Google API 調用失敗:', apiError);

      return NextResponse.json(
        {
          error: '無法獲取空氣品質數據',
          message: apiError instanceof Error ? apiError.message : '該地區可能暫無監測數據',
          details: '請嘗試選擇其他地點或稍後再試'
        },
        { status: 503 }
      );
    }
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
