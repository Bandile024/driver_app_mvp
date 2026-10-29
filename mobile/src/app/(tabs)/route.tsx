import React, { useState } from 'react';
import { View } from 'react-native';
import { Button, Empty, Heading, OrderCard, Page, Row, Txt } from '../../components/ui';
import DeliveryMap from '../../components/DeliveryMap';
import { useDriver } from '../../core/store';
import { Coordinate, isFinished } from '../../core/types';
import { captureLocation } from '../../core/runtime';
import { navigate } from '../../core/contact';
export default function RouteScreen() {
  const { state } = useDriver(); const [selected, setSelected] = useState<string>(); const [location, setLocation] = useState<Coordinate | null>(null);
  const orders = state?.orders.filter(o => !isFinished(o.status)) || [];
  const order = orders.find(o => o.id === selected) || orders[0];
  return <Page><Heading title="Your way forward." subtitle={`${orders.length} destinations. One good journey.`} />
    {order ? <>
      <DeliveryMap orders={orders} selected={order.id} onSelect={setSelected} height={340} location={location} />
      <Row style={{ flexWrap: 'wrap' }}><Button compact secondary title="My location" icon="pin" onPress={async () => { const p = await captureLocation(); if (!p) throw new Error('Location unavailable. Check GPS and location permissions.'); setLocation(p); }} /><Txt muted style={{ fontSize: 11 }}>{location ? `Measured ${new Date(location.timestamp).toLocaleTimeString('en-ZA')}` : 'Tap a pin to choose a stop'}</Txt></Row>
      <OrderCard order={order} priority /><Button title="Navigate with Google Maps" icon="navigation" onPress={() => navigate(order)} /><Button secondary title="Open in Waze" icon="navigation" onPress={() => navigate(order,true)} />
      <View style={{ gap: 12 }}><Txt display style={{ fontSize: 26, lineHeight: 32 }}>All destinations</Txt>{orders.filter(o => o.id !== order.id).map(o => <Button key={o.id} secondary title={o.customer} icon="pin" onPress={() => setSelected(o.id)} />)}</View>
    </> : <Empty title="A clear road ahead." body="Your assigned destinations will appear here." icon="map" />}
  </Page>;
}
