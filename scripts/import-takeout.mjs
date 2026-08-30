#!/usr/bin/env node
/**
 * Parses a Google Takeout "Google Photos" export and builds the data this webapp needs:
 * for every photo, who's tagged in it, when it was taken, and where — then writes a
 * resized copy of each kept photo plus public/data/events.json.
 *
 * Usage:
 *   node scripts/import-takeout.mjs --input /path/to/Takeout/Google\ Photos [options]
 *
 * Options:
 *   --input <dir>        Required. Root folder to scan (the unzipped "Google Photos" folder).
 *   --names "A,B"         Names to match against Google Photos' people tags. Defaults to
 *                          personA/personB from config.json.
 *   --require both|either Only keep photos tagged with both names, or either one. Default: either.
 *   --no-geocode           Skip reverse geocoding (faster, no location names — just coordinates).
 *   --output-photos <dir>  Default: public/photos
 *   --output-data <file>   Default: public/data/events.json
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp']);
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
const GEOCODE_DELAY_MS = 1100; // Nominatim usage policy: max 1 request/second.

function parseArgs(argv) {
  const args = { require: 'either', geocode: true, outputPhotos: 'public/photos', outputData: 'public/data/events.json' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--input') args.input = argv[++i];
    else if (arg === '--names') args.names = argv[++i];
    else if (arg === '--require') args.require = argv[++i];
    else if (arg === '--no-geocode') args.geocode = false;
    else if (arg === '--output-photos') args.outputPhotos = argv[++i];
    else if (arg === '--output-data') args.outputData = argv[++i];
  }
  return args;
}

async function loadConfig() {
  try {
    const raw = await fs.readFile(new URL('../config.json', import.meta.url), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function walk(dir) {
  const results = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await walk(full)));
    } else {
      results.push(full);
    }
  }
  return results;
}

function stripJsonSuffix(filename) {
  return filename.replace(/\.supplemental-metadata\.json$/i, '').replace(/\.json$/i, '');
}

function findSidecar(imagePath, jsonFilesInDir) {
  const dir = path.dirname(imagePath);
  const base = path.basename(imagePath);

  const candidates = [`${base}.json`, `${base}.supplemental-metadata.json`];

  // Takeout sometimes reorders "(n)" duplicate-suffixes around the extension.
  const parenMatch = base.match(/^(.*)(\(\d+\))(\.[^.]+)$/);
  if (parenMatch) {
    const [, name, paren, ext] = parenMatch;
    candidates.push(`${name}${ext}${paren}.json`, `${name}${ext}${paren}.supplemental-metadata.json`);
  }

  for (const candidate of candidates) {
    if (jsonFilesInDir.has(candidate)) return path.join(dir, candidate);
  }

  // Fallback: Takeout truncates long combined filenames before appending .json.
  // Find the JSON file in the same directory whose stripped name shares the
  // longest leading prefix with the image name.
  let best = null;
  let bestLen = 7; // require a reasonably confident prefix match
  for (const jsonName of jsonFilesInDir) {
    const stripped = stripJsonSuffix(jsonName);
    let len = 0;
    while (len < stripped.length && len < base.length && stripped[len] === base[len]) len++;
    if (len > bestLen) {
      bestLen = len;
      best = jsonName;
    }
  }
  return best ? path.join(dir, best) : null;
}

function extractMeta(json) {
  const people = Array.isArray(json.people) ? json.people.map((p) => p.name).filter(Boolean) : [];
  const geo =
    json.geoData && (json.geoData.latitude || json.geoData.longitude)
      ? json.geoData
      : json.geoDataExif && (json.geoDataExif.latitude || json.geoDataExif.longitude)
        ? json.geoDataExif
        : null;
  const timestamp = json.photoTakenTime?.timestamp ? Number(json.photoTakenTime.timestamp) * 1000 : null;
  return {
    people,
    lat: geo ? geo.latitude : null,
    lng: geo ? geo.longitude : null,
    timestamp,
  };
}

function localDateString(timestampMs) {
  const d = new Date(timestampMs);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function hashFile(filePath) {
  const buf = await fs.readFile(filePath);
  return crypto.createHash('sha1').update(buf).digest('hex');
}

const geocodeCachePath = new URL('./geocode-cache.json', import.meta.url);

async function loadGeocodeCache() {
  try {
    return JSON.parse(await fs.readFile(geocodeCachePath, 'utf-8'));
  } catch {
    return {};
  }
}

async function saveGeocodeCache(cache) {
  await fs.writeFile(geocodeCachePath, JSON.stringify(cache, null, 2));
}

function geocodeKey(lat, lng) {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

async function reverseGeocode(lat, lng, cache) {
  const key = geocodeKey(lat, lng);
  if (cache[key]) return cache[key];

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('zoom', '14');

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'our-story-anniversary-app/1.0 (personal, non-commercial)' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const addr = data.address || {};
    const place = addr.city || addr.town || addr.village || addr.suburb || addr.county || data.name;
    const country = addr.country;
    const name = [place, country].filter(Boolean).join(', ') || data.display_name || null;
    cache[key] = name;
  } catch (err) {
    console.warn(`  geocoding failed for ${key}: ${err.message}`);
    cache[key] = null;
  }

  await new Promise((r) => setTimeout(r, GEOCODE_DELAY_MS));
  return cache[key];
}

async function processImage(srcPath, outDir, id) {
  await fs.mkdir(outDir, { recursive: true });
  const thumbPath = path.join(outDir, `${id}-thumb.webp`);
  const fullPath = path.join(outDir, `${id}-full.webp`);

  try {
    const image = sharp(srcPath, { failOn: 'none' }).rotate();
    await image.clone().resize({ width: 480, withoutEnlargement: true }).webp({ quality: 78 }).toFile(thumbPath);
    await image.clone().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 85 }).toFile(fullPath);
    return true;
  } catch (err) {
    console.warn(`  could not process image ${srcPath}: ${err.message}`);
    return false;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = await loadConfig();

  if (!args.input) {
    console.error('Missing required --input <path to Takeout Google Photos folder>');
    process.exit(1);
  }

  const names = (args.names || `${config.personA || ''},${config.personB || ''}`)
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean);

  if (names.length === 0) {
    console.error('No names to match. Pass --names "A,B" or set personA/personB in config.json.');
    process.exit(1);
  }

  console.log(`Scanning ${args.input} ...`);
  const allFiles = await walk(args.input);

  const jsonFilesByDir = new Map();
  const imageFiles = [];
  for (const file of allFiles) {
    const ext = path.extname(file).toLowerCase();
    const dir = path.dirname(file);
    if (ext === '.json') {
      if (!jsonFilesByDir.has(dir)) jsonFilesByDir.set(dir, new Set());
      jsonFilesByDir.get(dir).add(path.basename(file));
    } else if (IMAGE_EXTENSIONS.has(ext)) {
      imageFiles.push(file);
    }
  }

  console.log(`Found ${imageFiles.length} image files.`);

  const seenHashes = new Set();
  const kept = [];
  let noSidecar = 0;
  let noTimestamp = 0;
  let filteredOut = 0;
  let duplicates = 0;

  for (const imgPath of imageFiles) {
    const dir = path.dirname(imgPath);
    const sidecarPath = findSidecar(imgPath, jsonFilesByDir.get(dir) || new Set());
    if (!sidecarPath) {
      noSidecar++;
      continue;
    }

    let meta;
    try {
      const raw = await fs.readFile(sidecarPath, 'utf-8');
      meta = extractMeta(JSON.parse(raw));
    } catch {
      noSidecar++;
      continue;
    }

    if (!meta.timestamp) {
      noTimestamp++;
      continue;
    }

    const matches = names.filter((n) => meta.people.some((p) => p.toLowerCase() === n.toLowerCase()));
    const passesFilter = args.require === 'both' ? matches.length === names.length : matches.length > 0;
    if (!passesFilter) {
      filteredOut++;
      continue;
    }

    const hash = await hashFile(imgPath);
    if (seenHashes.has(hash)) {
      duplicates++;
      continue;
    }
    seenHashes.add(hash);

    kept.push({
      srcPath: imgPath,
      hash,
      timestamp: meta.timestamp,
      date: localDateString(meta.timestamp),
      lat: meta.lat,
      lng: meta.lng,
      people: meta.people,
    });
  }

  console.log(
    `Kept ${kept.length} photos (skipped: ${noSidecar} no sidecar, ${noTimestamp} no timestamp, ${filteredOut} didn't match people filter, ${duplicates} duplicates).`
  );

  if (kept.length === 0) {
    console.log('Nothing to do — check your --names / --require settings and that photos are tagged in Google Photos.');
    return;
  }

  kept.sort((a, b) => a.timestamp - b.timestamp);

  const eventsByDate = new Map();
  for (const photo of kept) {
    if (!eventsByDate.has(photo.date)) eventsByDate.set(photo.date, []);
    eventsByDate.get(photo.date).push(photo);
  }

  const geocodeCache = args.geocode ? await loadGeocodeCache() : {};
  const events = [];

  for (const [date, photos] of eventsByDate) {
    const withGeo = photos.filter((p) => p.lat != null && p.lng != null);
    let location = null;
    if (withGeo.length > 0) {
      const lat = withGeo.reduce((s, p) => s + p.lat, 0) / withGeo.length;
      const lng = withGeo.reduce((s, p) => s + p.lng, 0) / withGeo.length;
      const name = args.geocode ? await reverseGeocode(lat, lng, geocodeCache) : null;
      location = { name, lat, lng };
    }

    const people = [...new Set(photos.flatMap((p) => p.people))];
    const outDir = path.join(args.outputPhotos, date);
    const photoEntries = [];

    for (const photo of photos) {
      const id = photo.hash.slice(0, 12);
      const ok = await processImage(photo.srcPath, outDir, id);
      if (ok) {
        photoEntries.push({
          thumb: `/photos/${date}/${id}-thumb.webp`,
          full: `/photos/${date}/${id}-full.webp`,
        });
      }
    }

    if (photoEntries.length > 0) {
      events.push({ id: `evt-${date}`, date, location, people, photos: photoEntries });
    }
    process.stdout.write(`  processed ${date} (${photoEntries.length} photos)\r\n`);
  }

  if (args.geocode) await saveGeocodeCache(geocodeCache);

  await fs.mkdir(path.dirname(args.outputData), { recursive: true });
  await fs.writeFile(
    args.outputData,
    JSON.stringify({ generatedAt: new Date().toISOString(), events }, null, 2)
  );

  console.log(`\nWrote ${events.length} dates to ${args.outputData}`);
  console.log(`Photos saved under ${args.outputPhotos}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
