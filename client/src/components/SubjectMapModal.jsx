import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import Modal from './Modal.jsx';
import TypeaheadSelect from './TypeaheadSelect.jsx';

const COMPONENTS = [
  ['theory', 'Theory'],
  ['practical', 'Practical'],
  ['theory_practical', 'Theory + practical'],
];
const NEW = '__new__'; // the "create a subject here" choice in the subject list
const EMPTY = {
  subjectId: '',
  staffId: '',
  component: 'theory',
  isElective: false,
  electiveGroup: '',
  periodsPerWeek: '',
  practicalShare: '',
};

const fromRow = (s) => ({
  subjectId: s.subjectId,
  staffId: s.staffId ?? '',
  component: s.component,
  isElective: s.isElective,
  electiveGroup: s.electiveGroup ?? '',
  periodsPerWeek: s.periodsPerWeek ?? '',
  practicalShare: s.practicalShare ?? '',
});

/**
 * The popup that adds a subject to a class's subject map, or edits one that is already there. Used on the Subject map page and
 * on the Class map page. `subject` is the row being edited (or null to add); `groups` are the elective group names already in
 * the class, offered as suggestions. Calls onSaved(message) after a successful save.
 */
export default function SubjectMapModal({ open, classId, subject, groups = [], onClose, onSaved }) {
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [fresh, setFresh] = useState({ name: '', code: '' }); // a subject created on the spot

  useEffect(() => {
    if (open)
      api('/subjects')
        .then(setSubjects)
        .catch(() => {});
  }, [open]);
  useEffect(() => {
    if (open) {
      setError('');
      setForm(subject ? fromRow(subject) : EMPTY);
      setFresh({ name: '', code: '' });
    }
  }, [open, subject]);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      let subjectId = form.subjectId;
      let made = false;
      if (!subject && subjectId === NEW) {
        // a subject that does not exist yet is created first, then added to the class
        subjectId = (
          await api('/subjects', {
            method: 'POST',
            body: { name: fresh.name.trim(), code: fresh.code.trim() },
          })
        ).id;
        made = true;
      }
      await api(subject ? `/class-subjects/${subject.id}` : '/class-subjects', {
        method: subject ? 'PUT' : 'POST',
        body: { ...form, subjectId, classId },
      });
      onSaved(
        subject
          ? 'Subject updated.'
          : made
            ? `${fresh.name.trim()} was created and added to the class.`
            : 'Subject added to the class.',
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title={subject ? 'Edit subject in this class' : 'Add a subject to this class'}
      wide={false}
      onClose={onClose}
    >
      <form onSubmit={save} className="enquiry-form">
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="enq-grid">
          <label className="wide">
            <span>Subject *</span>
            <select value={form.subjectId} onChange={set('subjectId')} required disabled={Boolean(subject)}>
              <option value="">Choose a subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
              {!subject && <option value={NEW}>＋ New subject…</option>}
            </select>
          </label>
          {form.subjectId === NEW && (
            <>
              <label>
                <span>New subject name *</span>
                <input
                  value={fresh.name}
                  onChange={(e) =>
                    setFresh({
                      name: e.target.value,
                      code:
                        fresh.code ||
                        e.target.value
                          .replace(/[^A-Za-z]/g, '')
                          .slice(0, 4)
                          .toUpperCase(),
                    })
                  }
                  required
                  maxLength={80}
                  placeholder="e.g. Computer Science"
                />
              </label>
              <label>
                <span>Subject code *</span>
                <input
                  value={fresh.code}
                  onChange={(e) => setFresh({ ...fresh, code: e.target.value.toUpperCase() })}
                  required
                  maxLength={20}
                  placeholder="e.g. CS"
                />
              </label>
            </>
          )}
          <label className="wide">
            <span>Teacher</span>
            <TypeaheadSelect
              kind="staff"
              value={form.staffId}
              onChange={(id) => setForm({ ...form, staffId: id })}
              filters={{ status: 'active' }}
              placeholder="Teacher name"
            />
          </label>
          <label>
            <span>Taught as</span>
            <select value={form.component} onChange={set('component')}>
              {COMPONENTS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Periods per week</span>
            <input
              type="number"
              min="0"
              max="30"
              value={form.periodsPerWeek}
              onChange={set('periodsPerWeek')}
            />
          </label>
          {form.component === 'theory_practical' && (
            <label className="wide">
              <span>Practical share of the marks (%)</span>
              <input
                type="number"
                min="1"
                max="99"
                value={form.practicalShare}
                onChange={set('practicalShare')}
                placeholder="e.g. 30"
              />
              <small className="field-note">
                With a share set, exams take a theory mark and a practical mark: 30% of 100 marks is 70 theory
                + 30 practical. Leave it empty to keep one mark for the subject.
              </small>
            </label>
          )}
          <label className="wide check-row">
            <span className="check-list">
              <label>
                <input
                  type="checkbox"
                  checked={form.isElective}
                  onChange={(e) => setForm({ ...form, isElective: e.target.checked })}
                />{' '}
                Elective: only students who choose it take it
              </label>
            </span>
          </label>
          {form.isElective && (
            <label className="wide">
              <span>Elective group</span>
              <input
                list="elective-groups"
                value={form.electiveGroup}
                onChange={set('electiveGroup')}
                placeholder="e.g. Second language"
                maxLength={50}
              />
              <datalist id="elective-groups">
                {groups.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
              <small className="field-note">
                Subjects with the same group are alternatives: a student takes one of them.
              </small>
            </label>
          )}
        </div>
        <div className="form-actions">
          <button type="submit" disabled={busy}>
            {busy ? 'Saving…' : subject ? 'Save changes' : 'Add subject'}
          </button>
          <button type="button" className="ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
