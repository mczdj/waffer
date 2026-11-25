# App-side public endpoint. This URL is safe to include in Android/web builds.
EXPO_PUBLIC_OFFERS_API_URL=https://waffer-api-3rvu.onrender.com

# Backend-only secret. Set this in Render Environment Variables or local backend .env.
# Never prefix this with EXPO_PUBLIC_.
SERPAPI_KEY=replace_with_your_private_key


## Grocery comparison and nearby stores (application build)

The Groceries screen searches the UAE Google Shopping results through the existing Waffer API `/offers` endpoint. Generic queries can return multiple brands and package sizes; listings are sorted by provider-returned item price. Product photos are displayed when the provider supplies a thumbnail. A missing photo or listing is not replaced with an invented one. Retailer listing links open the returned listing where available.

The grocery basket is a Waffer-side estimate. It groups selected products by retailer and calculates item subtotals only. It does not connect to retailer carts, transfer items, place orders, or include unverified delivery/service fees. The user can open each selected product listing or open the retailer's search page.

Nearby supermarkets and baqalas request foreground device location using `expo-location`. The API `/nearby?lat=...&lon=...` queries OpenStreetMap/Overpass for nearby grocery shops within 5 km and returns available names, coordinates, address and public phone/website tags. Place coverage and contact details depend on OpenStreetMap contributors. The app does not request background location.

### Install the grocery map dependencies

After extracting this project, run the following once in the project directory to install SDK 58-compatible native modules and update `package-lock.json`:

```bash
npx expo install expo-location react-native-maps
```

Run this command before `npm ci` the first time; it updates `package.json` and `package-lock.json` to the SDK-compatible versions. Then run `npm ci` and start Expo as usual. `react-native-maps` is included in Expo Go for this SDK; for a future standalone Android build, follow the Expo map configuration instructions and provide a restricted Google Maps Android SDK key if required.

The local `.env` should contain `SERPAPI_KEY` for the server and `EXPO_PUBLIC_OFFERS_API_URL` for the app. On Render, keep `SERPAPI_KEY` in the backend environment settings and set the public API URL in the Expo app's build environment. Never commit `.env`.
