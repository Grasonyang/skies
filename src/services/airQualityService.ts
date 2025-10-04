import { AirQualityResponse, AQIData } from '@/types';

/**
 * Google Air Quality API 服務
 */
class AirQualityService {
  private apiKey: string;
  private baseUrl = 'https://airquality.googleapis.com/v1';

  constructor() {
    this.apiKey = process.env.GOOGLE_AIR_QUALITY_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('⚠️ GOOGLE_AIR_QUALITY_API_KEY 未設定');
    }
  }

  /**
   * 獲取當前空氣品質數據
   */
  async getCurrentConditions(
    lat: number,
    lng: number
  ): Promise<AQIData | null> {
    try {
      const url = `${this.baseUrl}/currentConditions:lookup?key=${this.apiKey}`;
      
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
    } catch (error) {
      console.error('❌ 獲取空氣品質數據失敗:', error);
      throw error;
    }
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
    };
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
