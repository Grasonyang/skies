// 預設位置：台中市中心
export const DEFAULT_LOCATION = {
  lat: 24.147736,
  lng: 120.673648,
  name: '台中市',
};

// 位置獲取超時時間（毫秒）
export const GEOLOCATION_TIMEOUT = 5000;

// 快取 TTL（毫秒）
export const CACHE_TTL = 5 * 60 * 1000; // 5 分鐘

// 防抖延遲（毫秒）
export const MAP_MOVE_DEBOUNCE = 1000;

// 縮放級別配置
export const ZOOM_LEVELS = {
  MIN_AUTO_QUERY: 12,
  MAX_GRID_QUERY: 15,
  STREET_LEVEL: 16,
} as const;

// 網格大小配置
export const GRID_SIZE = {
  ZOOM_12_13: { rows: 3, cols: 3 }, // 9 個點
  ZOOM_14_15: { rows: 5, cols: 5 }, // 25 個點
} as const;

// AQI 等級顏色配置
export const AQI_LEVELS = {
  GOOD: { max: 50, color: '#10B981', label: '良好' },
  MODERATE: { max: 100, color: '#F59E0B', label: '普通' },
  UNHEALTHY_SENSITIVE: { max: 150, color: '#F97316', label: '對敏感族群不健康' },
  UNHEALTHY: { max: 200, color: '#EF4444', label: '不健康' },
  VERY_UNHEALTHY: { max: 300, color: '#8B5CF6', label: '非常不健康' },
  HAZARDOUS: { max: Infinity, color: '#7C2D12', label: '危險' },
} as const;

// API 端點
export const API_ENDPOINTS = {
  CURRENT: '/api/air-quality/current',
  FORECAST: '/api/air-quality/forecast',
  HISTORY: '/api/air-quality/history',
} as const;

// IP 定位服務
export const IP_GEOLOCATION_API = 'https://ipapi.co/json/';

// 熱力圖層配置
export const HEATMAP_CONFIG = {
  opacity: 0.45, // 降低透明度，讓地圖資訊更清楚
  tileSize: 256,
  baseUrl: 'https://airquality.googleapis.com/v1/mapTypes/UAQI_RED_GREEN/heatmapTiles',
} as const;
