import { useEffect } from 'react';

/**
 * A two-step guard for actions that are hard to undo, in place of a browser popup: the first click turns the button into
 * "Sure?" for a few seconds, and only a second click on that same button goes through. Clicking anywhere else, Escape,
 * tabbing away or waiting disarms it.
 *
 * A button is guarded when it has a data-sure attribute (use data-sure="off" to opt out), or when its label starts with a
 * destructive word. "Cancel" is guarded only inside a table row, where it cancels a record; in a form it just closes the form.
 */
const WORDS = /^(delete|remove|withdraw|purge|unlink|finali[sz]e|hire|enroll|make offer|reset(?! password)|restore standard|use default|new key|issue a new key|receive)/i;
const ARM_MS = 4000;

function needsSure(button) {
  if (button.dataset.sure === 'off') return false;
  if (button.hasAttribute('data-sure')) return true;
  const label = button.textContent.trim();
  if (/^cancel/i.test(label)) return Boolean(button.closest('td')) && !button.closest('.form-actions');
  return WORDS.test(label);
}

export function useSureClicks() {
  useEffect(() => {
    let armed = null;
    let timer = null;
    let label = null; // the aria-label the button had, put back on disarm

    const disarm = () => {
      clearTimeout(timer);
      if (!armed) return;
      armed.removeAttribute('data-armed');
      if (label === null) armed.removeAttribute('aria-label'); else armed.setAttribute('aria-label', label);
      armed = null;
    };

    const onClick = (event) => {
      const button = event.target instanceof Element ? event.target.closest('button') : null;
      if (!button || button.disabled || !needsSure(button)) { disarm(); return; }
      if (armed === button) { disarm(); return; } // the second click: let it through
      event.preventDefault();
      event.stopPropagation(); // capture phase: React never sees the first click
      disarm();
      armed = button;
      label = button.getAttribute('aria-label');
      button.setAttribute('data-armed', '');
      button.setAttribute('aria-label', `Sure? Click again to ${button.textContent.trim().toLowerCase()}`);
      timer = setTimeout(disarm, ARM_MS);
    };
    const onKey = (event) => { if (event.key === 'Escape') disarm(); };
    const onFocusOut = (event) => { if (armed && event.target === armed && event.relatedTarget !== armed) disarm(); };

    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      disarm();
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);
}
