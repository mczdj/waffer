import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { darkColors, lightColors, radius, ThemeColors } from './src/theme';
import { deals, groceries, menuItems, restaurants, shoes } from './src/data';
import { Grocery, MenuItem, PlatformPrice, Shoe } from './src/types';
import { buildStoreSearchUrl, openLocationSearch, openOffer } from './src/utils/offerNavigation';

type TabName = 'Home' | 'Explore' | 'Compare' | 'Deals' | 'Basket' | 'Profile';
type Screen =
  | { name: 'tabs'; tab: TabName }
  | { name: 'food' }
  | { name: 'menu'; restaurantId: string }
  | { name: 'foodCompare'; itemId: string; quantity: number; option: string }
  | { name: 'basketCompare' }
  | { name: 'shoes' }
  | { name: 'shoeResults'; filters: ShoeFilters }
  | { name: 'shopping' }
  | { name: 'shoppingCompare'; productId: string }
  | { name: 'groceries' }
  | { name: 'groceryCompare'; groceryId: string }
  | { name: 'category'; title: string };

type BasketLine = { lineId: string; itemId: string; quantity: number; option: string; note: string; unitPrice: number };

type ShoeFilters = {
  type: string;
  size: number;
  color: string;
  budget: number;
  brand: string;
  sort: 'Cheapest first' | 'Best value' | 'Highest price';
};

import { LOCAL_LOGOS } from './src/logos';
import { fetchLiveOffers, livePricesConfigured, LiveOffer } from './src/services/offers';

const categories = ['Food', 'Groceries', 'Shopping', 'Electronics', 'Household'];
const shoeTypes = ['Sneakers', 'Sports shoes', 'Casual shoes', 'Formal shoes', 'Sandals'];
const shoeColors = ['Black', 'White', 'Beige', 'Brown', 'Other'];
const shoeBrands = ['Nike', 'Adidas', 'Puma', 'New Balance', 'Any brand'];

const money = (value: number) => `AED ${value.toFixed(2)}`;
const finalPlatformTotal = (p: PlatformPrice, qty = 1) =>
  p.itemPrice * qty + p.deliveryFee + p.serviceFee - p.discount;

let activeColors = lightColors;
let styles = createStyles(activeColors);

function AppHeader({ title, subtitle, onBack, showDemo = true }: { title: string; subtitle?: string; onBack?: () => void; showDemo?: boolean }) {
  return (
    <View style={styles.headerRow}>
      {onBack ? (
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.logoMark}>
          <Text style={styles.logoMarkText}>W</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.headerTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
      </View>
      {showDemo && <View style={styles.demoChip}><Text style={styles.demoChipText}>DEMO</Text></View>}
    </View>
  );
}

const FALLBACK_EMOJI: Record<string, string> = {
  'Big Mac Meal': '🍔', 'Nuggets Meal': '🍗', 'Zinger Sandwich': '🥪',
  'Pepperoni Pizza': '🍕', 'Burger Meal': '🍔', 'Fried Chicken': '🍗',
  'Whopper Burger': '🍔', 'Milk 1L': '🥛', 'Yogurt 400g': '🥣',
  'Corn Flakes': '🥣', Nike: '👟', Adidas: '👟', Puma: '👟',
};

function SampleImage({ label, imageUri, fallbackIcon, compact = false }: { label: string; imageUri?: string; fallbackIcon?: string; compact?: boolean }) {
  const uri = imageUri;
  const [failedUri, setFailedUri] = useState<string | undefined>();
  const showPhoto = !!uri && failedUri !== uri;
  return (
    <View style={[styles.sampleImage, compact && styles.sampleImageCompact]}>
      {showPhoto ? (
        <Image source={{ uri: uri! }} style={styles.productPhoto} resizeMode="contain" onError={() => setFailedUri(uri)} />
      ) : (
        <>
          <Text style={compact ? styles.sampleFallbackIconBig : styles.sampleFallbackIcon}>{fallbackIcon && fallbackIcon !== 'PHOTO_NOT_VERIFIED' ? fallbackIcon : FALLBACK_EMOJI[label] ?? (label.toLowerCase().match(/coffee|latte|cappuccino|tea|espresso/) ? '☕' : label.toLowerCase().match(/pizza|pasta/) ? '🍕' : label.toLowerCase().match(/chicken|nugget|wings|tender/) ? '🍗' : label.toLowerCase().match(/fries|potato/) ? '🍟' : label.toLowerCase().match(/donut|muffin|cake|pie|dessert/) ? '🍰' : label.toLowerCase().match(/sandwich|burger|wrap|mac/) ? '🥪' : '🍽️')}</Text>
          {!compact && <Text numberOfLines={2} style={styles.sampleImageText}>{label}</Text>}
           {!compact && uri && <Text style={styles.sampleTiny}>Product image source linked</Text>}
        </>
      )}
    </View>
  );
}

function Pill({ text, selected, onPress }: { text: string; selected?: boolean; onPress?: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress} style={[styles.pill, selected && styles.pillSelected]}>
      <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{text}</Text>
    </TouchableOpacity>
  );
}

function PrimaryButton({ label, onPress, secondary = false }: { label: string; onPress: () => void; secondary?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.primaryButton, secondary && styles.secondaryButton]}>
      <Text style={[styles.primaryButtonText, secondary && styles.secondaryButtonText]}>{label}</Text>
    </TouchableOpacity>
  );
}

function SectionTitle({ title, action }: { title: string; action?: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {!!action && <Text style={styles.sectionAction}>{action}</Text>}
    </View>
  );
}

const BRAND_LOGO_URI: Record<string, string> = {
  Talabat: 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://talabat.com&size=256',
  Smiles: 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://smiles.ae&size=256',
  Keeta: 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://keeta-global.com&size=256',
  Noon: 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://noon.com&size=256',
  'Amazon.ae': 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://amazon.ae&size=256',
  Namshi: 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://namshi.com&size=256',
  'Brands For Less': 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://brandsforless.com&size=256',
  Centrepoint: 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://centrepointstores.com&size=256',
  Carrefour: 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://carrefouruae.com&size=256',
  'Lulu Hypermarket': 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://luluhypermarket.com&size=256',
  "McDonald's": 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://mcdonalds.com&size=256',
  KFC: 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://kfc.com&size=256',
  'Burger King': 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://burgerking.com&size=256',
  'Pizza Hut': 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://pizzahut.com&size=256',
};

function BrandBadge({ name }: { name: string; icon?: string }) {
  const [imageFailed, setImageFailed] = useState(false);
  const logoUri = BRAND_LOGO_URI[name];
  const initials = name.split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase();
  return (
    <View style={styles.brandBadge}>
      <View style={styles.brandIcon}>
        {(LOCAL_LOGOS[name] || logoUri) && !imageFailed ? (
          <Image source={LOCAL_LOGOS[name] ?? { uri: logoUri }} style={styles.brandLogoImage} resizeMode="contain" onError={() => setImageFailed(true)} />
        ) : (
          <Text style={styles.brandBadgeInitials}>{initials}</Text>
        )}
      </View>
      <Text style={styles.brandBadgeName}>{name}</Text>
    </View>
  );
}

function RestaurantLogo({ name, logoUri }: { name: string; logoUri?: string }) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = name === "McDonald's" ? 'M' : name.split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase();
  return (
    <View style={styles.restaurantLogo}>
      {(LOCAL_LOGOS[name] || logoUri) && !imageFailed ? (
        <Image source={LOCAL_LOGOS[name] ?? { uri: logoUri }} style={styles.restaurantLogoImage} resizeMode="contain" onError={() => setImageFailed(true)} />
      ) : (
        <Text style={styles.restaurantLogoFallback}>{initials}</Text>
      )}
    </View>
  );
}

function HomeScreen({ go }: { go: (screen: Screen) => void }) {
  const [search, setSearch] = useState('');
  const handleSearch = () => {
    const q = search.trim().toLowerCase();
    if (!q) return;
    if (q.includes('food') || q.includes('restaurant') || q.includes('burger')) return go({ name: 'food' });
    if (q.includes('shoe') || q.includes('sneaker') || q.includes('fashion') || q.includes('beauty') || q.includes('makeup') || q.includes('clothing')) return go({ name: 'shopping' });
    if (q.includes('milk') || q.includes('grocery')) return go({ name: 'groceries' });
    go({ name: 'shopping' });
  };

  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <AppHeader title="Waffer وفّر" subtitle="Smart shopping for the UAE" />
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>SHOP SMARTER</Text>
        <Text style={styles.heroTitle}>Find what you want. Pay less.</Text>
        <Text style={styles.heroText}>Compare the total price before you buy — not just the sticker price.</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="What are you looking for?"
            placeholderTextColor="#85958F"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}><Text style={styles.searchButtonText}>Find</Text></TouchableOpacity>
        </View>
      </View>

      <SectionTitle title="Shop by category" />
      <View style={styles.categoryGrid}>
        {categories.map((cat, i) => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryCard, i < 3 && styles.categoryFeatured]}
            onPress={() => {
              if (cat === 'Food') go({ name: 'food' });
              else if (cat === 'Shopping') go({ name: 'shopping' });
              else if (cat === 'Groceries') go({ name: 'groceries' });
              else go({ name: 'category', title: cat });
            }}
          >
            <View style={styles.categoryArt}><Text style={styles.categoryArtText}>{cat.slice(0, 1)}</Text></View>
            <Text style={styles.categoryName}>{cat}</Text>
            {i < 3 && <Text style={styles.categoryHint}>Compare now</Text>}
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.savingsBanner} onPress={() => go({ name: 'food' })}>
        <View style={{ flex: 1 }}>
          <Text style={styles.savingsMini}>FIND THE CHEAPEST OPTION</Text>
          <Text style={styles.savingsTitle}>One item. Multiple stores. One best price.</Text>
          <Text style={styles.savingsText}>Waffer compares the final estimated total and ranks your options.</Text>
        </View>
        <View style={styles.savingsBubble}><Text style={styles.savingsBubbleText}>Save</Text></View>
      </TouchableOpacity>

      <SectionTitle title="Popular deals" action="Demo Data" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
        {deals.map((deal) => (
          <View key={deal.id} style={styles.dealCard}>
            {deal.sponsored && <Text style={styles.sponsored}>SPONSORED</Text>}
            <Text style={styles.dealTitle}>{deal.title}</Text>
            <Text style={styles.dealSource}>{deal.source}</Text>
            <View style={styles.priceLine}>
              <Text style={styles.oldPrice}>{money(deal.original)}</Text>
              <Text style={styles.newPrice}>{money(deal.price)}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <SectionTitle title="Trending products" />
      <View style={styles.productRow}>
        <TouchableOpacity style={styles.miniProduct} onPress={() => go({ name: 'shopping' })}>
          <SampleImage label="Adidas Runfalcon 5" imageUri={shoes.find((shoe) => shoe.id === 's2')?.imageUri} fallbackIcon={shoes.find((shoe) => shoe.id === 's2')?.fallbackIcon} compact />
          <Text style={styles.miniProductName}>Everyday sneakers</Text>
          <Text style={styles.miniProductPrice}>From AED 189</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.miniProduct} onPress={() => go({ name: 'groceries' })}>
          <SampleImage label="Milk 1L" imageUri={groceries.find((grocery) => grocery.id === 'g1')?.imageUri} fallbackIcon={groceries.find((grocery) => grocery.id === 'g1')?.fallbackIcon} compact />
          <Text style={styles.miniProductName}>Almarai Milk 1L</Text>
          <Text style={styles.miniProductPrice}>From AED 6.75</Text>
        </TouchableOpacity>
      </View>

      <SectionTitle title="Recently compared" />
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Big Mac Meal</Text>
        <Text style={styles.infoText}>Best demo total: AED 28.00 · Potential saving: AED 8.50</Text>
      </View>
    </ScrollView>
  );
}

function ExploreScreen({ go }: { go: (s: Screen) => void }) {
  const [query, setQuery] = useState('');
  const visible = categories.filter((x) => x.toLowerCase().includes(query.toLowerCase()));
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <AppHeader title="Explore" subtitle="Browse every comparison category" />
      <TextInput style={styles.bigInput} placeholder="Search categories" value={query} onChangeText={setQuery} />
      <View style={{ gap: 12 }}>
        {visible.map((cat) => (
          <TouchableOpacity key={cat} style={styles.listCard} onPress={() => cat === 'Food' ? go({ name: 'food' }) : cat === 'Shopping' ? go({ name: 'shopping' }) : cat === 'Groceries' ? go({ name: 'groceries' }) : go({ name: 'category', title: cat })}>
            <View style={styles.listIcon}><Text style={styles.listIconText}>{cat[0]}</Text></View>
            <View style={{ flex: 1 }}><Text style={styles.listTitle}>{cat}</Text><Text style={styles.listSub}>Search, filter and compare prices</Text></View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

function CompareScreen() {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <AppHeader title="Compare" subtitle="Your recent comparison results" />
      <View style={styles.compareSummary}>
        <Text style={styles.compareSummaryLabel}>Potential demo savings</Text>
        <Text style={styles.compareSummaryValue}>AED 43.50</Text>
        <Text style={styles.compareSummaryText}>Across your latest three sample comparisons.</Text>
      </View>
      <SectionTitle title="Recent comparisons" />
      {[
        ['Big Mac Meal', 'Keeta', 'AED 28.00', 'Save AED 8.50'],
        ['Almarai Milk 1L', 'Lulu Hypermarket', 'AED 6.75', 'Save AED 0.50'],
        ['Demo Sneakers', 'Noon', 'AED 219.00', 'Save AED 26.00'],
      ].map((row) => (
        <View style={styles.compareRow} key={row[0]}>
          <View style={{ flex: 1 }}><Text style={styles.compareItem}>{row[0]}</Text><Text style={styles.compareStore}>{row[1]}</Text></View>
          <View style={{ alignItems: 'flex-end' }}><Text style={styles.comparePrice}>{row[2]}</Text><Text style={styles.saveText}>{row[3]}</Text></View>
        </View>
      ))}
      <Text style={styles.disclaimer}>All values shown on this prototype screen are sample prices for demonstration only.</Text>
    </ScrollView>
  );
}

function DealsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <AppHeader title="Deals" subtitle="Discounts worth comparing" />
      <View style={styles.notice}><Text style={styles.noticeText}>Demo Data — offers below are sample content, not live promotions.</Text></View>
      {deals.map((deal) => (
        <View key={deal.id} style={styles.dealWide}>
          <View style={{ flex: 1 }}>
            {deal.sponsored && <Text style={styles.sponsored}>SPONSORED</Text>}
            <Text style={styles.dealWideTitle}>{deal.title}</Text>
            <Text style={styles.dealSource}>{deal.source}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}><Text style={styles.oldPrice}>{money(deal.original)}</Text><Text style={styles.newPrice}>{money(deal.price)}</Text></View>
        </View>
      ))}
    </ScrollView>
  );
}

function ProfileScreen({ darkMode, onDarkModeChange }: { darkMode: boolean; onDarkModeChange: (value: boolean) => void }) {
  const [priceDrops, setPriceDrops] = useState(true);
  const [dealAlerts, setDealAlerts] = useState(true);
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <AppHeader title="Profile" subtitle="Your shopping preferences" />
      <View style={styles.profileCard}>
        <View style={styles.avatar}><Text style={styles.avatarText}>WS</Text></View>
        <View><Text style={styles.profileName}>Waffer Student</Text><Text style={styles.profileSub}>University demo profile</Text></View>
      </View>
      <SectionTitle title="Preferences" />
      {[
        ['Preferred shoe size', '42 EU'],
        ['Preferred stores', 'Noon, Carrefour, Lulu'],
        ['Favourite brands', 'Nike, Adidas'],
      ].map(([k, v]) => <View style={styles.settingRow} key={k}><Text style={styles.settingLabel}>{k}</Text><Text style={styles.settingValue}>{v}</Text></View>)}
      <SectionTitle title="Appearance" />
      <View style={styles.settingRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.settingLabel}>Dark mode</Text>
          <Text style={styles.settingHint}>{darkMode ? 'Dark theme is on' : 'Light theme is on'}</Text>
        </View>
        <Switch value={darkMode} onValueChange={onDarkModeChange} trackColor={{ false: activeColors.line, true: activeColors.greenSoft }} thumbColor={darkMode ? activeColors.green : '#B8C2BD'} />
      </View>
      <SectionTitle title="Notifications" />
      <View style={styles.settingRow}><Text style={styles.settingLabel}>Price-drop alerts</Text><Switch value={priceDrops} onValueChange={setPriceDrops} trackColor={{ true: activeColors.greenSoft }} thumbColor={priceDrops ? activeColors.green : '#ccc'} /></View>
      <View style={styles.settingRow}><Text style={styles.settingLabel}>New deal alerts</Text><Switch value={dealAlerts} onValueChange={setDealAlerts} trackColor={{ true: activeColors.greenSoft }} thumbColor={dealAlerts ? activeColors.green : '#ccc'} /></View>
      <SectionTitle title="Saved" />
      <View style={styles.infoCard}><Text style={styles.infoTitle}>4 favourite products</Text><Text style={styles.infoText}>Saved locally for this prototype.</Text></View>
      <View style={styles.infoCard}><Text style={styles.infoTitle}>3 saved comparisons</Text><Text style={styles.infoText}>Ready to revisit during the demo.</Text></View>
    </ScrollView>
  );
}

function FoodScreen({ go, back }: { go: (s: Screen) => void; back: () => void }) {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <AppHeader title="Food comparison" subtitle="Choose a restaurant" onBack={back} />
      <View style={styles.notice}><Text style={styles.noticeText}>{restaurants.length} restaurants · {menuItems.length} menu items with product photos and price comparisons. Verified and simulated offers are labelled separately.</Text></View>
      {restaurants.map((r) => (
        <View key={r.id}>
          <TouchableOpacity style={styles.restaurantCard} onPress={() => go({ name: 'menu', restaurantId: r.id })}>
            <RestaurantLogo name={r.name} logoUri={r.logoUri} />
            <View style={{ flex: 1 }}>
              <Text style={styles.restaurantCuisine}>{r.cuisine}</Text>
              <Text style={styles.compareHint}>Compare listed item prices</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openLocationSearch(r.locationSearch ?? r.name)}><Text style={styles.locationLink}>📍 Find nearby {r.name} branches ↗</Text></TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

function BestOfferLine({ item }: { item: MenuItem }) {
  const ranked = [...item.prices].sort((a, b) => a.itemPrice - b.itemPrice);
  return (
    <View style={{ marginTop: 6, gap: 3 }}>
      {ranked.map((p, index) => (
        <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <Text style={[styles.menuPrice, { marginTop: 0, color: index === 0 ? activeColors.greenDark : activeColors.ink, flexShrink: 1 }]}>
            {p.platform} · {money(p.itemPrice)}
          </Text>
          <Text style={{ fontSize: 9, fontWeight: '900', color: p.priceStatus === 'demo' ? activeColors.amber : activeColors.greenDark }}>
            {p.priceStatus === 'demo' ? 'DEMO' : 'VERIFIED'}
          </Text>
        </View>
      ))}
    </View>
  );
}

function MenuScreen({ restaurantId, go, back }: { restaurantId: string; go: (s: Screen) => void; back: () => void }) {
  const restaurant = restaurants.find((r) => r.id === restaurantId);
  const allItems = menuItems.filter((m) => m.restaurantId === restaurantId);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const menuCategories = ['All', ...Array.from(new Set(allItems.map((m) => m.category ?? 'Meals')))];
  const items = allItems.filter((m) => (category === 'All' || (m.category ?? 'Meals') === category) && `${m.name} ${m.description}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <AppHeader title={restaurant?.name ?? 'Restaurant'} subtitle="Explore the menu · MBZ City, Abu Dhabi" onBack={back} />
      <View style={styles.notice}><Text style={styles.noticeText}>MOHAMED BIN ZAYED CITY UNIVERSITY DEMO · Real menu prices are labelled VERIFIED; simulated comparison offers are labelled DEMO. Prices and branch availability can change.</Text></View>
      <TextInput style={styles.bigInput} placeholder={`Search ${restaurant?.name ?? 'menu'}...`} value={query} onChangeText={setQuery} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{menuCategories.map((x) => <Pill key={x} text={x} selected={category === x} onPress={() => setCategory(x)} />)}</ScrollView>
      {items.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>No menu items found</Text><Text style={styles.emptyText}>Try another search or menu category.</Text></View> : items.map((item) => (
        <TouchableOpacity key={item.id} style={styles.menuCard} onPress={() => go({ name: 'foodCompare', itemId: item.id, quantity: 1, option: 'Standard' })}>
          <SampleImage label={item.imageLabel} imageUri={item.imageUri} fallbackIcon={item.fallbackIcon} compact />
          <View style={{ flex: 1 }}><Text style={styles.menuName}>{item.name}</Text><Text style={styles.menuDescription}>{item.description}</Text><BestOfferLine item={item} /></View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      ))}
      <Text style={styles.disclaimer}>Price comparison is for university demonstration. VERIFIED means the price was found on the linked menu/listing. DEMO means the provider price is simulated for testing and is not a live offer. All prices are item prices only; delivery fees, service fees, discounts and checkout totals are not included.</Text>
    </ScrollView>
  );
}

function FoodCompareScreen({ itemId, quantity, option, back, setBasket, go }: { itemId: string; quantity: number; option: string; back: () => void; setBasket: React.Dispatch<React.SetStateAction<BasketLine[]>>; go: (screen: Screen) => void }) {
  const item = menuItems.find((x) => x.id === itemId);
  if (!item) return <SafeAreaView style={styles.safe}><Text>Item not found.</Text></SafeAreaView>;
  const ranked = [...item.prices].sort((a, b) => a.itemPrice - b.itemPrice);
  const cheapest = ranked[0];
  const expensive = ranked[ranked.length - 1];
  const saving = cheapest && expensive ? (expensive.itemPrice - cheapest.itemPrice) * quantity : 0;
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <AppHeader title="Price comparison" subtitle={`${item.name} · ${option} · Qty ${quantity}`} onBack={back} />
      <View style={styles.notice}><Text style={styles.noticeText}>Offers are sorted from lowest to highest item price. VERIFIED = sourced menu price. DEMO = simulated provider price for university testing, not a live offer. Delivery and service fees are not included.</Text></View>
      {ranked.map((p, index) => {
                return (
          <View key={p.id} style={[styles.platformCard, index === 0 && styles.bestCard]}>
            <View style={styles.platformTop}>
              <BrandBadge name={p.platform} icon={p.icon} />
              {index === 0 && <View style={styles.bestBadge}><Text style={styles.bestBadgeText}>LOWEST LISTED</Text></View>}
            </View>
            <View style={styles.totalLine}><Text style={styles.totalLabel}>Item price × {quantity}</Text><Text style={styles.totalValue}>{money(p.itemPrice * quantity)}</Text></View>
            <Text style={styles.helperText}>{p.priceStatus === 'demo' ? 'DEMO PRICE · simulated for university testing; not a live provider offer.' : `${p.sourceLabel ?? 'Verified menu listing'} · item price only.`}</Text>
            <PrimaryButton label={p.priceStatus === 'demo' ? `Search ${item.name} on ${p.platform} ↗` : `Open verified ${p.platform} listing ↗`} onPress={() => openOffer({ label: p.platform, webUrl: p.priceStatus === 'demo' ? buildStoreSearchUrl(item.name, p.platform) : (p.sourceUrl ?? p.url), fallbackUrl: p.url, appUrl: p.appUrl })} secondary={index !== 0} />
          </View>
        );
      })}
      {cheapest && <PrimaryButton label={`Open lowest listed provider · ${cheapest.platform}`} onPress={() => openOffer({ label: cheapest.platform, webUrl: cheapest.priceStatus === 'demo' ? buildStoreSearchUrl(item.name, cheapest.platform) : (cheapest.sourceUrl ?? cheapest.url), fallbackUrl: cheapest.url, appUrl: cheapest.appUrl })} />}
      <View style={styles.savingResult}><Text style={styles.savingResultLabel}>Lowest-to-highest price difference</Text><Text style={styles.savingResultValue}>{money(saving)}</Text><Text style={styles.savingResultText}>difference between the highest and lowest listed item prices; demo offers are simulated.</Text></View>
      <PrimaryButton label="Add lowest listed price to basket" onPress={() => setBasket((old) => {
        const existing = old.find((line) => line.itemId === item.id && line.option === option);
        if (existing) return old.map((line) => line.lineId === existing.lineId ? { ...line, quantity: line.quantity + quantity } : line);
        return [...old, { lineId: `${item.id}-${Date.now()}`, itemId: item.id, quantity, option, note: `${cheapest.platform} · ${(cheapest.priceStatus ?? 'demo').toUpperCase()}`, unitPrice: cheapest.itemPrice }];
      })} />
      <PrimaryButton label="Open basket" secondary onPress={() => go({ name: 'tabs', tab: 'Basket' })} />
    </ScrollView>
  );
}

function ShoesScreen({ go, back }: { go: (s: Screen) => void; back: () => void }) {
  const [type, setType] = useState('Sneakers');
  const [size, setSize] = useState(42);
  const [color, setColor] = useState('Black');
  const [budgetText, setBudgetText] = useState('300');
  const [brand, setBrand] = useState('Any brand');
  const budget = Math.max(0, Number(budgetText) || 0);
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <AppHeader title="Shoe finder" subtitle="Tell Waffer what you need" onBack={back} />
      <View style={styles.questionCard}><Text style={styles.questionNumber}>1</Text><Text style={styles.questionTitle}>What type of shoes?</Text><View style={styles.wrap}>{shoeTypes.map((x) => <Pill key={x} text={x} selected={type === x} onPress={() => setType(x)} />)}</View></View>
      <View style={styles.questionCard}><Text style={styles.questionNumber}>2</Text><Text style={styles.questionTitle}>What is your EU size?</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{[35,36,37,38,39,40,41,42,43,44].map((x) => <Pill key={x} text={`${x}`} selected={size === x} onPress={() => setSize(x)} />)}</ScrollView></View>
      <View style={styles.questionCard}><Text style={styles.questionNumber}>3</Text><Text style={styles.questionTitle}>Preferred colour?</Text><View style={styles.wrap}>{shoeColors.map((x) => <Pill key={x} text={x} selected={color === x} onPress={() => setColor(x)} />)}</View></View>
      <View style={styles.questionCard}><Text style={styles.questionNumber}>4</Text><Text style={styles.questionTitle}>Maximum budget</Text><View style={styles.moneyInputRow}><Text style={styles.currencyPrefix}>AED</Text><TextInput keyboardType="numeric" style={styles.moneyInput} value={budgetText} onChangeText={setBudgetText} /></View></View>
      <View style={styles.questionCard}><Text style={styles.questionNumber}>5</Text><Text style={styles.questionTitle}>Preferred brand?</Text><View style={styles.wrap}>{shoeBrands.map((x) => <Pill key={x} text={x} selected={brand === x} onPress={() => setBrand(x)} />)}</View></View>
      <PrimaryButton label="Find matching shoes" onPress={() => go({ name: 'shoeResults', filters: { type, size, color, budget, brand, sort: 'Cheapest first' } })} />
    </ScrollView>
  );
}

function ShoeResultsScreen({ filters, back }: { filters: ShoeFilters; back: () => void }) {
  const [sort, setSort] = useState<ShoeFilters['sort']>(filters.sort);
  const results = useMemo(() => {
    const matched = shoes.filter((s) =>
      s.type === filters.type &&
      s.sizes.includes(filters.size) &&
      (filters.color === 'Other' || s.color === filters.color) &&
      s.price + s.deliveryFee <= filters.budget &&
      (filters.brand === 'Any brand' || s.brand === filters.brand)
    );
    return [...matched].sort((a, b) => {
      const aTotal = a.price + a.deliveryFee;
      const bTotal = b.price + b.deliveryFee;
      return sort === 'Highest price' ? bTotal - aTotal : aTotal - bTotal;
    });
  }, [filters, sort]);
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <AppHeader title="Matching shoes" subtitle={`${filters.type} · Size ${filters.size} · ${filters.color}`} onBack={back} />
      <View style={styles.wrap}>{(['Cheapest first', 'Best value', 'Highest price'] as const).map((x) => <Pill key={x} text={x} selected={sort === x} onPress={() => setSort(x)} />)}</View>
      {results.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyTitle}>No exact demo match</Text><Text style={styles.emptyText}>Try another colour, brand or a higher budget. Waffer only shows products that match the available sample attributes.</Text></View>
      ) : results.map((s, i) => <ShoeResult key={s.id} shoe={s} best={i === 0} />)}
      <Text style={styles.disclaimer}>Sample Prices — product availability is not claimed or verified in this prototype.</Text>
    </ScrollView>
  );
}

function ShoeResult({ shoe, best }: { shoe: Shoe; best: boolean }) {
  const total = shoe.price + shoe.deliveryFee;
  return (
    <View style={[styles.shoeCard, best && styles.bestCard]}>
      <SampleImage label={`${shoe.brand} ${shoe.type}`} imageUri={shoe.imageUri} fallbackIcon={shoe.fallbackIcon} compact />
      <View style={{ flex: 1 }}>
        <View style={styles.platformTop}><Text style={styles.shoeName}>{shoe.name}</Text>{best && <View style={styles.bestBadge}><Text style={styles.bestBadgeText}>LOWEST LISTED</Text></View>}</View>
        <Text style={styles.shoeMeta}>{shoe.brand} · {shoe.color} · Sizes {shoe.sizes.join(', ')}</Text>
        <BrandBadge name={shoe.retailer} />
        <Text style={styles.shoePrice}>{money(total)}</Text>
        <Text style={styles.shoeFee}>Product {money(shoe.price)} · Delivery {money(shoe.deliveryFee)}</Text>
        <PrimaryButton label={best ? `Go to best offer · ${shoe.retailer}` : "Shop Now"} onPress={() => openOffer({ label: shoe.retailer, webUrl: buildStoreSearchUrl(`${shoe.brand} ${shoe.name}`, shoe.retailer), fallbackUrl: shoe.url, appUrl: shoe.appUrl })} secondary={!best} />
        {shoe.locationSearch && <PrimaryButton label={`📍 Find ${shoe.retailer} locations`} onPress={() => openLocationSearch(shoe.locationSearch!)} secondary />}
      </View>
    </View>
  );
}


const shoppingProducts = [
  { id: 'p1', name: 'Nike Revolution 7', category: 'Shoes', brand: 'Nike', imageUri: 'https://www.nike.ae/dw/image/v2/BDVB_PRD/on/demandware.static/-/Sites-akeneo-master-catalog/default/dwcfe0a4d6/nk/ffb/b/5/4/e/2/ffbb54e2_f757_48b3_83de_a0903f05d893.png?q=100&sh=700&sm=fit&strip=false&sw=700', samplePrice: 219, retailer: 'Noon', url: 'https://www.noon.com/uae-en/', offers: [{ retailer: 'Noon', price: 219 }, { retailer: 'Amazon.ae', price: 229 }, { retailer: 'Namshi', price: 249 }] },
  { id: 'p2', name: 'Adidas Runfalcon 5', category: 'Shoes', brand: 'Adidas', imageUri: 'https://assets.adidas.com/images/w_1880,f_auto,q_auto/b64f5377913a4d51a6d0fa62b69d1ebc_9366/JR5089_HM1.jpg', samplePrice: 235, retailer: 'Amazon.ae', url: 'https://www.amazon.ae/', offers: [{ retailer: 'Amazon.ae', price: 235 }, { retailer: 'Noon', price: 249 }, { retailer: 'Namshi', price: 259 }] },
  { id: 'p3', name: 'Puma Caven 2.0', category: 'Shoes', brand: 'Puma', imageUri: 'https://images.puma.com/image/upload/f_auto,q_auto,w_600,b_rgb:FAFAFA/global/392290/80/sv01/fnd/ARE/fmt/png', samplePrice: 189, retailer: 'Namshi', url: 'https://www.namshi.com/uae-en/', offers: [{ retailer: 'Namshi', price: 189 }, { retailer: 'Noon', price: 205 }, { retailer: 'Amazon.ae', price: 219 }] },
  { id: 'p4', fallbackIcon: '👕', name: 'Basic Cotton T-Shirt', category: 'Fashion', brand: 'Fashion', samplePrice: 39, retailer: 'Centrepoint', url: 'https://www.centrepointstores.com/ae/en/', offers: [{ retailer: 'Centrepoint', price: 39 }, { retailer: 'Noon', price: 45 }, { retailer: 'Amazon.ae', price: 49 }] },
  { id: 'p5', fallbackIcon: '👗', name: 'Women Casual Dress', category: 'Fashion', brand: 'Fashion', samplePrice: 89, retailer: 'Namshi', url: 'https://www.namshi.com/uae-en/', offers: [{ retailer: 'Namshi', price: 89 }, { retailer: 'Noon', price: 99 }, { retailer: 'Amazon.ae', price: 109 }] },
  { id: 'p6', fallbackIcon: '🎒', name: 'Classic Backpack', category: 'Fashion', brand: 'Accessories', samplePrice: 79, retailer: 'Noon', url: 'https://www.noon.com/uae-en/', offers: [{ retailer: 'Noon', price: 79 }, { retailer: 'Amazon.ae', price: 89 }, { retailer: 'Centrepoint', price: 99 }] },
  { id: 'p7', fallbackIcon: '💄', name: 'Maybelline Mascara', category: 'Beauty', brand: 'Maybelline', samplePrice: 42, retailer: 'Amazon.ae', url: 'https://www.amazon.ae/', offers: [{ retailer: 'Amazon.ae', price: 42 }, { retailer: 'Noon', price: 45 }, { retailer: 'Namshi', price: 49 }] },
  { id: 'p8', fallbackIcon: '🧴', name: 'CeraVe Moisturising Cream', category: 'Beauty', brand: 'CeraVe', samplePrice: 65, retailer: 'Noon', url: 'https://www.noon.com/uae-en/', offers: [{ retailer: 'Noon', price: 65 }, { retailer: 'Amazon.ae', price: 69 }, { retailer: 'Namshi', price: 74 }] },
  { id: 'p9', fallbackIcon: '🧴', name: 'The Ordinary Niacinamide', category: 'Beauty', brand: 'The Ordinary', samplePrice: 49, retailer: 'Namshi', url: 'https://www.namshi.com/uae-en/', offers: [{ retailer: 'Namshi', price: 49 }, { retailer: 'Noon', price: 54 }, { retailer: 'Amazon.ae', price: 59 }] },
];

function buildRetailerSearchUrl(query: string, retailer: string) {
  const domains: Record<string, string> = {
    'Noon': 'noon.com/uae-en',
    'Amazon.ae': 'amazon.ae',
    'Namshi': 'namshi.com/uae-en',
    'Centrepoint': 'centrepointstores.com/ae/en',
  };
  const domain = domains[retailer];
  const search = domain ? `site:${domain} \"${query}\" UAE` : `\"${query}\" \"${retailer}\" UAE`;
  return `https://www.google.com/search?q=${encodeURIComponent(search)}`;
}

const ONLINE_RETAILERS: { name: string; icon: string; url: (q: string) => string }[] = [
  { name: 'Google Shopping', icon: '🔎', url: (q) => `https://www.google.com/search?tbm=shop&gl=ae&hl=en&q=${encodeURIComponent(q)}` },
  { name: 'Amazon.ae', icon: '📦', url: (q) => `https://www.amazon.ae/s?k=${encodeURIComponent(q)}` },
  { name: 'Noon', icon: '🟡', url: (q) => `https://www.noon.com/uae-en/search/?q=${encodeURIComponent(q)}` },
  { name: 'Namshi', icon: '👗', url: (q) => buildRetailerSearchUrl(q, 'Namshi') },
  { name: 'Brands For Less', icon: '🏷️', url: (q) => `https://www.google.com/search?q=${encodeURIComponent(`site:brandsforless.com/en-ae ${q}`)}` },
  { name: 'Centrepoint', icon: '🛍️', url: (q) => buildRetailerSearchUrl(q, 'Centrepoint') },
  { name: 'Carrefour', icon: '🛒', url: (q) => `https://www.carrefouruae.com/mafuae/en/search?keyword=${encodeURIComponent(q)}` },
  { name: 'Lulu Hypermarket', icon: '🛒', url: (q) => `https://www.google.com/search?q=${encodeURIComponent(`site:luluhypermarket.com/en-ae ${q}`)}` },
];

/** Live prices (when the price service is configured) + direct store searches for any term. */
function OnlineOffers({ query }: { query: string }) {
  const [offers, setOffers] = useState<LiveOffer[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  useEffect(() => {
    if (!livePricesConfigured) return;
    setStatus('loading');
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetchLiveOffers(query, ctrl.signal).then((o) => { setOffers(o); setStatus('done'); }).catch((e) => { if (e?.name !== 'AbortError') setStatus('error'); });
    }, 700);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [query]);
  return (
    <View>
      {livePricesConfigured ? (
        <>
          <SectionTitle title={`Prices for “${query}”`} action={status === 'done' ? `${offers.length} offers` : ''} />
          {status === 'loading' && <Text style={styles.helperText}>Finding the best prices…</Text>}
          {status === 'error' && <View style={styles.notice}><Text style={styles.noticeText}>Couldn't reach the price service. Check that the server is running and the phone is on the same network.</Text></View>}
          {status === 'done' && offers.length === 0 && <Text style={styles.helperText}>No priced listings found. Try the store searches below.</Text>}
          {offers.map((o, i) => (
            <TouchableOpacity key={`${o.store}-${o.link}-${i}`} style={[styles.menuCard, i === 0 && styles.bestCard]} onPress={() => openOffer({ label: o.store, webUrl: o.link })}>
              <SampleImage label={o.title} imageUri={o.image ?? undefined} compact />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={2} style={styles.menuName}>{o.title}</Text>
                <Text style={styles.menuDescription}>{o.store}{o.delivery ? ` · ${o.delivery}` : ''}</Text>
                <Text style={styles.menuPrice}>{o.priceText}</Text>
                {i === 0 && <Text style={styles.bestBadgeText}>LOWEST PRICE</Text>}
              </View>
              <Text style={styles.addLabel}>OPEN ↗</Text>
            </TouchableOpacity>
          ))}
          <Text style={styles.helperText}>Prices come from Google Shopping at the moment of search and can change; confirm the final price, size and delivery on the store page.</Text>
        </>
      ) : (
        <View style={styles.notice}><Text style={styles.noticeText}>Live prices need a price-service key (free tier available). Add it in the .env file (see README, "Live shopping prices"). Until then, the store buttons below open each store's own results.</Text></View>
      )}
      <SectionTitle title="Search directly in stores" action={`${ONLINE_RETAILERS.length} stores`} />
      {ONLINE_RETAILERS.map((r) => (
        <TouchableOpacity key={r.name} style={styles.platformCard} onPress={() => openOffer({ label: r.name, webUrl: r.url(query), fallbackUrl: retailerHome(r.name) })}>
          <View style={styles.platformTop}>
            <BrandBadge name={r.name} icon={r.icon} />
            <Text style={styles.addLabel}>VIEW OFFERS ↗</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ShoppingScreen({ go, back }: { go: (s: Screen) => void; back: () => void }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('Cheapest');
  const categories = ['All', 'Fashion', 'Beauty', 'Shoes'];
  const cleanQuery = query.trim();
  const results = shoppingProducts
    .filter((p) => (category === 'All' || p.category === category) && `${p.name} ${p.brand} ${p.category}`.toLowerCase().includes(cleanQuery.toLowerCase()))
    .sort((a,b) => sort === 'Highest' ? b.samplePrice-a.samplePrice : a.samplePrice-b.samplePrice);
  return <ScrollView contentContainerStyle={styles.page}>
    <AppHeader title="Shopping" subtitle="Fashion · Beauty · Shoes · Abu Dhabi" onBack={back} />
    <TextInput style={styles.bigInput} placeholder="Search for a product (e.g. Nike Air Max, mascara)..." value={query} onChangeText={setQuery} returnKeyType="search" />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{categories.map((x) => <Pill key={x} text={x} selected={category === x} onPress={() => setCategory(x)} />)}</ScrollView>
    <View style={styles.notice}><Text style={styles.noticeText}>SEARCH PRODUCTS · Choose a product to compare its available retailer offers. Catalogue prices below are illustrative until live retailer feeds are connected.</Text></View>
    {cleanQuery.length > 1 && <OnlineOffers query={cleanQuery} />}
    <SectionTitle title={cleanQuery ? `Compare sample prices for “${cleanQuery}”` : 'Popular products'} action={`${results.length} results`} />
    <View style={styles.wrap}>{(['Cheapest','Highest'] as const).map((x) => <Pill key={x} text={`${x} first`} selected={sort === x} onPress={() => setSort(x)} />)}</View>
    {results.map((product) => <TouchableOpacity key={product.id} style={styles.menuCard} onPress={() => go({ name: 'shoppingCompare', productId: product.id })}>
      <SampleImage label={product.name} imageUri={(product as any).imageUri} fallbackIcon={(product as any).fallbackIcon ?? '🛍️'} compact />
      <View style={{ flex: 1 }}>
        <Text style={styles.menuName}>{product.name}</Text>
        <Text style={styles.menuDescription}>{product.category} · {product.brand}</Text>
        <Text style={styles.menuPrice}>From {money(Math.min(...product.offers.map((o:any) => o.price)))}</Text>
        <Text style={styles.helperText}>{product.offers.length} retailer offers · sample prices</Text>
      </View>
      <Text style={styles.addLabel}>SEE ALL OFFERS</Text>
    </TouchableOpacity>)}
    {cleanQuery && results.length === 0 && <Text style={styles.helperText}>No sample-price comparison exists for this item, so use the store offers above.</Text>}
    <Text style={styles.disclaimer}>Select a product to see its retailer comparison, just like the Food section. Prices are illustrative, not live-verified. Selecting an offer opens the retailer's product search so you can confirm the exact variant and buy there.</Text>
  </ScrollView>;
}

function ShoppingCompareScreen({ productId, back }: { productId: string; back: () => void }) {
  const product = shoppingProducts.find((p) => p.id === productId);
  if (!product) return <SafeAreaView style={styles.safe}><Text>Product not found.</Text></SafeAreaView>;
  const offers = [...product.offers].sort((a:any,b:any) => a.price-b.price);
  const lowest = offers[0];
  return <ScrollView contentContainerStyle={styles.page}>
    <AppHeader title="Compare offers" subtitle="Shopping · Abu Dhabi" onBack={back} />
    <View style={styles.platformCard}>
      <Text style={styles.listTitle}>{product.name}</Text>
      <Text style={styles.listSub}>{product.category} · {product.brand}</Text>
      <Text style={styles.helperText}>Illustrative comparison · prices not live-verified</Text>
    </View>
    <SectionTitle title="Available retailer offers" action={`${offers.length} offers`} />
    {offers.map((offer:any, index:number) => <View key={`${product.id}-${offer.retailer}`} style={[styles.platformCard, index===0 && styles.bestCard]}>
      <View style={styles.platformTop}>
        <View style={{flex:1}}>
          <Text style={styles.listTitle}>{offer.retailer}</Text>
          {index===0 && <Text style={styles.bestBadgeText}>LOWEST SAMPLE PRICE</Text>}
        </View>
        <Text style={styles.totalValue}>{money(offer.price)}</Text>
      </View>
      <PrimaryButton label={`See offer at ${offer.retailer} ↗`} onPress={() => openOffer({ label: offer.retailer, webUrl: buildRetailerSearchUrl(product.name, offer.retailer), fallbackUrl: retailerHome(offer.retailer) })} secondary={index!==0} />
    </View>)}
    {lowest && <View style={styles.savingResult}><Text style={styles.savingResultLabel}>Lowest sample price</Text><Text style={styles.savingResultValue}>{money(lowest.price)}</Text><Text style={styles.savingResultText}>Check seller, size/colour, delivery charges and final checkout price on the retailer's website or app.</Text></View>}
    <Text style={styles.disclaimer}>Waffer opens the retailer's search for this product. Direct product links and live price feeds require approved retailer integrations.</Text>
  </ScrollView>;
}

function retailerHome(store: string) {
  const homes: Record<string, string> = {
    'Noon': 'https://www.noon.com/uae-en/',
    'Amazon.ae': 'https://www.amazon.ae/',
    'Namshi': 'https://www.namshi.com/uae-en/',
    'Centrepoint': 'https://www.centrepointstores.com/ae/en/',
    'Google Shopping': 'https://shopping.google.com/',
    'Brands For Less': 'https://www.brandsforless.com/en-ae',
    'Carrefour': 'https://www.carrefouruae.com/',
    'Lulu Hypermarket': 'https://www.luluhypermarket.com/en-ae',
  };
  return homes[store] ?? 'https://www.google.com/';
}

function openRestaurantFullMenu(name: string, restaurantId: string) {
  const menuPages: Record<string, string> = {
    mcd: 'https://aqaluae.com/restaurants/mcdonalds',
    bk: 'https://aqaluae.com/restaurants/burger-king',
    kfc: 'https://aqaluae.com/restaurants/kfc',
    ph: 'https://aqaluae.com/restaurants/pizza-hut',
    zwz: 'https://aqaluae.com/restaurants/zaatar-w-zeit',
  };
  const url = menuPages[restaurantId] ?? `https://www.google.com/search?q=${encodeURIComponent(`${name} UAE full menu`)}`;
  openOffer({ label: `${name} full menu`, webUrl: url });
}

function GroceriesScreen({ go, back }: { go: (s: Screen) => void; back: () => void }) {
  const [query, setQuery] = useState('');
  const results = groceries.filter((g) => `${g.brand} ${g.name} ${g.quantity}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <AppHeader title="Grocery comparison" subtitle="Compare equivalent products fairly" onBack={back} />
      <TextInput style={styles.bigInput} placeholder="Search milk, yogurt, cereal..." value={query} onChangeText={setQuery} />
      <Text style={styles.helperText}>Try “milk” to demonstrate a 1-litre like-for-like comparison.</Text>
      {results.map((g) => (
        <TouchableOpacity key={g.id} style={styles.groceryCard} onPress={() => go({ name: 'groceryCompare', groceryId: g.id })}>
          <SampleImage label={g.imageLabel} imageUri={g.imageUri} fallbackIcon={g.fallbackIcon} compact />
          <View style={{ flex: 1 }}><Text style={styles.groceryName}>{g.brand} {g.name}</Text><Text style={styles.groceryQty}>{g.quantity}</Text><Text style={styles.compareHint}>{g.prices.length} stores available in demo</Text></View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function GroceryCompareScreen({ groceryId, back }: { groceryId: string; back: () => void }) {
  const item = groceries.find((g) => g.id === groceryId);
  if (!item) return <SafeAreaView style={styles.safe}><Text>Product not found.</Text></SafeAreaView>;
  const ranked = [...item.prices].sort((a, b) => (a.price + a.deliveryFee - a.discount) - (b.price + b.deliveryFee - b.discount));
  const low = ranked[0];
  const high = ranked[ranked.length - 1];
  const saving = low && high ? (high.price + high.deliveryFee - high.discount) - (low.price + low.deliveryFee - low.discount) : 0;
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <AppHeader title="Grocery prices" subtitle={`${item.brand} ${item.name} · ${item.quantity}`} onBack={back} />
      <SampleImage label={item.imageLabel} imageUri={item.imageUri} fallbackIcon={item.fallbackIcon} />
      <View style={styles.notice}><Text style={styles.noticeText}>Like-for-like demo comparison of the same sample product and quantity.</Text></View>
      {ranked.map((p, i) => {
        const final = p.price + p.deliveryFee - p.discount;
        return (
          <View key={p.store} style={[styles.platformCard, i === 0 && styles.bestCard]}>
            <View style={styles.platformTop}><BrandBadge name={p.store} icon={p.icon} />{i === 0 && <View style={styles.bestBadge}><Text style={styles.bestBadgeText}>LOWEST LISTED</Text></View>}</View>
            <View style={styles.breakdown}><Text style={styles.breakLabel}>Product</Text><Text style={styles.breakValue}>{money(p.price)}</Text></View>
            <View style={styles.breakdown}><Text style={styles.breakLabel}>Delivery in this demo</Text><Text style={styles.breakValue}>{money(p.deliveryFee)}</Text></View>
            <View style={styles.breakdown}><Text style={styles.breakLabel}>Discount</Text><Text style={styles.discountValue}>− {money(p.discount)}</Text></View>
            <View style={styles.totalLine}><Text style={styles.totalLabel}>Final demo cost</Text><Text style={styles.totalValue}>{money(final)}</Text></View>
            <Text style={styles.unitPrice}>Unit price: {money(final)} per {item.quantity}</Text>
            <PrimaryButton label={`Open ${p.store}`} onPress={() => openOffer({ label: p.store, webUrl: buildStoreSearchUrl(`${item.brand} ${item.name}`, p.store), fallbackUrl: p.url, appUrl: p.appUrl })} secondary={i !== 0} />
            <PrimaryButton label={`📍 Find nearby ${p.store} branches`} onPress={() => openLocationSearch(p.locationSearch ?? p.store)} secondary />
          </View>
        );
      })}
      {low && <PrimaryButton label={`Go to best offer at ${low.store}`} onPress={() => openOffer({ label: low.store, webUrl: buildStoreSearchUrl(`${item.brand} ${item.name}`, low.store), fallbackUrl: low.url, appUrl: low.appUrl })} />}
      <View style={styles.savingResult}><Text style={styles.savingResultLabel}>Lowest-to-highest price difference</Text><Text style={styles.savingResultValue}>{money(saving)}</Text><Text style={styles.savingResultText}>between the highest and lowest comparable sample total.</Text></View>
    </ScrollView>
  );
}

function GenericCategoryScreen({ title, back }: { title: string; back: () => void }) {
  const [query, setQuery] = useState('');
  const [budget, setBudget] = useState('500');
  const demoProducts = [
    { name: `${title} Essentials`, store: 'Noon', price: 129 },
    { name: `${title} Value Pick`, store: 'Amazon.ae', price: 149 },
    { name: `${title} Premium Pick`, store: 'Demo Retailer', price: 199 },
  ].filter((p) => p.price <= (Number(budget) || 99999) && p.name.toLowerCase().includes(query.toLowerCase()));
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <AppHeader title={title} subtitle="Prototype comparison experience" onBack={back} />
      <TextInput style={styles.bigInput} placeholder={`Search ${title.toLowerCase()}`} value={query} onChangeText={setQuery} />
      <View style={styles.moneyInputRow}><Text style={styles.currencyPrefix}>Max AED</Text><TextInput style={styles.moneyInput} keyboardType="numeric" value={budget} onChangeText={setBudget} /></View>
      <View style={styles.notice}><Text style={styles.noticeText}>This category uses reusable demo comparison cards. Food, Shoes and Groceries are the fully developed priority journeys.</Text></View>
      {demoProducts.map((p, i) => (
        <View key={p.name} style={[styles.listCard, i === 0 && styles.bestCard]}>
          <SampleImage label={title} compact />
          <View style={{ flex: 1 }}><Text style={styles.listTitle}>{p.name}</Text><Text style={styles.listSub}>{p.store}</Text><Text style={styles.shoePrice}>{money(p.price)}</Text></View>
          {i === 0 && <View style={styles.bestBadge}><Text style={styles.bestBadgeText}>LOWEST LISTED</Text></View>}
        </View>
      ))}
    </ScrollView>
  );
}

function BottomTabs({ active, onSelect }: { active: TabName; onSelect: (tab: TabName) => void }) {
  const tabs: TabName[] = ['Home', 'Explore', 'Compare', 'Deals', 'Profile'];
  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => (
        <TouchableOpacity key={tab} style={styles.tabButton} onPress={() => onSelect(tab)}>
          <View style={[styles.tabDot, active === tab && styles.tabDotActive]}><Text style={[styles.tabLetter, active === tab && styles.tabLetterActive]}>{tab[0]}</Text></View>
          <Text style={[styles.tabLabel, active === tab && styles.tabLabelActive]}>{tab}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}


function BasketScreen({ basket, setBasket, go }: { basket: BasketLine[]; setBasket: React.Dispatch<React.SetStateAction<BasketLine[]>>; go: (screen: Screen) => void }) {
  const lines = basket.map((line) => ({ ...line, item: menuItems.find((item) => item.id === line.itemId) })).filter((line) => !!line.item);
  const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const restaurantIds = Array.from(new Set(lines.map((line) => line.item!.restaurantId)));
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <AppHeader title="Your basket" subtitle="Build once, compare the complete basket" />
      <View style={styles.notice}><Text style={styles.noticeText}>Basket prices use demonstration catalogue values, not live platform quotes. Items from different restaurants cannot be combined into one restaurant delivery comparison.</Text></View>
      {lines.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>Your basket is empty</Text><Text style={styles.emptyText}>Browse a restaurant menu and add meals to compare the basket total.</Text><PrimaryButton label="Browse restaurants" onPress={() => go({ name: 'food' })} /></View> : (
        <>
          {lines.map((line) => <View key={line.lineId} style={styles.listCard}>
            <SampleImage label={line.item!.imageLabel} imageUri={line.item!.imageUri} fallbackIcon={line.item!.fallbackIcon} compact />
            <View style={{ flex: 1 }}><Text style={styles.listTitle}>{line.item!.name}</Text><Text style={styles.listSub}>{line.option} · {line.note} · {money(line.unitPrice)} each</Text><Text style={styles.shoePrice}>{money(line.unitPrice * line.quantity)}</Text>
              <View style={styles.quantityRow}><TouchableOpacity style={styles.qtyButton} onPress={() => setBasket((old) => old.map((x) => x.lineId === line.lineId ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x))}><Text style={styles.qtyText}>−</Text></TouchableOpacity><Text style={styles.qtyNumber}>{line.quantity}</Text><TouchableOpacity style={styles.qtyButton} onPress={() => setBasket((old) => old.map((x) => x.lineId === line.lineId ? { ...x, quantity: x.quantity + 1 } : x))}><Text style={styles.qtyText}>+</Text></TouchableOpacity><TouchableOpacity onPress={() => setBasket((old) => old.filter((x) => x.lineId !== line.lineId))}><Text style={styles.sectionAction}>Remove</Text></TouchableOpacity></View>
            </View>
          </View>)}
          <View style={styles.infoCard}><Text style={styles.infoTitle}>Basket subtotal</Text><Text style={styles.totalValue}>{money(subtotal)}</Text><Text style={styles.infoText}>{lines.length} line item(s) · {restaurantIds.length} restaurant(s)</Text></View>
          {restaurantIds.length === 1 ? <PrimaryButton label="Compare complete basket" onPress={() => go({ name: 'basketCompare' })} /> : <View style={styles.notice}><Text style={styles.noticeText}>Your basket contains multiple restaurants. Split it into separate restaurant baskets to compare delivery totals accurately.</Text></View>}
        </>
      )}
    </ScrollView>
  );
}

function BasketCompareScreen({ basket, back }: { basket: BasketLine[]; back: () => void }) {
  const lines = basket.map((line) => ({ ...line, item: menuItems.find((item) => item.id === line.itemId) })).filter((line) => !!line.item);
  const platforms = ['Talabat', 'Smiles', 'Keeta'];
  const totals = platforms.map((platform) => {
    const prices = lines.map((line) => line.item!.prices.find((p) => p.platform === platform));
    const available = prices.every(Boolean);
    const subtotal = prices.reduce((sum, p, i) => sum + (p ? p.itemPrice * (lines[i]?.quantity ?? 0) : 0), 0);
    const delivery = prices[0]?.deliveryFee ?? 0;
    const service = prices[0]?.serviceFee ?? 0;
    const discount = prices.reduce((sum, p, i) => sum + (p?.discount ?? 0) * (lines[i]?.quantity ?? 0), 0);
    const destination = lines[0]?.item!.prices.find((offer) => offer.platform === platform);
    return { platform, available, subtotal, delivery, service, discount, total: subtotal + delivery + service - discount, url: destination?.url, appUrl: destination?.appUrl, icon: destination?.icon };
  }).filter((x) => x.available).sort((a, b) => a.total - b.total);
  const best = totals[0];
  return <ScrollView contentContainerStyle={styles.page}>
    <AppHeader title="Basket comparison" subtitle="Same selected items · sample platform values" onBack={back} />
    <View style={styles.notice}><Text style={styles.noticeText}>DEMO ESTIMATES ONLY. These totals use bundled sample data, not live quotes. Promotions, fees and availability are not verified; delivery/service fees are modeled once per basket.</Text></View>
    {lines.map((line) => <View key={line.lineId} style={styles.breakdown}><Text style={styles.breakLabel}>{line.quantity} × {line.item!.name} ({line.option})</Text><Text style={styles.breakValue}>{money(line.unitPrice * line.quantity)}</Text></View>)}
    {totals.map((p, i) => <View key={p.platform} style={[styles.platformCard, i === 0 && styles.bestCard]}>
      <View style={styles.platformTop}><BrandBadge name={p.platform} icon={p.icon} />{i === 0 && <View style={styles.bestBadge}><Text style={styles.bestBadgeText}>LOWEST DEMO TOTAL</Text></View>}</View>
      <View style={styles.breakdown}><Text style={styles.breakLabel}>Items subtotal</Text><Text style={styles.breakValue}>{money(p.subtotal)}</Text></View>
      <View style={styles.breakdown}><Text style={styles.breakLabel}>Delivery fee (sample)</Text><Text style={styles.breakValue}>{money(p.delivery)}</Text></View>
      <View style={styles.breakdown}><Text style={styles.breakLabel}>Service fee (sample)</Text><Text style={styles.breakValue}>{money(p.service)}</Text></View>
      <View style={styles.breakdown}><Text style={styles.breakLabel}>Discount (sample)</Text><Text style={styles.discountValue}>− {money(p.discount)}</Text></View>
      <View style={styles.totalLine}><Text style={styles.totalLabel}>Estimated demo total</Text><Text style={styles.totalValue}>{money(p.total)}</Text></View>
      <PrimaryButton label={i === 0 ? `See best offer · ${p.platform}` : `See offer · ${p.platform}`} onPress={() => {
        if (p.url) openOffer({ label: p.platform, webUrl: buildStoreSearchUrl(lines.map((line) => line.item!.name).join(' '), p.platform), fallbackUrl: p.url, appUrl: p.appUrl });
      }} secondary={i !== 0} />
    </View>)}
    {best && <View style={styles.savingResult}><Text style={styles.savingResultLabel}>Lowest sample basket</Text><Text style={styles.savingResultValue}>{money(best.total)}</Text><Text style={styles.savingResultText}>Not a verified checkout price. Confirm the final basket and fees in the delivery app.</Text></View>}
    <Text style={styles.disclaimer}>No platform cart API is configured. Continue to Order does not transfer items or place an order.</Text>
  </ScrollView>;
}

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [basket, setBasket] = useState<BasketLine[]>([]);
  activeColors = darkMode ? darkColors : lightColors;
  styles = createStyles(activeColors);

  const [stack, setStack] = useState<Screen[]>([{ name: 'tabs', tab: 'Home' }]);
  const current = stack[stack.length - 1] ?? { name: 'tabs', tab: 'Home' as TabName };
  const go = (screen: Screen) => setStack((s) => [...s, screen]);
  const back = () => setStack((s) => s.length > 1 ? s.slice(0, -1) : s);
  const setTab = (tab: TabName) => setStack([{ name: 'tabs', tab }]);

  let content: React.ReactNode;
  if (current.name === 'tabs') {
    if (current.tab === 'Home') content = <HomeScreen go={go} />;
    else if (current.tab === 'Explore') content = <ExploreScreen go={go} />;
    else if (current.tab === 'Compare') content = <CompareScreen />;
    else if (current.tab === 'Deals') content = <DealsScreen />;
    else if (current.tab === 'Basket') content = <BasketScreen basket={basket} setBasket={setBasket} go={go} />;
    else content = <ProfileScreen darkMode={darkMode} onDarkModeChange={setDarkMode} />;
  } else if (current.name === 'food') content = <FoodScreen go={go} back={back} />;
  else if (current.name === 'menu') content = <MenuScreen restaurantId={current.restaurantId} go={go} back={back} />;
  else if (current.name === 'basketCompare') content = <BasketCompareScreen basket={basket} back={back} />;
  else if (current.name === 'foodCompare') content = <FoodCompareScreen itemId={current.itemId} quantity={current.quantity} option={current.option} back={back} setBasket={setBasket} go={go} />;
  else if (current.name === 'shoes') content = <ShoesScreen go={go} back={back} />;
  else if (current.name === 'shopping') content = <ShoppingScreen go={go} back={back} />;
  else if (current.name === 'shoppingCompare') content = <ShoppingCompareScreen productId={current.productId} back={back} />;
  else if (current.name === 'shoeResults') content = <ShoeResultsScreen filters={current.filters} back={back} />;
  else if (current.name === 'groceries') content = <GroceriesScreen go={go} back={back} />;
  else if (current.name === 'groceryCompare') content = <GroceryCompareScreen groceryId={current.groceryId} back={back} />;
  else content = <GenericCategoryScreen title={current.title} back={back} />;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style={darkMode ? "light" : "dark"} />
      <View style={styles.app}>{content}</View>
      {current.name === 'tabs' && <BottomTabs active={current.tab} onSelect={setTab} />}
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  app: { flex: 1, backgroundColor: colors.cream },
  page: { padding: 18, paddingBottom: 32, gap: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  logoMark: { width: 42, height: 42, borderRadius: 14, backgroundColor: activeColors.green, alignItems: 'center', justifyContent: 'center' },
  logoMarkText: { color: colors.white, fontSize: 22, fontWeight: '900' },
  backButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  backButtonText: { color: colors.ink, fontSize: 34, lineHeight: 34, marginTop: -4 },
  headerTitle: { color: colors.ink, fontSize: 22, fontWeight: '900' },
  headerSubtitle: { color: colors.muted, fontSize: 12, marginTop: 2 },
  demoChip: { backgroundColor: activeColors.greenSoft, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 5 },
  demoChipText: { color: activeColors.greenDark, fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },
  hero: { backgroundColor: activeColors.green, borderRadius: 28, padding: 22, gap: 10 },
  heroEyebrow: { color: colors.heroEyebrow, fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  heroTitle: { color: colors.white, fontSize: 30, lineHeight: 35, fontWeight: '900' },
  heroText: { color: colors.heroText, fontSize: 14, lineHeight: 20 },
  searchRow: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 16, padding: 5, marginTop: 6, alignItems: 'center' },
  searchInput: { flex: 1, height: 46, paddingHorizontal: 12, color: colors.ink },
  searchButton: { backgroundColor: colors.panel, borderRadius: 12, paddingHorizontal: 16, height: 42, justifyContent: 'center' },
  searchButtonText: { color: colors.white, fontWeight: '800' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '900' },
  sectionAction: { color: activeColors.green, fontSize: 12, fontWeight: '800' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryCard: { width: '31%', minWidth: 100, flexGrow: 1, backgroundColor: colors.surface, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: colors.line },
  categoryFeatured: { backgroundColor: colors.featuredSurface, borderColor: colors.featuredBorder },
  categoryArt: { width: 38, height: 38, borderRadius: 12, backgroundColor: activeColors.greenSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  categoryArtText: { color: activeColors.greenDark, fontWeight: '900', fontSize: 18 },
  categoryName: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  categoryHint: { color: activeColors.green, fontSize: 10, marginTop: 4, fontWeight: '700' },
  savingsBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.panel, borderRadius: 22, padding: 18, gap: 12 },
  savingsMini: { color: colors.panelAccent, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  savingsTitle: { color: colors.white, fontSize: 18, lineHeight: 23, fontWeight: '900', marginTop: 4 },
  savingsText: { color: colors.panelMuted, fontSize: 12, lineHeight: 18, marginTop: 5 },
  savingsBubble: { width: 58, height: 58, borderRadius: 29, backgroundColor: activeColors.green, alignItems: 'center', justifyContent: 'center' },
  savingsBubbleText: { color: colors.white, fontSize: 12, fontWeight: '900' },
  dealCard: { width: 220, minHeight: 138, backgroundColor: colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.line },
  sponsored: { color: colors.amber, fontSize: 9, fontWeight: '900', letterSpacing: 0.8, marginBottom: 5 },
  dealTitle: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  dealSource: { color: colors.muted, fontSize: 11, marginTop: 5 },
  priceLine: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 12 },
  oldPrice: { color: colors.muted, textDecorationLine: 'line-through', fontSize: 12 },
  newPrice: { color: activeColors.greenDark, fontSize: 18, fontWeight: '900' },
  productRow: { flexDirection: 'row', gap: 10 },
  miniProduct: { flex: 1, backgroundColor: colors.surface, borderRadius: 18, padding: 10, borderWidth: 1, borderColor: colors.line },
  miniProductName: { color: colors.ink, fontWeight: '800', marginTop: 8 },
  miniProductPrice: { color: activeColors.green, fontWeight: '900', marginTop: 4, fontSize: 12 },
  sampleImage: { height: 170, backgroundColor: colors.sampleSurface, borderRadius: 22, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  productPhoto: { width: '100%', height: '100%' },
  sampleImageCompact: { width: 92, height: 92, borderRadius: 16 },
  sampleDot: { position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: colors.sampleAccent, top: -15, right: -10 },
  sampleFallbackIconBig: { fontSize: 44 },
  sampleFallbackIcon: { fontSize: 30, marginBottom: 4 },
  sampleImageText: { color: colors.ink, fontWeight: '900', fontSize: 15, textAlign: 'center', paddingHorizontal: 8 },
  sampleTiny: { color: colors.muted, fontSize: 8, marginTop: 3 },
  infoCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 15, borderWidth: 1, borderColor: colors.line },
  infoTitle: { color: colors.ink, fontWeight: '900' },
  infoText: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  bigInput: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 16, height: 52, paddingHorizontal: 15, color: colors.ink },
  listCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: colors.line },
  listIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: activeColors.greenSoft, alignItems: 'center', justifyContent: 'center' },
  listIconText: { color: activeColors.greenDark, fontWeight: '900', fontSize: 18 },
  listTitle: { color: colors.ink, fontWeight: '900', fontSize: 15 },
  listSub: { color: colors.muted, fontSize: 11, marginTop: 3 },
  chevron: { color: colors.muted, fontSize: 28 },
  compareSummary: { backgroundColor: activeColors.green, borderRadius: 24, padding: 20 },
  compareSummaryLabel: { color: '#DFF5EA', fontSize: 12, fontWeight: '800' },
  compareSummaryValue: { color: colors.white, fontSize: 34, fontWeight: '900', marginTop: 5 },
  compareSummaryText: { color: '#DFF5EA', fontSize: 12, marginTop: 4 },
  compareRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 16, padding: 15, borderWidth: 1, borderColor: colors.line },
  compareItem: { color: colors.ink, fontWeight: '900' },
  compareStore: { color: colors.muted, fontSize: 11, marginTop: 3 },
  comparePrice: { color: colors.ink, fontWeight: '900' },
  saveText: { color: activeColors.green, fontSize: 11, fontWeight: '800', marginTop: 3 },
  disclaimer: { color: colors.muted, fontSize: 10, lineHeight: 15, textAlign: 'center', paddingHorizontal: 18, marginTop: 6 },
  notice: { backgroundColor: colors.noticeSurface, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: colors.noticeBorder },
  noticeText: { color: colors.noticeText, fontSize: 11, lineHeight: 16, fontWeight: '600' },
  dealWide: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.line, alignItems: 'center', gap: 10 },
  dealWideTitle: { color: colors.ink, fontWeight: '900', fontSize: 16 },
  profileCard: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: colors.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.line },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: activeColors.green, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.white, fontWeight: '900', fontSize: 17 },
  profileName: { color: colors.ink, fontWeight: '900', fontSize: 17 },
  profileSub: { color: colors.muted, fontSize: 11, marginTop: 3 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.line },
  settingLabel: { color: colors.ink, fontWeight: '700', flex: 1 },
  settingHint: { color: colors.muted, fontSize: 10, marginTop: 3 },
  settingValue: { color: activeColors.greenDark, fontWeight: '800', maxWidth: '50%', textAlign: 'right' },
  restaurantCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 20, padding: 12, borderWidth: 1, borderColor: colors.line },
  restaurantCuisine: { color: colors.muted, fontSize: 11, marginTop: 6 },
  compareHint: { color: activeColors.green, fontSize: 10, fontWeight: '800', marginTop: 5 },
  brandBadge: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandIcon: { width: 34, height: 34, borderRadius: 9, backgroundColor: colors.sampleSurface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  brandIconText: { fontSize: 16 },
  brandLogoImage: { width: 28, height: 28, borderRadius: 6 },
  restaurantLogo: { width: 76, height: 76, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', padding: 8 },
  restaurantLogoImage: { width: 64, height: 64, borderRadius: 12 },
  restaurantLogoFallback: { color: colors.ink, fontWeight: '900', fontSize: 22 },
  locationLink: { color: activeColors.greenDark, fontSize: 10, fontWeight: '800', marginTop: 7 },
  brandBadgeInitials: { backgroundColor: colors.panel, color: colors.white, overflow: 'hidden', width: 30, height: 30, borderRadius: 9, textAlign: 'center', textAlignVertical: 'center', lineHeight: 30, fontSize: 9, fontWeight: '900' },
  brandBadgeName: { color: colors.ink, fontWeight: '900', fontSize: 13, flexShrink: 1 },
  menuCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: colors.line },
  menuName: { color: colors.ink, fontWeight: '900', fontSize: 15 },
  menuDescription: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  menuPrice: { color: activeColors.greenDark, fontWeight: '900', fontSize: 12, marginTop: 6 },
  addLabel: { color: activeColors.green, fontSize: 10, fontWeight: '900' },
  empty: { backgroundColor: colors.surface, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: colors.line, alignItems: 'center' },
  emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  emptyText: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 7 },
  detailName: { color: colors.ink, fontSize: 25, fontWeight: '900' },
  detailDescription: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  detailPrice: { color: activeColors.greenDark, fontWeight: '900', fontSize: 20 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  pillSelected: { backgroundColor: activeColors.green, borderColor: activeColors.green },
  pillText: { color: colors.ink, fontWeight: '700', fontSize: 12 },
  pillTextSelected: { color: colors.white },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  qtyButton: { width: 45, height: 45, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  qtyText: { color: colors.ink, fontSize: 24, fontWeight: '800' },
  qtyNumber: { color: colors.ink, fontSize: 20, fontWeight: '900', minWidth: 28, textAlign: 'center' },
  spacer: { height: 3 },
  primaryButton: { backgroundColor: activeColors.green, borderRadius: 14, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, marginTop: 10 },
  primaryButtonText: { color: colors.white, fontWeight: '900', fontSize: 13 },
  secondaryButton: { backgroundColor: colors.surface, borderWidth: 1, borderColor: activeColors.green },
  secondaryButtonText: { color: activeColors.greenDark },
  platformCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.line, gap: 8 },
  bestCard: { borderColor: activeColors.green, borderWidth: 2, backgroundColor: colors.bestSurface },
  platformTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  bestBadge: { backgroundColor: activeColors.greenSoft, paddingHorizontal: 8, paddingVertical: 5, borderRadius: radius.pill },
  bestBadgeText: { color: activeColors.greenDark, fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  breakdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  breakLabel: { color: colors.muted, fontSize: 12 },
  breakValue: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  discountValue: { color: activeColors.green, fontSize: 12, fontWeight: '900' },
  totalLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderColor: colors.line, paddingTop: 10, marginTop: 3 },
  totalLabel: { color: colors.ink, fontWeight: '900' },
  totalValue: { color: activeColors.greenDark, fontWeight: '900', fontSize: 20 },
  savingResult: { backgroundColor: colors.panel, borderRadius: 20, padding: 18, alignItems: 'center' },
  savingResultLabel: { color: colors.panelMuted, fontSize: 11, fontWeight: '800' },
  savingResultValue: { color: colors.white, fontSize: 30, fontWeight: '900', marginTop: 3 },
  savingResultText: { color: colors.panelMuted, fontSize: 11, textAlign: 'center', marginTop: 3 },
  questionCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.line, gap: 10 },
  questionNumber: { width: 28, height: 28, lineHeight: 28, textAlign: 'center', backgroundColor: activeColors.greenSoft, color: activeColors.greenDark, borderRadius: 9, overflow: 'hidden', fontWeight: '900' },
  questionTitle: { color: colors.ink, fontWeight: '900', fontSize: 16 },
  moneyInputRow: { flexDirection: 'row', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 14, alignItems: 'center', overflow: 'hidden' },
  currencyPrefix: { color: activeColors.greenDark, fontWeight: '900', paddingHorizontal: 14 },
  moneyInput: { flex: 1, height: 48, color: colors.ink, fontWeight: '800', paddingHorizontal: 12 },
  shoeCard: { flexDirection: 'row', gap: 12, backgroundColor: colors.surface, borderRadius: 20, padding: 12, borderWidth: 1, borderColor: colors.line },
  shoeName: { color: colors.ink, fontWeight: '900', fontSize: 15, flex: 1 },
  shoeMeta: { color: colors.muted, fontSize: 10, lineHeight: 15, marginVertical: 7 },
  shoePrice: { color: activeColors.greenDark, fontSize: 19, fontWeight: '900', marginTop: 8 },
  shoeFee: { color: colors.muted, fontSize: 10, marginTop: 3 },
  offerSub: { color: colors.muted, fontSize: 11, marginTop: 3 },
  helperText: { color: colors.muted, fontSize: 11, marginTop: -7 },
  priceOpenButton: { backgroundColor: activeColors.greenSoft, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  priceOpenText: { color: activeColors.greenDark, fontSize: 11, fontWeight: '900' },
  groceryCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: colors.line },
  groceryName: { color: colors.ink, fontWeight: '900', fontSize: 15 },
  groceryQty: { color: colors.muted, fontSize: 12, marginTop: 3 },
  unitPrice: { color: colors.muted, fontSize: 10 },
  tabBar: { flexDirection: 'row', backgroundColor: colors.surface, borderTopWidth: 1, borderColor: colors.line, paddingTop: 7, paddingBottom: 7, paddingHorizontal: 4 },
  tabButton: { flex: 1, alignItems: 'center', gap: 3 },
  tabDot: { width: 27, height: 27, borderRadius: 10, backgroundColor: colors.tabInactive, alignItems: 'center', justifyContent: 'center' },
  tabDotActive: { backgroundColor: activeColors.greenSoft },
  tabLetter: { color: colors.muted, fontSize: 10, fontWeight: '900' },
  tabLetterActive: { color: activeColors.greenDark },
  tabLabel: { color: colors.muted, fontSize: 9, fontWeight: '700' },
  tabLabelActive: { color: activeColors.greenDark, fontWeight: '900' },
  });
}
