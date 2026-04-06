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

type VoteRow = { target_id: string; vote: 'like' | 'skip' };
type LikeVoteRow = { target_id: string; created_at: string };

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

export const danceCircleService = {
  async listCandidates(limit = 80): Promise<DanceCircleCandidate[]> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      const votes = await supabaseRestRequest<VoteRow[]>(
        `/dance_circle_votes?voter_id=eq.${encodeURIComponent(me)}&select=target_id,vote`,
        { accessToken },
      );
      const votedIds = new Set((votes ?? []).map((v) => v.target_id));

      const [profiles, catalog] = await Promise.all([
        supabaseRestRequest<ProfileRow[]>(
          `/profiles?select=id,display_name,username,avatar_url,bio,favorite_dances,other_interests&id=neq.${encodeURIComponent(me)}&limit=${limit}`,
          { accessToken },
        ),
        fetchDanceCatalog().catch(() => []),
      ]);

      const { compactBySubId } = buildSubcategoryLabelMaps(Array.isArray(catalog) ? catalog : []);

      const candidates = (profiles ?? [])
        .filter((p) => !votedIds.has(p.id))
        .map((p) => {
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
        });

      return shuffleArray(candidates);
    });
  },

  async listMyDancedWith(): Promise<DancedWithPerson[]> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      const votes = await supabaseRestRequest<LikeVoteRow[]>(
        `/dance_circle_votes?voter_id=eq.${encodeURIComponent(me)}&vote=eq.like&select=target_id,created_at&order=created_at.desc`,
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
        `/dance_circle_votes?voter_id=eq.${encodeURIComponent(me)}&select=target_id,vote`,
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

