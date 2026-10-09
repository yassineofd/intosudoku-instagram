/**
 * Renders a puzzle as a 1080x1080 Instagram-ready JPEG.
 * Instagram's Graph API only officially accepts JPEG, hence not PNG.
 */
'use strict';

const SIZE = 1080;
const CELL = 80;
const GRID = CELL * 9;
const X0 = (SIZE - GRID) / 2;
const Y0 = 250;

const FONT = "'DejaVu Sans', 'Segoe UI', Arial, Helvetica, sans-serif";

function escapeXml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
}

function prettyDate(date) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  });
}

function buildSvg({ date, puzzle }) {
  const lines = [];
  for (let i = 0; i <= 9; i++) {
    const thick = i % 3 === 0;
    const w = thick ? 4 : 1.5;
    const color = thick ? '#0f172a' : '#94a3b8';
    const p = i * CELL;
    lines.push(`<line x1="${X0 + p}" y1="${Y0}" x2="${X0 + p}" y2="${Y0 + GRID}" stroke="${color}" stroke-width="${w}"/>`);
    lines.push(`<line x1="${X0}" y1="${Y0 + p}" x2="${X0 + GRID}" y2="${Y0 + p}" stroke="${color}" stroke-width="${w}"/>`);
  }

  const digits = [];
  for (let i = 0; i < 81; i++) {
    if (!puzzle[i]) continue;
    const cx = X0 + (i % 9) * CELL + CELL / 2;
    const cy = Y0 + Math.floor(i / 9) * CELL + CELL / 2;
    digits.push(`<text x="${cx}" y="${cy + 17}" text-anchor="middle" font-size="50" font-weight="600" fill="#0f172a">${puzzle[i]}</text>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" font-family="${FONT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b1220"/>
      <stop offset="1" stop-color="#1e1b4b"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#5eead4"/>
      <stop offset="1" stop-color="#818cf8"/>
    </linearGradient>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#bg)"/>
  <text x="${SIZE / 2}" y="125" text-anchor="middle" font-size="68" font-weight="700" fill="url(#accent)">Daily Sudoku</text>
  <text x="${SIZE / 2}" y="185" text-anchor="middle" font-size="32" fill="#cbd5e1">${escapeXml(prettyDate(date))}  ·  Medium</text>
  <rect x="${X0 - 14}" y="${Y0 - 14}" width="${GRID + 28}" height="${GRID + 28}" rx="22" fill="#f8fafc"/>
  ${lines.join('\n  ')}
  ${digits.join('\n  ')}
  <text x="${SIZE / 2}" y="1030" text-anchor="middle" font-size="34" font-weight="600" fill="#e2e8f0">Solve it free at intosudoku.com/daily-sudoku</text>
</svg>`;
}

async function renderJpeg(daily) {
  const sharp = require('sharp'); // lazy so buildSvg() is usable without installing deps
  return sharp(Buffer.from(buildSvg(daily))).jpeg({ quality: 92 }).toBuffer();
}

module.exports = { buildSvg, renderJpeg };
