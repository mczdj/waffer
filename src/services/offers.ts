export type LiveOffer = {
  title: string;
  store: string;
  price: number;
  priceText: string;
  link: string;
  image: string | null;
  delivery: string | null;
  productId?: string | null;
  multipleStores?: boolean;
};

export type ProductStore = {
  name: string;
  title: string;
  price: number | null;
  priceText: string;
  link: string;
  shipping: string | null;
  availability: string | null;
};

export type ProductVideo = {
  title: string;
  link: string;
  source: string;
  channel: string | null;
  duration: string | null;
  thumbnail: string | null;
};

export type ProductDetails = {
  title: string;
  stores: ProductStore[];
  videos: ProductVideo[];
};

// The API base URL is public configuration; the SerpApi key must remain on the server.
// @ts-ignore Expo inlines EXPO_PUBLIC_* at build time
const BASE: string | undefined = process.env.EXPO_PUBLIC_OFFERS_API_URL;
// Legacy local-only fallback. Never set this for a published web or Android build.
// @ts-ignore
const KEY: string | undefined = process.env.EXPO_PUBLIC_SERPAPI_KEY;

export const livePricesConfigured = !!(BASE || KEY);

function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? value : null;
  } catch {
    return null;
  }
}

function normalize(payload: any): LiveOffer[] {
  const rows: any[] = Array.isArray(payload?.shopping_results) ? payload.shopping_results : [];
  return rows
    .filter((r) => typeof r.extracted_price === 'number' && r.extracted_price > 0 && safeHttpUrl(r.product_link || r.link))
    .map((r) => ({
      title: String(r.title ?? ''),
      store: String(r.source ?? 'Google Shopping').replace(/^from\s+/i, ''),
      price: r.extracted_price,
      priceText: String(r.price ?? `AED ${r.extracted_price.toFixed(2)}`),
      link: safeHttpUrl(r.link || r.product_link)!,
      image: safeHttpUrl(r.thumbnail),
      delivery: r.delivery ? String(r.delivery) : null,
      productId: r.product_id ? String(r.product_id) : null,
      multipleStores: !!r.multiple_sources,
    }))
    .sort((a, b) => a.price - b.price)
    .slice(0, 30);
}

const offerCache = new Map<string, LiveOffer[]>();
const productCache = new Map<string, ProductDetails>();

export async function fetchLiveOffers(query: string, signal?: AbortSignal): Promise<LiveOffer[]> {
  const key = query.toLowerCase().trim();
  if (offerCache.has(key)) return offerCache.get(key)!;
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
  offers = [...offers].sort((a, b) => a.price - b.price);
  offerCache.set(key, offers);
  return offers;
}

export async function fetchProductDetails(productId: string, signal?: AbortSignal): Promise<ProductDetails> {
  if (productCache.has(productId)) return productCache.get(productId)!;
  if (!BASE) throw new Error('Product videos and direct store links require the Waffer API server.');
  const res = await fetch(`${BASE.replace(/\/$/, '')}/product?product_id=${encodeURIComponent(productId)}`, { signal });
  if (!res.ok) throw new Error(`Product details service error ${res.status}`);
  const data = await res.json();
  const details: ProductDetails = {
    title: String(data.title ?? ''),
    stores: Array.isArray(data.stores) ? data.stores : [],
    videos: Array.isArray(data.videos) ? data.videos : [],
  };
  productCache.set(productId, details);
  return details;
}
