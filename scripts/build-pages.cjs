const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const api = (process.env.EXPO_PUBLIC_OFFERS_API_URL || 'https://waffer-api-3rvu.onrender.com').trim();
if (new URL(api).protocol !== 'https:') throw new Error('GitHub Pages requires an HTTPS API URL.');
const result = spawnSync(process.execPath, [require.resolve('expo/bin/cli'), 'export', '--platform', 'web', '--clear'], {
  cwd: root, stdio: 'inherit', env: { ...process.env, WAFFER_PAGES_BUILD: '1', EXPO_PUBLIC_OFFERS_API_URL: api, CI: '1' },
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
const dist = path.join(root, 'dist');
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
if (!html.includes('/waffer/_expo/')) throw new Error('The exported site is missing the /waffer/ asset prefix.');
fs.writeFileSync(path.join(dist, '.nojekyll'), '');
console.log('GitHub Pages export ready in dist/ for https://mczdj.github.io/waffer/');
