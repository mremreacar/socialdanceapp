import { ApiError, supabaseAuthRequest, supabaseRestRequest } from './apiClient';
import { storage } from '../storage';

type SupabaseUserResponse = { id: string };
type SupabaseSessionResponse = { access_token: string; refresh_token: string };

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

export const danceStarService = {
  async submitVote(eventId: string, targetId: string): Promise<void> {
    await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      await supabaseRestRequest('/dance_star_votes', {
        method: 'POST',
        accessToken,
        headers: {
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: {
          voter_id: me,
          event_id: eventId,
          target_id: targetId,
        },
      });
    });
  },
};
