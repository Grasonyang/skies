export interface Coordinate {
  lat: number;
  lng: number;
}

export interface CommuteRouteLeg {
  distance: {
    text: string;
    value: number;
  };
  duration: {
    text: string;
    value: number;
  };
  endAddress: string;
  startAddress: string;
  polyline: string;
  points: Coordinate[];
}

export interface CommuteRouteSummary {
  id: string;
  mode: string;
  distanceText: string;
  distanceValue: number;
  durationText: string;
  durationValue: number;
  durationInTrafficText: string | null;
  durationInTrafficValue: number | null;
  warnings: string[];
  legs: CommuteRouteLeg[];
  overviewPolyline: string;
  overviewPath: Coordinate[];
}

export interface CommuteRouteAqiStats {
  averageAqi: number;
  maxAqi: number;
  peakAqi?: number;
  dominantPollutants: Array<{ code: string; count: number }>;
  worstLocation?: {
    address: string;
    aqi: number;
    coordinate: Coordinate;
  };
}

export interface CommuteGuardianRoute {
  summary: CommuteRouteSummary;
  aqiStats?: CommuteRouteAqiStats;
  samples?: Array<Coordinate & { aqi?: number; dominantPollutant?: string }>;
  onSelect?: () => void;
}

export interface CommuteGuardianResponse {
  routes: CommuteGuardianRoute[];
  origin: Coordinate;
  destination: Coordinate;
}

export interface CommuteRequestBody {
  origin: Coordinate;
  destination: Coordinate;
  mode?: 'driving' | 'walking' | 'bicycling' | 'transit';
  alternatives?: number;
}
