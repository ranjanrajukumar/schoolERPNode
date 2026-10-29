// One app for many schools: when EXPO_PUBLIC_GLOBAL_URL points at the global registry, a person first selects their school from it and the
// app then talks to that school's own API. Without it the app serves a single school, at EXPO_PUBLIC_API_URL (or the address typed on sign-in).
export const GLOBAL_URL = (process.env.EXPO_PUBLIC_GLOBAL_URL || '').replace(/[/]+$/, '');
export const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:4000/api';
export const REQUEST_TIMEOUT_MS = 60000; // long enough for a sleeping free-tier server to wake
