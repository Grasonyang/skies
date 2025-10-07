import { CommuteRequestBody, CommuteRouteSummary } from '@/types/commute';
import { encodePolyline } from '@/lib/polyline';
import { calculateDistance } from '@/lib/utils';


class RoutesService {
  private useMockData: boolean;

  constructor() {
    this.useMockData = !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (this.useMockData) {
      console.warn('⚠️ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY 未設定，通勤路線將使用模擬數據');
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
    const response = await fetch('/api/routes/commute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          origin,
          destination,
          mode,
          alternatives,
        }),
      });

      if (!response.ok) {
        throw new Error(`Commute API 請求失敗: ${response.status}`);
      }

      const data = await response.json();
      return data.routes.map((route: { summary: CommuteRouteSummary }) => route.summary);
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
