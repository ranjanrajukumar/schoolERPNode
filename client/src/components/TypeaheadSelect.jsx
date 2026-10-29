import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { api } from '../services/api.js';

const DEBOUNCE_MS = 250;

/**
 * Type a few letters, pick from the matches. Used wherever a form needs one student, staff member, parent or book,
 * instead of a dropdown holding every record. The server does the searching (/api/lookup/<kind>), so it stays fast with
 * thousands of records.
 *
 *   <TypeaheadSelect kind="students" value={form.studentId} onChange={(id, item) => ...} filters={{ status: 'active' }} required />
 *
 * `value` is an id (or ''), `onChange(id, item)` gets '' and null when cleared. Arrow keys move, Enter picks, Escape closes.
 */
export default function TypeaheadSelect({
  kind,
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
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [state, setState] = useState('idle'); // idle | loading | error
  const filterKey = JSON.stringify(filters);

  // A value that arrives from outside (editing a record, a link) is shown by name, fetched by id.
  useEffect(() => {
    if (!value) {
      setSelected(null);
      return;
    }
    if (selected && String(selected.id) === String(value)) return;
    let cancelled = false;
    api(`/lookup/${kind}?id=${encodeURIComponent(value)}`)
      .then((rows) => {
        if (!cancelled && rows[0]) setSelected(rows[0]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [value, kind]); // eslint-disable-line react-hooks/exhaustive-deps

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
          setOptions(rows);
          setActive(0);
          setState('idle');
        })
        .catch(() => setState('error'));
    },
    [kind, filterKey, exclude.join(',')],
  ); // eslint-disable-line react-hooks/exhaustive-deps

  // Search as the person types, a moment after they pause.
  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => search(text), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [text, open, search]);

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
              {state === 'loading' && !options.length && <li className="typeahead-note">Searching…</li>}
              {state === 'error' && <li className="typeahead-note">Could not search. Try again.</li>}
              {state === 'idle' && !options.length && <li className="typeahead-note">No match</li>}
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
                  {o.label}
                  {o.sub && <small>{o.sub}</small>}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
