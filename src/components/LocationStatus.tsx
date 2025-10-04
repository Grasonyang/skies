'use client';

import React from 'react';
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
  gps: 'GPS 定位',
  ip: 'IP 定位',
  default: '預設位置',
};

const sourceColors = {
  gps: 'bg-green-100 text-green-800 border-green-200',
  ip: 'bg-blue-100 text-blue-800 border-blue-200',
  default: 'bg-gray-100 text-gray-800 border-gray-200',
};

export default function LocationStatus({ location }: LocationStatusProps) {
  const accuracyText = location.accuracy
    ? location.accuracy < 1000
      ? `${Math.round(location.accuracy)}m`
      : `${(location.accuracy / 1000).toFixed(1)}km`
    : '未知';

  return (
    <div
      className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg border ${
        sourceColors[location.source]
      } shadow-sm`}
    >
      <span className="text-lg">{sourceIcons[location.source]}</span>
      <div className="flex flex-col">
        <span className="text-xs font-semibold">
          {sourceLabels[location.source]}
        </span>
        {location.accuracy && (
          <span className="text-xs opacity-75">精度: {accuracyText}</span>
        )}
      </div>
    </div>
  );
}
