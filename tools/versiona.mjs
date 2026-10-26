#!/usr/bin/env node
// Puja la versió de l'app d'un sol cop: node tools/versiona.mjs 7
// Actualitza index.html (full d'estils, main.js i import map amb TOTS els mòduls) i sw.js.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const v = process.argv[2];
if (!/^\d+$/.test(v || '')) { console.error('Ús: node tools/versiona.mjs <número>'); process.exit(1); }

const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const mods = walk('js').filter((f) => f.endsWith('.js') && f !== 'js/main.js' && !f.includes('/vendor/')).sort();
const imports = Object.fromEntries(mods.map((m) => [`./${m}`, `./${m}?v=${v}`]));
// el vendor també, perquè els imports relatius '../vendor/…' es resolen a ./js/vendor/…
for (const f of walk('js/vendor').filter((f) => f.endsWith('.js'))) imports[`./${f}`] = `./${f}?v=${v}`;

let html = readFileSync('index.html', 'utf8');
html = html.replace(/css\/app\.css\?v=\d+/, `css/app.css?v=${v}`)
  .replace(/js\/main\.js\?v=\d+/, `js/main.js?v=${v}`)
  .replace(/<script type="importmap">[\s\S]*?<\/script>/, `<script type="importmap">\n${JSON.stringify({ imports }, null, 1)}\n</script>`);
writeFileSync('index.html', html);

let sw = readFileSync('sw.js', 'utf8');
sw = sw.replace(/casa-v\d+/, `casa-v${v}`).replace(/\?v=\d+/g, `?v=${v}`);
writeFileSync('sw.js', sw);
console.log(`Versió ${v}: ${Object.keys(imports).length} mòduls a l'import map.`);
