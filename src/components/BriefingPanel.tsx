import React from 'react';
import { AQIData } from '@/types';
import { ForecastResponse } from '@/types/forecast';
import { CommuteGuardianRoute } from '@/types/commute';
import { useBriefingAgent } from '@/hooks/useBriefingAgent';

interface BriefingPanelProps {
  open: boolean;
  cityName: string;
  aqiData: AQIData | null;
  forecastData: ForecastResponse | null;
  commuteRoutes: CommuteGuardianRoute[];
  language?: 'zh' | 'en';
}

const levelBadges: Record<'zh' | 'en', Record<string, string>> = {
  zh: {
    level1: '科學家摘要',
    level2: '決策者重點',
    level3: '民眾行動清單',
  },
  en: {
    level1: 'Scientific Summary',
    level2: 'Decision Makers Brief',
    level3: 'Public Action List',
  },
};

const panelTexts: Record<'zh' | 'en', { title: string; description: string; loading: string; error: string; retry: string }> = {
  zh: {
    title: '📜 多級別受眾摘要',
    description: '將 {cityName} 即時預測轉換為不同受眾可理解的重點，展現資料影響力。',
    loading: 'Agent 正在彙整資料...',
    error: '無法獲取摘要資料，請稍後再試。',
    retry: '重新獲取'
  },
  en: {
    title: '📜 Multi-level Audience Summary',
    description: 'Transform {cityName} real-time predictions into key insights understandable by different audiences, showcasing data impact.',
    loading: 'Agent is organizing data...',
    error: 'Unable to retrieve summary data, please try again later.',
    retry: 'Retry'
  },
};

export const BriefingPanel: React.FC<BriefingPanelProps> = ({
  open,
  cityName,
  aqiData,
  forecastData,
  commuteRoutes,
  language = 'zh',
}) => {
  const { data, loading, error, refetch } = useBriefingAgent({
    enabled: open,
    cityName,
    aqiData,
    forecastData,
    commuteRoutes,
    language,
  });
  
  const texts = panelTexts[language];
  const badges = levelBadges[language];

  const rows = data
    ? ([
        ['level1', data.level1],
        ['level2', data.level2],
        ['level3', data.level3],
      ] as const)
    : [];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-2xl font-semibold text-slate-900">{texts.title}</h3>
        <p className="text-sm text-slate-500">
          {texts.description.replace('{cityName}', cityName)}
        </p>
      </div>

            {loading && (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">{texts.loading}</p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {texts.error}
          <button
            onClick={refetch}
            className="ml-2 text-red-600 underline hover:text-red-800"
          >
            {texts.retry}
          </button>
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {rows.map(([key, level]) => (
            <div
              key={key}
              className="flex h-full flex-col gap-3 rounded-3xl border border-slate-100 bg-white/95 p-5 shadow-md backdrop-blur-sm"
            >
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
                {badges[key]}
              </span>
              <div className="space-y-2">
                <h4 className="text-lg font-semibold text-slate-800">{level.title}</h4>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{level.body}</p>
              </div>
              {level.callToAction && (
                <div className="mt-auto rounded-2xl bg-indigo-50 px-3 py-2 text-xs text-indigo-600">
                  {level.callToAction}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BriefingPanel;
