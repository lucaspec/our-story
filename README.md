# Our Story

A one-year anniversary webapp: a timeline and a map of everywhere you two have been,
built automatically from a folder of your photos.

It has two views:

- **Timeline** — every date, in order, with photos and location.
- **Map** — every location pinned on a map; click a pin to jump to that date.

By default it shows a handful of sample dates so you can see it working immediately.
The steps below replace that sample data with your real photos.

## How the automation works

Point `scripts/import-photos.mjs` at any folder of photos — a Google Photos album you
downloaded, a folder from your phone, whatever. Every photo in that folder is used;
there's no filtering by who's in the picture. For each photo it figures out the date
and (if available) the GPS location from the photo's own EXIF data (or from a Google
Takeout JSON sidecar, if one happens to sit next to the photo), groups photos into one
"date" per day, reverse-geocodes the location into a place name, resizes the photos, and
writes everything the site needs.

You'll re-run that one script any time you want to refresh the site with new photos —
nothing else about the app needs to change.

## 1. Get your photos into one folder (or a zip)

Any folder works, as long as the photos already have their original date (and ideally
GPS) metadata intact — e.g. photos downloaded from a Google Photos album, or copied
straight off your phone. Avoid photos that have been re-saved/re-exported by an app that
strips EXIF data, since that's how the date and location get determined.

You don't need to unzip anything first — the import script accepts a `.zip` file
directly (handy for a Google Photos album download or a Takeout export), or a folder
containing one or more `.zip` parts (Takeout splits large exports into multiple zips),
and extracts them automatically.

## 2. Install dependencies

```bash
npm install
```

## 3. Edit the site's basic info

Open `config.json` and fill in:

- `title` / `tagline` — shown at the top of the site.
- `personA` / `personB` — your two names, shown in the header.
- `startDate` — the date you two started dating, `YYYY-MM-DD` (used for the "Day N" /
  days-together counter). It's currently a placeholder — set it to the real date.
- `mapDefaultCenter` / `mapDefaultZoom` — where the map opens before any pins are added;
  the default is roughly central Europe.

## 4. Run the import

```bash
npm run import-photos -- --input "/path/to/your/album"
```

Useful options:

| Flag | Default | What it does |
| --- | --- | --- |
| `--no-geocode` | geocoding on | Skip turning coordinates into place names (faster, useful for a quick test run) |
| `--output-photos <dir>` | `public/photos` | Where resized photos are written |
| `--output-data <file>` | `public/data/events.json` | Where the generated event data is written |

This can take a while the first time (it resizes every photo and looks up place names
one at a time, out of respect for the free geocoding service's rate limit). It prints a
summary at the end, e.g.:

```
Found 187 image files.
Kept 187 photos (skipped 0 duplicates).
Wrote 62 dates to public/data/events.json
Photos saved under public/photos/
```

It's safe to re-run any time — e.g. after adding more photos to the folder — it
regenerates `public/data/events.json` and `public/photos/` from scratch.

## 5. Preview it

```bash
npm run dev
```

Open the printed local URL. You should see your real dates instead of the sample banner.

## 6. Add titles and stories to your dates

The import script only knows dates, locations, and photos — it doesn't know what actually
happened. To add a title and a bit of text (the story, an inside joke, whatever) to a
date, edit `public/data/captions.json`:

```json
{
  "2025-08-30": {
    "title": "The coffee that started it all",
    "text": "We said 'just a quick coffee' and then closed the place down four hours later."
  }
}
```

The key is the event's date (`YYYY-MM-DD`, matching the date shown in the timeline).
`title`, `text` and `sticker` are all optional — add just the ones you want.

`sticker` pins a piece of ephemera to the card — a ticket stub from a gig, a pressed
flower, a ring where somebody set a mug down:

```json
{
  "2026-04-14": {
    "title": "Tame Impala Concert",
    "text": "What a show 🎸🌈",
    "sticker": "ticket"
  }
}
```

The 55 kinds available:

| | |
| --- | --- |
| **Paper & post** | `ticket` `envelope` `parcel` `passport` `polaroid` `matchbook` `clip` `pin` `camera` |
| **Pressed & picked** | `flower` `leaf` `bouquet` `palm` `shell` `egg` |
| **Nights out** | `pick` `bowtie` `discoball` `cocktail` `chip` `dice` `bowling` `joystick` `firework` `confetti` |
| **Table** | `coffee` `burger` `steak` `pizza` `pretzel` `cake` `basket` |
| **Travel** | `plane` `car` `scooter` `boat` `suitcase` `parasol` `balloon` `ferris` |
| **Weather & sky** | `snow` `eclipse` `star` |
| **Keepsakes** | `heart` `ring` `crown` `kiss` `monkey` `bauble` `lifebuoy` `horse` `brick` `palette` `cap` `dumbbell` |

Each piece picks its own corner, size, angle and accent colour from the card, so no two
sit in a template position. An unknown name is ignored, so a typo can never break a card.

Two conventions worth keeping if you add dates later:

- **One kind per date.** Every sticker is used exactly once across the whole year, so no
  two cards carry the same object. The single exception is `ticket`, reserved for
  concerts and tinted a different colour on each — the mapping lives in `TICKET_INKS` in
  `src/components/Timeline/Sticker.jsx`.
- **Leave most dates bare.** Currently 57 of 76 dates carry one. The repeat gym sessions,
  the filler "random date" entries and the quieter middle days of long trips have none —
  the pieces read as things that were kept rather than as decoration when they are the
  exception rather than the rule.

### Grouping a trip

A week away lands in the timeline as seven separate dates, which reads as seven separate
outings. `public/data/trips.json` folds a run of days into one kraft folder with a
stamped cover:

```json
{
  "trips": [
    {
      "id": "thailand",
      "name": "Thailand",
      "stamp": "Phuket",
      "from": "2026-03-21",
      "to": "2026-03-29",
      "ink": "var(--teal)"
    }
  ]
}
```

Every date between `from` and `to` (both inclusive) is filed inside, so extending a trip
is a matter of widening the range — the dates keep their own entries in `captions.json`
and their own cards, photos and ephemera. `stamp` is the text curved around the customs
stamp on the cover; `ink` colours that stamp and the tape holding the folder down, and
takes any of the accent variables.

Two things happen automatically. The day count on the cover is the calendar span, not
the number of cards, so a quiet day you took no photos on still counts. And a card
titled `"Thailand: Day 3"` shows as just `Day 3` inside the folder, since the cover
already says where you were — the caption itself is left exactly as written.

## 7. Deploy it — privately

Your photos and `public/data/events.json` are listed in `.gitignore` on purpose, so they
never get pushed to GitHub even if this repo is public. That means deployment needs to
happen straight from your machine, not via a GitHub-connected build:

```bash
npm run build        # outputs a static site into dist/
```

Then deploy `dist/` with whichever you prefer:

- **Vercel:** `npx vercel deploy --prod dist` (first run will ask you to log in / create
  a project — choose to make it a **private/unlisted** project if you don't want it
  publicly discoverable).
- **Netlify:** `npx netlify deploy --prod --dir dist` (same idea).
- **Just for yourselves:** `npm run preview` serves the production build locally — good
  enough if you just want to open it on your laptop or share your screen.

If you'd rather host on GitHub Pages, you'd need to commit `dist/` (or the photos) to a
branch — only do that if this repository is **private**, since GitHub Pages sites (and
public repos) are visible to anyone with the link.

## Project structure

```
config.json                    Site title, names, anniversary start date, map defaults
scripts/import-photos.mjs      Imports a photo folder -> public/data/events.json + photos
public/data/events.sample.json Demo data shown until you run the import script
public/data/captions.json      Your hand-written titles/text per date, keyed by date
public/data/trips.json         The multi-day trips folded into one folder in the timeline
public/sample-photos/          Placeholder images used by the demo data
src/                           The React app (Timeline view, Map view)
```

## Customizing the design

All styling lives in `src/styles/global.css`. The look is a paper scrapbook: a kraft
`--board` that everything is stuck to, cream `--paper` pages on top of it, and a small
set of accents (`--rust`, `--cherry`, `--olive`, `--mustard`, `--teal`) used for tape,
stamps and pins. Shift those variables at the top of the file to re-tint the whole
album. Fonts are loaded from Google Fonts in `index.html`: Caveat (handwriting),
Playfair Display (titles), Bitter (body) and Special Elite (typewriter labels).

A few details worth knowing before you change them:

- The timeline cards snake left and right along a sine wave, and the thread is an SVG
  curve traced through the pin of each card (`src/components/Timeline/Timeline.jsx`).
  `MAX_AMPLITUDE` and `WAVE_FREQUENCY` control how wide and how often it swings;
  `CONTENT_WIDTH` must stay in sync with the `.event-card__content` max-width, or the
  wave will push cards off screen. Each card hides the cord behind it, so the curve
  hangs straight down and only swings across in the open gap below — `SWING_LEAD` is
  how far above a card's bottom edge that swing starts.
- A trip is a single stop on that thread: the folder knots once at the top and the days
  inside are strung on a stitched seam of their own
  (`src/components/Timeline/TripSection.jsx`, `.trip__*` in the stylesheet). The folder
  is deliberately darker than the board — `--folder` — so the pages read as tucked into
  something, and the pages inside are narrower than the ones out on the open board.
- The thread stitches itself in as you scroll, and the pages fade up as they arrive
  (`src/hooks/useReveal.js`). Both respect `prefers-reduced-motion`.
- The album arrives shut and tied with a ribbon (`src/components/Intro.jsx`); one click
  unties it and the cover swings open on its spine. It shows once per visit — the flag
  lives in `sessionStorage`, so closing the tab and coming back opens it again — and is
  skipped outright for anyone who has asked for reduced motion. Escape or the skip button
  cuts it short at any point.
- The ephemera lives in `src/components/Timeline/Sticker.jsx` — the artwork is inline
  SVG, painted by a small set of shared classes in the `Ephemera` block of
  `global.css`. Each piece declares which slots on the card it may sit in (a coffee ring
  soaks into a corner, a paperclip only goes on an edge, a wide piece never hangs off a
  side), and everything else about it — the exact corner, the size, the angle, the accent
  colour, whether it is mirrored — is drawn from the card's index via the same
  deterministic `jitter()` the tilts use, so it stays put across re-renders.
