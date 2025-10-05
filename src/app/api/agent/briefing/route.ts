import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const DEFAULT_MODEL = process.env.OPENAI_BRIEFING_MODEL || 'gpt-4o-mini';

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

interface BriefingLevelPayload {
  title: string;
  body: string;
  callToAction?: string;
}

interface BriefingAgentPayload {
  level1: BriefingLevelPayload;
  level2: BriefingLevelPayload;
  level3: BriefingLevelPayload;
}

function buildPrompt(context: any) {
  return `你是一位空氣品質資料分析師，善於將 NASA EarthData 與衛星資料轉換成多層次的溝通素材。

[任務]
請根據提供的 JSON Context，輸出一份 JSON 物件，包含三個層級的摘要：
- level1: 面向科學家
- level2: 面向市長/決策者
- level3: 面向一般民眾

[Context]
${JSON.stringify(context, null, 2)}

[輸出格式]
{
  "level1": {"title": "", "body": "", "callToAction": ""},
  "level2": {...},
  "level3": {...}
}

[語氣要求]
- level1: 技術語氣，包含統計或模型可信度。
- level2: 行動導向，強調政策決策與成本效益，限制 2 句。
- level3: 清楚的行動清單，以條列語句表達，限制 3 點。
- 全部輸出使用繁體中文。
- 嚴格輸出 JSON，不要額外文字。
`;
}

export async function POST(request: NextRequest) {
  if (!client) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY 未設定，無法生成多級別摘要' },
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

    const prompt = buildPrompt(context);

    const completion = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' as const },
      max_tokens: 600,
      messages: [
        {
          role: 'system',
          content:
            '你是一位 NASA EarthData 專案的資料分析師，擅長將複雜數據轉譯給不同受眾。所有輸出請使用 JSON、繁體中文。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const outputText = completion.choices?.[0]?.message?.content;

    if (!outputText) {
      throw new Error('LLM 回傳為空');
    }

    const payload = JSON.parse(outputText) as BriefingAgentPayload;

    return NextResponse.json(payload);
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
