import React, { useMemo, useRef, useState } from 'react';
import { Image, Linking, PanResponder, Platform, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import type { Coordinate, NearbyGroceryPlace } from '../services/nearby';
import type { ThemeColors } from '../theme';
import { MAX_ZOOM, MIN_ZOOM, project, TILE_SIZE, unproject, visibleTiles } from '../utils/mapProjection';

import { getWebLayout } from '../utils/webLayout';
const NATIVE_HEIGHT = 330;
const TILE_URL = process.env.EXPO_PUBLIC_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = process.env.EXPO_PUBLIC_MAP_TILE_ATTRIBUTION || '© OpenStreetMap contributors';
const ZERO = { x: 0, y: 0 };
export type MapCamera = { center: Coordinate; zoom: number };
type Props = { camera: MapCamera; onCameraChange: (camera: MapCamera) => void; origin: Coordinate; isGpsOrigin: boolean; places: NearbyGroceryPlace[]; selectedId: string | null; onSelect: (id: string) => void; onGesture: (active: boolean) => void; colors: ThemeColors };

export default function GroceryStreetMap(props: Props) {
  const { camera, origin, places, selectedId, colors } = props;
  const viewport = useWindowDimensions();
  const height = Platform.OS === 'web' ? getWebLayout(viewport.width).mapHeight : NATIVE_HEIGHT;
  const [width, setWidth] = useState(0);
  const [drag, setDrag] = useState(ZERO);
  const [failed, setFailed] = useState<Record<string, true>>({});
  const [tileAttempt, setTileAttempt] = useState(0);
  const latest = useRef(props); latest.current = props;
  const start = useRef(camera);
  const responder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6,
    onPanResponderGrant: () => { start.current = latest.current.camera; latest.current.onGesture(true); },
    onPanResponderMove: (_, g) => setDrag({ x: g.dx, y: g.dy }),
    onPanResponderRelease: (_, g) => {
      const p = project(start.current.center, start.current.zoom);
      latest.current.onCameraChange({ center: unproject({ x: p.x - g.dx, y: p.y - g.dy }, start.current.zoom), zoom: start.current.zoom });
      setDrag(ZERO); latest.current.onGesture(false);
    },
    onPanResponderTerminate: () => { setDrag(ZERO); latest.current.onGesture(false); },
    onPanResponderTerminationRequest: () => false,
  }), []);
  const center = project(camera.center, camera.zoom);
  const tiles = width > 0 ? visibleTiles(center, width, height, camera.zoom) : [];
  const tileKey = (x: number, y: number) => `${camera.zoom}/${x}/${y}`;
  const position = (coord: Coordinate) => {
    const p = project(coord, camera.zoom), world = TILE_SIZE * 2 ** camera.zoom;
    let dx = p.x - center.x;
    if (dx > world / 2) dx -= world;
    if (dx < -world / 2) dx += world;
    return { x: width / 2 + dx, y: height / 2 + p.y - center.y };
  };
  const originPoint = position(origin);
  const anyTileFailed = tiles.some(t => failed[tileKey(t.wrappedX, t.y)]);
  const changeZoom = (amount: number) => props.onCameraChange({ ...camera, zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.zoom + amount)) });
  const control = (label: string, text: string, action: () => void, disabled = false) => <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={action} style={[s.control, { backgroundColor: colors.surface, borderColor: colors.line, opacity: disabled ? 0.5 : 1 }]}><Text style={{ color: colors.ink, fontWeight: '800', fontSize: 21 }}>{text}</Text></TouchableOpacity>;
  return <View style={{ gap: 6 }}>
    <View onLayout={e => setWidth(e.nativeEvent.layout.width)} style={[s.map, { height, borderColor: colors.line }]}>
      <View style={[StyleSheet.absoluteFill, Platform.OS === 'web' ? ({ touchAction: 'none', cursor: 'grab' } as any) : null]} {...responder.panHandlers}>
        <View style={[StyleSheet.absoluteFill, { transform: [{ translateX: drag.x }, { translateY: drag.y }] }]}>
          {tiles.map(t => {
            const key = tileKey(t.wrappedX, t.y);
            const uri = TILE_URL.replace('{z}', String(camera.zoom)).replace('{x}', String(t.wrappedX)).replace('{y}', String(t.y));
            return <Image key={`${t.x}/${t.y}/${camera.zoom}/${tileAttempt}`} source={{ uri, ...(Platform.OS === 'web' ? {} : { headers: { 'User-Agent': 'WafferUniversityProject/1.0 (com.waffer.uae)' } }) }} resizeMode="stretch" fadeDuration={0} onError={() => setFailed(old => old[key] ? old : { ...old, [key]: true })} onLoad={() => setFailed(old => { if (!old[key]) return old; const next = { ...old }; delete next[key]; return next; })} style={{ position: 'absolute', left: t.left, top: t.top, width: TILE_SIZE, height: TILE_SIZE }} />;
          })}
          {width > 0 && <View pointerEvents="none" style={[s.origin, { left: originPoint.x - 8, top: originPoint.y - 8, backgroundColor: props.isGpsOrigin ? '#2563EB' : '#64748B' }]} />}
          {width > 0 && places.map(place => {
            const p = position({ latitude: place.lat, longitude: place.lon });
            if (p.x < -30 || p.x > width + 30 || p.y < -30 || p.y > height + 30) return null;
            const selected = place.id === selectedId;
            return <TouchableOpacity key={place.id} accessibilityRole="button" accessibilityLabel={`${place.name}, ${place.category}`} accessibilityState={{ selected }} onPress={() => props.onSelect(place.id)} style={[s.pinHit, { left: p.x - 20, top: p.y - 39, zIndex: selected ? 3 : 1 }]}>
              <View style={[s.pin, { backgroundColor: selected ? '#D97706' : place.category === 'supermarket' ? '#08784C' : '#176B98' }]}><Text style={s.pinText}>{place.category === 'supermarket' ? 'S' : 'G'}</Text></View><View style={[s.tip, { borderTopColor: selected ? '#D97706' : place.category === 'supermarket' ? '#08784C' : '#176B98' }]} />
            </TouchableOpacity>;
          })}
        </View>
      </View>
      <View style={s.controls}>
        {control('Zoom in', '+', () => changeZoom(1), camera.zoom >= MAX_ZOOM)}
        {control('Zoom out', '−', () => changeZoom(-1), camera.zoom <= MIN_ZOOM)}
        {control('Return to search center', '◎', () => props.onCameraChange({ center: origin, zoom: 12 }))}
      </View>
      <TouchableOpacity accessibilityRole="link" onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright')} style={s.attribution}><Text style={s.attributionText}>{TILE_ATTRIBUTION}</Text></TouchableOpacity>
    </View>
    {anyTileFailed && <TouchableOpacity onPress={() => { setFailed({}); setTileAttempt(n => n + 1); }}><Text style={{ color: colors.red, fontSize: 12 }}>Some map tiles could not load. Tap to retry.</Text></TouchableOpacity>}
    <Text style={{ color: colors.muted, fontSize: 12 }}>🟢 S: Supermarket  ·  🔵 G: Grocery / baqala  ·  ● {props.isGpsOrigin ? 'GPS search origin' : 'Area search origin'}</Text>
  </View>;
}
const s = StyleSheet.create({
  map: { backgroundColor: '#DCE5DF', overflow: 'hidden', borderRadius: 16, borderWidth: 1 },
  origin: { position: 'absolute', width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: 'white', zIndex: 1 },
  pinHit: { position: 'absolute', width: 40, height: 40, alignItems: 'center', justifyContent: 'flex-end' },
  pin: { width: 30, height: 30, borderRadius: 15, borderColor: 'white', borderWidth: 2, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  pinText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  tip: { width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', marginTop: -1 },
  controls: { position: 'absolute', right: 8, top: 8, gap: 5, zIndex: 10 },
  control: { width: 38, height: 38, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  attribution: { position: 'absolute', right: 0, bottom: 0, backgroundColor: '#FFFFFFEB', paddingHorizontal: 5, paddingVertical: 3, zIndex: 12 },
  attributionText: { color: '#263238', fontSize: 10, textDecorationLine: 'underline' },
});
