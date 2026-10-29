import { DriverState, Order, Profile } from './types';
export const demoProfile: Profile = { id: 'demo-driver', name: 'Thabo Mokoena', email: 'thabo@example.com', phone: '', vehicle: 'Delivery van' };
export function demoOrders(): Order[] {
  const now = new Date(); const today = (hour: number, day = 0) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + day, hour).toISOString();
  const base = { phone: '', email: 'customer@example.com', store: 'Eskort dispatch', storePhone: '', storeEmail: 'dispatch@example.com', instructions: 'Please ring the bell at the main entrance. Keep chilled items together.', dispatchNotes: 'Check the package count before leaving the store.', notes: [], createdAt: today(7), updatedAt: today(8) };
  return [
    { ...base, id: 'demo-1042', reference: 'ESK-1042', customer: 'Lerato Molefe', address: '12 4th Avenue', suburb: 'Parkhurst, Johannesburg', latitude: -26.1406, longitude: 28.0177, packages: 3, windowStart: today(10), windowEnd: today(12), status: 'accepted' },
    { ...base, id: 'demo-1043', reference: 'ESK-1043', customer: 'James Petersen', address: '24 Tyrwhitt Avenue', suburb: 'Rosebank, Johannesburg', latitude: -26.1454, longitude: 28.0396, packages: 2, windowStart: today(11), windowEnd: today(13), status: 'pending' },
    { ...base, id: 'demo-1044', reference: 'ESK-1044', customer: 'Nomsa Dlamini', address: '8 Bompas Road', suburb: 'Dunkeld, Johannesburg', latitude: -26.1314, longitude: 28.0364, packages: 5, windowStart: today(12), windowEnd: today(14), status: 'pending' },
    { ...base, id: 'demo-1038', reference: 'ESK-1038', customer: 'Ayesha Khan', address: '31 Jan Smuts Avenue', suburb: 'Saxonwold, Johannesburg', latitude: -26.1574, longitude: 28.0352, packages: 2, windowStart: today(8), windowEnd: today(10), status: 'delivered', completedAt: today(9) },
    { ...base, id: 'demo-1029', reference: 'ESK-1029', customer: 'Sipho Nkosi', address: '5 Oxford Road', suburb: 'Houghton, Johannesburg', latitude: -26.1731, longitude: 28.0518, packages: 1, windowStart: today(13,-1), windowEnd: today(15,-1), status: 'failed', completedAt: today(14,-1), reason: 'Customer unavailable' },
  ];
}
export function initialState(profile: Profile, demo = false): DriverState {
  return { profile, orders: demo ? demoOrders() : [], outbox: [], shiftStartedAt: null, shiftSeconds: 0, dark: false, notifications: false };
}
