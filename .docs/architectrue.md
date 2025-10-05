# Skies - 空氣品質監測系統架構設計

> 📘 **相關文檔**: 
> - [用戶互動流程設計](./user-interaction-flow.md) - 地圖行為、位置獲取、縮放策略
> - [數據顯示策略](./data-display-strategies.md) - API 調用優化、成本分析
> - [API 實現範例](./api-implementation-example.md) - 安全實現、快取策略

## 1. 系統概述

### 1.1 專案目標
基於 Google Air Quality API、Next.js 和 Google Maps API 構建一個即時空氣品質監測與視覺化系統，提供用戶友好的介面來查看和分析空氣品質數據。

### 1.2 核心技術棧
- **前端框架**: Next.js 15.5.4 (App Router)
- **UI 框架**: React 19.1.0
- **地圖服務**: @vis.gl/react-google-maps
- **樣式**: Tailwind CSS 4.1.14
- **語言**: TypeScript 5
- **API 整合**: 
  - Google Maps JavaScript API
  - Google Air Quality API
  - Google ADK (Android Development Kit - 若需原生支援)

### 1.3 核心設計決策
- **位置獲取**: GPS 優先 → IP 定位降級 → 預設台北市中心
- **初始縮放**: Zoom 13 (區域級別)，根據定位精度動態調整
- **地圖移動**: 追蹤中心點，1 秒防抖，Zoom 12-15 自動更新網格
- **數據策略**: 熱力圖 + 動態網格 + 按需查詢
- **安全架構**: Next.js API Routes 後端代理，API Key 不暴露於前端

---

## 2. 系統架構

### 2.1 整體架構圖

```
┌─────────────────────────────────────────────────────────────┐
│                      客戶端層 (Client)                        │
├─────────────────────────────────────────────────────────────┤
│  Next.js App Router (React 19)                              │
│  ├─ Pages                                                    │
│  │  ├─ Home (空氣品質地圖)                                   │
│  │  ├─ Analytics (數據分析)                                  │
│  │  ├─ History (歷史記錄)                                    │
│  │  └─ Settings (設定)                                       │
│  │                                                            │
│  ├─ Components                                               │
│  │  ├─ Map (地圖展示)                                        │
│  │  ├─ AirQualityMarkers (空氣品質標記)                      │
│  │  ├─ AirQualityPanel (資訊面板)                            │
│  │  ├─ HeatmapLayer (熱力圖層)                               │
│  │  ├─ SearchBar (地點搜尋)                                  │
│  │  └─ Charts (數據圖表)                                     │
│  │                                                            │
│  └─ Hooks                                                    │
│     ├─ useAirQuality (空氣品質數據)                           │
│     ├─ useGeolocation (地理定位)                             │
│     └─ useMapControls (地圖控制)                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    API 路由層 (API Routes)                    │
├─────────────────────────────────────────────────────────────┤
│  /api/air-quality                                            │
│  │  ├─ GET /current (當前空氣品質)                            │
│  │  ├─ GET /forecast (預測數據)                              │
│  │  ├─ GET /history (歷史數據)                               │
│  │  └─ GET /heatmap (熱力圖數據)                             │
│  │                                                            │
│  /api/locations                                              │
│  │  ├─ GET /search (地點搜尋)                                │
│  │  └─ GET /nearby (附近地點)                                │
│  │                                                            │
│  └─ /api/cache                                               │
│     └─ 快取管理與失效策略                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    服務層 (Services)                          │
├─────────────────────────────────────────────────────────────┤
│  AirQualityService                                           │
│  │  ├─ 調用 Google Air Quality API                          │
│  │  ├─ 數據格式化與轉換                                       │
│  │  └─ 錯誤處理與重試邏輯                                     │
│  │                                                            │
│  MapService                                                  │
│  │  ├─ Google Maps API 整合                                 │
│  │  ├─ 地點搜尋與地理編碼                                     │
│  │  └─ 標記與圖層管理                                        │
│  │                                                            │
│  CacheService                                                │
│  │  ├─ Redis/Memory 快取                                     │
│  │  ├─ 快取策略 (TTL)                                        │
│  │  └─ 快取預熱                                              │
│  │                                                            │
│  └─ AnalyticsService                                         │
│     ├─ 數據聚合與分析                                         │
│     └─ 趨勢計算                                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  外部 API 層 (External APIs)                  │
├─────────────────────────────────────────────────────────────┤
│  Google Air Quality API                                      │
│  │  ├─ Current Conditions                                    │
│  │  ├─ Forecast                                              │
│  │  ├─ Historical                                            │
│  │  └─ Heatmap Tiles                                         │
│  │                                                            │
│  Google Maps Platform                                        │
│  │  ├─ Maps JavaScript API                                   │
│  │  ├─ Places API                                            │
│  │  ├─ Geocoding API                                         │
│  │  └─ Geolocation API                                       │
│  │                                                            │
│  └─ (Optional) 其他數據源                                     │
│     ├─ 氣象數據 API                                           │
│     └─ 環保署開放數據                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 目錄結構設計

```
/workspace/dev/skies/
├── .docs/                          # 文檔目錄
│   ├── architecture.md             # 架構文檔
│   ├── design.pdf                  # 設計文檔
│   └── api-specs.md                # API 規格
│
├── public/                         # 靜態資源
│   ├── icons/                      # 圖標資源
│   └── images/                     # 圖片資源
│
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── layout.tsx              # 根布局
│   │   ├── page.tsx                # 首頁
│   │   ├── globals.css             # 全局樣式
│   │   │
│   │   ├── api/                    # API 路由
│   │   │   ├── air-quality/
│   │   │   │   ├── current/route.ts
│   │   │   │   ├── forecast/route.ts
│   │   │   │   ├── history/route.ts
│   │   │   │   └── heatmap/route.ts
│   │   │   │
│   │   │   └── locations/
│   │   │       ├── search/route.ts
│   │   │       └── nearby/route.ts
│   │   │
│   │   ├── analytics/              # 分析頁面
│   │   │   └── page.tsx
│   │   │
│   │   ├── history/                # 歷史記錄頁面
│   │   │   └── page.tsx
│   │   │
│   │   └── settings/               # 設定頁面
│   │       └── page.tsx
│   │
│   ├── components/                 # React 組件
│   │   ├── map/
│   │   │   ├── Map.tsx             # 主地圖組件
│   │   │   ├── MapControls.tsx     # 地圖控制項
│   │   │   └── MapProvider.tsx     # 地圖上下文
│   │   │
│   │   ├── air-quality/
│   │   │   ├── AQIMarker.tsx       # AQI 標記
│   │   │   ├── AQIPanel.tsx        # AQI 資訊面板
│   │   │   ├── AQICard.tsx         # AQI 卡片
│   │   │   ├── HeatmapLayer.tsx    # 熱力圖層
│   │   │   └── PollutantChart.tsx  # 污染物圖表
│   │   │
│   │   ├── search/
│   │   │   ├── SearchBar.tsx       # 搜尋欄
│   │   │   └── SearchResults.tsx   # 搜尋結果
│   │   │
│   │   ├── charts/
│   │   │   ├── LineChart.tsx       # 折線圖
│   │   │   ├── BarChart.tsx        # 柱狀圖
│   │   │   └── TrendChart.tsx      # 趨勢圖
│   │   │
│   │   └── ui/                     # 通用 UI 組件
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Modal.tsx
│   │       └── Loading.tsx
│   │
│   ├── hooks/                      # 自定義 Hooks
│   │   ├── useAirQuality.ts        # 空氣品質數據
│   │   ├── useGeolocation.ts       # 地理定位
│   │   ├── useMapControls.ts       # 地圖控制
│   │   ├── useDebounce.ts          # 防抖
│   │   └── useLocalStorage.ts      # 本地存儲
│   │
│   ├── services/                   # 服務層
│   │   ├── airQualityService.ts    # 空氣品質服務
│   │   ├── mapService.ts           # 地圖服務
│   │   ├── cacheService.ts         # 快取服務
│   │   ├── analyticsService.ts     # 分析服務
│   │   └── storageService.ts       # 存儲服務
│   │
│   ├── lib/                        # 工具庫
│   │   ├── api/
│   │   │   ├── client.ts           # API 客戶端
│   │   │   └── endpoints.ts        # API 端點配置
│   │   │
│   │   ├── utils/
│   │   │   ├── aqi.ts              # AQI 計算與轉換
│   │   │   ├── colors.ts           # 顏色工具
│   │   │   ├── format.ts           # 格式化工具
│   │   │   └── validation.ts       # 驗證工具
│   │   │
│   │   └── constants/
│   │       ├── aqi.ts              # AQI 常量
│   │       ├── colors.ts           # 顏色常量
│   │       └── config.ts           # 配置常量
│   │
│   ├── types/                      # TypeScript 類型定義
│   │   ├── airQuality.ts           # 空氣品質類型
│   │   ├── map.ts                  # 地圖類型
│   │   ├── api.ts                  # API 類型
│   │   └── index.ts                # 類型匯出
│   │
│   └── styles/                     # 樣式文件
│       └── map.css                 # 地圖自定義樣式
│
├── .env.local                      # 環境變量（本地）
├── .env.example                    # 環境變量範例
├── next.config.ts                  # Next.js 配置
├── tsconfig.json                   # TypeScript 配置
├── tailwind.config.ts              # Tailwind 配置
├── postcss.config.mjs              # PostCSS 配置
└── package.json                    # 依賴管理
```

---

## 4. 核心功能模組設計

### 4.1 地圖展示模組 (Map Module)

**職責**: 提供互動式地圖介面，展示空氣品質數據

**組件**:
- `Map.tsx`: 主地圖組件，整合 @vis.gl/react-google-maps
- `MapControls.tsx`: 地圖控制項（縮放、中心、圖層切換）
- `MapProvider.tsx`: 地圖狀態管理

**功能**:
- ✅ 地圖初始化與渲染
- ✅ 相機控制（縮放、平移、旋轉）
- 🔲 地圖樣式切換（標準、衛星、地形）
- 🔲 用戶定位與追蹤
- 🔲 地圖事件處理（點擊、拖拽）

### 4.2 空氣品質數據模組 (Air Quality Module)

**職責**: 獲取、處理和展示空氣品質數據

**組件**:
- `AQIMarker.tsx`: 在地圖上顯示 AQI 標記
- `AQIPanel.tsx`: 詳細的空氣品質資訊面板
- `AQICard.tsx`: 空氣品質卡片展示
- `HeatmapLayer.tsx`: 空氣品質熱力圖層
- `PollutantChart.tsx`: 各污染物濃度圖表

**功能**:
- 🔲 獲取當前位置空氣品質
- 🔲 顯示多個監測站數據
- 🔲 AQI 指數計算與分級
- 🔲 污染物詳細資訊（PM2.5, PM10, O3, NO2, SO2, CO）
- 🔲 空氣品質預測（未來 24-48 小時）
- 🔲 熱力圖視覺化
- 🔲 健康建議提示

**數據展示策略**:

由於 Google Air Quality API **一次只能查詢一個經緯度點**，我們採用以下組合策略：

1. **熱力圖層** (主要) - 使用 Google Heatmap Tiles API
   - 優點: 視覺效果最佳、覆蓋完整、性能好、成本低
   - 實現: ImageMapType 圖層疊加
   - 圖層類型: UNIVERSAL_AQI, PM25_24H, OZONE_8H 等

2. **單點查詢** (輔助) - 用戶主動操作時
   - 點擊地圖位置 → 查詢該點詳細數據
   - 搜尋特定地址 → 顯示該地址空氣品質
   - 用戶當前位置 → 自動查詢

3. **網格標記** (可選) - 根據縮放級別
   - Zoom < 12: 0-4 個點（熱力圖為主）
   - Zoom 12-14: 9 個點（3x3 網格）
   - Zoom 15+: 按需查詢（點擊查詢）

詳細說明請參考：[數據展示策略文檔](./data-display-strategies.md)

### 4.3 搜尋與導航模組 (Search Module)

**職責**: 提供地點搜尋和導航功能

**組件**:
- `SearchBar.tsx`: 地點搜尋輸入框
- `SearchResults.tsx`: 搜尋結果列表

**功能**:
- 🔲 地點名稱搜尋
- 🔲 自動完成建議
- 🔲 搜尋歷史記錄
- 🔲 附近監測站查詢
- 🔲 地理編碼與反向地理編碼

### 4.4 數據分析模組 (Analytics Module)

**職責**: 提供數據分析和視覺化功能

**組件**:
- `LineChart.tsx`: 時間序列折線圖
- `BarChart.tsx`: 污染物對比柱狀圖
- `TrendChart.tsx`: 趨勢分析圖

**功能**:
- 🔲 歷史數據查詢
- 🔲 時間範圍選擇（日、週、月、年）
- 🔲 多地點數據對比
- 🔲 趨勢分析與預測
- 🔲 數據匯出（CSV, JSON）

### 4.5 快取管理模組 (Cache Module)

**職責**: 優化 API 調用，提升性能

**策略**:
- **即時數據**: TTL 5 分鐘
- **預測數據**: TTL 1 小時
- **歷史數據**: TTL 24 小時
- **地圖圖層**: 瀏覽器快取

**實現**:
- 記憶體快取（開發環境）
- Redis 快取（生產環境，可選）
- 本地存儲（用戶偏好設定）

---

## 5. 數據獲取策略與 API 設計

### 5.0 關鍵架構決策：為什麼需要後端代理層

**問題**: Google Air Quality API 需要 API Key 認證，如果在前端直接調用會有以下問題：

1. **安全風險**: API Key 會暴露在瀏覽器中，任何人都可以查看和濫用
2. **CORS 限制**: 直接從瀏覽器調用可能遇到跨域問題
3. **配額管理**: 無法有效控制 API 使用量和速率限制
4. **成本控制**: 惡意用戶可能濫用 API 導致費用激增

**解決方案**: 使用 Next.js API Routes 作為後端代理層

```
前端組件 → Next.js API Routes → Google Air Quality API
         (公開)              (安全)
```

**優點**:
- ✅ API Key 安全存儲在伺服器端（.env.local）
- ✅ 可以實施速率限制和快取策略
- ✅ 統一錯誤處理和數據格式化
- ✅ 可以整合多個數據源
- ✅ 監控和日誌記錄

### 5.1 數據流向圖

```
┌─────────────────────────────────────────────────────────────┐
│                        前端 (Client)                          │
├─────────────────────────────────────────────────────────────┤
│  React 組件                                                   │
│  └─ useAirQuality Hook                                       │
│     └─ fetch('/api/air-quality/current?lat=24&lng=120')    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ (HTTP Request)
┌─────────────────────────────────────────────────────────────┐
│                   Next.js API Route                          │
│                   (伺服器端執行)                              │
├─────────────────────────────────────────────────────────────┤
│  /api/air-quality/current/route.ts                          │
│  1. 驗證請求參數                                              │
│  2. 檢查快取 (如有則返回)                                     │
│  3. 調用 AirQualityService                                   │
│  4. 格式化響應數據                                            │
│  5. 設置快取                                                  │
│  6. 返回 JSON 響應                                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ (使用 API Key)
┌─────────────────────────────────────────────────────────────┐
│              Google Air Quality API                          │
│         https://airquality.googleapis.com/v1                │
├─────────────────────────────────────────────────────────────┤
│  POST /currentConditions:lookup                              │
│  Headers:                                                     │
│    - X-Goog-Api-Key: YOUR_API_KEY                           │
│  Body:                                                        │
│    - location: { latitude, longitude }                       │
│    - extraComputations: [...]                                │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 內部 API Routes 實現規範

#### 5.2.1 當前空氣品質
```
GET /api/air-quality/current
Query Parameters:
  - lat: number (緯度)
  - lng: number (經度)
  - radius?: number (半徑，公里，預設 10)

Response:
{
  "location": {
    "lat": 24.23321,
    "lng": 120.9417
  },
  "dateTime": "2025-10-04T10:00:00Z",
  "indexes": [
    {
      "code": "uaqi",
      "displayName": "Universal AQI",
      "aqi": 65,
      "aqiDisplay": "65",
      "color": { "red": 255, "green": 220, "blue": 0 },
      "category": "Moderate",
      "dominantPollutant": "pm25"
    }
  ],
  "pollutants": [
    {
      "code": "pm25",
      "displayName": "PM2.5",
      "fullName": "Fine particulate matter (<2.5μm)",
      "concentration": { "value": 15.3, "units": "MICROGRAMS_PER_CUBIC_METER" },
      "additionalInfo": { ... }
    }
  ],
  "healthRecommendations": { ... }
}
```

#### 5.1.2 空氣品質預測
```
GET /api/air-quality/forecast
Query Parameters:
  - lat: number
  - lng: number
  - hours?: number (預測小時數，預設 24)

Response:
{
  "location": { ... },
  "forecasts": [
    {
      "dateTime": "2025-10-04T11:00:00Z",
      "indexes": [ ... ],
      "pollutants": [ ... ]
    }
  ]
}
```

#### 5.1.3 歷史數據
```
GET /api/air-quality/history
Query Parameters:
  - lat: number
  - lng: number
  - startDate: string (ISO 8601)
  - endDate: string (ISO 8601)
  - interval?: string (hourly|daily)

Response:
{
  "location": { ... },
  "history": [ ... ]
}
```

#### 5.2.4 熱力圖數據
```
GET /api/air-quality/heatmap
Query Parameters:
  - bounds: string (north,south,east,west)
  - pollutant?: string (pm25|pm10|o3...)

Response:
{
  "tiles": [ ... ],
  "legend": { ... }
}
```

### 5.3 API Route 實現範例

#### 5.3.1 當前空氣品質 Route 實現

```typescript
// src/app/api/air-quality/current/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { AirQualityService } from '@/services/airQualityService';
import { CacheService } from '@/services/cacheService';

export async function GET(request: NextRequest) {
  try {
    // 1. 獲取並驗證參數
    const searchParams = request.nextUrl.searchParams;
    const lat = parseFloat(searchParams.get('lat') || '');
    const lng = parseFloat(searchParams.get('lng') || '');
    
    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      );
    }

    // 2. 生成快取鍵
    const cacheKey = `air-quality:current:${lat}:${lng}`;
    
    // 3. 檢查快取
    const cachedData = await CacheService.get(cacheKey);
    if (cachedData) {
      return NextResponse.json(cachedData, {
        headers: { 'X-Cache': 'HIT' }
      });
    }

    // 4. 調用 Air Quality Service
    const airQualityService = new AirQualityService();
    const data = await airQualityService.getCurrentConditions({
      latitude: lat,
      longitude: lng
    });

    // 5. 設置快取（TTL: 5 分鐘）
    await CacheService.set(cacheKey, data, 300);

    // 6. 返回響應
    return NextResponse.json(data, {
      headers: { 'X-Cache': 'MISS' }
    });

  } catch (error) {
    console.error('Air Quality API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch air quality data' },
      { status: 500 }
    );
  }
}
```

#### 5.3.2 服務層實現

```typescript
// src/services/airQualityService.ts
export class AirQualityService {
  private readonly API_KEY: string;
  private readonly BASE_URL = 'https://airquality.googleapis.com/v1';

  constructor() {
    // 從環境變量獲取 API Key（僅在伺服器端可用）
    this.API_KEY = process.env.GOOGLE_AIR_QUALITY_API_KEY || '';
    
    if (!this.API_KEY) {
      throw new Error('Google Air Quality API key is not configured');
    }
  }

  async getCurrentConditions(params: {
    latitude: number;
    longitude: number;
  }) {
    const url = `${this.BASE_URL}/currentConditions:lookup?key=${this.API_KEY}`;
    
    const requestBody = {
      location: {
        latitude: params.latitude,
        longitude: params.longitude
      },
      // 請求額外的計算數據
      extraComputations: [
        "HEALTH_RECOMMENDATIONS",
        "DOMINANT_POLLUTANT_CONCENTRATION",
        "POLLUTANT_CONCENTRATION",
        "LOCAL_AQI",
        "POLLUTANT_ADDITIONAL_INFO"
      ],
      // 指定語言
      languageCode: "zh-TW"
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Google API Error: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      
      // 格式化數據以符合前端需求
      return this.formatAirQualityData(data);
      
    } catch (error) {
      console.error('Failed to fetch air quality data:', error);
      throw error;
    }
  }

  async getForecast(params: {
    latitude: number;
    longitude: number;
    hours?: number;
  }) {
    const url = `${this.BASE_URL}/forecast:lookup?key=${this.API_KEY}`;
    
    const requestBody = {
      location: {
        latitude: params.latitude,
        longitude: params.longitude
      },
      period: {
        hours: params.hours || 24
      },
      extraComputations: [
        "HEALTH_RECOMMENDATIONS",
        "POLLUTANT_CONCENTRATION",
        "LOCAL_AQI"
      ],
      languageCode: "zh-TW"
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch forecast data');
    }

    const data = await response.json();
    return this.formatForecastData(data);
  }

  async getHistory(params: {
    latitude: number;
    longitude: number;
    startTime: string;
    endTime: string;
    hours?: number;
  }) {
    const url = `${this.BASE_URL}/history:lookup?key=${this.API_KEY}`;
    
    const requestBody = {
      location: {
        latitude: params.latitude,
        longitude: params.longitude
      },
      period: {
        startTime: params.startTime,
        endTime: params.endTime
      },
      hours: params.hours || 24,
      extraComputations: [
        "LOCAL_AQI",
        "POLLUTANT_CONCENTRATION"
      ],
      languageCode: "zh-TW"
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch historical data');
    }

    const data = await response.json();
    return this.formatHistoricalData(data);
  }

  private formatAirQualityData(data: any) {
    // 格式化 Google API 響應為前端所需格式
    return {
      location: {
        lat: data.location?.latitude || 0,
        lng: data.location?.longitude || 0
      },
      dateTime: data.dateTime,
      indexes: data.indexes || [],
      pollutants: data.pollutants || [],
      healthRecommendations: data.healthRecommendations || {}
    };
  }

  private formatForecastData(data: any) {
    // 格式化預測數據
    return {
      location: {
        lat: data.location?.latitude || 0,
        lng: data.location?.longitude || 0
      },
      forecasts: (data.hourlyForecasts || []).map((item: any) => ({
        dateTime: item.dateTime,
        indexes: item.indexes || [],
        pollutants: item.pollutants || []
      }))
    };
  }

  private formatHistoricalData(data: any) {
    // 格式化歷史數據
    return {
      location: {
        lat: data.location?.latitude || 0,
        lng: data.location?.longitude || 0
      },
      history: (data.hoursInfo || []).map((item: any) => ({
        dateTime: item.dateTime,
        indexes: item.indexes || [],
        pollutants: item.pollutants || []
      }))
    };
  }
}
```

### 5.4 前端數據獲取實現

#### 5.4.1 自定義 Hook

```typescript
// src/hooks/useAirQuality.ts
import { useState, useEffect } from 'react';
import { AirQualityData } from '@/types/airQuality';

export function useAirQuality(lat?: number, lng?: number) {
  const [data, setData] = useState<AirQualityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!lat || !lng) return;

    const fetchAirQuality = async () => {
      setLoading(true);
      setError(null);

      try {
        // 調用內部 API Route（不是直接調用 Google API）
        const response = await fetch(
          `/api/air-quality/current?lat=${lat}&lng=${lng}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch air quality data');
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err as Error);
        console.error('Error fetching air quality:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAirQuality();
  }, [lat, lng]);

  return { data, loading, error };
}

// 使用範例
export function useAirQualityForecast(lat?: number, lng?: number, hours = 24) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!lat || !lng) return;

    const fetchForecast = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/air-quality/forecast?lat=${lat}&lng=${lng}&hours=${hours}`
        );
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchForecast();
  }, [lat, lng, hours]);

  return { data, loading, error };
}
```

#### 5.4.2 React 組件使用範例

```typescript
// src/components/air-quality/AQIPanel.tsx
'use client';
import { useAirQuality } from '@/hooks/useAirQuality';
import { getAQIColor, getAQICategory } from '@/lib/utils/aqi';

interface AQIPanelProps {
  lat: number;
  lng: number;
}

export function AQIPanel({ lat, lng }: AQIPanelProps) {
  const { data, loading, error } = useAirQuality(lat, lng);

  if (loading) {
    return <div>載入中...</div>;
  }

  if (error) {
    return <div>錯誤: {error.message}</div>;
  }

  if (!data || !data.indexes || data.indexes.length === 0) {
    return <div>無數據</div>;
  }

  const primaryIndex = data.indexes[0];
  const aqiValue = primaryIndex.aqi;
  const category = primaryIndex.category;

  return (
    <div className="p-4 rounded-lg shadow-lg bg-white">
      <h2 className="text-xl font-bold mb-4">空氣品質</h2>
      
      <div 
        className="text-6xl font-bold text-center mb-2"
        style={{ color: getAQIColor(aqiValue) }}
      >
        {aqiValue}
      </div>
      
      <div className="text-center text-lg mb-4">
        {category}
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">主要污染物</h3>
        {data.pollutants?.map((pollutant) => (
          <div key={pollutant.code} className="flex justify-between">
            <span>{pollutant.displayName}</span>
            <span>{pollutant.concentration.value} {pollutant.concentration.units}</span>
          </div>
        ))}
      </div>

      {data.healthRecommendations && (
        <div className="mt-4 p-3 bg-blue-50 rounded">
          <h3 className="font-semibold mb-2">健康建議</h3>
          <p className="text-sm">{data.healthRecommendations.generalPopulation}</p>
        </div>
      )}
    </div>
  );
}
```

### 5.5 快取服務實現

```typescript
// src/services/cacheService.ts

// 簡單的記憶體快取實現（開發環境）
class MemoryCache {
  private cache: Map<string, { data: any; expiry: number }> = new Map();

  async get(key: string): Promise<any | null> {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    // 檢查是否過期
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  async set(key: string, data: any, ttlSeconds: number): Promise<void> {
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { data, expiry });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}

// 匯出單例
export const CacheService = new MemoryCache();

// 生產環境可以替換為 Redis
// import { createClient } from 'redis';
// const redisClient = createClient({ url: process.env.REDIS_URL });
```

### 5.6 速率限制中間件

```typescript
// src/lib/middleware/rateLimit.ts
import { NextResponse } from 'next/server';

const rateLimit = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string, 
  maxRequests: number = 10, 
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const record = rateLimit.get(identifier);

  if (!record || now > record.resetTime) {
    // 新的時間窗口
    rateLimit.set(identifier, {
      count: 1,
      resetTime: now + windowMs
    });
    return true;
  }

  if (record.count >= maxRequests) {
    return false; // 超過限制
  }

  record.count++;
  return true;
}

// 使用範例
export function withRateLimit(handler: Function) {
  return async (request: Request) => {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    
    if (!checkRateLimit(ip, 30, 60000)) { // 每分鐘 30 次
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    }

    return handler(request);
  };
}
```

### 5.7 Google Air Quality API 整合細節

### 5.7 Google Air Quality API 整合細節

**Base URL**: `https://airquality.googleapis.com/v1`

**認證方式**: 
- API Key 通過 URL 參數傳遞: `?key=YOUR_API_KEY`
- 或通過 Header: `X-Goog-Api-Key: YOUR_API_KEY`

**主要端點**:

1. **當前條件 (Current Conditions)**
   ```
   POST /currentConditions:lookup
   
   Request Body:
   {
     "location": {
       "latitude": 24.23321,
       "longitude": 120.9417
     },
     "extraComputations": [
       "HEALTH_RECOMMENDATIONS",
       "DOMINANT_POLLUTANT_CONCENTRATION",
       "POLLUTANT_CONCENTRATION",
       "LOCAL_AQI",
       "POLLUTANT_ADDITIONAL_INFO"
     ],
     "languageCode": "zh-TW"
   }
   ```

2. **預測 (Forecast)**
   ```
   POST /forecast:lookup
   
   Request Body:
   {
     "location": {
       "latitude": 24.23321,
       "longitude": 120.9417
     },
     "period": {
       "hours": 24
     },
     "extraComputations": [...],
     "languageCode": "zh-TW"
   }
   ```

3. **歷史數據 (History)**
   ```
   POST /history:lookup
   
   Request Body:
   {
     "location": {
       "latitude": 24.23321,
       "longitude": 120.9417
     },
     "period": {
       "startTime": "2025-10-03T00:00:00Z",
       "endTime": "2025-10-04T00:00:00Z"
     },
     "hours": 24,
     "extraComputations": [...],
     "languageCode": "zh-TW"
   }
   ```

4. **熱力圖圖層 (Heatmap Tiles)**
   ```
   GET /mapTypes/{mapType}/heatmapTiles/{zoom}/{x}/{y}
   
   mapType 可選值:
   - US_AQI
   - UNIVERSAL_AQI
   - PM25_24H
   - PM10_24H
   - OZONE_8H
   - NO2_1H
   - SO2_1H
   - CO_8H
   
   Example:
   GET /mapTypes/US_AQI/heatmapTiles/4/12/6?key=YOUR_API_KEY
   ```

**請求限制**:
- 每日配額: 根據 Google Cloud 專案設定
- QPS 限制: 建議實施請求節流
- 建議使用快取減少 API 調用

**錯誤處理**:
- 400: 請求參數錯誤
- 401: API Key 無效或未授權
- 403: 配額超限或 API 未啟用
- 429: 請求速率超限
- 500: Google 伺服器錯誤

### 5.8 環境變量配置

```bash
# .env.local (本地開發環境)
GOOGLE_MAPS_API_KEY=your_maps_api_key_here
GOOGLE_AIR_QUALITY_API_KEY=your_air_quality_api_key_here
NODE_ENV=development

# 可選：如果使用 Redis
REDIS_URL=redis://localhost:6379
```

```bash
# .env.example (提供給團隊參考)
# Google Maps API Key (公開在前端)
GOOGLE_MAPS_API_KEY=

# Google Air Quality API Key (僅伺服器端使用，不公開)
GOOGLE_AIR_QUALITY_API_KEY=

# Environment
NODE_ENV=development

# Optional: Redis for caching
REDIS_URL=
```

**重要說明**:
- `NEXT_PUBLIC_` 前綴的變量會暴露到前端，用於 Google Maps 初始化
- `GOOGLE_AIR_QUALITY_API_KEY` **沒有** `NEXT_PUBLIC_` 前綴，僅在伺服器端可用
- 兩個 API Key 可以是同一個（如果在 Google Cloud Console 中同時啟用了兩個 API）
- 生產環境中應在 Vercel 或其他平台的環境變量設定中配置

### 5.9 完整數據流程總結

```
用戶操作（點擊地圖、搜尋地點）
         ↓
React 組件調用 useAirQuality Hook
         ↓
fetch('/api/air-quality/current?lat=24&lng=120')
         ↓
Next.js API Route (伺服器端執行)
  ├─ 驗證參數
  ├─ 檢查快取 ────→ 如有快取，直接返回
  │                      ↓
  ├─ 調用 AirQualityService
  │   └─ 使用 API Key 調用 Google API
  │       └─ POST https://airquality.googleapis.com/v1/currentConditions:lookup
  │           └─ 獲取原始數據
  ├─ 格式化數據
  ├─ 設置快取（TTL: 5分鐘）
  └─ 返回 JSON 給前端
         ↓
Hook 接收數據並更新狀態
         ↓
React 組件重新渲染，顯示空氣品質信息
```

**關鍵點**:
1. ✅ 前端**永遠不直接**調用 Google Air Quality API
2. ✅ 所有 Google API 調用都通過 Next.js API Routes
3. ✅ API Key 安全存儲在伺服器端環境變量
4. ✅ 快取策略減少不必要的 API 調用
5. ✅ 速率限制保護應用免受濫用

---

## 6. 數據模型設計

### 6.1 TypeScript 類型定義

```typescript
// types/airQuality.ts

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Color {
  red: number;
  green: number;
  blue: number;
  alpha?: number;
}

export interface AQIIndex {
  code: string;
  displayName: string;
  aqi: number;
  aqiDisplay: string;
  color: Color;
  category: AQICategory;
  dominantPollutant: string;
}

export enum AQICategory {
  GOOD = 'Good',
  MODERATE = 'Moderate',
  UNHEALTHY_FOR_SENSITIVE = 'Unhealthy for Sensitive Groups',
  UNHEALTHY = 'Unhealthy',
  VERY_UNHEALTHY = 'Very Unhealthy',
  HAZARDOUS = 'Hazardous'
}

export interface Pollutant {
  code: string;
  displayName: string;
  fullName: string;
  concentration: {
    value: number;
    units: string;
  };
  additionalInfo?: Record<string, any>;
}

export interface AirQualityData {
  location: Coordinates;
  dateTime: string;
  indexes: AQIIndex[];
  pollutants: Pollutant[];
  healthRecommendations?: HealthRecommendations;
}

export interface HealthRecommendations {
  generalPopulation: string;
  elderly: string;
  children: string;
  athletes: string;
  pregnantWomen: string;
  heartDiseasePopulation: string;
  lungDiseasePopulation: string;
}

export interface ForecastData {
  location: Coordinates;
  forecasts: AirQualityData[];
}

export interface HistoricalData {
  location: Coordinates;
  history: AirQualityData[];
  interval: 'hourly' | 'daily';
}
```

---

## 7. 狀態管理策略

### 7.1 全局狀態 (React Context)

**MapContext**: 地圖相關狀態
- 當前中心點
- 縮放級別
- 選中的標記
- 圖層可見性

**AirQualityContext**: 空氣品質數據狀態
- 當前位置數據
- 多個監測站數據
- 預測數據
- 載入狀態

**UserContext**: 用戶設定
- 偏好設定（單位、語言）
- 搜尋歷史
- 收藏位置

### 7.2 本地狀態

使用 `useState` 和 `useReducer` 管理組件內部狀態

### 7.3 服務端狀態

- Next.js Server Components 用於靜態數據
- API Routes 用於動態數據獲取
- SWR 或 React Query 用於客戶端數據緩存（可選）

---

## 8. 性能優化策略

### 8.1 前端優化

1. **代碼分割**
   - 動態導入大型組件
   - 路由級別代碼分割

2. **地圖優化**
   - 標記聚合（@googlemaps/markerclusterer）
   - 虛擬化長列表
   - 圖層按需載入

3. **圖片優化**
   - Next.js Image 組件
   - WebP 格式
   - 響應式圖片

4. **快取策略**
   - 瀏覽器快取
   - Service Worker（PWA）
   - Local Storage 存儲用戶數據

### 8.2 後端優化

1. **API 快取**
   - Redis 快取熱門查詢
   - CDN 緩存靜態資源

2. **請求優化**
   - 批量請求
   - 請求去重
   - 節流與防抖

3. **數據壓縮**
   - Gzip/Brotli 壓縮
   - JSON 數據最小化

---

## 9. 錯誤處理與監控

### 9.1 錯誤處理

**前端**:
- Error Boundaries
- 全局錯誤處理器
- 友好的錯誤提示

**後端**:
- Try-catch 包裝
- 統一錯誤響應格式
- 日誌記錄

### 9.2 監控與日誌

- API 調用監控
- 性能監控（Web Vitals）
- 錯誤追蹤（Sentry 等工具）
- Google Analytics 使用分析

---

## 10. 安全性考慮

### 10.1 API 密鑰管理

- 環境變量存儲
- 不提交到版本控制
- API 密鑰限制（域名、IP）

### 10.2 數據驗證

- 輸入驗證
- 參數清理
- CORS 設定

### 10.3 速率限制

- API Routes 速率限制
- 防止濫用

---

## 11. 部署架構

### 11.1 推薦部署平台

- **Vercel** (推薦，原生支援 Next.js)
- **Netlify**
- **AWS Amplify**
- **Google Cloud Run**

### 11.2 環境配置

**開發環境**:
```
GOOGLE_MAPS_API_KEY=your_dev_key
GOOGLE_AIR_QUALITY_API_KEY=your_dev_key
NODE_ENV=development
```

**生產環境**:
```
GOOGLE_MAPS_API_KEY=your_prod_key
GOOGLE_AIR_QUALITY_API_KEY=your_prod_key
NODE_ENV=production
REDIS_URL=your_redis_url (可選)
```

### 11.3 CI/CD 流程

1. 代碼推送到 GitHub
2. 自動化測試
3. 構建 Next.js 應用
4. 部署到 Vercel
5. 部署後驗證

---

## 12. 開發規範

### 12.1 代碼規範

- ESLint 配置
- Prettier 格式化
- TypeScript 嚴格模式
- Commit 訊息規範（Conventional Commits）

### 12.2 組件開發規範

- 組件命名：PascalCase
- 文件命名：與組件名一致
- Props 類型定義
- 組件文檔註釋

### 12.3 Git 工作流

- main 分支：穩定版本
- develop 分支：開發版本
- feature/* 分支：新功能開發
- bugfix/* 分支：錯誤修復

---

## 13. 測試策略

### 13.1 測試類型

- **單元測試**: Jest + React Testing Library
- **集成測試**: API Routes 測試
- **E2E 測試**: Playwright（可選）

### 13.2 測試覆蓋目標

- 核心功能：> 80%
- 工具函數：> 90%
- API Routes：> 70%

---

## 14. 未來擴展性

### 14.1 階段性功能

**Phase 1** (MVP):
- ✅ 基礎地圖展示
- 🔲 當前空氣品質查詢
- 🔲 AQI 標記顯示
- 🔲 基本搜尋功能

**Phase 2**:
- 🔲 空氣品質預測
- 🔲 熱力圖層
- 🔲 歷史數據查詢
- 🔲 數據圖表

**Phase 3**:
- 🔲 用戶帳戶系統
- 🔲 收藏位置
- 🔲 通知提醒
- 🔲 社群分享

**Phase 4**:
- 🔲 移動應用（React Native）
- 🔲 PWA 支援
- 🔲 離線功能
- 🔲 多語言支援

### 14.2 技術債務管理

- 定期代碼審查
- 重構計劃
- 依賴更新策略

---

## 15. 參考資源

### 15.1 官方文檔

- [Google Air Quality API](https://developers.google.com/maps/documentation/air-quality)
- [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript)
- [@vis.gl/react-google-maps](https://visgl.github.io/react-google-maps/)
- [Next.js Documentation](https://nextjs.org/docs)

### 15.2 相關標準

- [US EPA AQI](https://www.airnow.gov/aqi/aqi-basics/)
- [WHO Air Quality Guidelines](https://www.who.int/news-room/feature-stories/detail/what-are-the-who-air-quality-guidelines)

---

## 16. 版本歷史

| 版本 | 日期 | 作者 | 變更內容 |
|------|------|------|----------|
| 1.0 | 2025-10-04 | - | 初始架構設計 |

---

## 附錄

### A. AQI 分級標準

| AQI 範圍 | 等級 | 顏色 | 健康影響 |
|----------|------|------|----------|
| 0-50 | 良好 | 綠色 | 空氣品質令人滿意 |
| 51-100 | 中等 | 黃色 | 敏感人群可能受影響 |
| 101-150 | 對敏感人群不健康 | 橙色 | 敏感人群可能經歷健康影響 |
| 151-200 | 不健康 | 紅色 | 普通人群可能開始經歷健康影響 |
| 201-300 | 非常不健康 | 紫色 | 健康警告：所有人都可能經歷嚴重健康影響 |
| 301+ | 有害 | 褐紅色 | 健康警報：緊急情況 |

### B. 主要污染物說明

- **PM2.5**: 細顆粒物（直徑 < 2.5μm）
- **PM10**: 可吸入顆粒物（直徑 < 10μm）
- **O3**: 臭氧
- **NO2**: 二氧化氮
- **SO2**: 二氧化硫
- **CO**: 一氧化碳

---

**文檔維護**: 本文檔應隨專案發展持續更新
**最後更新**: 2025-10-04
