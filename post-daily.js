#!/usr/bin/env node
/**
 * Generates today's daily Sudoku image and (optionally) posts it to Instagram.
 *
 *   node post-daily.js --dry-run                 render image + print caption, no network
 *   node post-daily.js --image-url <public-url>  post (image must already be hosted there)
 *
 * Flags:  --date YYYY-MM-DD   puzzle date (default: today in POST_TIMEZONE, default UTC)
 *         --out <file>        where to write the JPEG (default out/<date>.jpg)
 *         --force             post even if a caption for this date already exists
 * Env:    IG_USER_ID, IG_ACCESS_TOKEN (required to post), POST_TIMEZONE, SITE_URL,
 *         GRAPH_API_VERSION
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { getDailyPuzzle, dateKey } = require('./lib/puzzle');
const { renderJpeg } = require('./lib/render');
const instagram = require('./lib/instagram');

function parseArgs(argv) {
  const args = { _flags: new Set() };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run' || a === '--force') args._flags.add(a.slice(2));
    else if (a.startsWith('--')) args[a.slice(2)] = argv[++i];
  }
  return args;
}

function marker(date) {
  return `Daily Sudoku · ${date}`;
}

function buildCaption(date) {
  return [
    `🧩 ${marker(date)}`,
    '',
    "Today's puzzle is ready. Take a few minutes for your brain and keep your streak alive!",
    '',
    '👉 Play it free at intosudoku.com/daily-sudoku (link in bio)',
    '',
    '#sudoku #dailysudoku #sudokupuzzle #puzzle #braintraining #brainteaser #logicpuzzle #intosudoku',
  ].join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = args._flags.has('dry-run');
  const date = args.date || dateKey(process.env.POST_TIMEZONE || 'UTC');

  const daily = await getDailyPuzzle(date);
  const jpeg = await renderJpeg(daily);
  const outFile = path.resolve(args.out || path.join(__dirname, 'out', `${date}.jpg`));
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, jpeg);
  console.log(`Rendered ${date} -> ${outFile} (${Math.round(jpeg.length / 1024)} KB)`);

  const caption = buildCaption(date);
  if (dryRun) {
    console.log('\n--- caption ---\n' + caption);
    return;
  }

  const igUserId = process.env.IG_USER_ID;
  const token = process.env.IG_ACCESS_TOKEN;
  const imageUrl = args['image-url'];
  if (!igUserId || !token) throw new Error('IG_USER_ID and IG_ACCESS_TOKEN must be set');
  if (!imageUrl) throw new Error('--image-url is required when posting');

  if (!args._flags.has('force') && await instagram.alreadyPosted({ igUserId, token, marker: marker(date) })) {
    console.log(`Already posted for ${date}, skipping (use --force to override).`);
    return;
  }

  await instagram.waitForImage(imageUrl);
  const postId = await instagram.publishImage({ igUserId, token, imageUrl, caption });
  console.log(`Published to Instagram: media id ${postId}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
