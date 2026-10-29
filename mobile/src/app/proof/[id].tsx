import React, { useEffect, useRef, useState } from 'react';
import { Image, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, Card, Empty, Field, Heading, Icon, Page, Row, Txt } from '../../components/ui';
import Signature from '../../components/Signature';
import { useDriver } from '../../core/store';
import { captureLocation } from '../../core/runtime';
import { exclusive, persistImage, stateKey } from '../../core/storage';
import { Coordinate, Stroke, validSignature } from '../../core/types';
type Draft = { recipient: string; photo: string; signature: Stroke[]; location: Coordinate | null; locationReason: string; capturedAt: string };
const blank: Draft = { recipient: '', photo: '', signature: [], location: null, locationReason: '', capturedAt: '' };
export default function ProofScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const { state, session, status } = useDriver();
  const order = state?.orders.find(o => o.id===id);
  const key = session ? `proof:${stateKey(session)}:${id}` : '';
  const [draft, setDraft] = useState<Draft>(blank), [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState('');
  const current = useRef<Draft>(blank);
  useEffect(() => {
    let alive = true;
    if (key) void AsyncStorage.getItem(key).then(s => {
      if (!alive) return;
      current.current = s ? JSON.parse(s) : { ...blank };
      setDraft(current.current); setReady(true);
    }).catch(() => { if (alive) setSaveError('Saved proof could not be loaded. Go back and reopen this delivery.'); });
    return () => { alive = false; };
  },[key]);
  async function patch(values: Partial<Draft>) {
    if (!ready) return;
    const next = { ...current.current, ...values };
    current.current = next; setDraft(next);
    await exclusive(key, async () => {
      await AsyncStorage.setItem(key,JSON.stringify(next)); setSaveError('');
    }).catch(() => { setSaveError('Proof could not be saved. Free device storage and retry before leaving.'); });
  }
  if (!order || order.status!=='arrived') return <Page back="Proof of delivery"><Empty title="Ready when you arrive." body="Mark this delivery as arrived before capturing proof." /></Page>;
  return <Page back="Proof of delivery"><Heading title="Signed. Sealed. Delivered." subtitle={`${order.reference} · ${order.customer}`} />
    <Card><Row><Icon name="shield" color="#007748" /><Txt bold>Saved on this device as you go</Txt></Row><Txt muted style={{ fontSize: 12 }}>Your photo and signature stay available offline, even if you leave this screen.</Txt></Card>
    {!!saveError && <Card><Txt>{saveError}</Txt>{ready && <Button secondary title="Retry saving proof" onPress={() => patch({})} />}</Card>}
    <Field label="Recipient's full name" value={draft.recipient} onChangeText={recipient => { void patch({ recipient }); }} editable={ready} maxLength={100} />
    <View style={{ gap: 12 }}><Txt bold>1. Delivery photo</Txt>
      {!!draft.photo && <Image source={{ uri: draft.photo }} style={{ width: '100%', height: 240, borderRadius: 16 }} />}
      <Button secondary title={draft.photo ? 'Retake photo' : 'Take delivery photo'} icon="camera" disabled={!ready} onPress={async () => {
        if (!(await ImagePicker.requestCameraPermissionsAsync()).granted) throw new Error('Allow camera access in device settings to capture delivery proof.');
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.5, base64: true });
        if (result.canceled) return;
        const image = result.assets[0]; const photo = await persistImage(image.uri,image.base64);
        const capturedAt = new Date().toISOString();
        await patch({ photo, capturedAt, location: null });
        await patch({ location: await captureLocation() });
      }} />
    </View>
    <View style={{ gap: 12 }}><Txt bold>2. Recipient’s signature</Txt><Signature value={draft.signature} onChange={signature => { void patch({ signature }); }} /></View>
    <Card><Txt bold>3. Time & location</Txt><Txt muted>{draft.capturedAt ? new Date(draft.capturedAt).toLocaleString('en-ZA') : 'Captured when the photo is taken'}</Txt>
      <Txt muted>{draft.location ? `${draft.location.latitude.toFixed(5)}, ${draft.location.longitude.toFixed(5)} · ±${Math.round(draft.location.accuracy || 0)}m` : 'GPS not recorded yet.'}</Txt>
      <Button compact secondary title="Refresh GPS stamp" icon="pin" onPress={async () => { const location = await captureLocation(); await patch({ location }); if (!location) throw new Error('GPS unavailable. Record the reason below.'); }} />
      {!draft.location && <Field label="Why is GPS unavailable?" placeholder="e.g. No signal inside the building" value={draft.locationReason} onChangeText={locationReason => { void patch({ locationReason }); }} maxLength={250} />}
    </Card>
    <Txt muted style={{ fontSize: 12 }}>By completing, you confirm these packages were handed to the named recipient.</Txt>
    <Button title="Complete delivery" icon="check" disabled={!ready} onPress={async () => {
      await exclusive(key, async () => {
        const proof = current.current;
        if (!proof.photo || !proof.recipient.trim() || !validSignature(proof.signature)) throw new Error('Add a photo, recipient name and a drawn signature.');
        if (!proof.location && !proof.locationReason.trim()) throw new Error('Add a reason if GPS could not be recorded.');
        await AsyncStorage.setItem(key,JSON.stringify(proof));
        await status(id,'delivered',undefined,proof);
        await AsyncStorage.removeItem(key);
      });
      router.replace(`/order/${id}`);
    }} />
  </Page>;
}
