import { ApiError, supabaseAuthRequest, supabaseRestRequest } from './apiClient';
import { storage } from '../storage';

type SupabaseUserResponse = { id: string };
type SupabaseSessionResponse = { access_token: string; refresh_token: string };

export const SupportRequestCategory = {
  account: 'account',
  billing: 'billing',
  event: 'event',
  lesson: 'lesson',
  technical: 'technical',
  other: 'other',
} as const;

export type SupportRequestCategoryValue =
  (typeof SupportRequestCategory)[keyof typeof SupportRequestCategory];

export type CreateSupportRequestInput = {
  category: SupportRequestCategoryValue;
  subject?: string;
  message: string;
};

export type SupportRequestStatus = 'pending' | 'in_review' | 'resolved' | 'closed';

export type SupportRequest = {
  id: string;
  profile_id: string;
  subject: string | null;
  message: string;
  status: SupportRequestStatus;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
};

const CATEGORY_LABELS: Record<SupportRequestCategoryValue, string> = {
  account: 'Hesap',
  billing: 'Odeme',
  event: 'Etkinlik',
  lesson: 'Ders',
  technical: 'Teknik',
  other: 'Diger',
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

export const supportRequestsService = {
  async create(input: CreateSupportRequestInput): Promise<void> {
    const category = input.category;
    const subject = input.subject?.trim() ?? '';
    const message = input.message.trim();

    if (!category) throw new Error('Kategori seçilmeli.');
    if (!message) throw new Error('Açıklama gerekli.');

    return await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      const categoryLabel = CATEGORY_LABELS[category] ?? 'Diger';
      const finalSubject = subject ? `[${categoryLabel}] ${subject}` : `[${categoryLabel}]`;
      await supabaseRestRequest('/support_requests', {
        method: 'POST',
        accessToken,
        headers: { Prefer: 'return=minimal' },
        body: {
          profile_id: me,
          subject: finalSubject,
          message,
        },
      });
    });
  },

  async listMine(): Promise<SupportRequest[]> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      return await supabaseRestRequest<SupportRequest[]>(
        '/support_requests?select=id,profile_id,subject,message,status,admin_note,created_at,updated_at&order=created_at.desc',
        {
          method: 'GET',
          accessToken,
        },
      );
    });
  },
};
