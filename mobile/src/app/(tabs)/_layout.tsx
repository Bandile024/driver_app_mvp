import React from 'react';
import { Tabs } from 'expo-router';
import { Icon, usePalette } from '../../components/ui';
export default function TabLayout() {
  const c = usePalette();
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: c.ink, tabBarInactiveTintColor: c.muted, tabBarLabelStyle: { fontFamily: 'MontBold', fontSize: 10, marginBottom: 4 }, tabBarStyle: { backgroundColor: c.bg, borderTopColor: c.line, paddingTop: 8, height: 78 }, tabBarActiveBackgroundColor: c.soft }}>
    <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: ({ color }) => <Icon name="package" color={color} /> }} />
    <Tabs.Screen name="route" options={{ title: 'My route', tabBarIcon: ({ color }) => <Icon name="map" color={color} /> }} />
    <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: ({ color }) => <Icon name="history" color={color} /> }} />
    <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <Icon name="user" color={color} /> }} />
  </Tabs>;
}
