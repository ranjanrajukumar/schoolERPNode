import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { DEFAULT_API_URL, REQUEST_TIMEOUT_MS } from './config';

// The phone keeps the token in its secure store; the browser preview has no secure store, so it uses localStorage.
export const store = Platform.OS === 'web'
  ? {
      getItemAsync: async (k) => globalThis.localStorage?.getItem(k) ?? null,
      setItemAsync: async (k, v) => globalThis.localStorage?.setItem(k, v),
      deleteItemAsync: async (k) => globalThis.localStorage?.removeItem(k),
    }
  : SecureStore;

const TOKEN_KEY = 'schoolerp.token';
const SERVER_KEY = 'schoolerp.server';

let baseUrl = DEFAULT_API_URL;
let token = null;
let onUnauthorized = () => {};

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data ?? {};
  }
}

export const getServerUrl = () => baseUrl;
export const getAuthToken = () => token;

/** Sends a small file as raw bytes to an authenticated upload endpoint. */
export async function uploadBinary(path, bytes, contentType = 'application/octet-stream') {
  const res = await fetch(`${baseUrl}${path}`, { method: 'POST', headers: { 'Content-Type': contentType, ...(token && { Authorization: `Bearer ${token}` }) }, body: bytes });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `Upload failed (${res.status})`, res.status, data);
  return data;
}

export async function openPrivateFile(path, filename = 'school-document') {
  const res = await fetch(`${baseUrl}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) { const data = await res.json().catch(() => ({})); throw new ApiError(data.error || `Download failed (${res.status})`, res.status, data); }
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(await res.blob());
    const link = document.createElement('a'); link.href = url; link.download = filename || 'school-document'; link.rel = 'noopener'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const { File, Paths } = await import('expo-file-system');
  const safe = String(filename).replace(/[^A-Za-z0-9._-]/g, '_') || 'school-document';
  const file = new File(Paths.cache, `${Date.now()}-${safe}`);
  await file.write(new Uint8Array(await res.arrayBuffer()));
  await File.preview(file);
}
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

/** Loads what was saved on this phone: the server address and the sign-in token. */
export async function restoreSession() {
  const [savedServer, savedToken] = await Promise.all([store.getItemAsync(SERVER_KEY), store.getItemAsync(TOKEN_KEY)]);
  if (savedServer) baseUrl = savedServer;
  token = savedToken;
  return Boolean(token);
}

/** Forgets the school's address (used when the person chooses another school). */
export async function clearServerUrl() {
  baseUrl = DEFAULT_API_URL;
  await store.deleteItemAsync(SERVER_KEY);
}

/** A storage key for something kept per school and per person: ids repeat from school to school, so the school's address is part of it. */
export const scopedKey = (name, userId) => `${name}.${baseUrl}.${userId}`.replace(/[^A-Za-z0-9._-]/g, '_');

export async function saveServerUrl(url) {
  const clean = String(url ?? '').trim().replace(/\/+$/, '');
  if (!/^https?:\/\/.+/i.test(clean)) throw new ApiError('The server address must start with http:// or https://', 0);
  baseUrl = clean;
  await store.setItemAsync(SERVER_KEY, clean);
}

export async function saveToken(value) {
  token = value;
  if (value) await store.setItemAsync(TOKEN_KEY, value);
  else await store.deleteItemAsync(TOKEN_KEY);
}

/** One call to the School ERP API. Throws ApiError with the server's own message. */
export async function api(path, { method = 'GET', body } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    throw new ApiError(err.name === 'AbortError' ? 'The school server did not answer in time.' : `Cannot reach the school server at ${baseUrl}. Check the address and your connection.`, 0);
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/login')) onUnauthorized();
    throw new ApiError(data.error || `Request failed (${res.status})`, res.status, data);
  }
  return data;
}
