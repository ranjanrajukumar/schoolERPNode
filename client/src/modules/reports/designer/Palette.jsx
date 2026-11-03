import { useState } from 'react';
import { BANDS, FILTER_OPS, PAGE_SIZES, TOOLS, headingOf } from './designerModel.js';

const drag = (item) => (e) => {
  e.dataTransfer.setData('application/x-report-item', JSON.stringify(item));
  e.dataTransfer.effectAllowed = 'copy';
};

const NEEDS_VALUE = (op) => !['empty', 'not_empty'].includes(op);

function FieldsTab({ datasets, design, columns, onDataset }) {
  return (
    <div className="rd-tab">
      <label className="rd-field-row">
        <span>Data</span>
        <select value={design.dataset} onChange={(e) => onDataset(e.target.value)}>
          <option value="">-- choose --</option>
          {datasets.map((d) => (
            <option key={d.key} value={d.key}>
              {d.label}
            </option>
          ))}
        </select>
      </label>

      <h4>Fields</h4>
      <p className="hint">
        Drag a field onto a band. In the detail it shows the value; in a group or report footer it becomes a
        total.
      </p>
      <ul className="rd-chips">
        {columns.map((c) => (
          <li
            key={c}
            draggable
            onDragStart={drag({ kind: 'field', field: c })}
            title={`Drag ${c} onto the page`}
          >
            {headingOf(c)}
          </li>
        ))}
        {!columns.length && <li className="rd-empty">Choose the data first</li>}
      </ul>

      <h4>Tools</h4>
      <ul className="rd-chips tools">
        {TOOLS.map((t) => (
          <li key={t.tool} draggable onDragStart={drag({ kind: 'tool', tool: t.tool })} title={t.hint}>
            <span aria-hidden="true">{t.icon}</span> {t.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReportTab({ design, columns, board, setBoard, onChange, onGroupBy, onToggleBand }) {
  const set = (patch, key) => onChange({ ...design, ...patch }, key);
  const setPage = (patch, key) => set({ page: { ...design.page, ...patch } }, key);
  const margins = design.page?.margins ?? [36, 36, 36, 36];
  const sort = design.sort ?? [];
  const filters = design.filters ?? [];
  const opts = (
    <>
      <option value="">--</option>
      {columns.map((c) => (
        <option key={c} value={c}>
          {headingOf(c)}
        </option>
      ))}
    </>
  );

  return (
    <div className="rd-tab">
      <label className="rd-field-row">
        <span>Title</span>
        <input
          value={design.title ?? ''}
          maxLength={120}
          onChange={(e) => set({ title: e.target.value }, 'title')}
        />
      </label>

      <h4>Page</h4>
      <div className="rd-two">
        <select
          value={design.page?.size ?? 'A4'}
          onChange={(e) => setPage({ size: e.target.value })}
          aria-label="Page size"
        >
          {Object.keys(PAGE_SIZES).map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          value={design.page?.orientation ?? 'portrait'}
          onChange={(e) => setPage({ orientation: e.target.value })}
          aria-label="Orientation"
        >
          <option value="portrait">Portrait</option>
          <option value="landscape">Landscape</option>
        </select>
      </div>
      <div className="rd-four">
        {['Left', 'Top', 'Right', 'Bottom'].map((name, i) => (
          <label key={name}>
            <small>{name}</small>
            <input
              type="number"
              min="0"
              max="150"
              value={margins[i]}
              onChange={(e) =>
                setPage(
                  {
                    margins: margins.map((m, j) =>
                      j === i ? Math.min(150, Math.max(0, Number(e.target.value) || 0)) : m,
                    ),
                  },
                  'margin',
                )
              }
            />
          </label>
        ))}
      </div>

      <h4>Board</h4>
      <select value={board} onChange={(e) => setBoard(e.target.value)} aria-label="Board">
        <option value="">Any (all classes)</option>
        <option>CBSE</option>
        <option>UP Board</option>
      </select>
      <p className="hint">
        A report tied to a board sees only that board’s classes. It needs data with a class, such as Students.
      </p>

      <h4>Grouping</h4>
      <select
        value={design.groupBy ?? ''}
        onChange={(e) => onGroupBy(e.target.value || null)}
        aria-label="Group by"
      >
        <option value="">No grouping</option>
        {columns.map((c) => (
          <option key={c} value={c}>
            Group by {headingOf(c)}
          </option>
        ))}
      </select>
      {design.groupBy && (
        <label className="rd-check">
          <input
            type="checkbox"
            checked={Boolean(design.pageBreakPerGroup)}
            onChange={(e) => set({ pageBreakPerGroup: e.target.checked })}
          />{' '}
          Start each group on a new page
        </label>
      )}

      <h4>Sort</h4>
      {sort.map((s, i) => (
        <div key={i} className="rd-two">
          <select
            value={s.field}
            onChange={(e) =>
              set({ sort: sort.map((x, j) => (j === i ? { ...x, field: e.target.value } : x)) })
            }
            aria-label="Sort field"
          >
            {opts}
          </select>
          <span className="rd-inline">
            <select
              value={s.dir ?? 'asc'}
              onChange={(e) =>
                set({ sort: sort.map((x, j) => (j === i ? { ...x, dir: e.target.value } : x)) })
              }
              aria-label="Sort direction"
            >
              <option value="asc">A to Z</option>
              <option value="desc">Z to A</option>
            </select>
            <button
              type="button"
              className="link"
              onClick={() => set({ sort: sort.filter((_, j) => j !== i) })}
              aria-label="Remove sort"
            >
              ×
            </button>
          </span>
        </div>
      ))}
      {sort.length < 3 && (
        <button
          type="button"
          className="ghost"
          disabled={!columns.length}
          onClick={() => set({ sort: [...sort, { field: columns[0], dir: 'asc' }] })}
        >
          + Sort field
        </button>
      )}

      <h4>Filters</h4>
      {filters.map((f, i) => (
        <div key={i} className="rd-filter">
          <select
            value={f.column}
            onChange={(e) =>
              set({ filters: filters.map((x, j) => (j === i ? { ...x, column: e.target.value } : x)) })
            }
            aria-label="Filter field"
          >
            {opts}
          </select>
          <select
            value={f.op}
            onChange={(e) =>
              set({ filters: filters.map((x, j) => (j === i ? { ...x, op: e.target.value } : x)) })
            }
            aria-label="Filter test"
          >
            {FILTER_OPS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          {NEEDS_VALUE(f.op) && (
            <input
              value={f.value ?? ''}
              onChange={(e) =>
                set(
                  { filters: filters.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) },
                  `filter-${i}`,
                )
              }
              aria-label="Filter value"
            />
          )}
          <button
            type="button"
            className="link"
            onClick={() => set({ filters: filters.filter((_, j) => j !== i) })}
            aria-label="Remove filter"
          >
            ×
          </button>
        </div>
      ))}
      {filters.length < 10 && (
        <button
          type="button"
          className="ghost"
          disabled={!columns.length}
          onClick={() => set({ filters: [...filters, { column: columns[0], op: 'contains', value: '' }] })}
        >
          + Filter
        </button>
      )}

      <h4>Bands</h4>
      <ul className="rd-bands">
        {BANDS.map((b) => {
          const disabled = b.required || (b.needsGroup && !design.groupBy);
          return (
            <li key={b.key} title={b.needsGroup && !design.groupBy ? 'Choose a group field first' : b.hint}>
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(design.bands[b.key])}
                  disabled={disabled}
                  onChange={(e) => onToggleBand(b.key, e.target.checked)}
                />{' '}
                {b.label}
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function Palette(props) {
  const [tab, setTab] = useState('fields');
  return (
    <aside className="rd-side rd-left">
      <div className="tabs rd-tabs" role="tablist">
        {[
          ['fields', 'Fields'],
          ['report', 'Report'],
        ].map(([k, l]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            className={`tab${tab === k ? ' active' : ''}`}
            onClick={() => setTab(k)}
          >
            {l}
          </button>
        ))}
      </div>
      {tab === 'fields' ? <FieldsTab {...props} /> : <ReportTab {...props} />}
    </aside>
  );
}
