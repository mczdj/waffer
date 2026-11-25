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
const nearbyCache = new Map();
const requestWindows = new Map();
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60 * 1000;

// Restrict returned offers to sellers with a clear UAE-market signal.
// Google Shopping's gl=ae localizes results but does not guarantee every seller is UAE-based.
const UAE_RETAILER_DOMAINS = new Set([
  'amazon.ae', 'noon.com', 'carrefouruae.com', 'carrefour.com',
  'luluhypermarket.com', 'talabat.com', 'deliveroo.ae', 'smiles.ae',
  'sharafdg.com', 'virginmegastore.ae', 'uae.jashanmal.com',
  'lifepharmacy.com', 'asteronline.com', 'supercare.ae',
  'spinneys.com', 'waitrose.ae', 'unioncoop.ae', 'nesto.com',
  'danubehome.com'
]);
const UAE_RETAILER_NAMES = /\\b(noon|amazon\\.ae|carrefour|lulu|talabat|deliveroo|spinneys|waitrose|union coop|nesto|life pharmacy|aster|supercare|sharaf dg|virgin megastore)\\b/i;

function isUaeRetailer(row) {
  const link = safeHttpUrl(row.product_link || row.link);
  if (!link) return false;
  let host = '';
  try { host = new URL(link).hostname.toLowerCase().replace(/^www\\./, ''); } catch { return false; }
  const isAeDomain = host.endsWith('.ae') || host === 'ae';
  const knownDomain = [...UAE_RETAILER_DOMAINS].some((domain) => host === domain || host.endsWith(`.${domain}`));
  const sellerName = String(row.source || row.merchant || '');
  const shipping = String(row.delivery || row.shipping || '');
  const explicitUaeShipping = /\\b(UAE|United Arab Emirates|Abu Dhabi|Dubai|Sharjah)\\b/i.test(shipping);
  return isAeDomain || knownDomain || (UAE_RETAILER_NAMES.test(sellerName) && explicitUaeShipping);
}

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
    .filter((r) => typeof r.extracted_price === 'number' && r.extracted_price > 0 && isUaeRetailer(r))
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
  if (!KEY) throw new Error('SerpApi is not configured on the server.');
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
  const localizedQuery = /\\b(UAE|United Arab Emirates)\\b/i.test(q) ? q : `${q} UAE`;
  const payload = await serpApi({ engine: 'google_shopping', q: localizedQuery, google_domain: 'google.ae' });
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


async function fetchNearby(lat, lon) {
  const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  const hit = nearbyCache.get(cacheKey);
  if (hit && Date.now() - hit.t < 30 * 60 * 1000) return hit.v;
  const query = `[out:json][timeout:25];(node(around:5000,${lat},${lon})[shop~"supermarket|convenience|greengrocer|general|grocery|food"];way(around:5000,${lat},${lon})[shop~"supermarket|convenience|greengrocer|general|grocery|food"];relation(around:5000,${lat},${lon})[shop~"supermarket|convenience|greengrocer|general|grocery|food"];);out center tags 80;`;
  // Public Overpass instances are best-effort and can be unreachable from
  // some hosting networks. Try independent global/Asia endpoints in sequence.
  const overpassEndpoints = [
    'https://overpass.private.coffee/api/interpreter',
    'https://overpass-api.de/api/interpreter',
    'https://ovp.dresel.systems/api-as/interpreter',
  ];
  let payload = null;
  const providerErrors = [];
  for (const endpoint of overpassEndpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'user-agent': 'WafferUniversityProject/1.0 (nearby grocery finder)',
          'accept': 'application/json',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(18000),
      });
      const body = await response.text();
      let parsed;
      try { parsed = JSON.parse(body); } catch { parsed = null; }
      if (!response.ok || !parsed || !Array.isArray(parsed.elements)) {
        providerErrors.push(`${new URL(endpoint).hostname}: HTTP ${response.status}`);
        continue;
      }
      payload = parsed;
      break;
    } catch (error) {
      providerErrors.push(`${new URL(endpoint).hostname}: ${error.message}`);
    }
  }
  if (!payload) {
    throw new Error(`All nearby map providers failed (${providerErrors.join(' | ')})`);
  }
  const distanceKm = (a, b) => {
    const rad = (v) => v * Math.PI / 180;
    const dLat = rad(a.lat - lat), dLon = rad(a.lon - lon);
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(a.lat)) * Math.sin(dLon / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  };
  const places = payload.elements.map((el) => {
    const tags = el.tags || {};
    const point = el.center || el;
    if (typeof point.lat !== 'number' || typeof point.lon !== 'number') return null;
    const address = [tags['addr:housenumber'], tags['addr:street'], tags['addr:suburb'], tags['addr:city']].filter(Boolean).join(', ');
    return {
      id: `${el.type}-${el.id}`,
      name: String(tags.name || tags.brand || (tags.shop === 'supermarket' ? 'Supermarket' : 'Grocery shop')),
      lat: point.lat, lon: point.lon,
      category: String(tags.shop || 'grocery').replace('_', ' '),
      address,
      phone: tags.phone || tags['contact:phone'] || null,
      website: safeHttpUrl(tags.website || tags['contact:website']),
      distance: Number(distanceKm(point).toFixed(2)),
    };
  }).filter(Boolean).sort((a, b) => a.distance - b.distance).slice(0, 60);
  const value = { places, source: 'OpenStreetMap contributors', radiusMeters: 5000 };
  nearbyCache.set(cacheKey, { t: Date.now(), v: value });
  return value;
}

function send(res, status, payload) {
  res.statusCode = status;
  res.end(JSON.stringify(payload));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
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
      if (u.pathname === '/nearby') {
        const lat = Number(u.searchParams.get('lat'));
        const lon = Number(u.searchParams.get('lon'));
        if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return send(res, 400, { error: 'Valid latitude and longitude are required.' });
        return send(res, 200, await fetchNearby(lat, lon));
      }
      if (u.pathname === '/product') {
        const productId = (u.searchParams.get('product_id') ?? '').trim();
        if (!/^\d{5,30}$/.test(productId)) return send(res, 400, { error: 'A valid Google Shopping product_id is required.' });
        return send(res, 200, await fetchProduct(productId));
      }
      return send(res, 404, { error: 'Not found. Use /health, /offers?q=term, /product?product_id=ID or /nearby?lat=..&lon=.. .' });
    } catch (error) {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      if (pathname === '/nearby') {
        console.error('Waffer nearby API error:', error.stack || error.message);
        return send(res, 502, { error: 'Nearby supermarket data is temporarily unavailable. Please try again shortly.' });
      }
      console.error('Waffer API error:', error.stack || error.message);
      return send(res, 502, { error: 'The shopping provider could not complete this request. Please try again shortly.' });
    }
}).listen(PORT, '0.0.0.0', () => {
  console.log(`Waffer shopping API listening on :${PORT}`);
});}
