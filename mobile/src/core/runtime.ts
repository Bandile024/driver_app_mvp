import { Platform } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';
import { loadSession, loadState, stateKey, exclusive } from './storage';
import { synchronize } from './sync';
import { Coordinate, Session } from './types';
export const LOCATION_TASK = 'eskort-shift-location-v1';
const SYNC_TASK = 'eskort-background-sync-v1';
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(LOCATION_TASK, async ({ data, error }) => {
    if (error || !data) return;
    const session = await loadSession(); if (!session || session.demo) return;
    const state = await loadState(session); if (!state.shiftStartedAt) return;
    const latest = data.locations[data.locations.length - 1]; if (!latest) return;
    await saveLocation(session, { latitude: latest.coords.latitude, longitude: latest.coords.longitude, accuracy: latest.coords.accuracy, timestamp: latest.timestamp });
  });
  TaskManager.defineTask(SYNC_TASK, async () => {
    try { const session = await loadSession(); if (session && !session.demo) { const result = await synchronize(session); if (result.state.syncError) return BackgroundTask.BackgroundTaskResult.Failed; await flushLocation(session); } return BackgroundTask.BackgroundTaskResult.Success; }
    catch { return BackgroundTask.BackgroundTaskResult.Failed; }
  });
}
export async function saveLocation(session: Session, location: Coordinate) {
  await AsyncStorage.setItem(`location:${stateKey(session)}`, JSON.stringify(location));
  await flushLocation(session);
}
export async function flushLocation(session: Session) {
  const key = `location:${stateKey(session)}`;
  await exclusive(`send:${key}`, async () => {
    const value = await AsyncStorage.getItem(key); if (!value || session.demo) return;
    const state = await loadState(session);
    if (!state.shiftStartedAt) { await AsyncStorage.removeItem(key); return; }
    try { await api(session, '/api/location', JSON.parse(value)); if (await AsyncStorage.getItem(key) === value) await AsyncStorage.removeItem(key); } catch { /* latest point remains durable for next connection */ }
  });
}
export async function startTracking() {
  if (Platform.OS === 'web') throw new Error('Background shift tracking is available in the Android app.');
  const fg = await Location.requestForegroundPermissionsAsync();
  if (!fg.granted) throw new Error('Location permission is needed to start a tracked shift. Enable it in Android settings.');
  const bg = await Location.requestBackgroundPermissionsAsync();
  if (!bg.granted) throw new Error('Choose “Allow all the time” for shift tracking, then start your shift again.');
  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced, distanceInterval: 100, timeInterval: 60000,
    deferredUpdatesInterval: 60000, deferredUpdatesDistance: 100, pausesUpdatesAutomatically: true,
    activityType: Location.ActivityType.AutomotiveNavigation,
    foregroundService: { notificationTitle: 'Eskort shift active', notificationBody: 'Location is shared with dispatch while your shift is active.', notificationColor: '#F6C000', killServiceOnDestroy: true },
  });
}
export async function stopTracking() {
  if (Platform.OS !== 'web' && await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
}
export async function registerBackgroundSync() {
  if (Platform.OS !== 'web') await BackgroundTask.registerTaskAsync(SYNC_TASK, { minimumInterval: 15 });
}
export async function captureLocation(): Promise<Coordinate | null> {
  try {
    if (!(await Location.requestForegroundPermissionsAsync()).granted) return null;
    const location = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>(resolve => setTimeout(() => resolve(null), 12000)),
    ]);
    return location ? { latitude: location.coords.latitude, longitude: location.coords.longitude, accuracy: location.coords.accuracy, timestamp: location.timestamp } : null;
  } catch { return null; }
}
export async function enableNotifications(session: Session) {
  if (Platform.OS === 'web') throw new Error('Push notifications are available in the Android app.');
  await Notifications.setNotificationChannelAsync('deliveries', { name: 'Delivery updates', importance: Notifications.AndroidImportance.HIGH });
  if (!(await Notifications.requestPermissionsAsync()).granted) throw new Error('Notifications are disabled in your device settings.');
  if (!session.demo) {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) throw new Error('Remote push needs an Expo project and FCM configuration. The live feed still refreshes every 30 seconds.');
    let token: string;
    try { token = (await Notifications.getExpoPushTokenAsync({ projectId })).data; }
    catch { throw new Error('Remote push needs Firebase/FCM configured in this Android build. The open feed still refreshes every 30 seconds.'); }
    await api(session, '/api/push-token', { token });
  }
}
export async function localNotification(orderId: string, title: string) {
  if (Platform.OS !== 'web') await Notifications.scheduleNotificationAsync({ content: { title, body: 'Open your delivery feed for the details.', data: { orderId }, sound: 'default' }, trigger: null });
}
