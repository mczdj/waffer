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
const UAE_RETAILER_NAMES = /\b(noon|amazon\.ae|carrefour|lulu|talabat|deliveroo|spinneys|waitrose|union coop|nesto|life pharmacy|aster|supercare|sharaf dg|virgin megastore)\b/i;

function isUaeRetailer(row) {
  const link = safeHttpUrl(row.product_link || row.link);
  if (!link) return false;
  let host = '';
  try { host = new URL(link).hostname.toLowerCase().replace(/^www\\./, ''); } catch { return false; }
  const isAeDomain = host.endsWith('.ae') || host === 'ae';
  const knownDomain = [...UAE_RETAILER_DOMAINS].some((domain) => host === domain || host.endsWith(`.${domain}`));
  const sellerName = String(row.source || row.merchant || '');
  const shipping = String(row.delivery || row.shipping || '');
  const explicitUaeShipping = /\b(UAE|United Arab Emirates|Abu Dhabi|Dubai|Sharjah)\b/i.test(shipping);
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

  const localizedQuery = /\b(UAE|United Arab Emirates)\b/i.test(q) ? q : `${q} UAE`;
  const isDairyQuery = /\b(milk|yogurt|yoghurt|cheese|eggs?)\b/i.test(q);
  const fallbackQueries = isDairyQuery
    ? ['milk UAE', 'eggs UAE', 'yogurt UAE', 'cheese UAE']
    : [];
  const queries = [localizedQuery, ...fallbackQueries];
  const combinedRows = [];
  const attempted = [];
  let lastNoResultsError = null;

  for (const searchQuery of [...new Set(queries)]) {
    attempted.push(searchQuery);
    try {
      const payload = await serpApi({
        engine: 'google_shopping',
        q: searchQuery,
        google_domain: 'google.ae',
      });
      const rows = Array.isArray(payload?.shopping_results) ? payload.shopping_results : [];
      combinedRows.push(...rows);
      // Stop once enough UAE-verified listings are available. If filtering
      // removes all rows, try the simpler dairy searches before giving up.
      if (normalize({ shopping_results: combinedRows }).length >= 5) break;
    } catch (error) {
      if (/hasn't returned any results|did not return any results|no results/i.test(error.message)) {
        lastNoResultsError = error;
        continue;
      }
      throw error;
    }
  }

  const value = { query: q, offers: normalize({ shopping_results: combinedRows }) };
  // A no-results response is a valid empty search, not a server failure.
  if (!value.offers.length && lastNoResultsError && attempted.length === queries.length) {
    console.warn(`Waffer grocery search returned no results after fallback queries: ${attempted.join(' | ')}`);
  }
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


const dealsCache = { t: 0, v: null };
const DEALS_CACHE_MS = 15 * 60 * 1000;

function decodeHtml(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#8211;|&ndash;/gi, '–')
    .replace(/&#8217;|&rsquo;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();
}

function parseFlyerDates(text) {
  const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  const monthPattern = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec';
  let match = text.match(new RegExp(`(\\d{1,2})\\s+(${monthPattern})\\s*[–-]\\s*(\\d{1,2})\\s+(${monthPattern}),?\\s*(20\\d{2})`, 'i'));
  let from, until;
  if (match) {
    const year = Number(match[5]);
    from = new Date(Date.UTC(year, months[match[2].toLowerCase()], Number(match[1])));
    until = new Date(Date.UTC(year, months[match[4].toLowerCase()], Number(match[3])));
  } else {
    match = text.match(/(\d{1,2})[./](\d{1,2})[./](20\d{2})\s*[–-]\s*(\d{1,2})[./](\d{1,2})[./](20\d{2})/);
    if (!match) return null;
    from = new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1])));
    until = new Date(Date.UTC(Number(match[6]), Number(match[5]) - 1, Number(match[4])));
  }
  const fmt = (date) => date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
  return { from, until, validFrom: fmt(from), validUntil: fmt(until) };
}

function fallbackCurrentDeals() {
  const rows = [
    { id: 'lulu-seafood-2026', title: 'LuLu Hypermarket · Seafood Fest · Abu Dhabi & Al Ain', store: 'LuLu Hypermarket', url: 'https://ads21.net/ae/lulu-hypermarket/seafood-fest-abu-dhabi-al-ain-from-friday-20-nov-2026-6029095/', from: '2026-11-20', until: '2026-11-26' },
    { id: 'lulu-black-friday-2026', title: 'LuLu Hypermarket · Black Friday', store: 'LuLu Hypermarket', url: 'https://ads21.net/ae/lulu-hypermarket/black-friday-from-thursday-19-nov-2026-6029096/', from: '2026-11-19', until: '2026-12-03' },
    { id: 'nesto-mom-baby-2026', title: 'Nesto · Mom & Baby', store: 'Nesto', url: 'https://ads21.net/ae/nesto/mom-baby-from-tuesday-17-nov-2026-6029085/', from: '2026-11-17', until: '2026-12-03' },
    { id: 'day-to-day-christmas-2026', title: 'Day To Day · Christmas catalogue', store: 'Day To Day', url: 'https://ads21.net/ae/day-to-day/christmas-from-tuesday-17-nov-2026-6029057/', from: '2026-11-17', until: '2026-12-31' },
  ];
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dubai' }));
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return rows.filter((row) => row.until >= iso).map((row) => ({
    id: row.id, title: row.title, store: row.store, url: row.url,
    validFrom: row.from, validUntil: row.until, source: 'ADS21 UAE catalogue (cached fallback)',
  }));
}

async function fetchCurrentDeals() {
  if (dealsCache.v && Date.now() - dealsCache.t < DEALS_CACHE_MS) return dealsCache.v;
  const pages = ['https://ads21.net/ae/', 'https://ads21.net/ae/groceries/'];
  const collected = new Map();
  for (const pageUrl of pages) {
    try {
      const response = await fetch(pageUrl, {
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; WafferDeals/1.0)', accept: 'text/html' },
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) continue;
      const markup = await response.text();
      const anchorPattern = /<a\b([^>]*)href=["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi;
      let match;
      while ((match = anchorPattern.exec(markup)) !== null) {
        const href = match[2];
        if (!/\/ae\/[^/]+\/[^/]+/.test(href) || /\/(category|tag|page)\//i.test(href)) continue;
        const attributes = `${match[1]} ${match[3]}`;
        const titleAttr = (attributes.match(/\btitle=["']([^"']+)["']/i) || [])[1] || '';
        const altAttr = (attributes.match(/\balt=["']([^"']+)["']/i) || [])[1] || '';
        const innerAlt = (match[4].match(/\balt=["']([^"']+)["']/i) || [])[1] || '';
        const title = decodeHtml(match[4]) || decodeHtml(titleAttr) || decodeHtml(altAttr) || decodeHtml(innerAlt);
        const dateInfo = parseFlyerDates(`${title} ${decodeHtml(titleAttr)} ${decodeHtml(altAttr)} ${decodeHtml(innerAlt)}`);
        if (!title || !dateInfo) continue;
        const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dubai' }));
        const todayStart = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
        if (dateInfo.until < todayStart) continue;
        const url = safeHttpUrl(new URL(href, pageUrl).toString());
        if (!url || !url.includes('ads21.net/ae/')) continue;
        const pathParts = new URL(url).pathname.split('/').filter(Boolean);
        const retailerSlug = pathParts[1] || 'UAE retailer';
        const store = retailerSlug.split('-').map((word) => word ? word[0].toUpperCase() + word.slice(1) : '').join(' ');
        const id = url.split('/').filter(Boolean).pop();
        collected.set(url, {
          id: String(id || collected.size),
          title: title.slice(0, 150),
          store,
          url,
          validFrom: dateInfo.validFrom,
          validUntil: dateInfo.validUntil,
          source: 'ADS21 UAE catalogue',
        });
      }
    } catch (error) {
      console.warn(`Waffer deals source unavailable (${new URL(pageUrl).pathname}): ${error.message}`);
    }
  }
  let deals = [...collected.values()]
    .sort((a, b) => new Date(a.validUntil) - new Date(b.validUntil))
    .slice(0, 30);
  if (!deals.length) deals = fallbackCurrentDeals();
  const value = { deals, source: 'ADS21 UAE retailer catalogues', updatedAt: new Date().toISOString() };
  dealsCache.t = Date.now();
  dealsCache.v = value;
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
      if (u.pathname === '/deals') {
        try {
          const result = await fetchCurrentDeals();
          return send(res, 200, result);
        } catch (error) {
          console.error('Waffer deals refresh failed; serving dated UAE catalogue fallback:', error.stack || error.message);
          const deals = fallbackCurrentDeals();
          const result = {
            deals,
            source: 'ADS21 UAE catalogue (fallback)',
            updatedAt: new Date().toISOString(),
            stale: true,
          };
          // Cache the fallback briefly to avoid repeatedly hitting an unavailable source.
          dealsCache.t = Date.now();
          dealsCache.v = result;
          return send(res, 200, result);
        }
      }
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
      return send(res, 404, { error: 'Not found. Use /health, /deals, /offers?q=term, /product?product_id=ID or /nearby?lat=..&lon=.. .' });
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
