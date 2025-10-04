/**
 * Decision Engine L1
 * 基於硬編碼權重的風險評分與活動決策系統
 */

export interface ActivityTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  baseRiskFactor: number; // 活動基礎風險係數 (0-1)
  duration: number; // 預計活動時長（分鐘）
  intensity: 'low' | 'medium' | 'high'; // 活動強度
}

export interface RiskScore {
  score: number; // 風險分數 0-100
  level: 'safe' | 'caution' | 'unhealthy' | 'dangerous'; // 風險等級
  color: string; // 顏色代碼
  label: string; // 中文標籤
  recommendation: string; // 建議文案
}

export interface ActivityDecision {
  activity: ActivityTemplate;
  riskScore: RiskScore;
  recommendation: string;
  bestTimeWindow?: {
    start: string; // ISO timestamp
    end: string;
    reason: string;
  };
  pollutantBreakdown: {
    pollutant: string;
    contribution: number; // 貢獻百分比
    displayName: string;
  }[];
}

// 活動模板庫
export const ACTIVITY_TEMPLATES: ActivityTemplate[] = [
  {
    id: 'jogging',
    name: '晨跑',
    icon: '🏃',
    description: '30 分鐘慢跑',
    baseRiskFactor: 0.7, // 高強度運動，呼吸量大
    duration: 30,
    intensity: 'high',
  },
  {
    id: 'walking',
    name: '散步',
    icon: '🚶',
    description: '1 小時戶外散步',
    baseRiskFactor: 0.3, // 低強度，風險較低
    duration: 60,
    intensity: 'low',
  },
  {
    id: 'cycling',
    name: '騎車通勤',
    icon: '🚴',
    description: '20 分鐘自行車通勤',
    baseRiskFactor: 0.5, // 中等強度
    duration: 20,
    intensity: 'medium',
  },
  {
    id: 'outdoor_dining',
    name: '戶外用餐',
    icon: '🍽️',
    description: '1 小時戶外餐廳',
    baseRiskFactor: 0.2, // 靜態活動
    duration: 60,
    intensity: 'low',
  },
  {
    id: 'playground',
    name: '兒童遊樂',
    icon: '🎪',
    description: '孩子在戶外遊樂場',
    baseRiskFactor: 0.6, // 兒童較敏感
    duration: 45,
    intensity: 'medium',
  },
];

/**
 * 污染物權重配置（硬編碼 L1）
 */
const POLLUTANT_WEIGHTS = {
  pm25: 0.40, // PM2.5 最重要
  pm10: 0.15,
  o3: 0.25, // 臭氧對運動影響大
  no2: 0.10,
  so2: 0.05,
  co: 0.05,
};

/**
 * 計算風險分數
 * @param aqi 當前 AQI
 * @param activity 活動模板
 * @param pollutants 污染物濃度數據（可選）
 */
export function calculateRiskScore(
  aqi: number,
  activity: ActivityTemplate,
  pollutants?: Array<{ code: string; concentration: { value: number; units: string } }>
): RiskScore {
  // 基礎風險 = AQI 標準化 (0-100)
  const normalizedAQI = Math.min(aqi / 3, 100); // AQI 300+ 視為滿分風險

  // 活動風險調整
  const activityMultiplier = 1 + activity.baseRiskFactor;

  // 時長調整（時間越長風險越高）
  const durationMultiplier = 1 + (activity.duration / 120) * 0.3; // 最多增加 30%

  // 綜合風險分數
  let finalScore = normalizedAQI * activityMultiplier * durationMultiplier;

  // 如果有詳細污染物數據，進一步調整
  if (pollutants && pollutants.length > 0) {
    const pollutantRisk = calculatePollutantRisk(pollutants, activity);
    finalScore = finalScore * 0.7 + pollutantRisk * 0.3; // 70% AQI + 30% 污染物細節
  }

  // 限制在 0-100
  finalScore = Math.max(0, Math.min(100, finalScore));

  return classifyRiskScore(finalScore);
}

/**
 * 根據污染物細節計算風險
 */
function calculatePollutantRisk(
  pollutants: Array<{ code: string; concentration: { value: number; units: string } }>,
  activity: ActivityTemplate
): number {
  let weightedRisk = 0;

  pollutants.forEach((pollutant) => {
    const weight = POLLUTANT_WEIGHTS[pollutant.code as keyof typeof POLLUTANT_WEIGHTS] || 0;
    
    // 標準化濃度（簡化處理，實際應參考標準）
    let normalizedConcentration = 0;
    if (pollutant.code === 'pm25') {
      normalizedConcentration = Math.min(pollutant.concentration.value / 75, 1); // 75 µg/m³ 為不健康閾值
    } else if (pollutant.code === 'pm10') {
      normalizedConcentration = Math.min(pollutant.concentration.value / 150, 1);
    } else if (pollutant.code === 'o3') {
      normalizedConcentration = Math.min(pollutant.concentration.value / 100, 1);
    } else {
      normalizedConcentration = 0.5; // 預設中等風險
    }

    // 高強度活動對臭氧更敏感
    if (pollutant.code === 'o3' && activity.intensity === 'high') {
      normalizedConcentration *= 1.3;
    }

    weightedRisk += weight * normalizedConcentration;
  });

  return weightedRisk * 100;
}

/**
 * 分類風險分數
 */
function classifyRiskScore(score: number): RiskScore {
  if (score < 25) {
    return {
      score: Math.round(score),
      level: 'safe',
      color: '#22c55e', // green-500
      label: '安全',
      recommendation: '✅ 適合進行此活動',
    };
  }
  
  if (score < 50) {
    return {
      score: Math.round(score),
      level: 'caution',
      color: '#eab308', // yellow-500
      label: '注意',
      recommendation: '⚠️ 可以進行，但請注意身體狀況',
    };
  }
  
  if (score < 75) {
    return {
      score: Math.round(score),
      level: 'unhealthy',
      color: '#f97316', // orange-500
      label: '不宜',
      recommendation: '🚫 不建議進行此活動',
    };
  }

  return {
    score: Math.round(score),
    level: 'dangerous',
    color: '#ef4444', // red-500
    label: '危險',
    recommendation: '⛔ 強烈建議取消或改為室內活動',
  };
}

/**
 * 為活動生成完整決策
 */
export function generateActivityDecision(
  activity: ActivityTemplate,
  aqi: number,
  pollutants?: Array<{ code: string; displayName: string; concentration: { value: number; units: string } }>,
  forecastData?: Array<{ dateTime: string; indexes: Array<{ aqi: number }> }>
): ActivityDecision {
  const riskScore = calculateRiskScore(aqi, activity, pollutants);

  // 生成污染物貢獻分析
  const pollutantBreakdown = pollutants
    ? pollutants.map((p) => ({
        pollutant: p.code,
        displayName: p.displayName,
        contribution: (POLLUTANT_WEIGHTS[p.code as keyof typeof POLLUTANT_WEIGHTS] || 0) * 100,
      }))
    : [];

  // 如果有預測數據，找出最佳時間窗口
  let bestTimeWindow: ActivityDecision['bestTimeWindow'] = undefined;
  if (forecastData && forecastData.length > 0) {
    const bestTime = findBestTimeWindow(forecastData, activity);
    if (bestTime) {
      bestTimeWindow = bestTime;
    }
  }

  // 生成個性化建議
  const recommendation = generateRecommendation(activity, riskScore, bestTimeWindow);

  return {
    activity,
    riskScore,
    recommendation,
    bestTimeWindow,
    pollutantBreakdown,
  };
}

/**
 * 尋找最佳活動時間窗口
 */
function findBestTimeWindow(
  forecastData: Array<{ dateTime: string; indexes: Array<{ aqi: number }> }>,
  activity: ActivityTemplate
): ActivityDecision['bestTimeWindow'] | null {
  if (forecastData.length === 0) return null;

  // 計算每個時段的風險分數
  const timeScores = forecastData.map((forecast) => {
    const aqi = forecast.indexes[0]?.aqi || 50;
    const risk = calculateRiskScore(aqi, activity);
    return {
      time: forecast.dateTime,
      aqi,
      score: risk.score,
    };
  });

  // 找出風險最低的時段
  const bestSlot = timeScores.reduce((best, current) => 
    current.score < best.score ? current : best
  );

  // 如果最佳時段比現在好 20% 以上，才推薦
  const currentScore = timeScores[0]?.score || 100;
  if (bestSlot.score < currentScore * 0.8) {
    const endTime = new Date(new Date(bestSlot.time).getTime() + activity.duration * 60 * 1000);
    
    return {
      start: bestSlot.time,
      end: endTime.toISOString(),
      reason: `該時段 AQI 預計為 ${bestSlot.aqi}，比現在更適合`,
    };
  }

  return null;
}

/**
 * 生成個性化建議文案
 */
function generateRecommendation(
  activity: ActivityTemplate,
  riskScore: RiskScore,
  bestTimeWindow?: ActivityDecision['bestTimeWindow']
): string {
  const base = riskScore.recommendation;

  if (riskScore.level === 'safe') {
    return `${base}。現在是進行${activity.name}的好時機！`;
  }

  if (riskScore.level === 'caution') {
    if (bestTimeWindow) {
      const time = new Date(bestTimeWindow.start).toLocaleTimeString('zh-TW', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      return `${base}。建議改到 ${time} 進行會更好。`;
    }
    return `${base}。建議縮短活動時間或配戴口罩。`;
  }

  if (riskScore.level === 'unhealthy') {
    if (bestTimeWindow) {
      const time = new Date(bestTimeWindow.start).toLocaleTimeString('zh-TW', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      return `${base}。強烈建議延後到 ${time}。`;
    }
    return `${base}。建議改為室內替代活動。`;
  }

  return `${base}。請留在室內，避免暴露在戶外空氣中。`;
}

/**
 * 批次評估多個活動
 */
export function evaluateActivities(
  activities: ActivityTemplate[],
  aqi: number,
  pollutants?: Array<{ code: string; displayName: string; concentration: { value: number; units: string } }>,
  forecastData?: Array<{ dateTime: string; indexes: Array<{ aqi: number }> }>
): ActivityDecision[] {
  return activities.map((activity) =>
    generateActivityDecision(activity, aqi, pollutants, forecastData)
  );
}
