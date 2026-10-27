import { useEffect, useState } from 'react';
import { api, fetchBlob } from '../services/api.js';

/** Used until the saved design has loaded (and if it cannot be loaded). Same values as the server default. */
export const DEFAULT_DESIGN = {
  headerColor: '#1e293b', accentColor: '#2563eb', showLogo: true, showAcademicYear: true, footerText: '', signatureLabel: '',
  student: { title: 'Student ID', fields: ['admissionNo', 'className', 'dob', 'guardianName', 'guardianPhone'] },
  staff: { title: 'Staff ID', fields: ['staffNo', 'designation', 'departmentName', 'phone'] },
};

/** The school logo as an object URL, or null when there is none. */
export function useLogoUrl(enabled = true) {
  const [logoUrl, setLogoUrl] = useState(null);
  useEffect(() => {
    if (!enabled) { setLogoUrl(null); return undefined; }
    let url; let cancelled = false;
    fetchBlob('/settings/logo').then((b) => { if (!cancelled) { url = URL.createObjectURL(b); setLogoUrl(url); } }).catch(() => { if (!cancelled) setLogoUrl(null); });
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [enabled]);
  return logoUrl;
}

/** The ID card design saved under Settings, plus the school logo (null when there is none or it is switched off). */
export function useIdCardDesign() {
  const [design, setDesign] = useState(DEFAULT_DESIGN);
  useEffect(() => {
    let cancelled = false;
    api('/documents/id-card-design').then(({ design: d }) => { if (!cancelled) setDesign(d); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const logoUrl = useLogoUrl(design.showLogo);
  return { design, logoUrl };
}
