import React from 'react';
import { Button, Card, Heading, Page, Txt } from '../components/ui';
import { useDriver } from '../core/store';
import { contact } from '../core/contact';
export default function Support() {
  const { state }=useDriver(); const order=state?.orders[0];
  return <Page back="Help & support"><Heading title="We’re on your side." subtitle="A little help to keep your day moving." />
    <Card><Txt bold>Contact your store</Txt><Txt muted>For an urgent delivery issue, use the store contact on the delivery details page. A note is saved for dispatch with that delivery.</Txt><Button secondary title="Call dispatch" icon="phone" onPress={()=>contact('tel',order?.storePhone || '')} /><Button secondary title="Email dispatch" icon="mail" onPress={()=>contact('mailto',order?.storeEmail || '')} /></Card>
    <Card><Txt bold>Working without signal</Txt><Txt>Assigned deliveries, status changes, notes, photos and signatures are saved locally. Keep the app installed and sign in with the same account to sync your work. Pull down on Today to retry.</Txt></Card>
    <Card><Txt bold>Location & battery</Txt><Txt>Location is collected during an active shift with balanced accuracy, a 100-metre distance threshold and roughly one-minute Android updates. Android may delay updates to save power. End your shift to stop tracking.</Txt><Txt muted>Allow background location for shift tracking. Force-stopping the app prevents background work until reopened.</Txt></Card>
    <Card><Txt bold>New delivery alerts</Txt><Txt>The open feed checks dispatch every 30 seconds. Remote notifications need your organisation’s configured Expo/FCM project. Device permissions, network availability and Android power management affect arrival time.</Txt></Card>
  </Page>;
}
