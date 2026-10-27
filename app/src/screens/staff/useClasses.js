import { useEffect, useState } from 'react';
import { api } from '../../api';
import { useAuth } from '../../auth';

/**
 * The classes this person can work with: a teacher's own classes (from sign-in), or every class for an admin.
 * Returns { options: [{ value, label }], classId, setClassId, loading }.
 */
export function useClasses() {
  const { user } = useAuth();
  const [rows, setRows] = useState(user?.role === 'admin' ? null : (user?.classes ?? []));
  const [classId, setClassId] = useState(null);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    api('/classes').then(setRows).catch(() => setRows([]));
  }, [user?.role]);

  const options = (rows ?? []).map((c) => ({ value: c.id, label: `${c.name}-${c.section}` }));
  const selected = classId ?? options[0]?.value ?? null;
  return { options, classId: selected, setClassId, loading: rows === null };
}
