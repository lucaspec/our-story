// Small formatting helpers shared by the timeline, the map and the cover.

function toDate(dateStr) {
  return new Date(`${dateStr}T00:00:00`);
}

export function formatDate(dateStr) {
  return toDate(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatWeekday(dateStr) {
  return toDate(dateStr).toLocaleDateString(undefined, { weekday: 'long' });
}

// Pieces for the postage-stamp date block on each card.
export function dateParts(dateStr) {
  const d = toDate(dateStr);
  return {
    day: d.toLocaleDateString(undefined, { day: '2-digit' }),
    month: d.toLocaleDateString(undefined, { month: 'short' }).replace('.', ''),
    year: String(d.getFullYear()),
    weekday: d.toLocaleDateString(undefined, { weekday: 'short' }).replace('.', ''),
  };
}

// Compact numeric date for the cover postmark: 30 · 08 · 2025
export function stampDate(dateStr) {
  const d = toDate(dateStr);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())} \u00b7 ${pad(d.getMonth() + 1)} \u00b7 ${d.getFullYear()}`;
}

export function monthKey(dateStr) {
  return dateStr.slice(0, 7);
}

export function monthLabel(dateStr) {
  const d = toDate(dateStr);
  return {
    month: d.toLocaleDateString(undefined, { month: 'long' }),
    year: String(d.getFullYear()),
  };
}

export function dayNumber(dateStr, startDate) {
  const diff = Math.floor((toDate(dateStr) - toDate(startDate)) / 86400000);
  return diff;
}

export function daysSince(startDate) {
  const diff = Math.floor((Date.now() - toDate(startDate)) / 86400000);
  return diff >= 0 ? diff : 0;
}

// Reverse geocoding hands back multilingual names like
// "Zürich, Schweiz/Suisse/Svizzera/Svizra" — keep the first spelling of each part
// so the card shows "Zürich, Schweiz" instead of a wall of slashes.
export function prettyPlace(name) {
  if (!name) return '';
  return name
    .split(',')
    .map((part) => part.split('/')[0].trim())
    .filter(Boolean)
    .join(', ');
}

// The short form used where space is tight (map pins, cover stats).
export function placeCity(name) {
  const pretty = prettyPlace(name);
  return pretty.split(',')[0] || pretty;
}

// Deterministic pseudo-random in [0, 1) so a card's tilt, tape and paperclip
// stay the same across re-renders instead of jittering on every repaint.
export function jitter(seed, salt = 0) {
  const x = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}
