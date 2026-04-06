import { supabaseRestRequest } from './apiClient';

/** Supabase `dance_types`: `parent_id` null = kategori, dolu = alt tür (doğrudan kök altında). */
type DanceTypeRow = {
  id: string;
  name: string;
  slug?: string | null;
  parent_id?: string | null;
};

export type DanceCategoryWithSubs = {
  id: string;
  name: string;
  sortOrder: number;
  subcategories: { id: string; name: string; sortOrder: number }[];
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isLikelyDanceSubcategoryId(value: string): boolean {
  return UUID_RE.test(value.trim());
}

function sortByName(a: { name: string }, b: { name: string }): number {
  return a.name.localeCompare(b.name, 'tr', { sensitivity: 'base' });
}

export async function fetchDanceCatalog(): Promise<DanceCategoryWithSubs[]> {
  const rows = await supabaseRestRequest<DanceTypeRow[]>(
    '/dance_types?select=id,name,slug,parent_id&order=name.asc',
    {},
  );

  const list = Array.isArray(rows) ? rows : [];

  const roots = list.filter((r) => r.parent_id == null || String(r.parent_id).trim() === '').sort(sortByName);

  return roots.map((root, rootIndex) => {
    const subcategories = list
      .filter((r) => r.parent_id === root.id)
      .sort(sortByName)
      .map((s, i) => ({
        id: s.id,
        name: s.name,
        sortOrder: i,
      }));

    return {
      id: root.id,
      name: root.name,
      sortOrder: rootIndex,
      subcategories,
    };
  });
}

export type DanceLabelMaps = {
  /** Sadece alt tür adı (veya kök seçilmişse kök adı). */
  compactBySubId: Map<string, string>;
  /** Kategori · Alt tür (profil etiketleri); yalnızca kök ise sadece kök adı. */
  fullBySubId: Map<string, string>;
};

export function buildSubcategoryLabelMaps(catalog: DanceCategoryWithSubs[]): DanceLabelMaps {
  const compactBySubId = new Map<string, string>();
  const fullBySubId = new Map<string, string>();
  for (const c of catalog) {
    compactBySubId.set(c.id, c.name);
    fullBySubId.set(c.id, c.name);
    for (const s of c.subcategories) {
      compactBySubId.set(s.id, s.name);
      fullBySubId.set(s.id, `${c.name} · ${s.name}`);
    }
  }
  return { compactBySubId, fullBySubId };
}

/** Katalogdaki tüm `dance_types.id` (kök + alt); favori çözümleme ve “liste dışı” için. */
export function collectCatalogTypeIds(catalog: DanceCategoryWithSubs[]): Set<string> {
  const ids = new Set<string>();
  for (const c of catalog) {
    ids.add(c.id);
    for (const s of c.subcategories) {
      ids.add(s.id);
    }
  }
  return ids;
}

/** UUID ve eşleşen katalog etiketi varsa çözümler; aksi halde ham metin veya bilinmeyen uuid için kısa yedek. */
export function resolveFavoriteDanceLabels(
  values: string[],
  labelBySubId: Map<string, string>,
  unknownUuidLabel = 'Dans',
): string[] {
  return values.map((raw) => {
    const v = raw.trim();
    if (!v) return v;
    const resolved = labelBySubId.get(v);
    if (resolved) return resolved;
    if (isLikelyDanceSubcategoryId(v)) return unknownUuidLabel;
    return v;
  });
}
