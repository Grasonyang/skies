'use client';

import React, { useState, useEffect } from 'react';
import {
  APIProvider,
  Map,
  MapCameraChangedEvent,
} from '@vis.gl/react-google-maps';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useAirQuality } from '@/hooks/useAirQuality';
import LoadingSpinner from '@/components/LoadingSpinner';
import LocationStatus from '@/components/LocationStatus';
import AirQualityPanel from '@/components/AirQualityPanel';
import HeatmapLayer from '@/components/map/HeatmapLayer';

const MapComponent = () => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const { location, loading, error, suggestedZoom } = useGeolocation();
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [zoom, setZoom] = useState(13);
  const [queryLocation, setQueryLocation] = useState<{ lat: number; lng: number } | null>(null);

  // 當位置載入完成後，更新地圖中心點和查詢位置
  useEffect(() => {
    if (location) {
      setMapCenter({ lat: location.lat, lng: location.lng });
      setZoom(suggestedZoom);
      setQueryLocation({ lat: location.lat, lng: location.lng });
    }
  }, [location, suggestedZoom]);

  // 獲取空氣品質數據
  const {
    data: aqiData,
    loading: aqiLoading,
    error: aqiError,
  } = useAirQuality({
    lat: queryLocation?.lat || 0,
    lng: queryLocation?.lng || 0,
    enabled: !!queryLocation,
  });

  // 檢查 API Key
  if (!apiKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-red-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-4">⚠️ 配置錯誤</h2>
          <p className="text-gray-700">
            Google Maps API key 未設定。請在環境變數中設定{' '}
            <code className="bg-gray-100 px-2 py-1 rounded text-sm">
              NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
            </code>
          </p>
        </div>
      </div>
    );
  }

  // 顯示載入動畫
  if (loading || !mapCenter) {
    return <LoadingSpinner message="正在獲取您的位置..." />;
  }

  return (
    <APIProvider apiKey={apiKey} onLoad={() => console.log('🗺️ Maps API 已載入')}>
      <div className="relative h-screen w-full">
        {/* 地圖 */}
        <Map
          defaultZoom={zoom}
          defaultCenter={mapCenter}
          gestureHandling="greedy"
          disableDefaultUI={false}
          // 只保留縮放和全螢幕控制
          zoomControl={true}
          mapTypeControl={false}
          scaleControl={false}
          streetViewControl={false}
          rotateControl={false}
          fullscreenControl={true}
          // 地圖樣式設定 - 簡化顯示
          styles={[
            {
              featureType: 'road.local',
              elementType: 'all',
              stylers: [{ visibility: 'off' }], // 隱藏小街道
            },
            {
              featureType: 'road.arterial',
              elementType: 'labels',
              stylers: [{ visibility: 'simplified' }], // 簡化主要道路標籤
            },
            {
              featureType: 'road.highway',
              elementType: 'labels',
              stylers: [{ visibility: 'on' }], // 保留高速公路
            },
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }], // 隱藏大部分地標
            },
            {
              featureType: 'poi.business',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }], // 隱藏商店標籤
            },
            {
              featureType: 'transit',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }], // 隱藏交通站點
            },
            {
              featureType: 'administrative.locality',
              elementType: 'labels',
              stylers: [{ visibility: 'on' }], // 保留城市名稱
            },
            {
              featureType: 'administrative.province',
              elementType: 'labels',
              stylers: [{ visibility: 'on' }], // 保留省份名稱
            },
          ]}
          onCameraChanged={(ev: MapCameraChangedEvent) => {
            console.log(
              '📍 地圖移動:',
              'center:',
              ev.detail.center,
              'zoom:',
              ev.detail.zoom
            );
          }}
        >
          {/* 熱力圖層 - 降低透明度 */}
          <HeatmapLayer opacity={0.45} />
        </Map>

        {/* 位置狀態顯示 */}
        {location && (
          <div className="absolute top-4 left-4 z-10">
            <LocationStatus location={location} />
          </div>
        )}

        {/* 空氣品質面板 */}
        <div className="absolute top-4 right-4 z-10">
          <AirQualityPanel
            data={aqiData}
            loading={aqiLoading}
            error={aqiError}
          />
        </div>

        {/* 熱力圖說明 */}
        {!aqiLoading && !aqiData && (
          <div className="absolute bottom-20 left-4 z-10">
            <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg text-sm text-gray-600">
              💡 熱力圖僅在有監測站的地區顯示
            </div>
          </div>
        )}

        {/* 錯誤提示 */}
        {error && (
          <div className="absolute top-20 left-4 right-4 md:left-4 md:right-auto md:max-w-md z-10">
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded-lg shadow-lg">
              <p className="text-sm">⚠️ {error}</p>
            </div>
          </div>
        )}

        {/* 底部資訊欄 */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-white/90 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg">
            <p className="text-sm text-gray-700">
              📊 空氣品質監測系統 v1.0
            </p>
          </div>
        </div>
      </div>
    </APIProvider>
  );
};

export default MapComponent;
