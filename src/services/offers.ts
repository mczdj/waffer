export type LiveOffer = {
  title: string; store: string; price: number; priceText: string;
  link: string; image: string | null; delivery: string | null; multipleStores?: boolean;
};

// Option A (simplest, demo only): EXPO_PUBLIC_SERPAPI_KEY=... in .env. The key is bundled into the app,
// so use it for demos only. Option B (recommended for a real release): run server/index.mjs and set
// EXPO_PUBLIC_OFFERS_API_URL=http://<host>:8787 so the key stays on the server.
// @ts-ignore Expo inlines EXPO_PUBLIC_* at build time
const BASE: string | undefined = process.env.EXPO_PUBLIC_OFFERS_API_URL;
// @ts-ignore
const KEY: string | undefined = process.env.EXPO_PUBLIC_SERPAPI_KEY;

export const livePricesConfigured = !!(BASE || KEY);

function normalize(payload: any): LiveOffer[] {
  const rows: any[] = Array.isArray(payload?.shopping_results) ? payload.shopping_results : [];
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

const cache = new Map<string, LiveOffer[]>();

export async function fetchLiveOffers(query: string, signal?: AbortSignal): Promise<LiveOffer[]> {
  const key = query.toLowerCase();
  if (cache.has(key)) return cache.get(key)!;
  let offers: LiveOffer[] = [];
  if (BASE) {
    const res = await fetch(`${BASE.replace(/\/$/, '')}/offers?q=${encodeURIComponent(query)}`, { signal });
    if (!res.ok) throw new Error(`Price service error ${res.status}`);
    const data = await res.json();
    offers = Array.isArray(data.offers) ? data.offers : [];
  } else if (KEY) {
    const params = new URLSearchParams({ engine: 'google_shopping', q: query, gl: 'ae', hl: 'en', google_domain: 'google.ae', api_key: KEY });
    const res = await fetch(`https://serpapi.com/search.json?${params.toString()}`, { signal });
    if (!res.ok) throw new Error(`Price service error ${res.status}`);
    offers = normalize(await res.json());
  }
  cache.set(key, offers);
  return offers;
}
