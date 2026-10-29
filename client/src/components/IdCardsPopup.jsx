import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import IdCardSheet from './IdCardSheet.jsx';
import { useIdCardDesign } from './idCardDesign.js';

/**
 * ID cards inside a popup: one person (`studentId` or `staffId`) or a whole class chosen here (`classes`, students only).
 * They are drawn from the design saved under Settings → ID Card Design. Print uses the browser's print dialog; the
 * stylesheet hides everything except the cards.
 */
export default function IdCardsPopup({ studentId, staffId, classId: startClass = '', classes = [] }) {
  const kind = staffId ? 'staff' : 'student';
  const [classId, setClassId] = useState(startClass);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const { design, logoUrl } = useIdCardDesign();

  useEffect(() => {
    if (!studentId && !staffId && !classId) {
      setData(null);
      return;
    }
    setError('');
    const path = staffId
      ? `/documents/staff-id-cards?staffId=${staffId}`
      : `/documents/id-cards?${studentId ? `studentId=${studentId}` : `classId=${classId}`}`;
    api(path)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [studentId, staffId, classId]);

  const single = Boolean(studentId || staffId);
  return (
    <div className="idcards-popup">
      <div className="toolbar no-print" style={{ padding: 0, marginBottom: 14 }}>
        {!single && (
          <select value={classId} onChange={(e) => setClassId(e.target.value)} aria-label="Class">
            <option value="">Choose a class…</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}-{c.section}
              </option>
            ))}
          </select>
        )}
        {data?.cards.length > 0 && (
          <button type="button" onClick={() => window.print()}>
            Print {data.cards.length === 1 ? 'card' : `${data.cards.length} cards`}
          </button>
        )}
      </div>
      {error && <p className="error">{error}</p>}
      {data && !data.cards.length && (
        <p className="hint">No active {kind === 'staff' ? 'staff' : 'students'} to print.</p>
      )}
      {!single && !classId && <p className="hint">Choose a class to see its ID cards.</p>}
      <IdCardSheet data={data} kind={kind} design={design} logoUrl={logoUrl} />
    </div>
  );
}
