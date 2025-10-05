import { NextRequest, NextResponse } from 'next/server';
import { calculateDistance } from '@/lib/utils';

const GEOCODE_BASE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface GeocodeResponseComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface GeocodeApiResponse {
  results: Array<{
    formatted_address: string;
    address_components: GeocodeResponseComponent[];
  }>;
  status: string;
  error_message?: string;
}

function extractComponent(components: GeocodeResponseComponent[], type: string) {
  return components.find((component) => component.types.includes(type));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!lat || !lng) {
    return NextResponse.json({ error: '缺少 lat 或 lng 參數' }, { status: 400 });
  }

  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);

  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    console.warn('⚠️ GOOGLE_API_KEY 未設定，返回模擬反向地理編碼資料');
    return NextResponse.json({ ...buildMockGeocode(latNum, lngNum), source: 'mock' });
  }

  const url = new URL(GEOCODE_BASE_URL);
  url.searchParams.set('latlng', `${lat},${lng}`);
  url.searchParams.set('key', apiKey);
  const language = searchParams.get('language') || 'zh-TW';
  url.searchParams.set('language', language);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Skies-App-Geocode/1.0',
      },
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Geocode API error: ${response.status} ${message}`);
    }

    const data = (await response.json()) as GeocodeApiResponse;

    if (data.status !== 'OK' || !data.results.length) {
      throw new Error(data.error_message || `Geocode API 回傳狀態: ${data.status}`);
    }

    const first = data.results[0];
    const city =
      extractComponent(first.address_components, 'locality')?.long_name ||
      extractComponent(first.address_components, 'administrative_area_level_1')?.long_name ||
      extractComponent(first.address_components, 'administrative_area_level_2')?.long_name;

    const district = extractComponent(first.address_components, 'sublocality_level_1')?.long_name;
    const country = extractComponent(first.address_components, 'country')?.long_name;

    return NextResponse.json({
      city,
      district,
      country,
      formattedAddress: first.formatted_address,
      source: 'live',
    });
  } catch (error) {
    console.error('[Geocode API] failed:', error);
    return NextResponse.json({ ...buildMockGeocode(latNum, lngNum), source: 'mock' });
  }
}

const MOCK_LOCATIONS = [
  {
    name: '台北市',
    district: '信義區',
    lat: 25.033,
    lng: 121.5654,
  },
  {
    name: '新北市',
    district: '板橋區',
    lat: 25.0132,
    lng: 121.4637,
  },
  {
    name: '台中市',
    district: '西屯區',
    lat: 24.1648,
    lng: 120.6421,
  },
  {
    name: '高雄市',
    district: '苓雅區',
    lat: 22.6273,
    lng: 120.3014,
  },
];

function buildMockGeocode(lat: number, lng: number) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return {
      city: '模擬城市',
      district: '模擬行政區',
      country: '模擬國家',
      formattedAddress: '模擬地址',
    };
  }

  const match = MOCK_LOCATIONS.reduce<{ distance: number; location: typeof MOCK_LOCATIONS[number] | null }>(
    (acc, location) => {
      const distance = calculateDistance(lat, lng, location.lat, location.lng);
      if (!acc.location || distance < acc.distance) {
        return { distance, location };
      }
      return acc;
    },
    { distance: Infinity, location: null }
  );

  const location = match.location;

  if (!location || match.distance > 80) {
    return {
      city: '模擬城市',
      district: '模擬行政區',
      country: '台灣（模擬）',
      formattedAddress: `模擬地址 (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
    };
  }

  return {
    city: location.name,
    district: location.district,
    country: '台灣（模擬）',
    formattedAddress: `${location.name}${location.district} 模擬路 ${Math.round(match.distance * 3 + 1)} 號`,
  };
}
