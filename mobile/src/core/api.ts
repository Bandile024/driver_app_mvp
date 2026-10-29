import { Session } from './types';
export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }
export function serverURL(value: string) {
  const url = new URL(value.trim());
  if (url.protocol !== 'https:' && !(__DEV__ && url.protocol === 'http:')) throw new Error('Use an HTTPS server address.');
  if (url.username || url.password || url.search || url.hash) throw new Error('Enter just the server origin, without credentials or query parameters.');
  return url.origin;
}
export async function request<T>(server: string, path: string, token?: string, body?: unknown, method?: string): Promise<T> {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${server}${path}`, { method: method ?? (body === undefined ? 'GET' : 'POST'), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal });
    const result = await response.json();
    if (!response.ok) throw new ApiError(result.error || 'The server could not complete this request.', response.status);
    return result as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error('Could not reach dispatch. Your saved work is safe. Check your connection and try again.');
  } finally { clearTimeout(timer); }
}
export const api = <T>(session: Session, path: string, body?: unknown, method?: string) => request<T>(session.server, path, session.token, body, method);
