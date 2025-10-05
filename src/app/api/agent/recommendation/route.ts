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
    const body: RecommendationRequest = await request.json();
    const { activity, scenario, userProfile } = body;

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
      const fallbackRecommendation = generateFallbackRecommendation(activity, scenario);
      return NextResponse.json({
        recommendation: fallbackRecommendation,
        source: 'fallback',
        confidence: 0.75,
      });
    }

    // 建立 prompt
    const prompt = createPrompt(activity, scenario, userProfile);

    // 初始化 GoogleGenerativeAI
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
  userProfile?: UserProfile
): string {
  const sensitivityNote = userProfile?.sensitivity
    ? `使用者為${userProfile.sensitivity}敏感族群。`
    : '';

  const timeSlotsSummary = scenario.timeSlots
    .map((slot) => `- ${slot.time}: AQI ${slot.aqi} (${slot.category}), 主要污染物: ${slot.dominantPollutant}`)
    .join('\n');

  return `你是一位專業的空氣品質健康顧問，請根據以下資訊提供簡潔實用的建議：

活動類型：${activity}
地點：${scenario.location}
${sensitivityNote}

未來 24 小時空氣品質預測：
${timeSlotsSummary}

最佳時段：${scenario.bestTime || '待分析'}
最差時段：${scenario.worstTime || '待分析'}

請提供：
1. 針對這個活動的最佳時段建議（2-3 句）
2. 需要注意的健康風險（1-2 句）
3. 具體的防護措施（1-2 個要點）

請用繁體中文回答，語氣友善且專業，字數控制在 150 字以內。`;
}

/**
 * 生成 fallback 建議
 */
function generateFallbackRecommendation(activity: string, scenario: ScenarioData): string {
  const timeSlots = scenario.timeSlots || [];
  const avgAqi = timeSlots.reduce((sum, slot) => sum + slot.aqi, 0) / Math.max(timeSlots.length, 1);
  
  let riskLevel = '低';
  let activityAdvice = '適合進行戶外活動';
  let protectionAdvice = '建議攜帶水壺保持水分';

  if (avgAqi > 150) {
    riskLevel = '高';
    activityAdvice = '建議改為室內活動或延後';
    protectionAdvice = '如需外出請配戴 N95 口罩，並縮短活動時間';
  } else if (avgAqi > 100) {
    riskLevel = '中';
    activityAdvice = '敏感族群應減少戶外活動強度';
    protectionAdvice = '建議配戴口罩，避免高強度運動';
  }

  const bestSlot = timeSlots.reduce<TimeSlot | null>((best, slot) => 
    (!best || slot.aqi < best.aqi) ? slot : best, null);

  const bestTime = bestSlot ? bestSlot.time : '早晨時段';

  return `針對「${activity}」活動分析：

**最佳時段**：${bestTime}，此時空氣品質相對較佳（AQI ${bestSlot?.aqi || 'N/A'}）。${activityAdvice}。

**健康風險**：當前風險等級為${riskLevel}，${scenario.bestTime ? `建議選擇 ${scenario.bestTime} 進行活動` : '請持續關注即時空氣品質'}。

**防護措施**：${protectionAdvice}。敏感族群如有不適應立即停止活動。

（此為基於空氣品質數據的 L1 決策建議，實際情況請以個人健康狀況為準）`;
}
