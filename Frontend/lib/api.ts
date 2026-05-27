const STORAGE_ACCESS = 'its_access';
const STORAGE_REFRESH = 'its_refresh';

export function apiBase(): string {
  const env = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? '';
  return env || '';
}

export function apiUrl(path: string): string {
  const base = apiBase();
  if (base) return `${base}${path}`;
  // Vite dev server rewrites /api-proxy → backend (see vite.config). Production
  // builds must set VITE_API_URL, or be served from the same origin as the API
  // so relative paths like /issue/... hit Nest directly.
  if (import.meta.env.DEV) return `/api-proxy${path}`;
  return path;
}

export function getAccessToken(): string | null {
  return localStorage.getItem(STORAGE_ACCESS);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(STORAGE_REFRESH);
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(STORAGE_ACCESS, access);
  localStorage.setItem(STORAGE_REFRESH, refresh);
}

export function clearTokens(): void {
  localStorage.removeItem(STORAGE_ACCESS);
  localStorage.removeItem(STORAGE_REFRESH);
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (
    init.body &&
    typeof init.body === 'string' &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  let res = await fetch(apiUrl(path), { ...init, headers });

  if (res.status === 401 && path !== '/auth/refresh') {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers.set('Authorization', `Bearer ${getAccessToken()}`);
      res = await fetch(apiUrl(path), { ...init, headers });
    }
  }

  return res;
}

async function tryRefresh(): Promise<boolean> {
  const refresh = localStorage.getItem(STORAGE_REFRESH);
  if (!refresh) return false;
  try {
    const r = await fetch(apiUrl('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (!r.ok) {
      clearTokens();
      return false;
    }
    const data = (await r.json()) as { accessToken: string };
    localStorage.setItem(STORAGE_ACCESS, data.accessToken);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

export async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}
