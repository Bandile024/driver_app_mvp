import React, { useRef, useState } from 'react';
import { View, GestureResponderEvent } from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';
import { Stroke } from '../core/types';
import { Button, Txt } from './ui';
export function SignaturePreview({ strokes }: { strokes: Stroke[] }) {
  return <View style={{ backgroundColor: '#FFF', borderRadius: 12, overflow: 'hidden' }}><Svg width="100%" height={180} viewBox="0 0 340 180" preserveAspectRatio="none">
    <Line x1={20} y1={147} x2={320} y2={147} stroke="#DEDAD0" strokeDasharray="4 5" />
    {strokes.map((stroke,i) => <Path key={i} d={stroke.map((p,j) => `${j ? 'L' : 'M'}${p.x},${p.y}`).join(' ')} stroke="#003254" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />)}
  </Svg></View>;
}
export default function Signature({ value, onChange }: { value: Stroke[]; onChange: (value: Stroke[]) => void }) {
  const width = useRef(340), current = useRef<Stroke>([]), saved = useRef(value);
  const [drawing, setDrawing] = useState<Stroke>([]);
  saved.current = value;
  const point = (e: GestureResponderEvent) => ({ x: Math.max(0,Math.min(340,e.nativeEvent.locationX / width.current * 340)), y: Math.max(0,Math.min(180,e.nativeEvent.locationY)) });
  const finish = () => { if (current.current.length) onChange([...saved.current,current.current]); current.current=[]; setDrawing([]); };
  return <View style={{ gap: 10 }}>
    <View accessibilityLabel="Signature drawing area. Sign using your finger." onLayout={e => { width.current=e.nativeEvent.layout.width; }} onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true} onResponderTerminationRequest={() => false}
      onResponderGrant={e => { current.current=[point(e)]; setDrawing([...current.current]); }}
      onResponderMove={e => { if (current.current.length < 2000) { current.current.push(point(e)); setDrawing([...current.current]); } }}
      onResponderRelease={finish} onResponderTerminate={finish}
      style={{ height: 180, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#DEDAD0', backgroundColor: '#FFF' }}>
      <View pointerEvents="none"><SignaturePreview strokes={[...value,drawing]} /></View>
    </View>
    <Txt muted style={{ fontSize: 11 }}>Ask the recipient to sign above.</Txt>
    <Button compact secondary title="Clear signature" icon="refresh" onPress={() => { current.current=[]; setDrawing([]); onChange([]); }} />
  </View>;
}
