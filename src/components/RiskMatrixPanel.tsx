'use client';

import React, { useMemo } from 'react';
import {
  ACTIVITY_TEMPLATES,
  evaluateActivities,
  ActivityDecision,
} from '@/lib/decisionEngine';
import { AQIData } from '@/types';

interface RiskMatrixPanelProps {
  aqiData: AQIData | null;
  forecastData?: {
    hourlyForecasts: Array<{
      dateTime: string;
      indexes: Array<{ aqi: number }>;
    }>;
  } | null;
  loading?: boolean;
}

/**
 * 風險矩陣面板 - 活動決策系統
 */
const RiskMatrixPanel: React.FC<RiskMatrixPanelProps> = ({
  aqiData,
  forecastData,
  loading = false,
}) => {
  // 計算所有活動的風險決策
  const decisions = useMemo(() => {
    if (!aqiData) return [];

    const currentAQI = aqiData.indexes?.[0]?.aqi || aqiData.aqi;
    const pollutants = aqiData.pollutants;

    return evaluateActivities(
      ACTIVITY_TEMPLATES,
      currentAQI,
      pollutants,
      forecastData?.hourlyForecasts
    );
  }, [aqiData, forecastData]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!aqiData) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-2">活動決策系統</h3>
        <p className="text-gray-500 text-sm">等待空氣品質數據...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-4xl w-full">
      {/* 標題 */}
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-2">
          🎯 活動決策系統
        </h3>
        <p className="text-gray-600 text-sm">
          基於當前空氣品質，為您評估各項戶外活動的風險等級
        </p>
      </div>

      {/* 決策卡片網格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {decisions.map((decision) => (
          <ActivityDecisionCard key={decision.activity.id} decision={decision} />
        ))}
      </div>

      {/* 圖例說明 */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 mb-2">風險等級說明：</p>
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-gray-600">安全</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-gray-600">注意</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-gray-600">不宜</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-gray-600">危險</span>
          </div>
        </div>
      </div>

      {/* 性能指標 */}
      <div className="mt-4 text-xs text-gray-400 text-center">
        ⚡ 決策引擎 L1 • 計算時間 &lt; 100ms
      </div>
    </div>
  );
};

/**
 * 單個活動決策卡片
 */
const ActivityDecisionCard: React.FC<{ decision: ActivityDecision }> = ({
  decision,
}) => {
  const { activity, riskScore, recommendation, bestTimeWindow } = decision;

  return (
    <div
      className="border-2 rounded-xl p-4 transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer"
      style={{
        borderColor: riskScore.color,
        backgroundColor: `${riskScore.color}08`,
      }}
    >
      {/* 活動標題 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-3xl">{activity.icon}</span>
          <div>
            <h4 className="font-bold text-gray-800">{activity.name}</h4>
            <p className="text-xs text-gray-500">{activity.description}</p>
          </div>
        </div>
      </div>

      {/* 風險分數 */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-semibold" style={{ color: riskScore.color }}>
            {riskScore.label}
          </span>
          <span className="text-lg font-bold" style={{ color: riskScore.color }}>
            {riskScore.score}
          </span>
        </div>
        {/* 風險進度條 */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{
              width: `${riskScore.score}%`,
              backgroundColor: riskScore.color,
            }}
          ></div>
        </div>
      </div>

      {/* 建議 */}
      <p className="text-sm text-gray-700 mb-2">{recommendation}</p>

      {/* 最佳時間窗口 */}
      {bestTimeWindow && (
        <div className="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-700 font-medium">
            ⏰ 建議時段
          </p>
          <p className="text-xs text-blue-600 mt-1">
            {new Date(bestTimeWindow.start).toLocaleTimeString('zh-TW', {
              hour: '2-digit',
              minute: '2-digit',
            })}{' '}
            - {new Date(bestTimeWindow.end).toLocaleTimeString('zh-TW', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
          <p className="text-xs text-gray-600 mt-1">{bestTimeWindow.reason}</p>
        </div>
      )}

      {/* 活動強度指示 */}
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
        <span>強度:</span>
        <div className="flex gap-1">
          {['low', 'medium', 'high'].map((level, idx) => (
            <div
              key={level}
              className={`w-2 h-4 rounded-sm ${
                idx < (activity.intensity === 'high' ? 3 : activity.intensity === 'medium' ? 2 : 1)
                  ? 'bg-gray-600'
                  : 'bg-gray-300'
              }`}
            ></div>
          ))}
        </div>
        <span className="ml-auto">{activity.duration} 分鐘</span>
      </div>
    </div>
  );
};

export default RiskMatrixPanel;
