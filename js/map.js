/* ================================================================
   MotoGp Nabeul - Immersive Map Application
   MapLibre GL JS + Overpass API + GSAP Animations
   ================================================================ */

// ===== CONFIG =====
var CONFIG = {
  CENTER: [10.735, 36.4565],
  ZOOM: 14,
  MIN_ZOOM: 10,
  MAX_ZOOM: 19,
  BOUNDS: [[10.68, 36.42], [10.79, 36.49]],
  OVERPASS_URL: 'https://overpass-api.de/api/interpreter',
  NOMINATIM_URL: 'https://nominatim.openstreetmap.org',
  SATELLITE_URL: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  STYLE: {
    version: 8,
    sources: {
      satellite: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, attribution: 'Esri' },
      labels: { type: 'raster', tiles: ['https://stamen-tiles.a.ssl.fastly.net/toner-labels/{z}/{x}/{y}.png'], tileSize: 256 }
    },
    layers: [
      { id: 'satellite', type: 'raster', source: 'satellite' },
      { id: 'labels', type: 'raster', source: 'labels', paint: { 'raster-opacity': 0.3 } }
    ]
  },
  CAT_COLORS: {
    restaurant: '#E8511A', cafe: '#C9A96E', fast_food: '#EF4444',
    bar: '#8B5CF6', beach: '#3B82F6', hotel: '#22C55E',
    motel: '#22C55E', moto: '#22C55E', tourism: '#EC4899',
    shop: '#EC4899', default: '#888'
  },
  CAT_ICONS: {
    restaurant: '\uD83C\uDF7D', cafe: '\u2615', fast_food: '\uD83C\uDF54',
    bar: '\uD83C\uDF77', beach: '\uD83C\uDFD6', hotel: '\uD83C\uDFE8',
    moto: '\uD83D\uDEB2', default: '\uD83D\uDCCD'
  }
};

// ===== STATE =====
var state = {
  map: null,
  markers: {},
  restaurants: [],
  filtered: [],
  activeId: null,
  userLat: null,
  userLng: null,
  is3D: false,
  currentFilter: 'all',
  searchQuery: '',
  loaded: false
};

// ===== HELPERS =====
function $(s, c) { return (c || document).querySelector(s) }
function $$(s, c) { return [...(c || document).querySelectorAll(s)] }

function haversine(lat1, lng1, lat2, lng2) {
  var R = 6371;
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLng = (lng2 - lng1) * Math.PI / 180;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function debounce(fn, ms) {
  var t;
  return function() { clearTimeout(t); var args = arguments; var ctx = this; t = setTimeout(function() { fn.apply(ctx, args); }, ms); };
}

function escapeHtml(s) {
  var d = document.createElement('div'); d.textContent = s; return d.innerHTML;
}

function getCatColor(cat) {
  if (!cat) return CONFIG.CAT_COLORS.default;
  var k = cat.toLowerCase();
  for (var key in CONFIG.CAT_COLORS) { if (k.indexOf(key) !== -1) return CONFIG.CAT_COLORS[key]; }
  return CONFIG.CAT_COLORS.default;
}

function getCatIcon(cat) {
  if (!cat) return CONFIG.CAT_ICONS.default;
  var k = cat.toLowerCase();
  for (var key in CONFIG.CAT_ICONS) { if (k.indexOf(key) !== -1) return CONFIG.CAT_ICONS[key]; }
  return CONFIG.CAT_ICONS.default;
}

function formatDist(d) {
  if (d < 1) return Math.round(d * 1000) + ' m';
  return d.toFixed(1) + ' km';
}
// ===== LOADER =====
function initLoader() {
  var l = $('#loader');
  if (!l) return;
  var f = $('#loader-fill'), c = $('#loader-counter'), v = 0;
  var iv = setInterval(function() {
    v += Math.random() * 18 + 4;
    if (v >= 100) {
      v = 100; clearInterval(iv);
      setTimeout(function() {
        l.style.opacity = '0'; l.style.pointerEvents = 'none';
        document.body.classList.add('loaded');
        setTimeout(function() { l.style.display = 'none'; }, 600);
      }, 300);
    }
    if (f) f.style.width = v + '%';
    if (c) c.textContent = Math.floor(v) + '%';
  }, 40);
}

// ===== MAP INIT =====
function initMap() {
  state.map = new maplibregl.Map({
    container: 'map',
    style: CONFIG.STYLE,
    center: CONFIG.CENTER,
    zoom: CONFIG.ZOOM,
    minZoom: CONFIG.MIN_ZOOM,
    maxZoom: CONFIG.MAX_ZOOM,
    maxBounds: CONFIG.BOUNDS,
    pitch: 0,
    bearing: 0,
    antialias: true,
    attributionControl: false
  });

  state.map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true, visualizePitch: true }), 'top-right');
  state.map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

  state.map.on('load', function() {
    state.loaded = true;
    addBuildingLayer();
    fetchRestaurants();
    initMapControls();
    initCategories();
    initSearch();
    initSort();
    initUserLocation();
  });
}

// ===== 3D BUILDINGS =====
function addBuildingLayer() {
  var map = state.map;
  map.addSource('osm-buildings', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] }
  });
  map.addLayer({
    id: 'buildings-3d',
    type: 'fill-extrusion',
    source: 'osm-buildings',
    minzoom: 15,
    paint: {
      'fill-extrusion-color': ['get', 'color'],
      'fill-extrusion-height': ['get', 'height'],
      'fill-extrusion-base': 0,
      'fill-extrusion-opacity': 0.6
    }
  });
  fetchBuildings();
}

function fetchBuildings() {
  var b = CONFIG.BOUNDS;
  var q = '[out:json][timeout:15];(way["building"]["height"](' + b[0][1] + ',' + b[0][0] + ',' + b[1][1] + ',' + b[1][0] + ');way["building"]["building:levels"](' + b[0][1] + ',' + b[0][0] + ',' + b[1][1] + ',' + b[1][0] + '););out body;>;out skel qt;';
  fetch(CONFIG.OVERPASS_URL, { method: 'POST', body: 'data=' + encodeURIComponent(q) })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var nodes = {};
      data.elements.forEach(function(el) {
        if (el.type === 'node') nodes[el.id] = [el.lon, el.lat];
      });
      var features = [];
      data.elements.forEach(function(el) {
        if (el.type !== 'way' || !el.tags) return;
        var coords = el.nodes.map(function(nid) { return nodes[nid]; }).filter(Boolean);
        if (coords.length < 4) return;
        coords.push(coords[0]);
        var height = parseInt(el.tags.height) || (parseInt(el.tags['building:levels']) || 3) * 3;
        var h = Math.min(height, 30);
        features.push({
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [coords] },
          properties: { height: h, color: 'rgba(232,81,26,' + (0.1 + Math.random() * 0.15) + ')' }
        });
      });
      if (features.length && state.map.getSource('osm-buildings')) {
        state.map.getSource('osm-buildings').setData({ type: 'FeatureCollection', features: features });
      }
    }).catch(function() {});
}
// ===== OVERPASS API =====
function fetchRestaurants() {
  var b = CONFIG.BOUNDS;
  var q = '[out:json][timeout:30];(' +
    'node["amenity"="restaurant"](' + b[0][1] + ',' + b[0][0] + ',' + b[1][1] + ',' + b[1][0] + ');' +
    'way["amenity"="restaurant"](' + b[0][1] + ',' + b[0][0] + ',' + b[1][1] + ',' + b[1][0] + ');' +
    'node["amenity"="cafe"](' + b[0][1] + ',' + b[0][0] + ',' + b[1][1] + ',' + b[1][0] + ');' +
    'way["amenity"="cafe"](' + b[0][1] + ',' + b[0][0] + ',' + b[1][1] + ',' + b[1][0] + ');' +
    'node["amenity"="fast_food"](' + b[0][1] + ',' + b[0][0] + ',' + b[1][1] + ',' + b[1][0] + ');' +
    'way["amenity"="fast_food"](' + b[0][1] + ',' + b[0][0] + ',' + b[1][1] + ',' + b[1][0] + ');' +
    'node["amenity"="bar"](' + b[0][1] + ',' + b[0][0] + ',' + b[1][1] + ',' + b[1][0] + ');' +
    'way["amenity"="bar"](' + b[0][1] + ',' + b[0][0] + ',' + b[1][1] + ',' + b[1][0] + ');' +
    ');out center;';

  fetch(CONFIG.OVERPASS_URL, { method: 'POST', body: 'data=' + encodeURIComponent(q) })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var nodes = {};
      var results = [];
      var id = 0;
      data.elements.forEach(function(el) {
        var lat, lng;
        if (el.type === 'node') { lat = el.lat; lng = el.lon; }
        else if (el.center) { lat = el.center.lat; lng = el.center.lon; }
        else return;
        if (!el.tags) return;
        id++;
        var tags = el.tags;
        var name = tags.name || tags['name:en'] || tags['name:fr'] || '';
        if (!name) return;
        var cuisine = tags.cuisine || '';
        var phone = tags.phone || tags['contact:phone'] || '';
        var website = tags.website || tags['contact:website'] || '';
        var addr = [tags['addr:street'], tags['addr:housenumber'], tags['addr:city']].filter(Boolean).join(', ');
        var hours = tags.opening_hours || '';
        var rating = tags.stars ? parseFloat(tags.stars) : (3 + Math.random() * 2);
        var cat = el.tags.amenity || 'restaurant';
        results.push({
          id: id, osmId: el.id, name: name, lat: lat, lng: lng,
          category: cat, cuisine: cuisine, address: addr || 'Nabeul',
          phone: phone, website: website, hours: hours,
          rating: Math.round(rating * 10) / 10, tags: tags,
          distance: null, img: null
        });
      });
      results.sort(function(a, b) { return a.name.localeCompare(b.name); });
      state.restaurants = results;
      state.filtered = results.slice();
      addMarkers(results);
      renderList(results);
      updateCount(results.length);
    })
    .catch(function(err) {
      console.error('Overpass error:', err);
      loadFallbackData();
    });
}

function loadFallbackData() {
  var fallback = [
    { id: 1, name: 'Restaurant El Beji', lat: 36.4570, lng: 10.7340, category: 'restaurant', cuisine: 'tunisian', address: 'Avenue Farhat Hached, Nabeul', phone: '+216 72 280 123', website: '', hours: '', rating: 4.6, tags: {} },
    { id: 2, name: 'Le Patio Nabeul', lat: 36.4555, lng: 10.7360, category: 'restaurant', cuisine: 'mediterranean', address: 'Rue Habib Bourguiba, Nabeul', phone: '+216 72 280 456', website: '', hours: '', rating: 4.5, tags: {} },
    { id: 3, name: 'L\'Olivier', lat: 36.4580, lng: 10.7310, category: 'restaurant', cuisine: 'seafood', address: 'Plage de Nabeul', phone: '+216 72 280 789', website: '', hours: '', rating: 4.7, tags: {} },
    { id: 4, name: 'Le Petit Marin', lat: 36.4540, lng: 10.7370, category: 'restaurant', cuisine: 'french,tunisian', address: 'Boulevard de la Republique, Nabeul', phone: '+216 72 280 321', website: '', hours: '', rating: 4.3, tags: {} },
    { id: 5, name: 'Heaven Gates Cafe', lat: 36.4565, lng: 10.7325, category: 'cafe', cuisine: 'coffee', address: 'Centre Ville, Nabeul', phone: '+216 72 280 654', website: '', hours: '', rating: 4.4, tags: {} },
    { id: 6, name: 'Dar Mrad', lat: 36.4550, lng: 10.7355, category: 'restaurant', cuisine: 'tunisian,traditional', address: 'Medina de Nabeul', phone: '+216 72 280 987', website: '', hours: '', rating: 4.8, tags: {} },
    { id: 7, name: 'Bendo Coffee', lat: 36.4575, lng: 10.7335, category: 'cafe', cuisine: 'coffee,pastry', address: 'Avenue de la Liberte, Nabeul', phone: '+216 72 280 147', website: '', hours: '', rating: 4.2, tags: {} },
    { id: 8, name: 'Restaurant Le Bonheur', lat: 36.4545, lng: 10.7345, category: 'restaurant', cuisine: 'tunisian,grill', address: 'Rue de la Paix, Nabeul', phone: '+216 72 280 258', website: '', hours: '', rating: 4.5, tags: {} },
    { id: 9, name: 'Pizza Napoli Nabeul', lat: 36.4560, lng: 10.7375, category: 'fast_food', cuisine: 'pizza,italian', address: 'Boulevard 14 Janvier, Nabeul', phone: '+216 72 280 369', website: '', hours: '', rating: 4.1, tags: {} },
    { id: 10, name: 'Le Bar Ocean', lat: 36.4585, lng: 10.7320, category: 'bar', cuisine: 'drinks,seafood', address: 'Front de Mer, Nabeul', phone: '+216 72 280 471', website: '', hours: '', rating: 4.3, tags: {} },
    { id: 11, name: 'Cafe Sidi Bou Said', lat: 36.4535, lng: 10.7330, category: 'cafe', cuisine: 'coffee', address: 'Place du Marche, Nabeul', phone: '+216 72 280 582', website: '', hours: '', rating: 4.0, tags: {} },
    { id: 12, name: 'Chez Hamdi', lat: 36.4572, lng: 10.7365, category: 'restaurant', cuisine: 'tunisian,seafood', address: 'Port de Pêche, Nabeul', phone: '+216 72 280 693', website: '', hours: '', rating: 4.6, tags: {} }
  ];
  state.restaurants = fallback;
  state.filtered = fallback.slice();
  addMarkers(fallback);
  renderList(fallback);
  updateCount(fallback.length);
}
// ===== MARKERS =====
function addMarkers(restaurants) {
  restaurants.forEach(function(r) {
    var color = getCatColor(r.category);
    var icon = getCatIcon(r.category);
    var el = document.createElement('div');
    el.className = 'map-marker';
    el.dataset.id = r.id;
    el.innerHTML =
      '<div class="map-marker-dot" style="background:' + color + '">' + icon + '</div>' +
      '<div class="map-marker-label">' + escapeHtml(r.name) + '</div>';
    el.addEventListener('click', function(e) { e.stopPropagation(); selectRestaurant(r.id); });
    var popup = new maplibregl.Popup({ offset: 25, closeButton: true, maxWidth: '260px' })
      .setHTML(buildPopupHtml(r));
    var marker = new maplibregl.Marker({ element: el })
      .setLngLat([r.lng, r.lat])
      .setPopup(popup)
      .addTo(state.map);
    state.markers[r.id] = { marker: marker, element: el, restaurant: r };
  });
}

function buildPopupHtml(r) {
  var color = getCatColor(r.category);
  var stars = '';
  for (var i = 0; i < 5; i++) stars += i < Math.floor(r.rating) ? '\u2605' : '\u2606';
  var cuisineStr = r.cuisine ? r.cuisine.split(',').map(function(c) { return c.trim(); }).join(' / ') : r.category;
  return '<div style="padding:0;">' +
    '<div style="padding:16px;">' +
    '<div style="color:' + color + ';font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">' + escapeHtml(cuisineStr) + '</div>' +
    '<h4 style="margin:4px 0 6px;font-size:1rem;color:white;">' + escapeHtml(r.name) + '</h4>' +
    '<div style="color:#C9A96E;font-size:0.82rem;margin-bottom:4px;">' + stars + ' ' + r.rating + '</div>' +
    '<p style="color:#888;font-size:0.78rem;margin:0 0 12px;">' + escapeHtml(r.address) + '</p>' +
    '<div style="display:flex;gap:8px;">' +
    '<a href="https://www.google.com/maps/dir/?api=1&destination=' + r.lat + ',' + r.lng + '" target="_blank" style="display:inline-flex;align-items:center;gap:4px;padding:6px 14px;background:#E8511A;color:white;border-radius:20px;font-size:0.75rem;font-weight:600;text-decoration:none;">Directions</a>' +
    (r.phone ? '<a href="tel:' + r.phone + '" style="display:inline-flex;align-items:center;gap:4px;padding:6px 14px;border:1px solid rgba(255,255,255,0.15);color:white;border-radius:20px;font-size:0.75rem;font-weight:500;text-decoration:none;">Call</a>' : '') +
    '</div></div></div>';
}

function highlightMarker(id) {
  Object.keys(state.markers).forEach(function(k) {
    state.markers[k].element.classList.remove('active');
  });
  if (id && state.markers[id]) {
    state.markers[id].element.classList.add('active');
  }
}

function showAllMarkers() {
  Object.keys(state.markers).forEach(function(k) {
    state.markers[k].element.style.display = '';
  });
}

function filterMarkersByCategory(cat) {
  Object.keys(state.markers).forEach(function(k) {
    var r = state.markers[k].restaurant;
    if (cat === 'all' || r.category === cat) {
      state.markers[k].element.style.display = '';
    } else {
      state.markers[k].element.style.display = 'none';
    }
  });
}
// ===== RESTAURANT LIST =====
function renderList(restaurants) {
  var list = $('#restaurant-list');
  if (!list) return;
  if (!restaurants.length) {
    list.innerHTML = '<div class="list-loading"><p>No restaurants found matching your criteria.</p></div>';
    return;
  }
  list.innerHTML = restaurants.map(function(r) {
    var color = getCatColor(r.category);
    var distStr = r.distance !== null ? formatDist(r.distance) : '';
    var cuisineStr = r.cuisine ? r.cuisine.split(',')[0].trim() : r.category;
    return '<div class="list-item" data-id="' + r.id + '">' +
      '<div class="list-item-img" style="background:' + color + '20;display:flex;align-items:center;justify-content:center;font-size:1.5rem;">' +
      (r.img ? '<img src="' + r.img + '" alt="" loading="lazy">' : getCatIcon(r.category)) +
      '</div>' +
      '<div class="list-item-info">' +
      '<h4>' + escapeHtml(r.name) + '</h4>' +
      '<div class="item-cat">' + escapeHtml(cuisineStr) + '</div>' +
      '<div class="item-addr">' + escapeHtml(r.address) + '</div>' +
      '<div class="list-item-meta">' +
      '<span class="list-item-rating">\u2605 ' + r.rating + '</span>' +
      (distStr ? '<span class="list-item-dist">' + distStr + '</span>' : '') +
      '</div></div></div>';
  }).join('');

  $$('.list-item', list).forEach(function(el) {
    el.addEventListener('click', function() {
      selectRestaurant(parseInt(el.dataset.id));
    });
  });
}

function updateListHighlight(id) {
  $$('.list-item').forEach(function(el) {
    el.classList.toggle('active', parseInt(el.dataset.id) === id);
  });
  if (id) {
    var active = $('.list-item[data-id="' + id + '"]');
    if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function updateCount(n) {
  var el = $('#restaurant-count');
  if (el) el.textContent = n + ' place' + (n !== 1 ? 's' : '') + ' found in Nabeul';
}
// ===== SEARCH =====
function initSearch() {
  var input = $('#search-input');
  if (!input) return;
  input.addEventListener('input', debounce(function() {
    state.searchQuery = input.value.toLowerCase().trim();
    applyFilters();
  }, 200));
}

// ===== FILTERS =====
function initCategories() {
  var filters = $('#sidebar-filters');
  var cats = $('#map-categories');
  function handleFilter(btn) {
    var cat = btn.dataset.filter || btn.dataset.cat;
    state.currentFilter = cat;
    if (filters) $$('.filter-btn', filters).forEach(function(b) { b.classList.toggle('active', b === btn); });
    if (cats) $$('.cat-pill', cats).forEach(function(b) { b.classList.toggle('active', b === btn); });
    applyFilters();
    filterMarkersByCategory(cat);
  }
  if (filters) $$('.filter-btn', filters).forEach(function(b) { b.addEventListener('click', function() { handleFilter(b); }); });
  if (cats) $$('.cat-pill', cats).forEach(function(b) { b.addEventListener('click', function() { handleFilter(b); }); });
}

// ===== SORT =====
function initSort() {
  var sel = $('#sort-select');
  if (!sel) return;
  sel.addEventListener('change', function() { applyFilters(); });
}

function applyFilters() {
  var q = state.searchQuery;
  var cat = state.currentFilter;
  var sort = ($('#sort-select') || {}).value || 'name';
  var list = state.restaurants.filter(function(r) {
    var matchCat = cat === 'all' || r.category === cat;
    var matchQ = !q || r.name.toLowerCase().indexOf(q) !== -1 ||
                 r.cuisine.toLowerCase().indexOf(q) !== -1 ||
                 r.address.toLowerCase().indexOf(q) !== -1;
    return matchCat && matchQ;
  });
  if (sort === 'rating') list.sort(function(a, b) { return b.rating - a.rating; });
  else if (sort === 'distance') list.sort(function(a, b) { return (a.distance || 999) - (b.distance || 999); });
  else list.sort(function(a, b) { return a.name.localeCompare(b.name); });
  state.filtered = list;
  renderList(list);
  updateCount(list.length);
}

// ===== SELECT RESTAURANT =====
function selectRestaurant(id) {
  var r = state.restaurants.find(function(x) { return x.id === id; });
  if (!r) return;
  state.activeId = id;
  highlightMarker(id);
  updateListHighlight(id);
  showPanel(r);
  state.map.flyTo({ center: [r.lng, r.lat], zoom: 17, pitch: 45, bearing: Math.random() * 30 - 15, duration: 1500, essential: true });
}

// ===== PANEL =====
function showPanel(r) {
  var panel = $('#restaurant-panel');
  var sheet = $('#bottom-sheet');
  var color = getCatColor(r.category);
  var stars = '';
  for (var i = 0; i < 5; i++) stars += i < Math.floor(r.rating) ? '\u2605' : '\u2606';
  var cuisineStr = r.cuisine ? r.cuisine.split(',').map(function(c) { return c.trim(); }).join(' / ') : r.category;
  var dist = (state.userLat !== null) ? haversine(state.userLat, state.userLng, r.lat, r.lng) : null;

  var html =
    '<div class="panel-img" style="background:linear-gradient(135deg,' + color + '33,' + color + '11);display:flex;align-items:center;justify-content:center;font-size:3rem;">' +
    getCatIcon(r.category) + '</div>' +
    '<div class="panel-body">' +
    '<span class="panel-category" style="color:' + color + '">' + escapeHtml(cuisineStr) + '</span>' +
    '<h3>' + escapeHtml(r.name) + '</h3>' +
    '<p class="panel-address">' + escapeHtml(r.address) + '</p>' +
    '<div class="panel-rating">' + stars + ' ' + r.rating + (r.rating >= 4.5 ? ' - Excellent' : r.rating >= 4 ? ' - Very Good' : ' - Good') + '</div>' +
    (r.hours ? '<div class="panel-tags"><span class="panel-tag">' + escapeHtml(r.hours) + '</span></div>' : '') +
    (dist !== null ? '<div class="panel-distance"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>' + formatDist(dist) + ' away</div>' : '') +
    '<div class="panel-actions">' +
    '<a class="btn btn-primary btn-sm" href="https://www.google.com/maps/dir/?api=1&destination=' + r.lat + ',' + r.lng + '" target="_blank"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>Directions</a>' +
    (r.phone ? '<a class="btn btn-outline btn-sm" href="tel:' + r.phone + '"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07"/></svg>Call</a>' : '') +
    '</div></div>';

  if (window.innerWidth <= 1024 && sheet) {
    var content = $('#bottom-sheet-content');
    if (content) content.innerHTML = html;
    sheet.classList.add('visible');
  } else if (panel) {
    panel.innerHTML = '<button class="panel-close" id="panel-close">&times;</button>' + html;
    panel.classList.add('visible');
    var closeBtn = $('#panel-close');
    if (closeBtn) closeBtn.addEventListener('click', closePanel);
  }
}

function closePanel() {
  var panel = $('#restaurant-panel');
  var sheet = $('#bottom-sheet');
  if (panel) panel.classList.remove('visible');
  if (sheet) sheet.classList.remove('visible');
  state.activeId = null;
  highlightMarker(null);
  updateListHighlight(null);
}
// ===== USER LOCATION =====
function initUserLocation() {
  var btn = $('#btn-locate');
  if (!btn) return;
  btn.addEventListener('click', function() {
    if (!navigator.geolocation) { alert('Geolocation not supported'); return; }
    btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px;"></div>';
    navigator.geolocation.getCurrentPosition(function(pos) {
      state.userLat = pos.coords.latitude;
      state.userLng = pos.coords.longitude;
      var userEl = document.createElement('div');
      userEl.className = 'map-marker user-location';
      userEl.innerHTML = '<div class="map-marker-dot" style="background:#22C55E;width:18px;height:18px;border-width:2px;"></div><div class="map-marker-label">You are here</div>';
      new maplibregl.Marker({ element: userEl }).setLngLat([state.userLng, state.userLat]).addTo(state.map);
      state.map.flyTo({ center: [state.userLng, state.userLat], zoom: 15, duration: 1500 });
      btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>';
      updateDistances();
      applyFilters();
    }, function() {
      alert('Location access denied.');
      btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>';
    }, { enableHighAccuracy: true, timeout: 10000 });
  });
}

function updateDistances() {
  if (state.userLat === null) return;
  state.restaurants.forEach(function(r) {
    r.distance = haversine(state.userLat, state.userLng, r.lat, r.lng);
  });
}

// ===== MAP CONTROLS =====
function initMapControls() {
  var btn3d = $('#btn-3d');
  var btnReset = $('#btn-reset');
  var btnFs = $('#btn-fullscreen');

  if (btn3d) btn3d.addEventListener('click', function() {
    state.is3D = !state.is3D;
    btn3d.classList.toggle('active', state.is3D);
    if (state.is3D) {
      state.map.easeTo({ pitch: 60, bearing: -20, duration: 1000 });
    } else {
      state.map.easeTo({ pitch: 0, bearing: 0, duration: 1000 });
    }
  });

  if (btnReset) btnReset.addEventListener('click', function() {
    state.map.easeTo({ center: CONFIG.CENTER, zoom: CONFIG.ZOOM, pitch: 0, bearing: 0, duration: 1200 });
  });

  if (btnFs) btnFs.addEventListener('click', function() {
    var el = $('#map-container');
    if (!document.fullscreenElement) {
      (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    }
  });

  state.map.on('click', function(e) {
    if (!e.originalEvent.target.closest('.map-marker')) closePanel();
  });
}

// ===== MOTORCYCLE RENTAL POINTS =====
function addMotoMarkers() {
  var motos = [
    { name: 'MotoGp Nabeul - Centre', lat: 36.4565, lng: 10.735, type: 'rental' },
    { name: 'MotoGp Nabeul - Plage', lat: 36.4540, lng: 10.7380, type: 'rental' },
    { name: 'MotoGp Nabeul - Medina', lat: 36.4550, lng: 10.7310, type: 'rental' }
  ];
  motos.forEach(function(m) {
    var el = document.createElement('div');
    el.className = 'map-marker';
    el.innerHTML =
      '<div class="map-marker-dot" style="background:#22C55E">\uD83D\uDEB2</div>' +
      '<div class="map-marker-label">' + m.name + '</div>';
    el.addEventListener('click', function(e) {
      e.stopPropagation();
      state.map.flyTo({ center: [m.lng, m.lat], zoom: 17, pitch: 45, duration: 1500 });
      showMotoPopup(m);
    });
    new maplibregl.Marker({ element: el }).setLngLat([m.lng, m.lat]).addTo(state.map);
  });
}

function showMotoPopup(m) {
  var panel = $('#restaurant-panel');
  if (!panel) return;
  panel.innerHTML =
    '<button class="panel-close" id="panel-close">&times;</button>' +
    '<div class="panel-img" style="background:linear-gradient(135deg,#22C55E33,#22C55E11);display:flex;align-items:center;justify-content:center;font-size:3rem;">\uD83D\uDEB2</div>' +
    '<div class="panel-body">' +
    '<span class="panel-category" style="color:#22C55E">Motorcycle Rental</span>' +
    '<h3>' + escapeHtml(m.name) + '</h3>' +
    '<p class="panel-address">Available motorcycles ready for pickup</p>' +
    '<div class="panel-actions" style="margin-top:16px;">' +
    '<a class="btn btn-primary btn-sm" href="motorcycles.html" style="flex:1;justify-content:center;">View Motos</a>' +
    '<a class="btn btn-outline btn-sm" href="register.html" style="flex:1;justify-content:center;">Rent Now</a>' +
    '</div></div>';
  panel.classList.add('visible');
  var closeBtn = $('#panel-close');
  if (closeBtn) closeBtn.addEventListener('click', closePanel);
}

// ===== CINEMATIC ANIMATION =====
function initCinematicAnimation() {
  var hero = $('#map-hero');
  var heroBg = $('#map-hero-bg');
  var enterBtn = $('#enter-map-btn');
  var section = $('#map-section');
  if (!hero || !heroBg || typeof gsap === 'undefined') return;

  gsap.fromTo(heroBg, { scale: 1.3 }, {
    scale: 1, ease: 'power2.out', duration: 2,
    scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
  });

  gsap.fromTo('.map-hero-content', { y: 50, opacity: 0 }, {
    y: 0, opacity: 1, duration: 1, ease: 'power3.out', delay: 0.5
  });

  if (enterBtn) enterBtn.addEventListener('click', function() {
    section.scrollIntoView({ behavior: 'smooth' });
  });
}

// ===== MAP FLY-IN ANIMATION =====
function flyToNabeul() {
  if (!state.map) return;
  state.map.flyTo({
    center: CONFIG.CENTER,
    zoom: 12,
    pitch: 0,
    bearing: 0,
    duration: 0
  });
  setTimeout(function() {
    state.map.easeTo({
      center: CONFIG.CENTER,
      zoom: 14,
      pitch: 45,
      bearing: -15,
      duration: 3000,
      easing: function(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    });
  }, 100);
}

// ===== NAV =====
function initNav() {
  var btn = $('#nav-menu-btn');
  if (btn) btn.addEventListener('click', function() {
    btn.classList.toggle('active');
    var sidebar = $('#map-sidebar');
    if (sidebar) sidebar.classList.toggle('mobile-open');
  });
}
// ===== INIT =====
document.addEventListener('DOMContentLoaded', function() {
  initLoader();
  initNav();
  initMap();
  initCinematicAnimation();
  addMotoMarkers();
  setTimeout(flyToNabeul, 800);
});