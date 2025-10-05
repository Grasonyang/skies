'use client';

import React, { useEffect } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import { CommuteGuardianRoute } from '@/types/commute';

interface CommuteRoutesLayerProps {
  routes: CommuteGuardianRoute[];
}

const DEFAULT_COLORS = ['#2563eb', '#f97316', '#10b981'];

function routeColor(route: CommuteGuardianRoute, fallback: string) {
  const average = route.aqiStats?.averageAqi;
  if (typeof average !== 'number') return fallback;

  if (average <= 80) return '#22c55e';
  if (average <= 120) return '#f59e0b';
  return '#ef4444';
}

export const CommuteRoutesLayer: React.FC<CommuteRoutesLayerProps> = ({ routes }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !routes.length) return;

    const polylines: google.maps.Polyline[] = [];

    routes.forEach((route, index) => {
      const polyline = new google.maps.Polyline({
        path: route.summary.overviewPath,
        strokeColor: routeColor(route, DEFAULT_COLORS[index % DEFAULT_COLORS.length]),
        strokeOpacity: 0.85,
        strokeWeight: index === 0 ? 6 : 4,
        map: map,
      });

      polylines.push(polyline);
    });

    // Cleanup function
    return () => {
      polylines.forEach((polyline) => {
        polyline.setMap(null);
      });
    };
  }, [map, routes]);

  return null;
};

export default CommuteRoutesLayer;
