import { useCallback, useEffect, useMemo, useState } from 'react';
import Gate from '../../components/Gate.jsx';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import StaffForm from './StaffForm.jsx';
import StaffDetails from './StaffDetails.jsx';
import PersonThumb from '../../components/PersonThumb.jsx';
import { usePhotoSet } from '../../hooks/usePhotoSet.js';
import IdCardsPopup from '../../components/IdCardsPopup.jsx';

const PAGE_SIZE = 10;
const TYPE = { permanent: 'Permanent', contract: 'Contract', part_time: 'Part time', visiting: 'Visiting' };
const CATEGORY = { teaching: 'Teaching', non_teaching: 'Non-teaching' };
const date = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const fullName = (r) => [r.firstName, r.middleName, r.lastName].filter(Boolean).join(' ');
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

function Tile({ icon, tone, label, value, onClick }) {
  const body = (
    <>
      <span className={`tile-icon ${tone}`} aria-hidden="true">
        {icon}
      </span>
      <span className="tile-text">
        <span>{label}</span>
        <b>{value}</b>
      </span>
    </>
  );
  return onClick ? (
    <button type="button" className="tile card tile-button" onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className="tile card">{body}</div>
  );
}

/** The staff directory: tiles, All / Active / Inactive tabs, search and department filter, a paged table. */
export default function Staff() {
  const canWrite = useAuth().user?.role === 'admin';
  const [rows, setRows] = useState([]);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [dept, setDept] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [entry, setEntry] = useState(null); // null = closed, {} = new, { id } = edit
  const [notice, setNotice] = useState('');
  const [details, setDetails] = useState(null); // a staff id whose full details are open
  const [card, setCard] = useState(null); // { id, name } whose ID card is open
  useOpenNew(() => setEntry({}), canWrite);

  const load = useCallback(() => {
    api('/staff')
      .then(setRows)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const departments = useMemo(
    () => [...new Set(rows.map((r) => r.departmentName).filter(Boolean))].sort(),
    [rows],
  );
  const count = (s) => rows.filter((r) => r.status === s).length;
  const shown = rows.filter((r) => {
    const text =
      `${r.staffNo} ${fullName(r)} ${r.designation ?? ''} ${r.phone ?? ''} ${r.email ?? ''}`.toLowerCase();
    return (
      (tab === 'all' ||
        (tab === 'teaching' || tab === 'non_teaching' ? r.staffCategory === tab : r.status === tab)) &&
      (!q || text.includes(q.trim().toLowerCase())) &&
      (!dept || r.departmentName === dept)
    );
  });
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const photos = usePhotoSet(
    'staff',
    pageRows.map((r) => r.id),
  );
  const from = shown.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const goTab = (t) => {
    setTab(t);
    setPage(1);
  };

  const remove = async (r) => {
    setError('');
    setNotice('');
    try {
      await api(`/staff/${r.id}`, { method: 'DELETE' });
      setNotice('Staff member deleted.');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const exportCsv = () => {
    const head = [
      'Staff no',
      'Name',
      'Designation',
      'Category',
      'Department',
      'Type',
      'Phone',
      'Email',
      'Joined',
      'Status',
    ];
    const lines = shown.map((r) =>
      [
        r.staffNo,
        fullName(r),
        r.designation,
        CATEGORY[r.staffCategory],
        r.departmentName,
        TYPE[r.employmentType],
        r.phone,
        r.email,
        r.joinDate,
        r.status,
      ]
        .map(csvCell)
        .join(','),
    );
    const url = URL.createObjectURL(
      new Blob([[head.map(csvCell).join(','), ...lines].join('\r\n')], { type: 'text/csv' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'staff.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    ['all', 'All staff', rows.length],
    ['teaching', 'Teaching', rows.filter((r) => r.staffCategory === 'teaching').length],
    ['non_teaching', 'Non-teaching', rows.filter((r) => r.staffCategory === 'non_teaching').length],
    ['active', 'Active', count('active')],
    ['inactive', 'Inactive', count('inactive')],
  ];
  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Staff</h1>
          <p className="hint">Manage staff records, roles and departments.</p>
        </div>
        <div className="head-actions">
          <Gate action="export">
            <button type="button" className="ghost" onClick={exportCsv}>
              ↓ Export
            </button>
          </Gate>
          {canWrite && (
            <button
              type="button"
              className="big-action"
              onClick={() => {
                setNotice('');
                setEntry({});
              }}
            >
              + Add staff
            </button>
          )}
        </div>
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && !entry && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="stats enquiry-tiles">
        <Tile icon="♙" tone="blue" label="Total staff" value={rows.length} onClick={() => goTab('all')} />
        <Tile
          icon="✓"
          tone="green"
          label="Active staff"
          value={count('active')}
          onClick={() => goTab('active')}
        />
        <Tile
          icon="◷"
          tone="amber"
          label="Inactive"
          value={count('inactive')}
          onClick={() => goTab('inactive')}
        />
        <Tile icon="▤" tone="violet" label="Departments" value={departments.length} />
      </div>

      <section className="card enquiry-card">
        <div className="tabs-line" role="tablist">
          {tabs.map(([k, l, n]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              className={tab === k ? 'on' : ''}
              onClick={() => goTab(k)}
            >
              {l}
              <span className="count">{n}</span>
            </button>
          ))}
        </div>
        <div className="toolbar">
          <label className="search-field">
            <span aria-hidden="true">⌕</span>
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, staff no, designation or phone…"
              aria-label="Search staff"
            />
          </label>
          <select
            value={dept}
            onChange={(e) => {
              setDept(e.target.value);
              setPage(1);
            }}
            aria-label="Department"
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <span className="showing">
            Showing{' '}
            <b>
              {from}–{Math.min(page * PAGE_SIZE, shown.length)}
            </b>{' '}
            of <b>{shown.length}</b>
          </span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Staff member</th>
                <th>Staff no</th>
                <th>Designation</th>
                <th>Category</th>
                <th>Department</th>
                <th>Type</th>
                <th>Contact</th>
                <th>Joined</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <span className="person">
                      <PersonThumb id={r.id} entity="staff" has={photos.has(r.id)} name={fullName(r)} />
                      <span>
                        <b>{fullName(r)}</b>
                        {r.email && <small className="block">{r.email}</small>}
                      </span>
                    </span>
                  </td>
                  <td className="muted-cell">{r.staffNo}</td>
                  <td>{r.designation}</td>
                  <td>{CATEGORY[r.staffCategory] ?? <span className="none">—</span>}</td>
                  <td>{r.departmentName ?? <span className="none">—</span>}</td>
                  <td>{TYPE[r.employmentType]}</td>
                  <td>{r.phone}</td>
                  <td>{date(r.joinDate)}</td>
                  <td>
                    <span className={`badge ${r.status === 'active' ? 'paid' : 'rejected'}`}>
                      ● {r.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="row-actions">
                    <button
                      type="button"
                      className="ghost more-btn"
                      aria-label={`All details of ${fullName(r)}`}
                      title="All details"
                      onClick={() => setDetails(r.id)}
                    >
                      ⋯
                    </button>
                    {canWrite && (
                      <>
                        <Gate action="edit">
                          <button
                            type="button"
                            className="ghost"
                            onClick={() => {
                              setNotice('');
                              setEntry({ id: r.id });
                            }}
                          >
                            Edit
                          </button>
                        </Gate>
                        <Gate action="delete">
                          <button type="button" className="ghost danger" onClick={() => remove(r)}>
                            Delete
                          </button>
                        </Gate>
                        {r.status === 'active' && (
                          <button
                            type="button"
                            className="ghost more-btn"
                            aria-label={`ID card of ${fullName(r)}`}
                            title="ID card"
                            onClick={() => setCard({ id: r.id, name: fullName(r) })}
                          >
                            ⋯
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {!pageRows.length && (
                <tr>
                  <td colSpan={10} className="empty-row">
                    {q || dept || tab !== 'all'
                      ? 'No staff match these filters.'
                      : 'No staff yet. Add the first with “Add staff”.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>

      <Modal open={Boolean(card)} title={card ? `ID card: ${card.name}` : ''} onClose={() => setCard(null)}>
        {card && <IdCardsPopup staffId={card.id} />}
      </Modal>

      <Modal
        open={Boolean(entry)}
        title={entry?.id ? 'Edit staff member' : 'New staff registration'}
        onClose={() => setEntry(null)}
      >
        {entry && (
          <StaffForm
            embedded
            id={entry.id}
            onCancel={() => setEntry(null)}
            onSaved={(r) => {
              setEntry(null);
              setNotice((r.created ? 'Staff member registered.' : 'Details saved.') + (r.photoNote ?? ''));
              load();
            }}
          />
        )}
      </Modal>

      <Modal open={Boolean(details)} title="Staff details" onClose={() => setDetails(null)}>
        {details && (
          <StaffDetails
            id={details}
            onEdit={
              canWrite
                ? (id) => {
                    setDetails(null);
                    setNotice('');
                    setEntry({ id });
                  }
                : undefined
            }
          />
        )}
      </Modal>
    </>
  );
}
