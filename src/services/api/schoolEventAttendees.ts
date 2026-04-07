import { ApiError, supabaseAuthRequest, supabaseRestRequest } from './apiClient';
import { storage } from '../storage';
import type { SchoolEventRow } from './schoolEvents';

type SupabaseUserResponse = { id: string };
type SupabaseSessionResponse = { access_token: string; refresh_token: string };
type AttendeeRow = { user_id?: string | null };
type JoinedEventRow = { event_id: string; created_at: string };
type BookingRow = { user_id?: string | null; event_id?: string | null; booked_at?: string | null };
type LegacyEventAttendeeRow = { user_id?: string | null };
type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

export type EventAttendee = {
  id: string;
  name: string;
  avatar: string;
};

export type LatestJoinedEvent = {
  event: SchoolEventRow;
  joinedAt: string;
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

function getAttendeeIdentity(row: AttendeeRow): string | null {
  const userId = typeof row.user_id === 'string' ? row.user_id.trim() : '';
  return userId || null;
}

function getOptionalId(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export const schoolEventAttendeesService = {
  async getCurrentUserId(): Promise<string> {
    return await withAuthorizedUserRequest(async (accessToken) => getMyUserId(accessToken));
  },

  async list(eventId: string): Promise<EventAttendee[]> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const [attendeeRows, legacyRows, bookingRows] = await Promise.all([
        supabaseRestRequest<AttendeeRow[]>(
          `/school_event_attendees?select=user_id&event_id=eq.${encodeURIComponent(eventId)}`,
          { method: 'GET', accessToken },
        ).catch(() => []),
        supabaseRestRequest<LegacyEventAttendeeRow[]>(
          `/event_attendees?select=user_id&event_id=eq.${encodeURIComponent(eventId)}`,
          { method: 'GET', accessToken },
        ).catch(() => []),
        supabaseRestRequest<BookingRow[]>(
          `/bookings?select=user_id,event_id,booked_at&booking_type=eq.event&event_id=eq.${encodeURIComponent(eventId)}&status=neq.cancelled`,
          { method: 'GET', accessToken },
        ).catch(() => []),
      ]);
      const profileIds = [
        ...new Set(
          [
            ...(attendeeRows ?? []).map(getAttendeeIdentity),
            ...(legacyRows ?? []).map((row) => getOptionalId(row.user_id)),
            ...(bookingRows ?? []).map((row) => getOptionalId(row.user_id)),
          ].filter(Boolean),
        ),
      ] as string[];
      if (profileIds.length === 0) return [];
      const inUsers = profileIds.map((id) => encodeURIComponent(id)).join(',');
      const profiles = await supabaseRestRequest<ProfileRow[]>(
        `/profiles?select=id,display_name,username,avatar_url&id=in.(${inUsers})`,
        { method: 'GET', accessToken },
      );
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
      return profileIds.map((id, idx) => {
        const p = byId.get(id);
        const name = (p?.display_name ?? '').trim() || (p?.username ?? '').trim() || `Dansçı ${idx + 1}`;
        return { id, name, avatar: p?.avatar_url ?? '' };
      });
    });
  },

  async isJoined(eventId: string): Promise<boolean> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      const [rows, legacyRows, bookingRows] = await Promise.all([
        supabaseRestRequest<AttendeeRow[]>(
          `/school_event_attendees?select=user_id&event_id=eq.${encodeURIComponent(eventId)}&user_id=eq.${encodeURIComponent(me)}&limit=1`,
          { method: 'GET', accessToken },
        ).catch(() => []),
        supabaseRestRequest<LegacyEventAttendeeRow[]>(
          `/event_attendees?select=user_id&event_id=eq.${encodeURIComponent(eventId)}&user_id=eq.${encodeURIComponent(me)}&limit=1`,
          { method: 'GET', accessToken },
        ).catch(() => []),
        supabaseRestRequest<BookingRow[]>(
          `/bookings?select=user_id&booking_type=eq.event&event_id=eq.${encodeURIComponent(eventId)}&user_id=eq.${encodeURIComponent(me)}&status=neq.cancelled&limit=1`,
          { method: 'GET', accessToken },
        ).catch(() => []),
      ]);
      return (rows ?? []).length > 0 || (legacyRows ?? []).length > 0 || (bookingRows ?? []).length > 0;
    });
  },

  async join(eventId: string): Promise<void> {
    await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      const existing = await supabaseRestRequest<AttendeeRow[]>(
        `/school_event_attendees?select=user_id&event_id=eq.${encodeURIComponent(eventId)}&user_id=eq.${encodeURIComponent(me)}&limit=1`,
        { method: 'GET', accessToken },
      );
      if ((existing ?? []).length > 0) return;
      await supabaseRestRequest('/school_event_attendees', {
        method: 'POST',
        accessToken,
        headers: { Prefer: 'return=minimal' },
        body: { event_id: eventId, user_id: me },
      });
    });
  },

  /** Oturumdaki kullanıcının bu etkinlik id’lerinden hangilerine katıldığı (rezervasyon). */
  async listJoinedEventIds(eventIds: string[]): Promise<string[]> {
    const unique = [...new Set(eventIds.filter(Boolean))];
    if (unique.length === 0) return [];
    return await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      const inClause = unique.map((id) => encodeURIComponent(id)).join(',');
      const [rows, legacyRows, bookingRows] = await Promise.all([
        supabaseRestRequest<{ event_id: string }[]>(
          `/school_event_attendees?select=event_id&event_id=in.(${inClause})&user_id=eq.${encodeURIComponent(me)}`,
          { method: 'GET', accessToken },
        ).catch(() => []),
        supabaseRestRequest<{ event_id: string }[]>(
          `/event_attendees?select=event_id&event_id=in.(${inClause})&user_id=eq.${encodeURIComponent(me)}`,
          { method: 'GET', accessToken },
        ).catch(() => []),
        supabaseRestRequest<{ event_id: string }[]>(
          `/bookings?select=event_id&booking_type=eq.event&event_id=in.(${inClause})&user_id=eq.${encodeURIComponent(me)}&status=neq.cancelled`,
          { method: 'GET', accessToken },
        ).catch(() => []),
      ]);
      return [
        ...new Set(
          [...(rows ?? []), ...(legacyRows ?? []), ...(bookingRows ?? [])]
            .map((row) => row.event_id)
            .filter(Boolean),
        ),
      ];
    });
  },

  async listMine(): Promise<SchoolEventRow[]> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      const [rows, legacyRows, bookingRows] = await Promise.all([
        supabaseRestRequest<{ event_id: string }[]>(
          `/school_event_attendees?select=event_id&user_id=eq.${encodeURIComponent(me)}`,
          { method: 'GET', accessToken },
        ).catch(() => []),
        supabaseRestRequest<{ event_id: string }[]>(
          `/event_attendees?select=event_id&user_id=eq.${encodeURIComponent(me)}`,
          { method: 'GET', accessToken },
        ).catch(() => []),
        supabaseRestRequest<{ event_id: string }[]>(
          `/bookings?select=event_id&booking_type=eq.event&user_id=eq.${encodeURIComponent(me)}&status=neq.cancelled`,
          { method: 'GET', accessToken },
        ).catch(() => []),
      ]);
      const eventIds = [
        ...new Set(
          [...(rows ?? []), ...(legacyRows ?? []), ...(bookingRows ?? [])]
            .map((row) => row.event_id)
            .filter(Boolean),
        ),
      ];
      if (eventIds.length === 0) return [];
      const inClause = eventIds.map((id) => encodeURIComponent(id)).join(',');
      return await supabaseRestRequest<SchoolEventRow[]>(
        `/school_events?select=id,school_id,title,starts_at,city,location,image_url,description,event_type&id=in.(${inClause})&order=starts_at.asc`,
        { method: 'GET', accessToken },
      );
    });
  },

  async getLatestJoinedEvent(): Promise<LatestJoinedEvent | null> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      const [rows, legacyRows, bookingRows] = await Promise.all([
        supabaseRestRequest<JoinedEventRow[]>(
          `/school_event_attendees?select=event_id,created_at&user_id=eq.${encodeURIComponent(me)}&order=created_at.desc&limit=10`,
          { method: 'GET', accessToken },
        ).catch(() => []),
        supabaseRestRequest<JoinedEventRow[]>(
          `/event_attendees?select=event_id,created_at&user_id=eq.${encodeURIComponent(me)}&order=created_at.desc&limit=10`,
          { method: 'GET', accessToken },
        ).catch(() => []),
        supabaseRestRequest<BookingRow[]>(
          `/bookings?select=event_id,booked_at&booking_type=eq.event&user_id=eq.${encodeURIComponent(me)}&status=neq.cancelled&order=booked_at.desc&limit=10`,
          { method: 'GET', accessToken },
        ).catch(() => []),
      ]);
      const latestCandidates = [
        ...(rows ?? []).map((row) => ({ event_id: row.event_id, created_at: row.created_at })),
        ...(legacyRows ?? []).map((row) => ({ event_id: row.event_id, created_at: row.created_at })),
        ...(bookingRows ?? [])
          .map((row) => ({
            event_id: row.event_id ?? '',
            created_at: row.booked_at ?? '',
          }))
          .filter((row) => row.event_id && row.created_at),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const candidateIds = [...new Set(latestCandidates.map((row) => row.event_id).filter(Boolean))];
      if (candidateIds.length === 0) return null;

      const events = await supabaseRestRequest<SchoolEventRow[]>(
        `/school_events?select=id,school_id,title,starts_at,city,location,image_url,description,event_type&id=in.(${candidateIds.map((id) => encodeURIComponent(id)).join(',')})`,
        { method: 'GET', accessToken },
      );
      const eventsById = new Map((events ?? []).map((event) => [event.id, event]));

      const latestEvent = latestCandidates.find((row) => {
        const event = eventsById.get(row.event_id);
        return !!event && (event.event_type ?? '').trim().toLowerCase() !== 'lesson';
      });
      if (!latestEvent) return null;

      const event = eventsById.get(latestEvent.event_id) ?? null;
      if (!event) return null;

      return {
        event,
        joinedAt: latestEvent.created_at,
      };
    });
  },

  async leave(eventId: string): Promise<void> {
    await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      await supabaseRestRequest(
        `/school_event_attendees?event_id=eq.${encodeURIComponent(eventId)}&user_id=eq.${encodeURIComponent(me)}`,
        { method: 'DELETE', accessToken, headers: { Prefer: 'return=minimal' } },
      );
    });
  },
};
