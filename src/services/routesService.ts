import { CommuteRequestBody, CommuteRouteSummary } from '@/types/commute';
import { decodePolyline, encodePolyline } from '@/lib/polyline';
import { calculateDistance } from '@/lib/utils';

interface DistanceMatrixResponse {
  status: string;
  rows: Array<{
    elements: Array<{
      status: string;
      duration: { text: string; value: number };
      distance: { text: string; value: number };
      duration_in_traffic?: { text: string; value: number };
    }>;
  }>;
  error_message?: string;
}

interface DirectionsResponse {
  routes: Array<{
    summary: string;
    warnings: string[];
    legs: Array<{
      distance: { text: string; value: number };
      duration: { text: string; value: number };
      end_address: string;
      start_address: string;
      steps: Array<{
        polyline: { points: string };
      }>;
    }>;
    overview_polyline: { points: string };
  }>;
  status: string;
  error_message?: string;
}

class RoutesService {
  private directionsEndpoint = 'https://maps.googleapis.com/maps/api/directions/json';
  private distanceMatrixEndpoint = 'https://maps.googleapis.com/maps/api/distancematrix/json';
  private apiKey: string;
  private useMockData: boolean;

  constructor() {
    this.apiKey = process.env.GOOGLE_API_KEY || '';
    this.useMockData = !this.apiKey;

    if (this.useMockData) {
      console.warn('⚠️ GOOGLE_API_KEY 未設定，通勤路線將使用模擬數據');
    }
  }

  async getCommuteRoutes({
    origin,
    destination,
    mode = 'driving',
    alternatives = 1,
  }: CommuteRequestBody): Promise<CommuteRouteSummary[]> {
    if (this.useMockData) {
      return Promise.resolve(
        this.generateMockRoutes({ origin, destination, mode, alternatives })
      );
    }

    const params = new URLSearchParams({
      origin: `${origin.lat},${origin.lng}`,
      destination: `${destination.lat},${destination.lng}`,
      mode,
      key: this.apiKey,
      alternatives: alternatives > 0 ? 'true' : 'false',
    });

    if (mode === 'driving' || mode === 'transit') {
      params.set('departure_time', 'now');
    }

    const directionsRes = await fetch(
      `${this.directionsEndpoint}?${params.toString()}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!directionsRes.ok) {
      const message = await directionsRes.text();
      throw new Error(`Directions API 請求失敗: ${directionsRes.status} ${message}`);
    }

    const directionsData: DirectionsResponse = await directionsRes.json();

    if (directionsData.status !== 'OK') {
      throw new Error(
        `Directions API 回應異常: ${directionsData.status} ${directionsData.error_message ?? ''}`
      );
    }

    const matrixElement = await this.getDistanceMatrix({ origin, destination, mode });

    return directionsData.routes.map((route, index) => {
      const legs = route.legs.map((leg) => ({
        distance: leg.distance,
        duration: leg.duration,
        endAddress: leg.end_address,
        startAddress: leg.start_address,
        polyline: leg.steps.map((step) => step.polyline.points).join(''),
        points: leg.steps
          .flatMap((step) => decodePolyline(step.polyline.points))
          .filter((point, pointIndex, arr) => {
            if (pointIndex === 0) return true;
            const prev = arr[pointIndex - 1];
            return !(prev.lat === point.lat && prev.lng === point.lng);
          }),
      }));

      const overviewPath = decodePolyline(route.overview_polyline.points);
      const totalDistance = legs.reduce((sum, leg) => sum + leg.distance.value, 0);
      const totalDuration = legs.reduce((sum, leg) => sum + leg.duration.value, 0);

      return {
        id: `route-${index}`,
        mode,
        warnings: route.warnings ?? [],
        distanceText: metersToText(totalDistance),
        distanceValue: totalDistance,
        durationText: secondsToText(totalDuration),
        durationValue: totalDuration,
        legs,
        overviewPolyline: route.overview_polyline.points,
        overviewPath,
        durationInTrafficText: matrixElement?.durationInTrafficText ?? null,
        durationInTrafficValue: matrixElement?.durationInTrafficValue ?? null,
      };
    });
  }

  private generateMockRoutes({
    origin,
    destination,
    mode = 'driving',
    alternatives = 1,
  }: CommuteRequestBody): CommuteRouteSummary[] {
    const desiredCount = Number.isFinite(alternatives)
      ? Math.max(1, Math.min(Math.round(alternatives) + 1, 3))
      : 2;

    const count = Math.max(1, desiredCount);

    return Array.from({ length: count }).map((_, index) =>
      this.buildMockRoute(origin, destination, mode, index)
    );
  }

  private buildMockRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    mode: string,
    variant: number
  ): CommuteRouteSummary {
    const path = this.buildMockPath(origin, destination, variant);
    const distanceMeters = this.calculatePathLength(path);
    const { durationSeconds, durationInTrafficSeconds } = this.estimateDurations(
      distanceMeters,
      mode,
      variant
    );

    const overviewPolyline = encodePolyline(path);

    return {
      id: `mock-route-${variant}`,
      mode,
      distanceText: metersToText(distanceMeters),
      distanceValue: distanceMeters,
      durationText: secondsToText(durationSeconds),
      durationValue: durationSeconds,
      durationInTrafficText: durationInTrafficSeconds
        ? secondsToText(durationInTrafficSeconds)
        : null,
      durationInTrafficValue: durationInTrafficSeconds ?? null,
      warnings: variant === 0 ? [] : ['模擬替代路線，僅供測試參考'],
      legs: [
        {
          distance: {
            text: metersToText(distanceMeters),
            value: distanceMeters,
          },
          duration: {
            text: secondsToText(durationSeconds),
            value: durationSeconds,
          },
          endAddress: `模擬目的地 (${destination.lat.toFixed(3)}, ${destination.lng.toFixed(3)})`,
          startAddress: `模擬起點 (${origin.lat.toFixed(3)}, ${origin.lng.toFixed(3)})`,
          polyline: overviewPolyline,
          points: path,
        },
      ],
      overviewPolyline,
      overviewPath: path,
    };
  }

  private buildMockPath(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    variant: number
  ) {
    const steps = 32;
    const offsetMagnitude = variant === 0 ? 0 : 0.0075 * variant;

    return Array.from({ length: steps + 1 }).map((_, index) => {
      const t = index / steps;
      const curvedRaw = variant === 0 ? t : t + Math.sin(t * Math.PI) * 0.05 * variant;
      const curvedT = Math.min(Math.max(curvedRaw, 0), 1);

      const lat = origin.lat + (destination.lat - origin.lat) * curvedT;
      const lng = origin.lng + (destination.lng - origin.lng) * curvedT;

      const offsetLat = offsetMagnitude * Math.sin(t * Math.PI * 2);
      const offsetLng = offsetMagnitude * Math.cos(t * Math.PI * 2);

      return {
        lat: Number((lat + offsetLat).toFixed(6)),
        lng: Number((lng + offsetLng).toFixed(6)),
      };
    });
  }

  private calculatePathLength(path: { lat: number; lng: number }[]): number {
    if (path.length < 2) return 0;

    let total = 0;
    for (let i = 1; i < path.length; i += 1) {
      const prev = path[i - 1];
      const curr = path[i];
      total += calculateDistance(prev.lat, prev.lng, curr.lat, curr.lng) * 1000;
    }
    return Math.round(total);
  }

  private estimateDurations(distanceMeters: number, mode: string, variant: number) {
    const speeds: Record<string, number> = {
      driving: 45,
      transit: 32,
      bicycling: 18,
      walking: 5,
    };

    const baseSpeed = speeds[mode] ?? 40;
    const modifier = 1 + variant * 0.12;
    const durationHours = distanceMeters / 1000 / baseSpeed * modifier;
    const durationSeconds = Math.max(120, Math.round(durationHours * 3600));

    const trafficSeconds =
      mode === 'driving' || mode === 'transit'
        ? Math.round(durationSeconds * (1 + 0.08 + variant * 0.05))
        : null;

    return { durationSeconds, durationInTrafficSeconds: trafficSeconds };
  }

  private async getDistanceMatrix({
    origin,
    destination,
    mode = 'driving',
  }: CommuteRequestBody): Promise<
    | {
        durationInTrafficText: string;
        durationInTrafficValue: number;
      }
    | null
  > {
    const params = new URLSearchParams({
      origins: `${origin.lat},${origin.lng}`,
      destinations: `${destination.lat},${destination.lng}`,
      key: this.apiKey,
      mode,
    });

    if (mode === 'driving' || mode === 'transit') {
      params.set('departure_time', 'now');
    }

    try {
      const res = await fetch(`${this.distanceMatrixEndpoint}?${params.toString()}`);

      if (!res.ok) {
        return null;
      }

      const data: DistanceMatrixResponse = await res.json();
      if (data.status !== 'OK') {
        return null;
      }

      const element = data.rows?.[0]?.elements?.[0];
      if (!element || element.status !== 'OK') {
        return null;
      }

      const duration = element.duration_in_traffic ?? element.duration;

      return {
        durationInTrafficText: duration.text,
        durationInTrafficValue: duration.value,
      };
    } catch (error) {
      console.error('Distance Matrix API 調用失敗', error);
      return null;
    }
  }
}

function metersToText(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} 公尺`;
  }
  return `${(meters / 1000).toFixed(1)} 公里`;
}

function secondsToText(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} 分鐘`;
  }
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours} 小時 ${remaining} 分` : `${hours} 小時`;
}

export const routesService = new RoutesService();
