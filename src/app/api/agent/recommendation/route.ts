import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'nodejs';

interface RecommendationRequest {
  activity: string;
  scenario: {
    location: string;
    timeSlots: Array<{
      time: string;
      aqi: number;
      category: string;
      dominantPollutant: string;
    }>;
    bestTime?: string;
    worstTime?: string;
  };
  userProfile?: {
    sensitivity?: string;
    preferences?: string[];
  };
}

/**
 * Vertex AI Gemini API 代理
 * 輸入活動+AQI 劇本 → 產出自然語言建議
 */
export async function POST(request: NextRequest) {
  try {
    const body: RecommendationRequest & { language?: 'zh' | 'en' } = await request.json();
    const { activity, scenario, userProfile, language = 'zh' } = body;

    if (!activity || !scenario) {
      return NextResponse.json(
        { error: '缺少必要的參數' },
        { status: 400 }
      );
    }

    // 檢查是否設定了 Vertex AI 相關環境變數
    const apiKey = process.env.GOOGLE_API_KEY;

    // 如果沒有設定 Vertex AI，使用 fallback 模板
    if (!apiKey) {
      console.warn('⚠️ Gemini API Key 未設定，使用 fallback 模板');
      const fallbackRecommendation = generateFallbackRecommendation(activity, scenario, language);
      return NextResponse.json({
        recommendation: fallbackRecommendation,
        source: 'fallback',
        confidence: 0.75,
      });
    }

    // 建立 prompt
      const prompt = createPrompt(activity, scenario, userProfile, language);    // 初始化 GoogleGenerativeAI
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const recommendation = response.text();

    return NextResponse.json({
      recommendation: recommendation.trim(),
      source: 'gemini',
      confidence: 0.9,
    });

  } catch (error) {
    console.error('❌ Agent Recommendation API 錯誤:', error);
    
    // 錯誤時使用 fallback
    try {
      const body: RecommendationRequest = await request.json();
      const fallbackRecommendation = generateFallbackRecommendation(body.activity, body.scenario);
      return NextResponse.json({
        recommendation: fallbackRecommendation,
        source: 'fallback',
        confidence: 0.75,
      });
    } catch {
      return NextResponse.json(
        { error: '內部伺服器錯誤' },
        { status: 500 }
      );
    }
  }
}

interface TimeSlot {
  time: string;
  aqi: number;
  category: string;
  dominantPollutant: string;
}

interface ScenarioData {
  location: string;
  timeSlots: TimeSlot[];
  bestTime?: string;
  worstTime?: string;
}

interface UserProfile {
  sensitivity?: string;
  preferences?: string[];
}

/**
 * 建立 AI prompt
 */
function createPrompt(
  activity: string,
  scenario: ScenarioData,
  userProfile?: UserProfile,
  language: 'zh' | 'en' = 'zh'
): string {
  const prompts = {
    zh: {
      sensitivityNote: userProfile?.sensitivity ? `使用者為${userProfile.sensitivity}敏感族群。` : '',
      timeSlotLabel: '主要污染物',
      prompt: `你是一位專業的空氣品質健康顧問，請根據以下資訊提供簡潔實用的建議：

活動類型：{activity}
地點：{location}
{sensitivityNote}

未來 24 小時空氣品質預測：
{timeSlotsSummary}

最佳時段：{bestTime}
最差時段：{worstTime}

請提供：
1. 針對這個活動的最佳時段建議（2-3 句）
2. 需要注意的健康風險（1-2 句）
3. 具體的防護措施（1-2 個要點）

請用繁體中文回答，語氣友善且專業，字數控制在 150 字以內。`
    },
    en: {
      sensitivityNote: userProfile?.sensitivity ? `User has ${userProfile.sensitivity} sensitivity.` : '',
      timeSlotLabel: 'Primary pollutant',
      prompt: `You are a professional air quality health advisor. Please provide concise and practical recommendations based on the following information:

Activity type: {activity}
Location: {location}
{sensitivityNote}

24-hour air quality forecast:
{timeSlotsSummary}

Best time: {bestTime}
Worst time: {worstTime}

Please provide:
1. Best time recommendations for this activity (2-3 sentences)
2. Health risks to be aware of (1-2 sentences)
3. Specific protective measures (1-2 points)

Please answer in English with a friendly and professional tone, keeping it under 150 words.`
    }
  };

  const template = prompts[language];
  const timeSlotsSummary = scenario.timeSlots
    .map((slot) => `- ${slot.time}: AQI ${slot.aqi} (${slot.category}), ${template.timeSlotLabel}: ${slot.dominantPollutant}`)
    .join('\n');

  return template.prompt
    .replace('{activity}', activity)
    .replace('{location}', scenario.location)
    .replace('{sensitivityNote}', template.sensitivityNote)
    .replace('{timeSlotsSummary}', timeSlotsSummary)
    .replace('{bestTime}', scenario.bestTime || (language === 'zh' ? '待分析' : 'To be analyzed'))
    .replace('{worstTime}', scenario.worstTime || (language === 'zh' ? '待分析' : 'To be analyzed'));
}

/**
 * 生成 fallback 建議
 */
function generateFallbackRecommendation(activity: string, scenario: ScenarioData, language: 'zh' | 'en' = 'zh'): string {
  const timeSlots = scenario.timeSlots || [];
  const avgAqi = timeSlots.reduce((sum, slot) => sum + slot.aqi, 0) / Math.max(timeSlots.length, 1);
  
  const templates = {
    zh: {
      riskLevels: { low: '低', medium: '中', high: '高' },
      activityAdvice: {
        low: '適合進行戶外活動',
        medium: '敏感族群應減少戶外活動強度',
        high: '建議改為室內活動或延後'
      },
      protectionAdvice: {
        low: '建議攜帶水壺保持水分',
        medium: '建議配戴口罩，避免高強度運動',
        high: '如需外出請配戴 N95 口罩，並縮短活動時間'
      },
      defaultTime: '早晨時段',
      template: `針對「{activity}」活動分析：

**最佳時段**：{bestTime}，此時空氣品質相對較佳（AQI {bestAqi}）。{activityAdvice}。

**健康風險**：當前風險等級為{riskLevel}，{timeAdvice}。

**防護措施**：{protectionAdvice}。敏感族群如有不適應立即停止活動。

（此為基於空氣品質數據的 L1 決策建議，實際情況請以個人健康狀況為準）`
    },
    en: {
      riskLevels: { low: 'Low', medium: 'Medium', high: 'High' },
      activityAdvice: {
        low: 'Suitable for outdoor activities',
        medium: 'Sensitive groups should reduce outdoor activity intensity',
        high: 'Recommend indoor activities or postponement'
      },
      protectionAdvice: {
        low: 'Recommend carrying water to stay hydrated',
        medium: 'Recommend wearing masks and avoiding high-intensity exercise',
        high: 'If going out, please wear N95 masks and shorten activity time'
      },
      defaultTime: 'Morning hours',
      template: `Analysis for "{activity}" activity:

**Best Time**: {bestTime}, when air quality is relatively better (AQI {bestAqi}). {activityAdvice}.

**Health Risk**: Current risk level is {riskLevel}, {timeAdvice}.

**Protection Measures**: {protectionAdvice}. Sensitive individuals should stop immediately if experiencing discomfort.

(This is an L1 decision recommendation based on air quality data, actual conditions should be based on personal health status)`
    }
  };

  const template = templates[language];
  let riskKey: 'low' | 'medium' | 'high' = 'low';
  
  if (avgAqi > 150) {
    riskKey = 'high';
  } else if (avgAqi > 100) {
    riskKey = 'medium';
  }

  const bestSlot = timeSlots.reduce<TimeSlot | null>((best, slot) => 
    (!best || slot.aqi < best.aqi) ? slot : best, null);

  const bestTime = bestSlot ? bestSlot.time : template.defaultTime;
  const timeAdvice = scenario.bestTime 
    ? (language === 'zh' ? `建議選擇 ${scenario.bestTime} 進行活動` : `recommend choosing ${scenario.bestTime} for activities`)
    : (language === 'zh' ? '請持續關注即時空氣品質' : 'please continue monitoring real-time air quality');

  return template.template
    .replace('{activity}', activity)
    .replace('{bestTime}', bestTime)
    .replace('{bestAqi}', String(bestSlot?.aqi || 'N/A'))
    .replace('{activityAdvice}', template.activityAdvice[riskKey])
    .replace('{riskLevel}', template.riskLevels[riskKey])
    .replace('{timeAdvice}', timeAdvice)
    .replace('{protectionAdvice}', template.protectionAdvice[riskKey]);
}
