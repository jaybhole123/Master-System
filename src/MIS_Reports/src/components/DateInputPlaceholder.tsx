'use client';

import { useEffect } from 'react';

const DATE_TYPES = new Set(['date', 'datetime-local', 'time', 'month']);
const SELECTOR =
  'input[type="date"], input[type="datetime-local"], input[type="time"], input[type="month"]';

/**
 * Date/time inputs can't take a `placeholder`, and phone browsers (iOS Safari
 * especially) show an empty one as a blank box. This keeps a `data-empty`
 * attribute on every date/time input app-wide; globals.css uses it to draw a
 * "Select date" hint on phones (see "Date input placeholder").
 */
export default function DateInputPlaceholder() {
  useEffect(() => {
    const sync = (el: Element) => {
      if (!(el instanceof HTMLInputElement) || !DATE_TYPES.has(el.type)) return;
      el.toggleAttribute('data-empty', el.value === '');
    };
    const syncAll = (root: ParentNode) => {
      for (const el of root.querySelectorAll(SELECTOR)) sync(el);
    };

    syncAll(document);

    // Typing / picking a date
    const onInput = (e: Event) => sync(e.target as Element);
    // form.reset() clears values after the event fires
    const onReset = (e: Event) => {
      const form = e.target as HTMLFormElement;
      setTimeout(() => syncAll(form), 0);
    };
    document.addEventListener('input', onInput, true);
    document.addEventListener('change', onInput, true);
    document.addEventListener('reset', onReset, true);

    // New inputs (pages, dialogs) and controlled values set by React, which
    // mirrors the value into the `value` attribute.
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes') sync(m.target as Element);
        else
          for (const node of m.addedNodes) {
            if (node instanceof Element) {
              sync(node);
              syncAll(node);
            }
          }
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['value', 'type'],
    });

    return () => {
      document.removeEventListener('input', onInput, true);
      document.removeEventListener('change', onInput, true);
      document.removeEventListener('reset', onReset, true);
      observer.disconnect();
    };
  }, []);

  return null;
}
