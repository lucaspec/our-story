#!/usr/bin/env node
/**
 * Publishes the built site in dist/ to the `gh-pages` branch of the `origin` remote,
 * which GitHub Pages then serves at the domain in public/CNAME.
 *
 * The photos and events.json are gitignored, so they can't be built on GitHub — this
 * pushes the locally built dist/ instead. Each deploy replaces the branch with a single
 * fresh commit, so old photos don't pile up in the branch history.
 *
 * Usage:
 *   npm run deploy                      (builds first, then runs this)
 *   node scripts/deploy-gh-pages.mjs    (deploys whatever is already in dist/)
 *
 * Options:
 *   --allow-sample   Deploy even if dist/ has no real events.json (sample data only).
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dist = path.join(root, 'dist');
const branch = 'gh-pages';

function git(args, cwd) {
  return execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'inherit'] }).toString().trim();
}

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('dist/ is empty — run `npm run build` first (or use `npm run deploy`).');
  process.exit(1);
}

if (!fs.existsSync(path.join(dist, 'data', 'events.json')) && !process.argv.includes('--allow-sample')) {
  console.error(
    'dist/data/events.json is missing, so the site would only show sample data.\n' +
      'Run the photo import first, or pass --allow-sample to deploy anyway.',
  );
  process.exit(1);
}

const cname = path.join(dist, 'CNAME');
if (!fs.existsSync(cname)) {
  console.error('dist/CNAME is missing — GitHub Pages would drop the custom domain.');
  process.exit(1);
}

const remote = git(['remote', 'get-url', 'origin'], root);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'our-story-deploy-'));

try {
  fs.cpSync(dist, tmp, { recursive: true });
  // No Jekyll processing — serve the files exactly as Vite built them.
  fs.writeFileSync(path.join(tmp, '.nojekyll'), '');

  git(['init', '-q', '-b', branch], tmp);
  git(['add', '-A'], tmp);
  git(['commit', '-q', '-m', `Deploy ${new Date().toISOString()}`], tmp);

  console.log(`Pushing dist/ to ${branch} on ${remote} …`);
  execFileSync('git', ['push', '--force', remote, `${branch}:${branch}`], { cwd: tmp, stdio: 'inherit' });

  console.log(`Deployed → https://${fs.readFileSync(cname, 'utf8').trim()}`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
