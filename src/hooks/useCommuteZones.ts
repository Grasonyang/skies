import { useEffect, useMemo, useState } from 'react';
import { AQIData, Location } from '@/types';

type ZoneLevel = 'safe' | 'caution' | 'dangerous';

export interface CommuteZone {
  id: string;
  level: ZoneLevel;
  averageAqi: number;
  points: Array<{ lat: number; lng: number }>;
}

interface UseCommuteZonesOptions {
  location: Location | null;
  aqiData: AQIData | null;
}

const LEVEL_CONFIG: Record<ZoneLevel, { radiusKm: number; color: string }> = {
  safe: { radiusKm: 1.2, color: '#22c55e' },
  caution: { radiusKm: 3, color: '#f97316' },
  dangerous: { radiusKm: 6, color: '#ef4444' },
};

const EARTH_RADIUS_KM = 6371;

export const useCommuteZones = ({ location, aqiData }: UseCommuteZonesOptions) => {
  const [timestamp, setTimestamp] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setTimestamp(Date.now()), 10 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  return useMemo(() => {
    if (!location || !aqiData) return [] as CommuteZone[];

    const baseAqi = aqiData.indexes?.[0]?.aqi || aqiData.aqi || 80;

    const normalize = (level: ZoneLevel) => {
      const multiplier =
        level === 'safe' ? 0.85 : level === 'caution' ? 1.05 : 1.25;
      return Math.min(300, baseAqi * multiplier);
    };

    const createPolygon = (radiusKm: number) => {
      const points: Array<{ lat: number; lng: number }> = [];
      const latRad = (location.lat * Math.PI) / 180;
      const lngRad = (location.lng * Math.PI) / 180;
      const angularDistance = radiusKm / EARTH_RADIUS_KM;

      for (let angle = 0; angle <= 360; angle += 15) {
        const bearing = (angle * Math.PI) / 180;

        const lat = Math.asin(
          Math.sin(latRad) * Math.cos(angularDistance) +
            Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearing)
        );
        const lng =
          lngRad +
          Math.atan2(
            Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latRad),
            Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(lat)
          );

        points.push({
          lat: (lat * 180) / Math.PI,
          lng: ((lng * 180) / Math.PI + 540) % 360 - 180,
        });
      }

      return points;
    };

    return (['safe', 'caution', 'dangerous'] as ZoneLevel[]).map((level) => ({
      id: `zone-${level}-${timestamp}`,
      level,
      averageAqi: normalize(level),
      points: createPolygon(LEVEL_CONFIG[level].radiusKm),
    }));
  }, [location, aqiData, timestamp]);
};

export const zoneColor = (level: ZoneLevel) => LEVEL_CONFIG[level].color;
