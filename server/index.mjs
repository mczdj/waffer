// Waffer shopping API proxy. Keep SERPAPI_KEY on the server, never in the app bundle.
// Local: node --env-file=.env server/index.mjs
// Endpoints: GET /health, /offers?q=lipstick, /product?product_id=<Google Shopping product_id>
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const PORT = Number(process.env.PORT || 8787);
const KEY = process.env.SERPAPI_KEY;
const CACHE_MS = 10 * 60 * 1000;
const PRODUCT_CACHE_MS = 60 * 60 * 1000;
const cache = new Map();
const productCache = new Map();
const requestWindows = new Map();
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60 * 1000;

function safeHttpUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? value : null;
  } catch { return null; }
}

export function normalize(payload) {
  const rows = Array.isArray(payload?.shopping_results) ? payload.shopping_results : [];
  return rows
    .filter((r) => typeof r.extracted_price === 'number' && r.extracted_price > 0 && safeHttpUrl(r.product_link || r.link))
    .map((r) => ({
      title: String(r.title ?? ''),
      store: String(r.source ?? 'Google Shopping').replace(/^from\s+/i, ''),
      price: r.extracted_price,
      priceText: String(r.price ?? `AED ${r.extracted_price.toFixed(2)}`),
      // This is Google's product page. Exact retailer URLs are supplied by /product.
      link: safeHttpUrl(r.product_link || r.link),
      image: safeHttpUrl(r.thumbnail),
      delivery: r.delivery ? String(r.delivery) : null,
      productId: r.product_id ? String(r.product_id) : null,
      multipleStores: !!r.multiple_sources,
    }))
    .sort((a, b) => a.price - b.price)
    .slice(0, 30);
}

async function serpApi(params) {
  const url = new URL('https://serpapi.com/search.json');
  url.search = new URLSearchParams({ ...params, gl: 'ae', hl: 'en', api_key: KEY });
  const response = await fetch(url);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.error) throw new Error(payload?.error || `SerpApi ${response.status}`);
  return payload;
}

async function fetchOffers(q) {
  const hit = cache.get(q);
  if (hit && Date.now() - hit.t < CACHE_MS) return hit.v;
  const payload = await serpApi({ engine: 'google_shopping', q, google_domain: 'google.ae' });
  const value = { query: q, offers: normalize(payload) };
  cache.set(q, { t: Date.now(), v: value });
  return value;
}

async function fetchProduct(productId) {
  const hit = productCache.get(productId);
  if (hit && Date.now() - hit.t < PRODUCT_CACHE_MS) return hit.v;
  const payload = await serpApi({ engine: 'google_product', product_id: productId });
  const result = payload?.product_results ?? {};
  const stores = (Array.isArray(result.stores) ? result.stores : [])
    .filter((s) => safeHttpUrl(s.link))
    .map((s) => ({
      name: String(s.name ?? s.seller ?? 'Retailer'),
      title: String(s.title ?? result.title ?? ''),
      price: typeof s.extracted_price === 'number' ? s.extracted_price : null,
      priceText: String(s.price ?? (typeof s.extracted_price === 'number' ? `AED ${s.extracted_price.toFixed(2)}` : 'See store')),
      link: safeHttpUrl(s.link),
      shipping: s.shipping ? String(s.shipping) : null,
      availability: Array.isArray(s.details_and_offers) ? s.details_and_offers.map(String).join(' · ') : null,
    }))
    .sort((a, b) => (a.price ?? Number.MAX_SAFE_INTEGER) - (b.price ?? Number.MAX_SAFE_INTEGER));
  const videos = (Array.isArray(result.videos) ? result.videos : Array.isArray(payload?.videos) ? payload.videos : [])
    .filter((v) => safeHttpUrl(v.link))
    .map((v) => ({
      title: String(v.title ?? 'Product video'),
      link: safeHttpUrl(v.link),
      source: String(v.source ?? 'Video'),
      channel: v.channel ? String(v.channel) : null,
      duration: v.duration ? String(v.duration) : null,
      thumbnail: safeHttpUrl(v.thumbnail),
    }));
  const value = { title: String(result.title ?? ''), stores, videos };
  productCache.set(productId, { t: Date.now(), v: value });
  return value;
}

function send(res, status, payload) {
  res.statusCode = status;
  res.end(JSON.stringify(payload));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!KEY) { console.error('Set SERPAPI_KEY first (https://serpapi.com).'); process.exit(1); }
  http.createServer(async (req, res) => {
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('access-control-allow-methods', 'GET, OPTIONS');
    res.setHeader('access-control-allow-headers', 'content-type');
    res.setHeader('content-type', 'application/json; charset=utf-8');
    if (req.method === 'OPTIONS') return send(res, 204, {});
    if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });

    const ip = req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const window = requestWindows.get(ip);
    if (!window || now - window.startedAt >= RATE_WINDOW_MS) requestWindows.set(ip, { startedAt: now, count: 1 });
    else if (++window.count > RATE_LIMIT) return send(res, 429, { error: 'Too many requests. Please wait a minute and try again.' });

    const u = new URL(req.url, 'http://localhost');
    if (u.pathname === '/health') return send(res, 200, { ok: true, service: 'waffer-shopping-api' });
    try {
      if (u.pathname === '/offers') {
        const q = (u.searchParams.get('q') ?? '').trim().slice(0, 100);
        if (q.length < 2) return send(res, 400, { error: 'Search query must contain at least 2 characters.' });
        return send(res, 200, await fetchOffers(q));
      }
      if (u.pathname === '/product') {
        const productId = (u.searchParams.get('product_id') ?? '').trim();
        if (!/^\d{5,30}$/.test(productId)) return send(res, 400, { error: 'A valid Google Shopping product_id is required.' });
        return send(res, 200, await fetchProduct(productId));
      }
      return send(res, 404, { error: 'Not found. Use /health, /offers?q=term or /product?product_id=ID.' });
    } catch (error) {
      console.error('Waffer API error:', error.message);
      return send(res, 502, { error: 'The shopping provider could not complete this request. Please try again shortly.' });
    }
}).listen(PORT, '0.0.0.0', () => {
  console.log(`Waffer shopping API listening on :${PORT}`);
});}
