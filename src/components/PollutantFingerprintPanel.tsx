'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { AQIData } from '@/types';
import { ForecastResponse } from '@/types/forecast';

const POLLUTANT_CONFIG: Record<
  string,
  {
    label: string;
    color: string;
    max: number;
    units: string;
  }
> = {
  pm25: { label: 'PM2.5', color: '#14b8a6', max: 150, units: 'µg/m³' },
  pm10: { label: 'PM10', color: '#f59e0b', max: 200, units: 'µg/m³' },
  o3: { label: 'O₃', color: '#6366f1', max: 180, units: 'ppb' },
  no2: { label: 'NO₂', color: '#ec4899', max: 150, units: 'ppb' },
  so2: { label: 'SO₂', color: '#22c55e', max: 75, units: 'ppb' },
};

interface PollutantFingerprintPanelProps {
  currentData: AQIData | null;
  forecastData: ForecastResponse | null;
  loading?: boolean;
  error?: string | null;
  className?: string;
}

const polarToCartesian = (value: number, angle: number, radius: number) => {
  const angleRad = (angle - 90) * (Math.PI / 180);
  return {
    x: radius + radius * value * Math.cos(angleRad),
    y: radius + radius * value * Math.sin(angleRad),
  };
};

const normalizeValue = (code: string, value: number) => {
  const max = POLLUTANT_CONFIG[code]?.max ?? 150;
  return Math.min(value / max, 1);
};

const normalizePollutantCode = (code: string) => code.trim().toLowerCase();

const PollutantFingerprintPanel: React.FC<PollutantFingerprintPanelProps> = ({
  currentData,
  forecastData,
  loading = false,
  error,
  className,
}) => {
  const { t } = useTranslation();
  const [selectedIndex, setSelectedIndex] = useState(3);

  const sliderMax = useMemo(
    () => Math.max((forecastData?.hourlyForecasts?.length ?? 1) - 1, 0),
    [forecastData]
  );

  useEffect(() => {
    setSelectedIndex((prev) => {
      const clamped = Math.min(Math.max(prev, 0), sliderMax);
      return clamped;
    });
  }, [sliderMax]);

  const currentSamples = useMemo(() => {
    if (!currentData?.pollutants) return [];
    return currentData.pollutants
      .map((p) => {
        const code = normalizePollutantCode(p.code);
        if (!POLLUTANT_CONFIG[code]) return null;
        return {
          code,
          value: p.concentration.value,
          units: p.concentration.units,
        };
      })
      .filter((item): item is { code: string; value: number; units: string } => Boolean(item));
  }, [currentData]);

  const forecastSamples = useMemo(() => {
    if (!forecastData?.hourlyForecasts?.length) return [];

    const targetIndex = Math.min(
      Math.max(selectedIndex, 0),
      forecastData.hourlyForecasts.length - 1
    );

    const slot = forecastData.hourlyForecasts[targetIndex];
    const pollutants = slot.pollutants ?? [];

    return pollutants
      .map((p) => {
        const code = normalizePollutantCode(p.code);
        if (!POLLUTANT_CONFIG[code]) return null;
        return {
          code,
          value: p.concentration.value,
          units: p.concentration.units,
        };
      })
      .filter((item): item is { code: string; value: number; units: string } => Boolean(item));
  }, [forecastData, selectedIndex]);

  const mergedCodes = useMemo(() => {
    const set = new Set<string>();
    currentSamples.forEach((item) => set.add(item.code));
    forecastSamples.forEach((item) => set.add(item.code));
    return Array.from(set);
  }, [currentSamples, forecastSamples]);

  const radarPath = useMemo(() => {
    if (!mergedCodes.length) return '';

    const radius = 110;
    const angleStep = 360 / mergedCodes.length;

    const points = mergedCodes.map((code, index) => {
      const sample = currentSamples.find((item) => item.code === code);
      const normalized = normalizeValue(code, sample?.value ?? 0);
      const angle = angleStep * index;
      return polarToCartesian(normalized, angle, radius);
    });

    return points
      .map((point, index) =>
        `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`
      )
      .join(' ') + ' Z';
  }, [mergedCodes, currentSamples]);

  const forecastPath = useMemo(() => {
    if (!mergedCodes.length) return '';

    const radius = 110;
    const angleStep = 360 / mergedCodes.length;

    const points = mergedCodes.map((code, index) => {
      const sample = forecastSamples.find((item) => item.code === code);
      const normalized = normalizeValue(code, sample?.value ?? 0);
      const angle = angleStep * index;
      return polarToCartesian(normalized, angle, radius);
    });

    return points
      .map((point, index) =>
        `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`
      )
      .join(' ') + ' Z';
  }, [mergedCodes, forecastSamples]);

  const timeline = useMemo(() => {
    if (!forecastData?.hourlyForecasts) return [];
    return forecastData.hourlyForecasts.slice(0, 24).map((slot) => ({
      time: new Date(slot.dateTime),
      pollutants:
        slot.pollutants?.map((p) => ({
          code: normalizePollutantCode(p.code),
          concentration: p.concentration,
        })) ?? [],
      aqi: slot.indexes?.[0]?.aqi ?? 0,
    }));
  }, [forecastData]);

  const selectedForecast = useMemo(() => {
    if (!forecastData?.hourlyForecasts?.length) return null;
    const clampedIndex = Math.min(Math.max(selectedIndex, 0), sliderMax);
    return forecastData.hourlyForecasts[clampedIndex] ?? null;
  }, [forecastData, selectedIndex, sliderMax]);

  if (loading) {
    return (
      <div className={`bg-white rounded-3xl shadow-xl p-6 animate-pulse w-full max-w-4xl ${className ?? ''}`}>
        <div className="h-6 bg-gray-200 rounded w-48 mb-4" />
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-3xl shadow-xl p-6 text-red-500 ${className ?? ''}`}>
        ⚠️ {t('fingerprint.errorLoad', { error })}
      </div>
    );
  }

  if (!mergedCodes.length) {
    return (
      <div className={`bg-white rounded-3xl shadow-xl p-6 text-gray-500 ${className ?? ''}`}>
        {t('fingerprint.noPollutantData')}
      </div>
    );
  }

  return (
    <div className={`bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-6 w-full max-w-5xl ${className ?? ''}`}>
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-800">🧬 {t('fingerprint.title')}</h3>
          <p className="text-sm text-gray-500">
            {t('fingerprint.description')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-emerald-500/60" />
            {t('fingerprint.tab.now')}
          </span>
            <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-indigo-500/60" />
            {t('fingerprint.tab.forecast')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <div className="relative">
          <svg viewBox="0 0 220 220" className="w-full h-auto overflow-visible">
            {[1, 0.75, 0.5, 0.25].map((ratio) => (
              <circle
                key={ratio}
                cx={110}
                cy={110}
                r={110 * ratio}
                fill="none"
                stroke="#e5e7eb"
                strokeDasharray="4 6"
                strokeWidth={1}
              />
            ))}
            {mergedCodes.map((code, index) => {
              const angle = (360 / mergedCodes.length) * index;
              const end = polarToCartesian(1, angle, 100);
              return (
                <line
                  key={code}
                  x1={110}
                  y1={110}
                  x2={end.x + 10}
                  y2={end.y + 10}
                  stroke="#e5e7eb"
                  strokeWidth={1}
                />
              );
            })}

            <path d={radarPath} fill="rgba(16, 185, 129, 0.25)" stroke="#10b981" strokeWidth={2} />
            <path d={forecastPath} fill="rgba(99, 102, 241, 0.2)" stroke="#6366f1" strokeWidth={2} />

            {mergedCodes.map((code, index) => {
              const angle = (360 / mergedCodes.length) * index;
              const labelPos = polarToCartesian(1.1, angle, 100);
              const config = POLLUTANT_CONFIG[code];
              return (
                <text
                  key={code}
                  x={labelPos.x + 10}
                  y={labelPos.y + 10}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-xs fill-gray-600"
                >
                  {config?.label ?? code.toUpperCase()}
                </text>
              );
            })}
          </svg>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600 mb-2">
              <span>{t('fingerprint.comparePeriod')}</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-indigo-600">
                {selectedForecast?.dateTime
                  ? new Date(selectedForecast.dateTime).toLocaleString('zh-TW', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'N/A'}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={sliderMax}
              value={selectedIndex}
              onChange={(event) => setSelectedIndex(Number(event.target.value))}
              className="w-full accent-indigo-500"
            />
            <p className="text-xs text-slate-500 mt-2">
              {t('fingerprint.timeSliderHint')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mergedCodes.map((code) => {
              const config = POLLUTANT_CONFIG[code];
              const currentValue = currentSamples.find((item) => item.code === code)?.value;
              const forecastValue = forecastSamples.find((item) => item.code === code)?.value;

              const series = timeline.map((slot) => {
                const pollutant = slot.pollutants.find((p) => p.code === code);
                return {
                  time: slot.time,
                  value: pollutant?.concentration.value ?? 0,
                };
              });

              return (
                <div
                  key={code}
                  className="border border-slate-200 rounded-2xl p-4 bg-white/80 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{config?.label}</p>
                      <p className="text-xs text-slate-500">{t('fingerprint.peakLabel', { max: config?.max, units: config?.units })}</p>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <p>
                        {t('fingerprint.nowLabel')}：
                        <span className="font-semibold text-slate-700">
                          {currentValue?.toFixed(1) ?? '--'}
                        </span>
                      </p>
                      <p>
                        {t('fingerprint.forecastLabel')}：
                        <span className="font-semibold text-indigo-600">
                          {forecastValue?.toFixed(1) ?? '--'}
                        </span>
                      </p>
                    </div>
                  </div>

                  <Sparkline data={series} color={config?.color ?? '#0ea5e9'} t={t} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const Sparkline: React.FC<{
  data: Array<{ time: Date; value: number }>;
  color: string;
  t: (k: string, vars?: Record<string, unknown>) => string;
}> = ({ data, color, t }) => {
  if (!data.length) {
    return <div className="h-20 flex items-center justify-center text-xs text-slate-400">{t('fingerprint.noForecastData')}</div>;
  }

  const width = 220;
  const height = 90;
  const maxValue = Math.max(...data.map((item) => item.value), 1);
  const points = data.map((item, index) => {
    const x = (index / Math.max(data.length - 1, 1)) * (width - 20) + 10;
    const y = height - (item.value / maxValue) * (height - 20) - 10;
    return `${x},${y}`;
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-20">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={2}
        points={points.join(' ')}
        strokeLinecap="round"
      />
      {data.map((item, index) => {
        const x = (index / Math.max(data.length - 1, 1)) * (width - 20) + 10;
        const y = height - (item.value / maxValue) * (height - 20) - 10;
        return <circle key={`${item.time.getTime()}-${index}`} cx={x} cy={y} r={2} fill={color} />;
      })}
    </svg>
  );
};

export default PollutantFingerprintPanel;
