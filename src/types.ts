export type PlatformPrice = {
  id: string;
  platform: string;
  itemPrice: number;
  deliveryFee: number;
  serviceFee: number;
  discount: number;
  url: string;
  /** Optional verified app-specific deep link. Leave unset when the provider does not publish one. */
  appUrl?: string;
  /** Search phrase for finding nearby physical branches in a maps app. */
  locationSearch?: string;
  icon?: string;
  /** False when the platform's delivery/service fees were not visible in the captured menu listing. */
  feesVerified?: boolean;
  /** Exact listing URL used to verify the menu item price. */
  sourceUrl?: string;
  /** Date the listing was checked by the project maintainer (YYYY-MM-DD). */
  lastVerifiedAt?: string;
  /** verified = sourced menu price; demo = simulated price for university feature testing. */
  priceStatus?: 'verified' | 'demo';
  sourceLabel?: string;
};

export type MenuItem = {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  basePrice: number;
  imageLabel: string;
  imageUri?: string;
  /** Human-readable provenance for a verified product photograph. */
  imageSource?: string;
  /** Listing or official product page where the photograph was found. */
  imageSourceUrl?: string;
  fallbackIcon?: string;
  options: string[];
  category?: string;
  prices: PlatformPrice[];
};

export type Restaurant = {
  id: string;
  name: string;
  cuisine: string;
  imageLabel: string;
  locationSearch?: string;
  imageUri?: string;
  /** Official brand/site icon URL used on restaurant selection cards. */
  logoUri?: string;
  fallbackIcon?: string;
};

export type Shoe = {
  id: string;
  name: string;
  brand: string;
  type: string;
  sizes: number[];
  color: string;
  retailer: string;
  price: number;
  deliveryFee: number;
  url: string;
  appUrl?: string;
  locationSearch?: string;
  imageUri?: string;
  fallbackIcon?: string;
};

export type GroceryPrice = {
  store: string;
  price: number;
  deliveryFee: number;
  discount: number;
  url: string;
  appUrl?: string;
  locationSearch?: string;
  icon?: string;
};

export type Grocery = {
  id: string;
  name: string;
  brand: string;
  quantity: string;
  imageLabel: string;
  imageUri?: string;
  fallbackIcon?: string;
  prices: GroceryPrice[];
};

/** A brand/store search for nearby physical branches; results are supplied by the maps provider. */
export type LocationSearch = {
  id: string;
  name: string;
  category: 'Restaurant' | 'Supermarket' | 'Retailer';
  searchQuery: string;
  icon: string;
};
