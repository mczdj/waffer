# Waffer — MBZ City Food comparison university demo

Waffer is a React Native + Expo + TypeScript university prototype. This revision expands the Food section into a working comparison demo with six restaurant brands, multiple menu categories, item photographs, and four provider comparison rows per item.

## Food catalogue

**31 menu items across 6 restaurants**

| Restaurant | Items | Variety |
|---|---:|---|
| McDonald's | 6 | Burgers, meals and chicken |
| KFC | 4 | Sandwich, burger meals and chicken meals |
| Pizza Hut | 3 | Super Supreme, pepperoni and Margherita pizzas |
| Papa Johns | 8 | Pizza, toasted sandwiches and roasted wings |
| Dunkin' | 5 | Donuts, bakery and iced coffee |
| Starbucks | 5 | Bakery, focaccia, croissant and cold coffee |

The Food restaurant selector is populated from the active menu catalogue. Search and category filters work against the active catalogue.

## Price comparison model

Every menu item has four price rows, sorted from lowest to highest by item price:

- **VERIFIED** — a real price found in a linked restaurant or delivery-platform menu listing.
- **DEMO** — a simulated price created for university testing. It is not a live provider offer and must not be represented as a real Talabat, Keeta, Smiles or Deliveroo quote.

The app labels these statuses in both the menu card and item comparison screen. A DEMO row opens a provider-specific search or provider landing page; it does not claim to open a real offer or transfer an item to a cart.

### Verified price coverage

- McDonald's: six Talabat prices from the Mohammed Bin Zayed City 2 listing.
- KFC: four listed prices from Mohamed Bin Zayed City / MBZ Market Deliveroo menus.
- Pizza Hut: three listed prices from the Mohamed Bin Zayed City Deliveroo menu.
- Papa Johns: eight prices from the official Papa Johns UAE menu. These are UAE menu prices; the official page does not establish that each price is specific to the MBZ branch.
- Dunkin': four prices from the Careem Mohammed Bin Zayed City menu.
- Starbucks: no item-level price was verified from the referenced UAE featured-menu page; its five price comparisons are all DEMO.

Dunkin' Iced Coffee is also a DEMO-priced item. Its name and photograph come from the Dunkin UAE menu, but no exact MBZ branch price was verified for it.

**Total: 25 menu items with one verified source price each, and 6 items with demo-only prices.** Every item has three additional DEMO comparison rows, except the five Starbucks items and Dunkin' Iced Coffee, which have four DEMO rows.

Prices are item prices only. Delivery fees, service fees, promotions and checkout totals are not calculated. The price difference shown is a comparison of displayed item prices, not guaranteed savings.

## Product photographs

All 31 active menu items have a product-specific or official menu photograph URL and image provenance recorded in `src/menus/imported.json` and `IMAGE_SOURCES.md`. Images are loaded from their original HTTPS hosts and require an internet connection. If a third-party host changes or blocks an image, that photo may fail to load.

## Location and ordering behaviour

The Food area is labelled for Mohamed Bin Zayed City, Abu Dhabi. Branch-specific sources are used where available. Papa Johns official menu prices and Starbucks official menu photography are UAE-level source material rather than verified MBZ branch price listings.

Provider actions open the verified listing when a verified price exists, or a provider search/landing page for a DEMO row. Waffer does not transfer a cart, place an order, process payment or guarantee a checkout price.

## Other app sections

Shopping, Groceries, Deals, Basket, Profile, existing navigation and theme settings were not intentionally changed. The update is limited to Food data, Food comparison presentation, the Food data type and Food documentation.

## Run

```bash
npm install
npx expo install --fix
npx expo start
```

For web preview:

```bash
npx expo start --web
```

## Key files

- `App.tsx` — app screens, navigation and Food UI
- `src/data.ts` — restaurant metadata and non-Food prototype data
- `src/menus/imported.json` — active 31-item Food catalogue and offer rows
- `src/types.ts` — TypeScript data models
- `MBZ_PRICE_AUDIT.md` — verified/demo price status and source URLs
- `IMAGE_SOURCES.md` — product-photo provenance
- `scripts/audit-food-catalog.mjs` — Food catalogue integrity audit
