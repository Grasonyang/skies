import { AQIData } from '@/types';
import { ForecastResponse } from '@/types/forecast';
import { cacheService } from './cacheService';
import { getCacheKey } from '@/lib/utils';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const AIR_QUALITY_API_URL = 'https://airquality.googleapis.com/v1/currentConditions:lookup';

/**
 * Google Air Quality API 服務
 */
class AirQualityService {
  private useMockData: boolean;

  constructor() {
    this.useMockData = !GOOGLE_MAPS_API_KEY;

    if (this.useMockData) {
      console.warn('⚠️ GOOGLE_MAPS_API_KEY 未設定，將改用模擬的空氣品質數據');
    }
  }

  /**
   * 獲取當前空氣品質數據（直接調用 Google API）
   */
  async getCurrentConditions(
    lat: number,
    lng: number,
  ): Promise<AQIData | null> {
    if (this.useMockData) {
      return this.generateMockConditions(lat, lng);
    }

    try {
      const cacheKey = getCacheKey(lat, lng);
      const cached = await cacheService.get<AQIData>(cacheKey);

      if (cached) {
        return cached;
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
          languageCode: 'zh-TW',
        }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`⚠️ 該地區暫無空氣品質數據: (${lat}, ${lng})`);
          return null;
        }
        throw new Error(`API 請求失敗: ${response.status} ${response.statusText}`);
      }

      const apiData = await response.json();
      const data = this.transformResponse(apiData, lat, lng);

      await cacheService.set(cacheKey, data);

      return data;
    } catch (error) {
      console.error('❌ 獲取空氣品質數據失敗:', error);
      if (error instanceof Error) {
        console.error('錯誤詳情:', error.message);
        if ('cause' in error) {
          console.error('錯誤原因:', error.cause);
        }
      }
      return null;
    }
  }

  /**
   * 轉換 API 回應為內部數據格式
   */
  private transformResponse(response: {
    indexes?: Array<{
      code: string;
      aqi: number;
      category: string;
      dominantPollutant: string;
    }>;
    pollutants?: Array<{
      code: string;
      displayName: string;
      fullName: string;
      concentration: {
        value: number;
        units: string;
      };
      additionalInfo?: string;
    }>;
    dateTime: string;
  }, lat: number, lng: number): AQIData {
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
      const normalizedIndex = hours > 1 ? index / (hours - 1) : 0;
      const diurnalFactor = Math.sin(normalizedIndex * Math.PI); // 模擬日夜循環
      const deterministicSeed = this.hashCoordinates(
        (current.location?.lat ?? 0) + index * 0.01,
        (current.location?.lng ?? 0) - index * 0.01
      );

      const variation = (deterministicSeed - 0.5) * 0.25 + diurnalFactor * 0.2;
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
        pollutants: current.pollutants?.map((pollutant, pollutantIndex) => {
          const pollutantSeed = this.hashCoordinates(
            (current.location?.lat ?? 0) + pollutantIndex * 0.02 + index * 0.005,
            (current.location?.lng ?? 0) - pollutantIndex * 0.02 - index * 0.005
          );
          const pollutantVariation =
            (pollutantSeed - 0.5) * 0.35 + diurnalFactor * 0.25;
          const nextValue = Math.max(
            0,
            Number(
              (pollutant.concentration.value * (1 + pollutantVariation)).toFixed(1)
            )
          );

          return {
            code: pollutant.code,
            displayName: pollutant.displayName,
            fullName: pollutant.fullName,
            concentration: {
              ...pollutant.concentration,
              value: nextValue,
            },
            additionalInfo: pollutant.additionalInfo,
          };
        }),
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
