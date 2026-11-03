import { useRef } from 'react';
import { Rnd } from 'react-rnd';
import { BANDS, headingOf } from './designerModel.js';

/** What an element shows on the canvas, so the layout can be judged while it is being built. */
function Face({ el }) {
  const style = {
    fontSize: `${(el.size ?? 9) * 1}px`,
    fontWeight: el.bold ? 700 : 400,
    fontStyle: el.italic ? 'italic' : 'normal',
    color: el.color ?? '#000',
    textAlign:
      el.align ??
      (el.type === 'summary' || el.format === 'number' || el.format === 'currency' ? 'right' : 'left'),
  };
  if (el.type === 'line')
    return (
      <div className="rd-line" style={{ borderTop: `${el.lineWidth ?? 1}px solid ${el.color ?? '#000'}` }} />
    );
  if (el.type === 'box')
    return (
      <div
        className="rd-box"
        style={{
          border: `${el.lineWidth ?? 1}px solid ${el.color ?? '#000'}`,
          background: el.fill ?? 'transparent',
        }}
      />
    );
  if (el.type === 'image')
    return el.source === 'schoolLogo' ? (
      <div className="rd-image">School logo</div>
    ) : el.data ? (
      <img
        src={el.data}
        alt=""
        draggable={false}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    ) : (
      <div className="rd-image">Picture</div>
    );
  if (el.type === 'field')
    return (
      <div className="rd-text rd-field" style={style}>
        [{headingOf(el.field)}]
      </div>
    );
  if (el.type === 'summary')
    return (
      <div className="rd-text rd-summary" style={style}>
        {el.func}({headingOf(el.field)}){el.scope === 'group' ? ' · group' : ' · report'}
      </div>
    );
  if (el.type === 'formula')
    return (
      <div className="rd-text rd-formula" style={style}>
        ƒ {el.expr}
      </div>
    );
  if (el.type === 'pageNumber')
    return (
      <div className="rd-text" style={style}>
        {el.text ?? 'Page {{page}} of {{pages}}'}
      </div>
    );
  return (
    <div className="rd-text" style={style}>
      {el.text}
    </div>
  );
}

/**
 * The page: each band is a strip of its own height holding its elements. Elements move and resize inside their band, fields and
 * tools dropped from the palette land where they are let go, and the bottom edge of a band can be dragged to change its height.
 */
export default function Canvas({
  design,
  geo,
  zoom,
  selection,
  onSelect,
  onElementChange,
  onDrop,
  onBandHeight,
  onNudge,
}) {
  const bandRefs = useRef({});
  const present = BANDS.filter((b) => design.bands[b.key]);

  const dropOn = (bandKey) => (e) => {
    e.preventDefault();
    let item;
    try {
      item = JSON.parse(e.dataTransfer.getData('application/x-report-item'));
    } catch {
      return;
    }
    const rect = bandRefs.current[bandKey].getBoundingClientRect();
    onDrop(bandKey, item, (e.clientX - rect.left) / zoom, (e.clientY - rect.top) / zoom);
  };

  const startResize = (bandKey) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const startH = design.bands[bandKey].height;
    const move = (ev) => onBandHeight(bandKey, startH + (ev.clientY - startY) / zoom, true);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div className="rd-page-wrap" onPointerDown={() => onSelect(null)}>
      <div
        className="rd-page"
        style={{ width: geo.contentWidth * zoom }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {present.map((b) => {
          const band = design.bands[b.key];
          const bandSelected = selection?.band === b.key && !selection.id;
          return (
            <section key={b.key} className={`rd-band${bandSelected ? ' selected' : ''}`}>
              <div
                role="button"
                tabIndex={0}
                className="rd-band-tag"
                onClick={() => onSelect({ band: b.key })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect({ band: b.key });
                  }
                }}
                title={b.hint}
              >
                {b.label}
              </div>
              <div
                ref={(n) => (bandRefs.current[b.key] = n)}
                className="rd-band-body"
                style={{ height: band.height * zoom }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={dropOn(b.key)}
                onPointerDown={(e) => {
                  if (e.target === e.currentTarget) onSelect({ band: b.key });
                }}
              >
                {band.elements.map((el) => {
                  const selected = selection?.band === b.key && selection.id === el.id;
                  const isLine = el.type === 'line';
                  return (
                    <Rnd
                      key={el.id}
                      bounds="parent"
                      position={{ x: el.x * zoom, y: el.y * zoom }}
                      size={{ width: el.width * zoom, height: Math.max(isLine ? 8 : 6, el.height * zoom) }}
                      enableResizing={isLine ? { left: true, right: true } : true}
                      dragGrid={[1, 1]}
                      className={`rd-el${selected ? ' selected' : ''}`}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        onSelect({ band: b.key, id: el.id });
                      }}
                      onDragStop={(e, d) =>
                        onElementChange(
                          b.key,
                          el.id,
                          { x: Math.round(d.x / zoom), y: Math.round(d.y / zoom) },
                          `move-${el.id}`,
                        )
                      }
                      onResizeStop={(e, dir, ref, delta, pos) =>
                        onElementChange(
                          b.key,
                          el.id,
                          {
                            x: Math.round(pos.x / zoom),
                            y: Math.round(pos.y / zoom),
                            width: Math.max(4, Math.round(ref.offsetWidth / zoom)),
                            height: isLine ? 0 : Math.max(4, Math.round(ref.offsetHeight / zoom)),
                          },
                          `size-${el.id}`,
                        )
                      }
                    >
                      <div
                        className="rd-face"
                        tabIndex={0}
                        onKeyDown={(e) => onNudge(e, b.key, el)}
                        style={{ width: '100%', height: '100%', overflow: 'hidden' }}
                      >
                        <Face el={el} />
                      </div>
                    </Rnd>
                  );
                })}
                <div
                  className="rd-band-grip"
                  onPointerDown={startResize(b.key)}
                  title="Drag to change the height of this band"
                />
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
