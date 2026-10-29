import React, { useEffect, useState } from 'react';
import { Image, Switch, View } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Button, Card, Field, Heading, Icon, Page, Row, Txt, usePalette } from '../../components/ui';
import { useDriver } from '../../core/store';
import { persistImage } from '../../core/storage';
import { localDate } from '../../core/types';
export default function ProfileScreen() {
  const { state,session,profile,update,notifications,simulateOffer,logout,notify }=useDriver(); const c=usePalette();
  const [name,setName]=useState(''), [phone,setPhone]=useState(''), [vehicle,setVehicle]=useState(''), [edit,setEdit]=useState(false), [signout,setSignout]=useState(false);
  useEffect(() => { if (state?.profile) { setName(state.profile.name); setPhone(state.profile.phone); setVehicle(state.profile.vehicle); } },[state?.profile]);
  if (!state) return null;
  const completed=state.orders.filter(o => o.status==='delivered' && o.completedAt && localDate(o.completedAt)===localDate(new Date()));
  const ontime=completed.filter(o => o.completedAt && o.completedAt<=o.windowEnd).length;
  const seconds=state.shiftSeconds+(state.shiftStartedAt ? (Date.now()-Date.parse(state.shiftStartedAt))/1000 : 0);
  return <Page><Heading title="The person behind the wheel." />
    <Row><View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: c.gold, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>{state.profile.avatar ? <Image source={{ uri: state.profile.avatar }} style={{ width: 84,height: 84 }} /> : <Txt display style={{ fontSize: 34,lineHeight: 42,color: '#1A1A1A' }}>{state.profile.name.split(' ').map(n=>n[0]).slice(0,2).join('')}</Txt>}</View><View style={{ flex: 1 }}><Txt bold style={{ fontSize: 20,lineHeight: 26 }}>{state.profile.name}</Txt><Txt muted style={{ fontSize: 12 }}>{state.profile.email}</Txt><Txt muted style={{ fontSize: 11 }}>{session?.demo ? 'DEMO DRIVER' : 'ESKORT DRIVER'}</Txt></View></Row>
    <Row style={{ flexWrap: 'wrap' }}><Button compact secondary title="Change photo" icon="camera" onPress={async () => {
      const result=await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'],allowsEditing: true,aspect: [1,1],quality: .5,base64: true });
      if (!result.canceled) await profile({ avatar: await persistImage(result.assets[0].uri,result.assets[0].base64) });
    }} /><Button compact secondary title={edit ? 'Cancel editing' : 'Edit profile'} icon="pen" onPress={() => setEdit(!edit)} /></Row>
    {edit && <Card><Field label="Full name" value={name} onChangeText={setName} maxLength={100} /><Field label="Mobile number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" /><Field label="Vehicle" value={vehicle} onChangeText={setVehicle} maxLength={100} /><Button title="Save profile" icon="check" onPress={async () => { if (!name.trim()) throw new Error('Your name is required.'); await profile({ name: name.trim(),phone,vehicle }); setEdit(false); }} /></Card>}
    <Card><Txt bold>Your shift in numbers</Txt><Row style={{ justifyContent: 'space-between' }}>{[[`${completed.length}`,'Delivered today'],[`${Math.floor(seconds/3600)}h ${Math.floor(seconds/60)%60}m`,'Time on shift'],[completed.length ? `${Math.round(ontime/completed.length*100)}%` : '—','On time today']].map(([n,label])=><View key={label} style={{ flex: 1,gap: 4 }}><Txt display style={{ fontSize: 28,lineHeight: 34 }}>{n}</Txt><Txt muted style={{ fontSize: 9 }}>{label}</Txt></View>)}</Row><Txt muted style={{ fontSize: 10 }}>Shift time totals this device’s recorded shifts.</Txt></Card>
    <Card><Txt bold>Make it yours</Txt><Row><Icon name="sun" color={c.ink} /><Txt style={{ flex: 1 }}>Dark mode</Txt><Switch accessibilityLabel="Dark mode" value={state.dark} onValueChange={dark => { void update(s=>({...s,dark})); }} trackColor={{ true: '#007748' }} /></Row><Row><Icon name="bell" color={c.ink} /><Txt style={{ flex: 1 }}>Delivery notifications</Txt><Switch accessibilityLabel="Delivery notifications" value={state.notifications} onValueChange={value=>{ void notifications(value).catch(e=>notify(e.message)); }} trackColor={{ true: '#007748' }} /></Row></Card>
    <Card><Txt bold>Dispatch connection</Txt><Txt muted style={{ fontSize: 12 }}>{session?.demo ? 'Demo · sample data stored on this device' : session?.server}</Txt><Txt muted style={{ fontSize: 12 }}>{state.outbox.length} changes waiting to sync</Txt>{session?.demo && <Button secondary title="Simulate a new delivery" icon="bell" onPress={simulateOffer} />}</Card>
    <Button secondary title="Help & support" icon="help" onPress={() => router.push('/support')} />
    {!signout ? <Button secondary title="Sign out" icon="logout" onPress={()=>setSignout(true)} /> : <Card><Txt>{state.outbox.length ? 'Unsynced work stays on this device. Sign in with the same account and server to send it later.' : 'Your shift will end and location tracking will stop.'}</Txt><Button title="Confirm sign out" icon="logout" onPress={logout} /><Button secondary title="Stay signed in" icon="close" onPress={()=>setSignout(false)} /></Card>}
    <Txt muted style={{ textAlign: 'center',fontSize: 11 }}>ESKORT DRIVER · 1.0.0{'\n'}Good food. Good journeys.</Txt>
  </Page>;
}
