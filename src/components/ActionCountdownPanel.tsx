import React, { useMemo } from 'react';
import { useActionCountdown } from '@/hooks/useActionCountdown';
import { useTranslation } from '@/lib/i18n';

interface ActionCountdownPanelProps {
  targetDate: Date | null;
  goal: number;
  initialCount?: number;
  simulate?: boolean;
  title?: string;
  description?: string;
  onShare?: () => void;
}

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
  };
}

export const ActionCountdownPanel: React.FC<ActionCountdownPanelProps> = ({
  targetDate,
  goal,
  initialCount = 120,
  simulate = true,
  title,
  description,
  onShare,
}) => {
  const { t, locale } = useTranslation();
  const { achieved, remainingMs, progress, isExpired } = useActionCountdown({
    targetDate,
    goal,
    initialCount,
    simulate,
  });

  const formatted = useMemo(() => formatDuration(remainingMs), [remainingMs]);
  const percent = Math.round(progress * 100);
  const numberLocale = locale === 'en' ? 'en-US' : locale ?? 'zh-TW';
  const resolvedTitle = title ?? t('countdown.title');
  const resolvedDescription = description ?? t('countdown.description');
  const goalLabel = t('countdown.goal', { count: goal.toLocaleString(numberLocale) });
  const achievedLabel = t('countdown.achieved', {
    count: Math.round(achieved).toLocaleString(numberLocale),
  });

  return (
    <div className="rounded-3xl border border-indigo-100 bg-white/95 shadow-xl backdrop-blur-md p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">{resolvedTitle}</h3>
          <p className="text-sm text-slate-500 max-w-lg">{resolvedDescription}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-indigo-600">
          <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 font-semibold">
            {goalLabel}
          </span>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 font-semibold">
            {achievedLabel}
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-lg">
            {isExpired ? (
              <span className="text-sm font-semibold">{t('countdown.expired')}</span>
            ) : (
              <>
                <span className="text-sm font-semibold">{t('countdown.remaining')}</span>
                <span className="font-mono text-lg">
                  {formatted.hours}:{formatted.minutes}:{formatted.seconds}
                </span>
              </>
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-500">{t('countdown.untilPeak')}</span>
            <span className="text-base font-semibold text-slate-800">
              {isExpired ? t('countdown.callToAction.expired') : t('countdown.callToAction.active')}
            </span>
          </div>
        </div>
        <div className="flex flex-1 items-center gap-3">
          <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-indigo-50">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-indigo-500 transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-indigo-600">{percent}%</span>
          {onShare && (
            <button
              type="button"
              onClick={onShare}
              className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700"
            >
              🔁 {t('countdown.share')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActionCountdownPanel;
