const ACTION = { submitted: 'Submitted', replied: 'Reply', status: 'Status changed', escalated: 'Escalated', auto_escalated: 'Escalated automatically' };
const when = (d) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/**
 * The three-step grievance ladder with the current level lit, and a settled / pending note.
 *   <GrievanceLadder levels={levels} level={2} settled={false} />
 */
export function GrievanceLadder({ levels, level, settled = false }) {
  return (
    <ol className="ladder" aria-label="Grievance levels">
      {levels.map((l) => {
        const state = l.level < level ? 'done' : l.level === level ? (settled ? 'done' : 'now') : 'todo';
        return (
          <li key={l.level} className={state}>
            <span className="dot" aria-hidden="true">{state === 'done' ? '✓' : l.level}</span>
            <span className="name">{l.label}</span>
            {state === 'now' && <small>with them now</small>}
          </li>
        );
      })}
    </ol>
  );
}

/** What has happened to an item, oldest first. */
export function Timeline({ items }) {
  if (!items?.length) return null;
  return (
    <ul className="timeline">
      {items.map((t, i) => (
        <li key={i}>
          <b>{ACTION[t.action] ?? t.action}</b> <small>· {t.levelLabel} · {when(t.at)}{t.by ? ` · ${t.by}` : ''}</small>
          {t.note && <p>{t.note}</p>}
        </li>
      ))}
    </ul>
  );
}
