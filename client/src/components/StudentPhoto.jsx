import { useEffect, useState } from 'react';
import { fetchBlob } from '../services/api.js';

/** Shows a student's stored photo (from the database), or `fallback` while there is none. `version` reloads after a new upload. */
export default function StudentPhoto({ studentId, entity = 'student', show = true, alt, className, fallback = null, version }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    if (!studentId || !show) { setSrc(null); return undefined; }
    let url;
    let cancelled = false;
    fetchBlob(`/photos/${entity}/${studentId}`)
      .then((blob) => { if (!cancelled) { url = URL.createObjectURL(blob); setSrc(url); } })
      .catch(() => { if (!cancelled) setSrc(null); });
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [studentId, entity, show, version]);

  return src ? <img src={src} alt={alt} className={className} /> : fallback;
}
