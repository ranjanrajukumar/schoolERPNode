import TableCard from '../../components/TableCard.jsx';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { CLASS_LINKS, FLOWS, RESPONSIBILITIES, ROLES } from './processContent.js';

const WHO = { admin: 'Admin', office: 'Office', teacher: 'Teacher', accountant: 'Accountant', parent: 'Parent' };
const MARK = { do: '●', see: '○', '': '' };

/** Every school process as a row of steps, each opening the screen that does it. Links go only where the signed-in role may go. */
export default function ProcessMap() {
  const role = useAuth().user?.role;
  const isAdmin = role === 'admin';

  return (
    <>
      <h1>Process map</h1>
      <p className="hint">How the school runs, step by step, and which screen carries out each step. Click a step to open it.{!isAdmin && ' Steps for other roles are shown so you can see where your work fits.'}</p>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Everything connected to a class</h2>
        <p className="hint" style={{ margin: '0 0 14px' }}>The class is the hub. Set it up once and each of these picks it up.</p>
        <div className="spokes">
          {CLASS_LINKS.map((l) => (
            <Link key={l.title} to={l.to} className="spoke">
              <span className="tile-icon blue" aria-hidden="true">{l.icon}</span>
              <span><b>{l.title}</b><small>{l.note}</small></span>
            </Link>
          ))}
        </div>
      </section>

      {FLOWS.map((flow) => (
        <section className="card flow" key={flow.id} id={flow.id}>
          <h2 style={{ marginTop: 0 }}>{flow.title}</h2>
          <p className="hint" style={{ margin: '0 0 14px' }}>{flow.blurb}</p>
          <ol className="steps">
            {flow.steps.map((s, i) => (
              <li key={s.title}>
                <Link to={s.to} className="step">
                  <span className="step-no">{i + 1}</span>
                  <b>{s.title}</b>
                  <small>{s.note}</small>
                  <span className={`who ${s.who}`}>{WHO[s.who]}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Who does what</h2>
        <p className="hint" style={{ margin: '0 0 12px' }}>● does it &nbsp; ○ can view. Access is enforced by the server, not only hidden in the menu.</p>
        <TableCard>
          <thead><tr><th>Task</th>{ROLES.map((r) => <th key={r} style={{ textAlign: 'center' }}>{r}</th>)}</tr></thead>
          <tbody>
            {RESPONSIBILITIES.map(([task, marks]) => (
              <tr key={task}><td>{task}</td>{marks.map((m, i) => <td key={ROLES[i]} style={{ textAlign: 'center' }} aria-label={m || 'no access'}>{MARK[m]}</td>)}</tr>
            ))}
          </tbody>
        </TableCard>
      </section>
    </>
  );
}
