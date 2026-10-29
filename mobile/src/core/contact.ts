import { Linking } from 'react-native';
import { Order } from './types';
export async function contact(kind: 'tel' | 'sms' | 'mailto', value: string, reference = '') {
  if (!value || value.endsWith('@example.com')) throw new Error('This demo has no real contact details. Dispatch supplies these for live orders.');
  const target = kind === 'mailto' ? `${kind}:${encodeURIComponent(value)}?subject=${encodeURIComponent(`Delivery ${reference}`)}` : `${kind}:${value.replace(/[^\d+]/g, '')}`;
  try { await Linking.openURL(target); } catch { throw new Error('No app is available for this action on your device.'); }
}
export async function navigate(order: Order, waze = false) {
  const target = waze ? `https://waze.com/ul?ll=${order.latitude},${order.longitude}&navigate=yes` : `https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}&travelmode=driving`;
  await Linking.openURL(target);
}
