import { ApiError, supabaseAuthRequest, supabaseRestRequest } from './apiClient';
import { storage } from '../storage';
import { listAssignedSchoolIdsForUser } from './instructorSchoolAssignments';

export type PublishStatus = 'pending' | 'approved' | 'rejected';

export type SchoolEventRow = {
  id: string;
  school_id: string | null;
  created_by?: string | null;
  title: string;
  starts_at: string;
  ends_at?: string | null;
  city?: string | null;
  location: string | null;
  image_url: string | null;
  description: string | null;
  location_place?: Record<string, unknown> | null;
  event_type?: string | null;
  price_amount?: number | string | null;
  price_currency?: string | null;
  participant_limit?: number | null;
  payment_methods?: unknown;
  payment_details?: string | null;
  media_items?: unknown;
  schedule_items?: unknown;
  publish_status?: PublishStatus | null;
  published_at?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  rejected_at?: string | null;
  rejected_by?: string | null;
  rejection_reason?: string | null;
};

export type SchoolEventDetails = SchoolEventRow & {
  dance_type_names: string[];
  attendee_count: number;
  instructor_count: number;
  open_address: string | null;
  city: string | null;
};

export type ManagedSchoolEventItem = SchoolEventRow & {
  school_name: string;
};

export type EditableSchoolEvent = ManagedSchoolEventItem & {
  dance_type_ids: string[];
};

export type CreateSchoolEventInput = {
  schoolId?: string | null;
  title: string;
  startsAt: string;
  endsAt?: string | null;
  city?: string | null;
  location?: string | null;
  description?: string | null;
  participantLimit?: number | null;
  priceAmount?: number | null;
  priceCurrency?: string | null;
  eventType?: string | null;
  danceTypeIds?: string[];
  locationPlace?: Record<string, unknown> | null;
  publishStatus?: PublishStatus | null;
  publishedAt?: string | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
  rejectedAt?: string | null;
  rejectedBy?: string | null;
  rejectionReason?: string | null;
};

export type EventPublishPermissionStatus = {
  canPublishWithoutApproval: boolean;
  grantedBySchoolId: string | null;
};

export type SchoolEventCreatorSummary = {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  eventCount: number;
  canPublishWithoutApproval: boolean;
};

type SupabaseUserResponse = {
  id: string;
};

type SupabaseSessionResponse = {
  access_token: string;
  refresh_token: string;
};

type SchoolRow = {
  id: string;
  name: string;
};

type EventDanceTypeLinkRow = {
  dance_type_id: string | null;
};

type DanceTypeRow = {
  id: string;
  name: string | null;
};

type EventAttendeeIdentityRow = {
  user_id?: string | null;
};

type LegacyEventAttendeeRow = {
  user_id?: string | null;
};

type BookingAttendeeRow = {
  user_id?: string | null;
};

type ProfileLiteRow = {
  id: string;
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
};

type EventPublishPermissionRow = {
  user_id: string;
  granted_by_school_id?: string | null;
};

function baseSchoolEventSelect(): string {
  return 'id,school_id,created_by,title,starts_at,ends_at,city,location,image_url,description,location_place,event_type,price_amount,price_currency,participant_limit,payment_methods,payment_details,media_items,schedule_items,publish_status,published_at,approved_at,approved_by,rejected_at,rejected_by,rejection_reason';
}

function normalizeDanceTypeIds(input: string[] | undefined): string[] {
  return [...new Set((input ?? []).map((value) => value.trim()).filter(Boolean))];
}

function buildSchoolEventPayload(input: CreateSchoolEventInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    school_id: input.schoolId ?? null,
    title: input.title.trim(),
    starts_at: input.startsAt,
    ends_at: input.endsAt ?? null,
    city: input.city?.trim() || null,
    location: input.location?.trim() || null,
    description: input.description?.trim() || null,
    participant_limit: input.participantLimit ?? null,
    price_amount: input.priceAmount ?? null,
    price_currency: input.priceCurrency?.trim() || null,
    event_type: input.eventType?.trim() || null,
    location_place: input.locationPlace ?? null,
  };

  if (input.publishStatus) {
    payload.publish_status = input.publishStatus;

    if (input.publishStatus === 'approved') {
      const now = input.publishedAt ?? new Date().toISOString();
      payload.published_at = now;
      payload.approved_at = input.approvedAt ?? now;
      payload.approved_by = input.approvedBy ?? null;
      payload.rejected_at = null;
      payload.rejected_by = null;
      payload.rejection_reason = null;
    } else if (input.publishStatus === 'pending') {
      payload.published_at = null;
      payload.approved_at = null;
      payload.approved_by = null;
      payload.rejected_at = null;
      payload.rejected_by = null;
      payload.rejection_reason = null;
    } else {
      payload.rejected_at = input.rejectedAt ?? new Date().toISOString();
      payload.rejected_by = input.rejectedBy ?? null;
      payload.rejection_reason = input.rejectionReason?.trim() || null;
      payload.published_at = null;
      payload.approved_at = null;
      payload.approved_by = null;
    }
  }

  return payload;
}

function buildPublishedEventFilter(includeUnpublished?: boolean): string {
  return includeUnpublished ? '' : '&publish_status=eq.approved';
}

async function insertEventDanceTypes(eventId: string, danceTypeIds: string[], accessToken: string): Promise<void> {
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

async function replaceEventDanceTypes(eventId: string, danceTypeIds: string[], accessToken: string): Promise<void> {
  await supabaseRestRequest(
    `/event_dance_types?event_id=eq.${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      accessToken,
      headers: { Prefer: 'return=minimal' },
    },
  );

  await insertEventDanceTypes(eventId, danceTypeIds, accessToken);
}

function toObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function extractOpenAddress(locationPlace: unknown, fallbackLocation: string | null): string | null {
  const place = toObject(locationPlace);
  const preferred =
    (typeof place?.formatted_address === 'string' && place.formatted_address) ||
    (typeof place?.address === 'string' && place.address) ||
    (typeof place?.open_address === 'string' && place.open_address) ||
    (typeof place?.description === 'string' && place.description) ||
    (typeof place?.name === 'string' && place.name) ||
    fallbackLocation;
  const trimmed = preferred?.trim();
  return trimmed ? trimmed : null;
}

function extractCity(eventCity: string | null | undefined, locationPlace: unknown): string | null {
  const directCity = (eventCity ?? '').trim();
  if (directCity) return directCity;
  const place = toObject(locationPlace);
  const city = typeof place?.city === 'string' ? place.city.trim() : '';
  return city || null;
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
  if (!accessToken) {
    accessToken = await refreshAccessToken();
  }
  if (!accessToken) {
    throw new Error('No access token.');
  }

  try {
    return await run(accessToken);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    const refreshedToken = await refreshAccessToken();
    if (!refreshedToken) throw error;
    return run(refreshedToken);
  }
}

async function getMyUserId(accessToken: string): Promise<string> {
  const user = await supabaseAuthRequest<SupabaseUserResponse>('/user', { accessToken });
  return user.id;
}

async function assertAssignedSchool(accessToken: string, schoolId: string): Promise<void> {
  const me = await getMyUserId(accessToken);
  const schoolIds = await listAssignedSchoolIdsForUser(accessToken, me);
  if (!schoolIds.includes(schoolId)) {
    throw new Error('Bu okul için erişim yetkiniz bulunmuyor.');
  }
}

async function listSchoolNamesById(ids: string[], accessToken: string): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();

  const schools = await supabaseRestRequest<SchoolRow[]>(
    `/schools?select=id,name&id=in.(${uniqueIds.map((id) => encodeURIComponent(id)).join(',')})`,
    { method: 'GET', accessToken },
  );

  return new Map((schools ?? []).map((school) => [school.id, school.name]));
}

function attachSchoolNames(events: SchoolEventRow[], schoolNameById: Map<string, string>): ManagedSchoolEventItem[] {
  return (events ?? []).map((event) => ({
    ...event,
    school_name: (event.school_id ? schoolNameById.get(event.school_id)?.trim() : '') || 'Bağımsız etkinlik',
  }));
}

function mapCreatorSummary(
  userId: string,
  eventCount: number,
  profileById: Map<string, ProfileLiteRow>,
  permissionUserIds: Set<string>,
): SchoolEventCreatorSummary {
  const profile = profileById.get(userId);
  const username = (profile?.username ?? '').trim();
  const displayName = (profile?.display_name ?? '').trim() || username || 'Kullanıcı';
  return {
    userId,
    displayName,
    username,
    avatarUrl: profile?.avatar_url?.trim() || null,
    eventCount,
    canPublishWithoutApproval: permissionUserIds.has(userId),
  };
}

export async function listSchoolEvents(
  schoolId: string,
  limit = 20,
  opts?: { includeUnpublished?: boolean },
): Promise<SchoolEventRow[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  return await supabaseRestRequest<SchoolEventRow[]>(
    `/school_events?select=${baseSchoolEventSelect()}&school_id=eq.${encodeURIComponent(schoolId)}${buildPublishedEventFilter(opts?.includeUnpublished)}&order=starts_at.asc&limit=${safeLimit}`,
    { method: 'GET' },
  );
}

export async function listAllSchoolEvents(
  limit = 100,
  opts?: { includeUnpublished?: boolean; offset?: number },
): Promise<SchoolEventRow[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 200);
  const safeOffset = Math.max(opts?.offset ?? 0, 0);
  return await supabaseRestRequest<SchoolEventRow[]>(
    `/school_events?select=${baseSchoolEventSelect()}${buildPublishedEventFilter(opts?.includeUnpublished)}&order=starts_at.desc&limit=${safeLimit}&offset=${safeOffset}`,
    { method: 'GET' },
  );
}

export async function getSchoolEventById(eventId: string, opts?: { includeUnpublished?: boolean }): Promise<SchoolEventRow | null> {
  if (opts?.includeUnpublished) {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const rows = await supabaseRestRequest<SchoolEventRow[]>(
        `/school_events?select=${baseSchoolEventSelect()}&id=eq.${encodeURIComponent(eventId)}&limit=1`,
        { method: 'GET', accessToken },
      );
      return rows?.[0] ?? null;
    });
  }

  const rows = await supabaseRestRequest<SchoolEventRow[]>(
    `/school_events?select=${baseSchoolEventSelect()}&id=eq.${encodeURIComponent(eventId)}&publish_status=eq.approved&limit=1`,
    { method: 'GET' },
  );
  return rows?.[0] ?? null;
}

export async function getSchoolEventDetailsById(
  eventId: string,
  opts?: { includeUnpublished?: boolean },
): Promise<SchoolEventDetails | null> {
  const event = await getSchoolEventById(eventId, opts);
  if (!event) return null;

  const [danceLinks, attendeeRows, legacyAttendeeRows, bookingRows, eventInstructors] = await Promise.all([
    supabaseRestRequest<EventDanceTypeLinkRow[]>(
      `/event_dance_types?select=dance_type_id&event_id=eq.${encodeURIComponent(eventId)}`,
      { method: 'GET' },
    ).catch(() => []),
    supabaseRestRequest<EventAttendeeIdentityRow[]>(
      `/school_event_attendees?select=user_id&event_id=eq.${encodeURIComponent(eventId)}`,
      { method: 'GET' },
    ).catch(() => []),
    supabaseRestRequest<LegacyEventAttendeeRow[]>(
      `/event_attendees?select=user_id&event_id=eq.${encodeURIComponent(eventId)}`,
      { method: 'GET' },
    ).catch(() => []),
    supabaseRestRequest<BookingAttendeeRow[]>(
      `/bookings?select=user_id&booking_type=eq.event&event_id=eq.${encodeURIComponent(eventId)}&status=neq.cancelled`,
      { method: 'GET' },
    ).catch(() => []),
    supabaseRestRequest<{ event_id?: string }[]>(
      `/event_instructors?select=event_id&event_id=eq.${encodeURIComponent(eventId)}`,
      { method: 'GET' },
    ).catch(() => []),
  ]);

  const danceTypeIds = [...new Set((danceLinks ?? []).map((row) => row.dance_type_id).filter(Boolean))] as string[];
  const danceTypes =
    danceTypeIds.length > 0
      ? await supabaseRestRequest<DanceTypeRow[]>(
          `/dance_types?select=id,name&id=in.(${danceTypeIds.map((id) => encodeURIComponent(id)).join(',')})`,
          { method: 'GET' },
        ).catch(() => [])
      : [];

  const danceTypeNames = [...new Set((danceTypes ?? []).map((row) => row.name?.trim()).filter(Boolean))] as string[];
  const attendeeCount = [
    ...new Set(
      [
        ...(attendeeRows ?? []).map((row) => row.user_id?.trim() || ''),
        ...(legacyAttendeeRows ?? []).map((row) => row.user_id?.trim() || ''),
        ...(bookingRows ?? []).map((row) => row.user_id?.trim() || ''),
      ].filter(Boolean),
    ),
  ].length;

  return {
    ...event,
    dance_type_names: danceTypeNames,
    attendee_count: attendeeCount,
    instructor_count: eventInstructors?.length ?? 0,
    open_address: extractOpenAddress(event.location_place, event.location),
    city: extractCity(event.city, event.location_place),
  };
}

export async function createSchoolEvent(input: CreateSchoolEventInput): Promise<SchoolEventRow> {
  return await withAuthorizedUserRequest(async (accessToken) => {
    let response: SchoolEventRow | SchoolEventRow[];
    try {
      response = await supabaseRestRequest<SchoolEventRow | SchoolEventRow[]>(
        `/school_events?select=${baseSchoolEventSelect()}`,
        {
          method: 'POST',
          accessToken,
          headers: {
            Prefer: 'return=representation',
          },
          body: buildSchoolEventPayload(input),
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      if (message.includes('row-level security')) {
        throw new Error('Backend tarafında `school_events` insert yetkisi normal kullanıcılar için henüz açık değil.');
      }
      if (message.includes('null value') && message.includes('school_id')) {
        throw new Error('Backend tarafında `school_events.school_id` alanı hâlâ zorunlu görünüyor.');
      }
      if (message.includes('school_events') && message.includes('event type check')) {
        throw new Error('Etkinlik tipi backend tarafında beklenen formatta değil.');
      }
      throw error;
    }

    const rows = Array.isArray(response) ? response : [response];
    const created = rows[0];
    if (!created) {
      throw new Error('Etkinlik oluşturulamadı.');
    }

    const danceTypeIds = normalizeDanceTypeIds(input.danceTypeIds);
    if (danceTypeIds.length > 0) {
      try {
        await insertEventDanceTypes(created.id, danceTypeIds, accessToken);
      } catch (error) {
        const message = error instanceof Error ? error.message.toLowerCase() : '';
        if (message.includes('event_dance_types')) {
          throw new Error('Etkinlik oluşturuldu ancak dans türü eşlemesi kaydedilemedi.');
        }
        throw error;
      }
    }

    return created;
  });
}

async function getEventDanceTypeIds(eventId: string, accessToken: string): Promise<string[]> {
  const rows = await supabaseRestRequest<EventDanceTypeLinkRow[]>(
    `/event_dance_types?select=dance_type_id&event_id=eq.${encodeURIComponent(eventId)}`,
    { method: 'GET', accessToken },
  ).catch(() => []);

  return [...new Set((rows ?? []).map((row) => row.dance_type_id).filter(Boolean))] as string[];
}

export const instructorSchoolEventsService = {
  async listMine(): Promise<ManagedSchoolEventItem[]> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      const schoolIds = await listAssignedSchoolIdsForUser(accessToken, me);
      if (schoolIds.length === 0) return [];

      const idIn = schoolIds.map((id) => encodeURIComponent(id)).join(',');
      const [events, schools] = await Promise.all([
        supabaseRestRequest<SchoolEventRow[]>(
          `/school_events?select=${baseSchoolEventSelect()}&school_id=in.(${idIn})&order=starts_at.asc`,
          { method: 'GET', accessToken },
        ),
        listSchoolNamesById(schoolIds, accessToken),
      ]);

      return attachSchoolNames(events ?? [], schools);
    });
  },

  async create(input: CreateSchoolEventInput): Promise<SchoolEventRow> {
    return await createSchoolEvent(input);
  },
};

export const creatorSchoolEventsService = {
  async listMine(): Promise<ManagedSchoolEventItem[]> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      const events = await supabaseRestRequest<SchoolEventRow[]>(
        `/school_events?select=${baseSchoolEventSelect()}&created_by=eq.${encodeURIComponent(me)}&order=starts_at.desc`,
        { method: 'GET', accessToken },
      );
      const schoolIds = [...new Set((events ?? []).map((event) => event.school_id).filter(Boolean))] as string[];
      const schoolNameById = await listSchoolNamesById(schoolIds, accessToken);
      return attachSchoolNames(events ?? [], schoolNameById);
    });
  },

  async getMyPublishPermission(): Promise<EventPublishPermissionStatus> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      const rows = await supabaseRestRequest<EventPublishPermissionRow[]>(
        `/event_publish_permissions?select=user_id,granted_by_school_id&user_id=eq.${encodeURIComponent(me)}&limit=1`,
        { method: 'GET', accessToken },
      ).catch(() => []);
      const row = rows?.[0];
      return {
        canPublishWithoutApproval: !!row,
        grantedBySchoolId: row?.granted_by_school_id?.trim() || null,
      };
    });
  },

  async getMineById(eventId: string): Promise<EditableSchoolEvent | null> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      const events = await supabaseRestRequest<SchoolEventRow[]>(
        `/school_events?select=${baseSchoolEventSelect()}&id=eq.${encodeURIComponent(eventId)}&created_by=eq.${encodeURIComponent(me)}&limit=1`,
        { method: 'GET', accessToken },
      );
      const event = events?.[0] ?? null;
      if (!event) return null;

      const [danceTypeIds, schoolNameById] = await Promise.all([
        getEventDanceTypeIds(eventId, accessToken),
        listSchoolNamesById(event.school_id ? [event.school_id] : [], accessToken),
      ]);
      const managedEvent = attachSchoolNames([event], schoolNameById)[0];
      if (!managedEvent) return null;

      return {
        ...managedEvent,
        dance_type_ids: danceTypeIds,
      };
    });
  },

  async updateMine(eventId: string, input: CreateSchoolEventInput): Promise<SchoolEventRow> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      let response: SchoolEventRow | SchoolEventRow[];

      try {
        response = await supabaseRestRequest<SchoolEventRow | SchoolEventRow[]>(
          `/school_events?id=eq.${encodeURIComponent(eventId)}&created_by=eq.${encodeURIComponent(me)}&select=${baseSchoolEventSelect()}`,
          {
            method: 'PATCH',
            accessToken,
            headers: {
              Prefer: 'return=representation',
            },
            body: buildSchoolEventPayload(input),
          },
        );
      } catch (error) {
        const message = error instanceof Error ? error.message.toLowerCase() : '';
        if (message.includes('row-level security')) {
          throw new Error('Bu etkinliği düzenleme yetkiniz bulunmuyor.');
        }
        if (message.includes('school_events') && message.includes('event type check')) {
          throw new Error('Etkinlik tipi backend tarafında beklenen formatta değil.');
        }
        throw error;
      }

      const rows = Array.isArray(response) ? response : [response];
      const updated = rows[0];
      if (!updated) {
        throw new Error('Etkinlik bulunamadı veya düzenleme yetkiniz yok.');
      }

      try {
        await replaceEventDanceTypes(eventId, normalizeDanceTypeIds(input.danceTypeIds), accessToken);
      } catch (error) {
        const message = error instanceof Error ? error.message.toLowerCase() : '';
        if (message.includes('event_dance_types')) {
          throw new Error('Etkinlik güncellendi ancak dans türü eşlemesi kaydedilemedi.');
        }
        throw error;
      }

      return updated;
    });
  },

  async deleteMine(eventId: string): Promise<void> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);

      try {
        await supabaseRestRequest(
          `/school_events?id=eq.${encodeURIComponent(eventId)}&created_by=eq.${encodeURIComponent(me)}`,
          {
            method: 'DELETE',
            accessToken,
            headers: {
              Prefer: 'return=minimal',
            },
          },
        );
      } catch (error) {
        const message = error instanceof Error ? error.message.toLowerCase() : '';
        if (message.includes('row-level security')) {
          throw new Error('Bu etkinliği silme yetkiniz bulunmuyor.');
        }
        throw error;
      }
    });
  },
};

export const schoolEventModerationService = {
  async listCreatorsForSchool(schoolId: string): Promise<SchoolEventCreatorSummary[]> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      await assertAssignedSchool(accessToken, schoolId);
      const rows = await supabaseRestRequest<SchoolEventRow[]>(
        `/school_events?select=${baseSchoolEventSelect()}&school_id=eq.${encodeURIComponent(schoolId)}&order=created_at.desc&limit=200`,
        { method: 'GET', accessToken },
      );

      const creatorIds = [...new Set((rows ?? []).map((row) => row.created_by?.trim()).filter(Boolean))] as string[];
      if (creatorIds.length === 0) return [];

      const eventCountByUserId = new Map<string, number>();
      creatorIds.forEach((userId) => eventCountByUserId.set(userId, 0));
      (rows ?? []).forEach((row) => {
        const userId = row.created_by?.trim();
        if (!userId) return;
        eventCountByUserId.set(userId, (eventCountByUserId.get(userId) ?? 0) + 1);
      });

      const inClause = creatorIds.map((id) => encodeURIComponent(id)).join(',');
      const [profiles, permissionRows] = await Promise.all([
        supabaseRestRequest<ProfileLiteRow[]>(
          `/profiles?select=id,display_name,username,avatar_url&id=in.(${inClause})`,
          { method: 'GET', accessToken },
        ).catch(() => []),
        supabaseRestRequest<EventPublishPermissionRow[]>(
          `/event_publish_permissions?select=user_id,granted_by_school_id&user_id=in.(${inClause})`,
          { method: 'GET', accessToken },
        ).catch(() => []),
      ]);

      const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
      const permissionUserIds = new Set((permissionRows ?? []).map((row) => row.user_id));

      return creatorIds
        .map((userId) => mapCreatorSummary(userId, eventCountByUserId.get(userId) ?? 0, profileById, permissionUserIds))
        .sort((a, b) => {
          if (a.canPublishWithoutApproval !== b.canPublishWithoutApproval) {
            return a.canPublishWithoutApproval ? -1 : 1;
          }
          return b.eventCount - a.eventCount;
        });
    });
  },

  async setCreatorPublishPermission(schoolId: string, userId: string, enabled: boolean): Promise<void> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      await assertAssignedSchool(accessToken, schoolId);
      const me = await getMyUserId(accessToken);
      if (enabled) {
        await supabaseRestRequest('/event_publish_permissions?on_conflict=user_id', {
          method: 'POST',
          accessToken,
          headers: {
            Prefer: 'resolution=merge-duplicates,return=minimal',
          },
          body: {
            user_id: userId,
            granted_by_school_id: schoolId,
            granted_by_user_id: me,
          },
        });
        return;
      }

      await supabaseRestRequest(
        `/event_publish_permissions?user_id=eq.${encodeURIComponent(userId)}`,
        {
          method: 'DELETE',
          accessToken,
          headers: { Prefer: 'return=minimal' },
        },
      );
    });
  },

  async approveEvent(schoolId: string, eventId: string): Promise<void> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      await assertAssignedSchool(accessToken, schoolId);
      const me = await getMyUserId(accessToken);
      const now = new Date().toISOString();
      await supabaseRestRequest(
        `/school_events?id=eq.${encodeURIComponent(eventId)}&school_id=eq.${encodeURIComponent(schoolId)}`,
        {
          method: 'PATCH',
          accessToken,
          headers: { Prefer: 'return=minimal' },
          body: {
            publish_status: 'approved',
            published_at: now,
            approved_at: now,
            approved_by: me,
            rejected_at: null,
            rejected_by: null,
            rejection_reason: null,
          },
        },
      );
    });
  },

  async rejectEvent(schoolId: string, eventId: string, reason: string): Promise<void> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      await assertAssignedSchool(accessToken, schoolId);
      const me = await getMyUserId(accessToken);
      await supabaseRestRequest(
        `/school_events?id=eq.${encodeURIComponent(eventId)}&school_id=eq.${encodeURIComponent(schoolId)}`,
        {
          method: 'PATCH',
          accessToken,
          headers: { Prefer: 'return=minimal' },
          body: {
            publish_status: 'rejected',
            published_at: null,
            approved_at: null,
            approved_by: null,
            rejected_at: new Date().toISOString(),
            rejected_by: me,
            rejection_reason: reason.trim() || null,
          },
        },
      );
    });
  },
};
