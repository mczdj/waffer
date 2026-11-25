// Tiny price proxy. Keeps your SerpApi key off the phone.
//   SERPAPI_KEY=xxxx node server/index.mjs        (listens on :8787)
// App calls: GET /offers?q=nike+air+max  ->  { query, offers: [{ title, store, price, priceText, link, image, delivery }] }
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const PORT = process.env.PORT || 8787;
const KEY = process.env.SERPAPI_KEY;
const CACHE_MS = 10 * 60 * 1000;
const cache = new Map();

export function normalize(payload) {
  const rows = Array.isArray(payload?.shopping_results) ? payload.shopping_results : [];
  return rows
    .filter((r) => typeof r.extracted_price === 'number' && r.extracted_price > 0 && (r.product_link || r.link))
    .map((r) => ({
      title: String(r.title ?? ''),
      store: String(r.source ?? 'Google Shopping').replace(/^from\s+/i, ''),
      price: r.extracted_price,
      priceText: r.price ?? `${r.extracted_price}`,
      link: r.link || r.product_link,
      image: r.thumbnail ?? null,
      delivery: r.delivery ?? null,
      multipleStores: !!r.multiple_sources,
    }))
    .sort((a, b) => a.price - b.price)
    .slice(0, 30);
}

async function fetchOffers(q) {
  const hit = cache.get(q);
  if (hit && Date.now() - hit.t < CACHE_MS) return hit.v;
  const url = new URL('https://serpapi.com/search.json');
  url.search = new URLSearchParams({ engine: 'google_shopping', q, gl: 'ae', hl: 'en', google_domain: 'google.ae', api_key: KEY });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`SerpApi ${res.status}`);
  const v = { query: q, offers: normalize(await res.json()) };
  cache.set(q, { t: Date.now(), v });
  return v;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {  if (!KEY) { console.error('Set SERPAPI_KEY first (https://serpapi.com).'); process.exit(1); }
  http.createServer(async (req, res) => {
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('content-type', 'application/json');
    const u = new URL(req.url, 'http://x');
    const q = (u.searchParams.get('q') ?? '').trim().slice(0, 100);
    if (u.pathname !== '/offers' || q.length < 2) { res.statusCode = 400; return res.end('{"error":"use /offers?q=term"}'); }
    try { res.end(JSON.stringify(await fetchOffers(q))); }
    catch (e) { res.statusCode = 502; res.end(JSON.stringify({ error: String(e.message) })); }
  }).listen(PORT, () => console.log(`Waffer price proxy on :${PORT}`));
}
