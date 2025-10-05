# Google Maps 資料互動探索報告

> 更新時間：2025-10-04

本文件盤點目前地圖體驗的資料使用狀態，並規劃三個「資料創新 + 互動」方向：
1. 一鍵發起社群「數據討論串」
2. LLM Agent 產生多級別受眾摘要
3. 行動倒數計時 + 集體目標儀表

---

## 1. 目前地圖互動與資料使用現況

| 範疇 | 現有狀態 | 觀察 |
| --- | --- | --- |
| 地圖呈現 | `@vis.gl/react-google-maps` 上的主地圖，加入 `HeatmapLayer`、`CommuteZonesLayer`、`CommuteRoutesLayer` 以及 `ClickQueryMarker` 等覆蓋層 | 已有基礎視覺與查詢互動，但缺乏能引導使用者採取行動或共享的機制 |
| 空氣品質資料 | `useAirQuality` 呼叫 `/api/air-quality/current`，來源為 Google Air Quality API。`useAirQualityForecast` 提供 24 小時預測 | 僅在 UI 面板呈現，尚未轉化為分享或行動裝置 |
| 通勤資料 | `useCommuteGuardian` 利用 `/api/routes/commute` 呼叫 Google Directions API | 目前只在彈窗面板顯示，未連結到社群倡議或倒數任務 |
| 決策引擎 | `useActionHUD`、`ActionHUDPanel`、`RiskMatrixPanel` 提供建議 | 建議停留在個人層級，缺乏群眾動員元素 |
| LLM 應用 | 僅見於 `ScenarioStudioPanel` 的情境生成 | 尚未針對「資料摘要、跨受眾溝通」設計 Agent |

> **Gap**：資料面向豐富，但彼此之間缺乏可驅動「分享、討論、集體行動」的橋樑。

### 1.1 核心互動需求盤點

| 互動 | 使用者意圖 | 主要資料來源 | 待補資料 / Challenge |
| --- | --- | --- | --- |
| 點擊地圖任意地點 | 快速查看該點 AQI 與預測 | `useAirQuality`、`useAirQualityForecast` | 缺少自動分享機制與資料摘要 |
| 查看通勤路線風險 | 判斷是否調整通勤策略 | `useCommuteGuardian`、`CommuteRoutesLayer` | 需要群眾討論入口，並與倒數模組訊息同步 |
| 比較污染指紋 | 分析污染成因與時間變化 | `PollutantFingerprintPanel` | 整合化摘要與多層受眾溝通 |
| 行動 HUD 建議 | 將 Decision Engine 建議轉成行動 | `useActionHUD`、`ActionHUDPanel` | 需加入共享與倒數壓力，促進行動 |
| AI 情境劇本 | 設計 24 小時活動劇本 | `ScenarioStudioPanel` | 缺乏與其他資料互動（如倒數進度）的回饋 |

---

## 2. 創新方向設計

### 2.1 社群參與：「發起討論」按鈕

| 面向 | 說明 |
| --- | --- |
| 目標 | 讓使用者一鍵把關鍵數據分享到 Twitter/X、Facebook，啟動公眾討論 |
| 位置 | 建議置於 `ActionHUDPanel` 的 CTA 區域（行動建議下方） |
| 必要資料 | 城市名稱、核心預測（如 PM2.5 24h 高峰）、App 分享連結、自動標籤 |
| 技術實作 | 在前端建立 `useShareToSocial` Hook：<br/>1\. 整理貼文模板<br/>2\. 透過 `window.open` 搭配 `https://twitter.com/intent/tweet` 或 `https://www.facebook.com/sharer/sharer.php` 參數<br/>3\. 支援多語與自動 @ 市政帳號（需設定城市對應表） |
| 風險與緩解 | API Key 外洩：僅在前端使用公開資料；貼文長度：維持 240 字元以下；無定位時 fallback 用預設城市 |
| 對應任務 | `設計「發起討論」社群分享體驗...`、`實作「發起討論」按鈕...` |

#### 推薦貼文模板（初稿）
```
NASA EarthData 預測 {city} PM2.5 將升高！請檢視：{appUrl}。@{mayorHandle} #CleanSkyNow #SpaceApps
```
- `{city}`：由 `aqiData.regionCode` 或反解座標取得
- `{mayorHandle}`：以城市配置表維護，可先放 placeholder
- `{appUrl}`：透過環境變數維護分享入口（例：`NEXT_PUBLIC_APP_SHARE_URL`）

---

### 2.2 多級別受眾摘要 Agent

| 面向 | 說明 |
| --- | --- |
| 目標 | 利用 LLM 將 10 個變量的 API 原始 JSON，自動轉換為三個層級的摘要（科學家、市長、民眾） |
| 位置 | 建議整合進 `MissionControlPanel` 或新建「AI 媒體中心」面板 |
| 輸入資料 | `aqiData`、`forecastData`、`CommuteGuardian` 路線風險、`ScenarioStudio` 結果等 |
| 技術實作 | 1\. 新增 API：`POST /api/agent/briefing`<br/>2\. 後端組裝 Prompt（含資料說明 + 受眾語氣要求）<br/>3\. 呼叫 LLM（可用 OpenAI、Azure OpenAI 或本地部署）<br/>4\. 回傳格式：
```json
{
  "level1": { "title": "", "body": "", "callToAction": "" },
  "level2": { ... },
  "level3": { ... }
}
```
5\. 前端建立 `BriefingPanel`，依層級呈現 |
| Prompt 重點 | - 清楚定義三個角色需求<br/>- 提供資料欄位解釋（例：`no2_concentration`）<br/>- 要求輸出 JSON，避免脫離語氣 |
| Failure Plan | LLM 請求失敗時，保留前次內容或顯示 fallback 模板 |
| 對應任務 | `定義多級別受眾摘要需求...`、`建立多級別受眾摘要 Agent...`

> 建議先完成 Prompt 設計（文本 + 範例輸出），再進行 API 實作。

---

### 2.3 行動倒數計時 & 集體目標

| 面向 | 說明 |
| --- | --- |
| 目標 | 為使用者設定一個明確的集體行動目標，搭配倒數計時與達成率，營造緊迫感 |
| 位置 | 地圖底部資訊欄（`featureHeading` 區域），或新增「倒數模組」貼合 HUD |
| 必要資料 | - 預測高峰時間（`forecastData` 中最大 PM2.5 時間戳）<br/>- 計時起點（當前時間）<br/>- 目標觸達量（可環境變數或配置檔）<br/>- 即時達成率（初期可用前端模擬，自動累加；後續接近真實分享數據） |
| 技術實作 | 1\. 建立 `useActionCountdown` Hook（管理剩餘時間、達成率）<br/>2\. 利用 `setInterval` / `requestAnimationFrame` 更新倒數<br/>3\. 將 `ActionHUDPanel` 或新面板顯示 `核心預測`、`目標`、`目前達成` 等資訊|
| 遊戲化元素 | - 提供「立即分享」CTA -> 導向「發起討論」按鈕<br/>- 使用不同顏色代表進度，例如達成 70% 以上轉為綠色 |
| 擴充方向 | 將分享次數記錄到後端（可用 Supabase / Firebase），改由真實數據驅動達成率 |
| 對應任務 | `規劃行動倒數計時...`、`開發行動倒數計時元件...`

---

## 3. 建議的探索 → 開發節奏

1. **探索階段（現在進行）**  
   - 蒐集各平台分享參數（任務：`設計「發起討論」社群分享體驗...`）
   - 定義 LLM Agent 的輸入輸出契約，起草 Prompt（任務：`定義多級別受眾摘要需求...`）
   - 確認倒數模組所需資料、UI 草稿（任務：`規劃行動倒數計時...`）

2. **開發迭代**  
   - 迭代 1：社群分享按鈕（前端即可）
   - 迭代 2：多級別摘要 Agent（需後端 + LLM）
   - 迭代 3：倒數計時儀表（前端模擬 → 後端真實資料）

3. **驗證與量測**  
   - A/B 測試分享按鈕點擊率
   - 追蹤 LLM 摘要的使用次數與平均回覆時間
   - 倒數模組的參與度（分享行動次數）

---

## 4. 開放課題與後續需求

- 城市名稱與 @ 政府帳號的對應資料表尚未存在，需提案資料來源
- LLM 服務需確認 API Key 管理（可用 `.env.local`）與費用預估
- 倒數達成率若需真實分享數據，需設計分享 callback 或短連結追蹤
- 需評估 UI 容納度：是否在現有地圖底部資訊欄即可容納三項新功能

---

## 5. 下一步建議

1. 整理社群貼文模板與城市資料（目標：提供 JSON 配置給前端）
2. 撰寫多級別摘要 Prompt 素材，並測試一份真實 API JSON 作為 sample
3. 畫出倒數模組的 wireframe，確認以 `ActionHUDPanel` 為主還是新建面板
4. 完成以上探索產物後，開始進入對應的開發任務

---

> 若需我協助進一步撰寫 Prompt、Hook、或組件原型，請指示下一步即可。
