import { ACTIVITY_TEMPLATES, POLLUTANT_WEIGHTS, RISK_LEVEL_STYLES } from './constants';
import {
  ActivityDecision,
  ActivityTemplate,
  ForecastSlot,
  PollutantSample,
  RiskScore,
} from './types';

// 依據活動模板與當前 AQI 計算風險分數
export function calculateRiskScore(
  aqi: number,
  activity: ActivityTemplate,
  pollutants?: PollutantSample[]
): RiskScore {
  const normalizedAQI = Math.min(aqi / 3, 100);
  const activityMultiplier = 1 + activity.baseRiskFactor;
  const durationMultiplier = 1 + (activity.duration / 120) * 0.3;

  let finalScore = normalizedAQI * activityMultiplier * durationMultiplier;

  if (pollutants && pollutants.length > 0) {
    const pollutantRisk = calculatePollutantRisk(pollutants, activity);
    const aqiWeight = Math.min(Math.max(aqi / 120, 0.3), 1);
    finalScore = finalScore * 0.75 + pollutantRisk * 0.25 * aqiWeight;
  }

  if (aqi <= 50) {
    // 當 AQI 處於良好區間時，限制風險分數避免過度警示
    finalScore = Math.min(finalScore, 22);
  }

  finalScore = Math.max(0, Math.min(100, finalScore));
  return classifyRiskScore(Math.round(finalScore));
}

// 針對單一活動生成完整決策
export function generateActivityDecision(
  activity: ActivityTemplate,
  aqi: number,
  pollutants?: PollutantSample[],
  forecastData?: ForecastSlot[]
): ActivityDecision {
  const riskScore = calculateRiskScore(aqi, activity, pollutants);

  const pollutantBreakdown = pollutants
    ? pollutants.map((pollutant) => ({
        pollutant: pollutant.code,
        displayName: pollutant.displayName,
        contribution:
          (POLLUTANT_WEIGHTS[pollutant.code as keyof typeof POLLUTANT_WEIGHTS] || 0) * 100,
      }))
    : [];

  const bestTimeWindow = forecastData?.length
    ? findBestTimeWindow(forecastData, activity, riskScore.score)
    : undefined;

  const recommendation = generateRecommendation(activity, riskScore, bestTimeWindow);

  return {
    activity,
    riskScore,
    recommendation,
    bestTimeWindow,
    pollutantBreakdown,
  };
}

// 批次評估所有活動模板
export function evaluateActivities(
  activities: ActivityTemplate[],
  aqi: number,
  pollutants?: PollutantSample[],
  forecastData?: ForecastSlot[]
): ActivityDecision[] {
  return activities.map((activity) =>
    generateActivityDecision(activity, aqi, pollutants, forecastData)
  );
}

// 直接使用預設模板計算決策
export function evaluateDefaultActivities(
  aqi: number,
  pollutants?: PollutantSample[],
  forecastData?: ForecastSlot[]
) {
  return evaluateActivities(ACTIVITY_TEMPLATES, aqi, pollutants, forecastData);
}

// ====== 內部工具函式 ======

function calculatePollutantRisk(pollutants: PollutantSample[], activity: ActivityTemplate): number {
  return (
    pollutants.reduce((acc, pollutant) => {
      const weight = POLLUTANT_WEIGHTS[pollutant.code as keyof typeof POLLUTANT_WEIGHTS] || 0;

      if (weight === 0) {
        return acc;
      }

      const value = pollutant.concentration?.value ?? 0;
      let normalized = 0;
      switch (pollutant.code) {
        case 'pm25':
          normalized = Math.min(
            value / (activity.intensity === 'high' ? 35 : 45),
            1
          );
          break;
        case 'pm10':
          normalized = Math.min(value / 80, 1);
          break;
        case 'o3':
          normalized = Math.min(value / 120, 1);
          if (activity.intensity === 'high') {
            normalized *= 1.3;
          }
          break;
        default:
          normalized = Math.min(value / 100, 1);
      }

      return acc + weight * normalized;
    }, 0) * 100
  );
}

function classifyRiskScore(score: number): RiskScore {
  if (score < 25) {
    return {
      score,
      level: 'safe',
      ...RISK_LEVEL_STYLES.safe,
    };
  }

  if (score < 50) {
    return {
      score,
      level: 'caution',
      ...RISK_LEVEL_STYLES.caution,
    };
  }

  if (score < 75) {
    return {
      score,
      level: 'unhealthy',
      ...RISK_LEVEL_STYLES.unhealthy,
    };
  }

  return {
    score,
    level: 'dangerous',
    ...RISK_LEVEL_STYLES.dangerous,
  };
}

function findBestTimeWindow(
  forecastData: ForecastSlot[],
  activity: ActivityTemplate,
  currentScore: number
) {
  const scoredSlots = forecastData.map((slot) => {
    const aqi = slot.indexes?.[0]?.aqi ?? 50;
    const slotRisk = calculateRiskScore(aqi, activity);

    return {
      start: slot.dateTime,
      score: slotRisk.score,
      aqi,
    };
  });

  if (!scoredSlots.length) return undefined;

  const bestSlot = scoredSlots.reduce((best, slot) => (slot.score < best.score ? slot : best));

  if (bestSlot.score >= currentScore * 0.8) {
    return undefined;
  }

  const durationMs = activity.duration * 60 * 1000;
  const end = new Date(new Date(bestSlot.start).getTime() + durationMs).toISOString();

  return {
    start: bestSlot.start,
    end,
    reason: `該時段 AQI 預計為 ${bestSlot.aqi}，比目前降低約 ${Math.round(
      ((currentScore - bestSlot.score) / Math.max(currentScore, 1)) * 100
    )}%`,
  } as ActivityDecision['bestTimeWindow'];
}

function generateRecommendation(
  activity: ActivityTemplate,
  riskScore: RiskScore,
  bestTimeWindow?: ActivityDecision['bestTimeWindow']
) {
  const base = riskScore.recommendation;

  if (riskScore.level === 'safe') {
    return `${base}。現在是進行${activity.name}的好時機！`;
  }

  if (riskScore.level === 'caution') {
    if (bestTimeWindow) {
      const time = formatTime(bestTimeWindow.start);
      return `${base}。建議改到 ${time} 進行會更好。`;
    }
    return `${base}。建議縮短活動時間或配戴口罩。`;
  }

  if (riskScore.level === 'unhealthy') {
    if (bestTimeWindow) {
      const time = formatTime(bestTimeWindow.start);
      return `${base}。強烈建議延後到 ${time}。`;
    }
    return `${base}。建議改為室內替代活動。`;
  }

  return `${base}。請留在室內，避免暴露在戶外空氣中。`;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const DecisionEngineL1 = {
  templates: ACTIVITY_TEMPLATES,
  calculateRiskScore,
  generateActivityDecision,
  evaluateActivities,
  evaluateDefaultActivities,
};

export type { ActivityDecision, ActivityTemplate, PollutantSample, ForecastSlot, RiskScore } from './types';
