'use client';

import React from 'react';
import { AQIData } from '@/types';
import { getAQILevel } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';

interface AirQualityPanelProps {
  data: AQIData | null;
  loading?: boolean;
  error?: string | null;
}

const pollutantNames: Record<string, string> = {
  pm25: 'PM2.5',
  pm10: 'PM10',
  o3: 'O₃',
  no2: 'NO₂',
  so2: 'SO₂',
  co: 'CO',
};

// 簡化單位顯示
const simplifyUnit = (unit: string): string => {
  const unitMap: Record<string, string> = {
    'PARTS_PER_BILLION': 'ppb',
    'PARTS_PER_MILLION': 'ppm',
    'MICROGRAMS_PER_CUBIC_METER': 'µg/m³',
  };
  return unitMap[unit] || unit;
};

export default function AirQualityPanel({
  data,
  loading,
  error,
}: AirQualityPanelProps) {
  const { t, locale } = useTranslation();
  if (loading) {
    return (
      <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-xl p-6 w-80 border border-gray-200">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-20 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl w-80 border border-red-200 overflow-hidden">
        <div className="p-6">
          <div className="text-center mb-4">
            <div className="text-4xl mb-2">⚠️</div>
            <h3 className="font-bold text-lg text-red-600 mb-2">{t('airQuality.errorTitle')}</h3>
          </div>
          <div className="bg-red-50 rounded-lg p-4 border border-red-100">
            <p className="text-sm text-red-800 text-center leading-relaxed">
              {error}
            </p>
          </div>
          <div className="mt-4 text-xs text-gray-600 text-center">
            💡 {t('airQuality.hint.noStations')}
            <br />
            {t('airQuality.hint.tryOtherLocation')}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const aqiLevel = getAQILevel(data.aqi);
  const dominantCode = (data.dominantPollutant ?? '').toLowerCase();
  const dateLocale = locale === 'en' ? 'en-US' : locale ?? 'zh-TW';

  const resolveLongName = (code: string, fallback?: string) => {
    const normalized = code.toLowerCase();
    const key = `pollutants.long.${normalized}`;
    const translated = t(key);
    return translated !== key ? translated : fallback ?? code.toUpperCase();
  };

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl w-80 border border-gray-200 overflow-hidden">
      {/* AQI 區塊 */}
      <div className="text-center px-6 pt-6 pb-4 bg-gradient-to-b from-gray-50 to-white">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          {t('airQuality.title')}
        </div>
        <div
          className="text-7xl font-bold mb-3 leading-none"
          style={{ color: aqiLevel.color }}
        >
          {data.aqi}
        </div>
        <div
          className="inline-block px-5 py-2 rounded-full text-white font-bold text-sm shadow-lg"
          style={{ backgroundColor: aqiLevel.color }}
        >
          {t(aqiLevel.labelKey ?? 'aqi.level.good')}
        </div>
      </div>

      {/* 主要污染物 Tag */}
      <div className="px-6 py-3 bg-amber-50 border-y border-amber-100">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-amber-800">{t('pollutants.dominantLabel')}</span>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-amber-200 text-amber-900">
              {pollutantNames[dominantCode] || pollutantNames[data.dominantPollutant] || data.dominantPollutant}
            </span>
            <span className="text-xs text-amber-700">
              {resolveLongName(dominantCode || data.dominantPollutant, data.dominantPollutant)}
            </span>
          </div>
        </div>
      </div>

      {/* 污染物濃度卡片 */}
      {data.pollutants && data.pollutants.length > 0 && (
        <div className="px-6 py-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {t('pollutants.concentrationTitle')}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {data.pollutants.slice(0, 4).map((pollutant) => {
              const value = pollutant.concentration.value;
              const unit = simplifyUnit(pollutant.concentration.units);
              const normalizedCode = pollutant.code.toLowerCase();

              return (
                <div
                  key={pollutant.code}
                  className="bg-gray-50 rounded-lg p-3 border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-xs font-bold text-gray-700">
                      {pollutantNames[normalizedCode] || pollutantNames[pollutant.code] || pollutant.displayName}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold text-gray-900">
                      {value.toFixed(1)}
                    </span>
                    <span className="text-xs text-gray-500 font-medium">
                      {unit}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 更新時間與位置 */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 space-y-1">
        <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
          <span className="text-gray-400">🕒</span>
          <span className="font-medium">
            {new Date(data.timestamp).toLocaleDateString(dateLocale, {
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
          <span className="text-gray-400">📍</span>
          <span className="font-mono">
            {data.location.lat.toFixed(4)}, {data.location.lng.toFixed(4)}
          </span>
        </div>
      </div>
    </div>
  );
}
