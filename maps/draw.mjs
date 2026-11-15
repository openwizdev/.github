// Draws the OpenWiz architecture maps as hand-drawn pictures.
// Usage: node draw.mjs <Virgil-Regular.woff2> <out-dir>
// Writes one HTML page per map; render each with headless Chromium:
//   chromium --headless --screenshot=<map>.png --window-size=<width>,<height> --force-device-scale-factor=2 <map>.html
// (each page prints "name height width"; see README.md).
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const [font, out] = process.argv.slice(2);
const C = { live: '#2f9e44', soon: '#9c36b5', hub: '#e8a317', ade: '#868e96', ink: '#1e1e1e', sub: '#6c727a', line: '#c4c8cd' };

// Small seeded wobble, so the same map always draws the same way.
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5);
const j = (n = 2.2) => (rnd() * n).toFixed(1);

function stroke(x1, y1, x2, y2, color, width, dash = '') {
  let s = '';
  for (let pass = 0; pass < 2; pass++) {
    const mx = (x1 + x2) / 2 + +j(4), my = (y1 + y2) / 2 + +j(4);
    s += `<path d="M${x1 + +j()} ${y1 + +j()} Q${mx} ${my} ${x2 + +j()} ${y2 + +j()}" fill="none" stroke="${color}" stroke-width="${pass ? width * 0.6 : width}" stroke-linecap="round" ${dash && `stroke-dasharray="${dash}"`} opacity="${pass ? 0.55 : 1}"/>`;
  }
  return s;
}
function rect(x, y, w, h, color, width = 4, dash = '') {
  return stroke(x, y, x + w, y, color, width, dash) + stroke(x + w, y, x + w, y + h, color, width, dash)
    + stroke(x + w, y + h, x, y + h, color, width, dash) + stroke(x, y + h, x, y, color, width, dash);
}
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const text = (x, y, s, size, color, anchor = 'middle', max = 0) =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" text-anchor="${anchor}"${max ? ` data-max="${max}"` : ''}>${esc(s)}</text>`;

// A node: title, grey lines, then an optional coloured tag line.
function node({ x, y, w, h, title, lines = [], tag, color }) {
  const rows = [[title, 42, C.ink], ...lines.map(l => [l, 31, C.sub]), ...(tag ? [[tag, 29, color]] : [])];
  const height = rows.reduce((a, [, s]) => a + s * 1.25, 0);
  let ty = y + (h - height) / 2, s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff"/>` + rect(x, y, w, h, color);
  for (const [t, size, c] of rows) { ty += size * 1.25; s += text(x + w / 2, ty - size * 0.3, t, size, c, 'middle', w - 36); }
  return s;
}

function page(name, height, body, W = 900) {
  const html = `<!doctype html><meta charset="utf-8"><style>
@font-face { font-family: Virgil; src: url('${pathToFileURL(font)}'); }
html, body { margin: 0; background: #f8f9fa; } svg { display: block; font-family: Virgil; }
</style><svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${height}" viewBox="0 0 ${W} ${height}">
<rect width="${W}" height="${height}" fill="#f8f9fa"/>${body}</svg>
<script>// Shrink any line wider than its box, once the font is in.
document.fonts.load('30px Virgil').then(() => { for (const t of document.querySelectorAll('[data-max]')) {
  let size = +t.getAttribute('font-size');
  while (t.getComputedTextLength() > +t.dataset.max && size > 18) t.setAttribute('font-size', --size);
} });</script>`;
  writeFileSync(`${out}/${name}.html`, html);
  console.log(name, height, W);
}
const legend = (y, items, W = 900) => items.map(([label, color], i, all) => {
  const step = W / all.length, cx = step * i + step / 2;
  return stroke(cx - 95, y, cx - 60, y, color, 6) + text(cx - 50, y + 10, label, 29, C.sub, 'start');
}).join('');

// The org map: the factory in the middle, its five parts around it, all inside Cloudroom.
{
  const L = 45, R = 465, NW = 390, NH = 200;
  const hub = { x: 215, y: 375, w: 470, h: 160 };
  const parts = [
    { x: L, y: 120, title: 'Graph', lines: ['WizSkills: plan, grill,', 'build, review'], tag: 'repo opens soon', color: C.soon },
    { x: R, y: 120, title: 'Loops', lines: ['WizLoops: one loop', 'interface, any ADE'], tag: 'coming', color: C.soon },
    { x: L, y: 600, title: 'Hands', lines: ['OpenWiz CLI: ls, show,', 'send, new, fleet'], tag: 'repo: OpenWiz', color: C.live },
    { x: R, y: 600, title: 'Eyes', lines: ['WizBar + WizDeck', 'web view in OpenWiz'], tag: 'repo: WizPlugins', color: C.live },
    { x: 255, y: 865, w: 390, h: 170, title: 'Site', lines: ['openwiz.dev, ship log'], tag: 'repo: WizSite', color: C.live },
  ];
  const cx = hub.x + hub.w / 2, cy = hub.y + hub.h / 2;
  const W = 900;
  let b = rect(18, 22, W - 36, 1060, C.ade, 3, '14 12') + text(45, 80, 'Cloudroom: the ADE it all runs in', 32, C.ade, 'start');
  for (const p of parts) b += stroke(cx, cy, p.x + (p.w ?? NW) / 2, p.y + (p.h ?? NH) / 2, C.line, 4);
  b += node({ ...hub, title: 'OpenWiz factory', lines: ['you decide, agents build'], color: C.hub });
  for (const p of parts) b += node({ w: NW, h: NH, ...p });
  b += legend(1135, [['live', C.live], ['coming', C.soon], ['host', C.ade]]);
  page('org', 1175, b);
  column('org-phone', { title: 'OpenWiz factory', lines: ['you decide, agents build'] }, parts,
    { frame: 'Cloudroom: the ADE it all runs in', legend: [['live', C.live], ['coming', C.soon], ['host', C.ade]] });
}

// The phone version of any map: one column, the hub on top, a spine down the left.
function column(name, hub, parts, { frame, legend: keys } = {}) {
  const W = 600, x = 70, w = 500, gap = 30, top = frame ? 95 : 30;
  let y = top + 160 + gap, b = '';
  const ys = parts.map(p => { const h = 60 + (p.lines.length + (p.tag ? 1 : 0)) * 42 + 36; const at = y; y += h + gap; return [at, h]; });
  const end = y - gap;
  if (frame) b += rect(14, 18, W - 28, end + 25 - 18, C.ade, 3, '14 12') + text(36, 68, frame, 30, C.ade, 'start');
  b += stroke(40, top + 80, 40, ys.at(-1)[0] + ys.at(-1)[1] / 2, C.line, 4);
  b += stroke(40, top + 80, 70, top + 80, C.line, 4);
  parts.forEach((p, i) => {
    const [py, h] = ys[i];
    b += stroke(40, py + h / 2, x, py + h / 2, C.line, 4);
    b += node({ color: C.live, ...p, x, y: py, w, h });
  });
  b += node({ x, y: top, w, h: 160, color: C.hub, ...hub });
  let height = end + (frame ? 45 : 30);
  if (keys) { b += legend(height + 20, keys, W); height += 70; }
  page(name, height, b, W);
}

// A repo map: the repo at the top, a spine down the middle, its parts in two columns.
function repo(name, title, sub, parts) {
  const L = 45, R = 465, NW = 390, NH = 190, top = 40, hubH = 140, gap = 40, y0 = top + hubH + 70;
  const rows = Math.ceil(parts.length / 2), end = y0 + rows * (NH + gap) - gap;
  const W = 900;
  let b = stroke(W / 2, top + hubH, W / 2, end - NH / 2, C.line, 4);
  parts.forEach((p, i) => {
    const y = y0 + Math.floor(i / 2) * (NH + gap), x = i % 2 ? R : L;
    b += stroke(i % 2 ? R - 20 : L + NW + 20, y + NH / 2, i % 2 ? R : L + NW, y + NH / 2, C.line, 4);
    b += node({ x, y, w: NW, h: NH, color: C.live, ...p });
  });
  b += node({ x: 215, y: top, w: 470, h: hubH, title, lines: [sub], color: C.hub });
  page(name, end + 40, b);
  column(name + '-phone', { title, lines: [sub] }, parts);
}

repo('openwiz', 'OpenWiz', 'hands and eyes for the factory', [
  { title: 'CLI', lines: ['crates/cli', 'ls, show, send, new, fleet'] },
  { title: 'Web view', lines: ['apps/web + crates/server', 'loopback web app and API'] },
  { title: 'Core', lines: ['crates/core', 'the model, no I/O'] },
  { title: 'Cloudroom adapter', lines: ['crates/adapters/cloudroom', 'the room-cli allowlist'] },
  { title: 'Skills', lines: ['skills/', 'fleet skills, any harness'] },
  { title: 'Contracts + proofs', lines: ['contracts/, tests/', 'synthetic fixtures only'] },
]);
repo('wizplugins', 'WizPlugins', 'the eyes, inside Cloudroom', [
  { title: 'WizBar', lines: ['wizbar/', 'sidebar: cards, pins, stats'] },
  { title: 'WizDeck', lines: ['wizbar/src/deck/', 'home, spec board, Needs you'] },
  { title: 'Contracts', lines: ['wizbar/contracts/', 'settings, factory view'] },
  { title: 'Marketplace', lines: ['marketplace/', 'draft listing entry'] },
  { title: 'Docs', lines: ['docs/', 'discovery, acceptance, evidence'] },
  { title: 'Changelog lines', lines: ['changes/', 'one line per ticket'] },
]);
repo('wizsite', 'WizSite', 'openwiz.dev, static', [
  { title: 'Landing', lines: ['index.html, site.js', 'the hero intro'] },
  { title: 'Ship log', lines: ['changelog/', 'being built, shipped'] },
  { title: 'Art', lines: ['art/', 'engraved WebP layers'] },
  { title: 'Brand + fonts', lines: ['brand/, fonts/', 'lockup, icons, Geist'] },
  { title: 'Build + checks', lines: ['build.mjs, scripts/', 'dist/, links, privacy'] },
  { title: 'Deploy', lines: ['Cloudflare Pages', 'from main'] },
]);
