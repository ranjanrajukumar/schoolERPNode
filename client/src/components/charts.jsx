/** Small inline-SVG charts for the dashboard. No library: they stay crisp, theme-aware (colours come from CSS) and light. */

/** Ring showing how a whole splits into parts. segments: [{ label, value, className }] */
export function Donut({ segments, centre, caption, size = 140 }) {
  const total = segments.reduce((n, s) => n + s.value, 0);
  const r = 52;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut">
      <svg viewBox="0 0 140 140" width={size} height={size} role="img" aria-label={`${caption}: ${segments.map((s) => `${s.value} ${s.label}`).join(', ')}`}>
        <circle cx="70" cy="70" r={r} fill="none" strokeWidth="16" className="donut-track" />
        {total > 0 && segments.map((s) => {
          const len = (s.value / total) * c;
          const el = <circle key={s.label} cx="70" cy="70" r={r} fill="none" strokeWidth="16" className={s.className} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} transform="rotate(-90 70 70)" />;
          offset += len;
          return el;
        })}
        <text x="70" y="68" textAnchor="middle" className="donut-centre">{centre}</text>
        <text x="70" y="88" textAnchor="middle" className="donut-caption">{caption}</text>
      </svg>
      <ul className="legend">{segments.map((s) => <li key={s.label}><i className={`dot ${s.className}`} />{s.label} <b>{s.value}</b></li>)}</ul>
    </div>
  );
}

/** Vertical bars. data: [{ label, value, note? }]; null values draw as an empty slot. */
export function Bars({ data, format = (v) => v, caption, max, className = 'bar-fill' }) {
  const top = max ?? Math.max(1, ...data.map((d) => d.value ?? 0));
  const w = 360;
  const h = 150;
  const slot = w / data.length;
  return (
    <svg viewBox={`0 0 ${w} ${h + 28}`} className="bars" role="img" aria-label={`${caption}: ${data.map((d) => `${d.label} ${d.value === null ? 'no data' : format(d.value)}`).join(', ')}`}>
      {[0.25, 0.5, 0.75, 1].map((g) => <line key={g} x1="0" x2={w} y1={h - g * (h - 18)} y2={h - g * (h - 18)} className="grid-line" />)}
      {data.map((d, i) => {
        const bar = d.value === null ? 0 : Math.max(2, (d.value / top) * (h - 18));
        const x = i * slot + slot * 0.2;
        return (
          <g key={d.label}>
            <rect x={x} y={h - bar} width={slot * 0.6} height={bar} rx="6" className={d.value === null ? 'bar-empty' : className}>
              <title>{d.label}: {d.value === null ? 'nothing recorded' : format(d.value)}</title>
            </rect>
            {d.value !== null && <text x={x + slot * 0.3} y={h - bar - 5} textAnchor="middle" className="bar-value">{format(d.value)}</text>}
            <text x={x + slot * 0.3} y={h + 18} textAnchor="middle" className="bar-label">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
