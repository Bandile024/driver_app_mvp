import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Empty, Field, Heading, OrderCard, Page, Row, Txt, usePalette } from '../../components/ui';
import { useDriver } from '../../core/store';
import { isFinished, localDate } from '../../core/types';
export default function History() {
  const { state } = useDriver(); const c = usePalette();
  const [filter, setFilter] = useState('all'), [date, setDate] = useState('');
  const orders = (state?.orders || []).filter(o => isFinished(o.status) && (filter==='all' || o.status===filter) && (!date || (o.completedAt && localDate(o.completedAt)===date))).sort((a,b) => (b.completedAt || '').localeCompare(a.completedAt || ''));
  return <Page><Heading title="Every stop. A story." subtitle="Your completed deliveries and their details." />
    <Row style={{ flexWrap: 'wrap', gap: 8 }}>{[['all','All'],['delivered','Successful'],['failed','Failed'],['declined','Declined']].map(([value,label]) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: filter===value }} onPress={() => setFilter(value)} style={{ backgroundColor: filter===value ? c.gold : c.card, borderColor: c.line, borderWidth: 1, paddingHorizontal: 15, minHeight: 44, justifyContent: 'center', borderRadius: 24 }}><Txt bold style={{ fontSize: 12, color: filter===value ? '#1A1A1A' : c.ink }}>{label}</Txt></Pressable>)}</Row>
    <Field label="Filter by completion date" placeholder="YYYY-MM-DD · leave empty for all dates" value={date} onChangeText={setDate} maxLength={10} keyboardType="numbers-and-punctuation" />
    <Txt muted style={{ fontSize: 12 }}>{orders.length} {orders.length===1 ? 'delivery' : 'deliveries'}</Txt>
    {orders.map(o => <View key={o.id} style={{ gap: 6 }}><Txt muted style={{ fontSize: 11 }}>{o.completedAt ? new Date(o.completedAt).toLocaleString('en-ZA') : 'Completion time unavailable'}</Txt><OrderCard order={o} /></View>)}
    {!orders.length && <Empty title="No deliveries found." body="Try another date or status. Completed stops are saved here." icon="history" />}
  </Page>;
}
