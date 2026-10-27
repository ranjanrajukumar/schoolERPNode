import { scopedKey, store } from './api';

// How often each home tile was opened on this phone, so "Frequently used" shows what this person really uses.
const key = (userId) => scopedKey('schoolerp.usage', userId);

export async function loadUsage(userId) {
  try { return JSON.parse((await store.getItemAsync(key(userId))) ?? '{}'); } catch { return {}; }
}

export async function bumpUsage(userId, tileKey) {
  try {
    const usage = await loadUsage(userId);
    usage[tileKey] = (usage[tileKey] ?? 0) + 1;
    await store.setItemAsync(key(userId), JSON.stringify(usage));
  } catch { /* usage is a convenience: never block opening a page */ }
}
