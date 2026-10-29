import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import Certificate from './Certificate.jsx';

/** Staff open /documents/:id/print; parents open /portal-print/:studentId/:id. */
export default function CertificatePage() {
  const { id, studentId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const path = studentId ? `/portal/children/${studentId}/documents/${id}/print` : `/documents/${id}/print`;
    api(path)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [id, studentId]);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p>Loading…</p>;
  return <Certificate data={data} />;
}
