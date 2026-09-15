import { useEffect, useMemo, useRef, useState } from 'react';
import { monthKey } from '../utils/format.js';

const MONTH_NAMES = Array.from({ length: 12 }, (_, m) =>
  new Date(2000, m, 1).toLocaleDateString(undefined, { month: 'short' }).replace('.', '')
);

function monthAnchor(key) {
  return document.getElementById(`month-${key}`);
}

// The chapter whose plate sits closest above the upper third of the screen.
function currentMonth(keys) {
  const line = window.innerHeight * 0.33;
  let current = null;
  for (const key of keys) {
    const el = monthAnchor(key);
    if (el && el.getBoundingClientRect().top <= line) current = key;
  }
  return current;
}

export default function JumpToMonth({ events }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);
  const rootRef = useRef(null);
  const toggleRef = useRef(null);

  const { years, monthSet, monthKeys } = useMemo(() => {
    const set = new Set(events.map((e) => monthKey(e.date)));
    const keys = [...set].sort();
    return { years: [...new Set(keys.map((k) => k.slice(0, 4)))], monthSet: set, monthKeys: keys };
  }, [events]);

  useEffect(() => {
    if (!open) return undefined;

    function onPointerDown(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function toggle() {
    if (!open) setActive(currentMonth(monthKeys));
    setOpen((o) => !o);
  }

  function jump(key) {
    setOpen(false);
    monthAnchor(key)?.scrollIntoView({ block: 'start' });
  }

  return (
    <div className="jump" ref={rootRef}>
      {open && (
        <div className="jump__panel" role="dialog" aria-label="Jump to a month">
          <p className="jump__title">Jump to…</p>
          {years.map((year) => (
            <div className="jump__year" key={year}>
              <span className="jump__year-label">{year}</span>
              <div className="jump__grid">
                {MONTH_NAMES.map((name, m) => {
                  const key = `${year}-${String(m + 1).padStart(2, '0')}`;
                  const has = monthSet.has(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      className="jump__month"
                      disabled={!has}
                      aria-current={key === active ? 'true' : undefined}
                      onClick={() => jump(key)}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        ref={toggleRef}
        type="button"
        className="jump__toggle"
        aria-expanded={open}
        aria-label="Jump to a month"
        title="Jump to a month"
        onClick={toggle}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 6h14v13H5zM5 10h14M9 3.5v4M15 3.5v4" />
        </svg>
        <span>go to</span>
      </button>
    </div>
  );
}
