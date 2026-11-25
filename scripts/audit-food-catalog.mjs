import fs from 'node:fs';
import path from 'node:path';

const dataPath = path.resolve('src/menus/imported.json');
const items = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const restaurants = new Map();
const providers = new Map();
let verifiedPrices = 0;
let demoPrices = 0;
let imageErrors = 0;
let priceErrors = 0;
let duplicateIds = 0;
const ids = new Set();

for (const item of items) {
  if (ids.has(item.id)) duplicateIds += 1;
  ids.add(item.id);
  restaurants.set(item.restaurantId, (restaurants.get(item.restaurantId) ?? 0) + 1);

  if (!item.imageUri || !item.imageSource || !item.imageSourceUrl) imageErrors += 1;
  if (!Array.isArray(item.prices) || item.prices.length < 2) {
    priceErrors += 1;
    continue;
  }

  const sorted = [...item.prices].sort((a, b) => a.itemPrice - b.itemPrice);
  if (item.prices.some((price, index) => price.id !== sorted[index].id)) {
    console.error(`Price rows are not sorted low-to-high for ${item.name}`);
    priceErrors += 1;
  }

  for (const offer of item.prices) {
    providers.set(offer.platform, (providers.get(offer.platform) ?? 0) + 1);
    if (!Number.isFinite(offer.itemPrice) || offer.itemPrice <= 0) {
      priceErrors += 1;
    } else if (offer.priceStatus === 'verified') {
      verifiedPrices += 1;
      if (!offer.sourceUrl || !offer.lastVerifiedAt || !offer.sourceLabel) priceErrors += 1;
    } else if (offer.priceStatus === 'demo') {
      demoPrices += 1;
      if (!offer.sourceLabel || !/simulat|demo/i.test(offer.sourceLabel)) priceErrors += 1;
    } else {
      priceErrors += 1;
    }
  }
}

console.log(`Menu items: ${items.length}`);
console.log(`Restaurant brands: ${restaurants.size}`);
console.log('Items by restaurant:', Object.fromEntries(restaurants));
console.log(`Verified price rows: ${verifiedPrices}`);
console.log(`Simulated demo price rows: ${demoPrices}`);
console.log('Price rows by provider:', Object.fromEntries(providers));
console.log(`Image provenance errors: ${imageErrors}`);
console.log(`Price/data errors: ${priceErrors}`);
console.log(`Duplicate item IDs: ${duplicateIds}`);

if (restaurants.size < 6 || imageErrors || priceErrors || duplicateIds) process.exitCode = 1;
