import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { DriverState, Session } from './types';
import { initialState } from './demo';
const SESSION = 'eskort-session-v1';
export const stateKey = (s: Session) => `eskort-v1:${s.server || 'demo'}:${s.user.id}`;
const locks = new Map<string, Promise<unknown>>();
export function exclusive<T>(key: string, job: () => Promise<T>): Promise<T> {
  const next = (locks.get(key) ?? Promise.resolve()).catch(() => undefined).then(job);
  locks.set(key, next);
  const cleanup = () => { if (locks.get(key) === next) locks.delete(key); };
  void next.then(cleanup, cleanup); return next;
}
export async function loadSession(): Promise<Session | null> {
  const value = Platform.OS === 'web' ? await AsyncStorage.getItem(SESSION) : await SecureStore.getItemAsync(SESSION);
  return value ? JSON.parse(value) : null;
}
export async function saveSession(session: Session | null) {
  if (Platform.OS === 'web') { if (session) await AsyncStorage.setItem(SESSION, JSON.stringify(session)); else await AsyncStorage.removeItem(SESSION); }
  else if (session) await SecureStore.setItemAsync(SESSION, JSON.stringify(session)); else await SecureStore.deleteItemAsync(SESSION);
}
export async function loadState(session: Session): Promise<DriverState> {
  const value = await AsyncStorage.getItem(stateKey(session));
  return value ? JSON.parse(value) : initialState(session.user, session.demo);
}
export async function changeState(session: Session, update: (state: DriverState) => DriverState): Promise<DriverState> {
  return exclusive(stateKey(session), async () => {
    const next = update(await loadState(session));
    await AsyncStorage.setItem(stateKey(session), JSON.stringify(next));
    return next;
  });
}
export async function persistImage(uri: string, base64?: string | null): Promise<string> {
  if (Platform.OS === 'web') {
    if (base64) return `data:image/jpeg;base64,${base64}`;
    const blob = await (await fetch(uri)).blob();
    return new Promise((resolve,reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob); });
  }
  const directory = `${FileSystem.documentDirectory}evidence/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const destination = `${directory}${uri.startsWith('data:') ? await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, uri) : Crypto.randomUUID()}.jpg`;
  if (uri.startsWith('data:')) {
    if (!(await FileSystem.getInfoAsync(destination)).exists) await FileSystem.writeAsStringAsync(destination, uri.split(',')[1], { encoding: FileSystem.EncodingType.Base64 });
  } else await FileSystem.copyAsync({ from: uri, to: destination });
  return destination;
}
export async function imagePayload(uri: string): Promise<string> {
  if (uri.startsWith('data:')) return uri;
  return `data:image/jpeg;base64,${await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 })}`;
}
