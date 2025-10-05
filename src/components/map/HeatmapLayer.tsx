'use client';

import { useEffect } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import { HEATMAP_CONFIG } from '@/lib/constants';

interface HeatmapLayerProps {
  opacity?: number;
}

/**
 * Google Air Quality Heatmap 熱力圖層組件
 */
export default function HeatmapLayer({ opacity = HEATMAP_CONFIG.opacity }: HeatmapLayerProps) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const apiKey =
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('❌ 缺少 Google Maps API Key');
      return;
    }

    console.log('🎨 載入熱力圖層...');

    // 創建熱力圖層
    const heatmapLayer = new google.maps.ImageMapType({
      getTileUrl: (coord, zoom) => {
        // Google Air Quality Heatmap Tiles API
        // 注意：並非所有地區都有熱力圖數據，API 會返回空白圖片
        return `${HEATMAP_CONFIG.baseUrl}/${zoom}/${coord.x}/${coord.y}?key=${apiKey}`;
      },
      tileSize: new google.maps.Size(
        HEATMAP_CONFIG.tileSize,
        HEATMAP_CONFIG.tileSize
      ),
      opacity: opacity,
      name: 'AirQualityHeatmap',
      // 最大/最小縮放級別
      minZoom: 3,
      maxZoom: 16,
    });

    // 添加到地圖的覆蓋層（不會完全遮蓋地圖）
    map.overlayMapTypes.push(heatmapLayer);
    console.log(`✅ 熱力圖層已載入 (透明度: ${opacity})`);
    console.log('ℹ️ 注意：熱力圖僅在有監測數據的地區顯示');

    // 清理函數
    return () => {
      const index = map.overlayMapTypes.getArray().indexOf(heatmapLayer);
      if (index !== -1) {
        map.overlayMapTypes.removeAt(index);
        console.log('🗑️ 熱力圖層已移除');
      }
    };
  }, [map, opacity]);

  return null;
}
