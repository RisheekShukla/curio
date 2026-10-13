// Generates PWA icons (PNG) and per-category fallback illustrations (SVG) with no dependencies.
// Usage: node scripts/generate-icons.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const root = new URL("../", import.meta.url);
const BG = [28, 26, 24];
const FG = [250, 248, 245];
const ACCENT = [208, 112, 63];

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(size, pixel) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y);
      raw.set([r, g, b, a], y * (size * 4 + 1) + 1 + x * 4);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Lens motif: a ring with an accent dot. `scale` shrinks it into the maskable safe zone. */
function icon(size, { maskable }) {
  const S = 4;
  const c = size / 2;
  const scale = maskable ? 0.72 : 1;
  const corner = maskable ? 0 : size * 0.22;
  const ringR = size * 0.24 * scale;
  const ringW = size * 0.075 * scale;
  const dotR = size * 0.07 * scale;
  const sample = (px, py) => {
    if (corner) {
      const dx = Math.max(corner - px, 0, px - (size - corner));
      const dy = Math.max(corner - py, 0, py - (size - corner));
      if (dx * dx + dy * dy > corner * corner) return null;
    }
    const d = Math.hypot(px - c, py - c);
    if (Math.abs(d - ringR) <= ringW / 2) return FG;
    if (Math.hypot(px - (c + ringR * 0.95), py - (c - ringR * 0.95)) <= dotR) return ACCENT;
    return BG;
  };
  return png(size, (x, y) => {
    let r = 0, g = 0, b = 0, a = 0;
    for (let i = 0; i < S; i++)
      for (let j = 0; j < S; j++) {
        const col = sample(x + (i + 0.5) / S, y + (j + 0.5) / S);
        if (!col) continue;
        r += col[0]; g += col[1]; b += col[2]; a += 255;
      }
    const n = a / 255 || 1;
    return [Math.round(r / n), Math.round(g / n), Math.round(b / n), Math.round(a / (S * S))];
  });
}

mkdirSync(new URL("public/icons/", root), { recursive: true });
writeFileSync(new URL("public/icons/icon-192.png", root), icon(192, { maskable: false }));
writeFileSync(new URL("public/icons/icon-512.png", root), icon(512, { maskable: false }));
writeFileSync(new URL("public/icons/icon-maskable-512.png", root), icon(512, { maskable: true }));
writeFileSync(new URL("public/icons/apple-touch-icon.png", root), icon(180, { maskable: true }));

writeFileSync(
  new URL("src/app/icon.svg", root),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#1c1a18"/><circle cx="32" cy="32" r="15" fill="none" stroke="#faf8f5" stroke-width="5"/><circle cx="46" cy="18" r="4.5" fill="#d0703f"/></svg>\n`,
);

// Calm, abstract per-category fallbacks used when a remote image is missing or fails to load.
const PALETTES = {
  science: ["#e8eef0", "#9fb8c2", "#4c6f7d"],
  space: ["#1f2433", "#3c4466", "#c9b98f"],
  nature: ["#e7ede2", "#a3b89a", "#56704d"],
  history: ["#f1e8dc", "#c9ab84", "#7d5b3a"],
  technology: ["#e9eaee", "#a9adbd", "#4f5468"],
  engineering: ["#ece9e4", "#b4aa9c", "#5f574c"],
  psychology: ["#efe7ee", "#bfa3bb", "#6e4d69"],
  geography: ["#eee8de", "#c7b48f", "#6f8a7a"],
  culture: ["#f2e6e1", "#d39f8c", "#8a4b39"],
  mathematics: ["#e8ebf0", "#a8b3c8", "#4b5a78"],
};
mkdirSync(new URL("public/fallbacks/", root), { recursive: true });
for (const [name, [a, b, c]] of Object.entries(PALETTES)) {
  writeFileSync(
    new URL(`public/fallbacks/${name}.svg`, root),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
<rect width="1600" height="1000" fill="url(#g)"/>
<circle cx="1150" cy="420" r="300" fill="none" stroke="${c}" stroke-opacity=".35" stroke-width="60"/>
<circle cx="1370" cy="200" r="70" fill="${c}" fill-opacity=".55"/>
<path d="M0 820 C 400 700, 800 940, 1600 780 L1600 1000 L0 1000 Z" fill="${c}" fill-opacity=".18"/>
</svg>\n`,
  );
}
console.log("Icons and fallbacks generated.");
