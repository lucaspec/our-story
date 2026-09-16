import { useCallback, useEffect, useRef, useState } from 'react';
import { stampDate } from '../utils/format.js';

// The album arrives shut, tied with a ribbon. One click unties it and the cover
// swings open on its spine to reveal the year underneath.
//
// Shown once per visit (sessionStorage, not localStorage — coming back to it
// tomorrow should feel like opening it again), skipped entirely for anyone who
// asked for reduced motion, and dismissible at any point via the skip button or
// Escape.

const SEEN_KEY = 'our-story:opened';
const UNTIE_MS = 900;
const OPEN_MS = 1150;

function reducedMotion() {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

// sessionStorage throws outright in some privacy modes, so every touch of it is
// wrapped — a browser that refuses to remember just replays the opening.
function seen() {
  try {
    return sessionStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function remember() {
  try {
    sessionStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* nothing to do — the album simply opens again next time */
  }
}

export function shouldOpenAlbum() {
  return !seen() && !reducedMotion();
}

export default function Intro({ config, onDone }) {
  const [state, setState] = useState('closed');
  const started = useRef(false);
  const timers = useRef([]);

  const finish = useCallback(() => {
    remember();
    onDone();
  }, [onDone]);

  const open = useCallback(() => {
    if (started.current) return;
    started.current = true;
    setState('untied');
    timers.current.push(setTimeout(() => setState('open'), UNTIE_MS));
    timers.current.push(setTimeout(finish, UNTIE_MS + OPEN_MS));
  }, [finish]);

  // Hold the page still underneath, and let Escape cut the whole thing short.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKey(e) {
      if (e.key === 'Escape') finish();
    }
    window.addEventListener('keydown', onKey);

    const pending = timers.current;
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
      pending.forEach(clearTimeout);
    };
  }, [finish]);

  return (
    <div
      className="intro"
      data-state={state}
      role="dialog"
      aria-modal="true"
      aria-label={`${config.title} — closed`}
    >
      {/* The cover itself is the button, so Enter and Space open it for free. */}
      <button type="button" className="intro__album" onClick={open} autoFocus>
        <span className="intro__board">
          <span className="intro__corner intro__corner--tl" aria-hidden="true" />
          <span className="intro__corner intro__corner--tr" aria-hidden="true" />
          <span className="intro__corner intro__corner--bl" aria-hidden="true" />
          <span className="intro__corner intro__corner--br" aria-hidden="true" />

          <span className="intro__label">
            <span className="intro__names">
              {config.personA}
              <span className="intro__heart" aria-hidden="true">
                &#10084;
              </span>
              {config.personB}
            </span>
            <span className="intro__title">{config.title}</span>
            <span className="intro__since">since {stampDate(config.startDate)}</span>
          </span>

          <span className="intro__ribbon intro__ribbon--v" aria-hidden="true" />
          <span className="intro__ribbon intro__ribbon--h" aria-hidden="true" />
          <span className="intro__bow" aria-hidden="true">
            <span className="intro__bow-loop intro__bow-loop--l" />
            <span className="intro__bow-loop intro__bow-loop--r" />
            <span className="intro__bow-tail intro__bow-tail--l" />
            <span className="intro__bow-tail intro__bow-tail--r" />
            <span className="intro__bow-knot" />
          </span>
        </span>

        <span className="intro__hint">untie the ribbon</span>
      </button>

      <button type="button" className="intro__skip" onClick={finish}>
        skip
      </button>
    </div>
  );
}
