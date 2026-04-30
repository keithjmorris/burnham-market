/* ═══════════════════════════════════════════════
   BURNHAM MARKET GUIDE — app.js
   ═══════════════════════════════════════════════ */

// ── CONFIGURATION ──────────────────────────────
const CONFIG = {
  // Replace with your actual JSONBin details
  JSONBIN_BIN_ID:  '69f1c75236566621a8052119',
  JSONBIN_API_KEY: '$2a$10$tu1g4CPPDvkhNoGkNsMN..b8X1gYHLd7XTX4jYOiOfpELZJCYGzxi',

  // GitHub raw image base URL
  // e.g. 'https://raw.githubusercontent.com/YOUR_USERNAME/burnham-market-images/main/images/'
  IMAGE_BASE_URL: 'https://raw.githubusercontent.com/keithjmorris/burnham-market-images/main/images/',

  // Image file extension
  IMAGE_EXT: '.jpg',

  // Village centre coordinates (used to centre maps)
  MAP_CENTRE: [52.9455, 0.7245],
  MAP_ZOOM: 15,

  // ── FAIR DATE WINDOW ──
  // Set this each year to the first day of the fair
  FAIR_DATE: new Date('2026-07-01'),   // ← update annually
  FAIR_WINDOW_DAYS_BEFORE: 30,
  FAIR_WINDOW_DAYS_AFTER:  30,
};

// ── APP STATE ──────────────────────────────────
let allEntries  = [];    // all records from JSONBin
let currentTab  = 'shops';
let map         = null;  // Leaflet map instance

// ── DAYS OF WEEK ──────────────────────────────
const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const DAY_LABELS = { monday:'Mon', tuesday:'Tue', wednesday:'Wed', thursday:'Thu', friday:'Fri', saturday:'Sat', sunday:'Sun' };
const TODAY_KEY  = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

// ── INIT ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  checkFairTab();
  loadData();
  registerServiceWorker();
});

// ── FAIR TAB VISIBILITY ────────────────────────
function checkFairTab() {
  const now   = new Date();
  const fair  = CONFIG.FAIR_DATE;
  const from  = new Date(fair); from.setDate(from.getDate() - CONFIG.FAIR_WINDOW_DAYS_BEFORE);
  const until = new Date(fair); until.setDate(until.getDate() + CONFIG.FAIR_WINDOW_DAYS_AFTER);
  if (now >= from && now <= until) {
    document.getElementById('fair-tab').classList.remove('hidden');
  }
}

// ── DATA LOADING ───────────────────────────────
async function loadData() {
  showState('loading');
  try {
    const res = await fetch(
      `https://api.jsonbin.io/v3/b/${CONFIG.JSONBIN_BIN_ID}/latest`,
      
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    // JSONBin wraps data in { record: [...] }
    allEntries = Array.isArray(json.record) ? json.record : json.record.entries || [];
    renderTab(currentTab);
  } catch (err) {
    console.error('Failed to load data:', err);
    showState('error');
  }
}

// ── TAB SWITCHING ──────────────────────────────
function switchTab(tab) {
  currentTab = tab;

  // Update tab bar active state
  document.querySelectorAll('.tab-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  // Update header subtitle
  const subtitles = {
    shops:      'Shops',
    restaurant: 'Eat & Drink',
    facility:   'Facilities',
    parking:    'Parking',
    toilets:    'Public Toilets',
    fair:       'The Fair',
  };
  document.getElementById('header-subtitle').textContent = subtitles[tab] || 'Village Guide';

  // Destroy map if switching away from map tabs
  if (!['parking','toilets'].includes(tab) && map) {
    map.remove();
    map = null;
  }

  renderTab(tab);
}

// ── RENDER DISPATCHER ─────────────────────────
function renderTab(tab) {
  if (tab === 'parking' || tab === 'toilets') {
    renderMapTab(tab);
  } else {
    renderCardTab(tab);
  }
}

// ── CARD TABS ─────────────────────────────────
function renderCardTab(tab) {
  showState('cards');
  const list = document.getElementById('cards-list');
  list.innerHTML = '';

  const categoryMap = { shops: 'shop', restaurant: 'restaurant', facility: 'facility', fair: 'fair' };
const filtered = allEntries.filter(e => e.category === (categoryMap[tab] || tab));

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <p>No entries found.</p>
      </div>`;
    return;
  }

  filtered.forEach(entry => {
    list.appendChild(buildCard(entry));
  });
}

// ── BUILD A CARD ───────────────────────────────
function buildCard(entry) {
  const card = document.createElement('div');
  card.className = 'card';

  // ── Image
  const imageUrl = entry.image
    ? `${CONFIG.IMAGE_BASE_URL}${entry.image}${CONFIG.IMAGE_EXT}`
    : null;

  const imgHtml = imageUrl
  ? `<img class="card-image" src="${imageUrl}" alt="${entry.name}" loading="lazy" onerror="this.style.display='none'">`
  : placeholderSVG();

  // ── Tags
  const tags = (entry.tags || []).filter(Boolean);
  const tagsHtml = tags.map(t => `<span class="card-tag">${t}</span>`).join('');

  // ── Action buttons
  const hasPhone    = !!entry.phoneNumber;
  const hasWebsite  = !!entry.website;
  const hasLocation = !!(entry.latitude && entry.longitude);
  const hasHours    = DAYS.some(d => entry.openingHours?.[d]);

  card.innerHTML = `
    <div class="card-top">
      ${imgHtml}
      <div class="card-info">
        <p class="card-name">${entry.name || 'Unknown'}</p>
        <p class="card-description">${entry.description || ''}</p>
        ${tagsHtml ? `<div class="card-tags">${tagsHtml}</div>` : ''}
      </div>
    </div>
    <div class="card-actions">
      <button class="card-action-btn ${hasPhone ? '' : 'disabled'}"
        onclick="${hasPhone ? `callPhone('${entry.phoneNumber}')` : ''}" title="Call">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.5 12 19.79 19.79 0 0 1 1.15 3.18 2 2 0 0 1 3.13 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 5.47 5.47l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        Call
      </button>
      <button class="card-action-btn ${hasLocation ? '' : 'disabled'}"
        onclick="${hasLocation ? `openDirections(${entry.latitude},${entry.longitude},'${encodeURIComponent(entry.name)}')` : ''}" title="Directions">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
        Directions
      </button>
      <button class="card-action-btn ${hasWebsite ? '' : 'disabled'}"
        onclick="${hasWebsite ? `openWebsite('${entry.website}')` : ''}" title="Website">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        Website
      </button>
      <button class="card-action-btn ${hasHours ? '' : 'disabled'}"
        onclick="${hasHours ? `openHoursSheet('${entry.id}')` : ''}" title="Opening hours">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        Hours
      </button>
    </div>
  `;

  return card;
}

function placeholderSVG() {
  return `<div class="card-image-placeholder"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`;
}

// ── MAP TABS ───────────────────────────────────
function renderMapTab(tab) {
  showState('map');

  // Allow Leaflet to measure the container
  setTimeout(() => {
    if (!map) {
      map = L.map('map-container').setView(CONFIG.MAP_CENTRE, CONFIG.MAP_ZOOM);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);
    } else {
      map.setView(CONFIG.MAP_CENTRE, CONFIG.MAP_ZOOM);
      map.eachLayer(layer => { if (layer instanceof L.Marker) map.removeLayer(layer); });
    }

    const legend = document.getElementById('map-legend');
    legend.innerHTML = '';

    if (tab === 'parking') {
      addMapMarkers('parking', '#2C4A3E', '🅿');
      addLegendItem(legend, '#2C4A3E', 'Car Park');
    } else if (tab === 'toilets') {
      addMapMarkers('toilets', '#4A7C8E', '🚻');
      addLegendItem(legend, '#4A7C8E', 'Public Toilets');
    }

    map.invalidateSize();
  }, 50);
}

function addMapMarkers(category, colour, emoji) {
  const entries = allEntries.filter(e => e.category === category);
  entries.forEach(entry => {
    if (!entry.latitude || !entry.longitude) return;
    const icon = L.divIcon({
      html: `<div style="
        background:${colour};
        color:white;
        border-radius:50%;
        width:36px;height:36px;
        display:flex;align-items:center;justify-content:center;
        font-size:16px;
        border:2px solid white;
        box-shadow:0 2px 6px rgba(0,0,0,0.3);
      ">${emoji}</div>`,
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
    L.marker([entry.latitude, entry.longitude], { icon })
      .bindPopup(`<strong>${entry.name}</strong><br>${entry.description || ''}`)
      .addTo(map);
  });
}

function addLegendItem(container, colour, label) {
  const item = document.createElement('div');
  item.className = 'legend-item';
  item.innerHTML = `<span class="legend-dot" style="background:${colour}"></span><span>${label}</span>`;
  container.appendChild(item);
}

// ── OPENING HOURS SHEET ────────────────────────
function openHoursSheet(id) {
  const entry = allEntries.find(e => String(e.id) === String(id));
  if (!entry) return;

  document.getElementById('sheet-title').textContent = entry.name;
  document.getElementById('sheet-subtitle').textContent = entry.description || '';

  const grid = document.getElementById('hours-grid');
  grid.innerHTML = '';

  DAYS.forEach(day => {
    const hours = entry.openingHours?.[day];
    if (!hours) return;
    const row = document.createElement('div');
    row.className = `hours-row${day === TODAY_KEY ? ' today' : ''}`;
    row.innerHTML = `<div class="day">${DAY_LABELS[day]}</div><div class="time">${hours}</div>`;
    grid.appendChild(row);
  });

  const special = entry.openingHours?.special;
  const specialEl = document.getElementById('sheet-special');
  specialEl.textContent = special || '';
  specialEl.style.display = special ? 'block' : 'none';

  document.getElementById('sheet-backdrop').classList.remove('hidden');
  document.getElementById('bottom-sheet').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeSheet() {
  document.getElementById('sheet-backdrop').classList.add('hidden');
  document.getElementById('bottom-sheet').classList.add('hidden');
  document.body.style.overflow = '';
}

// ── ACTION HANDLERS ────────────────────────────
function callPhone(number) {
  window.location.href = `tel:${number.replace(/\s/g,'')}`;
}

function openDirections(lat, lng, name) {
  // Opens Apple Maps on iOS, Google Maps elsewhere
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const url = isIOS
    ? `maps://maps.apple.com/?daddr=${lat},${lng}&q=${name}`
    : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  window.open(url, '_blank');
}

function openWebsite(url) {
  window.open(url, '_blank', 'noopener');
}

// ── UI HELPERS ─────────────────────────────────
function showState(state) {
  document.getElementById('loading-state').classList.toggle('hidden', state !== 'loading');
  document.getElementById('error-state').classList.toggle('hidden', state !== 'error');
  document.getElementById('cards-list').classList.toggle('hidden', state !== 'cards');
  document.getElementById('map-view').classList.toggle('hidden', state !== 'map');
}

// ── SERVICE WORKER ─────────────────────────────
// function registerServiceWorker() {
//   if ('serviceWorker' in navigator) {
//     navigator.serviceWorker.register('service-worker.js')
//       .then(() => console.log('Service Worker registered'))
//       .catch(err => console.warn('Service Worker registration failed:', err));
//   }
//}