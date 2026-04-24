import { supabaseRestRequest } from './apiClient';
import { storage } from '../storage';

async function requireAccessToken(): Promise<string> {
  const token = await storage.getAccessToken();
  if (!token) throw new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
  return token;
}

export async function listFavoriteEventIds(): Promise<string[]> {
  const accessToken = await requireAccessToken();
  const rows = await supabaseRestRequest<{ event_id: string }[]>(
    `/school_event_favorites?select=event_id&order=created_at.desc`,
    { method: 'GET', accessToken },
  );
  return rows.map((row) => row.event_id).filter(Boolean);
}

export async function addFavoriteEvent(eventId: string): Promise<void> {
  const accessToken = await requireAccessToken();
  await supabaseRestRequest('/school_event_favorites', {
    method: 'POST',
    accessToken,
    headers: {
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: [{ event_id: eventId }],
  });
}

export async function removeFavoriteEvent(eventId: string): Promise<void> {
  const accessToken = await requireAccessToken();
  await supabaseRestRequest(`/school_event_favorites?event_id=eq.${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
    accessToken,
    headers: { Prefer: 'return=minimal' },
  });
}

export async function isEventFavorited(eventId: string): Promise<boolean> {
  const accessToken = await requireAccessToken();
  const rows = await supabaseRestRequest<{ event_id: string }[]>(
    `/school_event_favorites?select=event_id&event_id=eq.${encodeURIComponent(eventId)}&limit=1`,
    { method: 'GET', accessToken },
  );
  return rows.length > 0;
}
