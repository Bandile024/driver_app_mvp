import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import * as Crypto from 'expo-crypto';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { api, request, serverURL } from './api';
import { demoOrders, demoProfile } from './demo';
import { changeState, loadSession, loadState, persistImage, saveSession } from './storage';
import { synchronize } from './sync';
import { enableNotifications, flushLocation, localNotification, registerBackgroundSync, startTracking, stopTracking } from './runtime';
import { DriverState, isFinished, Mutation, Profile, Proof, Session, Status, validateTransition } from './types';

function useDriverStore() {
  const [session, setSession] = useState<Session | null>(null);
  const [state, setState] = useState<DriverState | null>(null);
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState('');
  const active = useRef<Session | null>(null);
  const notify = useCallback((message: string) => setNotice(message), []);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 6500); return () => clearTimeout(timer); }, [notice]);
  useEffect(() => { let alive = true; loadSession().then(async s => { if (s) { const data = await loadState(s); if (alive) { active.current = s; setState(data); setSession(s); } } }).catch(() => notify('Saved session could not be restored. Please sign in.')).finally(() => { if (alive) setReady(true); }); return () => { alive = false; }; }, [notify]);
  const refresh = useCallback(async () => {
    const s = active.current; if (!s) return;
    setSyncing(true);
    try {
      const result = await synchronize(s);
      if (active.current !== s) return;
      setState(result.state);
      if (result.newOrders.length) notify(`${result.newOrders.length} new delivery offer${result.newOrders.length > 1 ? 's' : ''} received.`);
      await flushLocation(s);
    } catch (e) { notify(e instanceof Error ? e.message : 'Sync could not finish.'); }
    finally { setSyncing(false); }
  }, [notify]);
  useEffect(() => {
    const sub = NetInfo.addEventListener(network => { const connected = network.isConnected !== false && network.isInternetReachable !== false; setOnline(connected); if (connected) void refresh(); });
    return sub;
  }, [refresh]);
  useEffect(() => {
    if (!session) return;
    void refresh();
    if (!session.demo) void registerBackgroundSync().catch(() => notify('Background sync is restricted. Sync resumes when you open the app.'));
    const timer = setInterval(() => { if (AppState.currentState === 'active') void refresh(); }, 30000);
    const lifecycle = AppState.addEventListener('change', next => { if (next === 'active') void refresh(); });
    if (Platform.OS === 'web') return () => { clearInterval(timer); lifecycle.remove(); };
    const openOrder = (response: Notifications.NotificationResponse | null) => {
      const id = response?.notification.request.content.data?.orderId;
      if (typeof id === 'string' && /^[a-zA-Z0-9-]+$/.test(id)) { void refresh(); router.push(`/order/${id}`); }
    };
    void Notifications.getLastNotificationResponseAsync().then(openOrder);
    const received = Notifications.addNotificationReceivedListener(() => { void refresh(); });
    const response = Notifications.addNotificationResponseReceivedListener(openOrder);
    return () => { clearInterval(timer); lifecycle.remove(); received.remove(); response.remove(); };
  }, [session, refresh, notify]);
  const update = useCallback(async (fn: (s: DriverState) => DriverState) => {
    const s = active.current; if (!s) throw new Error('Sign in first.');
    const result = await changeState(s, fn);
    if (active.current === s) setState(result);
    return result;
  }, []);
  async function enter(s: Session) {
    if (s.user.avatar?.startsWith('data:')) s = { ...s, user: { ...s.user, avatar: await persistImage(s.user.avatar) } };
    await saveSession(s); const data = await loadState(s);
    active.current = s; setState(data); setSession(s);
  }
  async function login(server: string, identifier: string, password: string, registration?: { name: string; phone: string }) {
    const origin = serverURL(server);
    const result = await request<{ token: string; user: Profile }>(origin, registration ? '/api/auth/register' : '/api/auth/login', undefined, { identifier: identifier.trim(), password, ...registration });
    await enter({ ...result, server: origin, demo: false });
  }
  async function demo() { await enter({ user: demoProfile, server: '', token: '', demo: true }); }
  async function logout() {
    await stopTracking();
    if (state?.shiftStartedAt) await shift(false);
    const s = active.current;
    if (s && !s.demo) await api(s, '/api/push-token', { token: null }).catch(() => undefined);
    await saveSession(null); active.current = null; setSession(null); setState(null);
  }
  function mutation(kind: Mutation['kind'], payload: Record<string, unknown>, orderId?: string): Mutation { return { id: Crypto.randomUUID(), kind, payload, orderId, createdAt: new Date().toISOString() }; }
  async function status(orderId: string, next: Status, reason?: string, proof?: Proof) {
    const m = mutation('status', { status: next, reason, proof }, orderId);
    await update(s => {
      const order = s.orders.find(o => o.id === orderId); if (!order) throw new Error('Delivery not found.');
      validateTransition(order, next, reason, proof);
      return { ...s, orders: s.orders.map(o => o.id === orderId ? { ...o, status: next, reason, proof: proof || o.proof, updatedAt: m.createdAt, ...(isFinished(next) ? { completedAt: m.createdAt } : {}) } : o), outbox: session?.demo ? s.outbox : [...s.outbox, m] };
    });
    notify(session?.demo ? 'Saved on this device.' : 'Saved. Syncing with dispatch when connected.');
    void refresh();
  }
  async function note(orderId: string, text: string) {
    if (!text.trim()) throw new Error('Write a note first.');
    const m = mutation('note', { text: text.trim() }, orderId);
    await update(s => ({ ...s, orders: s.orders.map(o => o.id === orderId ? { ...o, notes: [...o.notes, { id: m.id, text: text.trim(), createdAt: m.createdAt }] } : o), outbox: session?.demo ? s.outbox : [...s.outbox, m] }));
    notify(session?.demo ? 'Demo note saved.' : 'Note saved for dispatch.'); void refresh();
  }
  async function profile(fields: Partial<Profile>) {
    const m = mutation('profile', fields);
    await update(s => ({ ...s, profile: { ...s.profile, ...fields }, outbox: session?.demo ? s.outbox : [...s.outbox, m] })); notify('Profile saved.'); void refresh();
  }
  async function shift(enabled: boolean) {
    if (enabled && !session?.demo) await startTracking();
    if (!enabled) await stopTracking();
    const m = mutation('shift', { active: enabled });
    try { await update(s => ({ ...s, shiftStartedAt: enabled ? m.createdAt : null, shiftSeconds: s.shiftSeconds + (!enabled && s.shiftStartedAt ? Math.floor((Date.now() - Date.parse(s.shiftStartedAt)) / 1000) : 0), outbox: session?.demo ? s.outbox : [...s.outbox, m] })); }
    catch (e) { if (enabled) await stopTracking(); throw e; }
    notify(enabled ? session?.demo ? 'Demo shift started. No location is shared.' : 'Shift started. Dispatch can see your location.' : 'Shift ended. Tracking stopped.');
    void refresh();
  }
  async function notifications(enabled: boolean) {
    if (!session) return;
    if (enabled) await enableNotifications(session);
    else if (!session.demo) await api(session, '/api/push-token', { token: null });
    await update(s => ({ ...s, notifications: enabled }));
  }
  async function simulateOffer() {
    if (!session?.demo) return;
    const order = { ...demoOrders()[1], id: `demo-${Crypto.randomUUID()}`, reference: `ESK-${Math.floor(2000+Math.random()*8000)}`, createdAt: new Date().toISOString() };
    await update(s => ({ ...s, orders: [order, ...s.orders] })); notify('New demo offer received. Check Today.');
    if (state?.notifications) await localNotification(order.id, 'New demo delivery');
  }
  return { session, state, ready, online, syncing, notice, notify, refresh, login, demo, logout, status, note, profile, shift, notifications, simulateOffer, update };
}
type Store = ReturnType<typeof useDriverStore>;
const Context = createContext<Store | null>(null);
export function DriverProvider({ children }: { children: React.ReactNode }) { const store = useDriverStore(); return <Context.Provider value={store}>{children}</Context.Provider>; }
export function useDriver() { const context = useContext(Context); if (!context) throw new Error('DriverProvider missing'); return context; }
