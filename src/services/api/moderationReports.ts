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

/**
 * Admin şeması (`social_dance_admin` migration) ile aynı:
 * - `user`: reported_profile_id zorunlu
 * - `conversation`: conversation_id zorunlu (reported_profile_id / reported_message_id isteğe bağlı)
 */
export const ModerationReportType = {
  user: 'user',
  conversation: 'conversation',
} as const;

export type ModerationReportTypeValue = (typeof ModerationReportType)[keyof typeof ModerationReportType];

export type CreateModerationReportInput = {
  reportType: ModerationReportTypeValue;
  reportedProfileId: string;
  conversationId?: string | null;
  reportedMessageId?: string | null;
  reason: string;
  details?: string | null;
};

export const moderationReportsService = {
  /** `return=minimal` kullanılır: RLS’te RETURNING için ayrıca SELECT politikası gerekmez. */
  async createReport(input: CreateModerationReportInput): Promise<void> {
    const reason = input.reason.trim();
    if (!reason) throw new Error('Şikayet nedeni seçilmeli.');

    return await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);

      if (input.reportType === ModerationReportType.user && !input.reportedProfileId?.trim()) {
        throw new Error('Şikayet edilen kullanıcı bulunamadı.');
      }
      if (input.reportType === ModerationReportType.conversation && !input.conversationId?.trim()) {
        throw new Error('Sohbet bilgisi eksik.');
      }

      const body: Record<string, unknown> = {
        report_type: input.reportType,
        reporter_profile_id: me,
        reason,
        details: input.details?.trim() ? input.details.trim() : null,
      };

      if (input.reportType === ModerationReportType.user) {
        body.reported_profile_id = input.reportedProfileId;
      } else {
        body.conversation_id = input.conversationId;
        body.reported_profile_id = input.reportedProfileId?.trim() ? input.reportedProfileId : null;
        if (input.reportedMessageId?.trim()) body.reported_message_id = input.reportedMessageId;
      }

      await supabaseRestRequest(
        '/moderation_reports',
        {
          method: 'POST',
          accessToken,
          headers: { Prefer: 'return=minimal' },
          body,
        },
      );
    });
  },
};
