import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { api } from '../services/api.js';

const DEBOUNCE_MS = 250;
const MAX_SHOWN = 25;

const words = (q) => q.trim().toLowerCase().split(/s+/).filter(Boolean);
const textOf = (o) =>
  [o.label, o.sub, ...(o.details ?? []).map(([, v]) => v)].filter(Boolean).join(' ').toLowerCase();

/** The typed words picked out in a piece of text, so it is clear why a row matched. */
function Marked({ text, terms }) {
  const t = String(text ?? '');
  if (!terms.length) return t;
  const re = new RegExp(`(${terms.map((w) => w.replace(/[.*+?^${}()|[]\]/g, '\$&')).join('|')})`, 'ig');
  return t.split(re).map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part));
}

/**
 * Type a few letters, pick from the matches. Used wherever a form needs one student, staff member, parent or book,
 * instead of a dropdown holding every record. The server does the searching (/api/lookup/<kind>), so it stays fast with
 * thousands of records.
 *
 *   <TypeaheadSelect kind="students" value={form.studentId} onChange={(id, item) => ...} filters={{ status: 'active' }} required />
 *
 * `value` is an id (or ''), `onChange(id, item)` gets '' and null when cleared. Arrow keys move, Enter picks, Escape closes.
 *
 * Each option shows all of its fields side by side when the record has `details` ([[heading, value], ...]), and the typed words are
 * highlighted wherever they match. Typing several words narrows the list, in any order ("ravi 8a" finds Ravi Shah in 8-A).
 *
 * For any list that is already on the screen, pass `options` instead of `kind`; the search then happens in the browser, over every field:
 *
 *   <TypeaheadSelect options={rooms.map((r) => ({ id: r.id, label: r.name, details: [['Block', r.block], ['Seats', r.seats]] }))} ... />
 */
export default function TypeaheadSelect({
  kind,
  options: local = null,
  value,
  onChange,
  filters = {},
  required = false,
  disabled = false,
  placeholder = 'Type to search…',
  exclude = [],
}) {
  const listId = useId();
  const box = useRef(null);
  const [text, setText] = useState('');
  const [selected, setSelected] = useState(null);
  const [fetched, setFetched] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [state, setState] = useState('idle'); // idle | loading | error
  const filterKey = JSON.stringify(filters);
  const terms = words(text);
  const options = local
    ? local
        .filter(
          (o) => !exclude.map(String).includes(String(o.id)) && terms.every((w) => textOf(o).includes(w)),
        )
        .slice(0, MAX_SHOWN)
    : fetched;

  // A value that arrives from outside (editing a record, a link) is shown by name, fetched by id.
  useEffect(() => {
    if (!value) {
      setSelected(null);
      return;
    }
    if (selected && String(selected.id) === String(value)) return;
    if (local) {
      setSelected(local.find((o) => String(o.id) === String(value)) ?? null);
      return;
    }
    let cancelled = false;
    api(`/lookup/${kind}?id=${encodeURIComponent(value)}`)
      .then((rows) => {
        if (!cancelled && rows[0]) setSelected(rows[0]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [value, kind, local]); // eslint-disable-line react-hooks/exhaustive-deps

  const search = useCallback(
    (q) => {
      setState('loading');
      const params = new URLSearchParams({
        q,
        ...filters,
        ...(exclude.length && { exclude: exclude.join(',') }),
      });
      return api(`/lookup/${kind}?${params}`)
        .then((rows) => {
          setFetched(rows);
          setActive(0);
          setState('idle');
        })
        .catch(() => setState('error'));
    },
    [kind, filterKey, exclude.join(',')],
  ); // eslint-disable-line react-hooks/exhaustive-deps

  // Search as the person types, a moment after they pause.
  useEffect(() => {
    if (!open || local) return undefined;
    const t = setTimeout(() => search(text), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [text, open, search, local]);

  useEffect(() => {
    const away = (e) => {
      if (box.current && !box.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, []);

  const pick = (item) => {
    setSelected(item);
    setText('');
    setOpen(false);
    onChange(String(item.id), item);
  };
  const clear = () => {
    setSelected(null);
    setText('');
    onChange('', null);
    setOpen(true);
  };

  const onKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && open && options[active]) {
      e.preventDefault();
      pick(options[active]);
    } else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div className="typeahead" ref={box}>
      {selected ? (
        <div className="typeahead-chosen">
          <span>
            {selected.label}
            {selected.sub && <small> · {selected.sub}</small>}
          </span>
          {!disabled && (
            <button
              type="button"
              className="link"
              style={{ color: 'inherit' }}
              onClick={clear}
              aria-label="Clear selection"
            >
              ×
            </button>
          )}
          {/* keeps native form validation working: a required field with nothing chosen blocks submit */}
          <input
            className="typeahead-proxy"
            tabIndex={-1}
            value={String(selected.id)}
            required={required}
            readOnly
            aria-hidden="true"
          />
        </div>
      ) : (
        <>
          <input
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            autoComplete="off"
            disabled={disabled}
            value={text}
            placeholder={placeholder}
            required={required}
            onChange={(e) => {
              setText(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKey}
          />
          {open && (
            <ul className="typeahead-list" id={listId} role="listbox">
              {!local && state === 'loading' && !options.length && (
                <li className="typeahead-note">Searching…</li>
              )}
              {!local && state === 'error' && (
                <li className="typeahead-note">Could not search. Try again.</li>
              )}
              {(local || state === 'idle') && !options.length && <li className="typeahead-note">No match</li>}
              {options.map((o, i) => (
                <li
                  key={o.id}
                  role="option"
                  aria-selected={i === active}
                  className={i === active ? 'on' : ''}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(o);
                  }}
                  onMouseEnter={() => setActive(i)}
                >
                  {o.details?.length ? (
                    <span className="typeahead-cols">
                      {o.details.map(([heading, v]) => (
                        <span key={heading}>
                          <em>{heading}</em>
                          <Marked text={v} terms={terms} />
                        </span>
                      ))}
                    </span>
                  ) : (
                    <>
                      <Marked text={o.label} terms={terms} />
                      {o.sub && (
                        <small>
                          <Marked text={o.sub} terms={terms} />
                        </small>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
