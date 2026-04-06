import { ApiError, supabaseAuthRequest, supabaseRestRequest } from './apiClient';
import { storage } from '../storage';

type SupabaseUserResponse = { id: string };
type SupabaseSessionResponse = { access_token: string; refresh_token: string };
type AttendeeRow = { user_id: string };
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

export const schoolEventAttendeesService = {
  async list(eventId: string): Promise<EventAttendee[]> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const attendeeRows = await supabaseRestRequest<AttendeeRow[]>(
        `/school_event_attendees?select=user_id&event_id=eq.${encodeURIComponent(eventId)}`,
        { method: 'GET', accessToken },
      );
      const userIds = [...new Set((attendeeRows ?? []).map((r) => r.user_id).filter(Boolean))];
      if (userIds.length === 0) return [];
      const inUsers = userIds.map((id) => encodeURIComponent(id)).join(',');
      const profiles = await supabaseRestRequest<ProfileRow[]>(
        `/profiles?select=id,display_name,username,avatar_url&id=in.(${inUsers})`,
        { method: 'GET', accessToken },
      );
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
      return userIds.map((id, idx) => {
        const p = byId.get(id);
        const name = (p?.display_name ?? '').trim() || (p?.username ?? '').trim() || `Dansçı ${idx + 1}`;
        return { id, name, avatar: p?.avatar_url ?? '' };
      });
    });
  },

  async isJoined(eventId: string): Promise<boolean> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      const rows = await supabaseRestRequest<AttendeeRow[]>(
        `/school_event_attendees?select=user_id&event_id=eq.${encodeURIComponent(eventId)}&user_id=eq.${encodeURIComponent(me)}&limit=1`,
        { method: 'GET', accessToken },
      );
      return (rows ?? []).length > 0;
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
      const rows = await supabaseRestRequest<{ event_id: string }[]>(
        `/school_event_attendees?select=event_id&user_id=eq.${encodeURIComponent(me)}&event_id=in.(${inClause})`,
        { method: 'GET', accessToken },
      );
      return [...new Set((rows ?? []).map((r) => r.event_id).filter(Boolean))];
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
