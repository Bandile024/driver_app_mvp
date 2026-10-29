import React, { useState } from 'react';
import { View, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Badge, Button, Card, Empty, Field, Heading, Icon, Page, Row, Txt, usePalette } from '../../components/ui';
import DeliveryMap from '../../components/DeliveryMap';
import { SignaturePreview } from '../../components/Signature';
import { useDriver } from '../../core/store';
import { contact, navigate } from '../../core/contact';
import { isFinished, timeLabel } from '../../core/types';
export default function OrderDetails() {
  const { id } = useLocalSearchParams<{ id: string }>(); const { state, status, note } = useDriver(); const c = usePalette(); const [text, setText] = useState('');
  const order = state?.orders.find(o => o.id===id);
  if (!order) return <Page back="Delivery"><Empty title="Delivery not available" body="Refresh Today to retrieve your latest assignments." /></Page>;
  const step = ['accepted','enroute','arrived','delivered'].indexOf(order.status);
  return <Page back="Delivery details">
    <Row style={{ justifyContent: 'space-between' }}><Txt bold style={{ letterSpacing: 1.5 }}>{order.reference}</Txt><Badge status={order.status} /></Row>
    <Heading title={order.customer} subtitle={`${order.packages} packages · ${timeLabel(order.windowStart)} – ${timeLabel(order.windowEnd)}`} />
    {!isFinished(order.status) && <Txt muted>{order.eta ? `Dispatch ETA: ${timeLabel(order.eta)}` : 'ETA pending · open navigation for live travel time'}</Txt>}
    {step>=0 && <Row style={{ justifyContent: 'space-between' }}>{['Accepted','On the way','Arrived','Delivered'].map((label,i) => <View key={label} style={{ alignItems: 'center', gap: 6, flex: 1 }}><View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: i<=step ? c.gold : c.soft, alignItems: 'center', justifyContent: 'center' }}>{i<step ? <Icon name="check" size={16} /> : <Txt bold style={{ fontSize: 12, color: i<=step ? '#1A1A1A' : c.muted }}>{i+1}</Txt>}</View><Txt style={{ fontSize: 9 }}>{label}</Txt></View>)}</Row>}
    <Card><Row><Icon name="pin" color={c.ink} /><View style={{ flex: 1 }}><Txt bold>{order.address}</Txt><Txt muted>{order.suburb}</Txt></View></Row><DeliveryMap orders={[order]} selected={order.id} /><Button secondary title="Start navigation" icon="navigation" onPress={() => navigate(order)} /></Card>
    <Card><Txt bold>Delivery instructions</Txt><Txt>{order.instructions || 'No special instructions.'}</Txt><Txt bold>From dispatch</Txt><Txt muted>{order.dispatchNotes || 'No additional notes.'}</Txt></Card>
    <Card><Txt bold>Contact customer</Txt><Row style={{ flexWrap: 'wrap' }}><Button compact secondary title="Call" icon="phone" onPress={() => contact('tel',order.phone)} /><Button compact secondary title="SMS" icon="message" onPress={() => contact('sms',order.phone)} /><Button compact secondary title="Email" icon="mail" onPress={() => contact('mailto',order.email,order.reference)} /></Row>
      <Txt bold>{order.store}</Txt><Row style={{ flexWrap: 'wrap' }}><Button compact secondary title="Call store" icon="phone" onPress={() => contact('tel',order.storePhone)} /><Button compact secondary title="SMS" icon="message" onPress={() => contact('sms',order.storePhone)} /><Button compact secondary title="Email" icon="mail" onPress={() => contact('mailto',order.storeEmail,order.reference)} /></Row>
    </Card>
    {!!order.reason && <Card><Txt bold>Recorded reason</Txt><Txt>{order.reason}</Txt></Card>}
    {order.proof && <Card><Row><Icon name="shield" color="#007748" /><Txt bold>Proof of delivery</Txt></Row><Image source={{ uri: order.proof.photo }} style={{ width: '100%', height: 240, borderRadius: 12 }} resizeMode="cover" /><Txt>Received by {order.proof.recipient}</Txt><SignaturePreview strokes={order.proof.signature} /><Txt muted style={{ fontSize: 11 }}>{new Date(order.proof.capturedAt).toLocaleString('en-ZA')}</Txt><Txt muted style={{ fontSize: 11 }}>{order.proof.location ? `GPS ${order.proof.location.latitude.toFixed(5)}, ${order.proof.location.longitude.toFixed(5)}` : `GPS unavailable: ${order.proof.locationReason || 'Not recorded'}`}</Txt></Card>}
    <Card><Txt bold>Notes for the store</Txt>{order.notes.map(n => <View key={n.id} style={{ borderBottomWidth: 1, borderColor: c.line, paddingBottom: 10 }}><Txt>{n.text}</Txt><Txt muted style={{ fontSize: 10 }}>{new Date(n.createdAt).toLocaleString('en-ZA')}</Txt></View>)}<Field label="Add a delivery note" multiline value={text} onChangeText={setText} maxLength={2000} placeholder="Anything dispatch should know?" /><Button secondary title="Save note" icon="pen" onPress={async () => { await note(id,text); setText(''); }} /></Card>
    {order.status==='pending' && <><Button title="Accept delivery" icon="check" onPress={() => status(id,'accepted')} /><Button secondary title="Decline delivery" icon="close" onPress={() => router.push(`/reason/${id}?kind=declined`)} /></>}
    {order.status==='accepted' && <Button title="I'm on my way" icon="navigation" onPress={() => status(id,'enroute')} />}
    {order.status==='enroute' && <Button title="I've arrived" icon="pin" onPress={() => status(id,'arrived')} />}
    {order.status==='arrived' && <Button title="Capture proof & complete" icon="camera" onPress={() => router.push(`/proof/${id}`)} />}
    {!isFinished(order.status) && order.status!=='pending' && <Button secondary title="Report failed delivery" icon="help" onPress={() => router.push(`/reason/${id}?kind=failed`)} />}
  </Page>;
}
