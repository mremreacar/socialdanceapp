import { ApiError, supabaseAuthRequest, supabaseRestRequest } from './apiClient';
import { storage } from '../storage';

type SupabaseUserResponse = { id: string };
type SupabaseSessionResponse = { access_token: string; refresh_token: string };

type BlockRow = {
  blocker_profile_id: string;
  blocked_profile_id: string;
  created_at: string;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

export type BlockedUserListItem = {
  id: string;
  name: string;
  username: string;
  avatar: string;
  blockedAt: string;
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

export const blocksService = {
  async isUserBlockedByMe(blockedProfileId: string): Promise<boolean> {
    const target = blockedProfileId.trim();
    if (!target) return false;

    return withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      const rows = await supabaseRestRequest<BlockRow[]>(
        `/profile_blocks?blocker_profile_id=eq.${encodeURIComponent(me)}&blocked_profile_id=eq.${encodeURIComponent(target)}&select=blocked_profile_id&limit=1`,
        { accessToken },
      );
      return Array.isArray(rows) && rows.length > 0;
    });
  },

  async blockUser(blockedProfileId: string): Promise<void> {
    const target = blockedProfileId.trim();
    if (!target) throw new Error('Engellenecek kullanıcı bulunamadı.');

    await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      if (me === target) throw new Error('Kendinizi engelleyemezsiniz.');

      await supabaseRestRequest('/profile_blocks', {
        method: 'POST',
        accessToken,
        headers: {
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: {
          blocker_profile_id: me,
          blocked_profile_id: target,
        },
      });
    });
  },

  async unblockUser(blockedProfileId: string): Promise<void> {
    const target = blockedProfileId.trim();
    if (!target) return;

    await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      await supabaseRestRequest(
        `/profile_blocks?blocker_profile_id=eq.${encodeURIComponent(me)}&blocked_profile_id=eq.${encodeURIComponent(target)}`,
        {
          method: 'DELETE',
          accessToken,
          headers: { Prefer: 'return=minimal' },
        },
      );
    });
  },

  async listBlockedUsers(): Promise<BlockedUserListItem[]> {
    return withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      const rows = await supabaseRestRequest<BlockRow[]>(
        `/profile_blocks?blocker_profile_id=eq.${encodeURIComponent(me)}&select=blocked_profile_id,blocker_profile_id,created_at&order=created_at.desc`,
        { accessToken },
      );

      const blocked = Array.isArray(rows) ? rows : [];
      if (blocked.length === 0) return [];

      const uniqueIds = [...new Set(blocked.map((r) => r.blocked_profile_id).filter(Boolean))];
      const inClause = uniqueIds.map((id) => encodeURIComponent(id)).join(',');
      const profiles = await supabaseRestRequest<ProfileRow[]>(
        `/profiles?id=in.(${inClause})&select=id,display_name,username,avatar_url`,
        { accessToken },
      );
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

      return blocked.map((r) => {
        const profile = byId.get(r.blocked_profile_id);
        const username = (profile?.username ?? '').trim();
        return {
          id: r.blocked_profile_id,
          name: (profile?.display_name ?? '').trim() || username || 'Kullanıcı',
          username: username ? `@${username}` : '',
          avatar: profile?.avatar_url ?? '',
          blockedAt: r.created_at,
        };
      });
    });
  },
};
