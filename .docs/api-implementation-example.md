# API 實現範例與最佳實踐

## 1. 核心問題：如何安全地獲取 Google Air Quality 數據

### ❌ 錯誤做法：在前端直接調用

```typescript
// ❌ 不要這樣做！會暴露 API Key
'use client';
export function BadComponent() {
  useEffect(() => {
    // 危險：API Key 會暴露在瀏覽器中
    const apiKey = 'YOUR_API_KEY'; // 任何人都能看到
    
    fetch(`https://airquality.googleapis.com/v1/currentConditions:lookup?key=${apiKey}`, {
      method: 'POST',
      body: JSON.stringify({ location: { latitude: 24, longitude: 120 }})
    });
  }, []);
}
```

**問題**:
- API Key 暴露在前端代碼中
- 用戶可以在瀏覽器開發者工具中看到
- 惡意用戶可以複製 API Key 濫用
- 無法控制請求頻率和配額

### ✅ 正確做法：使用 Next.js API Routes

```typescript
// ✅ 正確：前端組件只調用內部 API
'use client';
export function GoodComponent() {
  useEffect(() => {
    // 安全：只調用自己的 API，不暴露任何密鑰
    fetch('/api/air-quality/current?lat=24&lng=120')
      .then(res => res.json())
      .then(data => console.log(data));
  }, []);
}
```

---

## 2. 完整實現步驟

### 步驟 1: 配置環境變量

```bash
# .env.local
# 注意：這個文件不應該提交到 Git
GOOGLE_AIR_QUALITY_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# 這個可以暴露到前端（用於地圖初始化）
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyYYYYYYYYYYYYYYYYYYYYYYYYYYYYY
```

### 步驟 2: 創建服務層

```typescript
// src/services/airQualityService.ts
export class AirQualityService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://airquality.googleapis.com/v1';

  constructor() {
    // 僅在伺服器端執行，前端無法訪問
    this.apiKey = process.env.GOOGLE_AIR_QUALITY_API_KEY || '';
    
    if (!this.apiKey) {
      throw new Error('GOOGLE_AIR_QUALITY_API_KEY is not set');
    }
  }

  async getCurrentConditions(params: {
    latitude: number;
    longitude: number;
  }) {
    const url = `${this.baseUrl}/currentConditions:lookup?key=${this.apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        location: {
          latitude: params.latitude,
          longitude: params.longitude
        },
        extraComputations: [
          "HEALTH_RECOMMENDATIONS",
          "DOMINANT_POLLUTANT_CONCENTRATION",
          "POLLUTANT_CONCENTRATION",
          "LOCAL_AQI"
        ],
        languageCode: "zh-TW"
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google API Error: ${error}`);
    }

    return response.json();
  }
}
```

### 步驟 3: 創建 API Route

```typescript
// src/app/api/air-quality/current/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { AirQualityService } from '@/services/airQualityService';

export async function GET(request: NextRequest) {
  try {
    // 獲取查詢參數
    const { searchParams } = request.nextUrl;
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    // 驗證參數
    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'Missing latitude or longitude' },
        { status: 400 }
      );
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      );
    }

    // 調用服務
    const service = new AirQualityService();
    const data = await service.getCurrentConditions({
      latitude,
      longitude
    });

    // 返回數據
    return NextResponse.json(data);

  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 支援 OPTIONS 請求（CORS 預檢）
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
```

### 步驟 4: 創建自定義 Hook

```typescript
// src/hooks/useAirQuality.ts
import { useState, useEffect } from 'react';

interface AirQualityData {
  location: { latitude: number; longitude: number };
  dateTime: string;
  indexes: any[];
  pollutants: any[];
}

export function useAirQuality(lat?: number, lng?: number) {
  const [data, setData] = useState<AirQualityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!lat || !lng) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // 調用內部 API
        const response = await fetch(
          `/api/air-quality/current?lat=${lat}&lng=${lng}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch air quality data');
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [lat, lng]);

  return { data, loading, error };
}
```

### 步驟 5: 在組件中使用

```typescript
// src/components/air-quality/AQIDisplay.tsx
'use client';
import { useAirQuality } from '@/hooks/useAirQuality';

export function AQIDisplay({ lat, lng }: { lat: number; lng: number }) {
  const { data, loading, error } = useAirQuality(lat, lng);

  if (loading) return <div>載入中...</div>;
  if (error) return <div>錯誤: {error.message}</div>;
  if (!data) return <div>無數據</div>;

  const aqi = data.indexes?.[0]?.aqi || 0;
  const category = data.indexes?.[0]?.category || 'Unknown';

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">空氣品質指數</h2>
      <div className="text-6xl font-bold text-center mb-2">{aqi}</div>
      <div className="text-xl text-center">{category}</div>
    </div>
  );
}
```

---

## 3. 添加快取優化

### 簡單記憶體快取

```typescript
// src/services/cacheService.ts
interface CacheItem {
  data: any;
  expiry: number;
}

class SimpleCache {
  private cache = new Map<string, CacheItem>();

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  set(key: string, data: any, ttlSeconds: number): void {
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { data, expiry });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }
}

export const cacheService = new SimpleCache();
```

### 在 API Route 中使用快取

```typescript
// src/app/api/air-quality/current/route.ts
import { cacheService } from '@/services/cacheService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    // 生成快取鍵
    const cacheKey = `air-quality:${lat}:${lng}`;
    
    // 檢查快取
    const cached = cacheService.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { 'X-Cache-Status': 'HIT' }
      });
    }

    // 如果沒有快取，調用 API
    const service = new AirQualityService();
    const data = await service.getCurrentConditions({
      latitude: parseFloat(lat!),
      longitude: parseFloat(lng!)
    });

    // 存入快取（5 分鐘）
    cacheService.set(cacheKey, data, 300);

    return NextResponse.json(data, {
      headers: { 'X-Cache-Status': 'MISS' }
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## 4. 添加速率限制

```typescript
// src/lib/rateLimit.ts
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs
    });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}
```

### 在 API Route 中使用

```typescript
import { checkRateLimit } from '@/lib/rateLimit';

export async function GET(request: NextRequest) {
  // 獲取 IP 地址
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';

  // 檢查速率限制（每分鐘 30 次）
  if (!checkRateLimit(ip, 30, 60000)) {
    return NextResponse.json(
      { error: 'Too many requests, please try again later' },
      { status: 429 }
    );
  }

  // 繼續處理請求...
}
```

---

## 5. 錯誤處理最佳實踐

```typescript
// src/lib/errors.ts
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class ValidationError extends APIError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends APIError {
  constructor() {
    super('Too many requests', 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

// 統一錯誤處理器
export function handleAPIError(error: unknown) {
  console.error('API Error:', error);

  if (error instanceof APIError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }

  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
```

---

## 6. 測試範例

```typescript
// __tests__/api/air-quality.test.ts
import { GET } from '@/app/api/air-quality/current/route';
import { NextRequest } from 'next/server';

describe('Air Quality API', () => {
  it('should return 400 for missing coordinates', async () => {
    const request = new NextRequest('http://localhost:3000/api/air-quality/current');
    const response = await GET(request);
    
    expect(response.status).toBe(400);
  });

  it('should return air quality data for valid coordinates', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/air-quality/current?lat=24&lng=120'
    );
    const response = await GET(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('indexes');
  });
});
```

---

## 7. 部署檢查清單

### 部署前確認

- [ ] 環境變量已在 Vercel/部署平台設置
- [ ] `.env.local` 已添加到 `.gitignore`
- [ ] API Key 已啟用所需的 API
- [ ] 設置了 API Key 的使用限制（域名、IP）
- [ ] 測試了所有 API 端點
- [ ] 添加了錯誤監控（如 Sentry）
- [ ] 設置了速率限制
- [ ] 添加了快取策略

### Vercel 環境變量設置

1. 進入 Vercel 專案設置
2. 找到 "Environment Variables"
3. 添加以下變量：
   - `GOOGLE_AIR_QUALITY_API_KEY` (所有環境)
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (所有環境)
4. 重新部署應用

---

## 8. 常見問題

### Q1: 可以使用同一個 API Key 嗎？

**A**: 可以，但建議分開：
- 一個用於前端（Google Maps）
- 一個用於後端（Air Quality API）
- 這樣可以更精細地控制權限和配額

### Q2: 如何降低 API 調用成本？

**A**: 
1. 實施快取策略（5-10 分鐘）
2. 批量請求而非多次單獨請求
3. 只在需要時才請求數據
4. 使用預測數據減少即時查詢

### Q3: 如何處理 API 配額超限？

**A**:
```typescript
async function callWithRetry(fn: Function, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.statusCode === 429 && i < maxRetries - 1) {
        // 等待後重試
        await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
        continue;
      }
      throw error;
    }
  }
}
```

### Q4: 本地開發如何測試？

**A**:
```bash
# 1. 創建 .env.local
echo "GOOGLE_AIR_QUALITY_API_KEY=your_key" > .env.local

# 2. 啟動開發伺服器
npm run dev

# 3. 測試 API
curl "http://localhost:3000/api/air-quality/current?lat=24&lng=120"
```

---

## 總結

**關鍵原則**:
1. ✅ **永遠不要**在前端暴露 API Key
2. ✅ 使用 Next.js API Routes 作為代理層
3. ✅ 實施快取和速率限制
4. ✅ 添加適當的錯誤處理
5. ✅ 監控 API 使用情況

**數據流**:
```
前端組件 → useAirQuality Hook → /api/air-quality → AirQualityService → Google API
```

這種架構確保了安全性、可維護性和成本控制。
