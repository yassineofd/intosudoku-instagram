/**
 * Daily puzzle for the Instagram poster.
 *
 * Downloads the live site's assets/js/sudoku-engine.js (so the image can never
 * drift from what intosudoku.com/daily-sudoku shows) and generates the puzzle
 * exactly the way the site's daily.js does: medium difficulty, seeded from
 * 'intosudoku-daily-' + YYYY-MM-DD.
 *
 * The site derives that date from each visitor's *local* clock, so there is no
 * single "right" day worldwide. We pick one timezone (default UTC) and post
 * the puzzle for that calendar date.
 */
'use strict';

const vm = require('vm');

const SITE_URL = (process.env.SITE_URL || 'https://intosudoku.com').replace(/\/$/, '');
const ENGINE_URL = `${SITE_URL}/assets/js/sudoku-engine.js`;
const DAILY_DIFFICULTY = 'medium';

async function loadEngine() {
  const res = await fetch(ENGINE_URL);
  if (!res.ok) throw new Error(`Could not download ${ENGINE_URL} (HTTP ${res.status})`);
  // The engine is a browser IIFE that attaches itself to `window`.
  const sandbox = {};
  sandbox.window = sandbox;
  vm.runInNewContext(await res.text(), sandbox, { filename: ENGINE_URL, timeout: 10000 });
  if (!sandbox.SudokuEngine) throw new Error('sudoku-engine.js did not define SudokuEngine');
  return sandbox.SudokuEngine;
}

/** 'YYYY-MM-DD' for `now` as seen in `timeZone` (en-CA formats as ISO). */
function dateKey(timeZone = 'UTC', now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
}

/** Returns { date, puzzle, solution } — flat 81-int arrays, 0 = empty. */
async function getDailyPuzzle(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Bad date "${date}", expected YYYY-MM-DD`);
  const Engine = await loadEngine();
  const seed = Engine.seedFromString('intosudoku-daily-' + date);
  const { puzzle, solution } = Engine.generate(DAILY_DIFFICULTY, seed);
  return { date, puzzle: Array.from(puzzle), solution: Array.from(solution) };
}

module.exports = { getDailyPuzzle, dateKey, DAILY_DIFFICULTY };
