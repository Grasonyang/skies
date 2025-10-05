'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  APIProvider,
  Map,
  MapCameraChangedEvent,
} from '@vis.gl/react-google-maps';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useMapData } from '@/hooks/useMapData';
import { CommuteZone, zoneColor } from '@/hooks/useCommuteZones';
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
import DialogFrame from '@/components/DialogFrame';
import MissionControlPanel from '@/components/MissionControlPanel';
import CommuteGuardianPanel from '@/components/CommuteGuardianPanel';
import CommuteRoutesLayer from '@/components/map/CommuteRoutesLayer';
import { ScenarioStudioPanel } from '@/components/ScenarioStudioPanel';
import { DEFAULT_LOCATION } from '@/lib/constants';
import { useScenarioStudio } from '@/hooks/useScenarioStudio';
import ClickQueryMarker from '@/components/map/ClickQueryMarker';
import ActionCountdownPanel from '@/components/ActionCountdownPanel';
import { useSocialShare } from '@/hooks/useSocialShare';
import BriefingPanel from '@/components/BriefingPanel';

const ZONE_ORDER: Record<'dangerous' | 'caution' | 'safe', number> = {
  dangerous: 0,
  caution: 1,
  safe: 2,
};

type FeatureLanguage = 'zh' | 'en';

type FeatureAction =
  | 'missionControl'
  | 'commuteGuardian'
  | 'scenarioStudio'
  | 'forecast'
  | 'fingerprint'
  | 'actionSuite'
  | 'healthRecommendation'
  | 'mediaBriefing';

interface FeatureConfig {
  id: string;
  action: FeatureAction;
  icon: string;
  gradient: string;
  focusRing: string;
  labels: Record<FeatureLanguage, string>;
  descriptions: Record<FeatureLanguage, string>;
  requiresAqi?: boolean;
}

const FEATURE_CONFIGS: FeatureConfig[] = [
  {
    id: 'mission-control',
    action: 'missionControl',
    icon: '🛰️',
    gradient: 'from-slate-800 via-slate-700 to-slate-600',
    focusRing: 'focus:ring-2 focus:ring-slate-400',
    labels: {
      zh: '任務主控台',
      en: 'Mission Control',
    },
    descriptions: {
      zh: '開啟 Mission Control 主控台',
      en: 'Open the Mission Control dashboard',
    },
  },
  {
    id: 'commute-guardian',
    action: 'commuteGuardian',
    icon: '🚇',
    gradient: 'from-emerald-500 to-teal-500',
    focusRing: 'focus:ring-2 focus:ring-emerald-400',
    labels: {
      zh: '通勤守護',
      en: 'Commute Guardian',
    },
    descriptions: {
      zh: '查看通勤風險建議',
      en: 'View commute risk guidance',
    },
  },
  {
    id: 'scenario-studio',
    action: 'scenarioStudio',
    icon: '🎯',
    gradient: 'from-violet-500 via-purple-500 to-fuchsia-500',
    focusRing: 'focus:ring-2 focus:ring-violet-400',
    labels: {
      zh: '情境工作室',
      en: 'Scenario Studio',
    },
    descriptions: {
      zh: '生成 24 小時活動劇本',
      en: 'Generate 24-hour activity scenarios',
    },
  },
  {
    id: 'ai-forecast',
    action: 'forecast',
    icon: '🔮',
    gradient: 'from-blue-500 to-purple-500',
    focusRing: 'focus:ring-2 focus:ring-blue-400',
    labels: {
      zh: 'AI 短期預測',
      en: 'AI Forecast',
    },
    descriptions: {
      zh: '查看 AI 空氣品質預測',
      en: 'See AI-powered air quality forecasts',
    },
  },
  {
    id: 'pollutant-fingerprint',
    action: 'fingerprint',
    icon: '🧬',
    gradient: 'from-amber-500 to-orange-500',
    focusRing: 'focus:ring-2 focus:ring-amber-400',
    labels: {
      zh: '污染指紋',
      en: 'Pollutant Fingerprint',
    },
    descriptions: {
      zh: '查看污染類型指紋',
      en: 'Explore pollutant fingerprint insights',
    },
    requiresAqi: true,
  },
  {
    id: 'action-suite',
    action: 'actionSuite',
    icon: '🧭',
    gradient: 'from-indigo-500 via-purple-500 to-pink-500',
    focusRing: 'focus:ring-2 focus:ring-indigo-400',
    labels: {
      zh: '行動決策中心',
      en: 'Action Decision Center',
    },
    descriptions: {
      zh: '整合檢視行動 HUD 與活動決策',
      en: 'View Action HUD and risk decisions together',
    },
    requiresAqi: true,
  },
  {
    id: 'health-recommendation',
    action: 'healthRecommendation',
    icon: '💚',
    gradient: 'from-green-500 to-teal-500',
    focusRing: 'focus:ring-2 focus:ring-teal-400',
    labels: {
      zh: '健康建議',
      en: 'Health Advice',
    },
    descriptions: {
      zh: '查看個人化健康建議',
      en: 'View personalized health recommendations',
    },
    requiresAqi: true,
  },
  {
    id: 'media-briefing',
    action: 'mediaBriefing',
    icon: '🗞️',
    gradient: 'from-rose-500 to-orange-400',
    focusRing: 'focus:ring-2 focus:ring-rose-400',
    labels: {
      zh: 'AI 媒體中心',
      en: 'AI Media Briefing',
    },
    descriptions: {
      zh: '生成多級別受眾摘要，快速分享決策重點',
      en: 'Generate multi-level briefings for different audiences',
    },
    requiresAqi: true,
  },
];

const MapComponent = () => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID;
  const { location, loading, error, suggestedZoom } = useGeolocation();
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [zoom, setZoom] = useState(13);
  const [queryLocation, setQueryLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showMissionControl, setShowMissionControl] = useState(false);

  // 當位置載入完成後，更新地圖中心點和查詢位置
  useEffect(() => {
    if (location) {
      setMapCenter({ lat: location.lat, lng: location.lng });
      setZoom(suggestedZoom);
      setQueryLocation({ lat: location.lat, lng: location.lng });
    }
  }, [location, suggestedZoom]);

  // 創新功能面板的展開/收合狀態
  const [showForecast, setShowForecast] = useState(false);
  const [showHealthRec, setShowHealthRec] = useState(false);
  const [showFingerprint, setShowFingerprint] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showActionSuite, setShowActionSuite] = useState(false);
  const [actionSuiteTab, setActionSuiteTab] = useState<'hud' | 'matrix'>('hud');
  const [showCommuteGuardian, setShowCommuteGuardian] = useState(false);
  const [showScenarioStudio, setShowScenarioStudio] = useState(false);
  const [showBriefing, setShowBriefing] = useState(false);
  const [featureLanguage, setFeatureLanguage] = useState<FeatureLanguage>('zh');

  const commuteScenarios = useMemo(() => ([
    {
      id: 'office',
      label: '上班族 · 內湖 → 信義',
      description: '內湖科技園區到台北 101',
      destination: { lat: 25.033968, lng: 121.564468 },
    },
    {
      id: 'parent',
      label: '親子 · 中山 → 科教館',
      description: '中山國小到國立臺灣科學教育館',
      destination: { lat: 25.095713, lng: 121.526299 },
    },
    {
      id: 'runner',
      label: '夜跑 · 三重 → 河濱',
      description: '三重國民運動中心到大佳河濱公園',
      destination: { lat: 25.071422, lng: 121.533484 },
    },
  ]), []);

  const [commuteScenarioId, setCommuteScenarioId] = useState(
    commuteScenarios[0]?.id ?? 'office'
  );

  const selectedCommuteScenario = useMemo(
    () =>
      commuteScenarios.find((scenario) => scenario.id === commuteScenarioId) ||
      commuteScenarios[0] ||
      null,
    [commuteScenarios, commuteScenarioId]
  );

  const {
    aqiData,
    aqiLoading,
    aqiError,
    forecastData,
    forecastLoading,
    forecastError,
    commuteZones,
    commuteRoutes,
    commuteLoading,
    commuteError,
    refetchCommute,
    peakEvent,
    briefingContext,
  } = useMapData({
    queryLocation,
    userLocation: location,
    commuteDestination: selectedCommuteScenario?.destination ?? null,
    commuteEnabled: Boolean(selectedCommuteScenario),
  });

  const commuteOriginLabel = location ? '目前位置' : '預設台北市';
  const commuteDestinationLabel = selectedCommuteScenario?.description ?? '---';

  const shareToSocial = useSocialShare();

  const appShareUrl = useMemo(() => {
    if (process.env.NEXT_PUBLIC_APP_SHARE_URL) {
      return process.env.NEXT_PUBLIC_APP_SHARE_URL;
    }
    if (typeof window !== 'undefined') {
      return window.location.href;
    }
    return 'https://skies.app';
  }, []);

  const countdownTarget = useMemo(() => {
    if (!peakEvent?.dateTime) return null;
    return new Date(peakEvent.dateTime);
  }, [peakEvent]);

  const actionGoal = useMemo(() => {
    const parsed = Number(process.env.NEXT_PUBLIC_ACTION_GOAL ?? 1000);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1000;
  }, []);

  const initialParticipants = useMemo(() => {
    const parsed = Number(process.env.NEXT_PUBLIC_ACTION_INITIAL ?? 120);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 120;
  }, []);

  const simulateCountdown = useMemo(() => {
    const flag = process.env.NEXT_PUBLIC_ACTION_SIMULATE;
    return flag !== 'false';
  }, []);

  const peakWindowText = useMemo(() => {
    if (!peakEvent?.dateTime) return undefined;
    const date = new Date(peakEvent.dateTime);
    return date.toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [peakEvent]);

  const handleStartDiscussion = useCallback(() => {
    if (!aqiData) return;
    shareToSocial({
      cityName: briefingContext.cityName,
      appUrl: appShareUrl,
      mayorHandle: briefingContext.mayorHandle,
      pollutant: aqiData.dominantPollutant,
      peakWindow: peakWindowText,
      platform: 'twitter',
    });
  }, [aqiData, shareToSocial, briefingContext, appShareUrl, peakWindowText]);

  const countdownDescription = useMemo(() => {
    if (!peakWindowText) {
      return '分享行動建議，讓更多人參與。';
    }
    return `目標：在 ${peakWindowText} 前讓更多人看到行動建議。`;
  }, [peakWindowText]);

  // Scenario Studio hook
  const {
    scenarios,
    loading: scenarioLoading,
    error: scenarioError,
    generateScenario,
    clearScenarios,
  } = useScenarioStudio();

  const missionControlScenarios = useMemo(() => {
    const primary = location
      ? { lat: location.lat, lng: location.lng }
      : { lat: DEFAULT_LOCATION.lat, lng: DEFAULT_LOCATION.lng };

    return [
      {
        id: 'commute',
        name: '上班族 · 即時通勤',
        description: location
          ? '根據目前定位估算通勤風險'
          : '信義金融區（預設地標）',
        icon: '💼',
        coordinates: {
          lat: primary.lat,
          lng: primary.lng,
        },
      },
      {
        id: 'family',
        name: '親子 · 公園午後',
        description: '大安森林公園中央草坪',
        icon: '👨‍👩‍👧',
        coordinates: {
          lat: 25.033964,
          lng: 121.543987,
        },
      },
      {
        id: 'runner',
        name: '運動 · 夜跑河濱',
        description: '大直美堤河濱運動區',
        icon: '🏃‍♂️',
        coordinates: {
          lat: 25.082552,
          lng: 121.557897,
        },
      },
    ];
  }, [location]);

  const uniqueFeatureConfigs = useMemo(() => {
    const seen = new Set<string>();
    return FEATURE_CONFIGS.filter((config) => {
      if (seen.has(config.id)) {
        return false;
      }
      seen.add(config.id);
      return true;
    });
  }, []);

  const featureHandlers: Record<FeatureAction, () => void> = {
    missionControl: () => setShowMissionControl(true),
    commuteGuardian: () => setShowCommuteGuardian(true),
    scenarioStudio: () => setShowScenarioStudio(true),
    forecast: () => setShowForecast(true),
    fingerprint: () => setShowFingerprint(true),
    actionSuite: () => setShowActionSuite(true),
    healthRecommendation: () => setShowHealthRec(true),
    mediaBriefing: () => setShowBriefing(true),
  };

  const featureHeading = featureLanguage === 'zh'
    ? `📊 ${briefingContext.cityName} 空氣任務中心`
    : `📊 ${briefingContext.cityName} Air Quality Mission Suite`;

  const handleLocationSelect = useCallback((selected: { lat: number; lng: number }) => {
    setMapCenter(selected);
    setQueryLocation(selected);
  }, []);

  // 檢查 API Key
  if (!apiKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-red-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-4">⚠️ 配置錯誤</h2>
          <p className="text-gray-700">
            Google Maps API key 未設定。請在環境變數中設定{' '}
            <code className="bg-gray-100 px-2 py-1 rounded text-sm">
              GOOGLE_MAPS_API_KEY
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
          {...(mapId ? { mapId } : {})}
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
          <ClickQueryMarker
            onLocationClick={handleLocationSelect}
            currentQuery={queryLocation}
            aqiData={aqiData ?? null}
          />
          {/* 熱力圖層 - 降低透明度 */}
          <HeatmapLayer opacity={0.45} />
          {commuteZones.length > 0 && <CommuteZonesLayer zones={commuteZones} />}
          {commuteRoutes.length > 0 && <CommuteRoutesLayer routes={commuteRoutes} />}
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
                  .sort((a: CommuteZone, b: CommuteZone) => ZONE_ORDER[a.level] - ZONE_ORDER[b.level])
                  .map((zone: CommuteZone) => (
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

        <DialogFrame
          isOpen={showMissionControl}
          onClose={() => setShowMissionControl(false)}
          maxWidthClassName="max-w-6xl"
          panelClassName="rounded-[32px] bg-white/97 backdrop-blur-2xl border border-white/60 shadow-[0_45px_90px_-40px_rgba(15,23,42,0.65)] p-6"
        >
          <div className="max-h-[80vh] overflow-y-auto pr-1 custom-scrollbar">
            <MissionControlPanel
              scenarios={missionControlScenarios}
              className="w-full"
              onFeedback={() => setShowFeedback(true)}
            />
          </div>
        </DialogFrame>

        <DialogFrame
          isOpen={showCommuteGuardian}
          onClose={() => setShowCommuteGuardian(false)}
          maxWidthClassName="max-w-5xl"
          panelClassName="rounded-[28px] bg-white/97 backdrop-blur-2xl border border-white/60 shadow-[0_45px_90px_-40px_rgba(15,23,42,0.65)] p-6"
        >
          <div className="max-h-[80vh] overflow-y-auto pr-1 custom-scrollbar">
            <CommuteGuardianPanel
              routes={commuteRoutes}
              loading={commuteLoading}
              error={commuteError}
              originLabel={commuteOriginLabel}
              destinationLabel={commuteDestinationLabel}
              onRefresh={refetchCommute}
              scenarios={commuteScenarios.map((scenario) => ({
                id: scenario.id,
                label: scenario.label,
                description: scenario.description,
              }))}
              selectedScenarioId={commuteScenarioId}
              onSelectScenario={(id) => {
                setCommuteScenarioId(id);
              }}
            />
          </div>
        </DialogFrame>

        {/* Scenario Studio 面板（F3 新功能） */}
        <DialogFrame
          isOpen={showScenarioStudio}
          onClose={() => setShowScenarioStudio(false)}
          maxWidthClassName="max-w-6xl"
          panelClassName="rounded-[28px] bg-white/97 backdrop-blur-2xl border border-white/60 shadow-[0_45px_90px_-40px_rgba(15,23,42,0.65)] p-6"
        >
          <div className="max-h-[85vh] overflow-y-auto pr-1 custom-scrollbar">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                🎯 Scenario Studio
              </h2>
              <p className="text-sm text-gray-600">
                生成 24 小時活動劇本，結合場域與 AQI 預測，搭配 AI 智能建議
              </p>
            </div>
            <ScenarioStudioPanel
              scenarios={scenarios}
              loading={scenarioLoading}
              error={scenarioError}
              onGenerateScenario={(activity, location) => {
                // 根據活動類型選擇場域類型
                const activityTypeMap: Record<string, string[]> = {
                  '戶外跑步': ['park', 'stadium'],
                  '親子公園': ['park', 'playground'],
                  '室內健身': ['gym', 'sports_complex'],
                };
                const types = activityTypeMap[activity] || ['park'];
                generateScenario(activity, location, types);
              }}
              onClear={clearScenarios}
            />
          </div>
        </DialogFrame>

        {/* AI 預測面板（創新點 #1） */}
        <DialogFrame
          isOpen={showForecast}
          onClose={() => setShowForecast(false)}
          maxWidthClassName="max-w-3xl"
          panelClassName="rounded-3xl bg-white/96 backdrop-blur-xl border border-white/60 shadow-[0_32px_60px_-20px_rgba(15,23,42,0.45)] p-6"
        >
          <div className="max-h-[72vh] overflow-y-auto pr-1 custom-scrollbar">
            <ForecastPanel
              data={forecastData}
              loading={forecastLoading}
              error={forecastError}
              className="w-full"
            />
          </div>
        </DialogFrame>

        {/* 健康建議面板（創新點 #2） */}
        <DialogFrame
          isOpen={showHealthRec && !!aqiData}
          onClose={() => setShowHealthRec(false)}
          maxWidthClassName="max-w-xl"
          panelClassName="rounded-3xl bg-white/96 backdrop-blur-xl border border-white/60 shadow-[0_32px_60px_-20px_rgba(15,23,42,0.45)] p-6"
        >
          {aqiData && (
            <div className="max-h-[72vh] overflow-y-auto pr-1 custom-scrollbar">
              <HealthRecommendationPanel aqiData={aqiData} className="w-full custom-scrollbar pr-1" />
            </div>
          )}
        </DialogFrame>

        {/* 污染指紋面板 */}
        <DialogFrame
          isOpen={showFingerprint}
          onClose={() => setShowFingerprint(false)}
          maxWidthClassName="max-w-5xl"
          panelClassName="rounded-3xl bg-white/96 backdrop-blur-xl border border-white/60 shadow-[0_40px_70px_-25px_rgba(15,23,42,0.55)] p-6"
        >
          <div className="max-h-[78vh] overflow-y-auto pr-1 custom-scrollbar">
            <PollutantFingerprintPanel
              currentData={aqiData}
              forecastData={forecastData}
              loading={forecastLoading}
              error={forecastError}
              className="w-full"
            />
          </div>
        </DialogFrame>

        <DialogFrame
          isOpen={showBriefing && !!aqiData}
          onClose={() => setShowBriefing(false)}
          maxWidthClassName="max-w-5xl"
          panelClassName="rounded-3xl bg-white/97 backdrop-blur-2xl border border-white/60 shadow-[0_40px_70px_-25px_rgba(15,23,42,0.55)] p-6"
        >
          <div className="max-h-[78vh] overflow-y-auto pr-1 custom-scrollbar">
            <BriefingPanel
              open={showBriefing}
              cityName={briefingContext.cityName}
              aqiData={aqiData}
              forecastData={forecastData}
              commuteRoutes={commuteRoutes}
            />
          </div>
        </DialogFrame>

        {/* 行動決策套件：整合行動 HUD 與活動決策 */}
        <DialogFrame
          isOpen={showActionSuite}
          onClose={() => setShowActionSuite(false)}
          maxWidthClassName="max-w-5xl"
          panelClassName="rounded-3xl bg-white/96 backdrop-blur-xl border border-white/60 shadow-[0_40px_70px_-25px_rgba(15,23,42,0.55)] p-4"
        >
          <div className="flex max-h-[80vh] flex-col overflow-hidden rounded-[24px] border border-slate-100 bg-white/95 shadow-inner">
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
            <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 custom-scrollbar">
              {actionSuiteTab === 'hud' ? (
                <ActionHUDPanel
                  aqiData={aqiData}
                  forecastData={forecastData}
                  loading={aqiLoading || forecastLoading}
                  onFeedback={() => setShowFeedback(true)}
                  onStartDiscussion={aqiData ? handleStartDiscussion : undefined}
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
        </DialogFrame>

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
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-gray-700">{featureHeading}</p>
              <div className="inline-flex items-center rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-500 shadow-sm">
                <button
                  type="button"
                  onClick={() => setFeatureLanguage('zh')}
                  className={`px-3 py-1 transition-colors ${
                    featureLanguage === 'zh'
                      ? 'rounded-full bg-slate-900 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  中文
                </button>
                <button
                  type="button"
                  onClick={() => setFeatureLanguage('en')}
                  className={`px-3 py-1 transition-colors ${
                    featureLanguage === 'en'
                      ? 'rounded-full bg-slate-900 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  EN
                </button>
              </div>
            </div>
            {actionGoal > 0 && (
              <ActionCountdownPanel
                targetDate={countdownTarget}
                goal={actionGoal}
                initialCount={initialParticipants}
                simulate={simulateCountdown}
                description={countdownDescription}
                onShare={aqiData ? handleStartDiscussion : undefined}
              />
            )}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:justify-end">
              {uniqueFeatureConfigs.map((config) => {
                const label = config.labels[featureLanguage];
                const description = config.descriptions[featureLanguage];
                const isDisabled = !!config.requiresAqi && !aqiData;
                const buttonClassBase = 'h-11 min-w-[160px] rounded-full px-5 text-sm font-semibold text-white shadow-md transition-transform focus:outline-none';
                const enabledClass = `bg-gradient-to-r ${config.gradient} hover:scale-[1.02] ${config.focusRing}`;
                const disabledClass = 'cursor-not-allowed bg-gray-300 text-white/80 focus:ring-0 hover:scale-100';

                const handleClick = () => {
                  if (isDisabled) return;
                  const handler = featureHandlers[config.action];
                  handler?.();
                };

                return (
                  <button
                    key={config.id}
                    onClick={handleClick}
                    className={`${buttonClassBase} ${isDisabled ? disabledClass : enabledClass}`}
                    title={description}
                    disabled={isDisabled}
                  >
                    <span className="mr-1">{config.icon}</span>
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <FeedbackConsole isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
      </div>
    </APIProvider>
  );
};

export default MapComponent;
