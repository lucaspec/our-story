import { jitter } from '../../utils/format.js';

// Ephemera tucked onto a card — a ticket stub, a pressed flower, a coffee ring
// someone set a mug down on. Chosen per date in captions.json via an optional
// "sticker" field; an unknown name renders nothing, so a typo in the captions
// can never break a card.
//
// The same kind turning up twenty cards apart should not look stamped from a
// template, so every piece also picks its own corner, size, angle and colour
// from the card's seed. Two tickets are both tickets; they are not the same
// ticket.

const PETALS = [0, 72, 144, 216, 288];
const RIBS = [6, 11.5, 20, 28.5, 34];
const PIPS = [
  [12, 12],
  [28, 12],
  [20, 20],
  [12, 28],
  [28, 28],
];
const SPOKES = [0, 60, 120];

// Slots a piece can sit in. Anything not listed here can land anywhere.
const SLOTS = ['br', 'bl', 're', 'le', 'bc'];
const SLOTS_BY_TYPE = {
  // A ring soaks into the page; it does not hang off the side of it.
  coffee: ['bl', 'br'],
  // Clipped pieces belong on an edge, never floating in a corner.
  clip: ['le', 're'],
  pin: ['le', 're', 'bc'],
  // Long pieces would stick out too far from a side edge.
  ticket: ['br', 'bl', 'bc'],
  matchbook: ['br', 'bl', 'bc'],
  brick: ['br', 'bl', 'bc'],
  dumbbell: ['br', 'bl', 'bc'],
  polaroid: ['br', 'bl'],
  cap: ['br', 'bl', 'bc'],
};

// Accent to tint the piece with. Kept to the album's own palette so a sticker
// never introduces a colour the rest of the page does not already use.
const HUES = ['var(--cherry)', 'var(--rust)', 'var(--olive)', 'var(--mustard)', 'var(--teal)'];
const HUES_BY_TYPE = {
  heart: ['var(--cherry)', 'var(--cherry-bright)', 'var(--rust)'],
  star: ['var(--mustard)', 'var(--rust)', 'var(--cherry)'],
  leaf: ['var(--rust)', 'var(--mustard)', 'var(--olive)'],
  flower: ['var(--cherry)', 'var(--mustard)', 'var(--teal)'],
  pick: ['var(--teal)', 'var(--cherry)', 'var(--mustard)', 'var(--olive)'],
};

// Mirroring is only ever an improvement on pieces with no lettering and no
// right way up — a reversed ticket just reads backwards.
const FLIPPABLE = new Set(['leaf', 'plane', 'shell', 'pick', 'flower', 'cap', 'clip', 'pin']);

const TICKET_LABELS = ['admit one', 'one entry', 'general adm', 'row f · 12', 'no refunds'];

function pick(list, seed, salt) {
  return list[Math.floor(jitter(seed, salt) * list.length) % list.length];
}

// Everything that varies per card, derived from the card's index so a piece
// keeps its look across re-renders instead of reshuffling on every repaint.
function variantOf(type, seed) {
  return {
    slot: pick(SLOTS_BY_TYPE[type] || SLOTS, seed, 3),
    scale: (0.84 + jitter(seed, 5) * 0.34).toFixed(3),
    tilt: (jitter(seed, 9) * 26 - 13).toFixed(2),
    hue: pick(HUES_BY_TYPE[type] || HUES, seed, 7),
    flip: FLIPPABLE.has(type) && jitter(seed, 11) > 0.5,
  };
}

const ART = {
  // A torn stub from whatever we went to see.
  ticket: (v, seed) => (
    <span className="sticker__ticket">
      <span className="sticker__ticket-stub">N&deg; {1 + Math.floor(jitter(seed, 13) * 48)}</span>
      <span className="sticker__ticket-body">{pick(TICKET_LABELS, seed, 15)}</span>
    </span>
  ),

  // Picked, flattened between two pages, and forgotten there.
  flower: () => (
    <svg viewBox="0 0 48 62">
      <path className="sticker__stem" d="M24 24c1 14 2 24 3 35" />
      <path className="sticker__blade" d="M26 42c7-1 10-5 11-11-7 1-11 5-11 11Z" />
      <path className="sticker__blade" d="M25 53c-7-1-10-5-11-11 7 1 11 5 11 11Z" />
      {PETALS.map((angle) => (
        <ellipse
          key={angle}
          className="sticker__petal"
          cx="24"
          cy="10"
          rx="5.4"
          ry="8.8"
          transform={`rotate(${angle} 24 19)`}
        />
      ))}
      <circle className="sticker__core" cx="24" cy="19" r="4.3" />
    </svg>
  ),

  // The mug that sat on the page while the caption was being written.
  coffee: () => <span className="sticker__ring" />,

  // Foil, the kind that comes on a sheet of forty.
  star: () => (
    <svg viewBox="0 0 48 46">
      <path
        className="sticker__foil"
        d="M24 2l6.4 13 14.3 2.1-10.3 10.1 2.4 14.3L24 34.7 11.2 41.5l2.4-14.3L3.3 17.1 17.6 15Z"
      />
      <path className="sticker__glint" d="M24 8.5 27.8 16l-3.8 2.6Z" />
    </svg>
  ),

  // Clipped onto the edge of the page, holding nothing in particular.
  clip: () => (
    <svg viewBox="0 0 22 46">
      <path
        className="sticker__wire"
        d="M6 13v20a5 5 0 0 0 10 0V10a3.4 3.4 0 0 0-6.8 0v22.6a1.7 1.7 0 0 0 3.4 0V14"
      />
    </svg>
  ),

  // Pressed the same way as the flower, a whole season later.
  leaf: () => (
    <svg viewBox="0 0 40 46">
      <path className="sticker__blade sticker__blade--big" d="M20 3c11 11 13 24 0 39C7 27 9 14 20 3Z" />
      <path className="sticker__vein" d="M20 8v31" />
      <path className="sticker__vein" d="M20 17l7-5M20 17l-7-5M20 26l7-5M20 26l-7-5" />
    </svg>
  ),

  // Cut out of coloured paper with the kitchen scissors.
  heart: () => (
    <svg viewBox="0 0 40 38">
      <path
        className="sticker__cut"
        d="M20 35C8 27 2.5 20.5 2.5 13.8A8.6 8.6 0 0 1 20 9.6a8.6 8.6 0 0 1 17.5 4.2C37.5 20.5 32 27 20 35Z"
      />
    </svg>
  ),

  // Doodled in the margin somewhere over the Alps.
  plane: () => (
    <svg viewBox="0 0 44 40">
      <path className="sticker__ink" d="M3 19 40 3 27 37l-7-11Z" />
      <path className="sticker__ink" d="m20 26 20-23" />
    </svg>
  ),

  // Carried home from a beach in a pocket full of sand.
  shell: () => (
    <svg viewBox="0 0 40 40">
      <path className="sticker__shell" d="M20 37C7 35 2 24 6 14 9 6 14 2 20 2s11 4 14 12c4 10-1 21-14 23Z" />
      {RIBS.map((x) => (
        <path key={x} className="sticker__rib" d={`M20 36 ${x} 9`} />
      ))}
    </svg>
  ),

  // Caught off the stage floor, or bought at the merch stand.
  pick: () => (
    <svg viewBox="0 0 40 40">
      <path
        className="sticker__tinted"
        d="M20 3c8 0 14 5 14 12 0 9-8 20-14 22C14 35 6 24 6 15 6 8 12 3 20 3Z"
      />
      <path className="sticker__glint" d="M13 9c-2.4 1.8-3.6 4-3.6 6.6" />
    </svg>
  ),

  // Off the table at somebody's kitchen, or a casino's.
  dice: () => (
    <svg viewBox="0 0 40 40">
      <rect className="sticker__tinted" x="4" y="4" width="32" height="32" rx="7" />
      {PIPS.map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} className="sticker__pip" cx={cx} cy={cy} r="3" />
      ))}
    </svg>
  ),

  // One brick short of the set.
  brick: () => (
    <svg viewBox="0 0 44 32">
      <rect className="sticker__tinted" x="8" y="3" width="12" height="8" rx="2.6" />
      <rect className="sticker__tinted" x="24" y="3" width="12" height="8" rx="2.6" />
      <rect className="sticker__tinted" x="2" y="9" width="40" height="21" rx="2.5" />
    </svg>
  ),

  // For the days it was cold enough to matter.
  snow: () => (
    <svg viewBox="0 0 40 40">
      {SPOKES.map((angle) => (
        <g key={angle} className="sticker__frost" transform={`rotate(${angle} 20 20)`}>
          <path d="M20 4v32" />
          <path d="m20 10 4.5-4.5M20 10l-4.5-4.5M20 30l4.5 4.5M20 30l-4.5 4.5" />
        </g>
      ))}
      <circle className="sticker__pip" cx="20" cy="20" r="2.4" />
    </svg>
  ),

  // Thrown, and caught again for the photo.
  cap: () => (
    <svg viewBox="0 0 44 36">
      <path className="sticker__tinted" d="M22 4 42 13 22 22 2 13Z" />
      <path className="sticker__brim" d="M10 16.5V25c0 3.3 5.4 5.5 12 5.5s12-2.2 12-5.5v-8.5" />
      <path className="sticker__tassel" d="M39 15.5v8" />
      <circle className="sticker__pip" cx="39" cy="25.5" r="2.6" />
    </svg>
  ),

  // Pocketed on the way out of a bar.
  matchbook: () => (
    <span className="sticker__matchbook">
      <span className="sticker__matchbook-strike" />
    </span>
  ),

  // Pushed straight through the page into the board behind it.
  pin: () => (
    <svg viewBox="0 0 28 38">
      <path className="sticker__needle" d="M14 17 15.6 30 14 35.5 12.4 30Z" />
      <circle className="sticker__tinted" cx="14" cy="9.5" r="7.6" />
      <path className="sticker__glint" d="M10.5 6.2a4.6 4.6 0 0 1 3.2-1.5" />
    </svg>
  ),

  // A spare frame from a pack, never used.
  polaroid: () => (
    <span className="sticker__polaroid">
      <span className="sticker__polaroid-image" />
    </span>
  ),

  // Counted out under a mirror, twice a week.
  dumbbell: () => (
    <svg viewBox="0 0 44 24">
      <path className="sticker__iron" d="M4 8v8M9 4v16M9 12h26M35 4v16M40 8v8" />
    </svg>
  ),
};

export const STICKER_TYPES = Object.keys(ART);

export default function Sticker({ type, seed = 0 }) {
  const art = ART[type];
  if (!art) return null;

  const v = variantOf(type, seed);

  return (
    <span
      className="sticker"
      data-sticker={type}
      data-slot={v.slot}
      data-flip={v.flip || undefined}
      style={{
        '--sticker-tilt': `${v.tilt}deg`,
        '--sticker-scale': v.scale,
        '--sticker-hue': v.hue,
      }}
      aria-hidden="true"
    >
      {art(v, seed)}
    </span>
  );
}
