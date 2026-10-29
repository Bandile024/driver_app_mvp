import React, { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, TextInputProps, TextStyle, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect, Polyline, Line } from 'react-native-svg';
import { router } from 'expo-router';
import { useDriver } from '../core/store';
import { labels, Order, timeLabel } from '../core/types';
export const light = { bg: '#FCF9F1', card: '#FFFFFF', ink: '#1A1A1A', muted: '#62605B', line: '#DEDAD0', gold: '#F6C000', navy: '#003254', green: '#007748', red: '#C72424', soft: '#F2EFE5' };
export const dark = { ...light, bg: '#151817', card: '#202522', ink: '#FAF7EF', muted: '#BFC6BF', line: '#414943', soft: '#2A322D' };
export const usePalette = () => useDriver().state?.dark ? dark : light;
export function Txt({ children, style, bold = false, muted = false, display = false, ...props }: { children?: React.ReactNode; style?: TextStyle | TextStyle[]; bold?: boolean; muted?: boolean; display?: boolean; accessibilityRole?: 'header'; numberOfLines?: number }) {
  const c = usePalette();
  return <Text {...props} style={[{ fontFamily: display ? 'Spaza' : bold ? 'MontBold' : 'Mont', fontSize: 14, lineHeight: 21, color: muted ? c.muted : c.ink }, style]}>{children}</Text>;
}
export function Icon({ name, color = '#1A1A1A', size = 22 }: { name: string; color?: string; size?: number }) {
  const paths: Record<string, string> = {
    arrow: 'M4 12h15M13 5l7 7-7 7', back: 'M20 12H5m7-7-7 7 7 7',
    home: 'M3 10l9-7 9 7v10H3zM9 20v-7h6v7', package: 'M3 7l9-4 9 4v11l-9 4-9-4V7zm0 0 9 5 9-5M12 12v10M7 5l10 5',
    map: 'M3 5l6-2 6 3 6-2v16l-6 2-6-3-6 2V5zm6-2v16m6-13v16',
    history: 'M3 11a9 9 0 1 1 2 7M3 4v7h7M12 7v6l4 2',
    user: 'M4 21v-2a8 8 0 0 1 16 0v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
    pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0zM12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
    clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 7v5l4 2',
    check: 'M4 12l5 5L20 6', close: 'M6 6l12 12M6 18 18 6',
    phone: 'M6 3H3v4c0 8 6 14 14 14h4v-4l-5-2-2 2a13 13 0 0 1-7-7l2-2-3-5z',
    mail: 'M3 5h18v14H3zM3 5l9 8 9-8',
    message: 'M3 4h18v13H9l-6 4V4z',
    camera: 'M3 7h4l2-3h6l2 3h4v14H3zM12 10a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
    pen: 'M4 16 16 4l4 4L8 20l-5 1 1-5zM13 7l4 4',
    bell: 'M5 16h14l-2-3V8a5 5 0 0 0-10 0v5l-2 3M10 20h4',
    refresh: 'M20 8a8 8 0 0 0-14-3L3 8m0-5v5h5M4 16a8 8 0 0 0 14 3l3-3m0 5v-5h-5',
    leaf: 'M20 3C8 3 2 6 4 14s16 6 16-11zM4 21 15 10',
    help: 'M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 4M12 18v.1M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20',
    sun: 'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
    navigation: 'M21 3 3 10l8 3 3 8 7-18z',
    logout: 'M9 4H3v16h6M8 12h13m-5-5 5 5-5 5', shield: 'M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6l-9-4zM7 12l3 3 7-7',
  };
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d={paths[name] || paths.package} stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}
export function Button({ title, onPress, secondary, danger, icon = 'arrow', compact, disabled, style }: { title: string; onPress: () => void | Promise<unknown>; secondary?: boolean; danger?: boolean; icon?: string; compact?: boolean; disabled?: boolean; style?: ViewStyle }) {
  const c = usePalette(); const { notify } = useDriver(); const [busy, setBusy] = useState(false); const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={title} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} accessibilityState={{ disabled: disabled || busy, busy }} disabled={disabled || busy} onPress={async () => { setBusy(true); try { await onPress(); } catch (e) { notify(e instanceof Error ? e.message : 'Please try again.'); } finally { setBusy(false); } }} style={({ pressed }) => [{ minHeight: compact ? 44 : 54, borderRadius: 100, paddingHorizontal: compact ? 16 : 22, paddingVertical: 12, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: danger ? c.red : secondary ? c.card : c.gold, borderWidth: focused ? 2 : 1, borderColor: focused ? c.navy : secondary ? c.line : 'transparent', opacity: disabled ? 0.5 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }, style]}>
    <Txt bold style={{ color: danger ? '#FFF' : secondary ? c.ink : '#1A1A1A', fontSize: compact ? 12 : 14 }}>{title}</Txt>
    {busy ? <ActivityIndicator color={c.ink} size="small" /> : <Icon name={icon} size={18} color={danger ? '#FFF' : secondary ? c.ink : '#1A1A1A'} />}
  </Pressable>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) { const c = usePalette(); return <View style={{ gap: 7 }}><Txt bold style={{ fontSize: 12 }}>{label}</Txt><TextInput accessibilityLabel={label} placeholderTextColor={c.muted} {...props} style={[{ color: c.ink, backgroundColor: c.card, borderColor: c.line, borderWidth: 1, minHeight: 52, borderRadius: 12, padding: 14, fontFamily: 'Mont', fontSize: 15 }, props.multiline && { minHeight: 95, textAlignVertical: 'top' }, props.style]} /></View>; }
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) { const c = usePalette(); return <View style={[{ padding: 20, gap: 12, borderWidth: 1, borderColor: c.line, borderRadius: 18, backgroundColor: c.card }, style]}>{children}</View>; }
export function Row({ children, style }: { children: React.ReactNode; style?: ViewStyle }) { return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12 }, style]}>{children}</View>; }
export function Brand() { return <Row><Image accessibilityLabel="Eskort" source={require('../../assets/brand/logo.png')} resizeMode="contain" style={{ width: 104, height: 34 }} /><View style={{ height: 25, width: 1, backgroundColor: '#BBB4A5' }} /><Txt bold style={{ fontSize: 11, letterSpacing: 2 }}>DRIVER</Txt></Row>; }
export function Page({ children, back, scroll = true, refreshControl }: { children: React.ReactNode; back?: string; scroll?: boolean; refreshControl?: React.ReactElement<import('react-native').RefreshControlProps> }) {
  const c = usePalette();
  return <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: c.bg }}>
    {back && <View style={{ paddingHorizontal: 20, paddingTop: 4 }}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={{ minHeight: 48, flexDirection: 'row', gap: 12, alignItems: 'center' }}><Icon name="back" color={c.ink} /><Txt bold>{back}</Txt></Pressable></View>}
    {scroll ? <ScrollView keyboardShouldPersistTaps="handled" refreshControl={refreshControl} contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 22, width: '100%', maxWidth: 680, alignSelf: 'center' }}>{children}</ScrollView> : children}
  </SafeAreaView>;
}
export function Heading({ title, subtitle }: { title: string; subtitle?: string }) { return <View style={{ gap: 6 }}><Txt display accessibilityRole="header" style={{ fontSize: 38, lineHeight: 44 }}>{title}</Txt>{subtitle && <Txt muted>{subtitle}</Txt>}</View>; }
export function Badge({ status }: { status: Order['status'] }) {
  const colors = status === 'delivered' ? ['#E3F8F0','#00673E'] : ['failed','declined'].includes(status) ? ['#FDE9E5','#A61B1B'] : status === 'pending' ? ['#FFF0B3','#675000'] : ['#D6EEFF','#003254'];
  return <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, alignSelf: 'flex-start', backgroundColor: colors[0] }}><Txt bold style={{ fontSize: 11, lineHeight: 16, color: colors[1] }}>{labels[status]}</Txt></View>;
}
export function OrderCard({ order, priority = false }: { order: Order; priority?: boolean }) {
  const c = usePalette(); const [focused, setFocused] = useState(false);
  return <Pressable onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} accessibilityRole="button" accessibilityLabel={`Open ${order.reference}, ${order.customer}`} onPress={() => router.push(`/order/${order.id}`)} style={({ pressed }) => ({ transform: [{ scale: pressed ? .99 : 1 }], borderRadius: 18, borderWidth: focused ? 2 : 0, borderColor: c.gold })}>
    <Card style={priority ? { borderColor: '#C9A227', borderWidth: 1.5 } : {}}>
      <Row style={{ justifyContent: 'space-between' }}><Txt bold style={{ fontSize: 11, letterSpacing: 1 }}>{order.reference}</Txt><Badge status={order.status} /></Row>
      <View><Txt bold style={{ fontSize: 18, lineHeight: 26 }}>{order.customer}</Txt><Txt muted>{order.address}</Txt><Txt muted style={{ fontSize: 12 }}>{order.suburb}</Txt></View>
      {!['delivered','failed','declined'].includes(order.status) && <Txt muted style={{ fontSize: 11 }}>{order.eta ? `Dispatch ETA · ${timeLabel(order.eta)}` : 'ETA pending · navigation calculates travel time'}</Txt>}
      <Row style={{ borderTopWidth: 1, borderColor: c.line, paddingTop: 12, flexWrap: 'wrap' }}><Icon name="clock" size={16} color={c.muted} /><Txt style={{ fontSize: 12 }}>{timeLabel(order.windowStart)} - {timeLabel(order.windowEnd)}</Txt><Icon name="package" size={16} color={c.muted} /><Txt style={{ fontSize: 12 }}>{order.packages} packages</Txt><View style={{ flex: 1 }} /><Icon name="arrow" size={20} color={c.ink} /></Row>
    </Card>
  </Pressable>;
}
export function Empty({ title, body, icon = 'package' }: { title: string; body: string; icon?: string }) { const c = usePalette(); return <Card style={{ alignItems: 'center', paddingVertical: 40 }}><Icon name={icon} size={36} color={c.muted} /><Txt bold style={{ fontSize: 18 }}>{title}</Txt><Txt muted style={{ textAlign: 'center' }}>{body}</Txt></Card>; }
export function JourneyIllustration() {
  return <Svg width="100%" height={125} viewBox="0 0 340 125" fill="none"><Path d="M16 106h60c35 0 18-75 62-75h53c38 0 15 75 58 75h77" stroke="#F6C000" strokeWidth={3} strokeDasharray="7 8" /><Circle cx={21} cy={106} r={8} fill="#F6C000" /><Circle cx={320} cy={106} r={8} fill="#F6C000" /><Rect x={121} y={30} width={71} height={46} rx={5} fill="#FCF9F1" /><Path d="M192 45h25l17 17v14h-42" fill="#F6C000" /><Path d="M199 51h15l12 12h-27z" fill="#003254" /><Circle cx={142} cy={80} r={11} fill="#1A1A1A" stroke="#FCF9F1" strokeWidth={3} /><Circle cx={214} cy={80} r={11} fill="#1A1A1A" stroke="#FCF9F1" strokeWidth={3} /><Polyline points="143,43 143,63 165,63" stroke="#003254" strokeWidth={4} /><Line x1={156} y1={50} x2={181} y2={50} stroke="#003254" strokeWidth={4} /></Svg>;
}
export const shared = StyleSheet.create({ section: { gap: 12 }, between: { justifyContent: 'space-between' }, wrap: { flexWrap: 'wrap' }, divider: { height: 1, backgroundColor: '#DEDAD0' } });
