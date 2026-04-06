import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildSubcategoryLabelMaps,
  collectCatalogTypeIds,
  fetchDanceCatalog,
  resolveFavoriteDanceLabels,
  type DanceCategoryWithSubs,
} from '../services/api/danceCatalog';

export function useDanceCatalog() {
  const [catalog, setCatalog] = useState<DanceCategoryWithSubs[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchDanceCatalog()
      .then((c) => {
        setCatalog(c);
      })
      .catch((e: unknown) => {
        setCatalog([]);
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg || 'Dans listesi yüklenemedi.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const { compactBySubId, fullBySubId } = useMemo(() => buildSubcategoryLabelMaps(catalog), [catalog]);
  const catalogTypeIds = useMemo(() => collectCatalogTypeIds(catalog), [catalog]);

  const resolveFull = useCallback(
    (values: string[]) => resolveFavoriteDanceLabels(values, fullBySubId),
    [fullBySubId],
  );
  const resolveCompact = useCallback(
    (values: string[]) => resolveFavoriteDanceLabels(values, compactBySubId),
    [compactBySubId],
  );

  return {
    catalog,
    loading,
    error,
    reload,
    catalogTypeIds,
    compactBySubId,
    fullBySubId,
    resolveFull,
    resolveCompact,
  };
}
