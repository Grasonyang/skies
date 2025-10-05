import { AirQualityResponse, AQIData } from '@/types';
import { ForecastResponse } from '@/types/forecast';
import { cacheService } from './cacheService';
import { getCacheKey } from '@/lib/utils';

/**
 * Google Air Quality API 服務
 */
class AirQualityService {
  private apiKey: string;
  private baseUrl = 'https://airquality.googleapis.com/v1';
  private useMockData: boolean;

  constructor() {
    this.apiKey = process.env.GOOGLE_API_KEY || '';
    this.useMockData = !this.apiKey;

    if (this.useMockData) {
      console.warn('⚠️ GOOGLE_API_KEY 未設定，將改用模擬的空氣品質數據');
    }
  }

  /**
   * 獲取當前空氣品質數據（帶重試機制）
   */
  async getCurrentConditions(
    lat: number,
    lng: number,
    retries: number = 2
  ): Promise<AQIData | null> {
    if (this.useMockData) {
      return this.generateMockConditions(lat, lng);
    }

    try {
      const url = `${this.baseUrl}/currentConditions:lookup?key=${this.apiKey}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 增加到 30 秒

      try {
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
            // 請求所有支援的污染物數據
            extraComputations: [
              'HEALTH_RECOMMENDATIONS',
              'DOMINANT_POLLUTANT_CONCENTRATION',
              'POLLUTANT_CONCENTRATION',
              'POLLUTANT_ADDITIONAL_INFO',
              'LOCAL_AQI',
            ],
            languageCode: 'zh-TW',
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ API 錯誤回應:', errorText);
          throw new Error(
            `API 請求失敗: ${response.status} ${response.statusText}`
          );
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error('❌ 非 JSON 回應:', text);
          throw new Error('API 回應格式錯誤');
        }

        const data: AirQualityResponse = await response.json();

        // 檢查數據有效性
        if (!data || !data.indexes || data.indexes.length === 0) {
          console.error('❌ API 回應數據無效:', data);
          throw new Error('該地區暫無空氣品質數據');
        }

        // 轉換為我們的數據格式
        return this.transformResponse(data, lat, lng);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      // 如果是連線超時或網路錯誤，嘗試重試
      if (retries > 0 && (
        error instanceof Error && (
          error.name === 'AbortError' ||
          error.message.includes('fetch failed') ||
          error.message.includes('timeout')
        )
      )) {
        console.warn(`⚠️ 請求失敗，剩餘重試次數: ${retries}，正在重試...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // 等待 1 秒
        return this.getCurrentConditions(lat, lng, retries - 1);
      }

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

  /**
   * 轉換 API 回應為內部數據格式
   */
  private transformResponse(
    response: AirQualityResponse,
    lat: number,
    lng: number
  ): AQIData {
    // 使用 Universal AQI
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
