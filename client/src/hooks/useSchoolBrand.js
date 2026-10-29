import { useEffect, useState } from 'react';
import { api } from '../services/api.js';

const EVENT = 'school-profile-changed';
const FALLBACK = {
  name: 'School ERP',
  motto: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  logoVersion: null,
};
let cache = null;

const load = () => {
  if (!cache) cache = api('/public/school').catch(() => FALLBACK);
  return cache;
};

/** Call after the school profile or logo is saved, so the header, footer and login page pick up the change without a reload. */
export function schoolProfileChanged() {
  cache = null;
  window.dispatchEvent(new Event(EVENT));
}

/** The school's name, contact details and logo (the logo URL is empty when none was uploaded). Shared by the header, footer, login page and printouts. */
export function useSchoolBrand() {
  const [brand, setBrand] = useState(null);
  useEffect(() => {
    let live = true;
    const refresh = () =>
      load().then((b) => {
        if (live) setBrand(b);
      });
    refresh();
    window.addEventListener(EVENT, refresh);
    return () => {
      live = false;
      window.removeEventListener(EVENT, refresh);
    };
  }, []);
  const b = brand ?? FALLBACK;
  return {
    ...b,
    name: b.name || FALLBACK.name,
    logoUrl: b.logoVersion ? `/api/public/school/logo?v=${b.logoVersion}` : null,
    loaded: Boolean(brand),
  };
}
