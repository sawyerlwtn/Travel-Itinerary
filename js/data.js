/* =============================================
   DATA LAYER — Wikipedia + Geoapify API calls
   ============================================= */

// Geoapify API Key — sign up free at https://www.geoapify.com/
const GEOAPIFY_KEY = '4e760613dfc142f38ac3458287f607ba';

// --- Wikipedia REST API ---
async function fetchCitySummary(cityName) {
  try {
    const encoded = encodeURIComponent(cityName);
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      title: data.title || cityName,
      extract: data.extract || '',
      thumbnail: data.thumbnail ? data.thumbnail.source : null,
      description: data.description || '',
    };
  } catch (err) {
    console.warn(`Wikipedia fetch failed for "${cityName}":`, err);
    return null;
  }
}

// --- Geoapify Places API ---
// Category mapping
const POI_CATEGORIES = {
  food: {
    apiCategories: 'catering.restaurant,catering.cafe,catering.fast_food',
    label: 'Food & Drink',
    icon: '🍽️',
    cssClass: 'food',
  },
  landmarks: {
    apiCategories: 'tourism.sights,tourism.attraction,building.historic',
    label: 'Landmarks',
    icon: '🏛️',
    cssClass: 'landmark',
  },
  parks: {
    apiCategories: 'leisure.park,natural,leisure.garden',
    label: 'Parks & Nature',
    icon: '🌳',
    cssClass: 'park',
  },
  activities: {
    apiCategories: 'entertainment,sport,leisure.playground,activity',
    label: 'Activities',
    icon: '🎭',
    cssClass: 'activity',
  },
};

async function fetchPOIs(lon, lat, categoryKey, limit = 8) {
  const cat = POI_CATEGORIES[categoryKey];
  if (!cat) return [];

  if (!GEOAPIFY_KEY) {
    console.warn('Geoapify API key not set — returning empty POI results.');
    return [];
  }

  try {
    const url = new URL('https://api.geoapify.com/v2/places');
    url.searchParams.set('categories', cat.apiCategories);
    url.searchParams.set('filter', `circle:${lon},${lat},5000`); // 5km radius
    url.searchParams.set('bias', `proximity:${lon},${lat}`);
    url.searchParams.set('limit', limit);
    url.searchParams.set('apiKey', GEOAPIFY_KEY);

    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const data = await res.json();

    return (data.features || []).map((f) => ({
      name: f.properties.name || 'Unnamed Place',
      address:
        f.properties.formatted ||
        f.properties.street ||
        f.properties.city ||
        '',
      lon: f.properties.lon,
      lat: f.properties.lat,
      category: categoryKey,
      cssClass: cat.cssClass,
      icon: cat.icon,
    }));
  } catch (err) {
    console.warn(`Geoapify fetch failed for "${categoryKey}":`, err);
    return [];
  }
}

// Fetch all POI categories for a location at once
async function fetchAllPOIs(lon, lat) {
  const results = {};
  const keys = Object.keys(POI_CATEGORIES);

  const fetches = keys.map((key) => fetchPOIs(lon, lat, key));
  const responses = await Promise.all(fetches);

  keys.forEach((key, i) => {
    results[key] = responses[i];
  });

  return results;
}
