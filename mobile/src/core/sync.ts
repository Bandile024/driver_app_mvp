import { api, ApiError } from './api';
import { changeState, exclusive, imagePayload, loadState, persistImage, stateKey } from './storage';
import { DriverState, Mutation, Order, Profile, Proof, Session } from './types';
async function wireMutation(m: Mutation): Promise<Mutation> {
  const payload = { ...m.payload };
  if (payload.proof) { const proof = payload.proof as Proof; payload.proof = { ...proof, photo: await imagePayload(proof.photo) }; }
  if (typeof payload.avatar === 'string' && payload.avatar) payload.avatar = await imagePayload(payload.avatar);
  return { ...m, payload };
}
export async function synchronize(session: Session): Promise<{ state: DriverState; newOrders: Order[] }> {
  return exclusive(`sync:${stateKey(session)}`, async () => {
    if (session.demo) return { state: await loadState(session), newOrders: [] };
    try {
      const previous = await loadState(session);
      const blocked = new Set<string>(); let syncError: string | undefined;
      for (const mutation of previous.outbox) {
        const group = mutation.orderId || mutation.kind;
        if (blocked.has(group)) continue;
        try {
          await api(session, '/api/mutations', await wireMutation(mutation));
          await changeState(session, state => ({ ...state, outbox: state.outbox.filter(m => m.id !== mutation.id) }));
        } catch (error) {
          if (!(error instanceof ApiError) || ![400,409,404,413].includes(error.status)) throw error;
          blocked.add(group);
          syncError = `${mutation.orderId || mutation.kind}: ${error.message} Saved changes remain queued; contact dispatch.`;
        }
      }
      const response = await api<{ orders: Order[]; profile: Profile }>(session, '/api/snapshot');
      // Keep large image payloads out of Android's AsyncStorage cursor window.
      for (const order of response.orders) if (order.proof?.photo.startsWith('data:')) {
        const local = previous.orders.find(o => o.id === order.id)?.proof;
        order.proof.photo = local?.capturedAt === order.proof.capturedAt && local.photo && !local.photo.startsWith('data:')
          ? local.photo : await persistImage(order.proof.photo);
      }
      if (response.profile.avatar?.startsWith('data:')) response.profile.avatar = await persistImage(response.profile.avatar);
      const newOrders = response.orders.filter(order => !previous.orders.some(old => old.id === order.id));
      const state = await changeState(session, latest => {
        const protectedIds = new Set(latest.outbox.map(m => m.orderId));
        const orders = response.orders.map(remote => protectedIds.has(remote.id) ? latest.orders.find(o => o.id === remote.id) || remote : remote);
        for (const local of latest.orders) if (protectedIds.has(local.id) && !orders.some(o => o.id === local.id)) orders.push(local);
        return { ...latest, orders, profile: latest.outbox.some(m => m.kind === 'profile') ? latest.profile : response.profile, lastSync: new Date().toISOString(), syncError };
      });
      return { state, newOrders };
    } catch (error) {
      const message = error instanceof ApiError && error.status === 401 ? 'Your session expired. Sign in again with the same account to sync saved work.' : error instanceof Error ? error.message : 'Sync paused.';
      const state = await changeState(session, s => ({ ...s, syncError: message }));
      return { state, newOrders: [] };
    }
  });
}
