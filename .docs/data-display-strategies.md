# 空氣品質數據展示策略

## 🎯 核心問題

**問題**: Google Air Quality API 只能查詢**一個經緯度點**的數據，但前端地圖需要展示**整個區域**的空氣品質。該如何取得並展示數據？

**解答**: 有三種主要策略，根據不同使用場景選擇。

---

## 📊 策略對比總覽

| 策略 | 適用場景 | API 調用次數 | 成本 | 性能 | 視覺效果 |
|------|---------|-------------|------|------|---------|
| **策略 1: 單點查詢** | 用戶查詢特定位置 | 1 次/查詢 | 💰 低 | ⚡ 快 | ⭐⭐⭐ |
| **策略 2: 網格多點** | 顯示區域概況 | N 次/區域 | 💰💰 中 | ⚡⚡ 中 | ⭐⭐⭐⭐ |
| **策略 3: 熱力圖層** | 完整區域視覺化 | 圖層載入 | 💰 低 | ⚡⚡⚡ 最快 | ⭐⭐⭐⭐⭐ |

---

## 🎨 策略 1: 單點查詢 + 標記顯示

### 概念

用戶點擊地圖或搜尋地點時，**只查詢該點**的空氣品質並顯示標記。

### 適用場景

- ✅ 用戶主動搜尋特定地點
- ✅ 顯示用戶當前位置的空氣品質
- ✅ 點擊地圖獲取該點數據
- ✅ 預算有限的情況

### 實現方式

```typescript
// 用戶點擊地圖時
function onMapClick(lat: number, lng: number) {
  // 調用 API 獲取該點數據
  fetch(`/api/air-quality/current?lat=${lat}&lng=${lng}`)
    .then(res => res.json())
    .then(data => {
      // 在該位置顯示 AQI 標記
      addMarkerToMap(lat, lng, data.indexes[0].aqi);
    });
}
```

### 優點

- ✅ API 調用次數最少
- ✅ 成本最低
- ✅ 響應速度快
- ✅ 實現簡單

### 缺點

- ❌ 無法一次看到整個區域
- ❌ 需要用戶主動操作
- ❌ 視覺呈現有限

### 成本估算

```
假設：
- 每月 10,000 次查詢
- 每次查詢 = 1 次 API 調用

成本 = 10,000 次 × $0.005 = $50/月
```

---

## 🗺️ 策略 2: 網格多點查詢

### 概念

將可視區域劃分為**網格**，查詢每個網格點的空氣品質，形成區域概況。

### 適用場景

- ✅ 需要顯示區域內多個監測點
- ✅ 對比不同區域的空氣品質
- ✅ 城市級別的監測
- ✅ 有一定預算

### 劃分策略

#### 方案 A: 固定網格（推薦新手）

```typescript
// 將地圖可視區域分成 3x3 網格（9 個點）
function getGridPoints(bounds: MapBounds): LatLng[] {
  const { north, south, east, west } = bounds;
  const points: LatLng[] = [];
  
  const latStep = (north - south) / 3;
  const lngStep = (east - west) / 3;
  
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      points.push({
        lat: south + latStep * (i + 0.5),
        lng: west + lngStep * (j + 0.5)
      });
    }
  }
  
  return points; // 返回 9 個點
}
```

**網格分佈示意**:
```
西北   北   東北
  ●     ●     ●
  
西     中     東
  ●     ●     ●
  
西南   南   東南
  ●     ●     ●
```

#### 方案 B: 動態密度（推薦進階）

根據縮放級別調整網格密度：

```typescript
function getGridDensity(zoomLevel: number): number {
  if (zoomLevel >= 15) return 5;      // 5x5 = 25 點（街區級別）
  if (zoomLevel >= 12) return 3;      // 3x3 = 9 點（城市級別）
  if (zoomLevel >= 9) return 2;       // 2x2 = 4 點（區域級別）
  return 1;                            // 1x1 = 1 點（國家級別）
}
```

**縮放級別對照**:
- Zoom 5-8: 國家/省份 → 1 個點
- Zoom 9-11: 大區域 → 4 個點
- Zoom 12-14: 城市 → 9 個點
- Zoom 15-17: 街區 → 25 個點
- Zoom 18+: 街道 → 49 個點

#### 方案 C: 重要地點（推薦實用）

只查詢**有代表性的地點**：

```typescript
const importantLocations = [
  { name: "台北市中心", lat: 25.0330, lng: 121.5654 },
  { name: "大安區", lat: 25.0263, lng: 121.5436 },
  { name: "信義區", lat: 25.0339, lng: 121.5645 },
  { name: "松山區", lat: 25.0493, lng: 121.5771 },
  { name: "中山區", lat: 25.0636, lng: 121.5267 }
];

// 只查詢這些預定義的點
```

### 實現範例

```typescript
// hooks/useAreaAirQuality.ts
export function useAreaAirQuality(bounds: MapBounds, zoomLevel: number) {
  const [markers, setMarkers] = useState<AQIMarker[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAreaData = async () => {
      setLoading(true);
      
      // 根據縮放級別決定網格密度
      const gridSize = getGridDensity(zoomLevel);
      const points = getGridPoints(bounds, gridSize);
      
      // 批量查詢（可以並行）
      const promises = points.map(point =>
        fetch(`/api/air-quality/current?lat=${point.lat}&lng=${point.lng}`)
          .then(res => res.json())
      );
      
      const results = await Promise.all(promises);
      
      // 轉換為標記數據
      const newMarkers = results.map((data, i) => ({
        position: points[i],
        aqi: data.indexes[0]?.aqi || 0,
        category: data.indexes[0]?.category || 'Unknown'
      }));
      
      setMarkers(newMarkers);
      setLoading(false);
    };

    // 防抖：用戶停止移動地圖 1 秒後才查詢
    const timeoutId = setTimeout(fetchAreaData, 1000);
    return () => clearTimeout(timeoutId);
    
  }, [bounds, zoomLevel]);

  return { markers, loading };
}
```

### 優化技巧

#### 1. 快取網格數據

```typescript
// 快取鍵包含網格資訊
const cacheKey = `grid:${lat.toFixed(2)}:${lng.toFixed(2)}`;
```

#### 2. 防抖與節流

```typescript
// 用戶拖動地圖時不立即查詢，等停止 1 秒後才查詢
const debouncedFetch = useDeBounce(fetchAreaData, 1000);
```

#### 3. 只查詢新增的網格

```typescript
// 比較新舊網格，只查詢新出現的點
const newPoints = points.filter(p => !existingPoints.includes(p));
```

#### 4. 批量請求

```typescript
// 後端實現批量查詢 API
POST /api/air-quality/batch
Body: {
  locations: [
    { lat: 25.033, lng: 121.565 },
    { lat: 25.026, lng: 121.543 },
    // ...
  ]
}
```

### 優點

- ✅ 顯示區域概況
- ✅ 可以對比不同地點
- ✅ 視覺效果較好
- ✅ 靈活度高

### 缺點

- ❌ API 調用次數多
- ❌ 成本較高
- ❌ 可能較慢
- ❌ 需要優化防止過度查詢

### 成本估算

```
假設：
- Zoom 12 級別，3x3 網格 = 9 個點
- 用戶每次移動地圖查詢一次
- 每月 1,000 次地圖移動

成本 = 1,000 × 9 × $0.005 = $45/月

假設：
- Zoom 15 級別，5x5 網格 = 25 個點
- 每月 1,000 次移動

成本 = 1,000 × 25 × $0.005 = $125/月
```

---

## 🎨 策略 3: 熱力圖層（推薦！）

### 概念

使用 Google Air Quality API 的 **Heatmap Tiles**，直接載入預先生成的**熱力圖圖層**。

### 為什麼這是最佳方案？

- ✅ **Google 已經處理好數據** - 不需要自己查詢多個點
- ✅ **圖層形式** - 像地圖瓦片一樣載入
- ✅ **視覺效果最佳** - 平滑的漸層色彩
- ✅ **性能最好** - 圖層快取在 CDN
- ✅ **成本可控** - 按圖層載入計費，不是按點計費

### Heatmap Tiles API

```
GET /v1/mapTypes/{mapType}/heatmapTiles/{zoom}/{x}/{y}?key=API_KEY

可用的 mapType:
- US_AQI              (美國 AQI)
- UNIVERSAL_AQI       (通用 AQI) ⭐ 推薦
- PM25_24H            (PM2.5 24小時平均)
- PM10_24H            (PM10 24小時平均)
- OZONE_8H            (臭氧 8小時平均)
- NO2_1H              (二氧化氮 1小時平均)
- SO2_1H              (二氧化硫 1小時平均)
- CO_8H               (一氧化碳 8小時平均)
```

### 實現方式

#### 方法 A: 使用 Google Maps 原生圖層

```typescript
// components/map/HeatmapLayer.tsx
'use client';
import { useMap } from '@vis.gl/react-google-maps';
import { useEffect } from 'react';

export function AirQualityHeatmapLayer() {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // 創建圖層
    const aqiLayer = new google.maps.ImageMapType({
      getTileUrl: (coord, zoom) => {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        return `https://airquality.googleapis.com/v1/mapTypes/UNIVERSAL_AQI/heatmapTiles/${zoom}/${coord.x}/${coord.y}?key=${apiKey}`;
      },
      tileSize: new google.maps.Size(256, 256),
      opacity: 0.6,  // 透明度
      name: 'Air Quality'
    });

    // 添加到地圖
    map.overlayMapTypes.push(aqiLayer);

    // 清理
    return () => {
      const index = map.overlayMapTypes.getArray().indexOf(aqiLayer);
      if (index !== -1) {
        map.overlayMapTypes.removeAt(index);
      }
    };
  }, [map]);

  return null;
}
```

#### 方法 B: 通過後端代理（更安全）

```typescript
// app/api/air-quality/heatmap-tile/[zoom]/[x]/[y]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { zoom: string; x: string; y: string } }
) {
  const { zoom, x, y } = params;
  const mapType = request.nextUrl.searchParams.get('type') || 'UNIVERSAL_AQI';
  
  const apiKey = process.env.GOOGLE_AIR_QUALITY_API_KEY;
  const url = `https://airquality.googleapis.com/v1/mapTypes/${mapType}/heatmapTiles/${zoom}/${x}/${y}?key=${apiKey}`;
  
  const response = await fetch(url);
  const imageBuffer = await response.arrayBuffer();
  
  return new NextResponse(imageBuffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600', // 快取 1 小時
    },
  });
}

// 前端使用
const aqiLayer = new google.maps.ImageMapType({
  getTileUrl: (coord, zoom) => {
    return `/api/air-quality/heatmap-tile/${zoom}/${coord.x}/${coord.y}?type=UNIVERSAL_AQI`;
  },
  tileSize: new google.maps.Size(256, 256),
  opacity: 0.6
});
```

### 多圖層切換

```typescript
export function AirQualityHeatmap() {
  const map = useMap();
  const [mapType, setMapType] = useState<'UNIVERSAL_AQI' | 'PM25_24H' | 'OZONE_8H'>('UNIVERSAL_AQI');

  useEffect(() => {
    if (!map) return;

    const layer = new google.maps.ImageMapType({
      getTileUrl: (coord, zoom) => {
        return `/api/air-quality/heatmap-tile/${zoom}/${coord.x}/${coord.y}?type=${mapType}`;
      },
      tileSize: new google.maps.Size(256, 256),
      opacity: 0.6
    });

    map.overlayMapTypes.push(layer);

    return () => {
      const index = map.overlayMapTypes.getArray().indexOf(layer);
      if (index !== -1) map.overlayMapTypes.removeAt(index);
    };
  }, [map, mapType]);

  return (
    <div className="map-controls">
      <select value={mapType} onChange={(e) => setMapType(e.target.value as any)}>
        <option value="UNIVERSAL_AQI">通用 AQI</option>
        <option value="PM25_24H">PM2.5</option>
        <option value="OZONE_8H">臭氧</option>
      </select>
    </div>
  );
}
```

### 優點

- ✅ **最佳視覺效果** - 平滑漸層
- ✅ **性能最佳** - 圖層自動快取
- ✅ **成本可控** - 不按點數計費
- ✅ **覆蓋完整** - 整個區域都有數據
- ✅ **易於實現** - Google 處理好數據

### 缺點

- ❌ 無法獲取具體數值（只有視覺表現）
- ❌ 更新頻率由 Google 控制

### 成本估算

```
Heatmap Tiles 計價：
- 按圖層載入次數計費
- 通常比多次 API 查詢便宜
- 具體價格請參考 Google Cloud 定價

估算：
- 用戶載入地圖 = 載入約 20-50 個圖磚
- 每個圖磚快取 1 小時
- 成本顯著低於多點查詢
```

---

## 🎯 推薦策略組合

### 組合 A: 熱力圖 + 單點查詢（最佳）

```
1. 默認顯示熱力圖層
   └─ 用戶看到整個區域的色彩分佈
   
2. 用戶點擊地圖 → 查詢該點詳細數據
   └─ 顯示 popup 包含：
      - 精確 AQI 數值
      - 各污染物濃度
      - 健康建議
```

**優點**: 兼顧視覺效果和詳細數據，成本可控

### 組合 B: 網格 + 熱力圖（完美體驗）

```
1. 背景顯示熱力圖
   └─ 提供整體視覺感受
   
2. 前景顯示網格標記（3x3 或重要地點）
   └─ 顯示具體 AQI 數值
   
3. 點擊標記 → 顯示詳細資訊
```

**優點**: 最佳用戶體驗，但成本較高

### 組合 C: 預設地點 + 搜尋（經濟實用）

```
1. 預先定義重要地點（如各行政區中心）
   └─ 啟動時只載入 10-20 個固定點
   
2. 用戶搜尋特定地址
   └─ 動態查詢該地址的空氣品質
   
3. 可選：添加熱力圖作為背景
```

**優點**: 成本最低，適合預算有限

---

## 📐 實際建議

### 台灣範例（台中市）

```typescript
// 台中市重要監測點
const taichungLocations = [
  { name: "西屯區", lat: 24.1819, lng: 120.6396 },
  { name: "北屯區", lat: 24.1808, lng: 120.7046 },
  { name: "南屯區", lat: 24.1381, lng: 120.6422 },
  { name: "中區", lat: 24.1439, lng: 120.6801 },
  { name: "東區", lat: 24.1371, lng: 120.7036 },
  { name: "南區", lat: 24.1173, lng: 120.6484 },
  { name: "北區", lat: 24.1565, lng: 120.6809 },
  { name: "西區", lat: 24.1402, lng: 120.6730 }
];

// 啟動時只查詢這 8 個點 = 8 次 API 調用
```

### 縮放級別建議

| Zoom 級別 | 視野範圍 | 建議策略 | 點數 |
|-----------|---------|---------|------|
| 5-8 | 整個國家 | 單點或熱力圖 | 1 |
| 9-11 | 縣市 | 熱力圖 + 固定點 | 4-9 |
| 12-14 | 城市/區 | 熱力圖 + 網格 3x3 | 9 |
| 15-17 | 街區 | 熱力圖 + 網格 5x5 | 25 |
| 18+ | 街道 | 熱力圖 + 點擊查詢 | 按需 |

---

## 💰 成本對比總結

### 假設場景：10,000 月活用戶

| 策略 | API 調用次數/月 | 估算成本 |
|------|----------------|---------|
| 策略 1: 單點 | 10,000 | $50 |
| 策略 2: 網格 3x3 | 90,000 | $450 |
| 策略 2: 網格 5x5 | 250,000 | $1,250 |
| 策略 3: 熱力圖 | 圖層載入 | $100-200 |
| **組合 A** | 30,000 | **$150-200** ⭐ 推薦 |

---

## 🚀 實施建議

### Phase 1 (MVP)
```typescript
✅ 使用熱力圖層作為背景
✅ 用戶點擊查詢單點詳細數據
✅ 顯示用戶當前位置的空氣品質
```

### Phase 2 (優化)
```typescript
✅ 添加 3-5 個預設重要地點的標記
✅ 實現地點搜尋功能
✅ 添加圖層切換（AQI/PM2.5/臭氧）
```

### Phase 3 (完整)
```typescript
✅ 實現動態網格（根據縮放調整密度）
✅ 添加快取優化
✅ 實現批量查詢 API
```

---

## 📝 總結

**最佳實踐**：

1. **默認使用熱力圖層** - 視覺效果好，成本低
2. **按需查詢詳細數據** - 用戶點擊或搜尋時才調用 API
3. **實施快取策略** - 相同位置 5-10 分鐘內不重複查詢
4. **防抖地圖移動** - 用戶停止移動 1 秒後才查詢
5. **根據縮放調整策略** - 近距離用網格，遠距離用熱力圖

**關鍵數字**：
- Zoom < 12: 熱力圖 + 0-4 個點
- Zoom 12-14: 熱力圖 + 9 個點（3x3）
- Zoom 15+: 熱力圖 + 按需查詢

這樣既能提供良好的視覺體驗，又能控制 API 成本！🎉
