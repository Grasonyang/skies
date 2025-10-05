# AeroSense - 空氣品質決策系統 🌤️
### 🎯 核心功能
1. **🗺️ 即時空氣品質地圖**
   - 互動式地圖介面
   - 熱力圖層顯示區域污染分布
   - 自動定位 (GPS/IP)

2. **🔮 AI 空氣品質預測**
   - 未來 24 小時預測
   - 信心度評分 (高/中/低)
   - 波動性分析

3. **🎯 活動決策系統** ⭐ 
   - 5 種常見戶外活動風險評估
   - 個人化建議與最佳時段推薦
   - 基於污染物組成的智能評分

4. **🎯 Scenario Studio（情境實驗室）** ⭐ 新功能
   - 24 小時活動劇本生成
   - 自動尋找附近場域（公園、運動中心等）
   - AI 智能建議（支援 Vertex AI Gemini 與 fallback）
   - 視覺化時間軸與風險燈號

5. **🚇 Commute Guardian（通勤守護）**
   - 路線 AQI 批次取樣
   - 安全/警示/危險顏色分級
   - 多路線比較與建議

6. **💚 健康建議**
   - 針對不同族群的個人化建議
   - 口罩配戴建議
   - 症狀警示lity API**、**Google Maps** 和 **Next.js** 構建的即時空氣品質監測與智能決策平台。

> 📘 **完整文檔**: 
> - [**Stage 1 完成總結 (stage1-completion-summary.md)**](.docs/stage1-completion-summary.md) - ✅ 核心任務完成 ⭐
> - [**使用者指南 (user-guide.md)**](.docs/user-guide.md) - 完整使用說明 📖
> - [**專案規劃 (plan.md)**](.docs/plan.md) - 所有設計、架構、實現計劃
> - [架構設計 (architectrue.md)](.docs/architectrue.md) - 系統架構詳細說明
> - [數據策略 (data-display-strategies.md)](.docs/data-display-strategies.md) - 成本分析與優化

## 🎉 Stage 1 已完成！

**完成日期**: 2025-01-05  
**狀態**: ✅ MVP 核心功能已上線

### 已實現功能
- ✅ **ENV-SETUP**: 完整環境配置、Tailwind CSS、API Key 驗證
- ✅ **AQ-FETCH**: 即時空氣品質數據 + 24 小時 AI 預測
- ✅ **RISK-MATRIX-MVP**: 智能活動決策系統（5 個活動模板）

查看詳細完成報告: [Stage 1 完成總結](.docs/stage1-completion-summary.md)

## 📋 專案概述

AeroSense 不只是空氣品質監測工具，更是您的**戶外活動智能決策助手**：

### 🎯 核心功能
1. **🗺️ 即時空氣品質地圖**
   - 互動式地圖介面
   - 熱力圖層顯示區域污染分布
   - 自動定位 (GPS/IP)

2. **� AI 空氣品質預測**
   - 未來 24 小時預測
   - 信心度評分 (高/中/低)
   - 波動性分析

3. **🎯 活動決策系統** ⭐ 新功能
   - 5 種常見戶外活動風險評估
   - 個人化建議與最佳時段推薦
   - 基於污染物組成的智能評分

4. **💚 健康建議**
   - 針對不同族群的個人化建議
   - 口罩配戴建議
   - 症狀警示

### 🌟 獨特價值
- **即時決策**: 3 秒內完成活動風險評估
- **科學基礎**: 基於污染物權重的硬編碼 RiskScore 算法
- **用戶友善**: 直觀的風險燈號與卡片 UI
- **智能推薦**: 自動尋找最佳活動時間窗口

### 🆕 創新互動
- **社群「發起討論」按鈕**：整合 Twitter/Facebook 分享參數，一鍵擴散 NASA EarthData 洞察。
- **AI 媒體中心**：LLM Agent 將資料轉譯成科學家、市長、民眾三層摘要。
- **行動倒數計時**：以集體目標與進度條遊戲化，催化公民行動。

## 🎯 核心設計

### 用戶體驗流程
```
用戶打開網頁
    ↓
自動獲取位置 (GPS → IP → 預設台北)
    ↓
顯示地圖 (Zoom 13，區域級別)
    ↓
載入熱力圖層 + 查詢中心點數據
    ↓
用戶互動：移動地圖 / 點擊查詢 / 搜尋地點
```

詳細流程請查看：[用戶互動流程設計](.docs/user-interaction-flow.md)

### 數據顯示策略
```
熱力圖層 (區域概況)
    +
動態網格 (精確數據)
    +
按需查詢 (用戶點擊)
    +
快取優化 (5-10 分鐘)
```

詳細說明請查看：[數據顯示策略](.docs/data-display-strategies.md)

## 🏗️ 技術棧

- **前端框架**: Next.js 15.5.4 (App Router)
- **UI 庫**: React 19.1.0
- **地圖服務**: @vis.gl/react-google-maps
- **樣式**: Tailwind CSS 4.1.14
- **語言**: TypeScript 5
- **API 整合**: 
  - Google Maps JavaScript API
  - Google Air Quality API

## 🔑 核心架構特點

### 安全的數據獲取架構

```
前端組件 → Next.js API Routes → Google Air Quality API
         (公開訪問)          (API Key 安全存儲)
```

**為什麼不在前端直接調用 Google API？**

❌ **錯誤做法**：
- API Key 會暴露在瀏覽器中
- 任何人都可以查看和濫用
- 無法控制請求頻率
- 成本無法控制

✅ **正確做法**：
- 使用 Next.js API Routes 作為後端代理
- API Key 安全存儲在伺服器環境變量
- 實施快取和速率限制
- 完整的錯誤處理和監控

詳細說明請查看：[數據流向圖](.docs/data-flow-diagram.md)

## 🚀 快速開始

### 前置要求

- Node.js 20+
- npm/yarn/pnpm
- Google Cloud Platform 帳號
- Google Maps API Key
- Google Air Quality API Key

### 1. 克隆專案

```bash
git clone https://github.com/Grasonyang/skies.git
cd skies
```

### 2. 安裝依賴

```bash
npm install
```

### 3. 配置環境變量

創建 `.env.local` 文件：

```bash
# Google Maps API Key (會暴露到前端，用於地圖初始化)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_api_key_here

# 分享入口網址（若未設定，預設使用 window.location.href）
NEXT_PUBLIC_APP_SHARE_URL=https://your-app-url

# 行動倒數模擬參數（可選）
NEXT_PUBLIC_ACTION_GOAL=1000
NEXT_PUBLIC_ACTION_INITIAL=120
NEXT_PUBLIC_ACTION_SIMULATE=true

# Google API Key（伺服器端使用：Air Quality、Places、Directions、Geocode 等）
GOOGLE_API_KEY=your_google_api_key_here

# OpenAI Key（多級別摘要 Agent）
OPENAI_API_KEY=your_openai_key_here
# 可選：自訂使用模型
OPENAI_BRIEFING_MODEL=gpt-4o-mini

# 環境
NODE_ENV=development
```

> 如需啟用 Scenario Studio 的 Gemini 建議，額外設定 `GOOGLE_GEMINI_API_KEY`、`GOOGLE_CLOUD_PROJECT_ID` 與 `GOOGLE_CLOUD_LOCATION`。
```

> 💡 **提示**: 可以參考 `.env.example` 文件

### 4. 獲取 API Keys

#### Google Maps API Key

1. 訪問 [Google Cloud Console](https://console.cloud.google.com/)
2. 創建新專案或選擇現有專案
3. 啟用 **Maps JavaScript API**
4. 創建 API Key
5. 設置 API Key 限制（建議限制 HTTP referrers）

#### Google Air Quality API Key

1. 在同一個 Google Cloud 專案中
2. 啟用 **Air Quality API**
3. 可以使用同一個 API Key 或創建新的
4. 設置適當的配額限制

#### Google Gemini API Key（可選）

如果要使用 Scenario Studio 的 AI 智能建議功能：

1. 訪問 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 創建 API Key
3. 設置為 `GOOGLE_GEMINI_API_KEY` 環境變數
4. 如果不設置，系統會自動使用 fallback 模板建議

詳細設置指南：[API 實現範例](.docs/api-implementation-example.md)

### 5. 啟動開發伺服器

```bash
npm run dev
```

打開 [http://localhost:3000](http://localhost:3000) 查看應用。

### 6. 測試 API

```bash
# 測試空氣品質 API
curl "http://localhost:3000/api/air-quality/current?lat=24.23321&lng=120.9417"
```

## 📁 專案結構

```
/workspace/dev/skies/
├── .docs/                          # 📚 文檔
│   ├── architectrue.md             # 完整架構設計
│   ├── api-implementation-example.md  # API 實現範例
│   └── data-flow-diagram.md        # 數據流向圖
│
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── api/                    # API Routes（後端）
│   │   │   └── air-quality/
│   │   │       ├── current/route.ts
│   │   │       ├── forecast/route.ts
│   │   │       └── history/route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/                 # React 組件
│   │   ├── map/
│   │   │   └── Map.tsx            # 地圖組件
│   │   └── air-quality/
│   │       └── AQIPanel.tsx       # 空氣品質面板
│   │
│   ├── hooks/                      # 自定義 Hooks
│   │   ├── useAirQuality.ts       # 空氣品質數據
│   │   └── useGeolocation.ts      # 地理定位
│   │
│   ├── services/                   # 服務層
│   │   ├── airQualityService.ts   # 封裝 Google API 調用
│   │   └── cacheService.ts        # 快取管理
│   │
│   └── types/                      # TypeScript 類型
│       └── airQuality.ts
│
├── .env.local                      # 環境變量（不提交）
├── .env.example                    # 環境變量範本
└── package.json
```

## 📖 文檔

- [📐 完整架構設計](.docs/architectrue.md) - 系統架構、模組設計、API 規範
- [💻 API 實現範例](.docs/api-implementation-example.md) - 實際代碼範例、最佳實踐
- [🔄 數據流向圖](.docs/data-flow-diagram.md) - 視覺化架構圖、安全策略
- [📊 數據展示策略](.docs/data-display-strategies.md) - 如何在地圖上展示空氣品質數據 ⭐ 重要
- [🎨 視覺化展示指南](.docs/data-display-visual-guide.md) - 三種策略的視覺對比與實施建議

### 📌 常見問題

#### Q: Google Air Quality API 只能查詢一個點，如何在地圖上展示整個區域？

**A**: 我們採用**熱力圖層 + 按需查詢**的組合策略：

1. **熱力圖層**（主要）- 使用 Google Heatmap Tiles API 顯示整個區域的色彩分佈
2. **單點查詢**（輔助）- 用戶點擊地圖時查詢該位置的詳細數據
3. **網格標記**（可選）- 根據縮放級別顯示重要地點的 AQI 數值

詳細說明請查看：[數據展示策略文檔](.docs/data-display-strategies.md)

**成本對比**：
- 單點查詢：$50/月
- 網格查詢（9個點）：$450/月
- 熱力圖層：$150/月
- **推薦組合**（熱力圖+單點）：**$200/月** ⭐

#### Q: 為什麼不在前端直接調用 Google Air Quality API？

**A**: 安全原因！如果在前端直接調用：
- ❌ API Key 會暴露在瀏覽器中
- ❌ 任何人都可以複製並濫用
- ❌ 無法控制請求頻率和成本
- ❌ 可能導致配額超限和高額費用

**正確做法**：使用 Next.js API Routes 作為後端代理層，API Key 安全存儲在伺服器環境變量中。

詳細說明請查看：[API 實現範例](.docs/api-implementation-example.md)

## 🔒 安全性

### API Key 管理

1. **前端 API Key** (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`)
   - 用於 Google Maps 初始化
   - 會暴露到瀏覽器
   - 應在 Google Console 設置域名限制

2. **後端 API Key** (`GOOGLE_AIR_QUALITY_API_KEY`)
   - 用於 Air Quality API 調用
   - **永遠不會**暴露到前端
   - 僅在 Next.js API Routes 中使用

### 最佳實踐

- ✅ 永遠不要在前端代碼中直接使用 Air Quality API Key
- ✅ 使用 `.gitignore` 忽略 `.env.local`
- ✅ 在 Google Console 設置 API Key 限制
- ✅ 實施速率限制防止濫用
- ✅ 使用快取減少 API 調用成本

## 🚀 部署

### Vercel（推薦）

1. 推送代碼到 GitHub
2. 在 [Vercel](https://vercel.com) 導入專案
3. 設置環境變量：
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
   - `GOOGLE_AIR_QUALITY_API_KEY`
4. 部署！

### 其他平台

- Netlify
- AWS Amplify
- Google Cloud Run

詳細部署指南請查看：[架構文檔 - 部署章節](.docs/architectrue.md#11-部署架構)

## 📊 功能路線圖

### ✅ Stage 1 (MVP) - 已完成
- [x] 基礎地圖展示
- [x] 當前空氣品質查詢
- [x] 24 小時 AI 預測
- [x] 活動風險決策系統 (5 個模板)
- [x] 健康建議系統
- [x] 熱力圖層
- [x] 快取機制

### ✅ Stage 2 - F1, F2, F3 已完成
- [x] Mission Control（AQI 決策主控台）
- [x] Commute Guardian（安全通勤守護）
- [x] Scenario Studio（情境實驗室）⭐ 新功能
  - [x] 24 小時活動劇本生成
  - [x] Places API 場域搜尋整合
  - [x] AI 智能建議（Gemini API + Fallback）
  - [x] 視覺化時間軸組件

### 🚧 Stage 1 - 待啟動 (P1 任務)
- [ ] FINGERPRINT-VIZ - 污染物雷達圖與趨勢迷你圖
- [ ] COMMUTE-ZONES-LITE - 網格取樣上色、路線試繪
- [ ] ACTION-HUD - 風險等級對應行動清單與 CTA
- [ ] DATA-OBS - 封裝 DecisionEngineL1 為獨立函式庫

### 💡 快速創新提案 (可插隊)
- [ ] MICRO-COPY - 情境片語建議 (0.5 天)
- [ ] AQ-MOOD - 動態背景漸層 (0.5 天)
- [ ] HEALTH-TOGGLE - 健康偏好快捷鍵 (1 天)
- [ ] FINGERPRINT-SHARE - 污染指紋分享 (1 天)
- [ ] CAL-HOOK - 行事曆同步 (1 天)

### 🔮 Stage 2 (未來規劃)
- [ ] Agent & TEMPO 整合
- [ ] 高解析網格
- [ ] Decision Engine 後端化
- [ ] 個人化自動化通知

## 🤝 貢獻

歡迎貢獻！請遵循以下步驟：

1. Fork 專案
2. 創建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

## 📝 開發規範

- 使用 TypeScript 嚴格模式
- 遵循 ESLint 配置
- 使用 Prettier 格式化代碼
- Commit 訊息遵循 Conventional Commits

## 🐛 問題回報

如果發現 bug 或有功能建議，請[開啟 Issue](https://github.com/Grasonyang/skies/issues)。

## 📄 授權

MIT License

## 🙏 致謝

- [Google Air Quality API](https://developers.google.com/maps/documentation/air-quality)
- [Google Maps Platform](https://developers.google.com/maps)
- [Next.js](https://nextjs.org/)
- [@vis.gl/react-google-maps](https://visgl.github.io/react-google-maps/)

## 📞 聯繫

專案維護者: [@Grasonyang](https://github.com/Grasonyang)

---

**⚠️ 重要提醒**: 請確保在生產環境中正確配置 API Keys 和安全限制！
