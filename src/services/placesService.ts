import { cacheService } from './cacheService';

export interface Place {
  name: string;
  location: {
    lat: number;
    lng: number;
  };
  types: string[];
  address?: string;
  rating?: number;
}

/**
 * Google Places API 服務
 */
class PlacesService {
  /**
   * 獲取附近場域
   */
  async getNearbyPlaces(
    location: { lat: number; lng: number },
    activityType: string[] = ['park'],
    radius: number = 5000
  ): Promise<Place[]> {
    const cacheKey = `places:${location.lat},${location.lng}:${activityType.join(',')}}`;
    
    // 檢查快取（15 分鐘）
    const cached = await cacheService.get<Place[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch('/api/places/nearby', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location: {
            latitude: location.lat,
            longitude: location.lng,
          },
          radius,
          type: activityType,
          languageCode: 'zh-TW', // TODO: Make this dynamic
        }),
      });

      if (!response.ok) {
        throw new Error(`Places API 請求失敗: ${response.status}`);
      }

      const data = await response.json();
      const places = data.places || [];

      // 快取結果（15 分鐘）
      await cacheService.set(cacheKey, places, 15 * 60 * 1000);

      return places;
    } catch (error) {
      console.error('❌ 獲取附近場域失敗:', error);
      throw error;
    }
  }

  /**
   * 獲取 AI 建議
   */
  async getRecommendation(
    activity: string,
    scenario: {
      location: string;
      timeSlots: Array<{
        time: string;
        aqi: number;
        category: string;
        dominantPollutant: string;
      }>;
      bestTime?: string;
      worstTime?: string;
    },
    userProfile?: {
      sensitivity?: string;
      preferences?: string[];
    }
  ): Promise<{
    recommendation: string;
    source: string;
    confidence: number;
  }> {
    try {
      const response = await fetch('/api/agent/recommendation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activity,
          scenario,
          userProfile,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI 建議請求失敗: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ 獲取 AI 建議失敗:', error);
      throw error;
    }
  }
}

// 導出單例
export const placesService = new PlacesService();
