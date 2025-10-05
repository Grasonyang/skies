export interface ForecastData {
  dateTime: string;
  indexes: Array<{
    code: string;
    aqi: number;
    category: string;
    dominantPollutant: string;
  }>;
  pollutants?: Array<{
    code: string;
    displayName: string;
    concentration: {
      value: number;
      units: string;
    };
  }>;
}

export interface ForecastMeta {
  baseAqi: number;
  averageAqi: number;
  confidenceScore: number;
  confidenceLevel: '高' | '中' | '低';
  confidenceDescription: string;
  volatility: number;
  method: string;
}

export interface ForecastResponse {
  hourlyForecasts: ForecastData[];
  location: {
    latitude: number;
    longitude: number;
  };
  meta?: ForecastMeta;
}
