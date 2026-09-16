import { useEffect, useMemo, useRef, useState } from 'react';
import { dateParts, formatDate, formatRange, formatWeekday, prettyPlace, spanDays } from '../utils/format.js';

// Case and accents ignored, so "munchen" finds "München".
function fold(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function tripFor(trips, date) {
  return trips.find((trip) => date >= trip.from && date <= trip.to) || null;
}

// Everything a date can be found by: what it's called, what was written about
// it, where it was, the trip it belongs to, and the date itself spelled a few
// ways ("21 March 2026", "Saturday", "2026-03-21").
function buildIndex(events, trips) {
  const dates = events.map((event) => {
    const trip = tripFor(trips, event.date);
    const place = prettyPlace(event.location?.name);
    const words = [
      event.title,
      event.text,
      place,
      trip?.name,
      formatDate(event.date),
      formatWeekday(event.date),
      event.date,
    ];
    return { kind: 'event', key: event.id, event, place, haystack: fold(words.filter(Boolean).join(' ')) };
  });

  const folders = trips.map((trip) => ({
    kind: 'trip',
    key: `trip-${trip.id}`,
    trip,
    haystack: fold([trip.name, trip.stamp].join(' ')),
  }));

  return { dates, folders };
}

// The stretch of a caption around the first thing that matched, so a hit deep
// in a long caption still shows why it came up.
function snippet(text, terms, max = 96) {
  if (!text) return '';
  if (text.length <= max) return text;
  const lower = fold(text);
  const at = terms.map((t) => lower.indexOf(t)).filter((i) => i >= 0).sort((a, b) => a - b)[0];
  if (at == null) return `${text.slice(0, max).trimEnd()}…`;
  const start = Math.max(0, at - 32);
  const end = Math.min(text.length, start + max);
  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
}

// Underline the query wherever it appears as typed. Accent-folded matches still
// find the date, they just aren't underlined — the lengths no longer line up.
function Marked({ text, terms }) {
  if (!text) return null;
  if (terms.length === 0) return text;
  const pattern = new RegExp(`(${terms.map(escapeRe).join('|')})`, 'ig');
  return text.split(pattern).map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part));
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '');

// A card catalogue for the album: type a word, get the dates filed under it.
// Opens from the tab in the corner, or from anywhere with "/" or ⌘K / Ctrl+K.
export default function Search({ events, trips, onSelectEvent, onSelectTrip }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const toggleRef = useRef(null);
  const listRef = useRef(null);

  const index = useMemo(() => buildIndex(events, trips), [events, trips]);

  const terms = useMemo(() => fold(query).trim().split(/\s+/).filter(Boolean), [query]);

  const hits = useMemo(() => {
    if (terms.length === 0) return [];
    const matches = (entry) => terms.every((t) => entry.haystack.includes(t));
    // Folders first — "thailand" should offer the whole trip before its days.
    return [...index.folders.filter(matches), ...index.dates.filter(matches)];
  }, [index, terms]);

  useEffect(() => setCursor(0), [query]);

  // "/" and ⌘K / Ctrl+K open the catalogue from anywhere — unless you're
  // already typing somewhere, or a photo is open full screen.
  useEffect(() => {
    function onKeyDown(e) {
      const typing = e.target instanceof HTMLElement && e.target.closest('input, textarea, [contenteditable]');
      const shortcut = (e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing);
      if (!shortcut || document.querySelector('.lightbox, .intro')) return;
      e.preventDefault();
      setOpen(true);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    inputRef.current?.focus();
    inputRef.current?.select();

    function onPointerDown(e) {
      if (!rootRef.current?.querySelector('.search__panel')?.contains(e.target) && !toggleRef.current?.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // Keep the highlighted card in view while arrowing through a long list.
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  function close({ returnFocus = true } = {}) {
    setOpen(false);
    if (returnFocus) toggleRef.current?.focus();
  }

  function choose(hit) {
    close({ returnFocus: false });
    if (hit.kind === 'trip') onSelectTrip(hit.trip.id);
    else onSelectEvent(hit.event.id);
  }

  function onInputKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (query) setQuery('');
      else close();
    } else if (e.key === 'ArrowDown' && hits.length) {
      e.preventDefault();
      setCursor((c) => (c + 1) % hits.length);
    } else if (e.key === 'ArrowUp' && hits.length) {
      e.preventDefault();
      setCursor((c) => (c - 1 + hits.length) % hits.length);
    } else if (e.key === 'Enter' && hits[cursor]) {
      e.preventDefault();
      choose(hits[cursor]);
    }
  }

  const activeId = hits[cursor] ? `search-hit-${hits[cursor].key}` : undefined;
  const dateCount = hits.filter((h) => h.kind === 'event').length;

  return (
    <div className="search" ref={rootRef}>
      {open && (
        <>
          <div className="search__scrim" aria-hidden="true" />
          <div className="search__panel" role="dialog" aria-label="Find a date">
            <label className="search__field">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="10.5" cy="10.5" r="6" />
                <path d="m15 15 5 5" />
              </svg>
              <input
                ref={inputRef}
                type="search"
                className="search__input"
                placeholder="a place, a word, a month…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKeyDown}
                aria-label="Find a date"
                role="combobox"
                aria-expanded={hits.length > 0}
                aria-controls="search-results"
                aria-activedescendant={activeId}
                autoComplete="off"
                spellCheck="false"
              />
              <kbd className="search__esc" aria-hidden="true">esc</kbd>
            </label>

            <p className="search__count" aria-live="polite">
              {terms.length === 0
                ? `${events.length} dates in the drawer`
                : dateCount === 0 && hits.length === 0
                  ? 'Nothing filed under that'
                  : `${dateCount} ${dateCount === 1 ? 'date' : 'dates'}`}
            </p>

            {hits.length > 0 && (
              <ul className="search__results" id="search-results" role="listbox" ref={listRef}>
                {hits.map((hit, i) => (
                  <li key={hit.key} role="presentation">
                    {hit.kind === 'trip' ? (
                      <TripHit hit={hit} terms={terms} active={i === cursor} onChoose={choose} onHover={() => setCursor(i)} />
                    ) : (
                      <DateHit hit={hit} terms={terms} active={i === cursor} onChoose={choose} onHover={() => setCursor(i)} />
                    )}
                  </li>
                ))}
              </ul>
            )}

            {terms.length === 0 && (
              <p className="search__hint">
                Try <em>Thailand</em>, <em>concert</em>, <em>gym</em> or <em>July</em>
              </p>
            )}
          </div>
        </>
      )}

      <button
        ref={toggleRef}
        type="button"
        className="search__toggle"
        aria-expanded={open}
        aria-label="Find a date"
        title={`Find a date (${isMac ? '⌘' : 'Ctrl+'}K)`}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6" />
          <path d="m15 15 5 5" />
        </svg>
        <span>find</span>
      </button>
    </div>
  );
}

function DateHit({ hit, terms, active, onChoose, onHover }) {
  const { event, place } = hit;
  const stamp = dateParts(event.date);
  const thumb = event.photos?.[0]?.thumb;
  return (
    <button
      type="button"
      id={`search-hit-${hit.key}`}
      role="option"
      aria-selected={active}
      className="search__hit"
      data-active={active}
      onClick={() => onChoose(hit)}
      onPointerMove={onHover}
      tabIndex={-1}
    >
      <span className="search__stamp" aria-hidden="true">
        <b>{stamp.day}</b>
        <i>{stamp.month}</i>
        <small>{stamp.year}</small>
      </span>
      <span className="search__body">
        <span className="search__title">
          <Marked text={event.title || formatDate(event.date)} terms={terms} />
        </span>
        {place && (
          <span className="search__place">
            <Marked text={place} terms={terms} />
          </span>
        )}
        {event.text && (
          <span className="search__text">
            <Marked text={snippet(event.text, terms)} terms={terms} />
          </span>
        )}
      </span>
      {thumb && <img className="search__thumb" src={thumb} alt="" loading="lazy" decoding="async" />}
    </button>
  );
}

function TripHit({ hit, terms, active, onChoose, onHover }) {
  const { trip } = hit;
  const days = spanDays(trip.from, trip.to);
  return (
    <button
      type="button"
      id={`search-hit-${hit.key}`}
      role="option"
      aria-selected={active}
      className="search__hit search__hit--trip"
      data-active={active}
      onClick={() => onChoose(hit)}
      onPointerMove={onHover}
      tabIndex={-1}
      style={{ '--trip-ink': trip.ink }}
    >
      <span className="search__stamp search__stamp--trip" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2Z" />
        </svg>
      </span>
      <span className="search__body">
        <span className="search__kicker">the trip to</span>
        <span className="search__title">
          <Marked text={trip.name} terms={terms} />
        </span>
        <span className="search__place">
          {days} days &middot; {formatRange(trip.from, trip.to)}
        </span>
      </span>
    </button>
  );
}
