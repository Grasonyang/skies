import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import { debounce } from '@/lib/utils';

export interface MapState {
  center: { lat: number; lng: number } | null;
  zoom: number;
  bounds: google.maps.LatLngBounds | null;
}

export interface MapTrackingOptions {
  debounceTime?: number; // 防抖時間（毫秒）
  minZoomForAutoQuery?: number; // 自動查詢的最小縮放級別
  maxZoomForAutoQuery?: number; // 自動查詢的最大縮放級別
  onMapMove?: (state: MapState) => void;
  onZoomChange?: (zoom: number) => void;
}

/**
 * 地圖移動追蹤 Hook
 * 
 * 功能：
 * - 追蹤地圖中心點、縮放級別、可視範圍
 * - 防抖處理地圖移動事件（預設 1 秒）
 * - 根據縮放級別決定是否自動查詢
 * - 提供地圖狀態變更回調
 */
export function useMapTracking(options: MapTrackingOptions = {}) {
  const {
    debounceTime = 2500, // 增加到 2.5 秒，減少 API 請求數
    minZoomForAutoQuery = 12,
    maxZoomForAutoQuery = 15,
    onMapMove,
    onZoomChange,
  } = options;

  const map = useMap();
  const [mapState, setMapState] = useState<MapState>({
    center: null,
    zoom: 13,
    bounds: null,
  });
  const [isMoving, setIsMoving] = useState(false);
  const [shouldAutoQuery, setShouldAutoQuery] = useState(false);

  // 用於追蹤上次的中心點和縮放級別
  const lastCenterRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastZoomRef = useRef<number>(13);

  // 更新地圖狀態
  const updateMapState = useCallback(() => {
    if (!map) return;

    const center = map.getCenter();
    const zoom = map.getZoom() || 13;
    const bounds = map.getBounds();

    const newCenter = center
      ? { lat: center.lat(), lng: center.lng() }
      : null;

    // 檢查是否真的有變化
    const centerChanged =
      !lastCenterRef.current ||
      !newCenter ||
      lastCenterRef.current.lat !== newCenter.lat ||
      lastCenterRef.current.lng !== newCenter.lng;

    const zoomChanged = lastZoomRef.current !== zoom;

    if (centerChanged || zoomChanged) {
      const newState: MapState = {
        center: newCenter,
        zoom,
        bounds: bounds || null,
      };

      setMapState(newState);
      lastCenterRef.current = newCenter;
      lastZoomRef.current = zoom;

      // 判斷是否應該自動查詢
      const shouldQuery = zoom >= minZoomForAutoQuery && zoom <= maxZoomForAutoQuery;
      setShouldAutoQuery(shouldQuery);

      // 觸發回調
      if (onMapMove && centerChanged) {
        onMapMove(newState);
      }
      if (onZoomChange && zoomChanged) {
        onZoomChange(zoom);
      }
    }

    setIsMoving(false);
  }, [map, minZoomForAutoQuery, maxZoomForAutoQuery, onMapMove, onZoomChange]);

  // 防抖處理的更新函數
  const debouncedUpdate = useMemo(() =>
    debounce(() => {
      updateMapState();
    }, debounceTime),
  [updateMapState, debounceTime]);

  // 監聽地圖事件
  useEffect(() => {
    if (!map) return;

    // 地圖移動開始
    const dragStartListener = map.addListener('dragstart', () => {
      setIsMoving(true);
    });

    // 地圖移動中
    const dragListener = map.addListener('drag', () => {
      setIsMoving(true);
    });

    // 地圖移動結束
    const dragEndListener = map.addListener('dragend', () => {
      debouncedUpdate();
    });

    // 縮放變更
    const zoomChangedListener = map.addListener('zoom_changed', () => {
      setIsMoving(true);
      debouncedUpdate();
    });

    // 地圖中心變更（包含程式設定的變更）
    const centerChangedListener = map.addListener('center_changed', () => {
      // 不立即設定 isMoving，因為這可能是程式觸發的
    });

    // 地圖閒置（所有動畫完成）
    const idleListener = map.addListener('idle', () => {
      updateMapState();
    });

    // 初始化狀態
    updateMapState();

    // 清理監聽器
    return () => {
      google.maps.event.removeListener(dragStartListener);
      google.maps.event.removeListener(dragListener);
      google.maps.event.removeListener(dragEndListener);
      google.maps.event.removeListener(zoomChangedListener);
      google.maps.event.removeListener(centerChangedListener);
      google.maps.event.removeListener(idleListener);
    };
  }, [map, updateMapState, debouncedUpdate]);

  /**
   * 手動更新地圖狀態（用於外部觸發）
   */
  const forceUpdate = useCallback(() => {
    updateMapState();
  }, [updateMapState]);

  /**
   * 計算網格點（用於批量查詢）
   */
  const getGridPoints = useCallback(
    (gridSize: number = 3): Array<{ lat: number; lng: number }> => {
      if (!mapState.bounds || !mapState.center) return [];

      const bounds = mapState.bounds;
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();

      const latStep = (ne.lat() - sw.lat()) / gridSize;
      const lngStep = (ne.lng() - sw.lng()) / gridSize;

      const points: Array<{ lat: number; lng: number }> = [];

      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
          points.push({
            lat: sw.lat() + latStep * (i + 0.5),
            lng: sw.lng() + lngStep * (j + 0.5),
          });
        }
      }

      return points;
    },
    [mapState.bounds, mapState.center]
  );

  /**
   * 獲取建議的網格大小（根據縮放級別）
   */
  const getRecommendedGridSize = useCallback((): number => {
    const zoom = mapState.zoom;

    if (zoom < 12) return 0; // 不查詢
    if (zoom >= 12 && zoom <= 13) return 3; // 3x3 = 9 次查詢
    if (zoom >= 14 && zoom <= 15) return 5; // 5x5 = 25 次查詢
    return 0; // Zoom > 15 不自動查詢，改為點擊查詢
  }, [mapState.zoom]);

  return {
    mapState,
    isMoving,
    shouldAutoQuery,
    forceUpdate,
    getGridPoints,
    getRecommendedGridSize,
  };
}
