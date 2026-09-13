#!/usr/bin/env node
/**
 * Imports a plain folder ("album") of photos and builds the data this webapp needs:
 * for every photo, when it was taken and where — then writes a resized copy of each
 * photo plus public/data/events.json. Every photo in the folder is used; there's no
 * person filtering, so it works with any album, not just a Google Takeout export.
 *
 * Date and location come from (in order of preference):
 *   1. A Google Takeout-style JSON sidecar next to the photo, if present.
 *   2. EXIF data embedded in the photo itself.
 *   3. The photo file's last-modified time (date only, no location).
 *
 * --input can be a folder, a single .zip file, or a folder containing one or more .zip
 * files (e.g. Takeout splits large exports into multiple zip parts) — zips are
 * extracted to a temp directory automatically and cleaned up when the import finishes.
 *
 * Usage:
 *   node scripts/import-photos.mjs --input /path/to/album [options]
 *
 * Options:
 *   --input <path>         Required. A folder to scan (searched recursively), or a .zip file.
 *   --no-geocode           Skip reverse geocoding (faster, no location names — just coordinates).
 *   --output-photos <dir>  Default: public/photos
 *   --output-data <file>   Default: public/data/events.json
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import sharp from 'sharp';
import * as exifr from 'exifr';
import unzipper from 'unzipper';
import heicConvert from 'heic-convert';

const HEIC_EXTENSIONS = new Set(['.heic', '.heif']);

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp']);
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
const GEOCODE_DELAY_MS = 1100; // Nominatim usage policy: max 1 request/second.

function parseArgs(argv) {
  const args = { geocode: true, outputPhotos: 'public/photos', outputData: 'public/data/events.json' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--input') args.input = argv[++i];
    else if (arg === '--no-geocode') args.geocode = false;
    else if (arg === '--output-photos') args.outputPhotos = argv[++i];
    else if (arg === '--output-data') args.outputData = argv[++i];
  }
  return args;
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

async function extractZip(zipPath) {
  const dest = await fs.mkdtemp(path.join(os.tmpdir(), 'our-story-import-'));
  console.log(`  extracting ${path.basename(zipPath)} ...`);
  const directory = await unzipper.Open.file(zipPath);
  await directory.extract({ path: dest, concurrency: 5 });
  return dest;
}

// Resolves --input into a flat file list, transparently extracting any .zip files
// found (whether --input itself is a zip, or a folder containing zip parts) into
// temp directories. Returns the files plus the temp dirs to clean up afterwards.
async function collectFiles(inputPath) {
  const stat = await fs.stat(inputPath);
  const tempDirs = [];

  if (stat.isFile()) {
    if (path.extname(inputPath).toLowerCase() !== '.zip') {
      throw new Error(`--input must be a folder or a .zip file, got: ${inputPath}`);
    }
    const dest = await extractZip(inputPath);
    tempDirs.push(dest);
    return { files: await walk(dest), tempDirs };
  }

  const rawFiles = await walk(inputPath);
  const files = [];
  for (const file of rawFiles) {
    if (path.extname(file).toLowerCase() === '.zip') {
      const dest = await extractZip(file);
      tempDirs.push(dest);
      files.push(...(await walk(dest)));
    } else {
      files.push(file);
    }
  }
  return { files, tempDirs };
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

function metaFromSidecar(json) {
  const geo =
    json.geoData && (json.geoData.latitude || json.geoData.longitude)
      ? json.geoData
      : json.geoDataExif && (json.geoDataExif.latitude || json.geoDataExif.longitude)
        ? json.geoDataExif
        : null;
  const timestamp = json.photoTakenTime?.timestamp ? Number(json.photoTakenTime.timestamp) * 1000 : null;
  return {
    lat: geo ? geo.latitude : null,
    lng: geo ? geo.longitude : null,
    timestamp,
  };
}

async function metaFromExif(imgPath) {
  try {
    const data = await exifr.parse(imgPath, { gps: true, tiff: true, exif: true });
    if (!data) return { lat: null, lng: null, timestamp: null };
    const takenAt = data.DateTimeOriginal || data.CreateDate || data.ModifyDate || null;
    return {
      lat: typeof data.latitude === 'number' ? data.latitude : null,
      lng: typeof data.longitude === 'number' ? data.longitude : null,
      timestamp: takenAt instanceof Date ? takenAt.getTime() : null,
    };
  } catch {
    return { lat: null, lng: null, timestamp: null };
  }
}

async function resolveMeta(imgPath, jsonFilesInDir) {
  let meta = { lat: null, lng: null, timestamp: null };
  let dateSource = null;

  const sidecarPath = findSidecar(imgPath, jsonFilesInDir);
  if (sidecarPath) {
    try {
      const raw = await fs.readFile(sidecarPath, 'utf-8');
      meta = metaFromSidecar(JSON.parse(raw));
      if (meta.timestamp) dateSource = 'sidecar';
    } catch {
      // ignore unreadable sidecar, fall through to EXIF
    }
  }

  if (!meta.timestamp || meta.lat == null) {
    const exifMeta = await metaFromExif(imgPath);
    if (!meta.timestamp && exifMeta.timestamp) {
      meta.timestamp = exifMeta.timestamp;
      dateSource = 'exif';
    }
    if (meta.lat == null) {
      meta.lat = exifMeta.lat;
      meta.lng = exifMeta.lng;
    }
  }

  if (!meta.timestamp) {
    const stat = await fs.stat(imgPath);
    meta.timestamp = stat.mtimeMs;
    dateSource = 'mtime';
  }

  return { ...meta, dateSource };
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

// sharp's bundled libheif only decodes .avif, not .heic/.heif (HEIC decode is
// patent-encumbered and excluded from the prebuilt binaries), so HEIC/HEIF
// sources are pre-converted to a JPEG buffer with a pure-JS decoder first.
async function toSharpInput(srcPath) {
  const ext = path.extname(srcPath).toLowerCase();
  if (!HEIC_EXTENSIONS.has(ext)) return srcPath;
  const inputBuffer = await fs.readFile(srcPath);
  return await heicConvert({ buffer: inputBuffer, format: 'JPEG', quality: 0.92 });
}

async function processImage(srcPath, outDir, id) {
  await fs.mkdir(outDir, { recursive: true });
  const thumbPath = path.join(outDir, `${id}-thumb.webp`);
  const fullPath = path.join(outDir, `${id}-full.webp`);

  try {
    const input = await toSharpInput(srcPath);
    const image = sharp(input, { failOn: 'none' }).rotate();
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

  if (!args.input) {
    console.error('Missing required --input <path to a folder of photos>');
    process.exit(1);
  }

  console.log(`Scanning ${args.input} ...`);
  const { files: allFiles, tempDirs } = await collectFiles(args.input);

  try {
    await processFiles(allFiles, args);
  } finally {
    for (const dir of tempDirs) {
      await fs.rm(dir, { recursive: true, force: true });
    }
  }
}

async function processFiles(allFiles, args) {
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
  const undated = [];
  let duplicates = 0;

  for (const imgPath of imageFiles) {
    const dir = path.dirname(imgPath);
    const meta = await resolveMeta(imgPath, jsonFilesByDir.get(dir) || new Set());

    const hash = await hashFile(imgPath);
    if (seenHashes.has(hash)) {
      duplicates++;
      continue;
    }
    seenHashes.add(hash);

    if (meta.dateSource === 'mtime') undated.push(imgPath);

    kept.push({
      srcPath: imgPath,
      hash,
      timestamp: meta.timestamp,
      date: localDateString(meta.timestamp),
      lat: meta.lat,
      lng: meta.lng,
    });
  }

  console.log(`Kept ${kept.length} photos (skipped ${duplicates} duplicates).`);
  if (undated.length > 0) {
    console.warn(
      `\nWARNING: ${undated.length} photo(s) have no JSON sidecar and no EXIF date — ` +
        `their date/location was guessed from the file's modified time instead, which is ` +
        `likely wrong (e.g. "today" if you just unzipped them). Re-export these from Google ` +
        `Takeout (which writes a JSON sidecar even for images with no embedded EXIF) rather ` +
        `than a plain album download:`
    );
    for (const f of undated) console.warn(`  - ${f}`);
  }

  if (kept.length === 0) {
    console.log('Nothing to do — check that --input points at a folder containing photos.');
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
      events.push({ id: `evt-${date}`, date, location, photos: photoEntries });
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
