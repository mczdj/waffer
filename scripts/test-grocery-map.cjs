// No test framework required: compile only the pure map utilities using installed TypeScript.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
function load(file) {
  const filename = path.resolve(__dirname, '..', file);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const m = new Module(filename, module); m.filename = filename; m.paths = module.paths; m._compile(code, filename); return m.exports;
}
const { project, unproject, visibleTiles } = load('src/utils/mapProjection.ts');
const { AREA_CENTERS, distanceKm, normalizeNearby, fetchNearbyStores } = load('src/services/nearby.ts');
(async () => {
  const center = AREA_CENTERS['Mohammed Bin Zayed City, Abu Dhabi'];
  for (const c of Object.values(AREA_CENTERS)) for (const z of [10, 12, 18]) {
    const p = project(c, z), back = unproject(p, z);
    assert.ok(Math.abs(c.latitude - back.latitude) < 1e-8);
    assert.ok(Math.abs(c.longitude - back.longitude) < 1e-8);
    const tiles = visibleTiles(p, 390, 330, z);
    assert.ok(tiles.length >= 4 && tiles.length <= 9);
    assert.ok(tiles.every(t => t.wrappedX >= 0 && t.wrappedX < 2 ** z && t.y >= 0 && t.y < 2 ** z));
    assert.ok(tiles.some(t => t.left <= 0 && t.top <= 0));
  }
  const p = project(center, 12);
  const moved = unproject({ x: p.x + 256, y: p.y }, 12);
  assert.ok(moved.longitude > center.longitude);
  assert.ok(distanceKm(center, moved) > 0);
  assert.equal(distanceKm(center, center), 0);
  const rows = { places: [
    { id: 'far', name: 'Test grocery', lat: center.latitude + 0.02, lon: center.longitude, category: 'convenience' },
    { id: 'near', name: 'Test supermarket', lat: center.latitude, lon: center.longitude, category: 'supermarket' },
    { id: 'near', name: 'Duplicate', lat: center.latitude, lon: center.longitude },
    { id: 'bad', name: 'Invalid', lat: 1000, lon: 20 },
  ] };
  assert.deepEqual(normalizeNearby(rows, center).map(p => p.id), ['near', 'far']);
  assert.throws(() => normalizeNearby({}, center), /invalid response/);
  process.env.EXPO_PUBLIC_OFFERS_API_URL = 'https://example.test/';
  const controller = new AbortController();
  global.fetch = async (url, options) => {
    assert.match(url, /\/nearby\?lat=24\.32700&lon=54\.55200$/);
    assert.equal(options.signal, controller.signal);
    return { ok: true, json: async () => rows };
  };
  assert.equal((await fetchNearbyStores(center, controller.signal)).length, 2);
  global.fetch = async () => ({ ok: false, status: 502 });
  await assert.rejects(fetchNearbyStores(center, controller.signal), /502/);
  console.log('PASS: map projection, viewport tiles, panning, distances, pin validation, API request and error handling.');
})().catch(e => { console.error(e); process.exitCode = 1; });
