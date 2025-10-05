import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { cacheService } from '@/services/cacheService';
import { calculateDistance } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MODEL_PREFERENCE = [
  process.env.GOOGLE_BRIEFING_MODEL,
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash-lite-preview',
  'gemini-2.0-flash',
  'gemini-2.0-flash-exp',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash-002',
  'gemini-1.5-flash-001',
  'gemini-1.5-flash',
  'gemini-1.5-pro-latest',
  'gemini-1.0-pro',
  'gemini-pro',
].filter(Boolean) as string[];

const API_VERSION_PREFERENCE = [
  process.env.GOOGLE_BRIEFING_API_VERSION,
  'v1beta',
  'v1',
].filter(Boolean) as string[];

const MODEL_CANDIDATES = Array.from(new Set(MODEL_PREFERENCE));
const API_VERSIONS = Array.from(new Set(API_VERSION_PREFERENCE));

const genAI = process.env.GOOGLE_GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY)
  : null;

interface MajorCity {
  name: string;
  lat: number;
  lng: number;
  aliases?: string[];
}

const MAJOR_CITIES: MajorCity[] = [
  {
    name: '台北市',
    lat: 25.033968,
    lng: 121.564468,
    aliases: ['臺北市', '台北', 'taipei', 'taipei city'],
  },
  {
    name: '新北市',
    lat: 25.016983,
    lng: 121.462787,
    aliases: ['新北', 'new taipei', 'new taipei city'],
  },
  {
    name: '桃園市',
    lat: 24.993628,
    lng: 121.300979,
    aliases: ['桃園', 'taoyuan', 'taoyuan city'],
  },
  {
    name: '台中市',
    lat: 24.147736,
    lng: 120.673648,
    aliases: ['臺中市', '台中', 'taichung', 'taichung city'],
  },
  {
    name: '台南市',
    lat: 22.9999,
    lng: 120.227028,
    aliases: ['臺南市', '台南', 'tainan', 'tainan city'],
  },
  {
    name: '高雄市',
    lat: 22.627278,
    lng: 120.301435,
    aliases: ['高雄', 'kaohsiung', 'kaohsiung city'],
  },
  {
    name: '基隆市',
    lat: 25.12825,
    lng: 121.7419,
    aliases: ['基隆', 'keelung', 'keelung city'],
  },
  {
    name: '新竹市',
    lat: 24.80395,
    lng: 120.9647,
    aliases: ['新竹', 'hsinchu', 'hsinchu city'],
  },
  {
    name: '苗栗市',
    lat: 24.56016,
    lng: 120.821,
    aliases: ['苗栗', 'miaoli'],
  },
  {
    name: '彰化市',
    lat: 24.081,
    lng: 120.538,
    aliases: ['彰化', 'changhua'],
  },
  {
    name: '南投市',
    lat: 23.91571,
    lng: 120.66387,
    aliases: ['南投', 'nantou'],
  },
  {
    name: '雲林縣',
    lat: 23.70739,
    lng: 120.543,
    aliases: ['雲林', 'yunlin', 'douliu'],
  },
  {
    name: '嘉義市',
    lat: 23.480075,
    lng: 120.449111,
    aliases: ['嘉義', 'chiayi', 'chiayi city'],
  },
  {
    name: '台東市',
    lat: 22.7583,
    lng: 121.144,
    aliases: ['臺東市', '台東', 'taitung'],
  },
  {
    name: '花蓮市',
    lat: 23.991073,
    lng: 121.611,
    aliases: ['花蓮', 'hualien', 'hualien city'],
  },
  {
    name: '宜蘭市',
    lat: 24.757,
    lng: 121.753,
    aliases: ['宜蘭', 'yilan'],
  },
  {
    name: '屏東市',
    lat: 22.676112,
    lng: 120.494828,
    aliases: ['屏東', 'pingtung'],
  },
  {
    name: '澎湖縣',
    lat: 23.56548,
    lng: 119.586,
    aliases: ['澎湖', 'penghu', 'magong'],
  },
  {
    name: '金門縣',
    lat: 24.432133,
    lng: 118.317478,
    aliases: ['金門', 'kinmen'],
  },
];

const CITY_ALIAS_MAP = (() => {
  const map = new Map<string, MajorCity>();
  for (const city of MAJOR_CITIES) {
    const aliases = new Set<string>([city.name, ...(city.aliases ?? [])]);
    for (const alias of aliases) {
      map.set(normalizeCityName(alias), city);
    }
  }
  return map;
})();

const MAX_CITY_DISTANCE_KM = 120;

interface BriefingLevelPayload {
  title: string;
  body: string;
  callToAction?: string;
}

interface BriefingAgentPayload {
  level1: BriefingLevelPayload;
  level2: BriefingLevelPayload;
  level3: BriefingLevelPayload;
  _model?: string;
  _apiVersion?: string;
}

interface BriefingContextLocation {
  lat?: number;
  lng?: number;
}

function normalizeCityName(value?: string) {
  if (!value) return '';
  return value
    .toLowerCase()
    .replace(/[臺]/g, '台')
    .replace(/[\s·\-]/g, '')
    .replace(/[市縣區]/g, '');
}

function findCityByName(name?: string) {
  const normalized = normalizeCityName(name);
  if (!normalized) return null;
  return CITY_ALIAS_MAP.get(normalized) ?? null;
}

function findNearestCity(location?: BriefingContextLocation) {
  const lat = typeof location?.lat === 'number' ? location.lat : undefined;
  const lng = typeof location?.lng === 'number' ? location.lng : undefined;
  if (lat === undefined || lng === undefined) {
    return null;
  }

  let nearest: { city: MajorCity; distance: number } | null = null;
  for (const city of MAJOR_CITIES) {
    const distance = calculateDistance(lat, lng, city.lat, city.lng);
    if (!nearest || distance < nearest.distance) {
      nearest = { city, distance };
    }
  }
  return nearest;
}

function resolveCityName(
  cityName?: string,
  location?: BriefingContextLocation
): { name: string; source: 'location' | 'name' | 'fallback'; distanceKm?: number } | null {
  const nearestByLocation = findNearestCity(location);
  if (nearestByLocation && nearestByLocation.distance <= MAX_CITY_DISTANCE_KM) {
    return {
      name: nearestByLocation.city.name,
      source: 'location',
      distanceKm: nearestByLocation.distance,
    };
  }

  const matchedByName = findCityByName(cityName);
  if (matchedByName) {
    return { name: matchedByName.name, source: 'name' };
  }

  if (cityName) {
    return { name: cityName, source: 'fallback' };
  }

  return null;
}

async function computeContextHash(cityName: string, context: Record<string, unknown>) {
  const signaturePayload = {
    city: cityName,
    aqi: context?.airQuality && typeof context.airQuality === 'object'
      ? (context.airQuality as Record<string, unknown>).aqi ?? null
      : null,
    timestamp: context?.airQuality && typeof context.airQuality === 'object'
      ? (context.airQuality as Record<string, unknown>).timestamp ?? null
      : null,
    peakDateTime: context?.forecast && typeof context.forecast === 'object'
      ? (context.forecast as Record<string, unknown>).peakDateTime ?? null
      : null,
    commuteMaxAqi: context?.commute && typeof context.commute === 'object'
      ? (context.commute as Record<string, unknown>).maxAqi ?? null
      : null,
  };

  const json = JSON.stringify(signaturePayload);

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(json);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 12);
  }

  const { createHash } = await import('node:crypto');
  return createHash('sha1').update(json).digest('hex').slice(0, 12);
}

function buildPrompt(context: Record<string, unknown>, language: 'zh' | 'en' = 'zh') {
  const prompts = {
    zh: `你是一位 NASA EarthData 專案的資料分析師，擅長將複雜數據轉譯給不同受眾。

[任務]
請根據提供的 JSON Context，輸出一份 JSON 物件，包含三個層級的摘要：
- level1: 面向科學家
- level2: 面向市長/決箖者
- level3: 面向一般民眾

[Context]
${JSON.stringify(context, null, 2)}

[輸出格式]
{
  "level1": {"title": "", "body": "", "callToAction": ""},
  "level2": {"title": "", "body": "", "callToAction": ""},
  "level3": {"title": "", "body": "", "callToAction": ""}
}

[語氣要求]
- level1: 技術語氣，包含統計或模型可信度。
- level2: 行動導向，強調政策決策與成本效益，限制 2 句。
- level3: 清楚的行動清單，以條列語句表達，限制 3 點。
- 全部輸出使用繁體中文。
- 嚴格輸出 JSON，不要額外文字。`,
    en: `You are a data analyst from the NASA EarthData project, specializing in translating complex data for different audiences.

[Task]
Based on the provided JSON Context, output a JSON object containing three levels of summaries:
- level1: For scientists
- level2: For mayors/decision makers  
- level3: For general public

[Context]
${JSON.stringify(context, null, 2)}

[Output Format]
{
  "level1": {"title": "", "body": "", "callToAction": ""},
  "level2": {"title": "", "body": "", "callToAction": ""},
  "level3": {"title": "", "body": "", "callToAction": ""}
}

[Tone Requirements]
- level1: Technical tone, including statistics or model confidence.
- level2: Action-oriented, emphasizing policy decisions and cost-effectiveness, limit to 2 sentences.
- level3: Clear action list, expressed in bullet points, limit to 3 points.
- All output in English.
- Strictly output JSON, no extra text.`
  };
  
  return prompts[language];
}

function sanitizeJsonResponse(raw: string) {
  return raw
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```/i, '')
    .replace(/```$/i, '')
    .trim();
}

async function generateBriefing(prompt: string) {
  if (!genAI) {
    throw new Error('GOOGLE_GEMINI_API_KEY 未設定，無法生成多級別摘要');
  }

  const attempts: Array<{ model: string; apiVersion: string; error: string }> = [];

  for (const modelId of MODEL_CANDIDATES) {
    for (const apiVersion of API_VERSIONS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelId }, { apiVersion });
        const result = await model.generateContent({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.6,
          },
        });

        const text = result.response?.text();
        if (!text) {
          throw new Error('模型沒有返回內容');
        }

        return { text: sanitizeJsonResponse(text), model: modelId, apiVersion };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        attempts.push({ model: modelId, apiVersion, error: message });

        const isModelUnavailable = /404|not found|unsupported|does not support/i.test(message);
        if (!isModelUnavailable) {
          throw new Error(
            `模型 ${modelId} (API ${apiVersion}) 生成失敗: ${message}${
              attempts.length > 1
                ? `。先前嘗試：${attempts
                    .slice(0, -1)
                    .map((attempt) => `${attempt.model}@${attempt.apiVersion}: ${attempt.error}`)
                    .join('; ')}`
                : ''
            }`
          );
        }
      }
    }
  }

  const detail = attempts
    .map((attempt) => `${attempt.model}@${attempt.apiVersion}: ${attempt.error}`)
    .join('; ');
  throw new Error(`所有模型皆無法生成回應 (${detail})`);
}

export async function POST(request: NextRequest) {
  if (!genAI) {
    return NextResponse.json(
      { error: 'GOOGLE_GEMINI_API_KEY 未設定，無法生成多級別摘要' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const context = body?.context;

    if (!context) {
      return NextResponse.json(
        { error: '缺少 context 資料' },
        { status: 400 }
      );
    }

    const cityResolution = resolveCityName(
      typeof context.cityName === 'string' ? context.cityName : undefined,
      context?.airQuality && typeof context.airQuality === 'object'
        ? (context.airQuality as { location?: BriefingContextLocation }).location
        : undefined
    );

    const cityName =
      cityResolution?.name ?? (typeof context.cityName === 'string' ? context.cityName : '未知城市');
    const enhancedContext = {
      ...context,
      cityName,
      citySource: cityResolution?.source ?? 'unknown',
      cityDistanceKm: cityResolution?.distanceKm,
    } as Record<string, unknown>;
    const language = (body.language === 'en' ? 'en' : 'zh') as 'zh' | 'en';
    const contextHash = await computeContextHash(cityName, enhancedContext);
    const cacheKey = `briefing:${cityName}:${language}:${contextHash}`;
    const cacheTtl = 15 * 60 * 1000; // 15 分鐘

    const cached = await cacheService.get<BriefingAgentPayload>(cacheKey);
    const cityHeader = encodeURIComponent(cityName);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'X-Cache': 'HIT',
          'X-Briefing-City': cityHeader,
          'Cache-Control': 'public, max-age=0, s-maxage=600',
        },
      });
    }

    const prompt = buildPrompt(enhancedContext, language);
    const { text, model, apiVersion } = await generateBriefing(prompt);

    let payload: BriefingAgentPayload;
    try {
      payload = JSON.parse(text) as BriefingAgentPayload;
    } catch (parseError) {
      const sample = text.slice(0, 200);
      const reason = parseError instanceof Error ? parseError.message : String(parseError);
      throw new Error(
        `模型${model ? ` (${model})` : ''} 回傳格式錯誤，無法解析為 JSON（${reason}）。樣本: ${sample}`
      );
    }

    const responsePayload: BriefingAgentPayload = {
      ...payload,
      _model: model,
      _apiVersion: apiVersion,
    };

    await cacheService.set(cacheKey, responsePayload, cacheTtl);

    return NextResponse.json(responsePayload, {
      headers: {
        'X-Cache': 'MISS',
        'X-Briefing-City': cityHeader,
        'Cache-Control': 'public, max-age=0, s-maxage=600',
      },
    });
  } catch (error) {
    console.error('[agent/briefing] failed:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '無法生成多級別摘要',
      },
      { status: 500 }
    );
  }
}
