// 18 November 2026 - World News in One Image.
// A deterministic program (Node 22, standard library only) that draws a
// newspaper-style front page summing up the day's world news and writes it
// to /output/entry.png (or $MAKEFUN_OUTPUT_DIR/entry.png).
// No network, no randomness, no time: two runs write identical bytes.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- palette
const CREAM: RGB = [246, 241, 229];
const PAPER: RGB = [255, 253, 247];
const INK: RGB = [20, 33, 61];
const NAVY: RGB = [20, 33, 61];
const RED: RGB = [185, 28, 28];
const ORANGE: RGB = [234, 88, 12];
const GOLD: RGB = [202, 138, 4];
const BLUE: RGB = [29, 78, 216];
const GREEN: RGB = [21, 128, 61];
const PURPLE: RGB = [126, 34, 206];
const TEAL: RGB = [15, 118, 110];
const GREY: RGB = [90, 96, 110];
const WHITE: RGB = [255, 255, 255];
const YELLOW: RGB = [250, 204, 21];

type RGB = [number, number, number];

// ---------------------------------------------------------------- canvas
const px = new Uint8Array(W * H * 3);

function setPixel(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
}

function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) setPixel(xx, yy, c);
  }
}

function frame(x: number, y: number, w: number, h: number, c: RGB, t: number): void {
  fillRect(x, y, w, t, c);
  fillRect(x, y + h - t, w, t, c);
  fillRect(x, y, t, h, c);
  fillRect(x + w - t, y, t, h, c);
}

function fillCircle(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (x * x + y * y <= r * r) setPixel(cx + x, cy + y, c);
    }
  }
}

function ring(cx: number, cy: number, r: number, t: number, c: RGB): void {
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      const d = x * x + y * y;
      if (d <= r * r && d > (r - t) * (r - t)) setPixel(cx + x, cy + y, c);
    }
  }
}

function drawLine(x0: number, y0: number, x1: number, y1: number, c: RGB, t: number): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(x0 + (dx * i) / steps);
    const y = Math.round(y0 + (dy * i) / steps);
    for (let a = 0; a < t; a++) {
      for (let b = 0; b < t; b++) setPixel(x + a, y + b, c);
    }
  }
}

// Blast starburst: alternating long/short spikes around a centre.
function starburst(cx: number, cy: number, r: number, c: RGB): void {
  const spikes = 12;
  for (let i = 0; i < spikes; i++) {
    const a = (i / spikes) * Math.PI * 2;
    const len = i % 2 === 0 ? r : Math.round(r * 0.55);
    drawLine(cx, cy, Math.round(cx + Math.cos(a) * len), Math.round(cy + Math.sin(a) * len), c, 5);
  }
  fillCircle(cx, cy, Math.round(r * 0.5), c);
}

// ---------------------------------------------------------------- 5x7 font
// Each glyph is 7 rows of 5 bits ('#' set, '.' clear). Uppercase only;
// all copy is uppercased before drawing.
const GLYPHS: Record<string, string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['#####', '...#.', '..#..', '...#.', '....#', '#...#', '.###.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.##..', '..#..', '.#...'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  ';': ['.....', '.##..', '.##..', '.....', '.##..', '..#..', '.#...'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  '-': ['.....', '.....', '.....', '.###.', '.....', '.....', '.....'],
  "'": ['..#..', '..#..', '.#...', '.....', '.....', '.....', '.....'],
  '\u2019': ['..#..', '..#..', '.#...', '.....', '.....', '.....', '.....'],
  '(': ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.'],
  ')': ['.#...', '..#..', '...#.', '...#.', '...#.', '..#..', '.#...'],
  '&': ['.##..', '#..#.', '#.#..', '.#...', '#.#.#', '#..#.', '.##.#'],
  '%': ['##..#', '##.#.', '....#', '...#.', '..#..', '.#.#.', '#..##'],
  '/': ['....#', '...#.', '...#.', '..#..', '.#...', '.#...', '#....'],
  '+': ['.....', '..#..', '..#..', '.###.', '..#..', '..#..', '.....'],
  '$': ['..#..', '.####', '#.#..', '.###.', '..#.#', '####.', '..#..'],
  '#': ['.#.#.', '.#.#.', '#####', '.#.#.', '#####', '.#.#.', '.#.#.'],
  '=': ['.....', '.....', '#####', '.....', '#####', '.....', '.....'],
  '"': ['.#.#.', '.#.#.', '.....', '.....', '.....', '.....', '.....'],
  '*': ['.....', '#.#.#', '.###.', '#####', '.###.', '#.#.#', '.....'],
};

function textWidth(text: string, scale: number): number {
  return text.length * 6 * scale - scale;
}

function drawText(text: string, x: number, y: number, scale: number, c: RGB): void {
  const s = text.toUpperCase();
  for (let i = 0; i < s.length; i++) {
    const g = GLYPHS[s[i]] ?? GLYPHS['?'];
    if (!g) continue;
    const ox = x + i * 6 * scale;
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (g[r][col] === '#') fillRect(ox + col * scale, y + r * scale, scale, scale, c);
      }
    }
  }
}

function drawTextCentered(text: string, cx: number, y: number, scale: number, c: RGB): void {
  drawText(text, cx - Math.floor(textWidth(text, scale) / 2), y, scale, c);
}

// Greedy word wrap; returns the lines.
function wrap(text: string, maxChars: number): string[] {
  const words = text.toUpperCase().split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur === '') {
      cur = w;
    } else if (cur.length + 1 + w.length <= maxChars) {
      cur += ' ' + w;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur !== '') lines.push(cur);
  return lines;
}

// Draw wrapped text; returns the y just below the last line.
function drawWrapped(
  text: string, x: number, y: number, scale: number, c: RGB, maxWidthPx: number, lineGap: number,
): number {
  const maxChars = Math.max(1, Math.floor((maxWidthPx + scale) / (6 * scale)));
  const lines = wrap(text, maxChars);
  const lineH = 7 * scale + lineGap;
  lines.forEach((ln, i) => drawText(ln, x, y + i * lineH, scale, c));
  return y + lines.length * lineH;
}

// ---------------------------------------------------------------- layout
fillRect(0, 0, W, H, CREAM);
frame(0, 0, W, H, NAVY, 10);

// Masthead
fillRect(10, 10, W - 20, 108, NAVY);
drawTextCentered('WORLD NEWS', W / 2, 30, 7, WHITE);
drawTextCentered('WEDNESDAY, 18 NOVEMBER 2026', W / 2, 82, 2, GOLD);
drawLine(60, 104, W - 60, 104, GOLD, 2);

// Red kicker strip
fillRect(10, 118, W - 20, 34, RED);
drawTextCentered('THE DAY IN BRIEF', W / 2, 128, 2, WHITE);

// ---- Lead story: Iran strikes Kuwait & Bahrain
fillRect(24, 164, 976, 234, PAPER);
frame(24, 164, 976, 234, NAVY, 2);
fillRect(24, 164, 976, 8, RED);
fillCircle(66, 212, 30, RED);
drawTextCentered('1', 66, 196, 4, WHITE);
drawText('LEAD STORY - MIDDLE EAST', 112, 184, 2, RED);
drawText('IRAN STRIKES KUWAIT', 112, 210, 4, NAVY);
drawText('AND BAHRAIN', 112, 244, 4, NAVY);
drawWrapped(
  'TEHRAN SAYS IT HIT THE ALI AL SALEM AIR BASE, HOME TO US FORCES, AFTER US AIRCRAFT STRUCK A MISSILE SITE ON QESHM ISLAND. BAHRAIN SAYS IT INTERCEPTED ATTACKS BEFORE DAWN.',
  112, 288, 2, INK, 560, 6,
);
// Blast graphic on the right of the lead story
starburst(852, 268, 78, ORANGE);
starburst(852, 268, 52, RED);
fillCircle(852, 268, 24, YELLOW);
drawTextCentered('THE GULF', 852, 356, 2, RED);

// ---- Grid of four stories: 2 x 2
interface Card {
  n: string;
  kicker: string;
  headline: string;
  body: string;
  color: RGB;
}

const CARDS: Card[] = [
  {
    n: '2',
    kicker: 'EUROPE - WAR IN UKRAINE',
    headline: 'UKRAINE HITS THE KERCH BRIDGE',
    body: 'DRONE AND MISSILE STRIKES PARTLY DESTROY THE BRIDGE TO CRIMEA. ONE OF ITS ARCHES COLLAPSES INTO THE STRAIT.',
    color: BLUE,
  },
  {
    n: '3',
    kicker: 'ASIA - DIPLOMACY',
    headline: 'XI MEETS PUTIN IN SHENZHEN',
    body: 'CHINA AND RUSSIA COORDINATE AHEAD OF THURSDAY\u2019S TRILATERAL SUMMIT WITH TRUMP AT THE APEC FORUM.',
    color: GREEN,
  },
  {
    n: '4',
    kicker: 'UNITED STATES - POLITICS',
    headline: 'DEMOCRATS TAKE THE SENATE',
    body: 'MARY PELTOLA WINS ALASKA, FLIPPING THE CHAMBER TO A 56-44 DEMOCRATIC MAJORITY.',
    color: PURPLE,
  },
  {
    n: '5',
    kicker: 'UNITED STATES - HEALTH',
    headline: 'US LOSES MEASLES-FREE STATUS',
    body: 'AFTER 26 YEARS, ELIMINATION STATUS ENDS WITH MORE THAN 5,400 CASES AND 10 DEATHS.',
    color: TEAL,
  },
];

const CARD_W = 478;
const CARD_H = 198;
const CARD_X = [24, 522];
const CARD_Y = [414, 624];

CARDS.forEach((card, i) => {
  const x = CARD_X[i % 2];
  const y = CARD_Y[Math.floor(i / 2)];
  fillRect(x, y, CARD_W, CARD_H, PAPER);
  frame(x, y, CARD_W, CARD_H, NAVY, 2);
  fillRect(x, y, CARD_W, 8, card.color);
  fillRect(x + 16, y + 22, 34, 34, card.color);
  drawTextCentered(card.n, x + 33, y + 30, 3, WHITE);
  drawText(card.kicker, x + 62, y + 26, 1, card.color);
  drawWrapped(card.headline, x + 16, y + 68, 3, NAVY, CARD_W - 32, 4);
  drawWrapped(card.body, x + 16, y + 128, 2, INK, CARD_W - 32, 6);
});

// ---- Also today strip
fillRect(24, 838, 976, 118, NAVY);
drawText('ALSO TODAY', 44, 856, 2, GOLD);
const ALSO = [
  'EBOLA IN DR CONGO PASSES 11,000 CASES - THREE IN FOUR CHILDREN UNDER 5 DIE',
  'NVIDIA POSTS A RECORD $115.8B QUARTER AS ITS BOARD REJECTS HUANG\u2019S RETURN',
  'MATAN KAHANA ELECTED SPEAKER OF ISRAEL\u2019S KNESSET IN A BLOW TO NETANYAHU',
];
ALSO.forEach((line, i) => {
  const y = 888 + i * 22;
  fillRect(44, y + 2, 10, 10, RED);
  drawText(line, 66, y, 1, WHITE);
});

// Footer
drawTextCentered('SOURCES: REUTERS - AP - AFP  -  18 NOVEMBER 2026', W / 2, 974, 1, GREY);

// ---------------------------------------------------------------- PNG encode
function crc32(buf: Buffer): number {
  let table = (crc32 as unknown as { table?: Int32Array }).table;
  if (!table) {
    table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
    (crc32 as unknown as { table: Int32Array }).table = table;
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // colour type: truecolour RGB
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const raw = Buffer.alloc(H * (1 + W * 3));
for (let y = 0; y < H; y++) {
  raw[y * (1 + W * 3)] = 0; // filter: none
  raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
}

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'entry.png'), png);
