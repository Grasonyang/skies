import { Coordinate } from '@/types/commute';

/**
 * Decode an encoded polyline string into a list of coordinates.
 * Lightweight implementation to avoid extra dependencies.
 */
export function decodePolyline(encoded: string): Coordinate[] {
  const coordinates: Coordinate[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    result = 0;
    shift = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    coordinates.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return coordinates;
}

/**
 * Down-sample a polyline path to roughly the provided interval in meters.
 */
export function samplePath(points: Coordinate[], intervalMeters: number = 800): Coordinate[] {
  if (points.length <= 1) return points;

  const sampled: Coordinate[] = [points[0]];
  let lastPoint = points[0];
  let distanceSinceLast = 0;

  for (let i = 1; i < points.length; i += 1) {
    const current = points[i];
    const segment = haversineDistance(lastPoint, current) * 1000; // km → m
    distanceSinceLast += segment;

    if (distanceSinceLast >= intervalMeters) {
      sampled.push(current);
      lastPoint = current;
      distanceSinceLast = 0;
    }
  }

  if (sampled[sampled.length - 1] !== points[points.length - 1]) {
    sampled.push(points[points.length - 1]);
  }

  return sampled;
}

function haversineDistance(a: Coordinate, b: Coordinate): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);

  const aa = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  const earthRadiusKm = 6371;

  return earthRadiusKm * c;
}

function encodeCoordinateComponent(value: number): string {
  let v = value < 0 ? ~(value << 1) : value << 1;
  let output = '';

  while (v >= 0x20) {
    output += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
    v >>= 5;
  }

  output += String.fromCharCode(v + 63);
  return output;
}

/**
 * Encode a list of coordinates into a polyline string.
 */
export function encodePolyline(points: Coordinate[]): string {
  if (!points.length) return '';

  let lastLat = 0;
  let lastLng = 0;
  let result = '';

  points.forEach(({ lat, lng }) => {
    const latE5 = Math.round(lat * 1e5);
    const lngE5 = Math.round(lng * 1e5);

    const deltaLat = latE5 - lastLat;
    const deltaLng = lngE5 - lastLng;

    result += encodeCoordinateComponent(deltaLat);
    result += encodeCoordinateComponent(deltaLng);

    lastLat = latE5;
    lastLng = lngE5;
  });

  return result;
}
