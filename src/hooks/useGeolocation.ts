'use client';

import { useState, useEffect } from 'react';
import { Location, GeolocationState } from '@/types';
import {
  DEFAULT_LOCATION,
  GEOLOCATION_TIMEOUT,
  IP_GEOLOCATION_API,
} from '@/lib/constants';
import { getZoomFromAccuracy } from '@/lib/utils';

/**
 * 嘗試通過 GPS 獲取用戶位置
 */
async function getGPSLocation(): Promise<Location> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('瀏覽器不支援定位功能'));
      return;
    }

    const timeoutId = setTimeout(() => {
      reject(new Error('GPS 定位超時'));
    }, GEOLOCATION_TIMEOUT);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId);
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          source: 'gps',
        });
      },
      (error) => {
        clearTimeout(timeoutId);
        let errorMessage = 'GPS 定位失敗';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = '用戶拒絕了定位請求';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = '位置資訊不可用';
            break;
          case error.TIMEOUT:
            errorMessage = 'GPS 定位超時';
            break;
        }
        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: true,
        timeout: GEOLOCATION_TIMEOUT,
        maximumAge: 0,
      }
    );
  });
}

/**
 * 嘗試通過 IP 獲取用戶位置
 */
async function getIPLocation(): Promise<Location> {
  try {
    const response = await fetch(IP_GEOLOCATION_API, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error('IP 定位 API 請求失敗');
    }

    const data = await response.json();

    if (!data.latitude || !data.longitude) {
      throw new Error('IP 定位數據無效');
    }

    return {
      lat: data.latitude,
      lng: data.longitude,
      accuracy: 5000, // IP 定位精度約 5km
      source: 'ip',
    };
  } catch (error) {
    throw new Error(
      `IP 定位失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
    );
  }
}

/**
 * 獲取預設位置（台中市中心）
 */
function getDefaultLocation(): Location {
  return {
    lat: DEFAULT_LOCATION.lat,
    lng: DEFAULT_LOCATION.lng,
    source: 'default',
  };
}

/**
 * 三層降級策略獲取初始位置
 */
async function getInitialLocation(): Promise<Location> {
  // 第 1 層: GPS 定位
  try {
    console.log('🛰️ 嘗試 GPS 定位...');
    const location = await getGPSLocation();
    console.log('✅ GPS 定位成功:', location);
    return location;
  } catch (gpsError) {
    console.log('❌ GPS 定位失敗:', gpsError);

    // 第 2 層: IP 定位
    try {
      console.log('🌐 嘗試 IP 定位...');
      const location = await getIPLocation();
      console.log('✅ IP 定位成功:', location);
      return location;
    } catch (ipError) {
      console.log('❌ IP 定位失敗:', ipError);

      // 第 3 層: 預設位置
      console.log('📍 使用預設位置:', DEFAULT_LOCATION.name);
      return getDefaultLocation();
    }
  }
}

/**
 * 獲取位置資訊的 Hook
 */
export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    getInitialLocation()
      .then((location) => {
        if (isMounted) {
          setState({
            location,
            loading: false,
            error: null,
          });
        }
      })
      .catch((error) => {
        if (isMounted) {
          setState({
            location: getDefaultLocation(),
            loading: false,
            error: error instanceof Error ? error.message : '位置獲取失敗',
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    ...state,
    // 根據精度計算建議的縮放級別
    suggestedZoom: state.location?.accuracy
      ? getZoomFromAccuracy(state.location.accuracy)
      : 13,
  };
}
