import { AQI_LEVELS } from './constants';

/**
 * 根據 AQI 值獲取對應的等級資訊
 */
export function getAQILevel(aqi: number) {
  for (const [key, level] of Object.entries(AQI_LEVELS)) {
    if (aqi <= level.max) {
      return { key, ...level };
    }
  }
  return { key: 'HAZARDOUS', ...AQI_LEVELS.HAZARDOUS };
}

/**
 * 格式化坐標到指定精度（用於快取鍵）
 */
export function roundCoordinate(coord: number, precision: number = 2): number {
  const multiplier = Math.pow(10, precision);
  return Math.round(coord * multiplier) / multiplier;
}

/**
 * 生成快取鍵
 */
export function getCacheKey(lat: number, lng: number, prefix: string = 'aqi'): string {
  const roundedLat = roundCoordinate(lat);
  const roundedLng = roundCoordinate(lng);
  return `${prefix}:${roundedLat}:${roundedLng}`;
}

/**
 * 防抖函數
 */
export function debounce<T extends (...args: never[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * 計算兩個坐標之間的距離（公里）
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // 地球半徑（公里）
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * 根據精度計算建議的縮放級別
 */
export function getZoomFromAccuracy(accuracy: number): number {
  if (accuracy < 100) return 15;
  if (accuracy < 500) return 14;
  if (accuracy < 2000) return 13;
  return 12;
}

/**
 * 格式化時間戳
 */
export function formatTimestamp(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 驗證坐標是否有效
 */
export function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}
