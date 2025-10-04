import { describe, it, expect } from 'vitest';
import {
  DecisionEngineL1,
  calculateRiskScore,
  generateActivityDecision,
  evaluateDefaultActivities,
  ACTIVITY_TEMPLATES,
} from '@/lib/decision-engine/l1';

describe('DecisionEngineL1 風險評估', () => {
  const basePollutants = [
    { code: 'pm25', displayName: 'PM2.5', concentration: { value: 35, units: 'µg/m³' } },
    { code: 'o3', displayName: '臭氧', concentration: { value: 60, units: 'ppb' } },
  ];

  it('應產生安全等級風險', () => {
    const score = calculateRiskScore(25, ACTIVITY_TEMPLATES[1], basePollutants);
    expect(score.level).toBe('safe');
    expect(score.score).toBeLessThan(40);
  });

  it('應產生注意等級風險', () => {
    const score = calculateRiskScore(80, ACTIVITY_TEMPLATES[2], basePollutants);
    expect(score.level).toBe('caution');
  });

  it('應產生不宜等級風險', () => {
    const score = calculateRiskScore(120, ACTIVITY_TEMPLATES[0], [
      ...basePollutants,
      { code: 'pm10', displayName: 'PM10', concentration: { value: 180, units: 'µg/m³' } },
    ]);
    expect(score.level === 'unhealthy' || score.level === 'dangerous').toBeTruthy();
  });
});

describe('DecisionEngineL1 決策輸出', () => {
  it('應提供最佳時間窗口', () => {
    const decision = generateActivityDecision(
      ACTIVITY_TEMPLATES[0],
      150,
      [
        { code: 'pm25', displayName: 'PM2.5', concentration: { value: 80, units: 'µg/m³' } },
        { code: 'o3', displayName: '臭氧', concentration: { value: 110, units: 'ppb' } },
      ],
      [
        { dateTime: new Date().toISOString(), indexes: [{ aqi: 150 }] },
        { dateTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), indexes: [{ aqi: 60 }] },
      ]
    );

    expect(decision.bestTimeWindow).toBeDefined();
    expect(decision.riskScore.level === 'unhealthy' || decision.riskScore.level === 'dangerous').toBeTruthy();
  });

  it('預設模板評估輸出應覆蓋所有活動', () => {
    const result = evaluateDefaultActivities(90);
    expect(result.length).toBe(ACTIVITY_TEMPLATES.length);
    result.forEach((item) => {
      expect(item.activity).toBeDefined();
      expect(item.riskScore).toBeDefined();
    });
  });
});
