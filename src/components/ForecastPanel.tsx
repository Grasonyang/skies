'use client';

import React from 'react';
import { ForecastResponse } from '@/types/forecast';
import { getAQILevel } from '@/lib/utils';

interface ForecastPanelProps {
  data: ForecastResponse | null;
  loading: boolean;
  error: string | null;
  className?: string;
}

/**
 * 空氣品質預測面板組件
 * 
 * 顯示未來 24-48 小時的空氣品質預測趨勢
 */
const ForecastPanel: React.FC<ForecastPanelProps> = ({
  data,
  loading,
  error,
  className,
}) => {
  const mainContainerClasses = `bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-6 w-full max-w-2xl ${className ?? ''}`;
  const subtleContainerClasses = `bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-4 w-full ${className ?? ''}`;

  if (loading) {
    return (
      <div className={subtleContainerClasses}>
        <div className="flex items-center gap-3">
          <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <h3 className="text-base font-bold text-gray-800">載入預測...</h3>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={subtleContainerClasses}>
        <div className="flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <h3 className="text-base font-bold text-red-600 mb-1">預測載入失敗</h3>
            <p className="text-xs text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data || !data.hourlyForecasts || data.hourlyForecasts.length === 0) {
    return null;
  }

  // 取前 24 小時的預測
  const forecasts = data.hourlyForecasts.slice(0, 24);

  // 計算預測趨勢
  const aqiValues = forecasts.map(f => f.indexes.find(idx => idx.code === 'uaqi')?.aqi || 0);
  const minAQI = Math.min(...aqiValues);
  const maxAQI = Math.max(...aqiValues);
  const avgAQI = Math.round(aqiValues.reduce((a, b) => a + b, 0) / aqiValues.length);

  // 判斷趨勢
  const firstHalfAvg = aqiValues.slice(0, 12).reduce((a, b) => a + b, 0) / 12;
  const secondHalfAvg = aqiValues.slice(12).reduce((a, b) => a + b, 0) / 12;
  const trend = secondHalfAvg > firstHalfAvg + 10 ? 'up' : 
                secondHalfAvg < firstHalfAvg - 10 ? 'down' : 'stable';

  const trendText = {
    up: '惡化',
    down: '改善',
    stable: '穩定',
  }[trend];

  const trendIcon = {
    up: '📈',
    down: '📉',
    stable: '➡️',
  }[trend];

  const trendColor = {
    up: 'text-red-600',
    down: 'text-green-600',
    stable: 'text-blue-600',
  }[trend];

  const confidence = data.meta;
  const volatilityDisplay = confidence
    ? confidence.volatility.toFixed(1)
    : null;

  return (
    <div className={mainContainerClasses}>
      {/* 標題 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <span>🔮</span>
          <span>未來 24 小時預測</span>
        </h3>
        <div className={`flex items-center gap-2 ${trendColor} font-semibold`}>
          <span>{trendIcon}</span>
          <span>{trendText}</span>
        </div>
      </div>

      {/* 預測準確度 */}
      {confidence && (
        <div className="mb-6 grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="rounded-2xl bg-gradient-to-r from-blue-500/90 via-purple-500/90 to-blue-600/90 p-5 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-wide opacity-80">預測準確度</p>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-black">
                    {confidence.confidenceScore}
                  </span>
                  <span className="text-sm mb-1">/100 ({confidence.confidenceLevel})</span>
                </div>
              </div>
              <span className="text-3xl">📏</span>
            </div>
            <div className="mt-4">
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-white/30">
                <div
                  className="absolute left-0 top-0 h-full rounded-full bg-white"
                  style={{ width: `${confidence.confidenceScore}%` }}
                />
              </div>
              <p className="mt-3 text-sm leading-relaxed opacity-90">
                {confidence.confidenceDescription}
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-blue-100/70 bg-white/60 p-4 text-blue-900 shadow-inner">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">波動指標</p>
            <p className="mt-3 text-3xl font-bold">
              {volatilityDisplay}%
            </p>
            <p className="mt-1 text-xs text-blue-600">
              基礎 AQI：{confidence.baseAqi}，預測平均值：{confidence.averageAqi}
            </p>
            <p className="mt-3 text-xs text-blue-500/80">
              模型: {confidence.method}
            </p>
          </div>
        </div>
      )}

      {/* 統計摘要 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="text-sm text-gray-600 mb-1">平均</div>
          <div className="text-2xl font-bold" style={{ color: getAQILevel(avgAQI).color }}>
            {avgAQI}
          </div>
          <div className="text-xs text-gray-500 mt-1">{getAQILevel(avgAQI).label}</div>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-600 mb-1">最低</div>
          <div className="text-2xl font-bold" style={{ color: getAQILevel(minAQI).color }}>
            {minAQI}
          </div>
          <div className="text-xs text-gray-500 mt-1">{getAQILevel(minAQI).label}</div>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-600 mb-1">最高</div>
          <div className="text-2xl font-bold" style={{ color: getAQILevel(maxAQI).color }}>
            {maxAQI}
          </div>
          <div className="text-xs text-gray-500 mt-1">{getAQILevel(maxAQI).label}</div>
        </div>
      </div>

      {/* 時間軸預測 */}
      <div className="space-y-2">
        <div className="text-sm font-semibold text-gray-700 mb-2">逐時預測</div>
        <div className="relative h-32 flex items-end gap-1">
          {forecasts.slice(0, 12).map((forecast, index) => {
            const universalAQI = forecast.indexes.find(idx => idx.code === 'uaqi');
            if (!universalAQI) return null;

            const aqiLevel = getAQILevel(universalAQI.aqi);
            const height = (universalAQI.aqi / maxAQI) * 100;
            const time = new Date(forecast.dateTime).getHours();

            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t transition-all hover:opacity-80 cursor-pointer relative group"
                  style={{
                    height: `${height}%`,
                    backgroundColor: aqiLevel.color,
                    minHeight: '20px',
                  }}
                  title={`${time}:00 - AQI ${universalAQI.aqi}`}
                >
                  {/* 懸停提示 */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-gray-800 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap">
                      {time}:00<br />
                      AQI {universalAQI.aqi}
                    </div>
                  </div>
                </div>
                {index % 3 === 0 && (
                  <div className="text-xs text-gray-500">{time}h</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 建議 */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <div className="text-sm text-gray-700">
          {trend === 'up' && (
            <span>⚠️ 預計空氣品質將惡化，敏感族群請注意防護</span>
          )}
          {trend === 'down' && (
            <span>✅ 預計空氣品質將改善，適合戶外活動</span>
          )}
          {trend === 'stable' && (
            <span>ℹ️ 空氣品質預計保持穩定</span>
          )}
        </div>
      </div>

      {/* 資料時間 */}
      <div className="mt-4 text-xs text-gray-400 text-center">
        預測生成時間：{new Date().toLocaleString('zh-TW')}
      </div>
    </div>
  );
};

export default ForecastPanel;
