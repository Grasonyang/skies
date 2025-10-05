'use client';

import React, { useEffect, useState } from 'react';
import { useMap, AdvancedMarker, Marker, Pin } from '@vis.gl/react-google-maps';
import { AQIData } from '@/types';
import { getAQILevel } from '@/lib/utils';

interface ClickQueryMarkerProps {
  onLocationClick: (location: { lat: number; lng: number }) => void;
  currentQuery: { lat: number; lng: number } | null;
  aqiData: AQIData | null;
}

/**
 * 地圖點擊查詢標記組件
 * 
 * 功能：
 * - 監聽地圖點擊事件
 * - 在點擊位置顯示標記
 * - 觸發空氣品質數據查詢
 */
const ClickQueryMarker: React.FC<ClickQueryMarkerProps> = ({
  onLocationClick,
  currentQuery,
  aqiData,
}) => {
  const map = useMap();
  const [clickedLocation, setClickedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  useEffect(() => {
    if (currentQuery) {
      setClickedLocation(currentQuery);
    } else {
      setClickedLocation(null);
    }
  }, [currentQuery]);

  useEffect(() => {
    if (!map) return;

    // 監聽地圖點擊事件
    const clickListener = map.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (event.latLng) {
        const location = {
          lat: event.latLng.lat(),
          lng: event.latLng.lng(),
        };
        
        console.log('🖱️ 地圖點擊:', location);
        setClickedLocation(location);
        onLocationClick(location);

        // 將地圖移至點擊位置並帶入適中縮放
        map.panTo(location);
        const currentZoom = map.getZoom() ?? 13;
        if (currentZoom < 13) {
          map.setZoom(13);
        }
      }
    });

    return () => {
      google.maps.event.removeListener(clickListener);
    };
  }, [map, onLocationClick]);

  // 如果沒有查詢位置，不顯示標記
  if (!currentQuery && !clickedLocation) {
    return null;
  }

  const markerLocation = currentQuery || clickedLocation;
  if (!markerLocation) return null;

  // 獲取 AQI 等級資訊
  const aqiLevel = aqiData ? getAQILevel(aqiData.aqi) : null;
  const pinColor = aqiLevel?.color || '#3b82f6';

  const supportsAdvancedMarker = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAP_ID);

  if (!supportsAdvancedMarker) {
    const icon = typeof window !== 'undefined' && (window as typeof window & { google?: typeof google }).google
      ? {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: pinColor,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        }
      : undefined;

    return (
      <Marker
        position={markerLocation}
        label={aqiData ? `${aqiData.aqi}` : undefined}
        title={aqiData ? `AQI ${aqiData.aqi}` : '模擬查詢位置'}
        icon={icon}
      />
    );
  }

  return (
    <AdvancedMarker position={markerLocation}>
      <Pin
        background={pinColor}
        borderColor="#ffffff"
        glyphColor="#ffffff"
        scale={1.2}
      >
        {aqiData && (
          <div className="flex flex-col items-center justify-center">
            <span className="text-xs font-bold">{aqiData.aqi}</span>
          </div>
        )}
      </Pin>
    </AdvancedMarker>
  );
};

export default ClickQueryMarker;
