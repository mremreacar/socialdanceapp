import { ApiError, supabaseAuthRequest, supabaseRestRequest } from './apiClient';
import { storage } from '../storage';

export type AssignedSchoolItem = {
  schoolId: string;
  name: string;
  city: string | null;
  district: string | null;
  address: string | null;
  imageUrl: string | null;
  telephone: string | null;
  assignedAt: string;
  isInstructor: boolean;
  isOwner: boolean;
};

type SupabaseUserResponse = { id: string };
type SupabaseSessionResponse = { access_token: string; refresh_token: string };

type AssignmentRow = {
  school_id: string;
  created_at: string;
};

type SchoolRow = {
  id: string;
  name: string;
  city: string | null;
  district: string | null;
  address: string | null;
  image_url: string | null;
  telephone: string | null;
};

type LinkedSchoolRow = {
  school_id: string;
};

type AssignmentLikeRow = {
  school_id: string;
  created_at?: string | null;
  source: 'instructor' | 'owner' | 'legacy';
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

async function listAssignmentRows(accessToken: string, userId: string): Promise<AssignmentLikeRow[]> {
  const [instructorRows, ownerRows, legacyRows] = await Promise.all([
    supabaseRestRequest<LinkedSchoolRow[]>(
      `/school_instructors?select=school_id&user_id=eq.${encodeURIComponent(userId)}`,
      { method: 'GET', accessToken },
    ).catch(() => []),
    supabaseRestRequest<LinkedSchoolRow[]>(
      `/school_owners?select=school_id&user_id=eq.${encodeURIComponent(userId)}`,
      { method: 'GET', accessToken },
    ).catch(() => []),
    supabaseRestRequest<AssignmentRow[]>(
      `/school_instructor_assignments?select=school_id,created_at&user_id=eq.${encodeURIComponent(userId)}&order=created_at.asc`,
      { method: 'GET', accessToken },
    ).catch(() => []),
  ]);

  return [
    ...(instructorRows ?? []).map((row) => ({ school_id: row.school_id, created_at: null, source: 'instructor' as const })),
    ...(ownerRows ?? []).map((row) => ({ school_id: row.school_id, created_at: null, source: 'owner' as const })),
    ...(legacyRows ?? []).map((row) => ({ school_id: row.school_id, created_at: row.created_at, source: 'legacy' as const })),
  ].filter((row) => typeof row.school_id === 'string' && row.school_id.trim() !== '');
}

export async function listAssignedSchoolIdsForUser(accessToken: string, userId: string): Promise<string[]> {
  const rows = await listAssignmentRows(accessToken, userId);
  return [...new Set(rows.map((row) => row.school_id).filter(Boolean))];
}

export async function listMyAssignedSchoolIds(): Promise<string[]> {
  return await withAuthorizedUserRequest(async (accessToken) => {
    const me = await getMyUserId(accessToken);
    return await listAssignedSchoolIdsForUser(accessToken, me);
  });
}

export const instructorSchoolAssignmentsService = {
  /** Kullanıcının eğitmen/yönetici olarak bağlı olduğu okullar (yoksa []). */
  async listMine(): Promise<AssignedSchoolItem[]> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      const list = await listAssignmentRows(accessToken, me);
      if (list.length === 0) return [];

      const ids = [...new Set(list.map((r) => r.school_id).filter(Boolean))];
      const inClause = ids.map((id) => encodeURIComponent(id)).join(',');
      const schoolRows = await supabaseRestRequest<SchoolRow[]>(
        `/schools?select=id,name,city,district,address,image_url,telephone&id=in.(${inClause})`,
        { method: 'GET', accessToken },
      );
      const byId = new Map((schoolRows ?? []).map((s) => [s.id, s]));
      const assignedAtBySchoolId = new Map<string, string>();
      const roleFlagsBySchoolId = new Map<string, { isInstructor: boolean; isOwner: boolean }>();
      list.forEach((row) => {
        if (assignedAtBySchoolId.has(row.school_id)) return;
        assignedAtBySchoolId.set(row.school_id, row.created_at?.trim() || '');
      });
      list.forEach((row) => {
        const current = roleFlagsBySchoolId.get(row.school_id) ?? { isInstructor: false, isOwner: false };
        if (row.source === 'owner') current.isOwner = true;
        if (row.source === 'instructor' || row.source === 'legacy' || row.source === 'owner') current.isInstructor = true;
        roleFlagsBySchoolId.set(row.school_id, current);
      });

      return ids.map((schoolId) => {
        const s = byId.get(schoolId);
        const flags = roleFlagsBySchoolId.get(schoolId) ?? { isInstructor: false, isOwner: false };
        return {
          schoolId,
          name: (s?.name ?? 'Okul').trim() || 'Okul',
          city: s?.city ?? null,
          district: s?.district ?? null,
          address: s?.address ?? null,
          imageUrl: s?.image_url ?? null,
          telephone: s?.telephone ?? null,
          assignedAt: assignedAtBySchoolId.get(schoolId) ?? '',
          isInstructor: flags.isInstructor,
          isOwner: flags.isOwner,
        };
      });
    });
  },
};
