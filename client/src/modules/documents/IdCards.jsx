import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import IdCardSheet from '../../components/IdCardSheet.jsx';
import { useIdCardDesign } from '../../components/idCardDesign.js';

function Tile({ icon, tone, label, value, hint }) {
  return (
    <div className="tile card">
      <span className={`tile-icon ${tone}`} aria-hidden="true">
        {icon}
      </span>
      <span className="tile-text">
        <span>{label}</span>
        <b>{value}</b>
        {hint && <small>{hint}</small>}
      </span>
    </div>
  );
}

/** Pick a class and print ID cards for its active students. */
export default function IdCards() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const { design, logoUrl } = useIdCardDesign();

  useEffect(() => {
    api('/classes').then(setClasses);
  }, []);
  useEffect(() => {
    if (!classId) {
      setData(null);
      return;
    }
    api(`/documents/id-cards?classId=${classId}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [classId]);

  const chosen = classes.find((c) => String(c.id) === String(classId));
  const cards = data?.cards.length ?? 0;

  return (
    <>
      <div className="profile-head no-print">
        <div>
          <h1>Student ID cards</h1>
          <p className="hint">Choose a class to preview and print ID cards for its active students.</p>
        </div>
        <div className="head-actions">
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            aria-label="Class"
            style={{ minHeight: 44 }}
          >
            <option value="">-- choose class --</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}-{c.section}
              </option>
            ))}
          </select>
          {cards > 0 && (
            <button type="button" className="big-action" onClick={() => window.print()}>
              Print {cards} cards
            </button>
          )}
        </div>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="stats enquiry-tiles four no-print">
        <Tile icon="▤" tone="blue" label="Classes" value={classes.length} />
        <Tile
          icon="♙"
          tone="green"
          label="Class chosen"
          value={chosen ? `${chosen.name}-${chosen.section}` : '—'}
        />
        <Tile icon="▣" tone="violet" label="Cards ready" value={cards} />
        <Tile icon="◷" tone="amber" label="Details on each card" value={design.student.fields.length} />
      </div>

      {data && !data.cards.length && <p className="hint">No active students in this class.</p>}
      <IdCardSheet data={data} design={design} logoUrl={logoUrl} />
    </>
  );
}
