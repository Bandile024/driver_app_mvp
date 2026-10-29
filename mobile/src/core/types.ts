export type Status = 'pending' | 'accepted' | 'enroute' | 'arrived' | 'delivered' | 'failed' | 'declined';
export type Coordinate = { latitude: number; longitude: number; accuracy?: number | null; timestamp: number };
export type Stroke = { x: number; y: number }[];
export type Proof = { photo: string; signature: Stroke[]; recipient: string; capturedAt: string; location: Coordinate | null; locationReason?: string };
export type Note = { id: string; text: string; createdAt: string };
export type Order = {
  id: string; reference: string; customer: string; address: string; suburb: string;
  phone: string; email: string; latitude: number; longitude: number;
  packages: number; windowStart: string; windowEnd: string; eta?: string; status: Status;
  instructions: string; dispatchNotes: string; store: string; storePhone: string; storeEmail: string;
  createdAt: string; updatedAt: string; completedAt?: string; reason?: string; proof?: Proof; notes: Note[];
};
export type Profile = { id: string; name: string; email: string; phone: string; vehicle: string; avatar?: string };
export type Session = { token: string; user: Profile; demo: boolean; server: string };
export type Mutation = { id: string; orderId?: string; kind: 'status' | 'note' | 'profile' | 'shift'; payload: Record<string, unknown>; createdAt: string };
export type DriverState = { profile: Profile; orders: Order[]; outbox: Mutation[]; shiftStartedAt: string | null; shiftSeconds: number; dark: boolean; notifications: boolean; lastSync?: string; syncError?: string };
export const labels: Record<Status, string> = { pending: 'New offer', accepted: 'Accepted', enroute: 'On the way', arrived: 'At destination', delivered: 'Delivered', failed: 'Failed', declined: 'Declined' };
export const isFinished = (status: Status) => ['delivered', 'failed', 'declined'].includes(status);
export const transitions: Record<Status, Status[]> = {
  pending: ['accepted', 'declined'], accepted: ['enroute', 'failed'], enroute: ['arrived', 'failed'],
  arrived: ['delivered', 'failed'], delivered: [], failed: [], declined: [],
};
export function validateTransition(order: Order, status: Status, reason?: string, proof?: Proof) {
  if (!transitions[order.status].includes(status)) throw new Error('This delivery has already changed. Refresh and try again.');
  if (['failed', 'declined'].includes(status) && !reason?.trim()) throw new Error('Please choose a reason.');
  if (status === 'delivered' && (!proof?.photo || !proof.recipient.trim() || !validSignature(proof.signature))) throw new Error('Add a photo, recipient name and signature before completing.');
}
export function validSignature(strokes: Stroke[]) {
  return Array.isArray(strokes) && strokes.some(stroke => stroke.length >= 4 && stroke.reduce((n, p, i) => i ? n + Math.hypot(p.x - stroke[i - 1].x, p.y - stroke[i - 1].y) : n, 0) > 25);
}
export const localDate = (value: string | Date) => { const d = new Date(value); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
export const timeLabel = (value: string) => new Date(value).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
