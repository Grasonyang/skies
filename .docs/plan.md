# Skies - 空氣品質監測系統完整規劃

> 📅 **最後更新**: 2025-01-04  
> 📋 **當前階段**: 設計完成，準備開發  
> 🎯 **目標**: 建立安全、經濟、用戶友好的空氣品質監測平台

---

## 📋 目錄

1. [專案概述](#專案概述)
2. [核心設計決策](#核心設計決策)
3. [技術架構](#技術架構)
4. [用戶體驗流程](#用戶體驗流程)
5. [數據策略](#數據策略)
6. [實現計劃](#實現計劃)
7. [成本分析](#成本分析)
8. [開發指南](#開發指南)

---

## 專案概述

### 目標
基於 Google Air Quality API、Next.js 和 Google Maps 構建即時空氣品質監測與視覺化系統。

### 技術棧
- **前端**: Next.js 15.5.4 (App Router) + React 19.1.0
- **地圖**: @vis.gl/react-google-maps
- **樣式**: Tailwind CSS 4.1.14
- **語言**: TypeScript 5
- **API**: Google Maps JavaScript API + Google Air Quality API

### 核心功能
- 🗺️ 互動式地圖顯示
- 📍 自動用戶定位（GPS → IP → 預設）
- 🌡️ 即時空氣品質數據
- 🎨 熱力圖層區域概況
- 🔍 點擊查詢詳細資訊
- 📊 污染物數據展示

---

## 核心設計決策

### 1. 用戶位置獲取 - 三層降級策略

```
第 1 層: GPS 定位（優先）
   ↓ 失敗（5秒超時）
第 2 層: IP 定位（降級）
   ↓ 失敗
第 3 層: 預設台北市中心（保底）
```

**實現**:
```typescript
// hooks/useGeolocation.ts
async function getInitialLocation() {
  try {
    // 第 1 層: GPS
    const position = await navigator.geolocation.getCurrentPosition();
    return { lat, lng, accuracy, source: 'gps' };
  } catch {
    try {
      // 第 2 層: IP
      const data = await fetch('https://ipapi.co/json/');
      return { lat, lng, accuracy: 5000, source: 'ip' };
    } catch {
      // 第 3 層: 預設
      return { lat: 25.033, lng: 121.5654, source: 'default' };
    }
  }
}
```

**效果**: 100% 用戶都能正常使用

---

### 2. 地圖縮放級別 - 動態 Zoom 13

```
定位精度          → 縮放級別 → 視野範圍
GPS < 100m       → Zoom 15  → 街區級
GPS 100-500m     → Zoom 14  → 區域級
GPS 500-2000m    → Zoom 13  → 城市級（預設推薦）⭐
IP/預設定位      → Zoom 12  → 大區域
```

**理由**: 平衡視野與細節，初始查詢 9 次（3x3 網格）成本可控

---

### 3. 數據顯示 - 熱力圖 + 動態網格

```
策略 1: 熱力圖層（區域概況）
- Heatmap Tiles API（免費）
- 所有縮放級別都顯示
- 美觀流暢

策略 2: 動態網格（精確數據）
- Zoom < 12:  不查詢
- Zoom 12-13: 3x3 網格（9 次）
- Zoom 14-15: 5x5 網格（25 次）
- Zoom 16+:   按需查詢（用戶點擊）

策略 3: 快取優化
- TTL: 5-10 分鐘
- 命中率: 70%
- 成本降低: 70%
```

**成本對比**（10,000 MAU）:
- 無優化: $1,050/月
- 有優化: $105/月 ⭐

---

### 4. 地圖移動 - 智能追蹤 + 防抖

```
用戶移動地圖
    ↓
停止移動（1秒防抖）
    ↓
檢查縮放級別
    ↓
┌──────────┬────────────┬──────────┐
│ Zoom<12  │ Zoom 12-15 │ Zoom>15  │
└──────────┴────────────┴──────────┘
    ↓            ↓           ↓
不自動查詢   自動更新網格   提示點擊
只顯示熱力圖   查詢新點     按需查詢
```

**效果**: 避免頻繁 API 調用，用戶體驗流暢

---

### 5. API 安全 - Next.js API Routes 後端代理

```
❌ 錯誤做法:
前端 → 直接調用 Google API
        ↓
    API Key 暴露！

✅ 正確做法:
前端 → Next.js API Routes → Google API
       (API Key 安全存儲)
```

**實現**:
```typescript
// app/api/air-quality/current/route.ts
export async function GET(request: NextRequest) {
  const apiKey = process.env.GOOGLE_AIR_QUALITY_API_KEY; // 安全
  const data = await fetch(googleApiUrl, { 
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, s-maxage=300' }
  });
}
```

---

## 技術架構

```
┌─────────────────────────────────────────┐
│           前端層 (Client)                │
│  Next.js App Router + React 19          │
│  ┌────────────┐  ┌────────────┐        │
│  │ 地圖組件   │  │ 數據組件   │        │
│  │ Map        │  │ AQIPanel   │        │
│  │ + Heatmap  │  │ + Markers  │        │
│  └────────────┘  └────────────┘        │
│  ┌────────────────────────────┐        │
│  │ Hooks                       │        │
│  │ - useGeolocation            │        │
│  │ - useAirQuality             │        │
│  │ - useMapTracking            │        │
│  └────────────────────────────┘        │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│        API Routes (Backend Proxy)        │
│  /api/air-quality/current               │
│  /api/air-quality/forecast              │
│  /api/air-quality/history               │
│  ┌────────────────────────────┐        │
│  │ - API Key 保護             │        │
│  │ - 快取 (5-10 min)          │        │
│  │ - 速率限制                 │        │
│  │ - 錯誤處理                 │        │
│  └────────────────────────────┘        │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│       服務層 (Services)                  │
│  AirQualityService + CacheService       │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│       外部 API                           │
│  Google Air Quality API                 │
│  Google Maps Heatmap Tiles              │
└─────────────────────────────────────────┘
```

---

## 用戶體驗流程

### 完整流程

```
1. 用戶打開網頁
   ↓
2. 顯示載入動畫
   "正在獲取您的位置..."
   ↓
3. 嘗試獲取位置（三層降級）
   GPS → IP → 預設台北
   ↓
4. 初始化地圖
   - 中心點: 用戶位置
   - 縮放: Zoom 13（動態調整）
   - 載入熱力圖層
   ↓
5. 查詢中心點數據
   - 調用 /api/air-quality/current
   - 顯示 AQI 面板
   ↓
6. 用戶互動
   ┌────────────┬────────────┬────────────┐
   │ 移動地圖   │ 點擊地圖   │ 搜尋地點   │
   │ 自動更新   │ 查詢詳情   │ 跳轉查詢   │
   └────────────┴────────────┴────────────┘
```

### 互動優先級

```
優先級 1: 用戶點擊的點（最高）
優先級 2: 地圖中心點（Zoom 12-15）
優先級 3: 用戶當前位置（初始）
```

---

## 數據策略

### 縮放級別對應策略

| Zoom | 視野 | 策略 | API調用 | 成本/用戶 |
|------|------|------|---------|----------|
| 6-9 | 國家 | 只顯示熱力圖 | 0 | $0 |
| 10-11 | 大區域 | 熱力圖 + 中心點 | 1 | $0.0005 |
| **12-13** | **城市** | **熱力圖 + 3x3** | **9** | **$0.0045** ⭐ |
| 14-15 | 區域 | 熱力圖 + 5x5 | 25 | $0.0125 |
| 16+ | 街道 | 熱力圖 + 按需 | 按需 | 按需 |

### 快取策略

```typescript
// CacheService
class CacheService {
  private ttl = 5 * 60 * 1000; // 5 分鐘
  
  getCacheKey(lat: number, lng: number): string {
    // 四捨五入到 0.01（約 1km）
    const roundLat = Math.round(lat * 100) / 100;
    const roundLng = Math.round(lng * 100) / 100;
    return `aqi:${roundLat}:${roundLng}`;
  }
  
  async get(key: string) {
    const cached = this.cache.get(key);
    if (!cached || Date.now() - cached.timestamp > this.ttl) {
      return null;
    }
    return cached.data;
  }
}
```

**效果**: 70% 命中率，成本降低 70%

---

## 實現計劃

### Phase 1: MVP（Week 1-2）

#### Week 1: 基礎設施

**Day 1-2: 位置獲取**
```typescript
任務:
- [ ] 創建 hooks/useGeolocation.ts
- [ ] 實現三層降級策略
- [ ] 創建載入動畫
- [ ] 更新 app/page.tsx

完成標準:
✅ 允許定位 → GPS
✅ 拒絕定位 → IP
✅ IP 失敗 → 預設台北
```

**Day 3-4: API Routes**
```typescript
任務:
- [ ] 創建 services/airQualityService.ts
- [ ] 創建 app/api/air-quality/current/route.ts
- [ ] 配置環境變數
- [ ] 測試 API 調用

完成標準:
✅ API Route 正確返回數據
✅ API Key 不暴露
✅ 錯誤處理完善
```

**Day 5-7: 熱力圖與查詢**
```typescript
任務:
- [ ] 創建 components/map/HeatmapLayer.tsx
- [ ] 創建 hooks/useAirQuality.ts
- [ ] 創建 components/AirQualityPanel.tsx
- [ ] 整合到主頁面

完成標準:
✅ 熱力圖顯示正確
✅ 面板顯示 AQI 數據
✅ 視覺效果良好
```

#### Week 2: 優化體驗 ✅

**任務清單**:
- [x] 地圖樣式優化（移除不必要控制項）
- [x] 熱力圖透明度調整（0.45）
- [x] 面板文字對比度提升
- [ ] 地圖移動追蹤（防抖 1 秒）
- [ ] 動態網格顯示（根據 Zoom）
- [ ] 點擊查詢功能
- [ ] 地點搜尋（Google Places）
- [ ] 快取實現（Memory Cache）✅

**完成標準**:
- ✅ 移動地圖自動更新（Zoom 12-15）
- ✅ 點擊任意位置查詢
- ✅ 搜尋地點跳轉
- ✅ 快取命中率 > 60%

---

### Phase 2: 創新功能（Week 3-4）🎯

#### Week 3: 智能監測與預測

**核心創新點**:

1. **AI 驅動的空氣品質預測** 🤖
   ```typescript
   功能:
   - [ ] 整合 Google Air Quality Forecast API
   - [ ] 顯示未來 24-48 小時預測
   - [ ] 預測準確度指標
   - [ ] 趨勢圖表（Chart.js）
   
   價值:
   - 提前規劃戶外活動
   - 敏感族群健康管理
   - 通勤路線優化建議
   ```

2. **個人化健康建議** 💊
   ```typescript
   功能:
   - [ ] 根據 AQI 等級提供建議
   - [ ] 敏感族群警示（老人、兒童、孕婦、氣喘患者）
   - [ ] 戶外活動適宜度評分
   - [ ] 口罩配戴建議
   
   建議系統:
   - AQI 0-50:   建議戶外運動
   - AQI 51-100: 敏感族群減少戶外活動
   - AQI 101+:   建議配戴口罩、關閉窗戶
   ```

3. **多點對比功能** 📊
   ```typescript
   功能:
   - [ ] 收藏常用地點（家、公司、學校）
   - [ ] 同時顯示多個地點的 AQI
   - [ ] 地點間空氣品質對比
   - [ ] 最佳空氣品質地點推薦
   
   應用場景:
   - 選擇居住地點
   - 規劃活動地點
   - 通勤路線選擇
   ```

#### Week 4: 社群與互動

**社群功能**:

1. **即時空氣品質通報** 📱
   ```typescript
   功能:
   - [ ] 用戶上傳即時照片
   - [ ] 能見度評分（1-5星）
   - [ ] 異味回報（工廠排放、火災等）
   - [ ] 社群驗證機制
   
   創新點:
   - 補充官方監測站的不足
   - 超在地化的空氣品質資訊
   - 即時性更高
   ```

2. **空氣品質排行榜** 🏆
   ```typescript
   功能:
   - [ ] 全台/全球城市 AQI 排名
   - [ ] 本週/本月最佳空氣品質城市
   - [ ] 空氣品質改善趨勢
   - [ ] 歷史數據對比
   ```

3. **分享與提醒** 🔔
   ```typescript
   功能:
   - [ ] 分享當前位置空氣品質到社群媒體
   - [ ] 設定 AQI 閾值提醒
   - [ ] LINE/Telegram Bot 通知
   - [ ] 每日空氣品質報告
   ```

---

### Phase 3: 進階分析（Week 5-6）📈

#### Week 5: 數據視覺化

**視覺化功能**:

1. **歷史趨勢分析** 📈
   ```typescript
   功能:
   - [ ] 過去 7 天/30 天/一年趨勢圖
   - [ ] 不同污染物濃度變化
   - [ ] 季節性分析
   - [ ] 與去年同期對比
   ```

2. **污染源分析** 🏭
   ```typescript
   功能:
   - [ ] 顯示附近工廠、交通要道
   - [ ] 污染源影響範圍預測
   - [ ] 風向與污染物擴散模擬
   ```

3. **3D 空氣品質地圖** 🗺️
   ```typescript
   功能:
   - [ ] 高度維度（垂直污染分布）
   - [ ] 動態風場顯示
   - [ ] 污染物擴散動畫
   ```

#### Week 6: 完善與部署

**任務清單**:
- [ ] 錯誤邊界處理
- [ ] 載入骨架屏
- [ ] 響應式設計完善（手機版優化）
- [ ] 性能優化（Lighthouse > 90）
- [ ] SEO 優化
- [ ] PWA 支援（離線模式）
- [ ] 部署到 Vercel
- [ ] 設置監控（Sentry）
- [ ] 設置分析（Google Analytics）

---

## 🚀 創新特色總結

### 與現有解決方案的差異

| 功能 | 傳統空品 App | Skies 創新點 |
|------|-------------|-------------|
| 數據顯示 | 靜態數值 | 熱力圖 + 互動地圖 |
| 預測功能 | 無或簡單 | AI 驅動 24-48hr 預測 |
| 個人化 | 無 | 敏感族群客製化建議 |
| 社群功能 | 無 | 即時通報 + 驗證機制 |
| 多點對比 | 無 | 收藏地點即時對比 |
| 視覺化 | 簡單圖表 | 3D 地圖 + 動態模擬 |
| 健康建議 | 通用建議 | 個人化風險評估 |

### 核心價值主張

1. **即時性** ⚡
   - 結合官方數據 + 社群通報
   - 快取優化，秒級響應

2. **個人化** 👤
   - 依據用戶族群提供建議
   - 收藏常用地點

3. **預測性** 🔮
   - AI 預測未來空氣品質
   - 提前規劃活動

4. **社群性** 🤝
   - 用戶貢獻即時資訊
   - 共同監督空氣品質

5. **視覺化** 🎨
   - 直觀的熱力圖
   - 3D 污染擴散模擬

---

## 📊 Phase 2-3 成本估算

### API 使用量預估（10,000 MAU）

```
Phase 2 新增:
- Forecast API:      2 次/用戶/天 × 30 天 = 60 萬次/月
- Historical API:    1 次/用戶/週 = 4 萬次/月
- 社群通報查詢:     3 次/用戶/天 × 30 天 = 90 萬次/月

總計: 154 萬次/月
快取後 (70%): 46.2 萬次/月
成本: (462,000 - 10,000) × $0.005 = $2,260/月
```

### 優化策略
- ✅ 提高快取 TTL（預測數據可達 30 分鐘）
- ✅ 批量查詢優化
- ✅ CDN 快取歷史數據
- 🎯 **目標成本**: $1,500/月

---

## 🎯 下一步行動

### 立即開始 (本週)
1. **地圖移動追蹤** - useMapTracking Hook
2. **點擊查詢功能** - 地圖點擊事件
3. **面板 UI 優化** - 提升可讀性 ✅

### Week 3 準備
1. 研究 Forecast API 文檔
2. 設計健康建議邏輯
3. 規劃收藏地點功能

---

**下一個里程碑**: Phase 2 Week 3 - 智能監測與預測 🎯  
**預計完成日期**: 2025-01-18  
**核心目標**: 從「數據顯示」升級到「智能預測」

---

## 成本分析

### Google Air Quality API 定價
```
前 10,000 次/月: 免費
之後: $5 / 1,000 次
```

### 場景分析（10,000 MAU）

#### 場景 1: MVP 無快取
```
每用戶: 初始 1 + 移動 5 + 點擊 2 = 8 次
總調用: 80,000 次/月
費用: (80,000 - 10,000) × $0.005 = $350/月
```

#### 場景 2: MVP 有快取（推薦）⭐
```
快取命中率: 70%
實際調用: 80,000 × 30% = 24,000 次/月
費用: (24,000 - 10,000) × $0.005 = $70/月
```

#### 場景 3: 完整功能
```
每用戶: 12 次（含歷史查詢、圖表）
快取後: 12 × 30% = 3.6 次
總調用: 36,000 次/月
費用: (36,000 - 10,000) × $0.005 = $130/月
```

### 成本控制措施

```typescript
1. 快取策略（最重要）
   - TTL: 5-10 分鐘
   - 節省: 70%

2. 智能縮放
   - Zoom < 12: 不查詢
   - Zoom > 15: 按需查詢

3. 防抖處理
   - 地圖移動: 1 秒防抖
   - 避免頻繁查詢

4. 請求合併
   - 批量查詢多個點
   - 減少 HTTP 請求數

5. 降級方案
   - API 額度用完時
   - 只顯示熱力圖
```

**目標成本**: $70-130/月（10,000 MAU）

---

## 開發指南

### 目錄結構

```
src/
├── app/
│   ├── api/
│   │   └── air-quality/
│   │       ├── current/
│   │       │   └── route.ts          # 當前數據 API
│   │       ├── forecast/
│   │       │   └── route.ts          # 預測數據 API
│   │       └── history/
│   │           └── route.ts          # 歷史數據 API
│   ├── page.tsx                      # 主頁面
│   ├── layout.tsx                    # Layout
│   └── globals.css                   # 全局樣式
├── components/
│   ├── map/
│   │   ├── MapComponent.tsx          # 地圖組件
│   │   ├── HeatmapLayer.tsx          # 熱力圖層
│   │   └── AQIMarkers.tsx            # AQI 標記
│   ├── AirQualityPanel.tsx           # 數據面板
│   ├── SearchBar.tsx                 # 搜尋欄
│   └── LoadingSpinner.tsx            # 載入動畫
├── hooks/
│   ├── useGeolocation.ts             # 位置獲取
│   ├── useAirQuality.ts              # 數據獲取
│   ├── useMapTracking.ts             # 地圖追蹤
│   └── useMapZoom.ts                 # 縮放監聽
├── services/
│   ├── airQualityService.ts          # API 服務
│   └── cacheService.ts               # 快取服務
├── lib/
│   ├── constants.ts                  # 常數定義
│   └── utils.ts                      # 工具函數
└── types/
    └── index.ts                      # TypeScript 類型
```

### 環境變數

```bash
# .env.local

# Google Maps API Key（會暴露到前端）
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_key

# Google Air Quality API Key（只在服務端使用）
GOOGLE_AIR_QUALITY_API_KEY=your_air_quality_key

# 環境
NODE_ENV=development
```

### 關鍵代碼範例

#### 1. 位置獲取 Hook
```typescript
// hooks/useGeolocation.ts
export function useGeolocation() {
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    getInitialLocation()
      .then(setLocation)
      .finally(() => setLoading(false));
  }, []);
  
  return { location, loading };
}
```

#### 2. API Route
```typescript
// app/api/air-quality/current/route.ts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '0');
  const lng = parseFloat(searchParams.get('lng') || '0');
  
  // 驗證參數
  if (!lat || !lng) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }
  
  // 檢查快取
  const cacheKey = getCacheKey(lat, lng);
  const cached = await cache.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }
  
  // 調用 API
  const data = await airQualityService.getCurrentConditions(lat, lng);
  
  // 存入快取
  await cache.set(cacheKey, data, 300); // 5 分鐘
  
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, s-maxage=300' }
  });
}
```

#### 3. 熱力圖層
```typescript
// components/map/HeatmapLayer.tsx
export function HeatmapLayer() {
  const map = useMap();
  
  useEffect(() => {
    if (!map) return;
    
    const heatmapLayer = new google.maps.ImageMapType({
      getTileUrl: (coord, zoom) => {
        const url = 'https://airquality.googleapis.com/v1/mapTypes/UAQI_RED_GREEN/heatmapTiles';
        return `${url}/${zoom}/${coord.x}/${coord.y}?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
      },
      tileSize: new google.maps.Size(256, 256),
      opacity: 0.6
    });
    
    map.overlayMapTypes.push(heatmapLayer);
    
    return () => {
      const index = map.overlayMapTypes.getArray().indexOf(heatmapLayer);
      if (index !== -1) map.overlayMapTypes.removeAt(index);
    };
  }, [map]);
  
  return null;
}
```

### 開發流程

```bash
# 1. 設置環境
npm install
cp .env.example .env.local
# 編輯 .env.local 填入 API Keys

# 2. 啟動開發服務器
npm run dev

# 3. 測試 API
curl "http://localhost:3000/api/air-quality/current?lat=25.033&lng=121.5654"

# 4. 構建生產版本
npm run build

# 5. 本地預覽生產版本
npm run start
```

### 測試清單

```
功能測試:
✅ 允許定位 → 顯示用戶位置
✅ 拒絕定位 → 使用 IP 定位
✅ IP 失敗 → 顯示台北
✅ 地圖顯示正確
✅ 熱力圖層載入
✅ AQI 數據顯示
✅ 點擊地圖查詢
✅ 移動地圖更新

性能測試:
✅ 首屏載入 < 3 秒
✅ API 響應 < 1 秒
✅ 快取命中率 > 60%
✅ Lighthouse 分數 > 85

安全測試:
✅ API Key 不暴露
✅ CORS 設置正確
✅ 速率限制有效
✅ 錯誤處理完善
```

---

## 里程碑

### ✅ Milestone 1: 設計完成（當前）
- 完整架構設計
- 技術決策記錄
- 用戶體驗流程
- 成本分析完成

### 🎯 Milestone 2: MVP 完成（Week 2）
- 位置獲取功能
- 地圖與熱力圖顯示
- API Routes 實現
- 單點查詢功能

### 🎯 Milestone 3: 優化完成（Week 4）
- 地圖移動追蹤
- 動態網格顯示
- 快取實現
- 搜尋功能

### 🎯 Milestone 4: 生產就緒（Week 6）
- 完整功能
- 性能優化
- 錯誤處理
- 部署上線

---

## 參考資料

### Google API 文檔
- [Air Quality API](https://developers.google.com/maps/documentation/air-quality)
- [Maps JavaScript API](https://developers.google.com/maps/documentation/javascript)
- [Places API](https://developers.google.com/maps/documentation/places/web-service)

### Next.js 文檔
- [App Router](https://nextjs.org/docs/app)
- [API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)

### 最佳實踐
- [Web.dev Performance](https://web.dev/performance/)
- [React Best Practices](https://react.dev/learn)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

---

## 快速開始

```bash
# 1. 閱讀本文檔（30 分鐘）
cat .docs/plan.md

# 2. 設置開發環境（10 分鐘）
npm install
cp .env.example .env.local

# 3. 獲取 API Keys（20 分鐘）
# - Google Cloud Console
# - 啟用 Maps + Air Quality API

# 4. 開始開發（Day 1）
npm run dev
# 創建 hooks/useGeolocation.ts
```

---

**下一步**: 開始 Week 1 Day 1 - 位置獲取功能實現 🚀
