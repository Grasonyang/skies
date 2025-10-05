'use client';

import React from 'react';
import { AQIData } from '@/types';
import { ForecastResponse } from '@/types/forecast';
import { useActionHUD } from '@/hooks/useActionHUD';

interface ActionHUDPanelProps {
  aqiData: AQIData | null;
  forecastData: ForecastResponse | null;
  loading?: boolean;
  onFeedback?: () => void;
  onStartDiscussion?: () => void;
  className?: string;
}

const riskCopy: Record<string, string> = {
  safe: '維持既有節奏',
  caution: '留意身體反應',
  unhealthy: '請優先室內替代方案',
  dangerous: '立即停止暴露',
};

const ActionHUDPanel: React.FC<ActionHUDPanelProps> = ({
  aqiData,
  forecastData,
  loading = false,
  onFeedback,
  onStartDiscussion,
  className,
}) => {
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
        尚未取得空氣品質資料。
      </div>
    );
  }

  return (
    <div className={combinedClass}>
      <div className="flex flex-col gap-4">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-slate-800">⚡ 行動風險 HUD</h3>
            <p className="text-sm text-slate-500">
              Decision Engine L1 即時轉換為三個可操作建議，CTA 可直接加入提醒。
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <div className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200">
              健康偏好：<span className="font-semibold">通用</span>
            </div>
            <button
              className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 text-xs"
              onClick={() => console.info('[ActionHUD] TODO: 切換健康偏好')}
            >
              HEALTH TOGGLE
            </button>
            {onFeedback && (
              <button
                onClick={onFeedback}
                className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200"
              >
                給我建議
              </button>
            )}
            {onStartDiscussion && (
              <button
                onClick={onStartDiscussion}
                className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200"
              >
                發起討論
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
                <p className="text-sm text-slate-500">最高風險活動</p>
                <h4 className="text-lg font-semibold text-slate-800">
                  {dominantRisk.activity.icon} {dominantRisk.activity.name}
                </h4>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">風險指數</p>
                <p className="text-xl font-bold" style={{ color: dominantRisk.riskScore.color }}>
                  {dominantRisk.riskScore.score}
                </p>
                <p className="text-xs text-slate-500">
                  {riskCopy[dominantRisk.riskScore.level] ?? '請審慎評估'}
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {dominantRisk.recommendation}
            </p>
            {dominantRisk.bestTimeWindow && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-indigo-600">
                <span className="font-semibold">建議時段</span>
                <span>
                  {new Date(dominantRisk.bestTimeWindow.start).toLocaleTimeString('zh-TW', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  →{' '}
                  {new Date(dominantRisk.bestTimeWindow.end).toLocaleTimeString('zh-TW', {
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
                  {item.bestTimeText ? `最佳時段 ${item.bestTimeText}` : riskCopy[item.severity]}
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
