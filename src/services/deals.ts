export type LiveDeal = {
  id: string;
  title: string;
  store: string;
  url: string;
  validFrom: string | null;
  validUntil: string | null;
  source: string;
};

const BASE: string | undefined = process.env.EXPO_PUBLIC_OFFERS_API_URL;

export async function fetchCurrentDeals(): Promise<LiveDeal[]> {
  if (!BASE) throw new Error('The hosted Waffer API URL is not configured.');
  const response = await fetch(`${BASE.replace(/\/$/, '')}/deals`);
  if (!response.ok) throw new Error(`Deals service error ${response.status}`);
  const payload = await response.json();
  return Array.isArray(payload?.deals) ? payload.deals as LiveDeal[] : [];
}
