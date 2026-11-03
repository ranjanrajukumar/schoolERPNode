import { BANDS, FORMATS, FORMULA_HELP, SUMMARY_FUNCS, headingOf, minBandHeight } from './designerModel.js';

const Num = ({ label, value, onChange, min = 0, max = 2000 }) => (
  <label className="rd-num">
    <small>{label}</small>
    <input
      type="number"
      min={min}
      max={max}
      value={Math.round(value * 10) / 10}
      onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || 0)))}
    />
  </label>
);

/** The right-hand panel: settings of the selected element, or of the selected band. */
export default function Properties({
  design,
  columns,
  selection,
  onElement,
  onDelete,
  onDuplicate,
  onBandHeight,
  onRemoveBand,
  onPickImage,
  contentWidth,
}) {
  if (!selection)
    return (
      <aside className="rd-side rd-right">
        <h3>Properties</h3>
        <p className="hint">
          Click an item on the page to change it, or a band’s name to change the band. Drag a field or tool
          from the left onto a band to add it.
        </p>
        <p className="hint">Arrow keys nudge the selected item. Delete removes it. Ctrl+Z undoes.</p>
      </aside>
    );

  const bandInfo = BANDS.find((b) => b.key === selection.band);
  const band = design.bands[selection.band];
  const el = selection.id ? band?.elements.find((x) => x.id === selection.id) : null;

  if (!el)
    return (
      <aside className="rd-side rd-right">
        <h3>{bandInfo?.label}</h3>
        <p className="hint">{bandInfo?.hint}</p>
        <Num
          label="Height (pt)"
          value={band.height}
          min={minBandHeight(band)}
          max={600}
          onChange={(v) => onBandHeight(selection.band, v)}
        />
        <p className="hint">
          The height cannot be less than the lowest item in the band ({Math.round(minBandHeight(band))} pt).
        </p>
        {!bandInfo?.required && (
          <button type="button" className="ghost danger" onClick={() => onRemoveBand(selection.band)}>
            Remove this band
          </button>
        )}
      </aside>
    );

  const set = (patch, key) =>
    onElement(selection.band, el.id, patch, key ?? `prop-${el.id}-${Object.keys(patch).join('')}`);
  const hasText = ['text', 'field', 'summary', 'formula', 'pageNumber'].includes(el.type);
  const hasFormat = ['field', 'summary', 'formula'].includes(el.type);

  return (
    <aside className="rd-side rd-right">
      <h3>
        {
          {
            text: 'Text',
            field: 'Field',
            summary: 'Total',
            formula: 'Formula',
            pageNumber: 'Page number',
            line: 'Line',
            box: 'Box',
            image: el.source === 'schoolLogo' ? 'School logo' : 'Picture',
          }[el.type]
        }
        <small> in {bandInfo?.label.toLowerCase()}</small>
      </h3>

      {(el.type === 'text' || el.type === 'pageNumber') && (
        <label className="rd-field-row stack">
          <span>{el.type === 'text' ? 'Text' : 'Wording'}</span>
          <textarea
            rows={2}
            maxLength={500}
            value={el.text ?? ''}
            onChange={(e) => set({ text: e.target.value }, `text-${el.id}`)}
          />
          <small className="hint">
            Fills in by itself: {'{{title}} {{group}} {{board}} {{affiliation}} {{printedOn}}'}
            {el.type === 'pageNumber' ? ' {{page}} {{pages}}' : ''}
          </small>
        </label>
      )}

      {el.type === 'formula' && (
        <label className="rd-field-row stack">
          <span>Formula</span>
          <textarea
            rows={3}
            maxLength={300}
            spellCheck={false}
            style={{ fontFamily: 'monospace' }}
            value={el.expr ?? ''}
            onChange={(e) => set({ expr: e.target.value }, `expr-${el.id}`)}
            aria-label="Formula"
          />
          <details>
            <summary className="hint">What can I write?</summary>
            <dl className="rd-help">
              {FORMULA_HELP.map(([name, text]) => (
                <div key={name}>
                  <dt>{name}</dt>
                  <dd>{text}</dd>
                </div>
              ))}
            </dl>
          </details>
          <small className="hint">A mistake is explained when you click Preview or Save.</small>
        </label>
      )}

      {(el.type === 'field' || el.type === 'summary') && (
        <label className="rd-field-row stack">
          <span>Field</span>
          <select value={el.field} onChange={(e) => set({ field: e.target.value })}>
            {columns.map((c) => (
              <option key={c} value={c}>
                {headingOf(c)}
              </option>
            ))}
          </select>
        </label>
      )}

      {el.type === 'summary' && (
        <>
          <label className="rd-field-row stack">
            <span>Calculation</span>
            <select value={el.func} onChange={(e) => set({ func: e.target.value })}>
              {SUMMARY_FUNCS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="rd-field-row stack">
            <span>Over</span>
            <select value={el.scope} onChange={(e) => set({ scope: e.target.value })}>
              <option value="report">The whole report</option>
              <option value="group" disabled={!['groupHeader', 'groupFooter'].includes(selection.band)}>
                Each group{' '}
                {['groupHeader', 'groupFooter'].includes(selection.band) ? '' : '(group bands only)'}
              </option>
            </select>
          </label>
        </>
      )}

      {hasFormat && (
        <label className="rd-field-row stack">
          <span>Shown as</span>
          <select value={el.format ?? 'text'} onChange={(e) => set({ format: e.target.value })}>
            {FORMATS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
      )}

      {hasText && (
        <>
          <div className="rd-two">
            <Num label="Size" value={el.size ?? 9} min={5} max={72} onChange={(v) => set({ size: v })} />
            <label className="rd-num">
              <small>Align</small>
              <select value={el.align ?? ''} onChange={(e) => set({ align: e.target.value || undefined })}>
                <option value="">Auto</option>
                <option value="left">Left</option>
                <option value="center">Centre</option>
                <option value="right">Right</option>
              </select>
            </label>
          </div>
          <div className="rd-style">
            <button
              type="button"
              className={`ghost${el.bold ? ' on' : ''}`}
              onClick={() => set({ bold: !el.bold })}
              aria-pressed={Boolean(el.bold)}
            >
              <b>B</b>
            </button>
            <button
              type="button"
              className={`ghost${el.italic ? ' on' : ''}`}
              onClick={() => set({ italic: !el.italic })}
              aria-pressed={Boolean(el.italic)}
            >
              <i>I</i>
            </button>
            <label title="Text colour">
              <input
                type="color"
                value={el.color ?? '#000000'}
                onChange={(e) => set({ color: e.target.value }, `color-${el.id}`)}
              />
            </label>
          </div>
        </>
      )}

      {(el.type === 'line' || el.type === 'box') && (
        <div className="rd-two">
          <label className="rd-num">
            <small>{el.type === 'line' ? 'Colour' : 'Border'}</small>
            <input
              type="color"
              value={el.color ?? '#000000'}
              onChange={(e) => set({ color: e.target.value }, `color-${el.id}`)}
            />
          </label>
          <Num
            label="Thickness"
            value={el.lineWidth ?? 1}
            min={0}
            max={10}
            onChange={(v) => set({ lineWidth: v })}
          />
          {el.type === 'box' && (
            <label className="rd-num">
              <small>Fill</small>
              <span className="rd-inline">
                <input
                  type="color"
                  value={el.fill ?? '#ffffff'}
                  onChange={(e) => set({ fill: e.target.value }, `fill-${el.id}`)}
                />
                <button type="button" className="link" onClick={() => set({ fill: undefined })}>
                  none
                </button>
              </span>
            </label>
          )}
        </div>
      )}

      {el.type === 'image' && el.source !== 'schoolLogo' && (
        <button type="button" className="ghost" onClick={() => onPickImage(selection.band, el.id)}>
          {el.data ? 'Change picture' : 'Choose a picture'}
        </button>
      )}

      <h4>Position and size (pt)</h4>
      <div className="rd-four rd-pos">
        <Num
          label="X"
          value={el.x}
          max={contentWidth}
          onChange={(v) => set({ x: Math.min(v, Math.max(0, contentWidth - el.width)) })}
        />
        <Num
          label="Y"
          value={el.y}
          max={600}
          onChange={(v) =>
            set({ y: Math.min(v, Math.max(0, band.height - (el.type === 'line' ? 0 : el.height))) })
          }
        />
        <Num
          label="Width"
          value={el.width}
          min={4}
          max={contentWidth}
          onChange={(v) => set({ width: Math.min(v, Math.max(4, contentWidth - el.x)) })}
        />
        {el.type !== 'line' && (
          <Num
            label="Height"
            value={el.height}
            min={4}
            max={band.height}
            onChange={(v) => set({ height: Math.min(v, Math.max(4, band.height - el.y)) })}
          />
        )}
      </div>

      <div className="rd-actions">
        <button type="button" className="ghost" onClick={() => onDuplicate(selection.band, el)}>
          Duplicate
        </button>
        <button type="button" className="ghost danger" onClick={() => onDelete(selection.band, el.id)}>
          Delete
        </button>
      </div>
    </aside>
  );
}
