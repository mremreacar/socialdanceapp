import {
  ApiError,
  getSupabaseStoragePublicUrl,
  supabaseAuthRequest,
  supabaseRestRequest,
  supabaseStorageUpload,
} from './apiClient';
import type { MeResponseDto, UpdateMeRequestDto, UpdateMeResponseDto, UserDto } from './types';
import { storage } from '../storage';

export type ProfileModel = {
  displayName: string;
  username: string;
  avatarUri: string | null;
  bio: string;
  email: string;
  favoriteDances: string[];
  otherInterests: string;
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
  favorite_dances?: string[] | null;
  other_interests?: string | null;
};

type SupabaseProfileUpsert = {
  id: string;
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  favorite_dances?: string[];
  other_interests?: string | null;
};

const PROFILE_AVATAR_BUCKET = 'profile-images';

function extractMetadataString(metadata: Record<string, unknown>, key: string): string | null {
  return typeof metadata[key] === 'string' ? metadata[key] : null;
}

function extractMetadataStringArray(metadata: Record<string, unknown>, key: string): string[] {
  const value = metadata[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function mapSupabaseProfile(authUser: SupabaseUserResponse, row: SupabaseProfileRow): UserDto {
  return {
    id: authUser.id,
    email: typeof authUser.email === 'string' ? authUser.email : null,
    displayName: row.display_name ?? null,
    username: row.username ?? null,
    avatarUrl: row.avatar_url ?? null,
    bio: row.bio ?? null,
    favoriteDances: row.favorite_dances ?? [],
    otherInterests: row.other_interests ?? null,
  };
}

function mapUserDtoToProfile(user: UserDto): ProfileModel {
  return {
    displayName: (user.displayName ?? '').trim(),
    username: (user.username ?? '').trim(),
    avatarUri: user.avatarUrl ?? null,
    bio: (user.bio ?? '').trim(),
    email: (user.email ?? '').trim(),
    favoriteDances: user.favoriteDances ?? [],
    otherInterests: (user.otherInterests ?? '').trim(),
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

async function getProfileRow(accessToken: string, userId: string): Promise<SupabaseProfileRow | null> {
  const rows = await supabaseRestRequest<SupabaseProfileRow[]>(
    `/profiles?select=id,display_name,username,avatar_url,bio,favorite_dances,other_interests&id=eq.${encodeURIComponent(userId)}&limit=1`,
    { accessToken },
  );

  return rows[0] ?? null;
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
  const favoriteDances = updates.favoriteDances ?? currentRow?.favorite_dances ?? extractMetadataStringArray(fallbackMetadata, 'favoriteDances');
  const otherInterests = updates.otherInterests ?? currentRow?.other_interests ?? extractMetadataString(fallbackMetadata, 'otherInterests');

  return {
    id: userId,
    display_name: displayName ?? '',
    username: username ?? '',
    avatar_url: avatarUrl ?? null,
    bio: bio ?? '',
    favorite_dances: favoriteDances ?? [],
    other_interests: otherInterests ?? '',
  };
}

async function upsertProfileRow(
  accessToken: string,
  payload: SupabaseProfileUpsert,
): Promise<SupabaseProfileRow> {
  const response = await supabaseRestRequest<SupabaseProfileRow | SupabaseProfileRow[]>(
    '/profiles?select=id,display_name,username,avatar_url,bio,favorite_dances,other_interests&on_conflict=id',
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

export const profileService = {
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

      return {
        user: mapSupabaseProfile(authUser, profileRow),
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
        avatarUrl: undefined,
        bio: updates.bio,
        favoriteDances: updates.favoriteDances,
        otherInterests: updates.otherInterests,
      };

      const uploadedAvatarUrl = await uploadAvatarIfNeeded(accessToken, currentAuthUser.id, updates.avatarUri);
      body.avatarUrl = uploadedAvatarUrl;

      let nextAuthUser = currentAuthUser;
      if (body.email !== undefined && body.email.trim() !== (currentAuthUser.email ?? '').trim()) {
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
        buildProfileUpsert(currentAuthUser.id, currentProfileRow, updates, currentAuthUser.user_metadata),
      );

      return {
        user: mapSupabaseProfile(nextAuthUser, updatedProfileRow),
      } satisfies UpdateMeResponseDto;
    });

    return mapUserDtoToProfile(res.user);
  },
};
