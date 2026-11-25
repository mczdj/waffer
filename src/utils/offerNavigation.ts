import { Alert, Linking } from 'react-native';

type OfferDestination = {
  label: string;
  webUrl: string;
  /** Optional provider-documented app deep link; do not guess custom URL schemes. */
  appUrl?: string;
  /** Store homepage fallback if the product-specific search URL cannot be opened. */
  fallbackUrl?: string;
};

const STORE_LANDING_URLS: Record<string, string> = {
  // Official Keeta UAE customer homepage. The prior /wst route is not assumed as a stable product deep link.
  Keeta: 'https://www.keeta-global.com/AE/en',
};

const STORE_DOMAINS: Record<string, string> = {
  Talabat: 'talabat.com/uae',
  Smiles: 'smiles.ae',
  Deliveroo: 'deliveroo.ae',
  Noon: 'noon.com/uae-en',
  'Amazon.ae': 'amazon.ae',
  Namshi: 'namshi.com/uae-en',
  'Brands For Less': 'brandsforless.com/en-ae',
  Centrepoint: 'centrepointstores.com/ae/en',
  Carrefour: 'carrefouruae.com',
  'Lulu Hypermarket': 'luluhypermarket.com/en-ae',
};

/** Builds a store-restricted product search without inventing an undocumented store URL pattern. */
export function buildStoreSearchUrl(productName: string, storeName: string): string {
  const landingUrl = STORE_LANDING_URLS[storeName];
  if (landingUrl) return landingUrl;

  const domain = STORE_DOMAINS[storeName];
  const query = domain
    ? `site:${domain} "${productName}" UAE`
    : `"${productName}" "${storeName}" UAE`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

/**
 * Opens a provider-documented app deep link first (when configured), then a
 * store-specific destination, and finally the store homepage as a fallback. Keeta
 * currently uses its verified UAE browsing page because no public product/cart URL
 * pattern is documented for the prototype.
 * HTTPS universal links may themselves be routed to a provider app by the OS.
 */
export async function openOffer(destination: OfferDestination): Promise<void> {
  if (destination.appUrl) {
    try {
      const canOpenApp = await Linking.canOpenURL(destination.appUrl);
      if (canOpenApp) {
        await Linking.openURL(destination.appUrl);
        return;
      }
    } catch {
      // Continue to the web fallback below.
    }
  }

  try {
    await Linking.openURL(destination.webUrl);
  } catch {
    if (destination.fallbackUrl && destination.fallbackUrl !== destination.webUrl) {
      try {
        await Linking.openURL(destination.fallbackUrl);
        return;
      } catch {
        // Show the shared error message below.
      }
    }
    Alert.alert(
      'Unable to open this offer',
      `Waffer could not open ${destination.label}. Check your internet connection or open the store manually.`,
    );
  }
}

/** Opens a maps search, letting the maps provider show current nearby branches. */
export async function openLocationSearch(searchQuery: string): Promise<void> {
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${searchQuery} near me`)}`;
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Unable to open maps', 'Please search for this store in your maps app.');
  }
}
