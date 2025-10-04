import { ActivityTemplate } from './types';

export const POLLUTANT_WEIGHTS: Record<string, number> = {
  pm25: 0.4,
  pm10: 0.15,
  o3: 0.25,
  no2: 0.1,
  so2: 0.05,
  co: 0.05,
};

export const ACTIVITY_TEMPLATES: ActivityTemplate[] = [
  {
    id: 'jogging',
    name: '晨跑',
    icon: '🏃',
    description: '30 分鐘慢跑',
    baseRiskFactor: 0.7,
    duration: 30,
    intensity: 'high',
  },
  {
    id: 'walking',
    name: '散步',
    icon: '🚶',
    description: '1 小時戶外散步',
    baseRiskFactor: 0.3,
    duration: 60,
    intensity: 'low',
  },
  {
    id: 'cycling',
    name: '騎車通勤',
    icon: '🚴',
    description: '20 分鐘自行車通勤',
    baseRiskFactor: 0.5,
    duration: 20,
    intensity: 'medium',
  },
  {
    id: 'outdoor_dining',
    name: '戶外用餐',
    icon: '🍽️',
    description: '1 小時戶外餐廳',
    baseRiskFactor: 0.2,
    duration: 60,
    intensity: 'low',
  },
  {
    id: 'playground',
    name: '兒童遊樂',
    icon: '🎪',
    description: '孩子在戶外遊樂場',
    baseRiskFactor: 0.6,
    duration: 45,
    intensity: 'medium',
  },
];

export const RISK_LEVEL_STYLES = {
  safe: {
    color: '#22c55e',
    label: '安全',
    recommendation: '✅ 適合進行此活動',
  },
  caution: {
    color: '#eab308',
    label: '注意',
    recommendation: '⚠️ 可以進行，但請注意身體狀況',
  },
  unhealthy: {
    color: '#f97316',
    label: '不宜',
    recommendation: '🚫 不建議進行此活動',
  },
  dangerous: {
    color: '#ef4444',
    label: '危險',
    recommendation: '⛔ 強烈建議取消或改為室內活動',
  },
} as const;
