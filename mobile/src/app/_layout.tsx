import React from 'react';
import { ActivityIndicator, View, Text, Platform } from 'react-native';
import { Stack, useSegments, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DriverProvider, useDriver } from '../core/store';
function Navigation() {
  const { ready, session, state, notice } = useDriver();
  const segments = useSegments();
  const [fonts, error] = useFonts({
    Spaza: require('../../assets/brand/EskortSpaza.otf'),
    Mont: require('../../assets/brand/Montserrat-Regular.ttf'),
    MontBold: require('../../assets/brand/Montserrat-Bold.ttf'),
  });
  React.useEffect(() => {
    if (!ready || (!fonts && !error)) return;
    const auth = segments[0] === 'login';
    if (!session && !auth) router.replace('/login');
    if (session && auth) router.replace('/(tabs)');
  }, [ready, session, segments, fonts, error]);
  if (!ready || (!fonts && !error)) return <View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#FCF9F1' }}><ActivityIndicator color="#003254" /></View>;
  return <View style={{ flex: 1, backgroundColor: state?.dark ? '#151817' : '#FCF9F1', ...(Platform.OS === 'web' ? { maxWidth: 600, width: '100%', alignSelf: 'center' as const } : {}) }}>
    <StatusBar style={state?.dark ? 'light' : 'dark'} />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: state?.dark ? '#151817' : '#FCF9F1' }, animation: 'slide_from_right' }}>
      <Stack.Screen name="(tabs)" /><Stack.Screen name="login" /><Stack.Screen name="order/[id]" /><Stack.Screen name="proof/[id]" /><Stack.Screen name="reason/[id]" /><Stack.Screen name="support" />
    </Stack>
    {!!notice && <View accessibilityLiveRegion="polite" style={{ position: 'absolute', bottom: 92, left: 18, right: 18, padding: 16, backgroundColor: '#003254', borderRadius: 14 }}><Text style={{ fontFamily: 'Mont', color: '#FFF', lineHeight: 20 }}>{notice}</Text></View>}
  </View>;
}
export default function Layout() { return <SafeAreaProvider><DriverProvider><Navigation /></DriverProvider></SafeAreaProvider>; }
