# App-side public endpoint. This URL is safe to include in Android/web builds.
EXPO_PUBLIC_OFFERS_API_URL=https://waffer-api-3rvu.onrender.com

# Backend-only secret. Set this in Render Environment Variables or local backend .env.
# Never prefix this with EXPO_PUBLIC_.
SERPAPI_KEY=replace_with_your_private_key


## Grocery comparison and nearby stores (application build)

The Groceries screen searches the UAE Google Shopping results through the existing Waffer API `/offers` endpoint. Generic queries can return multiple brands and package sizes; listings are sorted by provider-returned item price. Product photos are displayed when the provider supplies a thumbnail. A missing photo or listing is not replaced with an invented one. Retailer listing links open the returned listing where available.

The grocery basket is a Waffer-side estimate. It groups selected products by retailer and calculates item subtotals only. It does not connect to retailer carts, transfer items, place orders, or include unverified delivery/service fees. The user can open each selected product listing or open the retailer's search page.

Nearby supermarkets and baqalas request foreground device location using `expo-location`. The API `/nearby?lat=...&lon=...` queries OpenStreetMap/Overpass for nearby grocery shops within 5 km and returns available names, coordinates, address and public phone/website tags. Place coverage and contact details depend on OpenStreetMap contributors. The app does not request background location.

### Interactive Grocery map (Android, iOS and web)

1. Extract the ZIP and open the `waffer` folder in VS Code.
2. Run `npm ci`, then `npx expo start --clear`. For a browser, run `npx expo start --web` instead.
3. Go to Home → Groceries. The live street map is displayed above the product categories. It uses the existing `/nearby` endpoint and OpenStreetMap street tiles. No new map dependency or Google Maps SDK key is required.
4. Choose an area or tap **Use my location** and allow foreground location access. Manual areas use approximate neighborhood centers; store pins are returned by the backend, not hardcoded.
5. Drag the map or use +/−, tap a pin to view details, or select a store in the list to center the map. Green S pins are supermarkets; blue G pins are other groceries/baqalas. Tap **Search this map area** after panning to load stores within 5 km of the new center. Use **Refresh stores** to retry, or hide the map to focus on price comparisons.

The map needs an internet connection for tiles and store data. Public OpenStreetMap/Overpass services are best effort; the existing backend caches nearby results for up to 30 minutes. Refreshing requests the latest available backend data, not a real-time guarantee of opening hours or store inventory. GPS is requested only on demand (not continuous tracking); the selected search coordinates are sent to the existing Waffer backend and map tile requests reveal the viewed area to the map provider. Distances are straight-line distances from the search origin. Google Maps directions open externally.

For the university prototype, the default tile service is the standard OpenStreetMap raster map; attribution remains visible and no tiles are prefetched. For a production deployment, configure an appropriate tile provider via `EXPO_PUBLIC_MAP_TILE_URL` (a URL containing `{z}`, `{x}`, `{y}`) and `EXPO_PUBLIC_MAP_TILE_ATTRIBUTION` in `.env` and follow its usage terms, including caching and attribution. Standard tiles are subject to https://operations.osmfoundation.org/policies/tiles/. The app relies on the platform image/HTTP cache rather than a dedicated offline tile store.

The included `.env` contains only your existing public backend URL. Keep `SERPAPI_KEY` on the server, not in the app. If necessary, copy `.env.example` and replace the public API URL with your backend. No backend change is required for this map if the deployed `/nearby` route is working.

Run `node node_modules/typescript/bin/tsc --noEmit` for a type check and `node scripts/test-grocery-map.cjs` for the projection/data tests.

## Browser version on GitHub Pages

The same source builds the mobile app and the browser application. The intended site is
https://mczdj.github.io/waffer/ . The browser uses a responsive navigation header;
Android/iOS retain the original mobile navigation. The live prices and nearby-store
requests go to the existing HTTPS Render backend; GitHub Pages only hosts static files.

See [GITHUB_PAGES.md](GITHUB_PAGES.md) for the deployment steps, local preview and checks.
