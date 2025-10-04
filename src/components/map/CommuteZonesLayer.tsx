'use client';

import { useEffect } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { CommuteZone, zoneColor } from '@/hooks/useCommuteZones';

interface CommuteZonesLayerProps {
  zones: CommuteZone[];
}

const CommuteZonesLayer: React.FC<CommuteZonesLayerProps> = ({ zones }) => {
  const map = useMap();
  const mapsLibrary = useMapsLibrary('maps');

  useEffect(() => {
    if (!map || !mapsLibrary) return;

    const polygons = zones.map((zone) => {
      const polygon = new mapsLibrary.Polygon({
        paths: zone.points,
        fillColor: zoneColor(zone.level),
        fillOpacity: zone.level === 'safe' ? 0.18 : zone.level === 'caution' ? 0.22 : 0.26,
        strokeColor: zoneColor(zone.level),
        strokeOpacity: 0.35,
        strokeWeight: 1,
        zIndex: zone.level === 'dangerous' ? 120 : zone.level === 'caution' ? 110 : 100,
      });

      polygon.setMap(map);
      return polygon;
    });

    return () => {
      polygons.forEach((polygon) => polygon.setMap(null));
    };
  }, [map, mapsLibrary, zones]);

  return null;
};

export default CommuteZonesLayer;
