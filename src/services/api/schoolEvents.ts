import { supabaseRestRequest } from './apiClient';

export type SchoolEventRow = {
  id: string;
  school_id: string;
  title: string;
  starts_at: string;
  location: string | null;
  image_url: string | null;
  description: string | null;
};

export async function listSchoolEvents(schoolId: string, limit = 20): Promise<SchoolEventRow[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  return await supabaseRestRequest<SchoolEventRow[]>(
    `/school_events?select=id,school_id,title,starts_at,location,image_url,description&school_id=eq.${encodeURIComponent(schoolId)}&order=starts_at.asc&limit=${safeLimit}`,
    { method: 'GET' },
  );
}

export async function getSchoolEventById(eventId: string): Promise<SchoolEventRow | null> {
  const rows = await supabaseRestRequest<SchoolEventRow[]>(
    `/school_events?select=id,school_id,title,starts_at,location,image_url,description&id=eq.${encodeURIComponent(eventId)}&limit=1`,
    { method: 'GET' },
  );
  return rows?.[0] ?? null;
}
