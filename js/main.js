/* =============================================
   MAIN — Map init, globe, fly-to, orchestration
   ============================================= */

mapboxgl.accessToken =
  'pk.eyJ1Ijoic2F3eWVybHd0biIsImEiOiJjbWxmaTIxcGMwMjNxM2xwdjV6dGhhNzY5In0.-e2Om8U7uw6E8aXJk-gSpA';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/sawyerlwtn/cmlfiijn7001901sr702o44bo',
  projection: 'globe',
  center: [12.5, 41.9], // Centered on Europe
  zoom: 2.2,
  pitch: 40,
});

// --- Globe atmospheric styling ---
map.on('style.load', () => {
  map.setFog({
    color: 'rgb(15, 23, 42)',          // dark blue fog at horizon
    'high-color': 'rgb(30, 41, 59)',    // upper atmosphere
    'horizon-blend': 0.08,
    'space-color': 'rgb(11, 17, 32)',   // space behind globe
    'star-intensity': 0.6,
  });
});

// --- Geocoder ---
const geocoder = new MapboxGeocoder({
  accessToken: mapboxgl.accessToken,
  mapboxgl: mapboxgl,
  types: 'place,locality',
  placeholder: 'Search for a city...',
  marker: false, // We'll handle markers ourselves
});

document.getElementById('geocoder').appendChild(geocoder.onAdd(map));

// --- State ---
let itinerary = [];
let currentIndex = -1;
let isFlying = false;

// --- Add city from geocoder ---
geocoder.on('result', (e) => {
  const city = {
    name: e.result.text,
    coords: e.result.center, // [lng, lat]
    description: e.result.place_name,
  };

  itinerary.push(city);
  geocoder.clear();

  renderItineraryList(itinerary, currentIndex);
  placeCityMarkers(map, itinerary, currentIndex);
  renderRouteInfo(itinerary, currentIndex);

  if (itinerary.length >= 2) {
    updateRouteLine(map, itinerary);
  }
});

// --- Remove city ---
function removeCity(index) {
  itinerary.splice(index, 1);

  // Adjust currentIndex
  if (currentIndex >= itinerary.length) {
    currentIndex = itinerary.length - 1;
  }
  if (itinerary.length === 0) {
    currentIndex = -1;
    clearRouteLine(map);
    renderWelcomeState();
  } else if (itinerary.length >= 2) {
    updateRouteLine(map, itinerary);
  } else {
    clearRouteLine(map);
  }

  renderItineraryList(itinerary, currentIndex);
  placeCityMarkers(map, itinerary, currentIndex);
  renderRouteInfo(itinerary, currentIndex);
}

// --- Fly to Next Stop ---
document.getElementById('fly-btn').addEventListener('click', async () => {
  if (isFlying || itinerary.length === 0) return;

  currentIndex++;
  if (currentIndex >= itinerary.length) {
    // Loop back to start — zoom out to globe view
    currentIndex = -1;
    isFlying = true;

    map.flyTo({
      center: [12.5, 41.9],
      zoom: 2.2,
      pitch: 40,
      duration: 3000,
      essential: true,
    });

    map.once('moveend', () => {
      isFlying = false;
      renderItineraryList(itinerary, currentIndex);
      placeCityMarkers(map, itinerary, currentIndex);
      renderRouteInfo(itinerary, currentIndex);
      renderWelcomeState();
      clearPOIMarkers();
    });
    return;
  }

  const destination = itinerary[currentIndex];
  isFlying = true;

  renderItineraryList(itinerary, currentIndex);
  renderRouteInfo(itinerary, currentIndex);
  renderLoadingState();

  // Fetch data while animating
  const dataPromise = loadCityData(destination);

  // Two-step animation: zoom out → zoom in
  if (currentIndex > 0) {
    // Step 1: pull back to context view
    map.flyTo({
      center: destination.coords,
      zoom: 4,
      pitch: 30,
      duration: 2000,
      essential: true,
    });

    await waitForMoveEnd();

    // Step 2: swoop into the city
    map.flyTo({
      center: destination.coords,
      zoom: 12,
      pitch: 60,
      duration: 2500,
      essential: true,
    });
  } else {
    // First city — single swoop
    map.flyTo({
      center: destination.coords,
      zoom: 12,
      pitch: 60,
      duration: 3500,
      essential: true,
    });
  }

  await waitForMoveEnd();
  isFlying = false;

  // Render data
  const { wikiData, pois } = await dataPromise;
  renderCityCard(destination.name, wikiData, pois);
  placeCityMarkers(map, itinerary, currentIndex);
  placePOIMarkers(map, pois);
});

// --- Load city data ---
async function loadCityData(city) {
  const [wikiData, pois] = await Promise.all([
    fetchCitySummary(city.name),
    fetchAllPOIs(city.coords[0], city.coords[1]),
  ]);
  return { wikiData, pois };
}

// --- Fly to a specific POI (called from UI) ---
function flyToPOI(lon, lat, name, address, cssClass) {
  map.flyTo({
    center: [lon, lat],
    zoom: 16,
    pitch: 60,
    duration: 1500,
    essential: true,
  });

  map.once('moveend', () => {
    showPOIPopup(map, {
      lon,
      lat,
      name: name.replace(/\\'/g, "'"),
      address: address.replace(/\\'/g, "'"),
      cssClass,
      icon: '',
    });
  });
}

// --- Utility: promisified moveend ---
function waitForMoveEnd() {
  return new Promise((resolve) => {
    map.once('moveend', resolve);
  });
}

// --- Sidebar toggle ---
document.getElementById('sidebar-toggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('collapsed');
  const btn = document.getElementById('sidebar-toggle');
  btn.textContent = document.getElementById('sidebar').classList.contains('collapsed') ? '◀' : '▶';
});

// --- Init ---
map.on('load', () => {
  renderWelcomeState();
  renderItineraryList(itinerary, currentIndex);
  renderRouteInfo(itinerary, currentIndex);
});