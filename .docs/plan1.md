# Stage 2 行動計畫（plan1）

- [x] **更新日期**：2025-01### F3. Scenario Studio（情境實驗室）
- [x] **目標**：生成 24 小時活動劇本，結合 Places Nearby（校園、公園、運動中心等場域）與 AQI 預測，搭配 Vertex AI Gemini 的微代理敘述，營造 Agent 時代的差異化展示。
- [x] **主要任務**：
  - [x] 新增 `/api/places/nearby` 代理，依活動類型抓取場域座標。
  - [x] 建立 `useScenarioStudio` hook：
    - [x] 取樣每個場域的未來 24 小時 AQI。
    - [x] 篩選最佳/最差時段與主污染物劇情。
  - [x] 新增 `/api/agent/recommendation`（Vertex AI Gemini API 代理），輸入活動+AQI 劇本 → 產出自然語言建議。
  - [x] 製作 `ScenarioTimeline` 組件，呈現時間軸、燈號與 Agent 建議。
- [x] **交付標準**：
  - [x] 至少支援三種活動（戶外跑步、親子公園、室內健身）。
  - [x] Vertex AI 回應 < 2 秒；失敗時提供 fallback 文案。
  - [x] Demo 腳本可在一分鐘內完整播放。前階段**：Stage 2 — Agent & TEMPO（暫以 GCP 既有 API 為核心）
- [x] **核心願景**：在無後端支援的前提下，以 Google Air Quality + Maps 生態圈打造「決策性、創新性、可實現性」並重的展示級體驗，鋪好日後 Agent 化與 TEMPO 高解析資料的升級軌道。
- [x] **關鍵限制**：Serverless API Routes 為主要執行環境；不得依賴自建後端服務；所有資料流必須來自 GCP 官方 API。

## 行動原則

- [ ] **可立即展示**：每個功能都需在 Demo 時以 3 分鐘內互動完畢，並能以假資料或快取補齊缺口。
- [ ] **創新優先**：強調與一般 AQI Dashboard 的差異化（Decision Engine、Agent 語意理解、路線守護）。
- [ ] **可升級**：所有邏輯以 hook/service 模式封裝，保留 TEMPO、後端 Decision Engine 與 Edge Agent 的擴充接口。

## 里程碑節奏

| 週次 | 里程碑 | 核心成果 |
|------|--------|----------|
| Week 1 | Mission Control 套件完成 | 單頁整合 AQI 即時狀態、Fingerprint、Action HUD |
| Week 2 | Commute Guardian Demo | 路線 AQI 取樣、通勤區域顏色分級、CTA |
| Week 3 | Scenario Studio + Agent | 24h 活動劇本、Vertex AI 推薦文案、展示錄製 |

## 核心功能工作分解

### F1. Mission Control（AQI 決策主控台）
- [x] **目標**：將 `getCurrentConditions` 與 `getHourlyForecast` 整合成單一控制台卡片，對三個關鍵地點即時輸出 AQI、主要污染物、風險建議。
- [x] **主要任務**：
  - [x] 擴充 `airQualityService` 增加 `getHourlyForecast` 與多點查詢介面；連動快取層策略。
  - [x] 建立 `MissionControlPanel`（整合 `LocationStatus` + `PollutantFingerprintPanel` + `ActionHUDPanel`）。
  - [x] 實作預設三個情境按鈕（工作、親子、運動），切換時觸發批次查詢與動畫過渡。
- [x] **交付標準**：
  - [x] 切換地點至多 1.5 秒完成刷新。
  - [x] Fingerprint 支援即時 vs 未來 6 小時比較。
  - [x] 行動建議 CTA 觸發 console event，預留後續 Agent API。

### F2. Commute Guardian（安全通勤守護）
- [x] **目標**：以 Google Directions + Distance Matrix API 提供兩條備選路線，並沿線批次取樣 AQI，產生「安全/警示/危險」顏色區塊與建議。
- [ ] **主要任務**：
  - [x] 新增 `/api/routes/commute` 代理（Directions、Distance Matrix），整合至 `services/routesService.ts`。
  - [x] 建立 `useCommuteGuardian` hook：切割路線節點 → 觸發 `POST /api/air-quality/current` 批次查詢 → 計算風險分級。
  - [x] 在地圖層擴充 Polygon + Polyline 視覺，並加入 10 分鐘快取與 Loading Skeleton。
- [ ] **交付標準**：
  - [x] 至少支援兩條路線比較，含平均 AQI、最大污染物告警、建議動作。
  - [x] CTA 產生「改走路線 B」、「延後出發時間」等可行建議。
  - [x] API 調用次數控制在 GCP 免費額度內（批次去重 + 防抖）。

### F3. Scenario Studio（情境實驗室）
- [ ] **目標**：生成 24 小時活動劇本，結合 Places Nearby（校園、公園、運動中心等場域）與 AQI 預測，搭配 Vertex AI Gemini 的微代理敘述，營造 Agent 時代的差異化展示。
- [ ] **主要任務**：
  - [ ] 新增 `/api/places/nearby` 代理，依活動類型抓取場域座標。
  - [ ] 建立 `useScenarioStudio` hook：
    - [ ] 取樣每個場域的未來 24 小時 AQI。
    - [ ] 篩選最佳/最差時段與主污染物劇情。
  - [ ] 新增 `/api/agent/recommendation`（Vertex AI Gemini API 代理），輸入活動+AQI 劇本 → 產出自然語言建議。
  - [ ] 製作 `ScenarioTimeline` 組件，呈現時間軸、燈號與 Agent 建議。
- [ ] **交付標準**：
  - [ ] 至少支援三種活動（戶外跑步、親子公園、室內健身）。
  - [ ] Vertex AI 回應 < 2 秒；失敗時提供 fallback 文案。
  - [ ] Demo 腳本可在一分鐘內完整播放。

## 基礎設施與工程任務

- [x] **API 安全**：所有新代理路由沿用現有 `runtime = 'nodejs'` 設定，統一透過環境變數讀取 GCP Key，並記錄速率限制。
- [x] **快取策略**：拓展 `cacheService`，對 Directions/AQI 批次作 5 分鐘快取，Scenario Studio 作 15 分鐘快取。
- [ ] **測試計劃**：
  - [ ] 單元測試：`DecisionEngineL1` 邏輯與 `useActionHUD` 交互（已有基礎，補充新增分支）。
  - [ ] 集成測試：API Routes mock GCP 回傳，確保錯誤處理。
  - [ ] 視覺驗證：Storybook 添加 MissionControl、CommuteGuardian、ScenarioStudio 三頁。

## Demo 與營運

- [ ] **情境腳本**：
  - [ ] 上班族晨間通勤：Mission Control → Commute Guardian → Agent 推薦。
  - [ ] 親子午後公園：切換地點 → Scenario Studio → 行動 HUD。
  - [ ] 夜跑族：查看夜間污染上升 → CTA 建議延後。
- [ ] **資料錄製**：使用 GCP API 實際請求，保存 JSON 供 Demo 離線播放。
- [ ] **反饋迴圈**：沿用 `FeedbackConsole` 收集測試者意見，記錄 Concern → 任務 backlog。

## 風險與緩解

- [ ] **GCP API 配額**：實裝節流 + 快取；Demo 前預先生成資料避免現場額度超限。
- [ ] **Vertex AI 成本**：限制文字輸出長度、設定每日上限；必要時切換到本地 fallback 模板。
- [ ] **地圖效能**：限制同時渲染的 Polygon/Polyline 數量，使用 requestAnimationFrame 動畫。
- [ ] **Agent 可信度**：在 UI 標記「L1 假設」，同時保留「檢視原始數據」連結以建立信任。

## 下一步判斷門檻

- [ ] Mission Control、Commute Guardian、Scenario Studio 三大模組皆可穩定展示且操作流暢。
- [ ] Vertex AI 建議通過內部 QA；若準確率 < 80%，需再調整 prompt 與權重。
- [ ] 確認後端團隊交付時程，再決定何時啟動 TEMPO 資料接入與 Decision Engine 後端化。
