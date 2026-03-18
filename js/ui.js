/* =============================================
   UI LAYER — Sidebar, city cards, POI markers
   ============================================= */

// ---- State for UI ----
let activeTab = 'food';
let activePOIs = {};        // { food: [...], landmarks: [...], ... }
let poiMarkers = [];        // Mapbox marker instances on the map
let cityMarkers = [];       // City dot markers

// ---- Sidebar Itinerary List ----
function renderItineraryList(itinerary, currentIndex) {
  const list = document.getElementById('itinerary-list');
  const btn = document.getElementById('fly-btn');

  if (itinerary.length === 0) {
    list.innerHTML = '<div class="itinerary-empty">Add cities using the search above</div>';
    btn.disabled = true;
    btn.textContent = 'Fly to Next Stop →';
    return;
  }

  list.innerHTML = itinerary
    .map((city, i) => {
      let cls = 'itinerary-item';
      if (i === currentIndex) cls += ' active';
      else if (i < currentIndex) cls += ' visited';

      return `
      <div class="${cls}" style="animation-delay: ${i * 60}ms">
        <div class="itinerary-number">${i + 1}</div>
        <div class="itinerary-name" title="${city.description}">${city.name}</div>
        <button class="itinerary-remove" onclick="removeCity(${i})" title="Remove">✕</button>
      </div>`;
    })
    .join('');

  btn.disabled = itinerary.length === 0;

  if (currentIndex < 0) {
    btn.textContent = 'Start Trip →';
  } else if (currentIndex >= itinerary.length - 1) {
    btn.textContent = 'Back to Start ↺';
  } else {
    const next = itinerary[currentIndex + 1];
    btn.textContent = `Fly to ${next.name} →`;
  }
}

// ---- City Info Card ----
function renderCityCard(cityName, wikiData, pois, fromCity) {
  const container = document.getElementById('city-info');
  activePOIs = pois || {};
  activeTab = 'food';

  const thumbnail = wikiData && wikiData.thumbnail
    ? `<img src="${wikiData.thumbnail}" alt="${cityName}" />`
    : `<div style="width:100%;height:100%;background:linear-gradient(135deg,#1e293b,#0f172a);display:flex;align-items:center;justify-content:center;font-size:48px;">🌍</div>`;

  const summary = wikiData && wikiData.extract
    ? wikiData.extract
    : 'Exploring this destination...';

  const description = wikiData && wikiData.description
    ? wikiData.description
    : '';

  const transportHTML = fromCity
    ? renderTransportPanel(fromCity.name, cityName)
    : '';

  container.innerHTML = `
    <div class="city-card">
      ${transportHTML}
      <div class="city-card-header">
        ${thumbnail}
        <div class="city-card-overlay"></div>
        <div class="city-card-title">
          <span>${description}</span>
          <h2>${cityName}</h2>
        </div>
      </div>
      <div class="city-card-summary">${summary}</div>
      <div class="tabs" id="poi-tabs">
        ${renderTabs()}
      </div>
      <div class="poi-content" id="poi-content">
        ${renderPOIList(activeTab)}
      </div>
    </div>
  `;

  // Bind tab clicks
  document.querySelectorAll('#poi-tabs .tab').forEach((tabEl) => {
    tabEl.addEventListener('click', () => {
      activeTab = tabEl.dataset.tab;
      document.querySelectorAll('#poi-tabs .tab').forEach((t) => t.classList.remove('active'));
      tabEl.classList.add('active');
      document.getElementById('poi-content').innerHTML = renderPOIList(activeTab);
    });
  });
}

// ---- Transport Search Panel ----
function renderTransportPanel(fromName, toName) {
  const from = encodeURIComponent(fromName);
  const to   = encodeURIComponent(toName);

  // Google Flights deep-link (date defaults to today + 7 days)
  const flightsUrl = `https://www.google.com/travel/flights?q=Flights+from+${from}+to+${to}`;

  // Omio covers trains, buses, and flights across Europe & beyond
  const omioUrl = `https://www.omio.com/search?origin=${from}&destination=${to}&type=train`;

  // Rome2Rio gives multimodal options (flights, trains, ferries, drive)
  const rome2rioUrl = `https://www.rome2rio.com/s/${from}/${to}`;

  // Google Maps driving directions as fallback
  const mapsUrl = `https://www.google.com/maps/dir/${from}/${to}`;

  return `
    <div class="transport-panel">
      <div class="transport-header">
        <span class="transport-route-label">✈ ${fromName} → ${toName}</span>
        <span class="transport-panel-title">Search Travel Options</span>
      </div>
      <div class="transport-links">
        <a class="transport-link" href="${flightsUrl}" target="_blank" rel="noopener">
          <span class="transport-link-icon">✈️</span>
          <div class="transport-link-info">
            <div class="transport-link-name">Google Flights</div>
            <div class="transport-link-desc">Live prices &amp; schedules</div>
          </div>
          <span class="transport-link-arrow">→</span>
        </a>
        <a class="transport-link" href="${omioUrl}" target="_blank" rel="noopener">
          <span class="transport-link-icon">🚆</span>
          <div class="transport-link-info">
            <div class="transport-link-name">Omio</div>
            <div class="transport-link-desc">Trains, buses &amp; flights</div>
          </div>
          <span class="transport-link-arrow">→</span>
        </a>
        <a class="transport-link" href="${rome2rioUrl}" target="_blank" rel="noopener">
          <span class="transport-link-icon">🗺️</span>
          <div class="transport-link-info">
            <div class="transport-link-name">Rome2Rio</div>
            <div class="transport-link-desc">All routes compared</div>
          </div>
          <span class="transport-link-arrow">→</span>
        </a>
        <a class="transport-link" href="${mapsUrl}" target="_blank" rel="noopener">
          <span class="transport-link-icon">🚗</span>
          <div class="transport-link-info">
            <div class="transport-link-name">Google Maps</div>
            <div class="transport-link-desc">Driving directions</div>
          </div>
          <span class="transport-link-arrow">→</span>
        </a>
      </div>
    </div>`;
}

function renderTabs() {
  const tabs = [
    { key: 'food', icon: '🍽️', label: 'Food' },
    { key: 'landmarks', icon: '🏛️', label: 'Sights' },
    { key: 'activities', icon: '🎭', label: 'Fun' },
  ];

  return tabs
    .map(
      (t) => `
    <button class="tab ${t.key === activeTab ? 'active' : ''}" data-tab="${t.key}">
      <span class="tab-icon">${t.icon}</span>
      ${t.label}
    </button>`
    )
    .join('');
}

function renderPOIList(categoryKey) {
  const items = activePOIs[categoryKey] || [];

  if (items.length === 0) {
    const cat = POI_CATEGORIES[categoryKey];
    const noKeyMsg = !GEOAPIFY_KEY
      ? '<br><span style="font-size:11px;color:var(--text-muted);">Add a Geoapify API key in data.js to enable POI data.</span>'
      : '';
    return `
      <div class="poi-empty">
        <div class="poi-empty-icon">${cat ? cat.icon : '📍'}</div>
        No ${cat ? cat.label.toLowerCase() : 'places'} found nearby${noKeyMsg}
      </div>`;
  }

  return `
    <div class="poi-grid">
      ${items
        .map(
          (poi) => `
        <div class="poi-card" onclick="flyToPOI(${poi.lon}, ${poi.lat}, '${escapeHtml(poi.name)}', '${escapeHtml(poi.address)}', '${poi.cssClass}')">
          <div class="poi-icon ${poi.cssClass}">${poi.icon}</div>
          <div class="poi-details">
            <div class="poi-name">${poi.name}</div>
            <div class="poi-address">${poi.address}</div>
          </div>
        </div>`
        )
        .join('')}
    </div>`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/'/g, "\\'")
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ---- Welcome State ----
function renderWelcomeState() {
  const container = document.getElementById('city-info');
  container.innerHTML = `
    <div class="welcome-state">
      <div class="welcome-icon">🌎</div>
      <h3>Plan Your Journey</h3>
      <p>Search for cities above and add them to your itinerary. Click "Fly to Next Stop" to explore each destination on the globe.</p>
    </div>
  `;
}

// ---- Loading State ----
function renderLoadingState() {
  const container = document.getElementById('city-info');
  container.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <div class="loading-text">Loading city info...</div>
    </div>
  `;
}

// ---- POI Markers on Map ----
function placePOIMarkers(map, pois) {
  clearPOIMarkers();

  Object.values(pois).forEach((poiList) => {
    poiList.forEach((poi) => {
      if (!poi.lon || !poi.lat) return;

      const el = document.createElement('div');
      el.className = `custom-marker ${poi.cssClass}`;
      el.innerHTML = `<span>${poi.icon}</span>`;

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([poi.lon, poi.lat])
        .addTo(map);

      el.addEventListener('click', () => {
        showPOIPopup(map, poi);
      });

      poiMarkers.push(marker);
    });
  });
}

function clearPOIMarkers() {
  poiMarkers.forEach((m) => m.remove());
  poiMarkers = [];
}

// ---- City Markers on Map ----
function placeCityMarkers(map, itinerary, currentIndex) {
  clearCityMarkers();

  itinerary.forEach((city, i) => {
    const el = document.createElement('div');
    el.className = 'city-marker';
    if (i === currentIndex) el.classList.add('active');

    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat(city.coords)
      .addTo(map);

    cityMarkers.push(marker);
  });
}

function clearCityMarkers() {
  cityMarkers.forEach((m) => m.remove());
  cityMarkers = [];
}

// ---- POI Popup ----
function showPOIPopup(map, poi) {
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${poi.lat},${poi.lon}`;

  const html = `
    <div class="popup-category">${poi.cssClass}</div>
    <div class="popup-title">${poi.name}</div>
    <div class="popup-address">${poi.address}</div>
    <a class="popup-directions" href="${directionsUrl}" target="_blank" rel="noopener">
      📍 Get Directions
    </a>
  `;

  new mapboxgl.Popup({ offset: 25 })
    .setLngLat([poi.lon, poi.lat])
    .setHTML(html)
    .addTo(map);
}

// ---- Route Line ----
function updateRouteLine(map, itinerary) {
  if (!map.isStyleLoaded()) {
    map.once('style.load', () => updateRouteLine(map, itinerary));
    return;
  }

  const sourceId = 'route-line';

  // Build a line of great-circle interpolated points
  const coords = itinerary.map((c) => c.coords);

  if (map.getSource(sourceId)) {
    map.getSource(sourceId).setData({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: coords },
    });
  } else {
    map.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: coords },
      },
    });

    map.addLayer({
      id: 'route-line-layer',
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': '#6366f1',
        'line-width': 3,
        'line-opacity': 0.7,
        'line-dasharray': [2, 2],
      },
    });
  }
}

function clearRouteLine(map) {
  if (map.getLayer('route-line-layer')) map.removeLayer('route-line-layer');
  if (map.getSource('route-line')) map.removeSource('route-line');
}

// ---- Route Info Bar ----
function renderRouteInfo(itinerary, currentIndex) {
  const el = document.getElementById('route-info');
  if (itinerary.length < 2) {
    el.style.display = 'none';
    return;
  }
  el.style.display = 'flex';
  const visited = Math.max(0, currentIndex + 1);
  el.innerHTML = `
    <div class="route-stat">
      <div class="route-stat-value">${itinerary.length}</div>
      <div class="route-stat-label">Stops</div>
    </div>
    <div class="route-stat">
      <div class="route-stat-value">${visited}</div>
      <div class="route-stat-label">Visited</div>
    </div>
    <div class="route-stat">
      <div class="route-stat-value">${itinerary.length - visited}</div>
      <div class="route-stat-label">Remaining</div>
    </div>
  `;
}
