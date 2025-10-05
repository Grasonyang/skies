'use client';

import React, { useMemo } from 'react';
import { useTranslation } from '@/lib/i18n';
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
  onStartCustomRoute?: () => void;
  isSelectingRoute?: boolean;
  onChooseOrigin?: () => void;
  onChooseDestination?: () => void;
}

const SEVERITY_LEVELS = [
  { max: 80, level: 'safe', color: '#0ea5e9' },
  { max: 120, level: 'caution', color: '#f59e0b' },
  { max: Infinity, level: 'danger', color: '#ef4444' },
] as const;

const CommuteGuardianPanel: React.FC<CommuteGuardianPanelProps> = ({
  routes,
  loading,
  error,
  originLabel,
  destinationLabel,
  onRefresh,
  scenarios,
  selectedScenarioId,
  onSelectScenario,
  onStartCustomRoute,
  isSelectingRoute,
  onChooseOrigin,
  onChooseDestination,
}) => {
  const { t, locale } = useTranslation();
  const numberLocale = locale === 'en' ? 'en-US' : locale ?? 'zh-TW';

  const texts = useMemo(
    () => ({
      title: t('commuteGuardian.title'),
      description: t('commuteGuardian.description'),
      refresh: t('commuteGuardian.refresh'),
      origin: t('commuteGuardian.origin'),
      destination: t('commuteGuardian.destination'),
      selectingRoute: t('commuteGuardian.selectingRoute'),
      customRoute: t('commuteGuardian.customRoute'),
      primaryRoute: t('commuteGuardian.primaryRoute'),
      alternativeRoute: t('commuteGuardian.alternativeRoute'),
      trafficEstimate: t('commuteGuardian.trafficEstimate'),
      primaryPollutant: t('commuteGuardian.primaryPollutant'),
      worstSample: t('commuteGuardian.worstSample'),
      pollutantFrequency: t('commuteGuardian.pollutantFrequency'),
      noData: t('commuteGuardian.noData'),
      noRouteData: t('commuteGuardian.noRouteData'),
      reselectOrigin: t('commuteGuardian.reselectOrigin'),
      reselectDestination: t('commuteGuardian.reselectDestination'),
    }),
    [t]
  );

  const severities = useMemo(
    () =>
      SEVERITY_LEVELS.map((entry) => ({
        ...entry,
        label: t(`map.zone.${entry.level}`),
        cta: t(`commuteGuardian.cta.${entry.level}`),
      })),
    [t]
  );

  const renderScenarioButtons = () => (
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
          title={scenario.description}
        >
          {scenario.label}
        </button>
      ))}
      {onStartCustomRoute && (
        <button
          onClick={onStartCustomRoute}
          type="button"
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors border ${
            isSelectingRoute
              ? 'border-indigo-400 bg-indigo-50 text-indigo-600'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          {isSelectingRoute ? texts.selectingRoute : texts.customRoute}
        </button>
      )}
    </div>
  );

  const renderRoutes = () => (
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      {routes.map((route, index) => {
        const stats = route.aqiStats;
        const severity = stats
          ? severities.find((item) => (stats.averageAqi ?? 0) <= item.max) ?? severities[0]
          : severities[0];

        const dominantPollutants = stats?.dominantPollutants ?? [];
        const dominantLabel = dominantPollutants
          .map((item) => `${item.code.toUpperCase()}×${item.count.toLocaleString(numberLocale)}`)
          .join(' · ');

        return (
          <article
            key={route.summary.id}
            className="flex h-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm"
          >
            <header className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  {index === 0 ? texts.primaryRoute : texts.alternativeRoute}
                </p>
                <h3 className="text-lg font-semibold text-slate-900">
                  {route.summary.distanceText} • {route.summary.durationText}
                </h3>
                <p className="text-xs text-slate-500">
                  {texts.trafficEstimate}
                  <span className="font-semibold text-slate-700">
                    {route.summary.durationInTrafficText ?? texts.noData}
                  </span>
                </p>
              </div>
              <div className="text-right text-sm">
                <p className="text-xs text-slate-400">AQI</p>
                <p className="text-2xl font-bold" style={{ color: severity.color }}>
                  {stats?.averageAqi?.toFixed(0) ?? '--'}
                </p>
                <p className="text-xs text-slate-400">{severity.label}</p>
              </div>
            </header>

            <section className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-semibold" style={{ color: severity.color }}>
                {texts.primaryPollutant} · {dominantPollutants[0]?.code.toUpperCase() ?? '--'}
              </p>
              <div className="mt-2 space-y-1 text-xs text-slate-500">
                <p>
                  {texts.worstSample}
                  {' '}
                  <span className="font-semibold text-slate-700">
                    {stats?.worstLocation?.address ?? texts.noData}
                  </span>
                </p>
                <p>
                  {texts.pollutantFrequency}
                  {dominantLabel || texts.noData}
                </p>
              </div>
            </section>

            <footer className="mt-auto flex items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                <p className="font-semibold text-slate-700">
                  {t('commuteGuardian.averageAqi', {
                    average: stats?.averageAqi?.toFixed(0) ?? '--',
                  })}
                  {' '}
                  •
                  {' '}
                  {t('commuteGuardian.peakAqi', {
                    peak: stats?.peakAqi?.toFixed(0) ?? '--',
                  })}
                </p>
                <p>{route.summary.durationInTrafficText ?? ''}</p>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform focus:outline-none focus:ring-2 focus:ring-offset-1"
                style={{ backgroundColor: severity.color }}
                onClick={() => {
                  route.onSelect?.();
                  console.info('[CommuteGuardian] CTA trigger', {
                    routeId: route.summary.id,
                    severity: severity.level,
                    averageAqi: stats?.averageAqi,
                  });
                }}
                disabled={!route.onSelect}
              >
                <span>{severity.cta}</span>
                <span className="text-xs opacity-80">→</span>
              </button>
            </footer>
          </article>
        );
      })}
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return (
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
      );
    }

    if (error) {
      return (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          ⚠️ {error}
        </div>
      );
    }

    if (routes.length === 0) {
      return (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white/80 p-6 text-sm text-slate-500">
          {texts.noRouteData}
        </div>
      );
    }

    return renderRoutes();
  };

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white/95 p-6 shadow-[0px_25px_60px_-35px_rgba(15,23,42,0.65)] backdrop-blur-xl">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{texts.title}</h2>
          <p className="text-sm text-slate-500">{texts.description}</p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            {texts.refresh}
          </button>
        )}
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
        {onChooseOrigin ? (
          <button
            type="button"
            onClick={onChooseOrigin}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            title={texts.reselectOrigin}
          >
            {texts.origin}
            <span>{originLabel}</span>
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
            {texts.origin}
            <span className="font-semibold text-slate-700">{originLabel}</span>
          </span>
        )}
        {onChooseDestination ? (
          <button
            type="button"
            onClick={onChooseDestination}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            title={texts.reselectDestination}
          >
            {texts.destination}
            <span>{destinationLabel}</span>
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
            {texts.destination}
            <span className="font-semibold text-slate-700">{destinationLabel}</span>
          </span>
        )}
      </div>

      {renderScenarioButtons()}
      {renderContent()}
    </section>
  );
};

export default CommuteGuardianPanel;
