'use client';

import React from 'react';
import { AQIData } from '@/types';
import { getAQILevel, formatTimestamp } from '@/lib/utils';

interface AirQualityPanelProps {
  data: AQIData | null;
  loading?: boolean;
  error?: string | null;
}

const pollutantNames: Record<string, string> = {
  pm25: 'PM2.5',
  pm10: 'PM10',
  o3: '臭氧 (O₃)',
  no2: '二氧化氮 (NO₂)',
  so2: '二氧化硫 (SO₂)',
  co: '一氧化碳 (CO)',
};

export default function AirQualityPanel({
  data,
  loading,
  error,
}: AirQualityPanelProps) {
  if (loading) {
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl p-6 w-80">
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
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl p-6 w-80">
        <div className="text-red-600">
          <h3 className="font-bold text-lg mb-2">❌ 錯誤</h3>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const aqiLevel = getAQILevel(data.aqi);

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl p-6 w-80 space-y-4">
      {/* AQI 標題 */}
      <div className="text-center">
        <h2 className="text-sm font-medium text-gray-600 mb-2">
          空氣品質指數 (AQI)
        </h2>
        <div
          className="text-6xl font-bold mb-2"
          style={{ color: aqiLevel.color }}
        >
          {data.aqi}
        </div>
        <div
          className="inline-block px-4 py-2 rounded-full text-white font-semibold text-sm"
          style={{ backgroundColor: aqiLevel.color }}
        >
          {aqiLevel.label}
        </div>
      </div>

      {/* 主要污染物 */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">主要污染物：</span>
          <span className="font-semibold">
            {pollutantNames[data.dominantPollutant] || data.dominantPollutant}
          </span>
        </div>
      </div>

      {/* 污染物詳情 */}
      {data.pollutants && data.pollutants.length > 0 && (
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            污染物濃度
          </h3>
          <div className="space-y-2">
            {data.pollutants.slice(0, 4).map((pollutant) => (
              <div
                key={pollutant.code}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-gray-600">
                  {pollutant.displayName}
                </span>
                <span className="font-medium">
                  {pollutant.concentration.value.toFixed(2)}{' '}
                  {pollutant.concentration.units}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 更新時間 */}
      <div className="border-t pt-3 text-xs text-gray-500 text-center">
        更新時間：{formatTimestamp(data.timestamp)}
      </div>

      {/* 位置坐標 */}
      <div className="text-xs text-gray-400 text-center">
        📍 {data.location.lat.toFixed(4)}, {data.location.lng.toFixed(4)}
      </div>
    </div>
  );
}
