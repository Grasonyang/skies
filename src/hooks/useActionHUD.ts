import { useMemo } from 'react';
import { AQIData } from '@/types';
import { ForecastResponse } from '@/types/forecast';
import {
  DecisionEngineL1,
  ActivityDecision,
  ActivityTemplate,
} from '@/lib/decision-engine/l1';

export interface ActionSuggestion {
  activityId: string;
  title: string;
  description: string;
  severity: ActivityDecision['riskScore']['level'];
  color: string;
  ctaLabel: string;
  onTrigger: () => void;
  bestTimeText?: string;
}

interface UseActionHUDOptions {
  aqiData: AQIData | null;
  forecastData: ForecastResponse | null;
  templates?: ActivityTemplate[];
}

export const useActionHUD = ({
  aqiData,
  forecastData,
  templates = DecisionEngineL1.templates,
}: UseActionHUDOptions) => {
  return useMemo(() => {
    if (!aqiData) {
      return {
        suggestions: [] as ActionSuggestion[],
        dominantRisk: null as ActivityDecision | null,
      };
    }

    const currentAQI = aqiData.indexes?.[0]?.aqi || aqiData.aqi || 50;
    const pollutantSamples = aqiData.pollutants?.map((item) => ({
      code: item.code,
      displayName: item.displayName,
      concentration: item.concentration,
    }));

    const decisions = DecisionEngineL1.evaluateActivities(
      templates,
      currentAQI,
      pollutantSamples,
      forecastData?.hourlyForecasts?.map((slot) => ({
        dateTime: slot.dateTime,
        indexes: slot.indexes,
      }))
    );

    const sorted = decisions.sort((a, b) => a.riskScore.score - b.riskScore.score);
    const dominant = decisions.reduce((prev, current) =>
      current.riskScore.score > prev.riskScore.score ? current : prev
    );

    const mapToSuggestion = (decision: ActivityDecision): ActionSuggestion => {
      const color = decision.riskScore.color;
      const title = `${decision.activity.icon} ${decision.activity.name}`;
      const bestTimeText = decision.bestTimeWindow
        ? `${new Date(decision.bestTimeWindow.start).toLocaleTimeString('zh-TW', {
            hour: '2-digit',
            minute: '2-digit',
          })} → ${new Date(decision.bestTimeWindow.end).toLocaleTimeString('zh-TW', {
            hour: '2-digit',
            minute: '2-digit',
          })}`
        : undefined;

      return {
        activityId: decision.activity.id,
        title,
        description: decision.recommendation,
        severity: decision.riskScore.level,
        color,
        ctaLabel: decision.riskScore.level === 'dangerous' ? '設定提醒' : '加入提醒',
        onTrigger: () => {
          console.info('[ActionHUD] CTA 觸發', {
            activityId: decision.activity.id,
            level: decision.riskScore.level,
          });
        },
        bestTimeText,
      };
    };

    return {
      suggestions: sorted.slice(0, 3).map(mapToSuggestion),
      dominantRisk: dominant,
    };
  }, [aqiData, forecastData, templates]);
};
