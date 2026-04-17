import {
  ApiError,
  getSupabaseStoragePublicUrl,
  supabaseAuthRequest,
  supabaseRestRequest,
  supabaseStorageUpload,
} from './apiClient';
import { storage } from '../storage';
import { listAssignedSchoolIdsForUser } from './instructorSchoolAssignments';

const SCHOOL_IMAGES_BUCKET = 'profile-images';

export type ManagedSchoolModel = {
  id: string;
  name: string;
  category: string | null;
  snippet: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  website: string | null;
  telephone: string | null;
  imageUrl: string | null;
  workingSchedule: SchoolWorkingDay[];
  currentStatus: string | null;
  nextStatus: string | null;
  rating: number | null;
  reviewCount: number | null;
  priceRange: string | null;
};

export type SchoolWorkingDay = {
  dayKey: string;
  label: string;
  isClosed: boolean;
  openTime: string;
  closeTime: string;
};

export type UpdateManagedSchoolInput = {
  name: string;
  category?: string | null;
  snippet?: string | null;
  address?: string | null;
  city?: string | null;
  district?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  website?: string | null;
  telephone?: string | null;
  imageUri?: string | null;
  imageUrl?: string | null;
  workingSchedule?: SchoolWorkingDay[];
  currentStatus?: string | null;
  nextStatus?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  priceRange?: string | null;
};

type SupabaseUserResponse = { id: string };
type SupabaseSessionResponse = { access_token: string; refresh_token: string };
type SchoolRow = {
  id: string;
  name: string;
  category?: string | null;
  snippet?: string | null;
  address?: string | null;
  city?: string | null;
  district?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  website?: string | null;
  telephone?: string | null;
  image_url?: string | null;
  working_schedule?: unknown;
  current_status?: string | null;
  next_status?: string | null;
  rating?: number | null;
  review_count?: number | null;
  price_range?: string | null;
};

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await storage.getRefreshToken();
  if (!refreshToken) return null;
  const session = await supabaseAuthRequest<SupabaseSessionResponse>('/token?grant_type=refresh_token', {
    method: 'POST',
    body: { refresh_token: refreshToken },
  });
  await Promise.all([
    storage.setAccessToken(session.access_token),
    storage.setRefreshToken(session.refresh_token),
    storage.setLoggedIn(true),
  ]);
  return session.access_token;
}

async function withAuthorizedUserRequest<T>(run: (accessToken: string) => Promise<T>): Promise<T> {
  let accessToken = await storage.getAccessToken();
  if (!accessToken) accessToken = await refreshAccessToken();
  if (!accessToken) throw new Error('No access token.');
  try {
    return await run(accessToken);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    const refreshed = await refreshAccessToken();
    if (!refreshed) throw error;
    return run(refreshed);
  }
}

async function getMyUserId(accessToken: string): Promise<string> {
  const user = await supabaseAuthRequest<SupabaseUserResponse>('/user', { accessToken });
  return user.id;
}

function isLocalAssetUri(uri: string | null | undefined): uri is string {
  if (!uri) return false;
  return (
    uri.startsWith('file:') ||
    uri.startsWith('content:') ||
    uri.startsWith('ph:') ||
    uri.startsWith('assets-library:') ||
    uri.startsWith('data:')
  );
}

function guessFileExtension(uri: string): string {
  const match = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  const extension = match?.[1]?.toLowerCase();
  if (extension === 'jpeg') return 'jpg';
  if (extension && ['jpg', 'png', 'webp', 'heic'].includes(extension)) return extension;
  return 'jpg';
}

function guessMimeType(extension: string): string {
  switch (extension) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'heic':
      return 'image/heic';
    default:
      return 'image/jpeg';
  }
}

async function uploadSchoolImageIfNeeded(
  accessToken: string,
  userId: string,
  schoolId: string,
  imageUri?: string | null,
  fallbackImageUrl?: string | null,
): Promise<string | null> {
  if (imageUri === undefined) return fallbackImageUrl?.trim() || null;
  if (imageUri === null) return null;

  const normalizedImageUri = imageUri.trim();
  if (normalizedImageUri === '') return null;
  if (!isLocalAssetUri(normalizedImageUri)) return normalizedImageUri;

  const extension = guessFileExtension(normalizedImageUri);
  const objectPath = `${userId}/schools/${schoolId}/cover.${extension}`;
  const contentType = guessMimeType(extension);

  const fileResponse = await fetch(normalizedImageUri);
  const fileBlob = await fileResponse.blob();

  try {
    await supabaseStorageUpload(`${SCHOOL_IMAGES_BUCKET}/${objectPath}`, {
      file: fileBlob,
      contentType,
      accessToken,
      upsert: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    if (message.includes('storage') || message.includes('bucket') || message.includes('policy')) {
      throw new Error('Okul kapak görseli yükleme yetkisi backend tarafında henüz açık değil.');
    }
    throw error;
  }

  return getSupabaseStoragePublicUrl(SCHOOL_IMAGES_BUCKET, objectPath);
}

async function assertAssignedSchool(accessToken: string, schoolId: string): Promise<void> {
  const me = await getMyUserId(accessToken);
  const schoolIds = await listAssignedSchoolIdsForUser(accessToken, me);
  if (!schoolIds.includes(schoolId)) {
    throw new Error('Bu okul için erişim yetkiniz bulunmuyor.');
  }
}

function schoolSelect(): string {
  return 'id,name,category,snippet,address,city,district,latitude,longitude,website,telephone,image_url,working_schedule,current_status,next_status,rating,review_count,price_range';
}

const DEFAULT_WORKING_SCHEDULE: SchoolWorkingDay[] = [
  { dayKey: 'monday', label: 'Pazartesi', isClosed: false, openTime: '09:00', closeTime: '18:00' },
  { dayKey: 'tuesday', label: 'Salı', isClosed: false, openTime: '09:00', closeTime: '18:00' },
  { dayKey: 'wednesday', label: 'Çarşamba', isClosed: false, openTime: '09:00', closeTime: '18:00' },
  { dayKey: 'thursday', label: 'Perşembe', isClosed: false, openTime: '09:00', closeTime: '18:00' },
  { dayKey: 'friday', label: 'Cuma', isClosed: false, openTime: '09:00', closeTime: '18:00' },
  { dayKey: 'saturday', label: 'Cumartesi', isClosed: false, openTime: '10:00', closeTime: '18:00' },
  { dayKey: 'sunday', label: 'Pazar', isClosed: true, openTime: '10:00', closeTime: '18:00' },
];

const DAY_KEY_ALIASES: Record<string, string> = {
  monday: 'monday',
  mon: 'monday',
  pazartesi: 'monday',
  pazartesi̇: 'monday',
  mondays: 'monday',
  tuesday: 'tuesday',
  tue: 'tuesday',
  tues: 'tuesday',
  sali: 'tuesday',
  salı: 'tuesday',
  wednesday: 'wednesday',
  wed: 'wednesday',
  carsamba: 'wednesday',
  çarşamba: 'wednesday',
  thursday: 'thursday',
  thu: 'thursday',
  thur: 'thursday',
  thurs: 'thursday',
  persembe: 'thursday',
  perşembe: 'thursday',
  friday: 'friday',
  fri: 'friday',
  cuma: 'friday',
  saturday: 'saturday',
  sat: 'saturday',
  cumartesi: 'saturday',
  sunday: 'sunday',
  sun: 'sunday',
  pazar: 'sunday',
};

function normalizeDayKey(value: unknown): string {
  if (typeof value !== 'string') return '';
  return DAY_KEY_ALIASES[value.trim().toLocaleLowerCase('tr-TR')] ?? '';
}

function normalizeTime(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return /^\d{2}:\d{2}$/.test(trimmed) ? trimmed : fallback;
}

function readWorkingScheduleRow(
  raw: Record<string, unknown>,
  fallback: SchoolWorkingDay,
): SchoolWorkingDay {
  const openCandidate =
    raw.openTime ??
    raw.open_time ??
    raw.opensAt ??
    raw.opens_at ??
    raw.start ??
    raw.startTime;
  const closeCandidate =
    raw.closeTime ??
    raw.close_time ??
    raw.closesAt ??
    raw.closes_at ??
    raw.end ??
    raw.endTime;
  const closedCandidate =
    raw.isClosed ??
    raw.is_closed ??
    raw.closed ??
    raw.off;

  return {
    dayKey: fallback.dayKey,
    label: fallback.label,
    isClosed:
      typeof closedCandidate === 'boolean'
        ? closedCandidate
        : typeof raw.open === 'string' && raw.open.trim().toLowerCase() === 'closed'
        ? true
        : fallback.isClosed,
    openTime: normalizeTime(openCandidate, fallback.openTime),
    closeTime: normalizeTime(closeCandidate, fallback.closeTime),
  };
}

function parseWorkingSchedule(value: unknown): SchoolWorkingDay[] {
  const byKey = new Map<string, Record<string, unknown>>();

  if (Array.isArray(value)) {
    value
      .filter((item) => item && typeof item === 'object')
      .forEach((item) => {
        const row = item as Record<string, unknown>;
        const key = normalizeDayKey(row.dayKey ?? row.day_key ?? row.day ?? row.label);
        if (key) byKey.set(key, row);
      });
  } else if (value && typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([rawKey, rawValue]) => {
      const key = normalizeDayKey(rawKey);
      if (!key || !rawValue || typeof rawValue !== 'object') return;
      byKey.set(key, rawValue as Record<string, unknown>);
    });
  } else {
    return DEFAULT_WORKING_SCHEDULE;
  }

  return DEFAULT_WORKING_SCHEDULE.map((fallback) => {
    const raw = byKey.get(fallback.dayKey);
    if (!raw) return fallback;
    return readWorkingScheduleRow(raw, fallback);
  });
}

function serializeWorkingSchedule(value?: SchoolWorkingDay[]): SchoolWorkingDay[] {
  const rows = Array.isArray(value) && value.length > 0 ? value : DEFAULT_WORKING_SCHEDULE;
  return rows.map((row) => ({
    dayKey: row.dayKey,
    label: row.label,
    isClosed: !!row.isClosed,
    openTime: normalizeTime(row.openTime, '09:00'),
    closeTime: normalizeTime(row.closeTime, '18:00'),
  }));
}

function mapSchool(row: SchoolRow): ManagedSchoolModel {
  return {
    id: row.id,
    name: row.name,
    category: row.category ?? null,
    snippet: row.snippet ?? null,
    address: row.address ?? null,
    city: row.city ?? null,
    district: row.district ?? null,
    latitude: typeof row.latitude === 'number' ? row.latitude : null,
    longitude: typeof row.longitude === 'number' ? row.longitude : null,
    website: row.website ?? null,
    telephone: row.telephone ?? null,
    imageUrl: row.image_url ?? null,
    workingSchedule: parseWorkingSchedule(row.working_schedule),
    currentStatus: row.current_status ?? null,
    nextStatus: row.next_status ?? null,
    rating: typeof row.rating === 'number' ? row.rating : null,
    reviewCount: typeof row.review_count === 'number' ? row.review_count : null,
    priceRange: row.price_range ?? null,
  };
}

function buildPayload(input: UpdateManagedSchoolInput): Record<string, unknown> {
  return {
    name: input.name.trim(),
    category: input.category?.trim() || null,
    snippet: input.snippet?.trim() || null,
    address: input.address?.trim() || null,
    city: input.city?.trim() || null,
    district: input.district?.trim() || null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    website: input.website?.trim() || null,
    telephone: input.telephone?.trim() || null,
    image_url: input.imageUrl?.trim() || null,
    working_schedule: serializeWorkingSchedule(input.workingSchedule),
    current_status: input.currentStatus?.trim() || null,
    next_status: input.nextStatus?.trim() || null,
    rating: input.rating ?? null,
    review_count: input.reviewCount ?? null,
    price_range: input.priceRange?.trim() || null,
  };
}

export const schoolAdminService = {
  async getManagedSchool(schoolId: string): Promise<ManagedSchoolModel | null> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      await assertAssignedSchool(accessToken, schoolId);
      const rows = await supabaseRestRequest<SchoolRow[]>(
        `/schools?select=${schoolSelect()}&id=eq.${encodeURIComponent(schoolId)}&limit=1`,
        { method: 'GET', accessToken },
      );
      return rows?.[0] ? mapSchool(rows[0]) : null;
    });
  },

  async updateManagedSchool(schoolId: string, input: UpdateManagedSchoolInput): Promise<ManagedSchoolModel> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      await assertAssignedSchool(accessToken, schoolId);
      const me = await getMyUserId(accessToken);
      const imageUrl = await uploadSchoolImageIfNeeded(accessToken, me, schoolId, input.imageUri, input.imageUrl);
      const rows = await supabaseRestRequest<SchoolRow[]>(
        `/schools?id=eq.${encodeURIComponent(schoolId)}&select=${schoolSelect()}`,
        {
          method: 'PATCH',
          accessToken,
          headers: { Prefer: 'return=representation' },
          body: buildPayload({
            ...input,
            imageUrl,
          }),
        },
      );
      const updated = rows?.[0];
      if (!updated) throw new Error('Okul güncellenemedi.');
      return mapSchool(updated);
    });
  },

  async deleteManagedSchool(schoolId: string): Promise<void> {
    await withAuthorizedUserRequest(async (accessToken) => {
      await assertAssignedSchool(accessToken, schoolId);
      await supabaseRestRequest(
        `/schools?id=eq.${encodeURIComponent(schoolId)}`,
        {
          method: 'DELETE',
          accessToken,
          headers: { Prefer: 'return=minimal' },
        },
      );
    });
  },
};
