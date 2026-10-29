import { useEffect, useState } from 'react';
import { api } from '../services/api.js';

let cache = null;
/** The master lists, fetched once and shared by every form. Call forgetMasters() after editing them. */
export function loadMasters() {
  if (!cache)
    cache = api('/masters')
      .then((d) => d.items)
      .catch(() => {
        cache = null;
        return {};
      });
  return cache;
}
export const forgetMasters = () => {
  cache = null;
};

/**
 * A dropdown fed by a master list. Inactive options are hidden, but the record's current value is always kept in the list so
 * editing an older record never silently drops what it holds.
 */
export default function MasterSelect({ type, value, onChange, required, placeholder = '--' }) {
  const [items, setItems] = useState(null);
  useEffect(() => {
    loadMasters().then((all) => setItems(all[type] ?? []));
  }, [type]);

  const options = (items ?? []).filter((i) => i.active).map((i) => i.name);
  const extra = value && !options.includes(value) ? [value] : [];
  return (
    <select value={value ?? ''} onChange={onChange} required={required}>
      <option value="">{placeholder}</option>
      {[...options, ...extra].map((name) => (
        <option key={name} value={name}>
          {name}
          {extra.includes(name) ? ' (not in list)' : ''}
        </option>
      ))}
    </select>
  );
}
