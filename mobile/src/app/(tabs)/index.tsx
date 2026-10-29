import React from 'react';
import { View, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Brand, Button, Empty, Icon, OrderCard, Page, Row, Txt, usePalette } from '../../components/ui';
import { useDriver } from '../../core/store';
import { isFinished, localDate } from '../../core/types';
export default function Today() {
  const { state, session, online, syncing, refresh, shift } = useDriver(); const c = usePalette();
  if (!state) return null;
  const active = state.orders.filter(o => !isFinished(o.status));
  const offers = active.filter(o => o.status === 'pending');
  const underway = active.filter(o => o.status !== 'pending').sort((a,b) => a.windowEnd.localeCompare(b.windowEnd));
  const done = state.orders.filter(o => o.status === 'delivered' && o.completedAt && localDate(o.completedAt) === localDate(new Date())).length;
  const total = done + active.length;
  return <Page refreshControl={<RefreshControl refreshing={syncing} onRefresh={refresh} tintColor={c.navy} />}>
    <Row style={{ justifyContent: 'space-between' }}><Brand /><View style={{ backgroundColor: state.shiftStartedAt ? '#E3F8F0' : c.soft, borderRadius: 30, padding: 9 }}><Txt bold style={{ fontSize: 10, color: state.shiftStartedAt ? '#007748' : c.muted }}>{state.shiftStartedAt ? '● ON SHIFT' : 'OFF SHIFT'}</Txt></View></Row>
    <View style={{ gap: 5 }}>
      <Txt muted style={{ fontSize: 12 }}>{new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })}{session?.demo ? ' · DEMO' : ''}</Txt>
      <Txt display accessibilityRole="header" style={{ fontSize: 43, lineHeight: 49 }}>Hello, {state.profile.name.split(' ')[0]}.</Txt>
      <Txt muted>{active.length ? 'Good food is counting on you.' : 'Ready when you are. Let’s make it a good day.'}</Txt>
    </View>
    {(!online || state.outbox.length > 0 || state.syncError) && <View style={{ backgroundColor: c.soft, borderRadius: 12, padding: 14, gap: 4 }}><Txt bold style={{ fontSize: 12 }}>{!online ? 'Offline · your work is saved' : `${state.outbox.length} updates waiting to sync`}</Txt>{!!state.syncError && <Txt style={{ fontSize: 12 }}>{state.syncError}</Txt>}<Button compact secondary title="Retry sync" icon="refresh" onPress={refresh} /></View>}
    <View style={{ backgroundColor: '#003254', padding: 23, borderRadius: 22, gap: 19 }}>
      <Row style={{ justifyContent: 'space-between' }}><Txt bold style={{ color: '#FCF9F1', fontSize: 11, letterSpacing: 1.5 }}>YOUR DAILY DOCKET</Txt><Icon name="package" color="#F6C000" /></Row>
      <Row style={{ alignItems: 'baseline', gap: 8 }}><Txt display style={{ fontSize: 56, lineHeight: 62, color: '#FCF9F1' }}>{String(done).padStart(2,'0')}</Txt><Txt style={{ color: '#C6D9E5' }}>of {total} deliveries complete</Txt></Row>
      <View style={{ height: 5, backgroundColor: '#315A75', borderRadius: 6 }}><View style={{ width: `${total ? done/total*100 : 0}%`, height: 5, borderRadius: 6, backgroundColor: '#F6C000' }} /></View>
      <Button title={state.shiftStartedAt ? 'End my shift' : 'Start my shift'} icon={state.shiftStartedAt ? 'check' : 'arrow'} onPress={() => shift(!state.shiftStartedAt)} />
      <Row><Icon name="leaf" size={16} color="#C6D9E5" /><Txt style={{ color: '#C6D9E5', fontSize: 10 }}>{session?.demo ? 'Demo mode · location is never shared' : 'Battery-aware location · only while on shift'}</Txt></Row>
    </View>
    {!!underway.length && <View style={{ gap: 12 }}><Row style={{ justifyContent: 'space-between' }}><Txt display style={{ flex: 1, fontSize: 26, lineHeight: 36, paddingVertical: 2 }}>Your next stop</Txt><Button compact secondary title="Map" icon="map" onPress={() => router.push('/(tabs)/route')} /></Row>{underway.map((o,i) => <OrderCard key={o.id} order={o} priority={i===0} />)}</View>}
    <View style={{ gap: 12 }}><Row style={{ justifyContent: 'space-between' }}><Txt display style={{ fontSize: 26, lineHeight: 32 }}>New deliveries</Txt><Txt bold style={{ backgroundColor: c.gold, color: '#1A1A1A', paddingHorizontal: 10, borderRadius: 8 }}>{offers.length}</Txt></Row>
      {offers.map(o => <OrderCard key={o.id} order={o} />)}
      {!offers.length && <Empty title="All caught up." body="New delivery offers will appear here. Pull down to refresh." />}
    </View>
    <Txt muted style={{ fontSize: 10, textAlign: 'center' }}>{session?.demo ? 'Sample data for exploring the driver experience.' : `Feed refreshes every 30 seconds while open.${state.lastSync ? ` Last synced ${new Date(state.lastSync).toLocaleTimeString('en-ZA')}.` : ''}`}</Txt>
  </Page>;
}
