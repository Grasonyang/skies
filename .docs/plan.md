# AeroSense 任務藍圖

> ⏱️ 更新日期：2025-01-05  
> 🎯 當前階段：Stage 1 — MVP 骨架與決策引擎 L1  
> 🧭 願景：把即時與預報空氣品質數據轉化為個人化、可採取行動的決策體驗，為 Agent 化與 TEMPO 高解析資料的擴展鋪路。

---

## 願景與策略基調
- 面向用戶：提供「情境感知」的健康建議與行動指南，而不是僅顯示 AQI 數字。
- 技術導向：前端 Next.js + Google Air Quality API 打底，保留 Decision Engine 邏輯抽換與未來遷移雲端 Agent 的接口。
- 創新聚焦：以「活動風險矩陣」「污染類型指紋」「通勤區域動態分區」三大體驗為核心，形成差異化產品。

---

## 創新支柱與成功條件
### 創新 1｜活動風險矩陣 (Activity-Risk Matrix)
- 目標：根據多汙染物濃度與個人活動型態給出紅/黃/綠風險燈號、建議時段、備選活動。
- Stage 1 交付：硬編碼權重版 RiskScore 計算（w1*PM2.5 + w2*O3 + w3*ActivityFactor）、決策卡片 UI、互動式活動選單。
- 成功指標：初版決策在 3 秒內出現；至少 3 個活動模板（戶外運動、慢跑、親子）；用戶反饋收集通道（暫以前端 CTA 形式）。

### 創新 2｜污染類型指紋 (Pollutant Fingerprint)
- 目標：雷達圖呈現五大汙染物即時/預報強度，搭配時序趨勢小圖。
- Stage 1 交付：拉取單點歷史+預報（Google API），前端雷達圖組件（含閾值著色）、滑桿切換時間片。
- 成功指標：雷達圖渲染延遲 < 1.5 秒；提供「目前 vs 未來 6 小時」對比模式；具備導出 Decision Engine 權重的數據鉤子。

### 創新 3｜空氣品質通勤區 (AQ Commute Zones)
- 目標：用地圖顏色區隔安全/風險通勤區，支援路線疊圖。
- Stage 1 交付：Google 網格預報取樣、前端閾值著色圖層、簡易通勤路線上色。
- 成功指標：同步更新頻率 ≤ 10 分鐘；至少 3 級顏色狀態；提供未來 Stage 2 替換 TEMPO 網格的接口抽象（`GridProvider`）。

---

## Stage 1（進行中）任務板
### 本週優先完成（阻塞 Stage 1 其他工作的關鍵）
1. `ENV-SETUP`：集中化環境設定檔（Tailwind、地圖 SDK、API Key 驗證）與錯誤提示。
2. `AQ-FETCH`：實作 `useAirQualityForecast` 資料流，支援即時 + 5 日預報，並建立快取策略接口。
3. `RISK-MATRIX-MVP`：建立活動清單、硬編碼權重 RiskScore、決策卡片 UI。

### 近期待辦（完成優先項後立即展開）
- `FINGERPRINT-VIZ`：雷達圖組件 + 趨勢迷你圖（使用 Recharts 或 D3），支持時間滑桿。
- `COMMUTE-ZONES-LITE`：地圖著色邏輯、`GridProvider` 抽象、路線試繪。
- `ACTION-HUD`：通知與建議模組（風險等級對應行動清單、CTA）。
- `DATA-OBS`：建立前端 `DecisionEngineL1` 模塊封裝，集中權重、閾值、活動係數。
- `UX-LOOP`：插入使用者反饋入口（暫定：建議按鈕 + 偏好表單草稿）。

> ✅ 完成任務後請更新狀態至 GitHub Projects（若尚未建立，需在本週內完成 `OPS-BOARD` 任務）。

---

## 工作流切片
- **前端 & 視覺化**：Map 元件、雷達圖、Decision 卡片；需優先確定可重用 UI primitives（Card、Badge、Alert Bar）。
- **資料 & API**：擴充 `/api/air-quality/forecast`，確保支援多污染物、時序與網格模式；建立錯誤分類（API 限額、定位失敗、資料缺漏）。
- **Decision Engine L1**：封裝權重設定、活動係數映射、輸出格式（含風險燈號、建議時段、警示文案）。
- **Infra & 可觀測性**：備妥 `.env.example`、記錄 API 配額監控需求、計畫前端 log（Sentry 或 Next-logger）。

---

## 快速可落地的創新提案
1. **情境片語建議 (Contextual Micro Copy)**：依 RiskScore 與本地時間提供一句行動建議（例：「下午 4 點前適合戶外跑步」）。實作：Decision Engine 輸出多語模板 + 前端切換。工期：0.5 天。
2. **一鍵分享汙染指紋 (Shareable Snapshot)**：導出雷達圖為圖片或連結，鼓勵社群分享。實作：使用 `html2canvas` 生成 PNG。工期：1 天。
3. **行事曆同步提醒 (Calendar Hook)**：選擇活動後，一鍵加入 Google/Apple Calendar，提醒最佳時段。實作：生成 ICS 檔或使用 Calendar Link。工期：1 天。
4. **動態背景層次 (AQ Mood Gradient)**：根據當前風險等級改變 APP 背景色與動畫粒子，增強情境感。實作：Tailwind CSS theme 擴充。工期：0.5 天。
5. **健康偏好快捷設定 (Health Quick Toggle)**：提供「兒童」「慢性過敏」「運動員」快捷按鈕，立即調整 Decision Engine 權重。實作：預設權重組合 + 前端 Toggle。工期：1 天。

---

## 風險與依賴
- **Google API 配額**：需監控速率；短期採用前端快取 + 限制查詢頻率；中長期導向後端快取層。
- **資料完整性**：Google API 在部分地區可能缺少特定汙染物 → 需 fallback 策略與 UI 告警。
- **地圖表現**：高密度渲染可能影響效能；需預先定義層級閾值與骨架載入。
- **決策可信度**：硬編碼權重為暫解；需記錄假設並在 Stage 2 轉交後端 Agent。

---

## 後續階段預告
- **Stage 2 — Agent & TEMPO**：接入 TEMPO 高解析度資料、Decision Engine 遷移 Cloud Functions、導入時間序列預測。
- **Stage 3 — Source Attribution & Automations**：建置溯源 Agent、個人化自動化（自動通知、IoT 介接）。

---

**立即行動建議**
1. 完成 `ENV-SETUP` 並提交 PR，確認 API Key、Tailwind、地圖載入正常。
2. 同步更新專案看板（若無則建立），確保以上任務在本週節奏內可追蹤。
3. 開立「快速創新」支線 Issue，評估優先開發的 2 項（建議先從 Micro Copy + Health Quick Toggle）。
