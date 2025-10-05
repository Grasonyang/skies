'use client';

import React from 'react';
import { CommuteGuardianRoute } from '@/types/commute';

interface ScenarioOption {
  id: string;
  label: string;
  description: string;
}

interface CommuteGuardianPanelProps {
  routes: CommuteGuardianRoute[];
  loading: boolean;
  error: string | null;
  originLabel: string;
  destinationLabel: string;
  onRefresh?: () => void;
  scenarios: ScenarioOption[];
  selectedScenarioId: string;
  onSelectScenario: (id: string) => void;
}

const severityConfig = [
  { max: 80, label: '安全', color: '#0ea5e9', cta: '立即出發' },
  { max: 120, label: '注意', color: '#f59e0b', cta: '戴口罩再出發' },
  { max: Infinity, label: '危險', color: '#ef4444', cta: '延後 30 分鐘' },
];

export const CommuteGuardianPanel: React.FC<CommuteGuardianPanelProps> = ({
  routes,
  loading,
  error,
  originLabel,
  destinationLabel,
  onRefresh,
  scenarios,
  selectedScenarioId,
  onSelectScenario,
}) => {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white/95 p-6 shadow-[0px_25px_60px_-35px_rgba(15,23,42,0.65)] backdrop-blur-xl">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">🚇 Commute Guardian</h2>
          <p className="text-sm text-slate-500">
            比較兩條通勤路線的距離、時間與空氣品質風險，給出即時行動建議。
          </p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            🔄 重新評估
          </button>
        )}
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
          出發：<span className="font-semibold text-slate-700">{originLabel}</span>
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
          目的：<span className="font-semibold text-slate-700">{destinationLabel}</span>
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {scenarios.map((scenario) => (
          <button
            key={scenario.id}
            onClick={() => onSelectScenario(scenario.id)}
            type="button"
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              selectedScenarioId === scenario.id
                ? 'bg-slate-900 text-white shadow-lg'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {scenario.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[1, 2].map((idx) => (
            <div
              key={idx}
              className="h-48 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm"
            >
              <div className="animate-pulse space-y-4">
                <div className="h-4 w-24 rounded bg-slate-200" />
                <div className="h-3 w-32 rounded bg-slate-100" />
                <div className="h-20 rounded-xl bg-slate-100" />
                <div className="h-10 rounded-full bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          ⚠️ {error}
        </div>
      ) : routes.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 p-6 text-sm text-slate-500">
          目前尚未取得路線資料，請重新整理或稍後再試。
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {routes.map((route, index) => {
            const stats = route.aqiStats;
            const severity = stats
              ? severityConfig.find((item) => (stats?.averageAqi ?? 0) <= item.max) ?? severityConfig[0]
              : severityConfig[0];

            const bestDominant = stats?.dominantPollutants?.[0]?.code ?? '---';

            return (
              <article
                key={route.summary.id}
                className="flex h-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">
                      {index === 0 ? '優先路線' : '備用路線'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {route.summary.distanceText} · {route.summary.durationText}
                    </p>
                    {route.summary.durationInTrafficText && (
                      <p className="text-xs text-slate-400">
                        含交通估計：{route.summary.durationInTrafficText}
                      </p>
                    )}
                  </div>
                  <span
                    className="rounded-full px-3 py-1 text-sm font-semibold"
                    style={{
                      backgroundColor: `${severity.color}13`,
                      color: severity.color,
                    }}
                  >
                    {stats ? `AQI ${stats.averageAqi}` : 'AQI 無資料'}
                  </span>
                </div>

                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  <p className="font-semibold" style={{ color: severity.color }}>
                    {severity.label} · 主污染 {bestDominant.toUpperCase()}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    最差採樣點 AQI {stats?.maxAqi ?? '--'}；主要污染物次數依序：
                    {stats?.dominantPollutants
                      ?.map((item) => `${item.code.toUpperCase()}×${item.count}`)
                      .join('、') || '—'}
                  </p>
                </div>

                <div className="mt-auto">
                  <button
                    type="button"
                    className="inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold text-white shadow-md transition-transform hover:scale-[1.01]"
                    style={{ backgroundColor: severity.color }}
                    onClick={() =>
                      console.info('[CommuteGuardian] CTA 觸發', {
                        routeId: route.summary.id,
                        severity: severity.label,
                      })
                    }
                  >
                    {severity.cta}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default CommuteGuardianPanel;
