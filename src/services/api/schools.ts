import { supabaseRestRequest } from './apiClient';

export type SchoolRow = {
  id: string;
  name: string;
  category: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  google_maps_url: string | null;
  rating: number | null;
  review_count: number | null;
  website: string | null;
  telephone: string | null;
  image_url: string | null;
  current_status: string | null;
  next_status: string | null;
  snippet: string | null;
};

export async function listSchools(params?: { q?: string; limit?: number; offset?: number }): Promise<SchoolRow[]> {
  const q = (params?.q || '').trim();
  const limit = Math.min(Math.max(params?.limit ?? 200, 1), 1000);
  const offset = Math.max(params?.offset ?? 0, 0);

  const select =
    'id,name,category,address,city,district,latitude,longitude,google_maps_url,rating,review_count,website,telephone,image_url,current_status,next_status,snippet';

  // Basic filter: REST doesn't have full-text without RPC. We'll do ilike on name & address/city/district.
  const filters = q
    ? `&or=(name.ilike.*${encodeURIComponent(q)}*,address.ilike.*${encodeURIComponent(q)}*,city.ilike.*${encodeURIComponent(q)}*,district.ilike.*${encodeURIComponent(q)}*)`
    : '';

  return await supabaseRestRequest<SchoolRow[]>(
    `/schools?select=${select}${filters}&order=review_count.desc.nullslast&limit=${limit}&offset=${offset}`,
    { method: 'GET' },
  );
}

export async function getSchoolById(id: string): Promise<SchoolRow | null> {
  const select =
    'id,name,category,address,city,district,latitude,longitude,google_maps_url,rating,review_count,website,telephone,image_url,current_status,next_status,snippet';
  const rows = await supabaseRestRequest<SchoolRow[]>(
    `/schools?select=${select}&id=eq.${encodeURIComponent(id)}&limit=1`,
    { method: 'GET' },
  );
  return rows[0] ?? null;
}
