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
Both `title` and `text` are optional — add just one if you like. This file is separate
from `events.json` on purpose: re-running the import script regenerates `events.json`
from your photos, but never touches `captions.json`, so your captions are safe across
re-imports. It's committed to git (unlike your photos), so back it up/version it like any
other text file.

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
public/sample-photos/          Placeholder images used by the demo data
src/                           The React app (Timeline view, Map view)
```

## Customizing the design

All styling lives in `src/styles/global.css` — colors are defined as CSS variables at
the top of the file (`--color-primary`, `--color-bg`, etc.) if you want to shift the
palette. Fonts are loaded from Google Fonts in `index.html`.
