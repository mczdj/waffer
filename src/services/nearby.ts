export type Coordinate = { latitude: number; longitude: number };
export type NearbyGroceryPlace = { id: string; name: string; lat: number; lon: number; category: string; address: string; phone: string | null; website: string | null; distance?: number };

// Approximate map/search origins for the existing Profile area choices, not store pins.
// Fixed origins also work in browsers where Expo's geocoder is unsupported.
export const AREA_CENTERS: Record<string, Coordinate> = {
  'Mohammed Bin Zayed City, Abu Dhabi': { latitude: 24.327, longitude: 54.552 },
  'Khalifa City, Abu Dhabi': { latitude: 24.416, longitude: 54.576 },
  'Mussafah, Abu Dhabi': { latitude: 24.351, longitude: 54.505 },
  'Abu Dhabi City': { latitude: 24.4539, longitude: 54.3773 },
  'Al Reem Island, Abu Dhabi': { latitude: 24.493, longitude: 54.407 },
  'Yas Island, Abu Dhabi': { latitude: 24.485, longitude: 54.607 },
  'Al Ain': { latitude: 24.2075, longitude: 55.7447 },
  'Dubai Marina, Dubai': { latitude: 25.080, longitude: 55.140 },
  'Downtown Dubai': { latitude: 25.197, longitude: 55.279 },
  'Deira, Dubai': { latitude: 25.270, longitude: 55.328 },
  'Sharjah City': { latitude: 25.346, longitude: 55.421 },
};
export function distanceKm(a: Coordinate, b: Coordinate) {
  const r = Math.PI / 180;
  const h = Math.sin((b.latitude - a.latitude) * r / 2) ** 2 + Math.cos(a.latitude * r) * Math.cos(b.latitude * r) * Math.sin((b.longitude - a.longitude) * r / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
export function normalizeNearby(payload: unknown, center: Coordinate): NearbyGroceryPlace[] {
  const rows = (payload as { places?: unknown } | null)?.places;
  if (!Array.isArray(rows)) throw new Error('Nearby store service returned an invalid response.');
  const ids = new Set<string>();
  const places: NearbyGroceryPlace[] = [];
  for (const p of rows) {
    if (!p || typeof p.id !== 'string' || ids.has(p.id) || typeof p.name !== 'string' || !p.name.trim() || typeof p.lat !== 'number' || typeof p.lon !== 'number' || !Number.isFinite(p.lat) || !Number.isFinite(p.lon) || Math.abs(p.lat) > 85.0511 || Math.abs(p.lon) > 180) continue;
    ids.add(p.id);
    places.push({ id: p.id, name: p.name, lat: p.lat, lon: p.lon, category: typeof p.category === 'string' ? p.category : 'grocery', address: typeof p.address === 'string' ? p.address : '', phone: typeof p.phone === 'string' ? p.phone : null, website: typeof p.website === 'string' && /^https?:\/\//i.test(p.website) ? p.website : null, distance: distanceKm(center, { latitude: p.lat, longitude: p.lon }) });
  }
  return places.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
}
export async function fetchNearbyStores(center: Coordinate, signal: AbortSignal) {
  const base = process.env.EXPO_PUBLIC_OFFERS_API_URL;
  if (!base) throw new Error('Set EXPO_PUBLIC_OFFERS_API_URL in .env, then restart Expo.');
  const response = await fetch(`${base.replace(/\/$/, '')}/nearby?lat=${center.latitude.toFixed(5)}&lon=${center.longitude.toFixed(5)}`, { signal });
  if (!response.ok) throw new Error(`Nearby store service is unavailable (HTTP ${response.status}).`);
  return normalizeNearby(await response.json(), center);
}
