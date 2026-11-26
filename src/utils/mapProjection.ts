import type { Coordinate } from '../services/nearby';
export const TILE_SIZE = 256;
export const MIN_ZOOM = 10;
export const MAX_ZOOM = 18;
export type Point = { x: number; y: number };
const MAX_LAT = 85.05112878;
export function project(c: Coordinate, zoom: number): Point {
  const size = TILE_SIZE * 2 ** zoom;
  const lat = Math.max(-MAX_LAT, Math.min(MAX_LAT, c.latitude)) * Math.PI / 180;
  return { x: (c.longitude + 180) / 360 * size, y: (1 - Math.asinh(Math.tan(lat)) / Math.PI) / 2 * size };
}
export function unproject(p: Point, zoom: number): Coordinate {
  const size = TILE_SIZE * 2 ** zoom;
  return { longitude: ((p.x / size * 360) % 360 + 360) % 360 - 180, latitude: Math.atan(Math.sinh(Math.PI * (1 - 2 * Math.max(0, Math.min(size, p.y)) / size))) * 180 / Math.PI };
}
export function visibleTiles(center: Point, width: number, height: number, zoom: number) {
  const tiles: { x: number; y: number; wrappedX: number; left: number; top: number }[] = [];
  const left = center.x - width / 2, top = center.y - height / 2, n = 2 ** zoom;
  for (let y = Math.floor(top / TILE_SIZE); y <= Math.floor((top + height - 1) / TILE_SIZE); y++) {
    if (y < 0 || y >= n) continue;
    for (let x = Math.floor(left / TILE_SIZE); x <= Math.floor((left + width - 1) / TILE_SIZE); x++) {
      tiles.push({ x, y, wrappedX: ((x % n) + n) % n, left: x * TILE_SIZE - left, top: y * TILE_SIZE - top });
    }
  }
  return tiles;
}
