import React, { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Brand, Button, Field, Heading, JourneyIllustration, Page, Row, Txt } from '../components/ui';
import { useDriver } from '../core/store';
export default function Login() {
  const { login, demo } = useDriver();
  const [register, setRegister] = useState(false);
  const [server, setServer] = useState(process.env.EXPO_PUBLIC_API_URL || '');
  const [identifier, setIdentifier] = useState(''), [password, setPassword] = useState('');
  const [name, setName] = useState(''), [phone, setPhone] = useState('');
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><Page>
    <Brand />
    <View style={{ backgroundColor: '#003254', borderRadius: 24, padding: 24, paddingBottom: 12, marginTop: 10 }}>
      <Txt style={{ color: '#F6C000', fontSize: 11, letterSpacing: 2 }} bold>GOOD FOOD. GOOD JOURNEYS.</Txt>
      <Txt display style={{ fontSize: 52, lineHeight: 57, color: '#FCF9F1', marginTop: 20 }}>Let’s get{'\n'}moving.</Txt>
      <JourneyIllustration />
    </View>
    <Heading title={register ? 'Join the journey.' : 'Welcome, driver.'} subtitle={register ? 'Your next chapter starts here.' : 'Your route. Your deliveries. All in one place.'} />
    <View style={{ gap: 16 }}>
      {register && <Field label="Full name" value={name} onChangeText={setName} autoComplete="name" />}
      <Field label={register ? 'Email address' : 'Email or phone'} value={identifier} onChangeText={setIdentifier} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      {register && <Field label="Mobile number" value={phone} onChangeText={setPhone} placeholder="+27" keyboardType="phone-pad" />}
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete={register ? 'new-password' : 'current-password'} placeholder={register ? 'At least 10 characters' : 'Your password'} />
      <Field label="Dispatch server" value={server} onChangeText={setServer} placeholder="https://dispatch.your-company.co.za" keyboardType="url" autoCapitalize="none" />
      <Button title={register ? 'Create driver account' : 'Sign in'} onPress={async () => {
        if (!identifier.trim() || !password || !server.trim()) throw new Error('Enter your details and dispatch server address.');
        if (register && (!name.trim() || !phone.trim() || password.length < 10)) throw new Error('Add your name, mobile number and a password of at least 10 characters.');
        await login(server, identifier, password, register ? { name: name.trim(), phone: phone.trim() } : undefined);
      }} />
      <Pressable accessibilityRole="button" onPress={() => setRegister(!register)} style={{ minHeight: 44, justifyContent: 'center' }}><Txt style={{ textAlign: 'center' }}>{register ? 'Already registered? ' : 'New to the team? '}<Txt bold>{register ? 'Sign in' : 'Create an account'}</Txt></Txt></Pressable>
    </View>
    <Row><View style={{ height: 1, backgroundColor: '#DEDAD0', flex: 1 }} /><Txt muted style={{ fontSize: 11 }}>TAKE A LOOK AROUND</Txt><View style={{ height: 1, backgroundColor: '#DEDAD0', flex: 1 }} /></Row>
    <Button secondary title="Explore the demo" onPress={demo} />
    <Txt muted style={{ textAlign: 'center', fontSize: 11 }}>Sample deliveries. No account needed.{'\n'}Live operations need your connected dispatch server.</Txt>
  </Page></KeyboardAvoidingView>;
}
