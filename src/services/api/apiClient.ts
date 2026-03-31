import { storage } from '../storage';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, opts: { status: number; code?: string; details?: unknown }) {
    super(message);
    this.name = 'ApiError';
    this.status = opts.status;
    this.code = opts.code;
    this.details = opts.details;
  }
}

export function getSupabaseUrl(): string {
  return (process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim().replace(/\/+$/, '');
}

export function getSupabasePublishableKey(): string {
  return (process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '').trim();
}

export function hasSupabaseConfig(): boolean {
  return !!getSupabaseUrl() && !!getSupabasePublishableKey();
}

async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

function extractErrorMessage(payload: unknown, fallback: string): { message: string; code?: string } {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const message =
      (typeof record.msg === 'string' && record.msg) ||
      (typeof record.message === 'string' && record.message) ||
      (typeof record.error_description === 'string' && record.error_description) ||
      (typeof record.error === 'string' && record.error) ||
      fallback;
    const code = typeof record.code === 'string' ? record.code : undefined;
    return { message, code };
  }

  return { message: fallback };
}

type RefreshTokenResponse = {
  access_token?: string;
  refresh_token?: string;
};

function isJwtExpiredError(err: ApiError): boolean {
  const msg = (err.message || '').toLowerCase();
  const code = (err.code || '').toLowerCase();
  return (
    msg.includes('jwt expired') ||
    msg.includes('expired jwt') ||
    msg.includes('token is expired') ||
    msg.includes('invalid jwt') ||
    msg.includes('unable to parse') ||
    msg.includes('verify signature') ||
    code.includes('jwt') ||
    code.includes('expired')
  );
}

async function tryRefreshAccessToken(): Promise<string | null> {
  const refreshToken = await storage.getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await supabaseAuthRequest<RefreshTokenResponse>('/token?grant_type=refresh_token', {
      method: 'POST',
      body: { refresh_token: refreshToken },
    });

    const nextAccess = res.access_token;
    const nextRefresh = res.refresh_token;
    if (!nextAccess || !nextRefresh) return null;

    await Promise.all([
      storage.setAccessToken(nextAccess),
      storage.setRefreshToken(nextRefresh),
      storage.setLoggedIn(true),
    ]);

    return nextAccess;
  } catch {
    return null;
  }
}

async function expireSession(): Promise<void> {
  await storage.logout();
}

export async function supabaseAuthRequest<T>(
  path: string,
  opts: {
    method?: HttpMethod;
    body?: unknown;
    accessToken?: string | null;
    timeoutMs?: number;
  } = {},
): Promise<T> {
  const supabaseUrl = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();

  if (!supabaseUrl || !publishableKey) {
    throw new ApiError(
      'Supabase ayarlari eksik. EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY tanimlanmali.',
      { status: 0 },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15000);
  const headers: Record<string, string> = {
    apikey: publishableKey,
    Accept: 'application/json',
  };

  if (opts.body != null) headers['Content-Type'] = 'application/json';
  if (opts.accessToken) headers.Authorization = `Bearer ${opts.accessToken}`;

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body != null ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });

    const raw = await safeReadText(res);
    const contentType = res.headers.get('content-type') || '';
    const parsed = contentType.includes('application/json') && raw
      ? (() => {
          try {
            return JSON.parse(raw);
          } catch {
            return undefined;
          }
        })()
      : undefined;

    if (!res.ok) {
      const { message, code } = extractErrorMessage(parsed ?? raw, raw || `Request failed (${res.status})`);
      const apiErr = new ApiError(message, { status: res.status, code, details: parsed ?? raw });
      const canRetry = apiErr.status === 401 && isJwtExpiredError(apiErr) && !!opts.accessToken;
      if (canRetry) {
        const nextAccess = await tryRefreshAccessToken();
        if (nextAccess) {
          return await supabaseAuthRequest<T>(path, {
            ...opts,
            accessToken: nextAccess,
          });
        }
        await expireSession();
        throw new ApiError('Oturum süreniz doldu. Lütfen tekrar giriş yapın.', {
          status: 401,
          code: 'SESSION_EXPIRED',
          details: apiErr.details,
        });
      }
      throw apiErr;
    }

    if (res.status === 204 || !raw) return undefined as T;
    return (parsed ?? raw) as T;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new ApiError('Request timed out.', { status: 0, code: 'TIMEOUT' });
    }
    if (err instanceof ApiError) throw err;
    throw new ApiError(err?.message || 'Network error.', { status: 0, code: 'NETWORK_ERROR', details: err });
  } finally {
    clearTimeout(timeout);
  }
}

export async function supabaseRestRequest<T>(
  path: string,
  opts: {
    method?: HttpMethod;
    body?: unknown;
    accessToken?: string | null;
    headers?: Record<string, string | undefined>;
    timeoutMs?: number;
    _retryOnExpiredJwt?: boolean;
  } = {},
): Promise<T> {
  const supabaseUrl = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();

  if (!supabaseUrl || !publishableKey) {
    throw new ApiError(
      'Supabase ayarlari eksik. EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY tanimlanmali.',
      { status: 0 },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15000);
  const headers: Record<string, string> = {
    apikey: publishableKey,
    Accept: 'application/json',
  };

  if (opts.body != null) headers['Content-Type'] = 'application/json';
  if (opts.accessToken) headers.Authorization = `Bearer ${opts.accessToken}`;

  for (const [key, value] of Object.entries(opts.headers ?? {})) {
    if (value != null) headers[key] = value;
  }

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body != null ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });

    const raw = await safeReadText(res);
    const contentType = res.headers.get('content-type') || '';
    const parsed = contentType.includes('application/json') && raw
      ? (() => {
          try {
            return JSON.parse(raw);
          } catch {
            return undefined;
          }
        })()
      : undefined;

    if (!res.ok) {
      const { message, code } = extractErrorMessage(parsed ?? raw, raw || `Request failed (${res.status})`);
      const apiErr = new ApiError(message, { status: res.status, code, details: parsed ?? raw });

      const allowRetry = opts._retryOnExpiredJwt ?? true;
      const canRetry = allowRetry && apiErr.status === 401 && isJwtExpiredError(apiErr);

      if (canRetry) {
        const nextAccess = await tryRefreshAccessToken();
        if (nextAccess) {
          return await supabaseRestRequest<T>(path, {
            ...opts,
            accessToken: nextAccess,
            _retryOnExpiredJwt: false,
          });
        }

        await expireSession();
        throw new ApiError('Oturum süreniz doldu. Lütfen tekrar giriş yapın.', {
          status: 401,
          code: 'SESSION_EXPIRED',
          details: apiErr.details,
        });
      }

      throw apiErr;
    }

    if (res.status === 204 || !raw) return undefined as T;
    return (parsed ?? raw) as T;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new ApiError('Request timed out.', { status: 0, code: 'TIMEOUT' });
    }
    if (err instanceof ApiError) throw err;
    throw new ApiError(err?.message || 'Network error.', { status: 0, code: 'NETWORK_ERROR', details: err });
  } finally {
    clearTimeout(timeout);
  }
}

export async function supabaseStorageUpload(
  path: string,
  opts: {
    file: Blob;
    contentType?: string;
    accessToken?: string | null;
    upsert?: boolean;
    timeoutMs?: number;
  },
): Promise<void> {
  const supabaseUrl = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();

  if (!supabaseUrl || !publishableKey) {
    throw new ApiError(
      'Supabase ayarlari eksik. EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY tanimlanmali.',
      { status: 0 },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 30000);
  const headers: Record<string, string> = {
    apikey: publishableKey,
    'Content-Type': opts.contentType || 'application/octet-stream',
    'x-upsert': opts.upsert === false ? 'false' : 'true',
  };

  if (opts.accessToken) headers.Authorization = `Bearer ${opts.accessToken}`;

  try {
    const res = await fetch(`${supabaseUrl}/storage/v1/object/${path}`, {
      method: 'POST',
      headers,
      body: opts.file,
      signal: controller.signal,
    });

    const raw = await safeReadText(res);
    const contentType = res.headers.get('content-type') || '';
    const parsed = contentType.includes('application/json') && raw
      ? (() => {
          try {
            return JSON.parse(raw);
          } catch {
            return undefined;
          }
        })()
      : undefined;

    if (!res.ok) {
      const { message, code } = extractErrorMessage(parsed ?? raw, raw || `Request failed (${res.status})`);
      throw new ApiError(message, { status: res.status, code, details: parsed ?? raw });
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new ApiError('Request timed out.', { status: 0, code: 'TIMEOUT' });
    }
    if (err instanceof ApiError) throw err;
    throw new ApiError(err?.message || 'Network error.', { status: 0, code: 'NETWORK_ERROR', details: err });
  } finally {
    clearTimeout(timeout);
  }
}

export function getSupabaseStoragePublicUrl(bucket: string, objectPath: string): string {
  const supabaseUrl = getSupabaseUrl();
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
}
