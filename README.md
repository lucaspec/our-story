# Our Story

A one-year anniversary webapp: a timeline and a map of everywhere you two have been,
built automatically from your Google Photos.

It has two views:

- **Timeline** — every date, in order, with photos and location.
- **Map** — every location pinned on a map; click a pin to jump to that date.

By default it shows a handful of sample dates so you can see it working immediately.
The steps below replace that sample data with your real photos.

## How the automation works

Google's Photos API doesn't let apps read who's tagged in a photo — that's blocked for
privacy. But a **Google Takeout** export of your library includes a small JSON file next
to every photo with exactly what we need: who's tagged, the timestamp, and GPS
coordinates. `scripts/import-takeout.mjs` reads those JSON files, keeps only the photos
that include your two names, groups them into one "date" per day, reverse-geocodes the
location into a place name, resizes the photos, and writes everything the site needs.

You'll re-run that one script any time you want to refresh the site with new photos —
nothing else about the app needs to change.

**Before you start:** in the Google Photos app, tag yourself and your partner as people
in a handful of your photos together (Google will then suggest the same tag for similar
faces — confirm those suggestions so more photos get tagged). The import script can only
find photos that already have those tags saved in Google Photos.

## 1. Export your photos from Google Takeout

1. Go to [takeout.google.com](https://takeout.google.com).
2. Click **Deselect all**, then select only **Google Photos**.
3. Under Google Photos' own options, you can choose specific albums, or leave it as "All
   photo albums included" to scan your whole library.
4. Choose **.zip**, a size that suits your library (2 GB is a safe default — Takeout
   splits into multiple zip files automatically if needed), and export.
5. Once Google emails you the download link(s), download and **unzip** them. You'll get
   a folder structure like:
   ```
   Takeout/Google Photos/Photos from 2025/IMG_1234.jpg
   Takeout/Google Photos/Photos from 2025/IMG_1234.jpg.supplemental-metadata.json
   ...
   ```
   If you downloaded multiple zip parts, unzip them all into the same `Takeout` folder —
   the script scans recursively so it doesn't matter how they're organized.

## 2. Install dependencies

```bash
npm install
```

## 3. Edit the site's basic info

Open `config.json` and fill in:

- `title` / `tagline` — shown at the top of the site.
- `personA` / `personB` — must match the two names as they appear as **person tags in
  Google Photos** (so the import script can match them).
- `startDate` — the date you two started dating, `YYYY-MM-DD` (used for the "Day N" /
  days-together counter). It's currently a placeholder — set it to the real date.
- `mapDefaultCenter` / `mapDefaultZoom` — where the map opens before any pins are added;
  the default is roughly central Europe.

## 4. Run the import

```bash
npm run import-photos -- --input "/path/to/Takeout/Google Photos"
```

Useful options:

| Flag | Default | What it does |
| --- | --- | --- |
| `--names "Luca,Kaltrina"` | names from `config.json` | Which person tags to match |
| `--require both\|either` | `either` | `both` keeps only photos with both of you tagged together; `either` also keeps photos where just one of you appears (e.g. one of you took the photo) |
| `--no-geocode` | geocoding on | Skip turning coordinates into place names (faster, useful for a quick test run) |

This can take a while the first time (it resizes every matching photo and looks up place
names one at a time, out of respect for the free geocoding service's rate limit). It
prints a summary at the end, e.g.:

```
Found 4213 image files.
Kept 187 photos (skipped: 12 no sidecar, 3 no timestamp, 4011 didn't match people filter, 0 duplicates).
Wrote 62 dates to public/data/events.json
Photos saved under public/photos/
```

It's safe to re-run any time — e.g. after a new Takeout export — it regenerates
`public/data/events.json` and `public/photos/` from scratch.

## 5. Preview it

```bash
npm run dev
```

Open the printed local URL. You should see your real dates instead of the sample banner.

## 6. Deploy it — privately

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
scripts/import-takeout.mjs     Parses Takeout export -> public/data/events.json + photos
public/data/events.sample.json Demo data shown until you run the import script
public/sample-photos/          Placeholder images used by the demo data
src/                           The React app (Timeline view, Map view)
```

## Customizing the design

All styling lives in `src/styles/global.css` — colors are defined as CSS variables at
the top of the file (`--color-primary`, `--color-bg`, etc.) if you want to shift the
palette. Fonts are loaded from Google Fonts in `index.html`.
