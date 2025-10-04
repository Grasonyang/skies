/**
 * 健康建議系統
 * 根據 AQI 等級和用戶族群提供個人化建議
 */

export enum UserGroup {
  GENERAL = 'general', // 一般民眾
  SENSITIVE = 'sensitive', // 敏感族群（老人、兒童、孕婦）
  RESPIRATORY = 'respiratory', // 呼吸道疾病患者（氣喘、COPD）
  CARDIOVASCULAR = 'cardiovascular', // 心血管疾病患者
  OUTDOOR_WORKER = 'outdoor_worker', // 戶外工作者
}

export interface HealthRecommendation {
  group: UserGroup;
  groupLabel: string;
  aqiLevel: string;
  riskLevel: 'low' | 'moderate' | 'high' | 'very_high' | 'hazardous';
  riskLevelLabel: string;
  activities: {
    outdoor: string;
    exercise: string;
    mask: string;
    window: string;
  };
  symptoms: string[];
  advice: string[];
  icon: string;
}

const USER_GROUP_LABELS: Record<UserGroup, string> = {
  [UserGroup.GENERAL]: '一般民眾',
  [UserGroup.SENSITIVE]: '敏感族群',
  [UserGroup.RESPIRATORY]: '呼吸道疾病患者',
  [UserGroup.CARDIOVASCULAR]: '心血管疾病患者',
  [UserGroup.OUTDOOR_WORKER]: '戶外工作者',
};

/**
 * 獲取健康建議
 */
export function getHealthRecommendation(
  aqi: number,
  userGroup: UserGroup = UserGroup.GENERAL
): HealthRecommendation {
  // AQI 0-50: 良好
  if (aqi <= 50) {
    return {
      group: userGroup,
      groupLabel: USER_GROUP_LABELS[userGroup],
      aqiLevel: '良好',
      riskLevel: 'low',
      riskLevelLabel: '低風險',
      activities: {
        outdoor: '適合所有戶外活動',
        exercise: '可進行各種運動',
        mask: '不需要配戴口罩',
        window: '可開窗通風',
      },
      symptoms: [],
      advice: [
        '空氣品質良好，適合戶外活動',
        '可進行晨間運動或散步',
        '是進行戶外運動的好時機',
      ],
      icon: '😊',
    };
  }

  // AQI 51-100: 普通
  if (aqi <= 100) {
    const isSensitive = [UserGroup.SENSITIVE, UserGroup.RESPIRATORY, UserGroup.CARDIOVASCULAR].includes(userGroup);
    
    return {
      group: userGroup,
      groupLabel: USER_GROUP_LABELS[userGroup],
      aqiLevel: '普通',
      riskLevel: isSensitive ? 'moderate' : 'low',
      riskLevelLabel: isSensitive ? '中等風險' : '低風險',
      activities: {
        outdoor: isSensitive ? '減少長時間戶外活動' : '可正常進行戶外活動',
        exercise: isSensitive ? '避免劇烈運動' : '可進行一般運動',
        mask: isSensitive ? '建議配戴口罩' : '視情況配戴口罩',
        window: '適度開窗通風',
      },
      symptoms: isSensitive ? ['可能出現輕微刺激'] : [],
      advice: isSensitive
        ? [
            '敏感族群請減少戶外活動時間',
            '如有不適症狀請立即返回室內',
            '考慮配戴口罩進行防護',
          ]
        : [
            '一般民眾可正常進行活動',
            '適度的戶外活動對健康有益',
          ],
      icon: isSensitive ? '😐' : '🙂',
    };
  }

  // AQI 101-150: 對敏感族群不健康
  if (aqi <= 150) {
    const isHighRisk = [UserGroup.RESPIRATORY, UserGroup.CARDIOVASCULAR].includes(userGroup);
    
    return {
      group: userGroup,
      groupLabel: USER_GROUP_LABELS[userGroup],
      aqiLevel: '對敏感族群不健康',
      riskLevel: isHighRisk ? 'high' : 'moderate',
      riskLevelLabel: isHighRisk ? '高風險' : '中等風險',
      activities: {
        outdoor: userGroup === UserGroup.GENERAL ? '減少長時間戶外活動' : '避免戶外活動',
        exercise: userGroup === UserGroup.GENERAL ? '減少劇烈運動' : '避免所有戶外運動',
        mask: '建議配戴 N95 口罩',
        window: '關閉窗戶，使用空氣清淨機',
      },
      symptoms: [
        '咳嗽、喉嚨不適',
        '眼睛刺激',
        '呼吸急促',
      ],
      advice: [
        '敏感族群應避免外出',
        '必要外出時請配戴 N95 口罩',
        '使用空氣清淨機改善室內空氣',
        '隨時關注身體狀況',
        userGroup === UserGroup.RESPIRATORY && '準備好急救藥物（如吸入劑）',
      ].filter(Boolean) as string[],
      icon: '😷',
    };
  }

  // AQI 151-200: 不健康
  if (aqi <= 200) {
    return {
      group: userGroup,
      groupLabel: USER_GROUP_LABELS[userGroup],
      aqiLevel: '不健康',
      riskLevel: 'high',
      riskLevelLabel: '高風險',
      activities: {
        outdoor: '避免所有戶外活動',
        exercise: '禁止戶外運動',
        mask: '必須配戴 N95 口罩',
        window: '緊閉窗戶，使用空氣清淨機',
      },
      symptoms: [
        '明顯咳嗽',
        '呼吸困難',
        '胸悶',
        '心跳加速',
      ],
      advice: [
        '所有人應避免外出',
        '必要外出時務必配戴 N95 口罩',
        '關閉所有門窗',
        '使用空氣清淨機',
        '注意身體狀況，如有不適立即就醫',
        userGroup === UserGroup.RESPIRATORY && '隨身攜帶急救藥物',
        userGroup === UserGroup.CARDIOVASCULAR && '監測血壓和心率',
      ].filter(Boolean) as string[],
      icon: '😨',
    };
  }

  // AQI 201-300: 非常不健康
  if (aqi <= 300) {
    return {
      group: userGroup,
      groupLabel: USER_GROUP_LABELS[userGroup],
      aqiLevel: '非常不健康',
      riskLevel: 'very_high',
      riskLevelLabel: '極高風險',
      activities: {
        outdoor: '禁止外出',
        exercise: '禁止所有運動',
        mask: '必須配戴 N95 或更高等級口罩',
        window: '緊閉所有門窗',
      },
      symptoms: [
        '嚴重咳嗽',
        '呼吸困難',
        '胸痛',
        '心悸',
        '頭暈',
      ],
      advice: [
        '⚠️ 所有人應留在室內',
        '絕對避免外出',
        '使用空氣清淨機',
        '密切監測健康狀況',
        '如有任何不適立即就醫',
        '準備好急救藥物',
        '考慮暫時離開污染區域',
      ],
      icon: '😰',
    };
  }

  // AQI 301+: 危險
  return {
    group: userGroup,
    groupLabel: USER_GROUP_LABELS[userGroup],
    aqiLevel: '危險',
    riskLevel: 'hazardous',
    riskLevelLabel: '危險',
    activities: {
      outdoor: '絕對禁止外出',
      exercise: '禁止所有活動',
      mask: '必須配戴最高等級防護口罩',
      window: '緊閉所有門窗並密封',
    },
    symptoms: [
      '嚴重呼吸困難',
      '持續咳嗽',
      '胸痛',
      '心律不整',
      '意識模糊',
    ],
    advice: [
      '🚨 緊急狀況',
      '所有人必須留在室內',
      '使用最高等級空氣清淨機',
      '如有呼吸困難立即撥打 119',
      '高風險族群應考慮撤離',
      '準備緊急醫療用品',
      '持續關注官方資訊',
    ],
    icon: '☠️',
  };
}

/**
 * 獲取活動適宜度評分
 * @returns 0-100 的分數，越高越適合戶外活動
 */
export function getActivityScore(aqi: number): number {
  if (aqi <= 50) return 100;
  if (aqi <= 100) return 75;
  if (aqi <= 150) return 50;
  if (aqi <= 200) return 25;
  return 0;
}

/**
 * 獲取口罩建議等級
 */
export function getMaskRecommendation(aqi: number): {
  level: string;
  description: string;
} {
  if (aqi <= 50) {
    return {
      level: '不需要',
      description: '空氣品質良好，不需要配戴口罩',
    };
  }
  if (aqi <= 100) {
    return {
      level: '一般口罩',
      description: '敏感族群可考慮配戴一般醫用口罩',
    };
  }
  if (aqi <= 150) {
    return {
      level: 'N95',
      description: '建議配戴 N95 或 KF94 口罩',
    };
  }
  return {
    level: 'N95+',
    description: '必須配戴 N95 或更高等級的防護口罩',
  };
}
