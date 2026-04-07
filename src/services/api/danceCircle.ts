import { ApiError, supabaseAuthRequest, supabaseRestRequest } from './apiClient';
import { buildSubcategoryLabelMaps, fetchDanceCatalog, resolveFavoriteDanceLabels } from './danceCatalog';
import { storage } from '../storage';

type SupabaseUserResponse = { id: string };
type SupabaseSessionResponse = { access_token: string; refresh_token: string };

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  favorite_dances: string[] | null;
  other_interests: string | null;
};

type VoteRow = { target_id: string; vote: 'like' | 'skip'; updated_at: string };
type LikeVoteRow = { target_id: string; updated_at: string };
type LatestAttendanceRow = { event_id: string; created_at: string };
type EventAttendeeRow = { user_id?: string | null };
type LegacyEventAttendeeRow = { user_id?: string | null; created_at?: string | null; event_id?: string | null };
type BookingRow = { user_id?: string | null; booked_at?: string | null; event_id?: string | null };
type SchoolEventSummaryRow = {
  id: string;
  title: string | null;
  starts_at: string | null;
};

export type DanceCircleVote = 'like' | 'skip';

export type DanceCircleCandidate = {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  danceStyles: string[];
  city: string;
  level: 'Başlangıç' | 'Orta' | 'İleri';
};

export type DanceCircleEventWindow = {
  eventId: string;
  eventTitle: string;
  joinedAt: string;
  voteDeadlineAt: string;
  voteWindowOpen: boolean;
};

export type DanceCircleListReason =
  | 'missing-event'
  | 'expired-window'
  | 'no-other-attendees'
  | null;

export type DanceCircleListResult = {
  candidates: DanceCircleCandidate[];
  eventWindow: DanceCircleEventWindow | null;
  reason: DanceCircleListReason;
};

/** Dance Circle’da «dans ettim» (like) işaretlenen kullanıcılar; en yeni üstte. */
export type DancedWithPerson = {
  id: string;
  name: string;
  username: string;
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

function inferLevelFromStyles(styles: string[]): 'Başlangıç' | 'Orta' | 'İleri' {
  if (styles.length >= 3) return 'İleri';
  if (styles.length >= 2) return 'Orta';
  return 'Başlangıç';
}

function shuffleArray<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function isTimestampWithinRange(value: string, start: string, end: string): boolean {
  const valueTime = new Date(value).getTime();
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  if (Number.isNaN(valueTime) || Number.isNaN(startTime) || Number.isNaN(endTime)) return false;
  return valueTime >= startTime && valueTime <= endTime;
}

function getOptionalId(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function getAttendeeIdentity(row: EventAttendeeRow): string | null {
  return getOptionalId(row.user_id);
}

export const danceCircleService = {
  async listCandidates(limit = 80): Promise<DanceCircleListResult> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);

      const [latestAttendanceRows, legacyAttendanceRows, bookingRows] = await Promise.all([
        supabaseRestRequest<LatestAttendanceRow[]>(
          `/school_event_attendees?select=event_id,created_at&user_id=eq.${encodeURIComponent(me)}&order=created_at.desc&limit=10`,
          { accessToken },
        ).catch(() => []),
        supabaseRestRequest<LegacyEventAttendeeRow[]>(
          `/event_attendees?select=event_id,created_at&user_id=eq.${encodeURIComponent(me)}&order=created_at.desc&limit=10`,
          { accessToken },
        ).catch(() => []),
        supabaseRestRequest<BookingRow[]>(
          `/bookings?select=event_id,booked_at&booking_type=eq.event&user_id=eq.${encodeURIComponent(me)}&status=neq.cancelled&order=booked_at.desc&limit=10`,
          { accessToken },
        ).catch(() => []),
      ]);
      const latestAttendance = [
        ...(latestAttendanceRows ?? []).map((row) => ({ event_id: row.event_id, created_at: row.created_at })),
        ...(legacyAttendanceRows ?? [])
          .map((row) => ({ event_id: row.event_id ?? '', created_at: row.created_at ?? '' }))
          .filter((row) => row.event_id && row.created_at),
        ...(bookingRows ?? [])
          .map((row) => ({ event_id: row.event_id ?? '', created_at: row.booked_at ?? '' }))
          .filter((row) => row.event_id && row.created_at),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] ?? null;

      if (!latestAttendance?.event_id || !latestAttendance.created_at) {
        return {
          candidates: [],
          eventWindow: null,
          reason: 'missing-event',
        };
      }

      const joinedAt = latestAttendance.created_at;
      const voteDeadlineAt = new Date(new Date(joinedAt).getTime() + 24 * 60 * 60 * 1000).toISOString();
      const voteWindowOpen = Date.now() <= new Date(voteDeadlineAt).getTime();
      const eventRows = await supabaseRestRequest<SchoolEventSummaryRow[]>(
        `/school_events?select=id,title,starts_at&id=eq.${encodeURIComponent(latestAttendance.event_id)}&limit=1`,
        { accessToken },
      );
      const latestEvent = eventRows?.[0] ?? null;
      const eventWindow: DanceCircleEventWindow = {
        eventId: latestAttendance.event_id,
        eventTitle: latestEvent?.title?.trim() || 'Son katıldığın etkinlik',
        joinedAt,
        voteDeadlineAt,
        voteWindowOpen,
      };

      if (!voteWindowOpen) {
        return {
          candidates: [],
          eventWindow,
          reason: 'expired-window',
        };
      }

      const [attendeeRows, legacyRows, eventBookingRows] = await Promise.all([
        supabaseRestRequest<EventAttendeeRow[]>(
          `/school_event_attendees?select=user_id&event_id=eq.${encodeURIComponent(latestAttendance.event_id)}`,
          { accessToken },
        ).catch(() => []),
        supabaseRestRequest<LegacyEventAttendeeRow[]>(
          `/event_attendees?select=user_id&event_id=eq.${encodeURIComponent(latestAttendance.event_id)}`,
          { accessToken },
        ).catch(() => []),
        supabaseRestRequest<BookingRow[]>(
          `/bookings?select=user_id&booking_type=eq.event&event_id=eq.${encodeURIComponent(latestAttendance.event_id)}&status=neq.cancelled`,
          { accessToken },
        ).catch(() => []),
      ]);
      const targetIds = [
        ...new Set(
          [
            ...(attendeeRows ?? []).map(getAttendeeIdentity),
            ...(legacyRows ?? []).map((row) => getOptionalId(row.user_id)),
            ...(eventBookingRows ?? []).map((row) => getOptionalId(row.user_id)),
          ].filter((id): id is string => Boolean(id) && id !== me),
        ),
      ];

      if (targetIds.length === 0) {
        return {
          candidates: [],
          eventWindow,
          reason: 'no-other-attendees',
        };
      }

      const votes = await supabaseRestRequest<VoteRow[]>(
        `/dance_circle_votes?voter_id=eq.${encodeURIComponent(me)}&select=target_id,vote,updated_at`,
        { accessToken },
      );
      const votedIds = new Set(
        (votes ?? [])
          .filter((vote) => isTimestampWithinRange(vote.updated_at, joinedAt, voteDeadlineAt))
          .map((vote) => vote.target_id),
      );

      const [profiles, catalog] = await Promise.all([
        supabaseRestRequest<ProfileRow[]>(
          `/profiles?select=id,display_name,username,avatar_url,bio,favorite_dances,other_interests&id=in.(${targetIds
            .slice(0, limit)
            .map((id) => encodeURIComponent(id))
            .join(',')})`,
          { accessToken },
        ),
        fetchDanceCatalog().catch(() => []),
      ]);

      const { compactBySubId } = buildSubcategoryLabelMaps(Array.isArray(catalog) ? catalog : []);
      const byId = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

      const candidates = targetIds
        .slice(0, limit)
        .filter((id) => !votedIds.has(id))
        .map((id) => {
          const p = byId.get(id);
          if (!p) return null;
          const rawStyles = Array.isArray(p.favorite_dances)
            ? p.favorite_dances.filter((v) => typeof v === 'string' && v.trim() !== '').map((v) => v.trim())
            : [];
          const danceStyles = resolveFavoriteDanceLabels(rawStyles, compactBySubId);
          const username = (p.username ?? '').trim();
          const displayName = (p.display_name ?? '').trim() || username || 'Kullanıcı';
          const bio = (p.bio ?? '').trim() || (p.other_interests ?? '').trim() || 'Dans içeriklerini keşfetmeyi seviyorum.';
          return {
            id: p.id,
            name: displayName,
            username,
            avatar: p.avatar_url ?? '',
            bio,
            danceStyles,
            city: 'Türkiye',
            level: inferLevelFromStyles(danceStyles),
          };
        })
        .filter((candidate): candidate is DanceCircleCandidate => candidate != null);

      return {
        candidates: shuffleArray(candidates),
        eventWindow,
        reason: null,
      };
    });
  },

  async listMyDancedWith(): Promise<DancedWithPerson[]> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      const votes = await supabaseRestRequest<LikeVoteRow[]>(
        `/dance_circle_votes?voter_id=eq.${encodeURIComponent(me)}&vote=eq.like&select=target_id,updated_at&order=updated_at.desc`,
        { accessToken },
      );
      const ordered = votes ?? [];
      if (ordered.length === 0) return [];

      const ids = [...new Set(ordered.map((v) => v.target_id))];
      const idIn = ids.map((id) => encodeURIComponent(id)).join(',');
      const profiles = await supabaseRestRequest<ProfileRow[]>(
        `/profiles?id=in.(${idIn})&select=id,display_name,username,avatar_url,bio,other_interests`,
        { accessToken },
      );
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

      const out: DancedWithPerson[] = [];
      for (const v of ordered) {
        const p = byId.get(v.target_id);
        if (!p) continue;
        const username = (p.username ?? '').trim();
        const displayName = (p.display_name ?? '').trim() || username || 'Kullanıcı';
        out.push({
          id: p.id,
          name: displayName,
          username,
          avatar: p.avatar_url ?? '',
        });
      }
      return out;
    });
  },

  async submitVote(targetId: string, vote: DanceCircleVote): Promise<void> {
    await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      await supabaseRestRequest(
        '/dance_circle_votes',
        {
          method: 'POST',
          accessToken,
          headers: {
            Prefer: 'resolution=merge-duplicates,return=minimal',
          },
          body: {
            voter_id: me,
            target_id: targetId,
            vote,
          },
        },
      );
    });
  },

  /**
   * Mevcut kullanıcının tüm Dance Circle oylarını siler.
   * Not: RLS'te DELETE politikası yoksa Postgres hata fırlatmaz; DELETE 0 satır etkiler.
   * Bu yüzden önce SELECT ile oy varlığı kontrol edilir, sonra silme sonucu karşılaştırılır.
   */
  async resetMyVotes(): Promise<{ deleted: number; hadVotesBefore: boolean }> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      const existing = await supabaseRestRequest<VoteRow[]>(
        `/dance_circle_votes?voter_id=eq.${encodeURIComponent(me)}&select=target_id,vote,updated_at`,
        { accessToken },
      );
      const hadVotesBefore = Array.isArray(existing) && existing.length > 0;
      if (!hadVotesBefore) {
        return { deleted: 0, hadVotesBefore: false };
      }

      const deleted = await supabaseRestRequest<VoteRow[] | null>(
        `/dance_circle_votes?voter_id=eq.${encodeURIComponent(me)}`,
        {
          method: 'DELETE',
          accessToken,
          headers: { Prefer: 'return=representation' },
        },
      );
      const deletedCount = Array.isArray(deleted) ? deleted.length : 0;
      if (hadVotesBefore && deletedCount === 0) {
        throw new Error(
          'Oylar veritabanında görünüyor ama silinemedi. Supabase’de `dance_circle_votes` tablosuna DELETE RLS politikası ekleyin (migration: 20260403_dance_circle_votes_delete_policy.sql) ve uzak projede migration’ı uygulayın.',
        );
      }
      return { deleted: deletedCount, hadVotesBefore: true };
    });
  },
};
