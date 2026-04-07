import { ApiError, hasSupabaseConfig, supabaseAuthRequest, supabaseRestRequest } from './apiClient';
import { buildSubcategoryLabelMaps, fetchDanceCatalog } from './danceCatalog';
import { storage } from '../storage';

export type InstructorWorkMode = 'individual' | 'school' | 'both';

export type InstructorProfileModel = {
  userId: string;
  workMode: InstructorWorkMode;
  headline: string;
  instructorBio: string;
  specialtyIds: string[];
  specialties: string[];
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
};

export type InstructorProfileUpsert = {
  workMode: InstructorWorkMode;
  headline: string;
  instructorBio: string;
  specialtyIds: string[];
  isVisible: boolean;
};

type SupabaseUserResponse = { id: string };
type SupabaseSessionResponse = { access_token: string; refresh_token: string };

type InstructorProfileRow = {
  user_id: string;
  work_mode: string;
  headline: string;
  instructor_bio: string;
  instructor_teaching_dance_types?: InstructorDanceTypeLinkRow[] | null;
  specialties: string[] | null;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
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

function normalizeStoredWorkMode(value: string): InstructorWorkMode {
  const trimmed = value.trim();
  if (trimmed === 'individual' || trimmed === 'Bireysel') return 'individual';
  if (trimmed === 'school' || trimmed === 'Okul / kurum') return 'school';
  if (trimmed === 'both' || trimmed === 'Her ikisi') return 'both';
  return 'individual';
}

function toStoredWorkMode(value: InstructorWorkMode): string {
  if (value === 'school') return 'Okul / kurum';
  if (value === 'both') return 'Her ikisi';
  return 'Bireysel';
}

function toLegacyWorkMode(value: InstructorWorkMode): InstructorWorkMode {
  if (value === 'school') return 'school';
  if (value === 'both') return 'both';
  return 'individual';
}

function isWorkModeConstraintError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return message.includes('work mode') || message.includes('work_mode') || message.includes('check constraint');
}

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase('tr-TR');
}

type InstructorProfileExploreRow = {
  user_id: string;
  headline: string;
  instructor_bio: string;
  instructor_teaching_dance_types?: InstructorDanceTypeLinkRow[] | null;
  specialties: string[] | null;
};

type DanceTypeJoinRow = {
  id: string;
  name: string | null;
  parent_id?: string | null;
};

type InstructorDanceTypeLinkRow = {
  dance_type_id: string | null;
  dance_types?: DanceTypeJoinRow | null;
};

type ProfileCardRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
};

/** Keşfet / eğitmen listesi (giriş yoksa veya hata olursa []). */
export type ExploreInstructorListItem = {
  userId: string;
  headline: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  profileBio: string;
  instructorBio: string;
  specialties: string[];
};

export type InstructorCardRow = {
  key: string;
  title: string;
  subtitle: string;
  avatarUrl: string | null;
  userId: string;
  navigateName: string;
  navigateUsername: string;
  navigateBio?: string;
};

export function cardRowsFromExploreInstructors(items: ExploreInstructorListItem[]): InstructorCardRow[] {
  return items.map((i) => ({
    key: i.userId,
    title: i.headline || i.displayName,
    subtitle: i.username
      ? `@${i.username}`
      : i.specialties.length > 0
        ? i.specialties.slice(0, 3).join(' · ')
        : 'Eğitmen',
    avatarUrl: i.avatarUrl,
    userId: i.userId,
    navigateName: i.displayName,
    navigateUsername: i.username,
    navigateBio: i.instructorBio || i.profileBio,
  }));
}

async function resolveStoredSpecialties(values: string[]): Promise<{ specialtyIds: string[]; specialties: string[] }> {
  const rawValues = values.map((value) => value.trim()).filter(Boolean);
  if (rawValues.length === 0) {
    return { specialtyIds: [], specialties: [] };
  }

  try {
    const catalog = await fetchDanceCatalog();
    const { compactBySubId, fullBySubId } = buildSubcategoryLabelMaps(catalog);
    const idByLabel = new Map<string, string>();

    for (const [id, label] of compactBySubId.entries()) {
      idByLabel.set(normalizeText(label), id);
    }
    for (const [id, label] of fullBySubId.entries()) {
      idByLabel.set(normalizeText(label), id);
    }

    const specialtyIds: string[] = [];
    const specialties: string[] = [];

    for (const value of rawValues) {
      const directLabel = compactBySubId.get(value);
      if (directLabel) {
        if (!specialtyIds.includes(value)) specialtyIds.push(value);
        if (!specialties.includes(directLabel)) specialties.push(directLabel);
        continue;
      }

      const matchedId = idByLabel.get(normalizeText(value));
      if (matchedId) {
        const resolvedLabel = compactBySubId.get(matchedId) ?? value;
        if (!specialtyIds.includes(matchedId)) specialtyIds.push(matchedId);
        if (!specialties.includes(resolvedLabel)) specialties.push(resolvedLabel);
        continue;
      }

      if (!specialties.includes(value)) specialties.push(value);
    }

    return { specialtyIds, specialties };
  } catch {
    return { specialtyIds: [], specialties: rawValues };
  }
}

function uniqueTrimmed(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => (typeof value === 'string' ? value.trim() : '')).filter(Boolean))];
}

async function resolveProfileSpecialties(input: {
  danceTypeIds?: Array<string | null | undefined>;
  fallbackNames?: Array<string | null | undefined>;
  fallbackValues?: string[];
}): Promise<{ specialtyIds: string[]; specialties: string[] }> {
  const specialtyIds = uniqueTrimmed(input.danceTypeIds ?? []);
  const fallbackNames = uniqueTrimmed(input.fallbackNames ?? []);

  if (specialtyIds.length === 0) {
    return await resolveStoredSpecialties(input.fallbackValues ?? fallbackNames);
  }

  try {
    const catalog = await fetchDanceCatalog();
    const { compactBySubId } = buildSubcategoryLabelMaps(catalog);
    const specialtyLabels: string[] = [];

    for (const id of specialtyIds) {
      const label = compactBySubId.get(id) ?? fallbackNames.find((name) => normalizeText(name) === normalizeText(id));
      if (label && !specialtyLabels.includes(label)) {
        specialtyLabels.push(label);
      }
    }

    for (const name of fallbackNames) {
      if (!specialtyLabels.includes(name)) {
        specialtyLabels.push(name);
      }
    }

    return {
      specialtyIds,
      specialties: specialtyLabels.length > 0 ? specialtyLabels : specialtyIds,
    };
  } catch {
    return {
      specialtyIds,
      specialties: fallbackNames.length > 0 ? fallbackNames : specialtyIds,
    };
  }
}

function selectInstructorProfileFields(includeDanceTypes: boolean): string {
  const base = 'user_id,work_mode,headline,instructor_bio,specialties,is_visible,created_at,updated_at';
  if (!includeDanceTypes) return base;
  return `${base},instructor_teaching_dance_types(dance_type_id,dance_types(id,name,parent_id))`;
}

function selectExploreInstructorFields(includeDanceTypes: boolean): string {
  const base = 'user_id,headline,instructor_bio,specialties';
  if (!includeDanceTypes) return base;
  return `${base},instructor_teaching_dance_types(dance_type_id,dance_types(id,name,parent_id))`;
}

function canFallbackToLegacySpecialties(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 400 || error.status === 404);
}

async function fetchInstructorProfiles(
  pathWithDanceTypes: string,
  legacyPath: string,
  accessToken: string,
): Promise<InstructorProfileRow[]> {
  try {
    return await supabaseRestRequest<InstructorProfileRow[]>(pathWithDanceTypes, {
      method: 'GET',
      accessToken,
    });
  } catch (error) {
    if (!canFallbackToLegacySpecialties(error)) throw error;
    return await supabaseRestRequest<InstructorProfileRow[]>(legacyPath, {
      method: 'GET',
      accessToken,
    });
  }
}

async function fetchExploreProfiles(
  pathWithDanceTypes: string,
  legacyPath: string,
  accessToken: string,
): Promise<InstructorProfileExploreRow[]> {
  try {
    return await supabaseRestRequest<InstructorProfileExploreRow[]>(pathWithDanceTypes, {
      method: 'GET',
      accessToken,
    });
  } catch (error) {
    if (!canFallbackToLegacySpecialties(error)) throw error;
    return await supabaseRestRequest<InstructorProfileExploreRow[]>(legacyPath, {
      method: 'GET',
      accessToken,
    });
  }
}

async function replaceInstructorTeachingDanceTypes(
  userId: string,
  specialtyIds: string[],
  accessToken: string,
): Promise<void> {
  await supabaseRestRequest(
    `/instructor_teaching_dance_types?user_id=eq.${encodeURIComponent(userId)}`,
    {
      method: 'DELETE',
      accessToken,
      headers: { Prefer: 'return=minimal' },
    },
  );

  const uniqueIds = uniqueTrimmed(specialtyIds);
  if (uniqueIds.length === 0) return;

  await supabaseRestRequest('/instructor_teaching_dance_types', {
    method: 'POST',
    accessToken,
    headers: { Prefer: 'return=minimal' },
    body: uniqueIds.map((danceTypeId) => ({
      user_id: userId,
      dance_type_id: danceTypeId,
    })),
  });
}

async function mapRow(row: InstructorProfileRow): Promise<InstructorProfileModel> {
  const wm = row.work_mode;
  const resolved = await resolveProfileSpecialties({
    danceTypeIds: (row.instructor_teaching_dance_types ?? []).map((item) => item.dance_type_id),
    fallbackNames: (row.instructor_teaching_dance_types ?? []).map((item) => item.dance_types?.name ?? null),
    fallbackValues: Array.isArray(row.specialties) ? row.specialties : [],
  });
  return {
    userId: row.user_id,
    workMode: normalizeStoredWorkMode(wm),
    headline: row.headline ?? '',
    instructorBio: row.instructor_bio ?? '',
    specialtyIds: resolved.specialtyIds,
    specialties: resolved.specialties,
    isVisible: row.is_visible !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const instructorProfileService = {
  /** Keşfet profili / yayın sayfası: görünür eğitmen tek kullanıcı. */
  async getVisibleByUserId(userId: string): Promise<ExploreInstructorListItem | null> {
    if (!hasSupabaseConfig()) return null;
    try {
      return await withAuthorizedUserRequest(async (accessToken) => {
        const selectWithDanceTypes = selectExploreInstructorFields(true);
        const selectLegacy = selectExploreInstructorFields(false);
        const ipRows = await fetchExploreProfiles(
          `/instructor_profiles?select=${selectWithDanceTypes}&user_id=eq.${encodeURIComponent(userId)}&is_visible=eq.true&limit=1`,
          `/instructor_profiles?select=${selectLegacy}&user_id=eq.${encodeURIComponent(userId)}&is_visible=eq.true&limit=1`,
          accessToken,
        );
        const ip = ipRows?.[0];
        if (!ip) return null;

        const profileRows = await supabaseRestRequest<ProfileCardRow[]>(
          `/profiles?select=id,display_name,username,avatar_url,bio&id=eq.${encodeURIComponent(userId)}&limit=1`,
          { method: 'GET', accessToken },
        );
        const p = profileRows?.[0];
        const resolved = await resolveProfileSpecialties({
          danceTypeIds: (ip.instructor_teaching_dance_types ?? []).map((item) => item.dance_type_id),
          fallbackNames: (ip.instructor_teaching_dance_types ?? []).map((item) => item.dance_types?.name ?? null),
          fallbackValues: Array.isArray(ip.specialties) ? ip.specialties : [],
        });
        const displayName =
          (p?.display_name ?? '').trim() || (p?.username ?? '').trim() || 'Eğitmen';
        const username = (p?.username ?? '').trim();
        return {
          userId: ip.user_id,
          headline: (ip.headline ?? '').trim(),
          displayName,
          username,
          avatarUrl: p?.avatar_url?.trim() || null,
          profileBio: (p?.bio ?? '').trim(),
          instructorBio: (ip.instructor_bio ?? '').trim(),
          specialties: resolved.specialties,
        };
      });
    } catch {
      return null;
    }
  },

  async listVisibleForExplore(): Promise<ExploreInstructorListItem[]> {
    if (!hasSupabaseConfig()) return [];
    try {
      return await withAuthorizedUserRequest(async (accessToken) => {
        const selectWithDanceTypes = selectExploreInstructorFields(true);
        const selectLegacy = selectExploreInstructorFields(false);
        const ipRows = await fetchExploreProfiles(
          `/instructor_profiles?select=${selectWithDanceTypes}&is_visible=eq.true&order=created_at.desc&limit=100`,
          `/instructor_profiles?select=${selectLegacy}&is_visible=eq.true&order=created_at.desc&limit=100`,
          accessToken,
        );
        const list = ipRows ?? [];
        if (list.length === 0) return [];

        const ids = [...new Set(list.map((r) => r.user_id).filter(Boolean))];
        const inClause = ids.map((id) => encodeURIComponent(id)).join(',');
        const profileRows = await supabaseRestRequest<ProfileCardRow[]>(
          `/profiles?select=id,display_name,username,avatar_url,bio&id=in.(${inClause})`,
          { method: 'GET', accessToken },
        );
        const byId = new Map((profileRows ?? []).map((p) => [p.id, p]));
        return await Promise.all(list.map(async (ip) => {
          const p = byId.get(ip.user_id);
          const resolved = await resolveProfileSpecialties({
            danceTypeIds: (ip.instructor_teaching_dance_types ?? []).map((item) => item.dance_type_id),
            fallbackNames: (ip.instructor_teaching_dance_types ?? []).map((item) => item.dance_types?.name ?? null),
            fallbackValues: Array.isArray(ip.specialties) ? ip.specialties : [],
          });
          const displayName =
            (p?.display_name ?? '').trim() || (p?.username ?? '').trim() || 'Eğitmen';
          const username = (p?.username ?? '').trim();
          return {
            userId: ip.user_id,
            headline: (ip.headline ?? '').trim(),
            displayName,
            username,
            avatarUrl: p?.avatar_url?.trim() || null,
            profileBio: (p?.bio ?? '').trim(),
            instructorBio: (ip.instructor_bio ?? '').trim(),
            specialties: resolved.specialties,
          };
        }));
      });
    } catch {
      return [];
    }
  },

  async getMine(): Promise<InstructorProfileModel | null> {
    if (!hasSupabaseConfig()) return null;
    return await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      const selectWithDanceTypes = selectInstructorProfileFields(true);
      const selectLegacy = selectInstructorProfileFields(false);
      const rows = await fetchInstructorProfiles(
        `/instructor_profiles?select=${selectWithDanceTypes}&user_id=eq.${encodeURIComponent(me)}&limit=1`,
        `/instructor_profiles?select=${selectLegacy}&user_id=eq.${encodeURIComponent(me)}&limit=1`,
        accessToken,
      );
      const row = rows?.[0];
      return row ? await mapRow(row) : null;
    });
  },

  async upsertMine(input: InstructorProfileUpsert): Promise<InstructorProfileModel> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      const normalizedSpecialtyIds = uniqueTrimmed(input.specialtyIds);
      const baseBody = {
        user_id: me,
        headline: input.headline.trim(),
        instructor_bio: input.instructorBio.trim(),
        specialties: normalizedSpecialtyIds,
        is_visible: input.isVisible,
      };
      let rows: InstructorProfileRow[] | null = null;
      try {
        rows = await supabaseRestRequest<InstructorProfileRow[]>(
          '/instructor_profiles',
          {
            method: 'POST',
            accessToken,
            headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
            body: {
              ...baseBody,
              work_mode: toStoredWorkMode(input.workMode),
            },
          },
        );
      } catch (error) {
        if (!isWorkModeConstraintError(error)) throw error;
        rows = await supabaseRestRequest<InstructorProfileRow[]>(
          '/instructor_profiles',
          {
            method: 'POST',
            accessToken,
            headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
            body: {
              ...baseBody,
              work_mode: toLegacyWorkMode(input.workMode),
            },
          },
        );
      }
      const row = rows?.[0];
      if (!row) {
        throw new ApiError('Eğitmen profili kaydedilemedi.', { status: 500 });
      }
      try {
        await replaceInstructorTeachingDanceTypes(me, normalizedSpecialtyIds, accessToken);
      } catch (error) {
        if (!canFallbackToLegacySpecialties(error)) throw error;
      }

      const selectWithDanceTypes = selectInstructorProfileFields(true);
      const selectLegacy = selectInstructorProfileFields(false);
      const refreshedRows = await fetchInstructorProfiles(
        `/instructor_profiles?select=${selectWithDanceTypes}&user_id=eq.${encodeURIComponent(me)}&limit=1`,
        `/instructor_profiles?select=${selectLegacy}&user_id=eq.${encodeURIComponent(me)}&limit=1`,
        accessToken,
      );
      return await mapRow(refreshedRows?.[0] ?? row);
    });
  },
};
