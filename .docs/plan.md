# AeroSense 行動計畫

- [ ] **更新日期**：2025-10-04
- [ ] **當前階段**：Stage 1 — MVP 骨架與 Decision Engine L1
- [ ] **願景焦點**：以 Google Air Quality API 為核心，快速交付「活動風險矩陣」、「污染類型指紋」、「空氣品質通勤區」三大創新體驗，並預留未來整合 NASA TEMPO 與 Agent 的空間。【F:.docs/design.pdf†L1-L29】【F:.docs/architectrue.md†L1-L84】

## 交付原則

1. [ ] **創意優先，但務實落地**：先處理最具差異化的視覺與決策體驗（雷達圖、活動建議、通勤分區），並選用設計文件建議的前端快速實現方案（前端調用 Google API、L1 權重函式）。【F:.docs/design.pdf†L29-L67】【F:.docs/architectrue.md†L85-L143】
2. [ ] **以最快可交付為序**：估算工時，越能在 0.5–1 天內完成的項目越優先；必要時以假資料或硬編碼權重先上線，再於後續迭代優化。【F:.docs/design.pdf†L67-L122】
3. [ ] **保持擴充彈性**：撰寫時同步標註 Decision Engine、資料快取與地圖分層的擴充接口，確保後續接入 TEMPO 與 Agent 時無痛升級。【F:.docs/architectrue.md†L84-L143】【F:.docs/design.pdf†L67-L122】

## 本週核心行動（依優先順序）

### 1. 汙染類型指紋（Pollutant Fingerprint）
- [ ] **目標**：完成五大污染物（PM2.5、PM10、O₃、NO₂、SO₂）雷達圖與 24 小時趨勢迷你圖，讓使用者一眼辨識污染型態。【F:.docs/design.pdf†L29-L51】【F:.docs/architectrue.md†L144-L207】
- [ ] **實作重點**：
  - [ ] 使用現有 `useAirQualityForecast` 取得單站點即時與預報資料，先渲染靜態雷達圖，再加入時間滑桿對比兩個時段。
  - [ ] 設計硬編碼色彩與閾值，預留 TEMPO 高解析度資料介面（以 hook 參數形式保留）。
  - [ ] 完成 `PollutantFingerprintPanel` 元件與 Storybook 範例，方便後續疊代。
- [ ] **定義完成**：渲染時間 < 1.5 秒、支援地理位置切換、具空值 fallback、UI 已與 Tailwind 主題一致。
- [ ] **預估工時**：0.5–0.75 天。

### 2. 行動風險 HUD（Action HUD）
- [ ] **目標**：將 Decision Engine L1 的風險結果轉換為行動建議卡片與 CTA，建立與活動矩陣的互動橋樑。【F:.docs/design.pdf†L29-L51】【F:.docs/architectrue.md†L208-L273】
- [ ] **實作重點**：
  - [ ] 從既有 `RISK-MATRIX-MVP` 抽離風險分級描述、建議語句，製作 `useActionHUD` 邏輯。
  - [ ] 依不同風險等級提供 2–3 個即時建議（例如「延後戶外跑步 2 小時」），並加入提醒按鈕（先以 console 模擬提交）。
  - [ ] 在 UI 中預留健康偏好切換位址，為未來 HEALTH-TOGGLE 方案鋪路。
- [ ] **定義完成**：與風險矩陣同步更新、CTA 可觸發事件、具空值與錯誤提示。
- [ ] **預估工時**：0.75–1 天。

### 3. 通勤區速寫（Commute Zones Lite）
- [ ] **目標**：在地圖上以三段色塊呈現安全/警示/危險區域，輔助使用者規畫短程行程。【F:.docs/design.pdf†L29-L58】【F:.docs/architectrue.md†L144-L207】
- [ ] **實作重點**：
  - [ ] 擴充現有地圖組件，根據網格資料計算平均 AQI 並渲染半透明 Polygon。
  - [ ] 封裝 `GridProvider` 以支援後續 TEMPO 高解析度資料。
  - [ ] 加入 10 分鐘定時更新與 Loading Skeleton。
- [ ] **定義完成**：三色閾值可調、與地圖縮放同步、錯誤時顯示回退訊息。
- [ ] **預估工時**：1–1.5 天。

### 4. Decision Engine 套件化（Data-Obs）
- [ ] **目標**：將 L1 權重邏輯封裝為可測試的 `DecisionEngineL1` 模組，方便未來升級至 Agent。【F:.docs/design.pdf†L67-L122】【F:.docs/architectrue.md†L208-L273】
- [ ] **實作重點**：
  - [ ] 拆分權重設定、活動係數、閾值回傳，使用 TypeScript 定義類型。
  - [ ] 撰寫涵蓋風險分支的單元測試，並輸出給 HUD 與矩陣共用的結果介面。
- [ ] **定義完成**：測試涵蓋主要分支、模組文件化、可在 Node/Edge 環境共用。
- [ ] **預估工時**：0.5 天。

### 5. 使用者回饋循環（UX Loop）
- [ ] **目標**：建立最小可行的回饋入口，收集使用者對創新視覺的建議。【F:.docs/architectrue.md†L208-L273】
- [ ] **實作重點**：
  - [ ] 在 HUD 旁新增「給我建議」按鈕，先送往前端狀態或暫存至 localStorage。
  - [ ] 彙整為 `FeedbackConsole`，供內部測試快速檢視。
- [ ] **定義完成**：可輸入文字與活動類型、可匯出 JSON、具空值防護。
- [ ] **預估工時**：0.25 天。

### 6. 專案運營同步（Ops Board）
- [ ] **目標**：建立 GitHub Projects 或 Linear 看板，確保任務格與實際進度同步。【F:.docs/architectrue.md†L274-L366】
- [ ] **實作重點**：
  - [ ] 將上述 Task 轉換為 Issue/任務卡並設定負責人。
  - [ ] 建立每週更新節奏，於計畫檔案中同步連結。
- [ ] **定義完成**：看板可視、狀態欄位一致、每項任務有預計完成日。
- [ ] **預估工時**：0.25 天。

## 快速創新插隊清單（完成核心後再評估）

- [ ] **Micro Copy 精準提示**：依風險與時間回傳一句行動建議，增強情境感。
- [ ] **Fingerprint Share**：提供雷達圖匯出 PNG 或分享連結，強化社群擴散。
- [ ] **Calendar Hook**：將建議時間段導入行事曆提醒。
- [ ] **AQ Mood 背景**：依風險變化動態調整背景漸層。
- [ ] **Health Toggle 健康偏好**：預設兒童／過敏／運動員權重，一鍵切換個人化設定。

## 風險與緩解

- [ ] **Google API 配額**：持續監控呼叫量，保留前端快取與節流策略。【F:.docs/architectrue.md†L274-L366】
- [ ] **資料缺口**：針對缺失污染物顯示提示並設定替代資料。
- [ ] **地圖效能**：限制高密度渲染範圍，使用骨架與漸進載入。
- [ ] **決策可信度**：於 UI 中標示 L1 假設，並記錄未來升級至雲端 Agent 的需求。

## 下一階段門檻

- [ ] **Stage 2 — Agent & TEMPO**：待三大創新功能穩定上線且 API 配額可控後，啟動 TEMPO 接入與 Decision Engine 後端化。【F:.docs/design.pdf†L92-L122】
- [ ] **Stage 3 — 溯源與自動化**：在 Stage 2 完成後，導入 Source Attribution Agent 與個人化自動化流程。

