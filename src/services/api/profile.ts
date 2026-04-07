import {
  ApiError,
  getSupabaseStoragePublicUrl,
  supabaseAuthRequest,
  supabaseRestRequest,
  supabaseStorageUpload,
} from './apiClient';
import { buildSubcategoryLabelMaps, fetchDanceCatalog } from './danceCatalog';
import type { MeResponseDto, UpdateMeRequestDto, UpdateMeResponseDto, UserDto } from './types';
import { storage } from '../storage';

export type ProfileModel = {
  displayName: string;
  username: string;
  avatarUri: string | null;
  bio: string;
  email: string;
  city: string;
  favoriteDances: string[];
  otherInterests: string;
  notificationsEnabled: boolean;
};

type SupabaseUserResponse = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

type SupabaseSessionResponse = {
  access_token: string;
  refresh_token: string;
  user?: SupabaseUserResponse | null;
};

type SupabaseProfileRow = {
  id: string;
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  city?: string | null;
  managed_user_interest_dance_types?: ProfileDanceTypeLinkRow[] | null;
  favorite_dances?: string[] | null;
  other_interests?: string | null;
  notifications_enabled?: boolean | null;
};

type DanceTypeJoinRow = {
  id: string;
  name: string | null;
  parent_id?: string | null;
};

type ProfileDanceTypeLinkRow = {
  dance_type_id?: string | null;
  dance_types?: DanceTypeJoinRow | null;
};

type ManagedUserRow = {
  id: string;
};

type SupabaseProfileUpsert = {
  id: string;
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  city?: string | null;
  favorite_dances?: string[];
  other_interests?: string | null;
  notifications_enabled?: boolean;
};

const PROFILE_AVATAR_BUCKET = 'profile-images';

function extractMetadataString(metadata: Record<string, unknown>, key: string): string | null {
  return typeof metadata[key] === 'string' ? metadata[key] : null;
}

function extractMetadataStringArray(metadata: Record<string, unknown>, key: string): string[] {
  const value = metadata[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase('tr-TR');
}

function uniqueTrimmed(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => (typeof value === 'string' ? value.trim() : '')).filter(Boolean))];
}

async function resolveStoredFavoriteDanceIds(values: string[]): Promise<string[]> {
  const rawValues = uniqueTrimmed(values);
  if (rawValues.length === 0) return [];

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

    const resolvedIds: string[] = [];
    for (const value of rawValues) {
      if (compactBySubId.has(value)) {
        resolvedIds.push(value);
        continue;
      }
      const matchedId = idByLabel.get(normalizeText(value));
      if (matchedId) {
        resolvedIds.push(matchedId);
      }
    }
    return uniqueTrimmed(resolvedIds);
  } catch {
    return rawValues;
  }
}

async function resolveProfileFavoriteDanceIds(row: SupabaseProfileRow): Promise<string[]> {
  const relationIds = uniqueTrimmed((row.managed_user_interest_dance_types ?? []).map((item) => item.dance_type_id));
  if (relationIds.length > 0) return relationIds;
  return await resolveStoredFavoriteDanceIds(Array.isArray(row.favorite_dances) ? row.favorite_dances : []);
}

async function mapSupabaseProfile(authUser: SupabaseUserResponse, row: SupabaseProfileRow): Promise<UserDto> {
  const favoriteDanceIds = await resolveProfileFavoriteDanceIds(row);
  return {
    id: authUser.id,
    email: typeof authUser.email === 'string' ? authUser.email : null,
    displayName: row.display_name ?? null,
    username: row.username ?? null,
    avatarUrl: row.avatar_url ?? null,
    bio: row.bio ?? null,
    city: row.city ?? null,
    favoriteDances: favoriteDanceIds,
    otherInterests: row.other_interests ?? null,
    notificationsEnabled: row.notifications_enabled !== false,
  };
}

function mapUserDtoToProfile(user: UserDto): ProfileModel {
  return {
    displayName: (user.displayName ?? '').trim(),
    username: (user.username ?? '').trim(),
    avatarUri: user.avatarUrl ?? null,
    bio: (user.bio ?? '').trim(),
    email: (user.email ?? '').trim(),
    city: (user.city ?? '').trim(),
    favoriteDances: user.favoriteDances ?? [],
    otherInterests: (user.otherInterests ?? '').trim(),
    notificationsEnabled: user.notificationsEnabled !== false,
  };
}

function isLocalAvatarUri(uri: string | null | undefined): uri is string {
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

async function uploadAvatarIfNeeded(accessToken: string, userId: string, avatarUri?: string | null): Promise<string | null | undefined> {
  if (avatarUri === undefined) return undefined;
  if (avatarUri === null || avatarUri.trim() === '') return null;
  if (!isLocalAvatarUri(avatarUri)) return avatarUri;

  const extension = guessFileExtension(avatarUri);
  const objectPath = `${userId}/avatar.${extension}`;
  const contentType = guessMimeType(extension);

  const fileResponse = await fetch(avatarUri);
  const fileBlob = await fileResponse.blob();

  await supabaseStorageUpload(`${PROFILE_AVATAR_BUCKET}/${objectPath}`, {
    file: fileBlob,
    contentType,
    accessToken,
    upsert: true,
  });

  return getSupabaseStoragePublicUrl(PROFILE_AVATAR_BUCKET, objectPath);
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
  if (!accessToken) throw new Error('No access token.');

  try {
    return await run(accessToken);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    const refreshedToken = await refreshAccessToken();
    if (!refreshedToken) throw error;
    return run(refreshedToken);
  }
}

async function getAuthUser(accessToken: string): Promise<SupabaseUserResponse> {
  return supabaseAuthRequest<SupabaseUserResponse>('/user', {
    accessToken,
  });
}

async function findManagedUserIdByColumn(
  accessToken: string,
  column: string,
  authUserId: string,
): Promise<string | null> {
  try {
    const rows = await supabaseRestRequest<ManagedUserRow[]>(
      `/managed_users?select=id&${column}=eq.${encodeURIComponent(authUserId)}&limit=1`,
      { accessToken },
    );
    const managedUserId = rows?.[0]?.id?.trim();
    return managedUserId || null;
  } catch (error) {
    if (canFallbackToLegacyFavoriteDances(error)) return null;
    throw error;
  }
}

async function resolveManagedUserId(accessToken: string, authUserId: string): Promise<string> {
  const directId = authUserId.trim();
  const candidates = ['auth_user_id', 'profile_id', 'user_id', 'owner_user_id'];

  for (const column of candidates) {
    const managedUserId = await findManagedUserIdByColumn(accessToken, column, directId);
    if (managedUserId) return managedUserId;
  }

  try {
    const rows = await supabaseRestRequest<ManagedUserRow[]>(
      `/managed_users?select=id&id=eq.${encodeURIComponent(directId)}&limit=1`,
      { accessToken },
    );
    const managedUserId = rows?.[0]?.id?.trim();
    if (managedUserId) return managedUserId;
  } catch (error) {
    if (!canFallbackToLegacyFavoriteDances(error)) throw error;
  }

  throw new Error('managed_users kaydi bulunamadi. Lutfen kullanici-mapped managed_user kaydini kontrol edin.');
}

async function listManagedUserInterestDanceTypeIds(
  accessToken: string,
  managedUserId: string,
): Promise<string[]> {
  try {
    const rows = await supabaseRestRequest<Array<{ dance_type_id?: string | null }>>(
      `/managed_user_interest_dance_types?select=dance_type_id&user_id=eq.${encodeURIComponent(managedUserId)}`,
      { accessToken },
    );
    return uniqueTrimmed((rows ?? []).map((row) => row.dance_type_id));
  } catch (error) {
    if (canFallbackToLegacyFavoriteDances(error)) return [];
    throw error;
  }
}

function selectProfileFields(includeDanceTypes: boolean): string {
  const base = 'id,display_name,username,avatar_url,bio,city,favorite_dances,other_interests,notifications_enabled';
  if (!includeDanceTypes) return base;
  return `${base},managed_user_interest_dance_types(dance_type_id,dance_types(id,name,parent_id))`;
}

function canFallbackToLegacyFavoriteDances(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 400 || error.status === 404);
}

async function getProfileRow(accessToken: string, userId: string): Promise<SupabaseProfileRow | null> {
  const relationSelect = selectProfileFields(true);
  const legacySelect = selectProfileFields(false);

  try {
    const rows = await supabaseRestRequest<SupabaseProfileRow[]>(
      `/profiles?select=${relationSelect}&id=eq.${encodeURIComponent(userId)}&limit=1`,
      { accessToken },
    );
    return rows[0] ?? null;
  } catch (error) {
    if (!canFallbackToLegacyFavoriteDances(error)) throw error;
    const rows = await supabaseRestRequest<SupabaseProfileRow[]>(
      `/profiles?select=${legacySelect}&id=eq.${encodeURIComponent(userId)}&limit=1`,
      { accessToken },
    );
    return rows[0] ?? null;
  }
}

function buildProfileUpsert(
  userId: string,
  currentRow: SupabaseProfileRow | null,
  updates: Partial<ProfileModel>,
  metadata?: Record<string, unknown> | null,
): SupabaseProfileUpsert {
  const fallbackMetadata = metadata ?? {};
  const displayName = updates.displayName ?? currentRow?.display_name ?? extractMetadataString(fallbackMetadata, 'displayName');
  const username = updates.username ?? currentRow?.username ?? extractMetadataString(fallbackMetadata, 'username');
  const avatarUrl = updates.avatarUri ?? currentRow?.avatar_url ?? extractMetadataString(fallbackMetadata, 'avatarUrl');
  const bio = updates.bio ?? currentRow?.bio ?? extractMetadataString(fallbackMetadata, 'bio');
  const city = updates.city ?? currentRow?.city ?? extractMetadataString(fallbackMetadata, 'city');
  const favoriteDances = updates.favoriteDances ?? currentRow?.favorite_dances ?? extractMetadataStringArray(fallbackMetadata, 'favoriteDances');
  const otherInterests = updates.otherInterests ?? currentRow?.other_interests ?? extractMetadataString(fallbackMetadata, 'otherInterests');
  const notificationsEnabled =
    updates.notificationsEnabled !== undefined
      ? updates.notificationsEnabled
      : currentRow?.notifications_enabled === false
        ? false
        : true;

  return {
    id: userId,
    display_name: displayName ?? '',
    username: username ?? '',
    avatar_url: avatarUrl ?? null,
    bio: bio ?? '',
    city: city ?? '',
    favorite_dances: favoriteDances ?? [],
    other_interests: otherInterests ?? '',
    notifications_enabled: notificationsEnabled,
  };
}

async function upsertProfileRow(
  accessToken: string,
  payload: SupabaseProfileUpsert,
): Promise<SupabaseProfileRow> {
  const select = selectProfileFields(false);
  const response = await supabaseRestRequest<SupabaseProfileRow | SupabaseProfileRow[]>(
    `/profiles?select=${select}&on_conflict=id`,
    {
      method: 'POST',
      accessToken,
      headers: {
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: payload,
    },
  );

  const rows = Array.isArray(response) ? response : [response];
  if (!rows[0]) {
    throw new Error('Profil kaydı oluşturulamadı.');
  }

  return rows[0];
}

async function replaceManagedUserInterestDanceTypes(
  managedUserId: string,
  favoriteDanceIds: string[],
  accessToken: string,
): Promise<void> {
  await supabaseRestRequest(
    `/managed_user_interest_dance_types?user_id=eq.${encodeURIComponent(managedUserId)}`,
    {
      method: 'DELETE',
      accessToken,
      headers: { Prefer: 'return=minimal' },
    },
  );

  const uniqueIds = uniqueTrimmed(favoriteDanceIds);
  if (uniqueIds.length === 0) return;

  await supabaseRestRequest('/managed_user_interest_dance_types', {
    method: 'POST',
    accessToken,
    headers: { Prefer: 'return=minimal' },
    body: uniqueIds.map((danceTypeId) => ({
      user_id: managedUserId,
      dance_type_id: danceTypeId,
    })),
  });
}

export type PublicProfileCard = {
  displayName: string;
  username: string;
  avatarUrl: string | null;
  bio: string;
  favoriteDances: string[];
};

export const profileService = {
  /** Başka kullanıcı kartı (authenticated okuyabilir). */
  async getPublicProfileById(userId: string): Promise<PublicProfileCard | null> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const row = await getProfileRow(accessToken, userId);
      if (!row) return null;
      return {
        displayName: (row.display_name ?? '').trim(),
        username: (row.username ?? '').trim(),
        avatarUrl: row.avatar_url?.trim() || null,
        bio: (row.bio ?? '').trim(),
        favoriteDances: await resolveProfileFavoriteDanceIds(row),
      };
    });
  },

  async getMe(): Promise<ProfileModel> {
    const res = await withAuthorizedUserRequest(async (accessToken) => {
      const authUser = await getAuthUser(accessToken);
      let profileRow = await getProfileRow(accessToken, authUser.id);

      if (!profileRow) {
        profileRow = await upsertProfileRow(
          accessToken,
          buildProfileUpsert(authUser.id, null, {}, authUser.user_metadata),
        );
      }
      try {
        const managedUserId = await resolveManagedUserId(accessToken, authUser.id);
        const managedFavoriteDanceIds = await listManagedUserInterestDanceTypeIds(accessToken, managedUserId);
        if (managedFavoriteDanceIds.length > 0) {
          profileRow.favorite_dances = managedFavoriteDanceIds;
        }
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes('managed_users')) {
          throw error;
        }
      }
      const user = await mapSupabaseProfile(authUser, profileRow);

      return {
        user,
      } satisfies MeResponseDto;
    });

    return mapUserDtoToProfile(res.user);
  },

  async updateMe(updates: Partial<ProfileModel>): Promise<ProfileModel> {
    const res = await withAuthorizedUserRequest(async (accessToken) => {
      const currentAuthUser = await getAuthUser(accessToken);
      const currentProfileRow = await getProfileRow(accessToken, currentAuthUser.id);
      const body: UpdateMeRequestDto = {
        displayName: updates.displayName,
        username: updates.username,
        email: updates.email,
        city: updates.city,
        avatarUrl: undefined,
        bio: updates.bio,
        favoriteDances: updates.favoriteDances,
        otherInterests: updates.otherInterests,
        notificationsEnabled: updates.notificationsEnabled,
      };

      const uploadedAvatarUrl = await uploadAvatarIfNeeded(accessToken, currentAuthUser.id, updates.avatarUri);
      body.avatarUrl = uploadedAvatarUrl;
      const normalizedUpdates: Partial<ProfileModel> = {
        ...updates,
        avatarUri: uploadedAvatarUrl,
      };

      let nextAuthUser = currentAuthUser;
      if (typeof body.email === 'string' && body.email.trim() !== (currentAuthUser.email ?? '').trim()) {
        nextAuthUser = await supabaseAuthRequest<SupabaseUserResponse>('/user', {
          method: 'PUT',
          accessToken,
          body: {
            email: body.email,
          },
        });
      }

      const updatedProfileRow = await upsertProfileRow(
        accessToken,
        buildProfileUpsert(currentAuthUser.id, currentProfileRow, normalizedUpdates, currentAuthUser.user_metadata),
      );
      try {
        const managedUserId = await resolveManagedUserId(accessToken, currentAuthUser.id);
        await replaceManagedUserInterestDanceTypes(
          managedUserId,
          normalizedUpdates.favoriteDances ?? [],
          accessToken,
        );
      } catch (error) {
        if (!canFallbackToLegacyFavoriteDances(error)) throw error;
      }
      const refreshedProfileRow = await getProfileRow(accessToken, currentAuthUser.id);
      const user = await mapSupabaseProfile(nextAuthUser, refreshedProfileRow ?? updatedProfileRow);

      return {
        user,
      } satisfies UpdateMeResponseDto;
    });

    return mapUserDtoToProfile(res.user);
  },
};
