'use client';

import React, { useState } from 'react';
import { AQIData } from '@/types';
import {
  getHealthRecommendation,
  getActivityScore,
  getMaskRecommendation,
  UserGroup,
} from '@/lib/healthRecommendations';

interface HealthRecommendationPanelProps {
  aqiData: AQIData | null;
}

const USER_GROUP_OPTIONS = [
  { value: UserGroup.GENERAL, label: '一般民眾', icon: '👤' },
  { value: UserGroup.SENSITIVE, label: '敏感族群（老幼孕）', icon: '👶' },
  { value: UserGroup.RESPIRATORY, label: '呼吸道疾病', icon: '🫁' },
  { value: UserGroup.CARDIOVASCULAR, label: '心血管疾病', icon: '❤️' },
  { value: UserGroup.OUTDOOR_WORKER, label: '戶外工作者', icon: '👷' },
];

/**
 * 健康建議面板組件
 * 
 * 提供基於用戶族群的個人化健康建議
 */
const HealthRecommendationPanel: React.FC<HealthRecommendationPanelProps> = ({ aqiData }) => {
  const [selectedGroup, setSelectedGroup] = useState<UserGroup>(UserGroup.GENERAL);
  const [isExpanded, setIsExpanded] = useState(false);

  if (!aqiData) {
    return null;
  }

  const recommendation = getHealthRecommendation(aqiData.aqi, selectedGroup);
  const activityScore = getActivityScore(aqiData.aqi);
  const maskRec = getMaskRecommendation(aqiData.aqi);

  // 風險等級顏色
  const riskColors = {
    low: 'bg-green-100 text-green-800 border-green-300',
    moderate: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    high: 'bg-orange-100 text-orange-800 border-orange-300',
    very_high: 'bg-red-100 text-red-800 border-red-300',
    hazardous: 'bg-purple-100 text-purple-800 border-purple-300',
  };

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-4 w-full max-h-96 overflow-y-auto">
      {/* 標題 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💊</span>
          <h3 className="text-base font-bold text-gray-800">健康建議</h3>
        </div>
        <div>
          <label htmlFor="user-group" className="sr-only">用戶族群</label>
          <select
            id="user-group"
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value as UserGroup)}
            className="bg-gray-100 rounded-md px-2 py-1 text-sm"
          >
            {USER_GROUP_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.icon} {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 風險等級 */}
      <div className={`p-4 rounded-lg border-2 mb-4 ${riskColors[recommendation.riskLevel]}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium opacity-75">風險等級</div>
            <div className="text-2xl font-bold flex items-center gap-2">
              <span>{recommendation.icon}</span>
              <span>{recommendation.riskLevelLabel}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium opacity-75">戶外活動適宜度</div>
            <div className="text-3xl font-bold">{activityScore}分</div>
          </div>
        </div>
      </div>

      {/* 活動建議 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-xs text-gray-600 mb-1">🏃 戶外活動</div>
          <div className="text-sm font-medium text-gray-800">{recommendation.activities.outdoor}</div>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-xs text-gray-600 mb-1">💪 運動建議</div>
          <div className="text-sm font-medium text-gray-800">{recommendation.activities.exercise}</div>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-xs text-gray-600 mb-1">😷 口罩配戴</div>
          <div className="text-sm font-medium text-gray-800">{recommendation.activities.mask}</div>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-xs text-gray-600 mb-1">🪟 開窗建議</div>
          <div className="text-sm font-medium text-gray-800">{recommendation.activities.window}</div>
        </div>
      </div>

      {/* 口罩詳細建議 */}
      <div className="bg-blue-50 p-3 rounded-lg mb-4">
        <div className="flex items-start gap-2">
          <span className="text-lg">😷</span>
          <div className="flex-1">
            <div className="text-sm font-semibold text-blue-900 mb-1">
              口罩建議：{maskRec.level}
            </div>
            <div className="text-xs text-blue-700">{maskRec.description}</div>
          </div>
        </div>
      </div>

      {/* 可能症狀 */}
      {recommendation.symptoms.length > 0 && (
        <div className="bg-yellow-50 p-3 rounded-lg mb-4">
          <div className="text-sm font-semibold text-yellow-900 mb-2">⚠️ 可能出現的症狀</div>
          <ul className="space-y-1">
            {recommendation.symptoms.map((symptom, index) => (
              <li key={index} className="text-xs text-yellow-800 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-yellow-600 rounded-full"></span>
                <span>{symptom}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 展開/收合詳細建議 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full py-2 text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center gap-2 transition-colors"
      >
        <span>{isExpanded ? '收起' : '查看'}詳細建議</span>
        <span className="transform transition-transform" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
          ▼
        </span>
      </button>

      {/* 詳細建議（可展開） */}
      {isExpanded && (
        <div className="mt-4 space-y-2 border-t pt-4">
          {recommendation.advice.map((advice, index) => (
            <div key={index} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-blue-500 font-bold mt-0.5">•</span>
              <span>{advice}</span>
            </div>
          ))}
        </div>
      )}

      {/* 免責聲明 */}
      <div className="mt-4 pt-4 border-t text-xs text-gray-400 text-center">
        ⚕️ 以上建議僅供參考，如有健康疑慮請諮詢專業醫師
      </div>
    </div>
  );
};

export default HealthRecommendationPanel;
