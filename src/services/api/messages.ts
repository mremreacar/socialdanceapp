import {
  ApiError,
  getSupabaseStoragePublicUrl,
  supabaseAuthRequest,
  supabaseRestRequest,
  supabaseStorageUpload,
} from './apiClient';

function isMissingRpcError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  const blob = `${error.message} ${error.code ?? ''} ${typeof error.details === 'string' ? error.details : JSON.stringify(error.details ?? '')}`.toLowerCase();
  return (
    error.status === 404 ||
    blob.includes('could not find') ||
    blob.includes('schema cache') ||
    blob.includes('pgrst202') ||
    blob.includes('undefined function') ||
    (blob.includes('function') && blob.includes('not found'))
  );
}
import { storage } from '../storage';

type SupabaseUserResponse = { id: string };
type SupabaseSessionResponse = { access_token: string; refresh_token: string };

const CHAT_IMAGES_BUCKET = 'chat-images';

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

export type ConversationListItem = {
  conversationId: string;
  peerId: string;
  peerDisplayName: string;
  peerAvatarUrl: string | null;
  lastBody: string;
  lastAt: string | null;
  unreadCount: number;
};

type DmListRow = {
  conversation_id: string;
  peer_id: string;
  peer_display_name: string;
  peer_avatar_url: string | null;
  last_body: string;
  last_at: string | null;
  unread_count: number;
};

export type DmMessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  image_url: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

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

export function formatChatListTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMsg = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((startOfToday.getTime() - startOfMsg.getTime()) / 86400000);
  if (diffDays === 0) {
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Dün';
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
}

export function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  if (diffMs >= 0 && diffMs < 60000) return 'Şimdi';
  return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

type MemberRow = { conversation_id: string; user_id: string };
type MembershipRow = { conversation_id: string; last_read_at: string };

async function findConversationWithPeerViaRest(accessToken: string, peerUserId: string): Promise<string | null> {
  const me = await getMyUserId(accessToken);
  const memberships = await supabaseRestRequest<{ conversation_id: string }[]>(
    `/dm_conversation_members?user_id=eq.${encodeURIComponent(me)}&select=conversation_id`,
    { accessToken },
  );
  const myConversationIds = [...new Set((memberships ?? []).map((m) => m.conversation_id).filter(Boolean))];
  if (myConversationIds.length === 0) return null;

  const inConv = myConversationIds.map((id) => encodeURIComponent(id)).join(',');
  const peerMemberships = await supabaseRestRequest<{ conversation_id: string }[]>(
    `/dm_conversation_members?user_id=eq.${encodeURIComponent(peerUserId)}&conversation_id=in.(${inConv})&select=conversation_id`,
    { accessToken },
  );

  const match = (peerMemberships ?? [])[0]?.conversation_id;
  return match ?? null;
}

/** PostgREST RPC yok / schema cache sorunu olduğunda sohbet listesi (doğrudan tablolar) */
async function listConversationsViaRest(accessToken: string): Promise<ConversationListItem[]> {
  const me = await getMyUserId(accessToken);

  const memberships = await supabaseRestRequest<MembershipRow[]>(
    `/dm_conversation_members?user_id=eq.${encodeURIComponent(me)}&select=conversation_id,last_read_at`,
    { accessToken },
  );
  const mems = Array.isArray(memberships) ? memberships : [];
  if (mems.length === 0) return [];

  const lastReadByConv = new Map(mems.map((m) => [m.conversation_id, m.last_read_at]));
  const convIds = [...new Set(mems.map((m) => m.conversation_id))];
  const inConv = convIds.map((id) => encodeURIComponent(id)).join(',');

  const allMembers = await supabaseRestRequest<MemberRow[]>(
    `/dm_conversation_members?conversation_id=in.(${inConv})&select=conversation_id,user_id`,
    { accessToken },
  );
  const memberRows = Array.isArray(allMembers) ? allMembers : [];

  const peerByConv = new Map<string, string>();
  for (const cid of convIds) {
    const users = memberRows.filter((r) => r.conversation_id === cid).map((r) => r.user_id);
    const peer = users.find((u) => u !== me);
    if (peer) peerByConv.set(cid, peer);
  }

  const peerIds = [...new Set(peerByConv.values())];
  if (peerIds.length === 0) return [];

  const inPeers = peerIds.map((id) => encodeURIComponent(id)).join(',');
  const profiles = await supabaseRestRequest<ProfileRow[]>(
    `/profiles?id=in.(${inPeers})&select=id,display_name,username,avatar_url`,
    { accessToken },
  );
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const msgs = await supabaseRestRequest<DmMessageRow[]>(
    `/dm_messages?conversation_id=in.(${inConv})&select=conversation_id,sender_id,body,image_url,created_at&order=created_at.desc&limit=800`,
    { accessToken },
  );
  const msgList = Array.isArray(msgs) ? msgs : [];
  const lastByConv = new Map<string, DmMessageRow>();
  for (const m of msgList) {
    if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m);
  }

  const unreadByConv = new Map<string, number>();
  await Promise.all(
    convIds.map(async (cid) => {
      const peer = peerByConv.get(cid);
      const lr = lastReadByConv.get(cid);
      if (!peer || lr == null) return;
      try {
        const rows = await supabaseRestRequest<{ id: string }[]>(
          `/dm_messages?conversation_id=eq.${encodeURIComponent(cid)}&sender_id=eq.${encodeURIComponent(peer)}&created_at=gt.${encodeURIComponent(lr)}&select=id`,
          { accessToken },
        );
        unreadByConv.set(cid, Array.isArray(rows) ? rows.length : 0);
      } catch {
        unreadByConv.set(cid, 0);
      }
    }),
  );

  const items: ConversationListItem[] = [];
  for (const cid of convIds) {
    const peer = peerByConv.get(cid);
    if (!peer) continue;
    const prof = profileById.get(peer);
    const last = lastByConv.get(cid);
    const lastBodyText = last?.body?.trim() ? last.body : '';
    items.push({
      conversationId: cid,
      peerId: peer,
      peerDisplayName: (prof?.display_name ?? '').trim() || (prof?.username ?? '').trim() || 'Kullanıcı',
      peerAvatarUrl: prof?.avatar_url ?? null,
      lastBody: lastBodyText,
      lastAt: last?.created_at ?? null,
      unreadCount: unreadByConv.get(cid) ?? 0,
    });
  }

  items.sort((a, b) => {
    const ta = a.lastAt ? new Date(a.lastAt).getTime() : 0;
    const tb = b.lastAt ? new Date(b.lastAt).getTime() : 0;
    return tb - ta;
  });

  return items;
}

export const messageService = {
  async getCurrentUserId(): Promise<string> {
    return await withAuthorizedUserRequest((accessToken) => getMyUserId(accessToken));
  },

  async listConversations(): Promise<ConversationListItem[]> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const mapRows = (rows: DmListRow[]): ConversationListItem[] =>
        rows.map((r) => ({
          conversationId: r.conversation_id,
          peerId: r.peer_id,
          peerDisplayName: r.peer_display_name || 'Kullanıcı',
          peerAvatarUrl: r.peer_avatar_url,
          lastBody: r.last_body || '',
          lastAt: r.last_at,
          unreadCount: Number(r.unread_count ?? 0),
        }));

      try {
        const rows = await supabaseRestRequest<DmListRow[]>(
          '/rpc/dm_list_conversations',
          { method: 'POST', accessToken, body: {} },
        );
        const list = Array.isArray(rows) ? rows : [];
        return mapRows(list);
      } catch (e) {
        if (!isMissingRpcError(e)) throw e;
      }

      try {
        const rows = await supabaseRestRequest<DmListRow[]>(
          '/rpc/dm_list_conversations',
          { method: 'GET', accessToken },
        );
        const list = Array.isArray(rows) ? rows : [];
        return mapRows(list);
      } catch (e) {
        if (!isMissingRpcError(e)) throw e;
      }

      return listConversationsViaRest(accessToken);
    });
  },

  async getOrCreateConversation(peerUserId: string): Promise<string> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      try {
        const result = await supabaseRestRequest<string>(
          '/rpc/dm_get_or_create',
          { method: 'POST', accessToken, body: { p_other: peerUserId } },
        );
        if (!result || typeof result !== 'string') throw new Error('Sohbet oluşturulamadı.');
        return result;
      } catch (e) {
        if (isMissingRpcError(e)) {
          const existingConversation = await findConversationWithPeerViaRest(accessToken, peerUserId);
          if (existingConversation) return existingConversation;
          throw new ApiError(
            'Sohbet açılamıyor. Mevcut konuşma bulunamadı ve yeni konuşma oluşturmak için dm_get_or_create RPC gerekli. Supabase migration çalıştırıp "notify pgrst, \'reload schema\';" komutunu uygulayın.',
            { status: 503, code: 'RPC_MISSING', details: e },
          );
        }
        throw e;
      }
    });
  },

  async listMessages(conversationId: string): Promise<DmMessageRow[]> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const rows = await supabaseRestRequest<DmMessageRow[]>(
        `/dm_messages?conversation_id=eq.${encodeURIComponent(conversationId)}&order=created_at.asc`,
        { accessToken },
      );
      return Array.isArray(rows) ? rows : [];
    });
  },

  async sendTextMessage(conversationId: string, text: string): Promise<DmMessageRow> {
    const trimmed = text.trim();
    if (!trimmed) throw new Error('Boş mesaj gönderilemez.');
    return await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      const rows = await supabaseRestRequest<DmMessageRow | DmMessageRow[]>(
        '/dm_messages?select=id,conversation_id,sender_id,body,image_url,created_at',
        {
          method: 'POST',
          accessToken,
          headers: { Prefer: 'return=representation' },
          body: {
            conversation_id: conversationId,
            sender_id: me,
            body: trimmed,
            image_url: null,
          },
        },
      );
      const row = Array.isArray(rows) ? rows[0] : rows;
      if (!row) throw new Error('Mesaj gönderilemedi.');
      return row;
    });
  },

  async sendImageMessage(conversationId: string, localImageUri: string): Promise<DmMessageRow> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      const extension = guessFileExtension(localImageUri);
      const objectPath = `${me}/${conversationId}/${Date.now()}.${extension}`;
      const contentType = guessMimeType(extension);
      const fileResponse = await fetch(localImageUri);
      const fileBlob = await fileResponse.blob();

      await supabaseStorageUpload(`${CHAT_IMAGES_BUCKET}/${objectPath}`, {
        file: fileBlob,
        contentType,
        accessToken,
        upsert: false,
      });

      const publicUrl = getSupabaseStoragePublicUrl(CHAT_IMAGES_BUCKET, objectPath);

      const rows = await supabaseRestRequest<DmMessageRow | DmMessageRow[]>(
        '/dm_messages?select=id,conversation_id,sender_id,body,image_url,created_at',
        {
          method: 'POST',
          accessToken,
          headers: { Prefer: 'return=representation' },
          body: {
            conversation_id: conversationId,
            sender_id: me,
            body: '',
            image_url: publicUrl,
          },
        },
      );
      const row = Array.isArray(rows) ? rows[0] : rows;
      if (!row) throw new Error('Mesaj gönderilemedi.');
      return row;
    });
  },

  async markConversationRead(conversationId: string): Promise<void> {
    await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      const now = new Date().toISOString();
      await supabaseRestRequest(
        `/dm_conversation_members?conversation_id=eq.${encodeURIComponent(conversationId)}&user_id=eq.${encodeURIComponent(me)}`,
        {
          method: 'PATCH',
          accessToken,
          headers: { Prefer: 'return=minimal' },
          body: { last_read_at: now },
        },
      );
    });
  },

  /** Yeni sohbet ekranı için kullanıcılar (takip edilenler önde) */
  async listFollowingPeers(): Promise<{ id: string; name: string; avatar: string; subtitle: string }[]> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      const follows = await supabaseRestRequest<{ following_id: string }[]>(
        `/follows?follower_id=eq.${encodeURIComponent(me)}&select=following_id`,
        { accessToken },
      );
      const followedIds = new Set((follows ?? []).map((f) => f.following_id).filter(Boolean));
      const profiles = await supabaseRestRequest<ProfileRow[]>(
        `/profiles?select=id,display_name,username,avatar_url&id=neq.${encodeURIComponent(me)}`,
        { accessToken },
      );

      const rows = (profiles ?? []).map((p) => ({
        id: p.id,
        name: (p.display_name ?? '').trim() || (p.username ?? '').trim() || 'Kullanıcı',
        avatar: p.avatar_url ?? '',
        subtitle: (p.username ?? '').trim() ? `@${(p.username ?? '').trim()}` : '',
        isFollowed: followedIds.has(p.id),
      }));

      rows.sort((a, b) => {
        if (a.isFollowed !== b.isFollowed) return a.isFollowed ? -1 : 1;
        return a.name.localeCompare(b.name, 'tr');
      });

      return rows.map(({ isFollowed: _isFollowed, ...rest }) => rest);
    });
  },
};
