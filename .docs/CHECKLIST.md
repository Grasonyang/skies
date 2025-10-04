# ✅ Skies 專案啟動檢查清單

## 📋 啟動前檢查

### 1. 環境設置 ✅

- [x] Node.js 已安裝（20+）
- [x] 依賴已安裝 (`npm install`)
- [x] .env.local 文件已創建

### 2. API Keys 配置 ⚠️

需要手動配置：

- [ ] **NEXT_PUBLIC_GOOGLE_MAPS_API_KEY**
  - 前往: https://console.cloud.google.com/
  - 啟用: Maps JavaScript API
  - 創建 API Key
  - 複製到 .env.local

- [ ] **GOOGLE_AIR_QUALITY_API_KEY**
  - 在同一專案中
  - 啟用: Air Quality API
  - 可使用相同 Key 或創建新的
  - 複製到 .env.local

### 3. 檔案結構檢查 ✅

```
✅ src/types/index.ts
✅ src/lib/constants.ts
✅ src/lib/utils.ts
✅ src/hooks/useGeolocation.ts
✅ src/hooks/useAirQuality.ts
✅ src/services/airQualityService.ts
✅ src/services/cacheService.ts
✅ src/components/LoadingSpinner.tsx
✅ src/components/LocationStatus.tsx
✅ src/components/AirQualityPanel.tsx
✅ src/components/map.tsx
✅ src/components/map/HeatmapLayer.tsx
✅ src/app/api/air-quality/current/route.ts
✅ src/app/page.tsx
✅ .env.example
```

---

## 🚀 啟動步驟

### 步驟 1: 確認環境變數

```bash
# 檢查 .env.local 是否存在
cat .env.local

# 應該包含（替換為實際的 Key）:
# NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
# GOOGLE_AIR_QUALITY_API_KEY=AIzaSy...
```

### 步驟 2: 啟動開發伺服器

```bash
npm run dev
```

### 步驟 3: 驗證啟動

預期輸出：
```
▲ Next.js 15.5.4
- Local:        http://localhost:3000
- Environments: .env.local

✓ Starting...
✓ Ready in 2-3s
```

### 步驟 4: 開啟瀏覽器

訪問: http://localhost:3000

---

## 🧪 功能測試清單

### 測試 1: 位置獲取 ✅

**預期行為：**
1. 頁面載入時顯示載入動畫
2. 瀏覽器請求位置權限
3. 地圖自動定位到用戶位置

**檢查點：**
- [ ] 載入動畫顯示
- [ ] 位置權限提示出現
- [ ] 地圖成功載入
- [ ] 左上角顯示定位狀態
  - 🛰️ GPS（允許定位）
  - 🌐 IP（拒絕定位）
  - 📍 預設（IP 失敗）

**瀏覽器控制台日誌：**
```
🗺️ Maps API 已載入
🛰️ 嘗試 GPS 定位...
✅ GPS 定位成功: {lat: ..., lng: ..., source: 'gps'}
```

---

### 測試 2: 地圖顯示 ✅

**預期行為：**
1. 地圖中心點在用戶位置
2. 縮放級別適當（12-15）
3. 地圖可拖動、縮放

**檢查點：**
- [ ] 地圖正確顯示
- [ ] 地圖可以拖動
- [ ] 縮放按鈕可用
- [ ] 地圖類型切換可用

**瀏覽器控制台日誌：**
```
📍 地圖移動: center: {lat: ..., lng: ...} zoom: 13
```

---

### 測試 3: 熱力圖層 ✅

**預期行為：**
1. 地圖上覆蓋半透明顏色圖層
2. 不同顏色代表不同空氣品質
3. 熱力圖隨地圖移動更新

**檢查點：**
- [ ] 熱力圖層顯示
- [ ] 顏色清晰可見
- [ ] 移動地圖時熱力圖正確更新

**顏色對應：**
- 🟢 綠色: AQI 0-50 (良好)
- 🟡 黃色: AQI 51-100 (普通)
- 🟠 橘色: AQI 101-150 (對敏感族群不健康)
- 🔴 紅色: AQI 151-200 (不健康)
- 🟣 紫色: AQI 201-300 (非常不健康)
- 🟤 褐色: AQI 301+ (危險)

**瀏覽器控制台日誌：**
```
🎨 載入熱力圖層...
✅ 熱力圖層已載入
```

---

### 測試 4: 空氣品質數據 ✅

**預期行為：**
1. 右上角顯示空氣品質面板
2. 顯示當前位置的 AQI 數值
3. 顯示主要污染物
4. 顯示污染物濃度

**檢查點：**
- [ ] 面板正確顯示
- [ ] AQI 數值顯示
- [ ] 數值顏色根據等級變化
- [ ] 等級標籤顯示（良好/普通/不健康等）
- [ ] 主要污染物標示
- [ ] 污染物濃度列表
- [ ] 更新時間顯示
- [ ] 位置坐標顯示

**瀏覽器控制台日誌：**
```
🌤️ 獲取空氣品質數據: (25.033, 121.565)
✅ 空氣品質數據獲取成功: {aqi: 42, ...}
```

**伺服器終端日誌：**
```
📡 收到空氣品質查詢請求: (25.033, 121.565)
🌐 調用 Google API: (25.033, 121.565)
💾 快取設定: aqi:25.03:121.57 (TTL: 300s)
```

---

### 測試 5: API 端點 ✅

**直接測試 API：**

```bash
# 測試當前空氣品質 API
curl "http://localhost:3000/api/air-quality/current?lat=25.033&lng=121.5654"
```

**預期回應：**
```json
{
  "aqi": 42,
  "category": "Good air quality",
  "dominantPollutant": "pm25",
  "pollutants": [
    {
      "code": "pm25",
      "displayName": "PM2.5",
      "fullName": "Fine particulate matter (<2.5µm)",
      "concentration": {
        "value": 10.5,
        "units": "µg/m³"
      }
    }
  ],
  "timestamp": "2025-01-04T...",
  "location": {
    "lat": 25.033,
    "lng": 121.5654
  }
}
```

**檢查 HTTP 頭：**
```bash
curl -I "http://localhost:3000/api/air-quality/current?lat=25.033&lng=121.5654"
```

**預期回應頭：**
```
HTTP/1.1 200 OK
Cache-Control: public, s-maxage=300, stale-while-revalidate=60
X-Cache: HIT  # 或 MISS（首次請求）
```

---

### 測試 6: 快取機制 ✅

**測試步驟：**

1. 首次請求（應該調用 Google API）
```bash
curl "http://localhost:3000/api/air-quality/current?lat=25.03&lng=121.57"
```

**檢查伺服器日誌：**
```
📡 收到空氣品質查詢請求: (25.03, 121.57)
🌐 調用 Google API: (25.03, 121.57)
💾 快取設定: aqi:25.03:121.57 (TTL: 300s)
```

2. 立即第二次請求（應該返回快取）
```bash
curl "http://localhost:3000/api/air-quality/current?lat=25.03&lng=121.57"
```

**檢查伺服器日誌：**
```
📡 收到空氣品質查詢請求: (25.03, 121.57)
✅ 快取命中: aqi:25.03:121.57
✅ 返回快取數據: aqi:25.03:121.57
```

**檢查點：**
- [ ] 首次請求調用 API（X-Cache: MISS）
- [ ] 第二次請求返回快取（X-Cache: HIT）
- [ ] 5 分鐘後快取過期，重新調用 API

---

## 🐛 常見問題排查

### 問題 1: API Key 錯誤

**症狀：**
- 地圖不顯示
- 控制台顯示 "Google Maps API key is not configured"

**解決方案：**
```bash
# 檢查 .env.local
cat .env.local

# 確認包含
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_key

# 重啟伺服器
npm run dev
```

---

### 問題 2: 空氣品質數據無法載入

**症狀：**
- 面板顯示錯誤
- 伺服器日誌顯示 API 調用失敗

**可能原因：**
1. Air Quality API 未啟用
2. API Key 無效
3. API 配額用完

**解決方案：**
```bash
# 測試 API 端點
curl "http://localhost:3000/api/air-quality/current?lat=25.033&lng=121.5654"

# 檢查回應
# 如果是 500 錯誤，檢查伺服器日誌
# 如果是 403 錯誤，檢查 API Key 和權限
```

**檢查 Google Cloud Console：**
1. API 已啟用：Air Quality API
2. API Key 有效
3. API Key 沒有限制或限制正確
4. 配額未超限

---

### 問題 3: 熱力圖層不顯示

**症狀：**
- 地圖顯示正常
- 但沒有顏色覆蓋層

**可能原因：**
1. API Key 權限問題
2. 網路連線問題

**解決方案：**
```javascript
// 檢查瀏覽器控制台
// 應該看到：
🎨 載入熱力圖層...
✅ 熱力圖層已載入

// 如果看到錯誤，檢查：
// 1. NEXT_PUBLIC_GOOGLE_MAPS_API_KEY 是否正確
// 2. API Key 是否允許 Maps JavaScript API
// 3. 網路連線是否正常
```

---

### 問題 4: 位置獲取失敗

**症狀：**
- 一直顯示載入動畫
- 或直接顯示預設位置

**解決方案：**
- GPS 失敗：正常，系統會降級到 IP 定位
- IP 失敗：正常，系統會使用預設位置（台北）
- 不影響功能使用，可以手動移動地圖

---

## 📊 性能檢查

### 檢查點 1: 首屏載入時間

**目標：< 3 秒**

**測試方法：**
1. 開啟無痕模式（清除快取）
2. 訪問 http://localhost:3000
3. 開啟開發者工具 → Network 標籤
4. 記錄 DOMContentLoaded 時間

**優化建議：**
- 如果 > 3 秒，檢查網路連線
- 確保圖片和資源已優化
- 使用生產構建測試

---

### 檢查點 2: API 響應時間

**目標：< 1 秒（首次）、< 100ms（快取）**

**測試方法：**
```bash
# 首次請求（無快取）
time curl "http://localhost:3000/api/air-quality/current?lat=25.033&lng=121.5654"

# 第二次請求（有快取）
time curl "http://localhost:3000/api/air-quality/current?lat=25.033&lng=121.5654"
```

---

### 檢查點 3: 記憶體使用

**測試方法：**
1. 開啟開發者工具 → Performance 標籤
2. 開始記錄
3. 使用應用 1-2 分鐘
4. 停止記錄
5. 檢查記憶體趨勢

**預期：**
- 記憶體使用穩定
- 無明顯記憶體洩漏
- 快取正確清理

---

## ✅ 完整功能檢查清單

### 核心功能
- [ ] 自動位置獲取（GPS/IP/預設）
- [ ] 地圖顯示和互動
- [ ] 熱力圖層顯示
- [ ] 空氣品質數據查詢
- [ ] 數據面板顯示

### 用戶體驗
- [ ] 載入動畫流暢
- [ ] 位置狀態清晰
- [ ] 錯誤提示友好
- [ ] 響應式設計
- [ ] 視覺效果良好

### 技術指標
- [ ] 無編譯錯誤
- [ ] 無控制台錯誤
- [ ] API 調用成功
- [ ] 快取機制運作
- [ ] 性能達標

---

## 🎉 啟動成功標誌

如果您看到以下畫面，恭喜！專案已成功啟動：

### 瀏覽器畫面
```
┌─────────────────────────────────────┐
│ 🛰️ GPS 定位 (精度: 15m)           │  ← 左上角
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│     空氣品質指數 (AQI)              │
│                                     │
│           42                        │  ← 大號綠色數字
│       ━━━━━━━                       │
│        良好                         │  ← 綠色標籤
│                                     │
│  主要污染物：PM2.5                  │
│                                     │
│  污染物濃度                         │
│  PM2.5    10.5 µg/m³               │  ← 右上角
│  PM10     15.2 µg/m³               │
│  O3       45.0 µg/m³               │
│  NO2      12.3 µg/m³               │
│                                     │
│  更新時間：2025-01-04 14:23        │
│  📍 25.0330, 121.5654              │
└─────────────────────────────────────┘

         [地圖區域 + 熱力圖層]

┌─────────────────────────────────────┐
│   📊 空氣品質監測系統 v1.0          │  ← 底部中央
└─────────────────────────────────────┘
```

### 控制台日誌
```
🗺️ Maps API 已載入
🛰️ 嘗試 GPS 定位...
✅ GPS 定位成功
🎨 載入熱力圖層...
✅ 熱力圖層已載入
🌤️ 獲取空氣品質數據
✅ 空氣品質數據獲取成功
```

### 伺服器終端
```
📡 收到空氣品質查詢請求: (25.033, 121.565)
🌐 調用 Google API
💾 快取設定: aqi:25.03:121.57
```

---

## 📞 需要幫助？

### 資源連結
- 📖 [完整計劃](plan.md)
- 🚀 [快速啟動指南](GETTING_STARTED.md)
- 📊 [專案總結](SUMMARY.md)
- 📝 [README](../README.md)

### 問題回報
如果遇到問題：
1. 檢查本清單的故障排查部分
2. 查看控制台和伺服器日誌
3. 開啟 GitHub Issue

---

**檢查清單版本**: 1.0  
**最後更新**: 2025-01-04  
**適用版本**: Skies v1.0 (Phase 1 Week 1)
