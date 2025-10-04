// 位置相關類型
export interface Location {
  lat: number;
  lng: number;
  accuracy?: number;
  source: 'gps' | 'ip' | 'default';
}

export interface GeolocationState {
  location: Location | null;
  loading: boolean;
  error: string | null;
}

// 空氣品質相關類型
export interface AQIData {
  aqi: number;
  category: string;
  dominantPollutant: string;
  pollutants?: Pollutant[];
  timestamp: string;
  location: {
    lat: number;
    lng: number;
  };
  // 為了兼容性，添加 indexes 字段
  indexes?: Array<{
    code: string;
    aqi: number;
    category: string;
    dominantPollutant: string;
  }>;
}

export interface Pollutant {
  code: string;
  displayName: string;
  fullName: string;
  concentration: {
    value: number;
    units: string;
  };
  additionalInfo?: string;
}

// Google Air Quality API 回應類型
export interface AirQualityResponse {
  indexes: Array<{
    code: string;
    displayName: string;
    aqi: number;
    aqiDisplay: string;
    color: {
      red: number;
      green: number;
      blue: number;
    };
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
}

// 空氣品質數據類型（用於組件）
export interface AirQualityData {
  indexes: Array<{
    code: string;
    displayName?: string;
    aqi: number;
    aqiDisplay?: string;
    color?: {
      red: number;
      green: number;
      blue: number;
    };
    category: string;
    dominantPollutant: string;
  }>;
  pollutants?: Array<{
    code: string;
    displayName: string;
    fullName?: string;
    concentration: {
      value: number;
      units: string;
    };
    additionalInfo?: string;
  }>;
  dateTime?: string;
}

// 快取相關類型
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// 地圖相關類型
export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapState {
  center: {
    lat: number;
    lng: number;
  };
  zoom: number;
  bounds?: MapBounds;
}
