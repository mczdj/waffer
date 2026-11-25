import { Grocery, MenuItem, Restaurant, Shoe } from './types';

const allRestaurants: Restaurant[] = [
  { id: 'mcd', name: "McDonald's", cuisine: 'Burgers & meals', imageLabel: 'McDonald’s logo', fallbackIcon: 'McD', locationSearch: "McDonald's, Mohamed Bin Zayed City, Abu Dhabi" },
  { id: 'kfc', name: 'KFC', cuisine: 'Chicken & meals', imageLabel: 'KFC logo', logoUri: 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://kfc.com&size=256', fallbackIcon: 'KFC', locationSearch: "KFC, Mohamed Bin Zayed City, Abu Dhabi" },
  { id: 'bk', name: 'Burger King', cuisine: 'Flame-grilled burgers', imageLabel: 'Burger King logo', logoUri: 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://burgerking.com&size=256', fallbackIcon: 'BK', locationSearch: "Burger King, Mohamed Bin Zayed City, Abu Dhabi" },
  { id: 'ph', name: 'Pizza Hut', cuisine: 'Pizza & sides', imageLabel: 'Pizza Hut logo', logoUri: 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://pizzahut.com&size=256', fallbackIcon: 'PH', locationSearch: "Pizza Hut, Mohamed Bin Zayed City, Abu Dhabi" },
  { id: 'sb', name: "Starbucks", cuisine: 'Coffee, tea & bakery', imageLabel: 'Starbucks logo', logoUri: 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://starbucks.com&size=256', fallbackIcon: 'S', locationSearch: "Starbucks, Mohamed Bin Zayed City, Abu Dhabi" },
  { id: 'costa', name: "Costa Coffee", cuisine: 'Coffee, iced drinks & bakery', imageLabel: 'Costa Coffee logo', logoUri: 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://costacoffee.com&size=256', fallbackIcon: 'CC', locationSearch: "Costa Coffee, Mohamed Bin Zayed City, Abu Dhabi" },
  { id: 'th', name: "Tim Hortons", cuisine: 'Coffee, donuts & sandwiches', imageLabel: 'Tim Hortons logo', logoUri: 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://timhortons.com&size=256', fallbackIcon: 'TH', locationSearch: "Tim Hortons, Mohamed Bin Zayed City, Abu Dhabi" },
  { id: 'dunkin', name: "Dunkin'", cuisine: 'Coffee, donuts & breakfast', imageLabel: "Dunkin' logo", logoUri: 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://dunkindonuts.com&size=256', fallbackIcon: 'D', locationSearch: "Dunkin', Mohamed Bin Zayed City, Abu Dhabi" },
  { id: 'pj', name: "Papa Johns", cuisine: 'Pizza & sides', imageLabel: 'Papa Johns logo', logoUri: 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://papajohns.com&size=256', fallbackIcon: 'PJ', locationSearch: "Papa Johns, Mohamed Bin Zayed City, Abu Dhabi" },
  { id: 'sub', name: "Subway", cuisine: 'Sandwiches & salads', imageLabel: 'Subway logo', logoUri: 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://subway.com&size=256', fallbackIcon: 'S', locationSearch: "Subway, Mohamed Bin Zayed City, Abu Dhabi" },
  { id: 'zwz', name: "Zaatar w Zeit", cuisine: 'Manakeesh & wraps', imageLabel: 'Zaatar w Zeit logo', logoUri: 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://zaatarwzeit.com&size=256', fallbackIcon: 'ZW', locationSearch: "Zaatar w Zeit, Mohamed Bin Zayed City, Abu Dhabi" },
  { id: 'joll', name: "Jollibee", cuisine: 'Chicken & Filipino meals', imageLabel: 'Jollibee logo', logoUri: 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://jollibeefoods.com&size=256', fallbackIcon: 'J', locationSearch: "Jollibee, Mohamed Bin Zayed City, Abu Dhabi" },
];

// The active Food catalogue contains photo-backed menu items with verified prices and clearly labelled demo comparison offers.
const importedMenuItems: MenuItem[] = require('./menus/imported.json');
export const menuItems: MenuItem[] = importedMenuItems;

// Show restaurants that have menu items in the active Food catalogue.
const availableRestaurantIds = new Set(menuItems.map((item) => item.restaurantId));
export const restaurants: Restaurant[] = allRestaurants.filter((restaurant) => availableRestaurantIds.has(restaurant.id));

export const shoes: Shoe[] = [
  { id: 's1', name: 'Revolution 7', brand: 'Nike', type: 'Sneakers', sizes: [39,40,41,42,43], color: 'Black', retailer: 'Noon', imageUri: 'https://www.nike.ae/dw/image/v2/BDVB_PRD/on/demandware.static/-/Sites-akeneo-master-catalog/default/dwcfe0a4d6/nk/ffb/b/5/4/e/2/ffbb54e2_f757_48b3_83de_a0903f05d893.png?q=100&sh=700&sm=fit&strip=false&sw=700', fallbackIcon: '👟', price: 219, deliveryFee: 0, url: 'https://www.noon.com/uae-en/' },
  { id: 's2', name: 'Runfalcon 5', brand: 'Adidas', type: 'Sports shoes', sizes: [38,39,40,41,42], color: 'Black', retailer: 'Amazon.ae', imageUri: 'https://assets.adidas.com/images/w_1880,f_auto,q_auto/b64f5377913a4d51a6d0fa62b69d1ebc_9366/JR5089_HM1.jpg', fallbackIcon: '👟', price: 235, deliveryFee: 0, url: 'https://www.amazon.ae/' },
  { id: 's3', name: 'Caven 2.0', brand: 'Puma', type: 'Casual shoes', sizes: [37,38,39,40,41], color: 'White', retailer: 'Namshi', imageUri: 'https://images.puma.com/image/upload/f_auto,q_auto,w_600,b_rgb:FAFAFA/global/392290/80/sv01/fnd/ARE/fmt/png', fallbackIcon: '👟', price: 189, deliveryFee: 10, url: 'https://www.namshi.com/uae-en/' },
  { id: 's4', name: 'Fresh Foam Arishi v4', brand: 'New Balance', type: 'Sneakers', sizes: [40,41,42,43,44], color: 'Beige', retailer: 'Brands For Less', fallbackIcon: '👟', price: 249, deliveryFee: 15, url: 'https://www.brandsforless.com/en-ae/', locationSearch: 'Brands For Less stores' },
  { id: 's5', name: 'Daily Walk', brand: 'Any brand', type: 'Casual shoes', sizes: [35,36,37,38,39,40,41,42], color: 'Brown', retailer: 'Centrepoint', fallbackIcon: '👟', price: 99, deliveryFee: 10, url: 'https://www.centrepointstores.com/ae/en/', locationSearch: 'Centrepoint stores' },
  { id: 's6', name: 'Revolution 7 (Black)', brand: 'Nike', type: 'Sports shoes', sizes: [40,41,42,43], color: 'White', retailer: 'Amazon.ae', imageUri: 'https://www.nike.ae/dw/image/v2/BDVB_PRD/on/demandware.static/-/Sites-akeneo-master-catalog/default/dwcfe0a4d6/nk/ffb/b/5/4/e/2/ffbb54e2_f757_48b3_83de_a0903f05d893.png?q=100&sh=700&sm=fit&strip=false&sw=700', fallbackIcon: '👟', price: 279, deliveryFee: 0, url: 'https://www.amazon.ae/' },
];

export const groceries: Grocery[] = [
  {
    id: 'g1', name: 'Full Fat Milk', brand: 'Almarai', quantity: '1 L', imageLabel: 'Milk 1L', imageUri: 'https://cdn.mafrservices.com/pim-content/UAE/media/product/11532/1749790803/11532_main.jpg?im=Resize%3D376', fallbackIcon: '🥛',
    prices: [
      { store: 'Carrefour', icon: '🛒', price: 7.25, deliveryFee: 0, discount: 0, url: 'https://www.carrefouruae.com/', locationSearch: 'Carrefour supermarkets' },
      { store: 'Lulu Hypermarket', icon: '🛒', price: 6.75, deliveryFee: 0, discount: 0, url: 'https://www.luluhypermarket.com/en-ae/', locationSearch: 'Lulu Hypermarket' },
    ],
  },
  {
    id: 'g2', name: 'Greek Style Yogurt', brand: 'Almarai', quantity: '400 g', imageLabel: 'Yogurt 400g', fallbackIcon: '🥣',
    prices: [
      { store: 'Carrefour', icon: '🛒', price: 11.5, deliveryFee: 0, discount: 1, url: 'https://www.carrefouruae.com/', locationSearch: 'Carrefour supermarkets' },
      { store: 'Lulu Hypermarket', icon: '🛒', price: 10.95, deliveryFee: 0, discount: 0, url: 'https://www.luluhypermarket.com/en-ae/', locationSearch: 'Lulu Hypermarket' },
    ],
  },
  {
    id: 'g3', name: 'Corn Flakes', brand: "Kellogg's", quantity: '500 g', imageLabel: 'Corn Flakes', fallbackIcon: '🥣',
    prices: [
      { store: 'Carrefour', icon: '🛒', price: 18.5, deliveryFee: 0, discount: 2.5, url: 'https://www.carrefouruae.com/', locationSearch: 'Carrefour supermarkets' },
      { store: 'Lulu Hypermarket', icon: '🛒', price: 17.25, deliveryFee: 0, discount: 0, url: 'https://www.luluhypermarket.com/en-ae/', locationSearch: 'Lulu Hypermarket' },
    ],
  },
];

export const deals = [
  { id: 'd1', title: '20% off selected sneakers', source: 'Demo retailer offer', original: 299, price: 239, sponsored: false },
  { id: 'd2', title: 'Meal deal under AED 30', source: 'Demo restaurant offer', original: 37, price: 29, sponsored: true },
  { id: 'd3', title: 'Weekend grocery savings', source: 'Demo supermarket offer', original: 75, price: 59, sponsored: false },
];
