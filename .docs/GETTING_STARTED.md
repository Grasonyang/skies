# 🚀 Skies 快速啟動指南

## 📋 當前進度

### ✅ 已完成的功能（Phase 1 - Week 1）

#### Day 1-2: 位置獲取 ✅
- [x] 創建 `hooks/useGeolocation.ts` - 三層降級策略
- [x] 實現 GPS → IP → 預設台北的位置獲取
- [x] 創建 `LoadingSpinner.tsx` - 載入動畫組件
- [x] 創建 `LocationStatus.tsx` - 位置狀態顯示
- [x] 更新 `app/page.tsx` 整合位置功能

#### Day 3-4: API Routes ✅
- [x] 創建 `services/airQualityService.ts` - Google API 服務封裝
- [x] 創建 `services/cacheService.ts` - 快取服務
- [x] 創建 `app/api/air-quality/current/route.ts` - API 路由
- [x] 配置環境變數範本（.env.example）
- [x] 實現完整的錯誤處理

#### Day 5-7: 熱力圖與查詢 ✅
- [x] 創建 `components/map/HeatmapLayer.tsx` - 熱力圖層
- [x] 創建 `hooks/useAirQuality.ts` - 空氣品質數據獲取
- [x] 創建 `components/AirQualityPanel.tsx` - 數據面板
- [x] 整合到主地圖組件
- [x] 創建完整的類型定義和工具函數

---

## 🎯 下一步工作（Phase 1 - Week 2）

### Week 2: 優化體驗

#### 任務清單
- [ ] 地圖移動追蹤（防抖 1 秒）
- [ ] 動態網格顯示（根據 Zoom）
- [ ] 點擊查詢功能
- [ ] 地點搜尋（Google Places）
- [ ] 快取性能優化

---

## 🚀 如何啟動專案

### 1. 環境設置

確保您已經安裝了依賴：

```bash
npm install
```

### 2. 配置 API Keys

**重要**: 您需要獲取 Google API Keys 才能運行專案。

#### 獲取 Google Maps API Key

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 創建新專案或選擇現有專案
3. 啟用以下 API：
   - **Maps JavaScript API** ⭐ 必須
   - **Places API**（可選，未來搜尋功能需要）
4. 在「憑證」中創建 API Key
5. 設定限制（推薦）：
   - 應用程式限制：HTTP 引用者（網站）
   - 新增引用者：`http://localhost:3000/*`（開發環境）

#### 獲取 Google Air Quality API Key

1. 在同一個 Google Cloud 專案中
2. 啟用 **Air Quality API** ⭐ 必須
3. 可以使用同一個 API Key，或創建新的專用 Key
4. 注意：Air Quality API 有使用配額
   - 前 10,000 次/月免費
   - 之後 $5/1000 次

#### 設定環境變數

```bash
# 複製範例檔案
cp .env.example .env.local

# 編輯 .env.local，填入您的 API Keys
nano .env.local
```

`.env.local` 內容：
```env
# 替換為您的實際 API Key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...你的Maps_API_Key

# 可以使用相同的 Key，或使用專用的 Air Quality API Key
GOOGLE_AIR_QUALITY_API_KEY=AIzaSy...你的Air_Quality_API_Key

NODE_ENV=development
```

### 3. 啟動開發伺服器

```bash
npm run dev
```

成功啟動後，您會看到：

```
▲ Next.js 15.5.4
- Local:        http://localhost:3000
- Environments: .env.local

✓ Starting...
✓ Ready in 2.3s
```

### 4. 訪問應用

打開瀏覽器訪問：
```
http://localhost:3000
```

### 5. 測試功能

#### 測試位置獲取
1. 打開應用時，瀏覽器會請求位置權限
2. **允許權限** → 顯示 🛰️ GPS 定位
3. **拒絕權限** → 自動降級到 🌐 IP 定位
4. **IP 失敗** → 使用 📍 預設位置（台北）

#### 測試空氣品質 API
在終端機中測試 API 端點：

```bash
# 測試台北市中心
curl "http://localhost:3000/api/air-quality/current?lat=25.033&lng=121.5654"

# 預期回應
{
  "aqi": 42,
  "category": "Good air quality",
  "dominantPollutant": "pm25",
  "pollutants": [...],
  "timestamp": "2025-01-04T...",
  "location": {
    "lat": 25.033,
    "lng": 121.5654
  }
}
```

#### 測試熱力圖層
1. 地圖載入後，應該看到覆蓋的顏色圖層
2. 不同顏色代表不同的空氣品質等級：
   - 🟢 綠色：良好 (0-50)
   - 🟡 黃色：普通 (51-100)
   - 🟠 橘色：對敏感族群不健康 (101-150)
   - 🔴 紅色：不健康 (151-200)
   - 🟣 紫色：非常不健康 (201-300)
   - 🟤 褐色：危險 (301+)

---

## 🐛 故障排除

### 問題 1: "Google Maps API key is not configured"

**原因**: 環境變數未正確設定

**解決方案**:
```bash
# 檢查 .env.local 是否存在
ls -la .env.local

# 確認內容
cat .env.local

# 重啟開發伺服器
npm run dev
```

### 問題 2: 地圖顯示空白

**原因**: API Key 無效或未啟用相關 API

**解決方案**:
1. 檢查 Google Cloud Console
2. 確認已啟用 **Maps JavaScript API**
3. 確認 API Key 沒有限制或限制正確
4. 查看瀏覽器控制台的錯誤訊息

### 問題 3: 空氣品質數據無法載入

**原因**: Air Quality API Key 問題

**解決方案**:
1. 確認已啟用 **Air Quality API**
2. 檢查 `GOOGLE_AIR_QUALITY_API_KEY` 是否正確
3. 查看終端機的錯誤日誌
4. 測試 API 端點：
```bash
curl "http://localhost:3000/api/air-quality/current?lat=25.033&lng=121.5654"
```

### 問題 4: 位置獲取一直失敗

**原因**: GPS 和 IP 定位都失敗

**解決方案**:
- 系統會自動使用預設位置（台北）
- 不影響其他功能使用
- 您可以手動移動地圖到想查詢的位置

### 問題 5: 熱力圖層不顯示

**可能原因**:
1. 網路連線問題
2. API Key 限制

**解決方案**:
```javascript
// 檢查瀏覽器控制台
// 應該看到：
console.log('🎨 載入熱力圖層...')
console.log('✅ 熱力圖層已載入')

// 如果看到錯誤，檢查：
// 1. NEXT_PUBLIC_GOOGLE_MAPS_API_KEY 是否正確
// 2. API Key 是否允許 Heatmap Tiles API
```

---

## 📊 查看日誌

### 瀏覽器控制台日誌

打開瀏覽器開發者工具 (F12)，在 Console 中查看：

```
🗺️ Maps API 已載入
🛰️ 嘗試 GPS 定位...
✅ GPS 定位成功: {lat: 25.033, lng: 121.565, ...}
🎨 載入熱力圖層...
✅ 熱力圖層已載入
🌤️ 獲取空氣品質數據: (25.033, 121.565)
✅ 空氣品質數據獲取成功
```

### 伺服器終端日誌

在運行 `npm run dev` 的終端中查看：

```
📡 收到空氣品質查詢請求: (25.033, 121.565)
🌐 調用 Google API: (25.033, 121.565)
💾 快取設定: aqi:25.03:121.57 (TTL: 300s)
✅ 返回數據
```

---

## 🎨 用戶體驗亮點

### 1. 流暢的載入體驗
- 精美的載入動畫
- 清晰的狀態提示
- 三個點的跳動效果

### 2. 直觀的位置顯示
- 彩色標籤顯示定位方式
- 顯示定位精度
- 使用表情符號增強視覺效果

### 3. 豐富的空氣品質面板
- 大號 AQI 數值顯示
- 動態顏色根據等級變化
- 顯示主要污染物
- 列出各污染物濃度
- 顯示更新時間和位置

### 4. 互動式熱力圖
- 覆蓋整個地圖區域
- 顏色直觀表示空氣品質
- 半透明設計不影響地圖閱讀

---

## 📈 性能指標

### 當前實現的優化

✅ **快取機制**
- TTL: 5 分鐘
- 記憶體快取
- 自動清理過期數據

✅ **API 調用優化**
- 坐標四捨五入（約 1km）
- 避免重複查詢
- 批量查詢支援

✅ **載入性能**
- 懶加載組件
- React 19 優化
- Turbopack 構建

### 預期性能

- 首屏載入：< 3 秒
- API 響應：< 1 秒
- 快取命中率：> 60%
- 地圖交互：< 100ms

---

## 🔜 下一步計劃

### Week 2 重點功能

1. **地圖移動追蹤**
   - 1 秒防抖
   - 自動更新查詢位置
   - 根據縮放級別決定是否查詢

2. **動態網格顯示**
   - Zoom 12-13: 3x3 網格
   - Zoom 14-15: 5x5 網格
   - Zoom 16+: 按需查詢

3. **點擊查詢功能**
   - 點擊地圖任意位置
   - 顯示該點空氣品質
   - 更新面板數據

4. **地點搜尋**
   - 整合 Google Places API
   - 自動完成建議
   - 跳轉到選中位置

---

## 💡 開發提示

### 有用的指令

```bash
# 開發模式
npm run dev

# 生產構建
npm run build

# 啟動生產伺服器
npm run start

# 檢查程式碼
npm run lint

# 格式化程式碼
npm run format
```

### 推薦的 VS Code 擴展

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Vue Plugin (Volar)

---

## 📚 相關文檔

- [完整計劃 (plan.md)](.docs/plan.md)
- [架構設計 (architectrue.md)](.docs/architectrue.md)
- [數據策略 (data-display-strategies.md)](.docs/data-display-strategies.md)
- [API 範例 (api-implementation-example.md)](.docs/api-implementation-example.md)

---

**需要幫助？** 查看 README.md 或開啟 Issue！

**準備好了嗎？** 執行 `npm run dev` 開始開發！ 🚀
