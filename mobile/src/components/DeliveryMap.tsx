import React, { useState } from 'react';
import { View, Image, Pressable, Linking } from 'react-native';
import { Order, Coordinate } from '../core/types';
import { Button, Icon, Row, Txt, usePalette } from './ui';
const project = (lat: number, lng: number, z: number) => {
  const sin = Math.sin(Math.max(-85, Math.min(85, lat)) * Math.PI / 180);
  return { x: (lng + 180) / 360 * (256 * 2 ** z), y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * (256 * 2 ** z) };
};
export default function DeliveryMap({ orders, selected, onSelect, location, height = 280 }: { orders: Order[]; selected?: string; onSelect?: (id: string) => void; location?: Coordinate | null; height?: number }) {
  const [width, setWidth] = useState(320), [zoom, setZoom] = useState(13);
  const [tileStatus, setTileStatus] = useState<Record<string, 'loaded' | 'error'>>({});
  const [attempt, setAttempt] = useState(0);
  const c = usePalette(); const center = orders.find(o => o.id === selected) || orders[0];
  if (!center) return <View style={{ padding: 30, backgroundColor: c.soft }}><Txt muted>No destinations to map yet.</Txt></View>;
  const origin = project(center.latitude, center.longitude, zoom);
  const left = origin.x - width / 2, top = origin.y - height / 2;
  const tiles = [];
  for (let x = Math.floor(left / 256); x <= Math.floor((left + width) / 256); x++) for (let y = Math.floor(top / 256); y <= Math.floor((top + height) / 256); y++) tiles.push({ x, y, key: `${attempt}-${zoom}-${x}-${y}` });
  const failed = tiles.some(t => tileStatus[t.key] === 'error');
  const loading = tiles.some(t => !tileStatus[t.key]);
  return <View style={{ gap: 8 }}>
    <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ height, borderRadius: 18, overflow: 'hidden', backgroundColor: '#E4E9DC', borderColor: c.line, borderWidth: 1 }}>
      {tiles.map(t => <Image key={t.key} accessibilityLabel="OpenStreetMap geographic tile" source={{ uri: `https://tile.openstreetmap.org/${zoom}/${t.x}/${t.y}.png`, headers: { 'User-Agent': 'EskortDriver/1.0 (delivery companion)' } }} onLoad={() => setTileStatus(s => ({ ...s, [t.key]: 'loaded' }))} onError={() => setTileStatus(s => ({ ...s, [t.key]: 'error' }))} style={{ position: 'absolute', width: 256, height: 256, left: t.x * 256 - left, top: t.y * 256 - top }} />)}
      {orders.map((o, i) => { const p = project(o.latitude, o.longitude, zoom); return <Pressable key={o.id} accessibilityRole="button" accessibilityLabel={`Destination ${i+1}: ${o.customer}`} onPress={() => onSelect?.(o.id)} style={{ position: 'absolute', left: p.x-left-19, top: p.y-top-38, width: 38, height: 42, borderRadius: 19, borderBottomRightRadius: 2, transform: [{ rotate: '45deg' }], backgroundColor: selected === o.id ? '#F6C000' : '#003254', borderWidth: 3, borderColor: '#FFF', alignItems: 'center', justifyContent: 'center' }}><Txt bold style={{ transform: [{ rotate: '-45deg' }], color: selected === o.id ? '#1A1A1A' : '#FFF' }}>{i+1}</Txt></Pressable>; })}
      {location && (() => { const p = project(location.latitude, location.longitude, zoom); return <View accessibilityLabel="Your last measured location" style={{ position: 'absolute', left: p.x-left-8, top: p.y-top-8, width: 16, height: 16, borderRadius: 8, backgroundColor: '#1876E5', borderWidth: 3, borderColor: '#FFF' }} />; })()}
      <View style={{ position: 'absolute', right: 10, top: 10, gap: 6 }}>{[1,-1].map(d => <Pressable key={d} accessibilityRole="button" accessibilityLabel={d===1 ? 'Zoom in' : 'Zoom out'} onPress={() => setZoom(z => Math.max(5,Math.min(18,z+d)))} style={{ height: 44, width: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', borderRadius: 10 }}><Txt style={{ color: '#1A1A1A', fontSize: 24 }}>{d===1 ? '+' : '−'}</Txt></Pressable>)}</View>
      <Pressable accessibilityRole="link" onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright')} style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: '#FFFFFFE8', padding: 6 }}><Txt style={{ fontSize: 9, lineHeight: 12, color: '#003254' }}>© OpenStreetMap contributors</Txt></Pressable>
    </View>
    {(failed || loading) && <View style={{ gap: 8 }}><Row><Icon name="map" size={16} color={c.muted} /><Txt muted style={{ flex: 1, fontSize: 11 }}>{failed ? 'Some map tiles are unavailable. Your saved address and coordinates still work offline.' : 'Loading map tiles. Check your connection if the map stays incomplete.'}</Txt></Row><Button compact secondary title="Retry map" icon="refresh" onPress={() => { setTileStatus({}); setAttempt(a => a+1); }} /></View>}
    <Txt muted style={{ fontSize: 10 }}>{center.latitude.toFixed(5)}, {center.longitude.toFixed(5)} · Destination pins, not a calculated route</Txt>
  </View>;
}
