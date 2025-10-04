export interface ActivityTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  baseRiskFactor: number;
  duration: number;
  intensity: 'low' | 'medium' | 'high';
}

export type RiskLevel = 'safe' | 'caution' | 'unhealthy' | 'dangerous';

export interface RiskScore {
  score: number;
  level: RiskLevel;
  color: string;
  label: string;
  recommendation: string;
}

export interface PollutantSample {
  code: string;
  displayName: string;
  concentration: {
    value: number;
    units: string;
  };
}

export interface ForecastSlot {
  dateTime: string;
  indexes: Array<{
    aqi: number;
  }>;
}

export interface ActivityDecision {
  activity: ActivityTemplate;
  riskScore: RiskScore;
  recommendation: string;
  bestTimeWindow?: {
    start: string;
    end: string;
    reason: string;
  };
  pollutantBreakdown: Array<{
    pollutant: string;
    contribution: number;
    displayName: string;
  }>;
}
