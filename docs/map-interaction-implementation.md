# 地圖互動創新實作筆記

> 更新時間：2025-10-04

本文件記錄「社群討論串」「多級別受眾摘要」「行動倒數計時」三項創新功能的實作細節、資料流程與測試方式，協助後續維運與擴充。

---

## 1. 資料整合層：`useMapData`

| 功能 | 描述 | 主要輸入 | 主要輸出 |
| --- | --- | --- | --- |
| 空氣品質資料 | 透過 `useAirQuality` 抓取目前 AQI | `queryLocation` | `aqiData`, `aqiLoading`, `aqiError` |
| 預測資料 | 24 小時預測，用於倒數與 Agent | `queryLocation`, `hours` | `forecastData`, `peakEvent` |
| 通勤資料 | 整合圈層與路線 | `userLocation`, `commuteDestination` | `commuteZones`, `commuteRoutes`, `refetchCommute` |
| 地理資訊 | 反向地理編碼 | `queryLocation` | `briefingContext`, `geocode.data` |

**重點：**
- 每當 `queryLocation` 改變時，自動重新抓取 AQI + Forecast。
- `peakEvent` 會計算預測中 AQI 最高時段，供倒數計時與分享文案使用。
- `briefingContext` 提供城市名稱與格式化地址，整合至分享按鈕與 AI 摘要。

---

## 2. 社群討論串：`useSocialShare`

- 入口：`ActionHUDPanel`、`ActionCountdownPanel` 皆呼叫 `handleStartDiscussion()`。
- 預設模板：`NASA EarthData 預測 {city} PM2.5 將升高，預估高峰 {time}！請檢視：{url} #CleanSkyNow #SpaceApps`
- 當瀏覽器支援 `navigator.share` 時優先使用，否則 fallback 至 Twitter Intent / Facebook Share URL。
- 分享連結可透過 `NEXT_PUBLIC_APP_SHARE_URL` 覆寫，預設使用 `window.location.href`。

> ✅ 任務覆蓋：`實作「發起討論」按鈕 ...`

---

## 3. 多級別受眾摘要 Agent

- API 路徑：`POST /api/agent/briefing`
- 需求環境變數：`OPENAI_API_KEY`，可選 `OPENAI_BRIEFING_MODEL` (預設 `gpt-4o-mini`)
- Prompt 設計：在 `buildPrompt()` 中定義 Context 輸入與輸出格式要求，並由 Chat Completions API 強制輸出 JSON。
- 前端：`BriefingPanel` 透過 `useBriefingAgent` 管理載入狀態、錯誤、重試。
- 輸出格式：
```json
{
  "level1": { "title": "", "body": "", "callToAction": "" },
  "level2": { ... },
  "level3": { ... }
}
```

> ✅ 任務覆蓋：`建立多級別受眾摘要 Agent ...`

---

## 4. 行動倒數計時模組

- Hook：`useActionCountdown`
  - 使用 `setInterval` 追蹤剩餘時間
  - 可透過 `NEXT_PUBLIC_ACTION_SIMULATE` 啟用/停用模擬累加
  - 以亂數增量模擬參與人數，避免僵化
- 元件：`ActionCountdownPanel`
  - 顯示剩餘時間、目前進度、集體目標
  - 內建分享 CTA，與 HUD 同步使用 `handleStartDiscussion`
- 參數來源：
  - `goal` → `NEXT_PUBLIC_ACTION_GOAL`
  - `initialCount` → `NEXT_PUBLIC_ACTION_INITIAL`
  - `targetDate` → `useMapData().peakEvent`

> ✅ 任務覆蓋：`開發行動倒數計時元件 ...`

---

## 5. 後端整合

| 路徑 | 功能 | 依賴 |
| --- | --- | --- |
| `GET /api/places/geocode` | 反向地理編碼，取得城市名稱、行政區 | `GOOGLE_API_KEY` |
| `POST /api/agent/briefing` | 呼叫 OpenAI Chat Completions 回傳三層摘要 | `OPENAI_API_KEY` |

> ✅ 任務覆蓋：`串接後端與即時資料更新流程 ...`

---

## 6. 測試與驗證

| 測試項目 | 工具 | 檔案 |
| --- | --- | --- |
| 倒數 Hook 行為 | Vitest + Testing Library | `tests/useActionCountdown.test.ts` |
| 其他 | 待補 | - |

**指令**
```bash
npm test
```

> ✅ 任務覆蓋：`撰寫互動行為測試與開發文件 ...`

---

## 7. 待辦與建議

- [ ] 後端記錄實際分享次數，取代前端模擬
- [ ] 市長帳號映射表（city → Twitter handle）需蒐集資料
- [ ] Briefing Agent 可加入快取，減少重複請求成本
- [ ] Countdown 模組可串接 WebSocket/SSE 實現多人同步

---

> 若需追蹤後續開發進度，請參考 Todoist 專案 **Skies Map Interaction**。
