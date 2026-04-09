import {
  ApiError,
  getSupabaseStoragePublicUrl,
  supabaseAuthRequest,
  supabaseRestRequest,
  supabaseStorageUpload,
} from './apiClient';
import { storage } from '../storage';

const LESSON_COVERS_BUCKET = 'instructor-lesson-covers';
const LESSON_EVENT_TYPE = 'lesson';

export type InstructorLessonModel = {
  id: string;
  instructorUserId: string;
  schoolId: string | null;
  imageUrl: string | null;
  danceTypeIds: string[];
  location: string | null;
  address: string | null;
  city: string | null;
  title: string;
  description: string;
  priceCents: number | null;
  participantLimit: number | null;
  currency: string;
  level: string;
  lessonFormat: 'private' | 'group';
  lessonDelivery: 'online' | 'in_person';
  isPublished: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InstructorLessonInput = {
  title: string;
  description: string;
  imageUri?: string | null;
  danceTypeIds?: string[];
  location?: string | null;
  address?: string | null;
  city?: string | null;
  priceCents: number | null;
  participantLimit?: number | null;
  currency?: string;
  level: string;
  lessonFormat?: 'private' | 'group';
  lessonDelivery?: 'online' | 'in_person';
  isPublished: boolean;
  schoolId?: string | null;
  startsAt: string | null;
  endsAt?: string | null;
};

export type InstructorScheduleSlotModel = {
  id: string;
  lessonId: string;
  weekday: number;
  startTime: string;
  tz: string;
  locationType: 'online' | 'in_person' | 'school';
  address: string | null;
};

export type InstructorScheduleSlotInput = {
  lessonId: string;
  weekday: number;
  startTime: string;
  locationType: 'online' | 'in_person' | 'school';
  address?: string | null;
  tz?: string;
};

type SupabaseUserResponse = { id: string };
type SupabaseSessionResponse = { access_token: string; refresh_token: string };

type SchoolEventLessonRow = {
  id: string;
  created_by: string | null;
  school_id: string | null;
  title: string;
  description: string | null;
  image_url: string | null;
  location?: string | null;
  city?: string | null;
  starts_at: string | null;
  ends_at?: string | null;
  event_type?: string | null;
  price_amount?: number | string | null;
  participant_limit?: number | null;
  price_currency?: string | null;
  delivery_mode?: string | null;
  location_place?: unknown;
  schedule_items?: unknown;
  created_at: string;
  updated_at: string;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type SchoolRow = {
  id: string;
  name: string | null;
  city: string | null;
  district: string | null;
};

type EventInstructorRow = {
  event_id?: string | null;
  user_id?: string | null;
  instructor_user_id?: string | null;
  profile_id?: string | null;
};

type EventDanceTypeLinkRow = {
  event_id?: string | null;
  dance_type_id?: string | null;
};

type LessonMeta = {
  lesson_level?: string | null;
  lesson_is_published?: boolean | null;
  lesson_type?: string | null;
  lesson_format?: string | null;
  delivery_mode?: string | null;
  lesson_delivery_mode?: string | null;
  lesson_delivery?: string | null;
  address?: string | null;
  formatted_address?: string | null;
  city?: string | null;
};

type RawScheduleSlot = {
  id?: string | null;
  weekday?: number | string | null;
  start_time?: string | null;
  startTime?: string | null;
  tz?: string | null;
  location_type?: string | null;
  locationType?: string | null;
  address?: string | null;
};

export type PublishedInstructorLessonListItem = InstructorLessonModel & {
  instructorName: string;
  instructorUsername: string;
  instructorAvatarUrl: string | null;
  schoolName: string | null;
  schoolCity: string | null;
  schoolDistrict: string | null;
  nextOccurrenceAt: string | null;
  scheduleSummary: string | null;
  deliveryMode: 'online' | 'yuz_yuze';
};

const SCHEDULE_WEEKDAY_LABELS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

function lessonEventSelect(): string {
  return 'id,created_by,school_id,title,description,image_url,location,city,starts_at,ends_at,event_type,price_amount,participant_limit,price_currency,location_place,schedule_items,created_at,updated_at';
}

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

async function uploadLessonCoverIfNeeded(
  accessToken: string,
  instructorUserId: string,
  coverUri?: string | null,
): Promise<string | null | undefined> {
  if (coverUri === undefined) return undefined;
  if (coverUri === null || coverUri.trim() === '') return null;
  if (!isLocalAssetUri(coverUri)) return coverUri;

  const ext = guessFileExtension(coverUri);
  const objectPath = `${instructorUserId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const contentType = guessMimeType(ext);
  try {
    const fileResponse = await fetch(coverUri);
    const fileBlob = await fileResponse.blob();

    await supabaseStorageUpload(`${LESSON_COVERS_BUCKET}/${objectPath}`, {
      file: fileBlob,
      contentType,
      accessToken,
      upsert: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    if (message.includes('bucket') && message.includes('not found')) {
      throw new Error('Kapak fotoğrafı alanı henüz backend’de hazır değil. Storage migration uygulanmalı.');
    }
    if (message.includes('row-level security') || message.includes('permission')) {
      throw new Error('Kapak fotoğrafı yükleme yetkisi backend tarafında henüz açık değil.');
    }
    throw error;
  }

  return getSupabaseStoragePublicUrl(LESSON_COVERS_BUCKET, objectPath);
}

function uniqueIds(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => (value ?? '').trim()).filter(Boolean))];
}

function normalizeDanceTypeIds(values: Array<string | null | undefined>): string[] {
  return uniqueIds(values);
}

function toObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizePriceToCents(value: unknown): number | null {
  const amount = toFiniteNumber(value);
  if (amount == null || amount <= 0) return null;
  return Math.round(amount * 100);
}

function mapEventInstructorUserId(row: EventInstructorRow): string | null {
  return [row.user_id, row.instructor_user_id, row.profile_id].find((value) => typeof value === 'string' && value.trim())?.trim() ?? null;
}

function extractLessonMeta(value: unknown): LessonMeta {
  const raw = toObject(value);
  return {
    lesson_level: typeof raw?.lesson_level === 'string' ? raw.lesson_level : null,
    lesson_is_published: typeof raw?.lesson_is_published === 'boolean' ? raw.lesson_is_published : null,
    lesson_type: typeof raw?.lesson_type === 'string' ? raw.lesson_type : null,
    lesson_format: typeof raw?.lesson_format === 'string' ? raw.lesson_format : null,
    delivery_mode: typeof raw?.delivery_mode === 'string' ? raw.delivery_mode : null,
    lesson_delivery_mode: typeof raw?.lesson_delivery_mode === 'string' ? raw.lesson_delivery_mode : null,
    lesson_delivery: typeof raw?.lesson_delivery === 'string' ? raw.lesson_delivery : null,
    address: typeof raw?.address === 'string' ? raw.address : null,
    formatted_address: typeof raw?.formatted_address === 'string' ? raw.formatted_address : null,
    city: typeof raw?.city === 'string' ? raw.city : null,
  };
}

function isLocationType(v: string): v is InstructorScheduleSlotModel['locationType'] {
  return v === 'online' || v === 'in_person' || v === 'school';
}

function formatTimeForApi(input: string): string {
  const trimmed = input.trim();
  const m2 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (m2) return `${m2[1].padStart(2, '0')}:${m2[2].padStart(2, '0')}:00`;
  const m3 = trimmed.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (m3) return `${m3[1].padStart(2, '0')}:${m3[2].padStart(2, '0')}:${m3[3].padStart(2, '0')}`;
  return trimmed;
}

function shortTime(value: string): string {
  return value.length >= 5 ? value.slice(0, 5) : value;
}

function parseScheduleItems(lessonId: string, value: unknown): InstructorScheduleSlotModel[] {
  if (!Array.isArray(value)) return [];
  const out: InstructorScheduleSlotModel[] = [];

  value.forEach((item, index) => {
    const raw = item as RawScheduleSlot;
    const weekday = typeof raw.weekday === 'number' ? raw.weekday : Number(raw.weekday);
    const start = typeof raw.start_time === 'string' ? raw.start_time : typeof raw.startTime === 'string' ? raw.startTime : '';
    if (!Number.isFinite(weekday) || weekday < 0 || weekday > 6 || !start.trim()) return;
    const locationTypeRaw =
      typeof raw.location_type === 'string' ? raw.location_type : typeof raw.locationType === 'string' ? raw.locationType : 'in_person';
    out.push({
      id: (typeof raw.id === 'string' && raw.id.trim()) || `${lessonId}-${index}`,
      lessonId,
      weekday,
      startTime: shortTime(start.trim()),
      tz: typeof raw.tz === 'string' && raw.tz.trim() ? raw.tz.trim() : 'Europe/Istanbul',
      locationType: isLocationType(locationTypeRaw) ? locationTypeRaw : 'in_person',
      address: typeof raw.address === 'string' && raw.address.trim() ? raw.address.trim() : null,
    });
  });

  return out.sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime));
}

function serializeScheduleItems(slots: InstructorScheduleSlotModel[]): Record<string, unknown>[] {
  return slots.map((slot) => ({
    id: slot.id,
    weekday: slot.weekday,
    start_time: formatTimeForApi(slot.startTime),
    tz: slot.tz || 'Europe/Istanbul',
    location_type: slot.locationType,
    address: slot.address?.trim() || null,
  }));
}

function mapLesson(row: SchoolEventLessonRow, instructorUserId?: string | null): InstructorLessonModel {
  const meta = extractLessonMeta(row.location_place);
  const address = meta.formatted_address?.trim() || meta.address?.trim() || null;
  const rawLessonType = meta.lesson_format ?? meta.lesson_type;
  const lessonFormat: InstructorLessonModel['lessonFormat'] =
    rawLessonType === 'private' || row.participant_limit === 1 ? 'private' : 'group';
  const rawDeliveryMode = row.delivery_mode ?? meta.delivery_mode ?? meta.lesson_delivery_mode ?? meta.lesson_delivery;
  const lessonDelivery: InstructorLessonModel['lessonDelivery'] =
    rawDeliveryMode === 'online'
      ? 'online'
      : rawDeliveryMode === 'in_person'
        ? 'in_person'
        : !row.school_id && !row.location?.trim() && !address
          ? 'online'
          : 'in_person';
  return {
    id: row.id,
    instructorUserId: instructorUserId?.trim() || row.created_by?.trim() || '',
    schoolId: row.school_id,
    imageUrl: row.image_url?.trim() || null,
    danceTypeIds: [],
    location: row.location?.trim() || null,
    address,
    city: row.city?.trim() || meta.city?.trim() || null,
    title: row.title ?? '',
    description: (row.description ?? '').trim(),
    priceCents: normalizePriceToCents(row.price_amount),
    participantLimit: typeof row.participant_limit === 'number' && row.participant_limit > 0 ? row.participant_limit : null,
    currency: (row.price_currency ?? 'TRY').trim() || 'TRY',
    level: (meta.lesson_level ?? '').trim() || 'Tüm Seviyeler',
    lessonFormat,
    lessonDelivery,
    isPublished: meta.lesson_is_published !== false,
    startsAt: row.starts_at ?? null,
    endsAt: row.ends_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listProfilesById(ids: string[], accessToken: string): Promise<Map<string, ProfileRow>> {
  const unique = uniqueIds(ids);
  if (unique.length === 0) return new Map();
  const rows = await supabaseRestRequest<ProfileRow[]>(
    `/profiles?select=id,display_name,username,avatar_url&id=in.(${unique.map((id) => encodeURIComponent(id)).join(',')})`,
    { method: 'GET', accessToken },
  );
  return new Map((rows ?? []).map((row) => [row.id, row]));
}

async function listSchoolsById(ids: Array<string | null | undefined>, accessToken: string): Promise<Map<string, SchoolRow>> {
  const unique = uniqueIds(ids);
  if (unique.length === 0) return new Map();
  const rows = await supabaseRestRequest<SchoolRow[]>(
    `/schools?select=id,name,city,district&id=in.(${unique.map((id) => encodeURIComponent(id)).join(',')})`,
    { method: 'GET', accessToken },
  );
  return new Map((rows ?? []).map((row) => [row.id, row]));
}

async function listEventInstructorIdsByEventId(eventIds: string[], accessToken: string): Promise<Map<string, string>> {
  const unique = uniqueIds(eventIds);
  if (unique.length === 0) return new Map();
  const inClause = unique.map((id) => encodeURIComponent(id)).join(',');
  try {
    const rows = await supabaseRestRequest<EventInstructorRow[]>(
      `/event_instructors?select=event_id,user_id,instructor_user_id,profile_id&event_id=in.(${inClause})`,
      { method: 'GET', accessToken },
    );
    const map = new Map<string, string>();
    for (const row of rows ?? []) {
      const eventId = row.event_id?.trim();
      const instructorUserId = mapEventInstructorUserId(row);
      if (eventId && instructorUserId && !map.has(eventId)) {
        map.set(eventId, instructorUserId);
      }
    }
    return map;
  } catch {
    return new Map();
  }
}

async function listEventDanceTypeIdsByEventId(eventIds: string[], accessToken: string): Promise<Map<string, string[]>> {
  const unique = uniqueIds(eventIds);
  if (unique.length === 0) return new Map();
  const inClause = unique.map((id) => encodeURIComponent(id)).join(',');
  try {
    const rows = await supabaseRestRequest<EventDanceTypeLinkRow[]>(
      `/event_dance_types?select=event_id,dance_type_id&event_id=in.(${inClause})`,
      { method: 'GET', accessToken },
    );
    const map = new Map<string, string[]>();
    for (const row of rows ?? []) {
      const eventId = row.event_id?.trim();
      const danceTypeId = row.dance_type_id?.trim();
      if (!eventId || !danceTypeId) continue;
      const current = map.get(eventId) ?? [];
      if (!current.includes(danceTypeId)) current.push(danceTypeId);
      map.set(eventId, current);
    }
    return map;
  } catch {
    return new Map();
  }
}

async function replaceEventDanceTypes(eventId: string, danceTypeIds: string[], accessToken: string): Promise<void> {
  await supabaseRestRequest(
    `/event_dance_types?event_id=eq.${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      accessToken,
      headers: { Prefer: 'return=minimal' },
    },
  );

  const ids = normalizeDanceTypeIds(danceTypeIds);
  if (ids.length === 0) return;

  await supabaseRestRequest('/event_dance_types', {
    method: 'POST',
    accessToken,
    headers: { Prefer: 'return=minimal' },
    body: ids.map((danceTypeId) => ({
      event_id: eventId,
      dance_type_id: danceTypeId,
    })),
  });
}

function nextOccurrenceFromSlot(slot: InstructorScheduleSlotModel): Date | null {
  const [hourRaw, minuteRaw] = slot.startTime.split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;

  const now = new Date();
  const targetJsWeekday = (slot.weekday + 1) % 7;
  const candidate = new Date(now);
  candidate.setHours(hour, minute, 0, 0);

  let diff = targetJsWeekday - now.getDay();
  if (diff < 0 || (diff === 0 && candidate.getTime() <= now.getTime())) diff += 7;
  candidate.setDate(now.getDate() + diff);
  return candidate;
}

function scheduleSummaryFromSlots(slots: InstructorScheduleSlotModel[]): string | null {
  const first = slots[0];
  if (!first) return null;
  const weekdayLabel = SCHEDULE_WEEKDAY_LABELS[first.weekday] ?? String(first.weekday);
  return `${weekdayLabel} ${first.startTime}`;
}

function deliveryModeFromSlots(slots: InstructorScheduleSlotModel[]): 'online' | 'yuz_yuze' {
  if (slots.length === 0) return 'yuz_yuze';
  const hasInPerson = slots.some((slot) => slot.locationType === 'in_person' || slot.locationType === 'school');
  return hasInPerson ? 'yuz_yuze' : 'online';
}

function nextOccurrenceFromSlots(slots: InstructorScheduleSlotModel[]): string | null {
  const nextDates = slots
    .map((slot) => nextOccurrenceFromSlot(slot))
    .filter((date): date is Date => date !== null)
    .sort((a, b) => a.getTime() - b.getTime());
  return nextDates[0]?.toISOString() ?? null;
}

function hydratePublishedLesson(
  lesson: InstructorLessonModel,
  profileById: Map<string, ProfileRow>,
  schoolById: Map<string, SchoolRow>,
  scheduleByLessonId: Map<string, InstructorScheduleSlotModel[]>,
): PublishedInstructorLessonListItem {
  const profile = profileById.get(lesson.instructorUserId);
  const school = lesson.schoolId ? schoolById.get(lesson.schoolId) : undefined;
  const schedule = scheduleByLessonId.get(lesson.id) ?? [];
  const instructorName = (profile?.display_name ?? '').trim() || (profile?.username ?? '').trim() || 'Eğitmen';

  return {
    ...lesson,
    instructorName,
    instructorUsername: (profile?.username ?? '').trim(),
    instructorAvatarUrl: profile?.avatar_url?.trim() || null,
    schoolName: school?.name?.trim() || null,
    schoolCity: school?.city?.trim() || null,
    schoolDistrict: school?.district?.trim() || null,
    nextOccurrenceAt: lesson.startsAt ?? nextOccurrenceFromSlots(schedule),
    scheduleSummary: scheduleSummaryFromSlots(schedule),
    deliveryMode: lesson.lessonDelivery === 'online' ? 'online' : 'yuz_yuze',
  };
}

async function attachInstructorIds(
  rows: SchoolEventLessonRow[],
  accessToken: string,
): Promise<InstructorLessonModel[]> {
  const instructorByEventId = await listEventInstructorIdsByEventId(rows.map((row) => row.id), accessToken);
  const danceTypeIdsByEventId = await listEventDanceTypeIdsByEventId(rows.map((row) => row.id), accessToken);
  return rows.map((row) => ({
    ...mapLesson(row, instructorByEventId.get(row.id) ?? row.created_by),
    danceTypeIds: danceTypeIdsByEventId.get(row.id) ?? [],
  }));
}

function buildLessonLocationPlace(input: {
  locationPlace?: Record<string, unknown> | null;
  level: string;
  lessonFormat?: 'private' | 'group';
  lessonDelivery?: 'online' | 'in_person';
  isPublished: boolean;
  location?: string | null;
  city?: string | null;
}): Record<string, unknown> {
  const base = toObject(input.locationPlace) ?? {};
  const next: Record<string, unknown> = {
    ...base,
    lesson_level: input.level.trim() || 'Tüm Seviyeler',
    lesson_type: input.lessonFormat === 'private' ? 'private' : 'group',
    lesson_format: input.lessonFormat === 'private' ? 'private' : 'group',
    lesson_delivery_mode: input.lessonDelivery === 'online' ? 'online' : 'in_person',
    lesson_delivery: input.lessonDelivery === 'online' ? 'online' : 'in_person',
    lesson_is_published: input.isPublished,
  };
  if (input.location?.trim()) {
    next.address = input.location.trim();
    next.formatted_address = input.location.trim();
  }
  if (input.city?.trim()) {
    next.city = input.city.trim();
  }
  return next;
}

async function getLessonRowById(id: string, accessToken: string): Promise<SchoolEventLessonRow | null> {
  const rows = await supabaseRestRequest<SchoolEventLessonRow[]>(
    `/school_events?select=${lessonEventSelect()}&id=eq.${encodeURIComponent(id)}&event_type=eq.${LESSON_EVENT_TYPE}&limit=1`,
    { method: 'GET', accessToken },
  );
  return rows?.[0] ?? null;
}

export const instructorLessonsService = {
  async listPublishedByIds(ids: string[]): Promise<PublishedInstructorLessonListItem[]> {
    const unique = uniqueIds(ids);
    if (unique.length === 0) return [];
    return await withAuthorizedUserRequest(async (accessToken) => {
      const rows = await supabaseRestRequest<SchoolEventLessonRow[]>(
        `/school_events?select=${lessonEventSelect()}&id=in.(${unique.map((id) => encodeURIComponent(id)).join(',')})&event_type=eq.${LESSON_EVENT_TYPE}&order=starts_at.asc.nullslast,created_at.desc`,
        { method: 'GET', accessToken },
      );
      const lessons = (await attachInstructorIds(rows ?? [], accessToken)).filter((lesson) => lesson.isPublished);
      const scheduleByLessonId = new Map(lessons.map((lesson) => [lesson.id, parseScheduleItems(lesson.id, (rows ?? []).find((row) => row.id === lesson.id)?.schedule_items)]));
      const [profileById, schoolById] = await Promise.all([
        listProfilesById(lessons.map((lesson) => lesson.instructorUserId), accessToken),
        listSchoolsById(lessons.map((lesson) => lesson.schoolId), accessToken),
      ]);
      return lessons.map((lesson) => hydratePublishedLesson(lesson, profileById, schoolById, scheduleByLessonId));
    });
  },

  async listPublished(limit = 100): Promise<PublishedInstructorLessonListItem[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 200);
    return await withAuthorizedUserRequest(async (accessToken) => {
      const rows = await supabaseRestRequest<SchoolEventLessonRow[]>(
        `/school_events?select=${lessonEventSelect()}&event_type=eq.${LESSON_EVENT_TYPE}&order=starts_at.asc.nullslast,created_at.desc&limit=${safeLimit}`,
        { method: 'GET', accessToken },
      );
      const lessons = (await attachInstructorIds(rows ?? [], accessToken)).filter((lesson) => lesson.isPublished);
      const scheduleByLessonId = new Map((rows ?? []).map((row) => [row.id, parseScheduleItems(row.id, row.schedule_items)]));
      const [profileById, schoolById] = await Promise.all([
        listProfilesById(lessons.map((lesson) => lesson.instructorUserId), accessToken),
        listSchoolsById(lessons.map((lesson) => lesson.schoolId), accessToken),
      ]);
      return lessons.map((lesson) => hydratePublishedLesson(lesson, profileById, schoolById, scheduleByLessonId));
    });
  },

  async listPublishedByInstructor(instructorUserId: string): Promise<InstructorLessonModel[]> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const rows = await supabaseRestRequest<SchoolEventLessonRow[]>(
        `/school_events?select=${lessonEventSelect()}&event_type=eq.${LESSON_EVENT_TYPE}&created_by=eq.${encodeURIComponent(instructorUserId)}&order=created_at.desc&limit=50`,
        { method: 'GET', accessToken },
      );
      return (await attachInstructorIds(rows ?? [], accessToken)).filter((lesson) => lesson.isPublished);
    });
  },

  async getPublishedById(id: string): Promise<PublishedInstructorLessonListItem | null> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const row = await getLessonRowById(id, accessToken);
      if (!row) return null;
      const lesson = (await attachInstructorIds([row], accessToken))[0];
      if (!lesson || !lesson.isPublished) return null;
      const scheduleByLessonId = new Map([[lesson.id, parseScheduleItems(lesson.id, row.schedule_items)]]);
      const [profileById, schoolById] = await Promise.all([
        listProfilesById([lesson.instructorUserId], accessToken),
        listSchoolsById([lesson.schoolId], accessToken),
      ]);
      return hydratePublishedLesson(lesson, profileById, schoolById, scheduleByLessonId);
    });
  },

  async listMine(): Promise<InstructorLessonModel[]> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      const rows = await supabaseRestRequest<SchoolEventLessonRow[]>(
        `/school_events?select=${lessonEventSelect()}&event_type=eq.${LESSON_EVENT_TYPE}&created_by=eq.${encodeURIComponent(me)}&order=created_at.desc&limit=100`,
        { method: 'GET', accessToken },
      );
      return await attachInstructorIds(rows ?? [], accessToken);
    });
  },

  async create(input: InstructorLessonInput): Promise<InstructorLessonModel> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      const imageUrl = await uploadLessonCoverIfNeeded(accessToken, me, input.imageUri);
      const locationPlace = buildLessonLocationPlace({
        level: input.level,
        lessonFormat: input.lessonFormat,
        lessonDelivery: input.lessonDelivery,
        isPublished: input.isPublished,
        location: input.address ?? input.location,
        city: input.city,
      });
      const rows = await supabaseRestRequest<SchoolEventLessonRow[]>(
        `/school_events?select=${lessonEventSelect()}`,
        {
          method: 'POST',
          accessToken,
          headers: { Prefer: 'return=representation' },
          body: {
            title: input.title.trim(),
            description: input.description.trim() ? input.description.trim() : null,
            image_url: imageUrl ?? null,
            location: input.location?.trim() || null,
            city: input.city?.trim() || null,
            starts_at: input.startsAt,
            ends_at: input.endsAt ?? null,
            school_id: input.schoolId ?? null,
            event_type: LESSON_EVENT_TYPE,
            price_amount: input.priceCents != null ? input.priceCents / 100 : null,
            participant_limit: input.participantLimit ?? null,
            price_currency: input.currency ?? 'TRY',
            location_place: locationPlace,
            schedule_items: [],
          },
        },
      );
      const row = rows?.[0];
      if (!row) throw new ApiError('Ders oluşturulamadı.', { status: 500 });
      try {
        await replaceEventDanceTypes(row.id, input.danceTypeIds ?? [], accessToken);
      } catch (error) {
        const message = error instanceof Error ? error.message.toLowerCase() : '';
        if (message.includes('event_dance_types')) {
          throw new Error('Ders oluşturuldu ancak dans türleri kaydedilemedi.');
        }
        throw error;
      }
      return {
        ...mapLesson(row, me),
        danceTypeIds: normalizeDanceTypeIds(input.danceTypeIds ?? []),
      };
    });
  },

  async update(id: string, input: InstructorLessonInput): Promise<InstructorLessonModel> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const current = await getLessonRowById(id, accessToken);
      if (!current) throw new ApiError('Ders bulunamadı.', { status: 404 });
      const me = current.created_by?.trim() || (await getMyUserId(accessToken));
      const imageUrl = await uploadLessonCoverIfNeeded(accessToken, me, input.imageUri === undefined ? current.image_url : input.imageUri);
      const currentMeta = extractLessonMeta(current.location_place);
      const locationPlace = buildLessonLocationPlace({
        locationPlace: {
          ...toObject(current.location_place),
          lesson_level: currentMeta.lesson_level,
          lesson_is_published: currentMeta.lesson_is_published,
        },
        level: input.level,
        lessonFormat: input.lessonFormat,
        lessonDelivery: input.lessonDelivery,
        isPublished: input.isPublished,
        location: input.address ?? input.location,
        city: input.city,
      });
      const rows = await supabaseRestRequest<SchoolEventLessonRow[]>(
        `/school_events?id=eq.${encodeURIComponent(id)}&select=${lessonEventSelect()}`,
        {
          method: 'PATCH',
          accessToken,
          headers: { Prefer: 'return=representation' },
          body: {
            title: input.title.trim(),
            description: input.description.trim() ? input.description.trim() : null,
            image_url: imageUrl ?? null,
            location: input.location?.trim() || null,
            city: input.city?.trim() || null,
            starts_at: input.startsAt,
            ends_at: input.endsAt ?? null,
            school_id: input.schoolId ?? null,
            price_amount: input.priceCents != null ? input.priceCents / 100 : null,
            participant_limit: input.participantLimit ?? null,
            price_currency: input.currency ?? 'TRY',
            location_place: locationPlace,
          },
        },
      );
      const row = rows?.[0];
      if (!row) throw new ApiError('Ders güncellenemedi.', { status: 500 });
      try {
        await replaceEventDanceTypes(id, input.danceTypeIds ?? [], accessToken);
      } catch (error) {
        const message = error instanceof Error ? error.message.toLowerCase() : '';
        if (message.includes('event_dance_types')) {
          throw new Error('Ders güncellendi ancak dans türleri kaydedilemedi.');
        }
        throw error;
      }
      return {
        ...mapLesson(row, me),
        danceTypeIds: normalizeDanceTypeIds(input.danceTypeIds ?? []),
      };
    });
  },

  async remove(id: string): Promise<void> {
    await withAuthorizedUserRequest(async (accessToken) => {
      await supabaseRestRequest(`/school_events?id=eq.${encodeURIComponent(id)}&event_type=eq.${LESSON_EVENT_TYPE}`, {
        method: 'DELETE',
        accessToken,
        headers: { Prefer: 'return=minimal' },
      });
    });
  },
};

export const instructorScheduleService = {
  async listByLesson(lessonId: string): Promise<InstructorScheduleSlotModel[]> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const row = await getLessonRowById(lessonId, accessToken);
      return row ? parseScheduleItems(lessonId, row.schedule_items) : [];
    });
  },

  async createSlot(input: InstructorScheduleSlotInput): Promise<InstructorScheduleSlotModel> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const row = await getLessonRowById(input.lessonId, accessToken);
      if (!row) throw new ApiError('Ders bulunamadı.', { status: 404 });
      const slots = parseScheduleItems(input.lessonId, row.schedule_items);
      const slot: InstructorScheduleSlotModel = {
        id: `slot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        lessonId: input.lessonId,
        weekday: input.weekday,
        startTime: shortTime(formatTimeForApi(input.startTime)),
        tz: input.tz ?? 'Europe/Istanbul',
        locationType: input.locationType,
        address: input.address?.trim() || null,
      };
      const nextSlots = [...slots, slot].sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime));
      const rows = await supabaseRestRequest<SchoolEventLessonRow[]>(
        `/school_events?id=eq.${encodeURIComponent(input.lessonId)}&select=${lessonEventSelect()}`,
        {
          method: 'PATCH',
          accessToken,
          headers: { Prefer: 'return=representation' },
          body: { schedule_items: serializeScheduleItems(nextSlots) },
        },
      );
      if (!rows?.[0]) throw new ApiError('Program satırı eklenemedi.', { status: 500 });
      return slot;
    });
  },

  async removeSlot(id: string): Promise<void> {
    await withAuthorizedUserRequest(async (accessToken) => {
      const lessons = await instructorLessonsService.listMine();
      for (const lesson of lessons) {
        const row = await getLessonRowById(lesson.id, accessToken);
        if (!row) continue;
        const slots = parseScheduleItems(lesson.id, row.schedule_items);
        if (!slots.some((slot) => slot.id === id)) continue;
        const nextSlots = slots.filter((slot) => slot.id !== id);
        await supabaseRestRequest(`/school_events?id=eq.${encodeURIComponent(lesson.id)}`, {
          method: 'PATCH',
          accessToken,
          headers: { Prefer: 'return=minimal' },
          body: { schedule_items: serializeScheduleItems(nextSlots) },
        });
        return;
      }
      throw new ApiError('Program satırı bulunamadı.', { status: 404 });
    });
  },
};

export function formatLessonStartsAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('tr-TR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function parseLessonStartsAtToIso(d: Date | null): string | null {
  if (!d || Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function lessonStartsAtToDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatLessonPrice(model: InstructorLessonModel): string {
  if (model.priceCents == null || model.priceCents <= 0) return 'Ücretsiz';
  const amount = model.priceCents / 100;
  const formatted = amount % 1 === 0 ? String(amount) : amount.toFixed(2);
  switch ((model.currency || 'TRY').trim().toUpperCase()) {
    case 'USD':
      return `$${formatted}`;
    case 'EUR':
      return `€${formatted}`;
    default:
      return `₺${formatted}`;
  }
}

export function parseTlToCents(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  if (lower.includes('ücretsiz') || lower === '0' || lower === '0,00' || lower === '0.00') return null;
  const normalized = t.replace(',', '.').replace(/[^\d.]/g, '');
  const n = parseFloat(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}
