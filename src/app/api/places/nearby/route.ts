import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface NearbyPlacesRequest {
  location: {
    latitude: number;
    longitude: number;
  };
  radius?: number;
  type?: string[];
  languageCode?: string;
}

/**
 * Google Places API (New) - Nearby Search 代理
 * 依據活動類型抓取場域座標
 */
export async function POST(request: NextRequest) {
  try {
    const body: NearbyPlacesRequest = await request.json();
    const { location, radius = 5000, type = [], languageCode = 'zh-TW' } = body;

    if (!location?.latitude || !location?.longitude) {
      return NextResponse.json(
        { error: '缺少必要的位置參數' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ GOOGLE_API_KEY 未設定，返回模擬附近場域資料');
      const mockPlaces = buildMockPlaces(location, type);
      return NextResponse.json(
        {
          places: mockPlaces,
          count: mockPlaces.length,
          source: 'mock',
        },
        { status: 200 }
      );
    }

    console.log(`🔍 Places API 請求: ${location.latitude}, ${location.longitude}, radius: ${radius}m, types: ${type.join(', ')}`);

    // 使用 Places API (New) - Nearby Search
    const url = `https://places.googleapis.com/v1/places:searchNearby`;

    const requestBody = {
      locationRestriction: {
        circle: {
          center: {
            latitude: location.latitude,
            longitude: location.longitude,
          },
          radius: radius,
        },
      },
      includedTypes: type,
      languageCode: languageCode,
      maxResultCount: 10,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.displayName,places.location,places.types,places.formattedAddress,places.rating',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Places API 錯誤:', response.status, errorText);
      
      // 提供更有用的錯誤訊息
      let errorMessage = `Places API 請求失敗: ${response.status}`;
      
      if (response.status === 403) {
        errorMessage = 'Places API 未啟用或 API Key 無權限。請到 Google Cloud Console 啟用 Places API (New)';
      } else if (response.status === 400) {
        errorMessage = '請求參數錯誤。請檢查位置座標和搜尋類型是否正確';
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: errorText,
          status: response.status
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // 轉換為簡化格式
    interface PlaceData {
      displayName?: { text?: string };
      location?: { latitude?: number; longitude?: number };
      types?: string[];
      formattedAddress?: string;
      rating?: number;
    }

    const places = (data.places as PlaceData[] | undefined)?.map((place) => ({
      name: place.displayName?.text || 'Unknown',
      location: {
        lat: place.location?.latitude,
        lng: place.location?.longitude,
      },
      types: place.types || [],
      address: place.formattedAddress || '',
      rating: place.rating || null,
    })) || [];

    return NextResponse.json({
      places,
      count: places.length,
      source: 'live',
    });

  } catch (error) {
    console.error('❌ Places API 代理錯誤:', error);
    return NextResponse.json(
      { error: '內部伺服器錯誤' },
      { status: 500 }
    );
  }
}

function buildMockPlaces(
  location: { latitude: number; longitude: number },
  type: string[]
) {
  const baseTypes = type.length ? type : ['park'];
  const total = Math.max(4, baseTypes.length * 2);
  const radiusDeg = 0.01;

  return Array.from({ length: total }).map((_, index) => {
    const angle = (index / total) * Math.PI * 2;
    const selectedType = baseTypes[index % baseTypes.length];
    const lat = location.latitude + radiusDeg * Math.sin(angle);
    const lng = location.longitude + radiusDeg * Math.cos(angle);

    return {
      name: `模擬${selectedType} #${index + 1}`,
      location: {
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
      },
      types: [selectedType, 'mock'],
      address: `模擬地址 ${index + 1}`,
      rating: Number((4 + (index % 3) * 0.3).toFixed(1)),
    };
  });
}
