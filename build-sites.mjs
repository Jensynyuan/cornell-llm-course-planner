import fs from 'node:fs';
import path from 'node:path';

const root = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
process.chdir(decodeURIComponent(root));
const publicFiles = [
  'index.html', 'styles.css', 'app.js', 'calendar-integration.js',
  'nybar-allocation.js', 'nybar-eligibility.js', 'catalog-compatibility.js', '_headers',
  'CLOUDFLARE_DEPLOY.md', 'IMPORT_SCHEMA.md', 'T14_IMPORT_GUIDE.md',
  'assets', 'templates'
];
fs.mkdirSync('dist/client/data/cureviews', { recursive: true });
fs.mkdirSync('dist/server/functions/api', { recursive: true });
for (const item of publicFiles) fs.cpSync(item, path.join('dist/client', item), { recursive: true });
for (const item of fs.readdirSync('data')) {
  if (fs.statSync(path.join('data', item)).isFile() && /\.(?:js|json)$/.test(item)) {
    fs.copyFileSync(path.join('data', item), path.join('dist/client/data', item));
  }
}
fs.copyFileSync('data/cureviews/cureviews-law-current.js', 'dist/client/data/cureviews/cureviews-law-current.js');
fs.copyFileSync('sites-worker.mjs', 'dist/server/index.js');
for (const item of ['fetch-source.js', 'inspect-import-zip.js']) {
  fs.copyFileSync(path.join('functions/api', item), path.join('dist/server/functions/api', item));
}
fs.writeFileSync('dist/server/wrangler.json', JSON.stringify({
  name: 'llmcornell', main: 'index.js', compatibility_date: '2026-10-08',
  assets: { directory: '../client', binding: 'ASSETS', run_worker_first: ['/api/*'] }
}, null, 2) + '\n');
console.log('Updated v5.37 assets and both original API handlers are ready.');
