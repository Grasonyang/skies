'use client';

import React, { useMemo, useState } from 'react';
import { AQIData } from '@/types';
import { useBatchAirQuality, useAirQuality } from '@/hooks/useAirQuality';
import { useAirQualityForecast } from '@/hooks/useAirQualityForecast';
import PollutantFingerprintPanel from '@/components/PollutantFingerprintPanel';
import ActionHUDPanel from '@/components/ActionHUDPanel';
import { getAQILevel, formatTimestamp } from '@/lib/utils';

interface ScenarioLocation {
  id: string;
  name: string;
  description: string;
  icon: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

interface MissionControlPanelProps {
  scenarios: ScenarioLocation[];
  className?: string;
  onFeedback?: () => void;
}

function buildScenarioKey(lat: number, lng: number) {
  return `${lat.toFixed(3)}:${lng.toFixed(3)}`;
}

function scenarioSummaryLabel(data: AQIData | null): string {
  if (!data) return '資料載入中';
  const level = getAQILevel(data.aqi);
  return `${level.label} · AQI ${data.aqi}`;
}

function scenarioSummaryColor(data: AQIData | null): string {
  if (!data) return '#94a3b8';
  return getAQILevel(data.aqi).color;
}

const MissionControlPanel: React.FC<MissionControlPanelProps> = ({
  scenarios,
  className,
  onFeedback,
}) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState(
    scenarios[0]?.id ?? ''
  );

  const locations = useMemo(
    () => scenarios.map((scenario) => scenario.coordinates),
    [scenarios]
  );

  const {
    data: batchData,
    loading: batchLoading,
    error: batchError,
  } = useBatchAirQuality(locations);

  const summaryMap = useMemo(() => {
    const map = new Map<string, AQIData>();
    batchData.forEach((item) => {
      const key = buildScenarioKey(item.location.lat, item.location.lng);
      map.set(key, item);
    });
    return map;
  }, [batchData]);

  const selectedScenario = useMemo(() => {
    return (
      scenarios.find((scenario) => scenario.id === selectedScenarioId) ||
      scenarios[0] ||
      null
    );
  }, [scenarios, selectedScenarioId]);

  const selectedCoordinates = selectedScenario?.coordinates;

  const {
    data: selectedCurrent,
    loading: currentLoading,
    error: currentError,
  } = useAirQuality({
    lat: selectedCoordinates?.lat ?? 0,
    lng: selectedCoordinates?.lng ?? 0,
    enabled: Boolean(selectedCoordinates),
  });

  const {
    data: selectedForecast,
    loading: forecastLoading,
    error: forecastError,
  } = useAirQualityForecast({
    lat: selectedCoordinates?.lat ?? 0,
    lng: selectedCoordinates?.lng ?? 0,
    hours: 24,
    enabled: Boolean(selectedCoordinates),
  });

  const combinedLoading = currentLoading || forecastLoading;
  const combinedError = currentError || forecastError;

  if (!scenarios.length) {
    return null;
  }

  return (
    <section
      className={`rounded-[28px] border border-slate-200 bg-white/95 p-6 shadow-[0px_25px_60px_-35px_rgba(15,23,42,0.65)] backdrop-blur-xl ${
        className ?? ''
      }`}
    >
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">🛰️ Mission Control</h2>
          <p className="text-sm text-slate-500">
            將三個重點場景的即時空氣品質、污染指紋與行動建議整合成單一儀表板。
          </p>
        </div>
        <div className="flex items-center gap-2">
          {batchLoading && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
              ⏳ 場景載入中
            </span>
          )}
          {batchError && (
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-600">
              ⚠️ {batchError}
            </span>
          )}
        </div>
      </header>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {scenarios.map((scenario) => {
          const key = buildScenarioKey(
            scenario.coordinates.lat,
            scenario.coordinates.lng
          );
          const summary = summaryMap.get(key) ?? null;
          const isSelected = scenario.id === selectedScenario?.id;
          const color = scenarioSummaryColor(summary);

          return (
            <button
              key={scenario.id}
              type="button"
              onClick={() => setSelectedScenarioId(scenario.id)}
              className={`flex h-full flex-col rounded-2xl border px-4 py-4 text-left transition-shadow ${
                isSelected
                  ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
                  : 'border-slate-200 bg-white text-slate-800 hover:shadow-md'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-2xl leading-none">{scenario.icon}</span>
                  <h3 className="mt-2 text-lg font-semibold">
                    {scenario.name}
                  </h3>
                  <p
                    className={`text-xs ${
                      isSelected ? 'text-slate-200/90' : 'text-slate-500'
                    }`}
                  >
                    {scenario.description}
                  </p>
                </div>
                <div
                  className="rounded-full border px-3 py-1 text-xs font-semibold"
                  style={{
                    borderColor: `${color}33`,
                    backgroundColor: `${color}1A`,
                    color: isSelected ? 'white' : color,
                  }}
                >
                  {scenarioSummaryLabel(summary)}
                </div>
              </div>
              <div className="mt-4 flex items-end gap-3">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black">
                    {summary ? summary.aqi : '--'}
                  </span>
                  <span className={`text-xs ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                    AQI
                  </span>
                </div>
                <div className={`text-xs ${isSelected ? 'text-slate-200' : 'text-slate-500'}`}>
                  優勢污染：
                  <span className="font-semibold">
                    {summary?.dominantPollutant?.toUpperCase() ?? '—'}
                  </span>
                </div>
              </div>
              <div className="mt-3 text-[10px] font-medium uppercase tracking-wide">
                {isSelected ? '目前展示中' : '點擊切換'}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              選定場景
            </p>
            <h3 className="mt-1 text-xl font-bold text-slate-800">
              {selectedScenario?.icon}{' '}
              {selectedScenario?.name}
            </h3>
            <p className="text-xs text-slate-500">
              {selectedScenario?.description}
            </p>
            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
              <p>
                📍 座標：
                <span className="ml-1 font-semibold text-slate-700">
                  {selectedScenario
                    ? `${selectedScenario.coordinates.lat.toFixed(4)}, ${selectedScenario.coordinates.lng.toFixed(4)}`
                    : '—'}
                </span>
              </p>
              <p className="mt-1">
                ⏱️ 更新時間：
                <span className="ml-1 font-semibold text-slate-700">
                  {selectedCurrent?.timestamp
                    ? formatTimestamp(selectedCurrent.timestamp)
                    : '—'}
                </span>
              </p>
            </div>
            {selectedForecast?.meta && (
              <div className="mt-3 rounded-xl bg-gradient-to-r from-indigo-500/90 to-purple-600/90 p-4 text-white shadow-md">
                <p className="text-xs uppercase tracking-wide opacity-80">預測摘要</p>
                <div className="mt-2 flex flex-col gap-1 text-sm">
                  <span>平均 AQI：{selectedForecast.meta.averageAqi}</span>
                  <span>
                    信心度：{selectedForecast.meta.confidenceScore}（
                    {selectedForecast.meta.confidenceLevel}）
                  </span>
                  <span>波動度：{selectedForecast.meta.volatility.toFixed(1)}%</span>
                </div>
                <p className="mt-2 text-xs opacity-80">
                  {selectedForecast.meta.confidenceDescription}
                </p>
              </div>
            )}
          </div>

          {combinedError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              ⚠️ {combinedError}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <PollutantFingerprintPanel
            currentData={selectedCurrent}
            forecastData={selectedForecast}
            loading={combinedLoading}
            error={combinedError}
            className="w-full"
          />
          <ActionHUDPanel
            aqiData={selectedCurrent}
            forecastData={selectedForecast}
            loading={combinedLoading}
            onFeedback={onFeedback}
            className="w-full"
          />
        </div>
      </div>
    </section>
  );
};

export default MissionControlPanel;
