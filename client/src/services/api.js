const TOKEN_KEY = 'token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// roughly how long the API needs to restart (the dev server restarts whenever a source file changes)
const RETRY_DELAYS = [1200, 2500, 4000, 6000];

/** True when the server did not really answer: the connection failed, or a gateway/proxy error came back instead of the API's own JSON. */
const unreachable = (res, data) => !res || [502, 503, 504].includes(res.status) || (res.status === 500 && !('error' in data));

/**
 * Calls the API. A read (GET) that finds the server briefly unreachable is retried a few times, so a restart passes unnoticed;
 * a save is never retried automatically (it could be sent twice) and fails with a plain message instead.
 */
export async function api(path, { method = 'GET', body } = {}) {
  const attempts = method === 'GET' ? RETRY_DELAYS.length + 1 : 1;
  let res = null;
  let data = {};
  for (let i = 0; i < attempts; i += 1) {
    try {
      res = await fetch(`/api${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(getToken() && { Authorization: `Bearer ${getToken()}` }),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      data = await res.json().catch(() => ({}));
    } catch {
      res = null;
      data = {};
    }
    if (!unreachable(res, data) || i === attempts - 1) break;
    await wait(RETRY_DELAYS[i]);
  }
  if (unreachable(res, data)) throw new Error('The server is not responding. Please wait a moment and try again.');
  if (res.status === 401 && path !== '/auth/login') {
    clearToken();
    window.location.href = '/login';
  }
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

/** Uploads a File as the raw request body (the server reads its type from the content). */
export async function uploadFile(path, file, method = 'POST') {
  const res = await fetch(`/api${path}`, {
    method,
    headers: { 'Content-Type': file.type || 'application/octet-stream', ...(getToken() && { Authorization: `Bearer ${getToken()}` }) },
    body: file,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) { clearToken(); window.location.href = '/login'; }
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
}

/** Downloads a protected file as a Blob (an <img>/<a> cannot send the login header itself). */
export async function fetchBlob(path) {
  const res = await fetch(`/api${path}`, { headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {} });
  if (!res.ok) throw new Error('Could not load file');
  return res.blob();
}
