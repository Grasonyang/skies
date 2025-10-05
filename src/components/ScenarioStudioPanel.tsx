import React, { useMemo, useState } from 'react';
import { ScenarioAnalysis, TimeSlot } from '@/hooks/useScenarioStudio';

/**
 * 簡易 Loading Spinner 組件
 */
function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div
      className={`${sizeClasses[size]} border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin`}
    />
  );
}

interface ScenarioTimelineProps {
  scenario: ScenarioAnalysis;
  onClose?: () => void;
}

/**
 * Scenario Timeline Component
 * 呈現 24 小時活動劇本的時間軸、燈號與 Agent 建議
 */
export function ScenarioTimeline({ scenario, onClose }: ScenarioTimelineProps) {
  const { activity, location, timeSlots, bestTimeSlot, worstTimeSlot, averageAqi, recommendation, loading } = scenario;

  return (
    <div className="bg-white rounded-xl shadow-2xl p-6 max-w-4xl mx-auto">
      {/* 標題列 */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            {activity} - 情境分析
          </h2>
          <p className="text-sm text-gray-600">
            📍 {location.name} {location.address && `• ${location.address}`}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="關閉"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* 概覽統計 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-xs text-blue-600 font-medium mb-1">平均 AQI</div>
          <div className="text-2xl font-bold text-blue-900">{averageAqi}</div>
        </div>
        {bestTimeSlot && (
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-xs text-green-600 font-medium mb-1">最佳時段</div>
            <div className="text-2xl font-bold text-green-900">{bestTimeSlot.time}</div>
            <div className="text-xs text-green-600 mt-1">AQI {bestTimeSlot.aqi}</div>
          </div>
        )}
        {worstTimeSlot && (
          <div className="bg-red-50 rounded-lg p-4">
            <div className="text-xs text-red-600 font-medium mb-1">最差時段</div>
            <div className="text-2xl font-bold text-red-900">{worstTimeSlot.time}</div>
            <div className="text-xs text-red-600 mt-1">AQI {worstTimeSlot.aqi}</div>
          </div>
        )}
      </div>

      {/* 時間軸視覺化 */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">24 小時空氣品質趨勢</h3>
        <div className="relative">
          {/* 時間軸背景 */}
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t-2 border-gray-200"></div>
          </div>

          {/* 時間點 */}
          <div className="relative flex justify-between">
            {timeSlots.map((slot, index) => (
              <TimeSlotMarker
                key={index}
                slot={slot}
                isBest={slot.time === bestTimeSlot?.time}
                isWorst={slot.time === worstTimeSlot?.time}
              />
            ))}
          </div>
        </div>

        {/* 時間標籤 */}
        <div className="flex justify-between mt-2 px-2">
          {timeSlots.map((slot, index) => (
            <div key={index} className="text-xs text-gray-500 text-center" style={{ width: '40px' }}>
              {slot.time}
            </div>
          ))}
        </div>
      </div>

      {/* AI 建議區塊 */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-5 mb-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-purple-900 mb-2">AI 智能建議</h4>
            {loading ? (
              <div className="flex items-center gap-2">
                <LoadingSpinner size="sm" />
                <span className="text-sm text-gray-600">分析中...</span>
              </div>
            ) : (
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {recommendation || '暫無建議'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 註記 */}
      <div className="text-xs text-gray-500 border-t pt-3">
        <p>
          💡 此分析基於 Google Air Quality API 預測數據與 Decision Engine L1 決策邏輯。
          實際情況請以即時監測為準，並根據個人健康狀況調整活動計畫。
        </p>
      </div>
    </div>
  );
}

/**
 * 時間點標記組件
 */
function TimeSlotMarker({
  slot,
  isBest,
  isWorst,
}: {
  slot: TimeSlot;
  isBest: boolean;
  isWorst: boolean;
}) {
  const { riskLevel, aqi } = slot;

  // 決定顏色
  let bgColor = 'bg-green-400';
  let borderColor = 'border-green-500';
  let pulseColor = '';

  if (riskLevel === 'warning') {
    bgColor = 'bg-yellow-400';
    borderColor = 'border-yellow-500';
  } else if (riskLevel === 'danger') {
    bgColor = 'bg-red-400';
    borderColor = 'border-red-500';
  }

  // 最佳/最差時段特效
  if (isBest) {
    pulseColor = 'ring-4 ring-green-300 ring-opacity-50';
  } else if (isWorst) {
    pulseColor = 'ring-4 ring-red-300 ring-opacity-50';
  }

  return (
    <div className="relative group">
      {/* 標記點 */}
      <div
        className={`
          w-10 h-10 rounded-full border-4 ${bgColor} ${borderColor} ${pulseColor}
          flex items-center justify-center cursor-pointer
          transition-all duration-300 hover:scale-110
          ${isBest || isWorst ? 'scale-125' : ''}
        `}
      >
        <span className="text-xs font-bold text-white">{aqi}</span>
      </div>

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-lg">
          <div className="font-semibold">{slot.time}</div>
          <div>AQI: {aqi}</div>
          <div>主污染物: {getPollutantName(slot.dominantPollutant)}</div>
          {isBest && <div className="text-green-400 mt-1">✓ 最佳時段</div>}
          {isWorst && <div className="text-red-400 mt-1">⚠ 最差時段</div>}
        </div>
      </div>

      {/* 最佳/最差標記 */}
      {(isBest || isWorst) && (
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
          <div className={`text-xs font-bold ${isBest ? 'text-green-600' : 'text-red-600'}`}>
            {isBest ? '👍' : '⚠️'}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 污染物名稱轉換
 */
function getPollutantName(code: string): string {
  const names: Record<string, string> = {
    pm25: 'PM2.5',
    pm10: 'PM10',
    o3: '臭氧',
    no2: '二氧化氮',
    so2: '二氧化硫',
    co: '一氧化碳',
  };
  return names[code.toLowerCase()] || code;
}

/**
 * Scenario Studio Panel
 * 整合多個情境分析的主面板
 */
interface ScenarioStudioPanelProps {
  scenarios: ScenarioAnalysis[];
  loading: boolean;
  error: string | null;
  onGenerateScenario?: (
    activity: string,
    location: { lat: number; lng: number },
    activityTypes?: string[]
  ) => void;
  onClear?: () => void;
  selectedLocation?: { lat: number; lng: number } | null;
  selectedLocationLabel?: string | null;
  onRequestLocation?: () => void;
  onPickLocation?: () => void;
  isPickingLocation?: boolean;
}

export function ScenarioStudioPanel({
  scenarios,
  loading,
  error,
  onGenerateScenario,
  onClear,
  selectedLocation,
  selectedLocationLabel,
  onRequestLocation,
  onPickLocation,
  isPickingLocation,
}: ScenarioStudioPanelProps) {
  // 預設活動類型
  const templates = useMemo(
    () => [
      { name: '戶外跑步', types: ['park', 'stadium'], icon: '🏃' },
      { name: '親子公園', types: ['park', 'playground'], icon: '👨‍👩‍👧' },
      { name: '室內健身', types: ['gym', 'sports_complex'], icon: '💪' },
      { name: '客製探索', types: ['point_of_interest'], icon: '🎯' },
    ],
    []
  );

  const [customActivity, setCustomActivity] = useState('自訂活動');
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);

  const selectedTemplate = templates[selectedTemplateIndex] ?? templates[0];
  const canGenerate = Boolean(onGenerateScenario && selectedLocation);
  const locationSummary = selectedLocation
    ? `${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}`
    : '請在地圖上點擊位置';

  return (
    <div className="space-y-6">
      {/* 操作列 */}
      {onGenerateScenario && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold text-slate-800 mb-3">快速情境生成</h3>
          <div className="flex gap-3 flex-wrap">
            {templates.slice(0, 3).map((activity) => (
              <button
                key={activity.name}
                onClick={() =>
                  selectedLocation &&
                  onGenerateScenario(activity.name, selectedLocation, activity.types)
                }
                disabled={loading || !selectedLocation}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-700 shadow-sm transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span>{activity.icon}</span>
                <span className="font-medium">{activity.name}</span>
              </button>
            ))}
            {scenarios.length > 0 && onClear && (
              <button
                onClick={onClear}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                清除所有情境
              </button>
            )}
          </div>
          {!selectedLocation && (
            <p className="mt-3 text-xs text-slate-500">
              點擊地圖取得最新座標後即可生成指定情境。
            </p>
          )}
        </div>
      )}

      {/* 自訂情境 */}
      {onGenerateScenario && (
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-semibold text-slate-800">自訂情境</h3>
            <p className="text-xs text-slate-500">
              選擇地圖上的位置與活動類型，生成專屬劇本。
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-600">活動名稱</label>
              <input
                type="text"
                value={customActivity}
                onChange={(event) => setCustomActivity(event.target.value)}
                maxLength={24}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-600">活動場域</label>
              <select
                value={selectedTemplateIndex}
                onChange={(event) => setSelectedTemplateIndex(Number(event.target.value))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                {templates.map((template, index) => (
                  <option key={template.name} value={index} className="text-slate-700">
                    {template.icon} {template.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-700">選擇的座標</span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                {locationSummary}
              </span>
              {selectedLocationLabel && (
                <span className="text-[11px] text-slate-500">{selectedLocationLabel}</span>
              )}
              {onRequestLocation && (
                <button
                  type="button"
                  onClick={onRequestLocation}
                  className="ml-auto inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                >
                  🎯 重新定位
                </button>
              )}
              {onPickLocation && (
                <button
                  type="button"
                  onClick={onPickLocation}
                  className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isPickingLocation}
                >
                  🗺️ {isPickingLocation ? '前往地圖中…' : '在地圖上選擇'}
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            disabled={!canGenerate || !customActivity.trim()}
            onClick={() => {
              if (!selectedLocation || !onGenerateScenario) return;
              onGenerateScenario(customActivity.trim(), selectedLocation, selectedTemplate.types);
            }}
            className="w-full rounded-full bg-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            生成自訂情境
          </button>
        </div>
      )}

      {/* 載入狀態 */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
          <span className="ml-3 text-gray-600">生成情境中...</span>
        </div>
      )}

      {/* 錯誤訊息 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          ⚠️ {error}
        </div>
      )}

      {/* 情境列表 */}
      {scenarios.length > 0 && (
        <div className="space-y-6">
          {scenarios.map((scenario, index) => (
            <ScenarioTimeline key={index} scenario={scenario} />
          ))}
        </div>
      )}

      {/* 空狀態 */}
      {!loading && scenarios.length === 0 && !error && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-4">🎯</div>
          <p>選擇一個活動類型開始生成情境分析</p>
        </div>
      )}
    </div>
  );
}
