// Usage: npm run import-menu -- path/to/menu.csv
// CSV columns (header row required; quote fields containing commas):
//   restaurant_id,category,name,description,image_url,talabat_price,keeta_price,smiles_price,discount_talabat,discount_keeta,discount_smiles
// restaurant_id is one of: mcd kfc bk ph sb costa th dunkin pj sub zwz joll
// Leave a platform price blank if the item isn't sold there. Output: src/menus/imported.json
import fs from 'node:fs';

// PLACEHOLDER fees: replace with verified values per platform/restaurant before presenting as real.
const PLATFORMS = {
  talabat: { platform: 'Talabat', deliveryFee: 5, serviceFee: 2, url: 'https://www.talabat.com/uae' },
  keeta: { platform: 'Keeta', deliveryFee: 0, serviceFee: 2, url: 'https://www.keeta-global.com/AE/en' },
  smiles: { platform: 'Smiles', deliveryFee: 6, serviceFee: 1.5, url: 'https://smiles.ae/' },
};

function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

export function convert(csv) {
  const [head, ...body] = parseCsv(csv);
  const col = Object.fromEntries(head.map((h, i) => [h.trim().toLowerCase(), i]));
  const get = (r, k) => (r[col[k]] ?? '').trim();
  const out = []; const errors = [];
  body.forEach((r, n) => {
    const line = n + 2;
    const rid = get(r, 'restaurant_id'), name = get(r, 'name');
    if (!rid || !name) return errors.push(`line ${line}: restaurant_id and name are required`);
    const prices = [];
    for (const [key, p] of Object.entries(PLATFORMS)) {
      const raw = get(r, `${key}_price`);
      if (!raw) continue;
      const price = Number(raw);
      if (!Number.isFinite(price) || price <= 0) { errors.push(`line ${line}: bad ${key}_price "${raw}"`); continue; }
      const discount = Number(get(r, `discount_${key}`)) || 0;
      prices.push({ id: `${rid}-${n}-${key}`, platform: p.platform, itemPrice: price, deliveryFee: p.deliveryFee, serviceFee: p.serviceFee, discount, url: p.url });
    }
    const category = get(r, 'category') || 'Menu';
    out.push({
      id: `${rid}-${n}`, restaurantId: rid, name, description: get(r, 'description'), category,
      basePrice: prices.length ? Math.min(...prices.map((p) => p.itemPrice)) : 0, imageLabel: name, imageUri: get(r, 'image_url') || undefined,
      fallbackIcon: '🍽️', options: ['Regular'], prices,
    });
  });
  return { items: out, errors };
}

if (process.argv[1] && process.argv[1].endsWith('import-menu.mjs')) {
  const file = process.argv[2];
  if (!file) { console.error('Usage: npm run import-menu -- menu.csv'); process.exit(1); }
  const { items, errors } = convert(fs.readFileSync(file, 'utf8'));
  errors.forEach((e) => console.warn('⚠', e));
  fs.writeFileSync('src/menus/imported.json', JSON.stringify(items, null, 2));
  const per = items.reduce((a, m) => ((a[m.restaurantId] = (a[m.restaurantId] ?? 0) + 1), a), {});
  console.log(`Imported ${items.length} items:`, per);
}
