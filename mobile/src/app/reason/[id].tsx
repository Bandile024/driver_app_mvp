import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Button, Field, Heading, Icon, Page, Row, Txt, usePalette } from '../../components/ui';
import { useDriver } from '../../core/store';
export default function Reason() {
  const { id,kind } = useLocalSearchParams<{ id: string; kind: string }>(); const { status }=useDriver(); const c=usePalette();
  const [reason,setReason]=useState(''), [detail,setDetail]=useState('');
  const declined=kind==='declined'; const reasons=declined ? ['Outside my delivery area','Vehicle issue','Shift ending','Capacity reached','Other'] : ['Customer unavailable','Incorrect address','Customer refused delivery','Damaged package','Vehicle issue','Other'];
  return <Page back="Delivery"><Heading title={declined ? 'Can’t take this one?' : 'Let’s flag the issue.'} subtitle="Choose a reason so the store can take the next step." />
    {reasons.map(r => <Pressable key={r} accessibilityRole="radio" accessibilityState={{ checked: reason===r }} onPress={() => setReason(r)} style={{ backgroundColor: reason===r ? c.soft : c.card, borderRadius: 14, borderColor: reason===r ? '#C9A227' : c.line, borderWidth: 1, padding: 18 }}><Row style={{ justifyContent: 'space-between' }}><Txt>{r}</Txt><Icon name={reason===r ? 'check' : 'help'} color={c.ink} /></Row></Pressable>)}
    <Field label="Additional details" value={detail} onChangeText={setDetail} multiline maxLength={1000} placeholder="Give dispatch a little more context." />
    <Button danger title={declined ? 'Confirm decline' : 'Mark delivery as failed'} icon="check" onPress={async () => { if (!reason || (reason==='Other' && !detail.trim())) throw new Error('Select a reason and add details for Other.'); await status(id,declined ? 'declined' : 'failed',`${reason}${detail.trim() ? ` — ${detail.trim()}` : ''}`); router.replace(`/order/${id}`); }} />
  </Page>;
}
