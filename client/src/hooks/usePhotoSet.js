import { useEffect, useState } from 'react';
import { api } from '../services/api.js';

/** The ids (of this kind of record) that have a stored photo, for the rows a grid is showing. Pass the page's ids, not the whole list. */
export function usePhotoSet(entity, ids) {
  const [set, setSet] = useState(() => new Set());
  const key = [...new Set(ids.filter(Boolean))].sort((a, b) => a - b).join(',');
  useEffect(() => {
    if (!key) { setSet(new Set()); return undefined; }
    let cancelled = false;
    api(`/photos/has/${entity}?ids=${key}`).then((found) => { if (!cancelled) setSet(new Set(found)); }).catch(() => { if (!cancelled) setSet(new Set()); });
    return () => { cancelled = true; };
  }, [entity, key]);
  return set;
}
