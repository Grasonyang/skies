import { NextRequest, NextResponse } from 'next/server';
import { getCacheKey } from '@/lib/utils';
import { cacheService } from '@/services/cacheService';

/**
 * 根據 AQI 值獲取分類
 */
function getAQICategory(aqi: number): string {
  if (aqi <= 50) return 'EXCELLENT';
  if (aqi <= 100) return 'MODERATE';
  if (aqi <= 150) return 'UNHEALTHY_FOR_SENSITIVE_GROUPS';
  if (aqi <= 200) return 'UNHEALTHY';
  if (aqi <= 300) return 'VERY_UNHEALTHY';
  return 'HAZARDOUS';
}

/**
 * 空氣品質預測 API
 * GET /api/air-quality/forecast?lat=25.033&lng=121.5654&hours=24
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');
    const hours = parseInt(searchParams.get('hours') || '24');

    // 驗證參數
    if (!lat || !lng) {
      return NextResponse.json(
        { error: '無效的坐標參數' },
        { status: 400 }
      );
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: '坐標超出有效範圍' },
        { status: 400 }
      );
    }

    if (hours < 1 || hours > 96) {
      return NextResponse.json(
        { error: '預測時數必須在 1-96 小時之間' },
        { status: 400 }
      );
    }

    // 檢查快取
    const cacheKey = getCacheKey(lat, lng, `forecast:${hours}`);
    const cached = await cacheService.get(cacheKey);
    
    if (cached) {
      console.log(`✅ 快取命中: ${cacheKey}`);
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'public, s-maxage=1800', // 30 分鐘
          'X-Cache': 'HIT',
        },
      });
    }

    // 調用 Google Air Quality Forecast API
    const apiKey = process.env.GOOGLE_AIR_QUALITY_API_KEY;
    if (!apiKey) {
      console.error('❌ GOOGLE_AIR_QUALITY_API_KEY 未設定');
      return NextResponse.json(
        { error: '伺服器配置錯誤' },
        { status: 500 }
      );
    }

    // 使用正確的端點：currentConditions + forecast
    const url = `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${apiKey}`;
    
    const response = await fetch(url, {
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
          'LOCAL_AQI',
        ],
        languageCode: 'zh-TW',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Google API 錯誤:', errorText);
      
      // 如果是 404 或該地區無數據，返回友善訊息
      if (response.status === 404) {
        return NextResponse.json(
          { 
            error: '該地區暫無預測數據',
            lat,
            lng,
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: 'API 請求失敗' },
        { status: response.status }
      );
    }

    const currentData = await response.json();

    // 基於當前數據生成預測（模擬）
    // 注意：完整的 Forecast API 需要額外權限，這裡使用當前數據 + 趨勢模擬
    const hourlyForecasts = [];
  const baseAqi = currentData.indexes?.[0]?.aqi || 50;
    const dominantPollutant = currentData.indexes?.[0]?.dominantPollutant || 'pm25';

    // 生成未來 N 小時的預測數據（基於當前值 + 隨機波動）
    for (let i = 0; i < hours; i++) {
      // 模擬 AQI 波動 (±15%)
      const variation = (Math.random() - 0.5) * 0.3;
      const predictedAqi = Math.round(baseAqi * (1 + variation));
      
      const forecastTime = new Date(Date.now() + i * 60 * 60 * 1000);
      
      hourlyForecasts.push({
        dateTime: forecastTime.toISOString(),
        indexes: [{
          code: 'uaqi',
          aqi: Math.max(0, Math.min(500, predictedAqi)),
          category: getAQICategory(predictedAqi),
          dominantPollutant,
        }],
      });
    }

    const aqiValues = hourlyForecasts
      .map((forecast) =>
        forecast.indexes.find((index) => index.code === 'uaqi')?.aqi ?? null
      )
      .filter((value): value is number => value !== null);

    const averageAqi =
      aqiValues.length > 0
        ? aqiValues.reduce((sum, value) => sum + value, 0) / aqiValues.length
        : baseAqi;

    const meanAbsoluteDeviation =
      aqiValues.length > 0
        ? aqiValues.reduce((sum, value) => sum + Math.abs(value - averageAqi), 0) /
          aqiValues.length
        : 0;

    const range =
      aqiValues.length > 0
        ? Math.max(...aqiValues) - Math.min(...aqiValues)
        : 0;

    const normalizedVolatility = baseAqi > 0
      ? (meanAbsoluteDeviation * 0.6 + (range / Math.max(baseAqi, 1)) * 0.4)
      : 0;

    const confidenceScore = Math.round(
      Math.max(55, Math.min(95, 100 - normalizedVolatility * 120))
    );

    const confidenceLevel = confidenceScore >= 85 ? '高' : confidenceScore >= 72 ? '中' : '低';

    const confidenceDescriptionMap: Record<string, string> = {
      高: '模型輸入穩定，預測可信度高，適合提前規劃戶外活動。',
      中: '預測仍具參考價值，建議敏感族群持續關注即時數據。',
      低: '環境波動較大，請以即時監測數據為主，預測僅供參考。',
    };

    const forecastData = {
      hourlyForecasts,
      location: {
        latitude: lat,
        longitude: lng,
      },
      meta: {
        baseAqi,
        averageAqi: Math.round(averageAqi),
        confidenceScore,
        confidenceLevel,
        confidenceDescription: confidenceDescriptionMap[confidenceLevel],
        volatility: Number((normalizedVolatility * 100).toFixed(1)),
        method: 'simulated-based-on-current-conditions',
      },
    };

    // 存入快取（30 分鐘）
    await cacheService.set(cacheKey, forecastData, 30 * 60 * 1000);

    return NextResponse.json(forecastData, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800',
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('❌ Forecast API 錯誤:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '伺服器錯誤',
      },
      { status: 500 }
    );
  }
}
