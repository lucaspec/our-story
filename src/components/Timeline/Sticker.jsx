import { jitter } from '../../utils/format.js';

// Ephemera tucked onto a card — a ticket stub from a gig, a pressed flower, a
// ring where somebody set a mug down. Chosen per date in captions.json via an
// optional "sticker" field; an unknown name renders nothing, so a typo in the
// captions can never break a card.
//
// Every kind is used on exactly one date, so no two cards carry the same
// object — the one exception is `ticket`, which is reserved for concerts and
// tints its ink differently on each. Each piece still draws its own corner,
// size and angle from the card's seed, so nothing sits in a template position.

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
const BURST = [0, 45, 90, 135, 180, 225, 270, 315];
const CONFETTI = [
  [4, 6, -20],
  [16, 2, 35],
  [29, 8, -12],
  [38, 3, 48],
  [9, 19, 22],
  [22, 15, -38],
  [34, 21, 15],
  [6, 31, 40],
  [19, 29, -25],
  [31, 33, 30],
];
const CHIP_EDGE = [0, 60, 120, 180, 240, 300];
const FERRIS_CABS = [0, 45, 90, 135, 180, 225, 270, 315];
const BALL_ROWS = [12, 20, 28];

// Slots a piece can sit in. Anything not listed can land in any of the five.
const SLOTS = ['br', 'bl', 're', 'le', 'bc'];
// Wide pieces would stick out too far from a side edge.
const WIDE = ['br', 'bl', 'bc'];
const SLOTS_BY_TYPE = {
  // A ring soaks into the page; it does not hang off the side of it.
  coffee: ['bl', 'br'],
  // Clipped pieces belong on an edge, never floating in a corner.
  clip: ['le', 're'],
  pin: ['le', 're', 'bc'],
  ticket: WIDE,
  matchbook: WIDE,
  brick: WIDE,
  dumbbell: WIDE,
  polaroid: ['br', 'bl'],
  cap: WIDE,
  envelope: WIDE,
  parcel: WIDE,
  bowtie: WIDE,
  pretzel: WIDE,
  cake: WIDE,
  boat: WIDE,
  scooter: WIDE,
  passport: ['br', 'bl'],
  bouquet: ['br', 'bl'],
  basket: WIDE,
  burger: WIDE,
  camera: WIDE,
  car: WIDE,
  suitcase: WIDE,
  steak: WIDE,
  pizza: WIDE,
  palette: WIDE,
  crown: WIDE,
  confetti: WIDE,
  monkey: WIDE,
  kiss: WIDE,
  horse: ['br', 'bl'],
  parasol: ['br', 'bl'],
  ferris: ['br', 'bl'],
};

// Accent to tint the piece with, kept to the album's own palette so a sticker
// never introduces a colour the rest of the page does not already use.
const HUES = ['var(--cherry)', 'var(--rust)', 'var(--olive)', 'var(--mustard)', 'var(--teal)'];
const HUES_BY_TYPE = {
  heart: ['var(--cherry)', 'var(--cherry-bright)', 'var(--rust)'],
  star: ['var(--mustard)', 'var(--rust)', 'var(--cherry)'],
  leaf: ['var(--rust)', 'var(--mustard)', 'var(--olive)'],
  flower: ['var(--cherry)', 'var(--mustard)', 'var(--teal)'],
  pick: ['var(--teal)', 'var(--cherry)', 'var(--mustard)', 'var(--olive)'],
};

// The one kind used more than once. Concerts are told apart by ink colour, in
// the order the gigs happened, so no two stubs look alike.
const TICKET_INKS = {
  '2026-02-02': 'var(--cherry)',
  '2026-04-14': 'var(--teal)',
  '2026-05-20': 'var(--mustard)',
  '2026-07-11': 'var(--rust)',
  '2026-07-25': 'var(--olive)',
};

const TICKET_LABELS = ['admit one', 'one entry', 'general adm', 'row f · 12', 'standing'];

// Mirroring is only ever an improvement on pieces with no lettering and no
// right way up — a reversed ticket just reads backwards.
const FLIPPABLE = new Set([
  'leaf', 'plane', 'shell', 'pick', 'flower', 'cap', 'clip', 'pin',
  'monkey', 'boat', 'scooter', 'car', 'horse', 'bouquet', 'palette', 'kiss',
]);

function choose(list, seed, salt) {
  return list[Math.floor(jitter(seed, salt) * list.length) % list.length];
}

// Everything that varies per card, derived from the card's index so a piece
// keeps its look across re-renders instead of reshuffling on every repaint.
function variantOf(type, seed, date) {
  return {
    slot: choose(SLOTS_BY_TYPE[type] || SLOTS, seed, 3),
    scale: (0.84 + jitter(seed, 5) * 0.34).toFixed(3),
    tilt: (jitter(seed, 9) * 26 - 13).toFixed(2),
    hue: TICKET_INKS[date] || choose(HUES_BY_TYPE[type] || HUES, seed, 7),
    flip: FLIPPABLE.has(type) && jitter(seed, 11) > 0.5,
  };
}

const ART = {
  /* ---- kept from the first pass ------------------------------------- */

  // A torn stub from the gig.
  ticket: (v, seed) => (
    <span className="sticker__ticket">
      <span className="sticker__ticket-stub">N&deg; {1 + Math.floor(jitter(seed, 13) * 48)}</span>
      <span className="sticker__ticket-body">{choose(TICKET_LABELS, seed, 15)}</span>
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

  // Clipped onto the edge of the page — and, on the via ferrata card, doing
  // duty as a carabiner.
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

  // Off the floor at the rock'n'roll tournament.
  pick: () => (
    <svg viewBox="0 0 40 40">
      <path
        className="sticker__tinted"
        d="M20 3c8 0 14 5 14 12 0 9-8 20-14 22C14 35 6 24 6 15 6 8 12 3 20 3Z"
      />
      <path className="sticker__glint" d="M13 9c-2.4 1.8-3.6 4-3.6 6.6" />
    </svg>
  ),

  // Off the table at somebody's kitchen.
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

  // For the day it was cold enough to matter.
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

  // Pocketed on the way out of the bar.
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

  /* ---- the day you met, and the weeks after --------------------------- */

  // Swept up off the street afterwards.
  confetti: () => (
    <svg viewBox="0 0 44 40">
      {CONFETTI.map(([x, y, r], i) => (
        <rect
          key={`${x}-${y}`}
          className={`sticker__flake sticker__flake--${i % 4}`}
          x={x}
          y={y}
          width="6"
          height="3.4"
          rx="0.8"
          transform={`rotate(${r} ${x + 3} ${y + 1.7})`}
        />
      ))}
    </svg>
  ),

  // The messages, printed and folded into the page.
  envelope: () => (
    <svg viewBox="0 0 46 32">
      <rect className="sticker__paper" x="2" y="3" width="42" height="26" rx="1.5" />
      <path className="sticker__fold" d="M2 5.5 23 20 44 5.5" />
      <path className="sticker__fold" d="m2 28 15-11M44 28 29 17" />
    </svg>
  ),

  // The one that won you back.
  parcel: () => (
    <svg viewBox="0 0 40 36">
      <rect className="sticker__kraft" x="3" y="6" width="34" height="27" rx="1.5" />
      <path className="sticker__twine" d="M20 6v27M3 19h34" />
      <rect className="sticker__label" x="22" y="9" width="12" height="8" rx="1" />
    </svg>
  ),

  // Not an actual ring — but it was that kind of a day.
  ring: () => (
    <svg viewBox="0 0 36 42">
      <circle className="sticker__band" cx="18" cy="27" r="11" />
      <path className="sticker__gem" d="M18 4l7 8-7 8-7-8Z" />
      <path className="sticker__glint" d="m14 10 4-4 4 4" />
    </svg>
  ),

  // "I will never let go."
  lifebuoy: () => (
    <svg viewBox="0 0 40 40">
      <circle className="sticker__buoy" cx="20" cy="20" r="16" />
      <circle className="sticker__buoy-hole" cx="20" cy="20" r="7" />
      <path className="sticker__buoy-band" d="M20 4v9M20 27v9M4 20h9M27 20h9" />
    </svg>
  ),

  /* ---- autumn ---------------------------------------------------------- */

  // The one from the bar.
  monkey: () => (
    <svg viewBox="0 0 40 38">
      <circle className="sticker__fur" cx="7.5" cy="16" r="6" />
      <circle className="sticker__fur" cx="32.5" cy="16" r="6" />
      <circle className="sticker__ear" cx="7.5" cy="16" r="3" />
      <circle className="sticker__ear" cx="32.5" cy="16" r="3" />
      <ellipse className="sticker__fur" cx="20" cy="19" rx="13" ry="14" />
      <ellipse className="sticker__muzzle" cx="20" cy="24" rx="9" ry="7.5" />
      <circle className="sticker__eye" cx="15.5" cy="16" r="1.9" />
      <circle className="sticker__eye" cx="24.5" cy="16" r="1.9" />
      <path className="sticker__smile" d="M16 24.5c1.6 1.8 6.4 1.8 8 0" />
    </svg>
  ),

  // From the museum, with the thumb hole and everything.
  palette: () => (
    <svg viewBox="0 0 42 36">
      <path
        className="sticker__board"
        d="M20 2c11 0 20 6 20 13 0 5-4 7-8 7-3 0-5 1-5 4 0 4-3 8-9 8C8 34 1 27 1 18 1 9 9 2 20 2Z"
      />
      <circle className="sticker__thumb" cx="20" cy="26" r="3.4" />
      <circle className="sticker__daub sticker__daub--0" cx="10" cy="12" r="3.1" />
      <circle className="sticker__daub sticker__daub--1" cx="19" cy="9" r="3.1" />
      <circle className="sticker__daub sticker__daub--2" cx="28" cy="12" r="3.1" />
      <circle className="sticker__daub sticker__daub--3" cx="9" cy="21" r="3.1" />
    </svg>
  ),

  // A very kissable face.
  kiss: () => (
    <svg viewBox="0 0 40 28">
      <path className="sticker__lips" d="M20 10C15 3 7 3 3 8c-1 5 7 16 17 16s18-11 17-16c-4-5-12-5-17 2Z" />
      <path className="sticker__lip-line" d="M4 8.5c5 2 11 2.6 16 2.6S31 10.5 36 8.5" />
    </svg>
  ),

  // Worn to the ball.
  bowtie: () => (
    <svg viewBox="0 0 44 24">
      <path className="sticker__tinted" d="M19 12 3 3v18Z" />
      <path className="sticker__tinted" d="M25 12 41 3v18Z" />
      <rect className="sticker__knot" x="18" y="7" width="8" height="10" rx="2.4" />
    </svg>
  ),

  /* ---- winter ---------------------------------------------------------- */

  // Off the tree you were both too sick to enjoy.
  bauble: () => (
    <svg viewBox="0 0 32 42">
      <path className="sticker__hook" d="M16 6a3.6 3.6 0 0 1 0-4" />
      <rect className="sticker__cap" x="12" y="5" width="8" height="6" rx="1.4" />
      <circle className="sticker__tinted" cx="16" cy="26" r="14" />
      <path className="sticker__bauble-band" d="M3 23c8 3 18 3 26 0" />
      <path className="sticker__glint" d="M9 20a9 9 0 0 1 5-5" />
    </svg>
  ),

  // Over the lake at midnight.
  firework: () => (
    <svg viewBox="0 0 40 40">
      {BURST.map((angle) => (
        <g key={angle} transform={`rotate(${angle} 20 20)`}>
          <path className="sticker__spark" d="M20 14V5" />
          <circle className="sticker__spark-tip" cx="20" cy="3.4" r="1.7" />
        </g>
      ))}
      <circle className="sticker__spark-core" cx="20" cy="20" r="3.2" />
    </svg>
  ),

  // For the birthday girl.
  crown: () => (
    <svg viewBox="0 0 44 32">
      <path className="sticker__gold" d="M3 26 5 8l8 7 9-11 9 11 8-7 2 18Z" />
      <rect className="sticker__gold" x="3" y="25" width="38" height="5" rx="1.4" />
      <circle className="sticker__jewel" cx="22" cy="17" r="2.4" />
      <circle className="sticker__jewel" cx="11" cy="19" r="1.8" />
      <circle className="sticker__jewel" cx="33" cy="19" r="1.8" />
    </svg>
  ),

  // From the Munich trip.
  pretzel: () => (
    <svg viewBox="0 0 42 36">
      <path
        className="sticker__dough"
        d="M8 9c-5 4-6 12-1 17s14 5 17-1M34 9c5 4 6 12 1 17s-14 5-17-1"
      />
      <path className="sticker__dough" d="M8 9c4-4 9-3 13 3l5 8M34 9c-4-4-9-3-13 3" />
    </svg>
  ),

  // Off your dad's fiftieth.
  cake: () => (
    <svg viewBox="0 0 40 36">
      <path className="sticker__candle" d="M20 4v6" />
      <path className="sticker__flame" d="M20 4c2-1.6 2-3.4 0-5-2 1.6-2 3.4 0 5Z" />
      <rect className="sticker__frosting" x="4" y="11" width="32" height="8" rx="3" />
      <rect className="sticker__sponge" x="4" y="17" width="32" height="15" rx="2" />
      <path className="sticker__drip" d="M11 19v4M20 19v5M29 19v4" />
    </svg>
  ),

  // Fifty bucks up.
  chip: () => (
    <svg viewBox="0 0 36 36">
      <circle className="sticker__tinted" cx="18" cy="18" r="16" />
      {CHIP_EDGE.map((angle) => (
        <rect
          key={angle}
          className="sticker__chip-notch"
          x="15"
          y="1"
          width="6"
          height="6"
          transform={`rotate(${angle} 18 18)`}
        />
      ))}
      <circle className="sticker__chip-face" cx="18" cy="18" r="9" />
      <circle className="sticker__chip-ring" cx="18" cy="18" r="9" />
    </svg>
  ),

  /* ---- spring, and Thailand -------------------------------------------- */

  // Still standing, probably.
  bowling: () => (
    <svg viewBox="0 0 24 42">
      <path
        className="sticker__pin-body"
        d="M12 2c3.4 0 5.4 3.4 5.4 7 0 2.6-1.4 4.4-1.4 6.4 0 2.6 3.6 5 3.6 11.6 0 8-3.4 13-7.6 13s-7.6-5-7.6-13c0-6.6 3.6-9 3.6-11.6 0-2-1.4-3.8-1.4-6.4 0-3.6 2-7 5.4-7Z"
      />
      <path className="sticker__pin-stripe" d="M7.2 14.5c3.2 1.2 6.4 1.2 9.6 0M6.4 19c3.6 1.3 7.6 1.3 11.2 0" />
    </svg>
  ),

  // Out to Phi Phi and back.
  boat: () => (
    <svg viewBox="0 0 40 38">
      <path className="sticker__sail" d="M20 4v20M21 6l11 16H21Z" />
      <path className="sticker__hull" d="M3 26h34l-5 9H8Z" />
      <path className="sticker__wave" d="M2 36c4 2 7-1 11 0M27 36c4 2 7-1 11 0" />
    </svg>
  ),

  // Freedom Beach.
  palm: () => (
    <svg viewBox="0 0 40 44">
      <path className="sticker__trunk" d="M20 40c-1-12 0-20 2-26" />
      <path className="sticker__frond" d="M22 14c-6-5-13-4-17 2 7-1 12 0 17-2Z" />
      <path className="sticker__frond" d="M22 14c6-5 13-4 17 2-7-1-12 0-17-2Z" />
      <path className="sticker__frond" d="M22 14c-3-7-10-10-17-8 6 3 11 6 17 8Z" />
      <path className="sticker__frond" d="M22 14c3-7 10-10 17-8-6 3-11 6-17 8Z" />
      <circle className="sticker__coconut" cx="22" cy="16" r="2.4" />
    </svg>
  ),

  // Rented for the ride north.
  scooter: () => (
    <svg viewBox="0 0 46 32">
      <circle className="sticker__tyre" cx="9" cy="23" r="7" />
      <circle className="sticker__tyre" cx="37" cy="23" r="7" />
      <path className="sticker__frame" d="M9 23h9l6-11h7M30 12l4 11M18 23h14" />
      <path className="sticker__frame" d="M28 12h7l2-6" />
    </svg>
  ),

  // The last afternoon at the hotel.
  cocktail: () => (
    <svg viewBox="0 0 36 40">
      <path className="sticker__glass" d="M4 8h28L18 24Z" />
      <path className="sticker__stem" d="M18 24v10M11 35h14" />
      <path className="sticker__straw" d="M25 4 20 17" />
      <circle className="sticker__cherry" cx="26" cy="4" r="2.6" />
    </svg>
  ),

  // Stamped on the way back in.
  passport: () => (
    <svg viewBox="0 0 36 42">
      <rect className="sticker__cover" x="2" y="2" width="30" height="38" rx="2.5" />
      <path className="sticker__crest" d="M17 9h8M15 13h12" />
      <circle className="sticker__crest-ring" cx="21" cy="24" r="8" />
      <path className="sticker__crest" d="M14 24h14M21 17v14" />
    </svg>
  ),

  /* ---- spring at home --------------------------------------------------- */

  // Easter brunch.
  egg: () => (
    <svg viewBox="0 0 32 40">
      <path className="sticker__shell-egg" d="M16 2c7 0 13 11 13 20 0 9-6 16-13 16S3 31 3 22C3 13 9 2 16 2Z" />
      <path className="sticker__egg-band" d="M4.4 15c7.6 3 15.6 3 23.2 0M3.2 26c8.4 3.2 17.2 3.2 25.6 0" />
      <path className="sticker__egg-zig" d="m6 21 4-3 4 3 4-3 4 3 4-3" />
    </svg>
  ),

  // Seven months, and they were beautiful.
  bouquet: () => (
    <svg viewBox="0 0 40 46">
      <path className="sticker__wrap" d="M13 26h14l-3 18H16Z" />
      <path className="sticker__bouquet-stem" d="M20 26v14M16 27l2 12M24 27l-2 12" />
      <circle className="sticker__bloom sticker__bloom--0" cx="11" cy="17" r="6" />
      <circle className="sticker__bloom sticker__bloom--1" cx="29" cy="17" r="6" />
      <circle className="sticker__bloom sticker__bloom--2" cx="20" cy="9" r="6.6" />
      <circle className="sticker__bloom sticker__bloom--3" cx="20" cy="21" r="5.4" />
      <circle className="sticker__bloom-eye" cx="20" cy="9" r="2.2" />
    </svg>
  ),

  // Carried out to the field.
  basket: () => (
    <svg viewBox="0 0 42 36">
      <path className="sticker__handle" d="M11 14a10 10 0 0 1 20 0" />
      <path className="sticker__wicker" d="M4 14h34l-3 20H7Z" />
      <path className="sticker__weave" d="M6 21h30M7 27h28M14 15l-2 18M28 15l2 18" />
    </svg>
  ),

  // From the day you beat the rollercoasters.
  balloon: () => (
    <svg viewBox="0 0 30 44">
      <path className="sticker__string" d="M15 30c-3 5 3 8 0 13" />
      <ellipse className="sticker__tinted" cx="15" cy="16" rx="12" ry="14" />
      <path className="sticker__knot-tri" d="M15 29.5 18 34h-6Z" />
      <path className="sticker__glint" d="M8 11a8 8 0 0 1 5-5" />
    </svg>
  ),

  /* ---- summer ----------------------------------------------------------- */

  // Smashburger.
  burger: () => (
    <svg viewBox="0 0 42 32">
      <path className="sticker__bun" d="M21 3c9 0 17 5 17 10H4C4 8 12 3 21 3Z" />
      <path className="sticker__lettuce" d="M4 14h34l-3 4c-4-3-7 2-11-1s-8 3-12 0-4-1-8-3Z" />
      <rect className="sticker__patty" x="4" y="18" width="34" height="5" rx="2.4" />
      <path className="sticker__bun" d="M5 24h32c0 4-6 6-16 6S5 28 5 24Z" />
      <circle className="sticker__seed" cx="15" cy="8" r="1.1" />
      <circle className="sticker__seed" cx="24" cy="6.6" r="1.1" />
      <circle className="sticker__seed" cx="30" cy="9.4" r="1.1" />
    </svg>
  ),

  // Like proper tourists.
  camera: () => (
    <svg viewBox="0 0 44 34">
      <rect className="sticker__body" x="2" y="7" width="40" height="25" rx="3" />
      <path className="sticker__body" d="M14 7l3-5h10l3 5Z" />
      <circle className="sticker__lens" cx="22" cy="20" r="8.4" />
      <circle className="sticker__lens-glass" cx="22" cy="20" r="4.6" />
      <circle className="sticker__flash" cx="36" cy="12" r="2.2" />
    </svg>
  ),

  // Half the games didn't even work.
  joystick: () => (
    <svg viewBox="0 0 36 40">
      <path className="sticker__base" d="M4 38c0-4 5-6 14-6s14 2 14 6Z" />
      <rect className="sticker__base" x="6" y="28" width="24" height="7" rx="2.4" />
      <path className="sticker__shaft" d="M18 28V13" />
      <circle className="sticker__tinted" cx="18" cy="8" r="7" />
      <path className="sticker__glint" d="M13.5 5.5A5 5 0 0 1 17 3" />
      <circle className="sticker__button" cx="26" cy="31.5" r="2.2" />
    </svg>
  ),

  // The long drive to Pristina.
  car: () => (
    <svg viewBox="0 0 46 28">
      <path className="sticker__chassis" d="M3 20V14l6-1 4-7h16l5 7 9 1v6Z" />
      <path className="sticker__window" d="M15 7h6v5h-9ZM23 7h5l3.6 5H23Z" />
      <circle className="sticker__tyre" cx="13" cy="21" r="5" />
      <circle className="sticker__tyre" cx="34" cy="21" r="5" />
    </svg>
  ),

  // Planted in the sand on the beach day.
  parasol: () => (
    <svg viewBox="0 0 42 42">
      <path className="sticker__pole" d="M21 17v23" />
      <path className="sticker__canopy" d="M2 18C2 8 10 2 21 2s19 6 19 16Z" />
      <path className="sticker__canopy-rib" d="M21 2v16M8 18c1-9 5-15 13-16M34 18c-1-9-5-15-13-16" />
    </svg>
  ),

  // Mallorca, in the morning — off the horse rather than the horse itself,
  // which at this size only ever reads as a brown lump.
  horse: () => (
    <svg viewBox="0 0 36 38">
      <path
        className="sticker__hide"
        d="M18 3c8.4 0 13.4 7 13.4 15.6 0 6.2-2 11.4-5.2 15.4l-5.4-3.2c2.2-3 3.8-7 3.8-12 0-5.2-2.8-9-6.6-9s-6.6 3.8-6.6 9c0 5 1.6 9 3.8 12l-5.4 3.2C6.6 30 4.6 24.8 4.6 18.6 4.6 10 9.6 3 18 3Z"
      />
      <circle className="sticker__nail" cx="9.5" cy="14" r="1.3" />
      <circle className="sticker__nail" cx="26.5" cy="14" r="1.3" />
      <circle className="sticker__nail" cx="9.5" cy="23" r="1.3" />
      <circle className="sticker__nail" cx="26.5" cy="23" r="1.3" />
    </svg>
  ),

  // Packed again already.
  suitcase: () => (
    <svg viewBox="0 0 40 34">
      <path className="sticker__handle-bar" d="M14 8V5h12v3" />
      <rect className="sticker__case" x="3" y="8" width="34" height="24" rx="3" />
      <path className="sticker__strap" d="M13 8v24M27 8v24" />
      <rect className="sticker__buckle" x="17" y="17" width="6" height="5" rx="1" />
    </svg>
  ),

  // Ofc steak, what else.
  steak: () => (
    <svg viewBox="0 0 42 34">
      <path
        className="sticker__meat"
        d="M12 3c11-3 26 1 28 10 2 10-8 19-19 19C10 32 2 26 2 17 2 10 6 5 12 3Z"
      />
      <path className="sticker__fat" d="M12 3c-4 6-3 14 2 20 4 5 11 8 17 7" />
      <path className="sticker__grill" d="M17 12l9 3M15 19l9 3M24 9l7 2" />
    </svg>
  ),

  // Over the lake at the Seenachtsfest.
  ferris: () => (
    <svg viewBox="0 0 42 44">
      <path className="sticker__rig" d="M21 24 11 42M21 24l10 18M7 42h28" />
      <circle className="sticker__wheel" cx="21" cy="21" r="18" />
      {FERRIS_CABS.map((angle) => (
        <g key={angle} transform={`rotate(${angle} 21 21)`}>
          <path className="sticker__spoke" d="M21 21V4" />
          <rect className="sticker__cab" x="18" y="0.5" width="6" height="5" rx="1.4" />
        </g>
      ))}
      <circle className="sticker__hub" cx="21" cy="21" r="2.6" />
    </svg>
  ),

  // Watched through the pinhole, with a picnic.
  eclipse: () => (
    <svg viewBox="0 0 40 40">
      {BURST.map((angle) => (
        <path key={angle} className="sticker__corona" d="M20 4V0" transform={`rotate(${angle} 20 20)`} />
      ))}
      <circle className="sticker__sun" cx="20" cy="20" r="14" />
      <circle className="sticker__moon" cx="16" cy="16.5" r="13.2" />
    </svg>
  ),

  // The first night out dancing together.
  discoball: () => (
    <svg viewBox="0 0 36 42">
      <path className="sticker__string" d="M18 3v4" />
      <circle className="sticker__ball" cx="18" cy="22" r="15" />
      {BALL_ROWS.map((y) => (
        <path key={y} className="sticker__facet" d={`M4 ${y}h28`} />
      ))}
      <path className="sticker__facet" d="M11 8.5v27M18 7v30M25 8.5v27" />
      <path className="sticker__glint" d="M10 15a8 8 0 0 1 5-5" />
    </svg>
  ),

  // Made at home, badly and happily.
  pizza: () => (
    <svg viewBox="0 0 38 40">
      <path className="sticker__crust" d="M19 3 36 34c-11 5-23 5-34 0Z" />
      <path className="sticker__cheese" d="M19 8 32 32c-9 4-17 4-26 0Z" />
      <circle className="sticker__pepperoni" cx="19" cy="18" r="2.8" />
      <circle className="sticker__pepperoni" cx="13" cy="27" r="2.8" />
      <circle className="sticker__pepperoni" cx="25" cy="27" r="2.8" />
    </svg>
  ),
};

export const STICKER_TYPES = Object.keys(ART);

export default function Sticker({ type, seed = 0, date }) {
  const art = ART[type];
  if (!art) return null;

  const v = variantOf(type, seed, date);

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
