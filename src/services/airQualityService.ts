import { AQIData } from '@/types';
import { ForecastResponse } from '@/types/forecast';
import { cacheService } from './cacheService';
import { getCacheKey } from '@/lib/utils';

// Helper to construct the base URL for API calls
const getBaseUrl = () => {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
};


/**
 * Google Air Quality API 服務
 */
class AirQualityService {
  private useMockData: boolean;

  constructor() {
    this.useMockData = !process.env.GOOGLE_MAPS_API_KEY;

    if (this.useMockData) {
      console.warn('⚠️ GOOGLE_MAPS_API_KEY 未設定，將改用模擬的空氣品質數據');
    }
  }

  /**
   * 獲取當前空氣品質數據（帶重試機制）
   */
  async getCurrentConditions(
    lat: number,
    lng: number,
  ): Promise<AQIData | null> {
    if (this.useMockData) {
      return this.generateMockConditions(lat, lng);
    }

    try {
        const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}/api/air-quality/current?lat=${lat}&lng=${lng}`);
        if(!response.ok) {
            return null;
        }

        const data = await response.json();
        return data;

    } catch (error) {
      console.error('❌ 獲取空氣品質數據失敗:', error);
      if (error instanceof Error) {
        console.error('錯誤詳情:', error.message);
        if ('cause' in error) {
          console.error('錯誤原因:', error.cause);
        }
      }
      throw error;
    }
  }

  /**
   * 獲取模擬的未來空氣品質預測
   */
  async getHourlyForecast(
    lat: number,
    lng: number,
    hours: number = 24
  ): Promise<ForecastResponse> {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error('無效的坐標參數');
    }

    if (hours < 1 || hours > 96) {
      throw new Error('預測時數必須在 1-96 小時之間');
    }

    const cacheKey = getCacheKey(lat, lng, `forecast:${hours}`);
    const cached = await cacheService.get<ForecastResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const current = await this.getCurrentConditions(lat, lng);
    if (!current) {
      throw new Error('該地區暫無空氣品質數據');
    }

    const simulated = this.simulateForecast(current, hours);
    await cacheService.set(cacheKey, simulated, 30 * 60 * 1000); // 30 分鐘 TTL

    return simulated;
  }

  private generateMockConditions(lat: number, lng: number): AQIData {
    const seed = this.hashCoordinates(lat, lng);
    const baseAqi = Math.round(45 + seed * 180);
    const dominantList = ['pm25', 'pm10', 'o3', 'no2', 'so2', 'co'];
    const dominantPollutant = dominantList[Math.floor(seed * dominantList.length) % dominantList.length];

    const pollutants = dominantList.map((code, index) => {
      const pollutantSeed = this.hashCoordinates(lat + index * 0.01, lng - index * 0.01);
      return {
        code,
        displayName: code.toUpperCase(),
        fullName: `${code.toUpperCase()} 模擬濃度`,
        concentration: {
          value: Number((pollutantSeed * 80 + 10).toFixed(1)),
          units: 'µg/m³',
        },
        additionalInfo: '此為模擬數據，僅供開發測試使用。',
      };
    });

    const timestamp = new Date().toISOString();
    const category = this.getAQICategory(baseAqi);

    const data: AQIData = {
      aqi: baseAqi,
      category,
      dominantPollutant,
      pollutants,
      timestamp,
      location: { lat, lng },
      indexes: [
        {
          code: 'uaqi',
          aqi: baseAqi,
          category,
          dominantPollutant,
        },
      ],
    };

    return data;
  }

  private hashCoordinates(lat: number, lng: number): number {
    const raw = Math.sin(lat * 12.9898 + lng * 78.233) * 43758.5453;
    return raw - Math.floor(raw);
  }

  private simulateForecast(current: AQIData, hours: number): ForecastResponse {
    const baseAqi = current.aqi;
    const dominantPollutant = current.dominantPollutant ?? 'pm25';

    const hourlyForecasts = Array.from({ length: hours }).map((_, index) => {
      const variation = (Math.random() - 0.5) * 0.3; // ±15% 波動
      const predictedAqi = Math.round(baseAqi * (1 + variation));
      const normalizedAqi = Math.max(0, Math.min(500, predictedAqi));

      const forecastTime = new Date(Date.now() + index * 60 * 60 * 1000);

      return {
        dateTime: forecastTime.toISOString(),
        indexes: [
          {
            code: 'uaqi',
            aqi: normalizedAqi,
            category: this.getAQICategory(normalizedAqi),
            dominantPollutant,
          },
        ],
        pollutants: current.pollutants?.map((pollutant) => ({
          code: pollutant.code,
          displayName: pollutant.displayName,
          concentration: pollutant.concentration,
        })),
      };
    });

    const aqiValues = hourlyForecasts.map((forecast) =>
      forecast.indexes.find((index) => index.code === 'uaqi')?.aqi ?? null
    );

    const validAqiValues = aqiValues.filter((value): value is number => value !== null);

    const averageAqi =
      validAqiValues.length > 0
        ? validAqiValues.reduce((sum, value) => sum + value, 0) / validAqiValues.length
        : baseAqi;

    const meanAbsoluteDeviation =
      validAqiValues.length > 0
        ? validAqiValues.reduce((sum, value) => sum + Math.abs(value - averageAqi), 0) /
          validAqiValues.length
        : 0;

    const range =
      validAqiValues.length > 0
        ? Math.max(...validAqiValues) - Math.min(...validAqiValues)
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

    return {
      hourlyForecasts,
      location: {
        latitude: current.location.lat,
        longitude: current.location.lng,
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
  }

  private getAQICategory(aqi: number): string {
    if (aqi <= 50) return 'EXCELLENT';
    if (aqi <= 100) return 'MODERATE';
    if (aqi <= 150) return 'UNHEALTHY_FOR_SENSITIVE_GROUPS';
    if (aqi <= 200) return 'UNHEALTHY';
    if (aqi <= 300) return 'VERY_UNHEALTHY';
    return 'HAZARDOUS';
  }

  /**
   * 批量獲取多個位置的空氣品質數據
   */
  async getBatchConditions(
    locations: Array<{ lat: number; lng: number }>
  ): Promise<AQIData[]> {
    const promises = locations.map((loc) =>
      this.getCurrentConditions(loc.lat, loc.lng).catch((error) => {
        console.error(`獲取位置 (${loc.lat}, ${loc.lng}) 數據失敗:`, error);
        return null;
      })
    );

    const results = await Promise.all(promises);
    return results.filter((data): data is AQIData => data !== null);
  }
}

// 導出單例
export const airQualityService = new AirQualityService();
