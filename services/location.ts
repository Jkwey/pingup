import * as Location from 'expo-location';

export type Coords = { lat: number; lng: number };

// 위치 권한 요청 (포그라운드만 — 백그라운드는 실제 빌드 시 추가)
export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

// 현재 위치 1회 조회
export async function getCurrentLocation(): Promise<Coords | null> {
  try {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}

// 두 좌표 간 거리 계산 (미터)
export function getDistanceMeters(a: Coords, b: Coords): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// 위치를 개인정보 보호용 격자 좌표로 변환 (100m 단위 반올림)
export function toLocationGrid(coords: Coords): string {
  const gridLat = Math.round(coords.lat * 1000) / 1000;
  const gridLng = Math.round(coords.lng * 1000) / 1000;
  return `${gridLat},${gridLng}`;
}

// 백그라운드 위치 추적 시작
export async function startLocationTracking(
  onUpdate: (coords: Coords) => void
): Promise<Location.LocationSubscription | null> {
  const granted = await requestLocationPermission();
  if (!granted) return null;

  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 20, // 20m 이동 시마다 업데이트
      timeInterval: 30000,  // 최소 30초 간격
    },
    (pos) => {
      onUpdate({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    }
  );
}
