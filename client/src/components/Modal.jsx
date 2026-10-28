import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * A popup over the current page for entry forms. Esc and the × close it; clicking the dim backdrop does not, so a half-filled
 * form is never lost by a stray click. If anything inside was edited, closing asks first.
 *
 *   <Modal open={Boolean(entry)} title="New student" onClose={() => setEntry(null)}>...form...</Modal>
 *
 * Forms inside can call `onClose` themselves (Cancel, after saving) through the same prop they were given.
 */
export default function Modal({ open, title, onClose, children, wide = true, className = '' }) {
  const dirty = useRef(false);
  const panel = useRef(null);

  const requestClose = () => {
    onClose();
  };

  useEffect(() => {
    if (!open) return undefined;
    dirty.current = false;
    const previous = document.activeElement;
    document.body.classList.add('modal-open');
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); requestClose(); } };
    window.addEventListener('keydown', onKey);
    // Put focus in the popup so keyboard users start inside it.
    setTimeout(() => panel.current?.querySelector('input:not([type=hidden]), select, textarea')?.focus(), 50);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('modal-open');
      previous?.focus?.();
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;
  return createPortal(
    <div className={`modal-backdrop${className ? ` ${className}` : ''}`}>
      <div ref={panel} className={`modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}
        onChangeCapture={() => { dirty.current = true; }} onInputCapture={() => { dirty.current = true; }}>
        <header className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={requestClose} aria-label="Close">✕</button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
