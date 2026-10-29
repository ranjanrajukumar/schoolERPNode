import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';

const APPLIES = { staff: 'Staff', student: 'Students', both: 'Staff and students' };
const APPROVER_OPTIONS = {
  staff: [
    ['admin', 'Admin only'],
    ['department_head', 'Department head or admin'],
  ],
  student: [
    ['admin', 'Admin only'],
    ['class_teacher', 'Class teacher or admin'],
  ],
  both: [
    ['admin', 'Admin only'],
    ['department_head', 'Department head (staff) / class teacher (students), or admin'],
    ['class_teacher', 'Admin (staff) / class teacher (students)'],
  ],
};
const approvedBy = (t) => {
  const staffSide = t.approver === 'department_head' ? 'Department head or admin' : 'Admin';
  const studentSide = t.approver === 'admin' ? 'Admin only' : 'Class teacher or admin';
  return t.appliesTo === 'staff' ? (
    staffSide
  ) : t.appliesTo === 'student' ? (
    studentSide
  ) : (
    <>
      {staffSide}
      <small className="block">students: {studentSide.toLowerCase()}</small>
    </>
  );
};
const EMPTY = {
  name: '',
  appliesTo: 'staff',
  yearlyDays: '',
  paid: true,
  approver: 'admin',
  autoApproveDays: '',
  active: true,
};

function Tile({ icon, tone, label, value }) {
  return (
    <div className="tile card">
      <span className={`tile-icon ${tone}`} aria-hidden="true">
        {icon}
      </span>
      <span className="tile-text">
        <span>{label}</span>
        <b>{value}</b>
      </span>
    </div>
  );
}

/** Leave setup: the kinds of leave the school offers, each with a yearly limit, who approves it and an optional auto-approve. */
export default function LeaveTypes() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(null); // null = closed; { id? } while editing
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useOpenNew(() => openNew()); // eslint-disable-line no-use-before-define

  const load = useCallback(() => {
    api('/leave-types?all=1')
      .then(setRows)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const openNew = () => {
    setError('');
    setNotice('');
    setForm(EMPTY);
  };
  const edit = (t) => {
    setError('');
    setNotice('');
    setForm({ ...t, yearlyDays: t.yearlyDays ?? '', autoApproveDays: t.autoApproveDays ?? '' });
  };
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api(form.id ? `/leave-types/${form.id}` : '/leave-types', {
        method: form.id ? 'PUT' : 'POST',
        body: form,
      });
      setNotice(form.id ? 'Leave type saved.' : 'Leave type added.');
      setForm(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const toggle = async (t) => {
    setError('');
    setNotice('');
    try {
      await api(`/leave-types/${t.id}`, { method: 'PUT', body: { ...t, active: !t.active } });
      load();
    } catch (err) {
      setError(err.message);
    }
  };
  const remove = async (t) => {
    setError('');
    setNotice('');
    try {
      await api(`/leave-types/${t.id}`, { method: 'DELETE' });
      setNotice('Leave type deleted.');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const active = rows.filter((r) => r.active);
  const set = (k) => (e) =>
    setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Leave types &amp; approval</h1>
          <p className="hint">
            Set up the kinds of leave your school offers. Each type has a yearly limit, says who approves it,
            and can approve short requests automatically. Staff and parents choose from these when they apply.
          </p>
        </div>
        <div className="head-actions">
          <button type="button" className="big-action" onClick={openNew}>
            ＋ Add leave type
          </button>
        </div>
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && !form && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="stats enquiry-tiles four">
        <Tile icon="▤" tone="blue" label="Leave types" value={active.length} />
        <Tile
          icon="♙"
          tone="violet"
          label="For staff"
          value={active.filter((t) => t.appliesTo !== 'student').length}
        />
        <Tile
          icon="✎"
          tone="green"
          label="For students"
          value={active.filter((t) => t.appliesTo !== 'staff').length}
        />
        <Tile
          icon="✓"
          tone="amber"
          label="Auto-approve"
          value={active.filter((t) => t.autoApproveDays !== null).length}
        />
      </div>

      <section className="card enquiry-card">
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Leave type</th>
                <th>Applies to</th>
                <th>Yearly limit</th>
                <th>Pay</th>
                <th>Approved by</th>
                <th>Auto-approve</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td>
                    <b>{t.name}</b>
                  </td>
                  <td>{APPLIES[t.appliesTo]}</td>
                  <td>{t.yearlyDays === null ? 'No limit' : `${t.yearlyDays} days`}</td>
                  <td>{t.paid ? 'Paid' : 'Unpaid'}</td>
                  <td>{approvedBy(t)}</td>
                  <td>
                    {t.autoApproveDays === null
                      ? '—'
                      : `up to ${t.autoApproveDays} day${t.autoApproveDays === 1 ? '' : 's'}`}
                  </td>
                  <td>
                    <span className={`badge ${t.active ? 'paid' : 'rejected'}`}>
                      ● {t.active ? 'Active' : 'Off'}
                    </span>
                  </td>
                  <td className="row-actions">
                    <button type="button" className="ghost" onClick={() => edit(t)}>
                      Edit
                    </button>
                    <button type="button" className="ghost" onClick={() => toggle(t)}>
                      {t.active ? 'Switch off' : 'Switch on'}
                    </button>
                    <button type="button" className="ghost danger" onClick={() => remove(t)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={8} className="empty-row">
                    No leave types yet. Add the first with “Add leave type”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        open={Boolean(form)}
        title={form?.id ? 'Edit leave type' : 'New leave type'}
        wide={false}
        onClose={() => setForm(null)}
      >
        {form && (
          <form onSubmit={save} className="enquiry-form">
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="enq-grid">
              <label className="wide">
                <span>Name *</span>
                <input
                  value={form.name}
                  onChange={set('name')}
                  placeholder="Maternity leave"
                  required
                  maxLength={60}
                />
              </label>
              <label>
                <span>Applies to</span>
                <select
                  value={form.appliesTo}
                  onChange={(e) => setForm({ ...form, appliesTo: e.target.value, approver: 'admin' })}
                >
                  {Object.entries(APPLIES).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Yearly limit (days)</span>
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={form.yearlyDays}
                  onChange={set('yearlyDays')}
                  placeholder="blank = no limit"
                />
              </label>
              <label>
                <span>Approved by</span>
                <select value={form.approver} onChange={set('approver')}>
                  {APPROVER_OPTIONS[form.appliesTo].map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Auto-approve up to (days)</span>
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={form.autoApproveDays}
                  onChange={set('autoApproveDays')}
                  placeholder="blank = always needs approval"
                />
              </label>
              <label className="check">
                <input type="checkbox" checked={form.paid} onChange={set('paid')} /> <span>Paid leave</span>
              </label>
              <label className="check">
                <input type="checkbox" checked={form.active} onChange={set('active')} />{' '}
                <span>Available to apply for</span>
              </label>
            </div>
            <p className="hint">
              An admin can always decide any leave. Department heads are chosen under Staff &amp; HR →
              Departments, class teachers under Classes. A request that is within the auto-approve days and
              the yearly limit is approved the moment it is applied for.
            </p>
            <div className="form-actions">
              <button type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save'}
              </button>
              <button type="button" className="ghost" onClick={() => setForm(null)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
