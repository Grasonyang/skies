'use client';

import React from 'react';
import { AQIData } from '@/types';
import { ForecastResponse } from '@/types/forecast';
import { useActionHUD } from '@/hooks/useActionHUD';
import { useTranslation } from '@/lib/i18n';

interface ActionHUDPanelProps {
  aqiData: AQIData | null;
  forecastData: ForecastResponse | null;
  loading?: boolean;
  onFeedback?: () => void;
  onStartDiscussion?: () => void;
  className?: string;
}

const ActionHUDPanel: React.FC<ActionHUDPanelProps> = ({
  aqiData,
  forecastData,
  loading = false,
  onFeedback,
  onStartDiscussion,
  className,
}) => {
  const { t, locale } = useTranslation();
  const texts = {
    title: t('actionHud.title'),
    description: t('actionHud.description'),
    healthPreference: t('actionHud.healthPreference'),
    general: t('actionHud.general'),
    healthToggle: t('actionHud.healthToggle'),
    loading: t('actionHud.loading'),
    noData: t('actionHud.noData'),
    feedback: t('actionHud.feedback'),
    share: t('actionHud.share'),
    riskIndex: t('actionHud.riskIndex'),
    recommendedTime: t('actionHud.recommendedTime'),
    bestTime: t('actionHud.bestTime'),
    highestRiskActivity: t('actionHud.highestRiskActivity'),
    missingData: t('actionHud.missingData'),
  };
  const riskTexts = {
    safe: t('risk.safe'),
    caution: t('risk.caution'),
    unhealthy: t('risk.unhealthy'),
    dangerous: t('risk.dangerous'),
  };
  const { suggestions, dominantRisk } = useActionHUD({ aqiData, forecastData });

  const baseClass = 'bg-white/95 backdrop-blur-md rounded-3xl shadow-xl p-6 w-full max-w-3xl';
  const combinedClass = className ? `${baseClass} ${className}` : baseClass;

  if (loading) {
    return (
      <div className={`${combinedClass} animate-pulse`}>
        <div className="h-6 bg-gray-200 w-48 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-16 bg-gray-200 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!aqiData) {
    return (
      <div className={`${combinedClass} text-gray-500`}>
        {texts.missingData}
      </div>
    );
  }

  const dateLocale = locale === 'en' ? 'en-US' : locale ?? 'zh-TW';

  return (
    <div className={combinedClass}>
      <div className="flex flex-col gap-4">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-slate-800">{texts.title}</h3>
            <p className="text-sm text-slate-500">
              {texts.description}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <div className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200">
              {texts.healthPreference}<span className="font-semibold">{texts.general}</span>
            </div>
            <button
              className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 text-xs"
              onClick={() => console.info('[ActionHUD] TODO: Switch health preference')}
            >
              {texts.healthToggle}
            </button>
            {onFeedback && (
              <button
                onClick={onFeedback}
                className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200"
              >
                {texts.feedback}
              </button>
            )}
            {onStartDiscussion && (
              <button
                onClick={onStartDiscussion}
                className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200"
              >
                {texts.share}
              </button>
            )}
          </div>
        </header>

        {dominantRisk && (
          <section
            className="rounded-2xl border p-4 flex flex-col gap-2"
            style={{
              borderColor: dominantRisk.riskScore.color,
              backgroundColor: `${dominantRisk.riskScore.color}12`,
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">{texts.highestRiskActivity}</p>
                <h4 className="text-lg font-semibold text-slate-800">
                  {dominantRisk.activity.icon} {dominantRisk.activity.name}
                </h4>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">{texts.riskIndex}</p>
                <p className="text-xl font-bold" style={{ color: dominantRisk.riskScore.color }}>
                  {dominantRisk.riskScore.score}
                </p>
                <p className="text-xs text-slate-500">
                                        <span className="text-xs font-medium text-slate-500">
                        {riskTexts[dominantRisk.riskScore.level as keyof typeof riskTexts] || dominantRisk.riskScore.level}
                      </span>
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {dominantRisk.recommendation}
            </p>
            {dominantRisk.bestTimeWindow && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-indigo-600">
                <span className="font-semibold">{texts.recommendedTime}</span>
                <span>
                  {new Date(dominantRisk.bestTimeWindow.start).toLocaleTimeString(dateLocale, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  →{' '}
                  {new Date(dominantRisk.bestTimeWindow.end).toLocaleTimeString(dateLocale, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span className="text-slate-500">{dominantRisk.bestTimeWindow.reason}</span>
              </div>
            )}
          </section>
        )}

        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {suggestions.map((item) => (
            <article
              key={item.activityId}
              className="rounded-2xl border p-4 flex flex-col gap-3"
              style={{
                borderColor: item.color,
                backgroundColor: `${item.color}0F`,
              }}
            >
              <div>
                <h4 className="font-semibold text-slate-800">{item.title}</h4>
                <p className="text-xs text-slate-500">
                  {item.bestTimeText ? `${texts.bestTime} ${item.bestTimeText}` : riskTexts[item.severity as keyof typeof riskTexts]}
                </p>
              </div>
              <p className="text-sm text-slate-600 flex-1">{item.description}</p>
              <button
                onClick={item.onTrigger}
                className="mt-auto inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-semibold text-white"
                style={{ background: item.color }}
              >
                {item.ctaLabel}
              </button>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
};

export default ActionHUDPanel;
