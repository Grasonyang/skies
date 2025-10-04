'use client';

import React, { useState, useEffect } from 'react';
import {
  APIProvider,
  Map,
  MapCameraChangedEvent,
} from '@vis.gl/react-google-maps';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useAirQuality } from '@/hooks/useAirQuality';
import { useAirQualityForecast } from '@/hooks/useAirQualityForecast';
import { useCommuteZones, zoneColor } from '@/hooks/useCommuteZones';
import LoadingSpinner from '@/components/LoadingSpinner';
import LocationStatus from '@/components/LocationStatus';
import AirQualityPanel from '@/components/AirQualityPanel';
import ForecastPanel from '@/components/ForecastPanel';
import HealthRecommendationPanel from '@/components/HealthRecommendationPanel';
import RiskMatrixPanel from '@/components/RiskMatrixPanel';
import HeatmapLayer from '@/components/map/HeatmapLayer';
import CommuteZonesLayer from '@/components/map/CommuteZonesLayer';
import PollutantFingerprintPanel from '@/components/PollutantFingerprintPanel';
import ActionHUDPanel from '@/components/ActionHUDPanel';
import FeedbackConsole from '@/components/FeedbackConsole';

const ZONE_ORDER: Record<'dangerous' | 'caution' | 'safe', number> = {
  dangerous: 0,
  caution: 1,
  safe: 2,
};

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

  // 獲取空氣品質預測數據（創新功能 #1）
  const {
    data: forecastData,
    loading: forecastLoading,
    error: forecastError,
  } = useAirQualityForecast({
    lat: queryLocation?.lat || 0,
    lng: queryLocation?.lng || 0,
    hours: 24,
    enabled: !!queryLocation,
  });

  // 創新功能面板的展開/收合狀態
  const [showForecast, setShowForecast] = useState(false);
  const [showHealthRec, setShowHealthRec] = useState(false);
  const [showFingerprint, setShowFingerprint] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showActionSuite, setShowActionSuite] = useState(false);
  const [actionSuiteTab, setActionSuiteTab] = useState<'hud' | 'matrix'>('hud');

  const commuteZones = useCommuteZones({ location, aqiData });

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
          {commuteZones.length > 0 && <CommuteZonesLayer zones={commuteZones} />}
        </Map>

        {/* 位置狀態顯示 */}
        <div className="absolute top-4 left-4 z-10 space-y-3">
          {location && <LocationStatus location={location} />}
          {commuteZones.length > 0 && (
            <div className="bg-white/90 backdrop-blur-md px-4 py-3 rounded-2xl shadow-lg text-xs text-slate-600 border border-slate-100 w-72">
              <p className="font-semibold text-slate-700 mb-1">🚇 通勤圈層級</p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                以目前定位為中心的 3 個圈層，越靠近內圈代表風險越高，顏色對應安全等級。
              </p>
              <ul className="mt-2 space-y-1.5">
                {commuteZones
                  .slice()
                  .sort((a, b) => ZONE_ORDER[a.level] - ZONE_ORDER[b.level])
                  .map((zone) => (
                    <li key={zone.id} className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span
                          className="w-3.5 h-3.5 rounded-full"
                          style={{ backgroundColor: `${zoneColor(zone.level)}BB` }}
                        ></span>
                        {zone.level === 'safe'
                          ? '安全'
                          : zone.level === 'caution'
                          ? '警示'
                          : '危險'}
                      </span>
                      <span className="font-semibold text-slate-700">AQI {Math.round(zone.averageAqi)}</span>
                    </li>
                  ))}
              </ul>
              <p className="text-[10px] text-slate-400 mt-2">
                每 10 分鐘更新，採樣目前站點推估並預留 TEMPO 快取。
              </p>
            </div>
          )}
        </div>

        {/* 空氣品質面板 */}
        <div className="absolute top-4 right-4 z-10">
          <AirQualityPanel
            data={aqiData}
            loading={aqiLoading}
            error={aqiError}
          />
        </div>

        {/* AI 預測面板（創新點 #1） */}
        {showForecast && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-30 flex items-center justify-center bg-black/45 backdrop-blur-sm px-4"
            onClick={() => setShowForecast(false)}
          >
            <div
              className="relative w-full max-w-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowForecast(false)}
                className="absolute -top-3 -right-3 rounded-full bg-white shadow-lg p-2 text-gray-500 hover:text-gray-800"
                aria-label="關閉 AI 預測"
              >
                ✕
              </button>
              <div className="max-h-[80vh] overflow-y-auto pr-1">
                <ForecastPanel
                  data={forecastData}
                  loading={forecastLoading}
                  error={forecastError}
                />
              </div>
            </div>
          </div>
        )}

        {/* 健康建議面板（創新點 #2） */}
        {showHealthRec && aqiData && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-30 flex items-center justify-center bg-black/45 backdrop-blur-sm px-4"
            onClick={() => setShowHealthRec(false)}
          >
            <div
              className="relative w-full max-w-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowHealthRec(false)}
                className="absolute -top-3 -right-3 rounded-full bg-white shadow-lg p-2 text-gray-500 hover:text-gray-800"
                aria-label="關閉健康建議"
              >
                ✕
              </button>
              <div className="max-h-[80vh] overflow-y-auto pr-1">
                <HealthRecommendationPanel aqiData={aqiData} />
              </div>
            </div>
          </div>
        )}

        {/* 風險矩陣面板（創新點 #3 - RISK-MATRIX-MVP） */}
        {/* 污染指紋面板 */}
        {showFingerprint && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
            onClick={() => setShowFingerprint(false)}
          >
            <div className="relative w-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
              <button
                onClick={() => setShowFingerprint(false)}
                className="absolute -top-3 -right-3 rounded-full bg-white shadow-lg p-2 text-gray-500 hover:text-gray-800"
                aria-label="關閉污染指紋"
              >
                ✕
              </button>
              <div className="max-h-[82vh] overflow-y-auto pr-1">
                <PollutantFingerprintPanel
                  currentData={aqiData}
                  forecastData={forecastData}
                  loading={forecastLoading}
                  error={forecastError}
                />
              </div>
            </div>
          </div>
        )}

        {/* 行動決策套件：整合行動 HUD 與活動決策 */}
        {showActionSuite && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-30 flex items-center justify-center bg-black/45 backdrop-blur-sm px-4"
            onClick={() => setShowActionSuite(false)}
          >
            <div
              className="relative w-full max-w-5xl"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                onClick={() => setShowActionSuite(false)}
                className="absolute -top-3 -right-3 rounded-full bg-white shadow-lg p-2 text-gray-500 hover:text-gray-800"
                aria-label="關閉行動決策介面"
              >
                ✕
              </button>
              <div className="flex max-h-[85vh] flex-col overflow-hidden rounded-3xl bg-white/95 shadow-2xl">
                <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">行動決策中心</p>
                    <p className="text-xs text-slate-500">
                      將行動 HUD 與活動決策整合成一致體驗，隨時切換視角。
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setActionSuiteTab('hud')}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                        actionSuiteTab === 'hud'
                          ? 'bg-indigo-500 text-white shadow-md'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      ⚡ 行動 HUD
                    </button>
                    <button
                      type="button"
                      onClick={() => setActionSuiteTab('matrix')}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                        actionSuiteTab === 'matrix'
                          ? 'bg-indigo-500 text-white shadow-md'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      🎯 活動決策
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                  {actionSuiteTab === 'hud' ? (
                    <ActionHUDPanel
                      aqiData={aqiData}
                      forecastData={forecastData}
                      loading={aqiLoading || forecastLoading}
                      onFeedback={() => setShowFeedback(true)}
                      className="mx-auto max-w-none border border-slate-100 bg-white shadow-none"
                    />
                  ) : (
                    <RiskMatrixPanel
                      aqiData={aqiData}
                      forecastData={forecastData}
                      loading={aqiLoading || forecastLoading}
                      className="mx-auto max-w-none border border-slate-100 bg-white shadow-none"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

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
        <div className="absolute bottom-4 left-1/2 z-10 w-full max-w-4xl -translate-x-1/2 px-4">
          <div className="mx-auto flex w-full flex-col gap-3 rounded-2xl bg-white/90 px-5 py-4 shadow-lg backdrop-blur-sm sm:max-w-none">
            <p className="text-sm font-medium text-gray-700">
              📊 空氣品質監測系統 v1.0
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:justify-end">
              <button
                onClick={() => setShowForecast(true)}
                className="h-11 min-w-[160px] rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-5 text-sm font-semibold text-white shadow-md transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-400"
                title="查看 AI 空氣品質預測"
              >
                🔮 AI 預測
              </button>
              <button
                onClick={() => aqiData && setShowFingerprint(true)}
                className={`h-11 min-w-[160px] rounded-full px-5 text-sm font-semibold text-white shadow-md transition-transform focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                  aqiData
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:scale-[1.02]'
                    : 'cursor-not-allowed bg-gray-300'
                }`}
                title="查看污染類型指紋"
                disabled={!aqiData}
              >
                🧬 污染指紋
              </button>
              <button
                onClick={() => {
                  if (!aqiData) return;
                  setShowActionSuite(true);
                }}
                className={`h-11 min-w-[160px] rounded-full px-5 text-sm font-semibold text-white shadow-md transition-transform focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                  aqiData
                    ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:scale-[1.02]'
                    : 'cursor-not-allowed bg-gray-300'
                }`}
                title="整合檢視行動 HUD 與活動決策"
                disabled={!aqiData}
              >
                🧭 行動決策中心
              </button>
              <button
                onClick={() => aqiData && setShowHealthRec(true)}
                className={`h-11 min-w-[160px] rounded-full px-5 text-sm font-semibold text-white shadow-md transition-transform focus:outline-none focus:ring-2 focus:ring-teal-400 ${
                  aqiData
                    ? 'bg-gradient-to-r from-green-500 to-teal-500 hover:scale-[1.02]'
                    : 'cursor-not-allowed bg-gray-300'
                }`}
                title="查看個人化健康建議"
                disabled={!aqiData}
              >
                💚 健康建議
              </button>
            </div>
          </div>
        </div>

        <FeedbackConsole isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
      </div>
    </APIProvider>
  );
};

export default MapComponent;
