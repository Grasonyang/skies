# Skies - Air Quality Monitoring Dashboard

這是一個基於 Next.js 的空氣品質監測應用程式。

## 🚀 部署

### 方法 1: 部署到 Vercel (推薦)

Vercel 是 Next.js 的最佳部署平台,完全支援 API 路由和伺服器端功能。

#### 步驟:

1. **推送代碼到 GitHub**:
   ```bash
   git add .
   git commit -m "Setup deployment configuration"
   git push origin V2.0
   ```

2. **連接 Vercel**:
   - 前往 [vercel.com](https://vercel.com)
   - 使用 GitHub 帳號登入
   - 點擊 "Add New Project"
   - 選擇你的 `skies` 儲存庫
   - Vercel 會自動偵測 Next.js 配置

3. **設置環境變數**:
   在 Vercel 專案設定中新增:
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: 你的 Google Maps API 金鑰
   - `GOOGLE_GEMINI_API_KEY`: 你的 Google Gemini API 金鑰

4. **部署**:
   - 點擊 "Deploy"
   - 之後每次推送到 `V2.0` 分支都會自動部署

### 方法 2: 使用 GitHub Actions 部署到 GitHub Pages

**注意**: 此專案使用 API 路由,不支援靜態導出到 GitHub Pages。
如果要使用 GitHub Pages,需要:
- 將 API 邏輯移到客戶端
- 或使用外部 API 服務
- 或選擇支援伺服器端渲染的平台

已包含 GitHub Actions 工作流程配置在 `.github/workflows/deploy.yml`。

### 本地開發

```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev

# 建置專案
npm run build

# 啟動生產伺服器
npm start
```

### 技術棧

- **框架**: Next.js 15.5.4
- **React**: 19.1.0
- **樣式**: Tailwind CSS 4.1.14
- **地圖**: Google Maps (@vis.gl/react-google-maps)
- **AI**: Google Generative AI (Gemini)
- **測試**: Vitest

## 📝 License

Private
