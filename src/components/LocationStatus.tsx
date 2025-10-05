'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n';
import { Location } from '@/types';

interface LocationStatusProps {
  location: Location;
}

const sourceIcons = {
  gps: '🛰️',
  ip: '🌐',
  default: '📍',
};

const sourceLabels = {
  gps: 'location.gps',
  ip: 'location.ip',
  default: 'location.default',
};

const sourceColors = {
  gps: 'bg-green-100 text-green-800 border-green-200',
  ip: 'bg-blue-100 text-blue-800 border-blue-200',
  default: 'bg-gray-100 text-gray-800 border-gray-200',
};

export default function LocationStatus({ location }: LocationStatusProps) {
  const { t } = useTranslation();
  const accuracyText = location.accuracy
    ? location.accuracy < 1000
      ? `${Math.round(location.accuracy)}m`
      : `${(location.accuracy / 1000).toFixed(1)}km`
    : t('location.unknown');

  return (
    <div
      className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg border ${
        sourceColors[location.source]
      } shadow-sm`}
    >
      <span className="text-lg">{sourceIcons[location.source]}</span>
      <div className="flex flex-col">
        <span className="text-xs font-semibold">
          {t(sourceLabels[location.source] ?? 'location.unknown')}
        </span>
        {location.accuracy && (
          <span className="text-xs opacity-75">{t('location.accuracy')}: {accuracyText}</span>
        )}
      </div>
    </div>
  );
}
