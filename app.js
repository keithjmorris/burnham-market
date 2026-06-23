/* ═══════════════════════════════════════════════
   BURNHAM MARKET GUIDE — app.js
   ═══════════════════════════════════════════════ */

// ── CONFIGURATION ──────────────────────────────
const CONFIG = {
  // GitHub raw image base URL
  IMAGE_BASE_URL: 'https://raw.githubusercontent.com/keithjmorris/burnham-market-images/main/images/',
  IMAGE_EXT: '.jpg',

  // Village centre coordinates (used to centre maps)
  MAP_CENTRE: [52.9455, 0.7245],
  MAP_ZOOM: 15,

  // ── FAIR DATE WINDOW ──
  FAIR_DATE: new Date('2026-07-01'),
  FAIR_WINDOW_DAYS_BEFORE: 30,
  FAIR_WINDOW_DAYS_AFTER:  30,

  // ── FLOWER SHOW ──
  FLOWERSHOW_START: new Date('2026-06-15'),
  FLOWERSHOW_END:   new Date('2026-07-14'),
  FLOWERSHOW_IMAGES: [
  'flowershow1',
  'flowershow2',
  'flowershow21',
  'flowershow3',
  'flowershow4',
  'flowershow5',
  'flowershow6',
  'flowershow7',
  'flowershow8',
  'flowershow9',
  'flowershow10',
  'flowershow11',
  'flowershow12',
  'flowershow13',
  'flowershow14',
  'flowershow15',
],
  FLOWERSHOW_IMAGE_BASE: 'https://raw.githubusercontent.com/keithjmorris/burnham-market-images/main/images/flowershow/',
  FLOWERSHOW_IMAGE_EXT: '.jpeg',

  // ── SEASONAL TAB CONTROL ──
  SHOW_SEASONAL_TAB: true,
  SEASONAL_MODE: 'flowershow',
};

// ── FIREBASE SETUP (Flower Show entries) ──
const firebaseConfig = {
  apiKey: "AIzaSyAmMoJa-5U6Kzkj3ClL8jYB7Y3pL8ysC04",
  authDomain: "burnhammarketcraftfair.firebaseapp.com",
  databaseURL: "https://burnhammarketcraftfair-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "burnhammarketcraftfair",
  storageBucket: "burnhammarketcraftfair.firebasestorage.app",
  messagingSenderId: "388230915965",
  appId: "1:388230915965:web:93c83d174322c2aab28e14"
};
firebase.initializeApp(firebaseConfig);
const flowerShowDb = firebase.database();

const EVENT_LOCATIONS = [
  { name: 'Village Green',        lat: 52.9451813, lng: 0.7234069 },
  { name: 'Playing Field',        lat: 52.9444178, lng: 0.729474  },
  { name: 'Tennis Club',          lat: 52.9447369, lng: 0.7282327 },
  { name: 'St. Mary\'s Church',   lat: 52.9450112, lng: 0.7225797 },
  { name: 'All Saints Church',    lat: 52.9460791, lng: 0.7303801 },
  { name: 'St. Margaret\'s Church', lat: 52.9506806, lng: 0.7303011 },
  { name: 'Village Hall',         lat: 52.9413887, lng: 0.7318252 },
  { name: 'Other',                lat: null,        lng: null      },
];

// ── WEATHER ────────────────────────────────────
const WMO_CODES = {
  0:  { label: 'Clear sky',        icon: '☀️' },
  1:  { label: 'Mainly clear',     icon: '🌤️' },
  2:  { label: 'Partly cloudy',    icon: '⛅' },
  3:  { label: 'Overcast',         icon: '☁️' },
  45: { label: 'Foggy',            icon: '🌫️' },
  48: { label: 'Icy fog',          icon: '🌫️' },
  51: { label: 'Light drizzle',    icon: '🌦️' },
  53: { label: 'Drizzle',          icon: '🌦️' },
  55: { label: 'Heavy drizzle',    icon: '🌧️' },
  61: { label: 'Light rain',       icon: '🌧️' },
  63: { label: 'Rain',             icon: '🌧️' },
  65: { label: 'Heavy rain',       icon: '🌧️' },
  71: { label: 'Light snow',       icon: '🌨️' },
  73: { label: 'Snow',             icon: '❄️' },
  75: { label: 'Heavy snow',       icon: '❄️' },
  80: { label: 'Rain showers',     icon: '🌦️' },
  81: { label: 'Rain showers',     icon: '🌧️' },
  82: { label: 'Violent showers',  icon: '⛈️' },
  95: { label: 'Thunderstorm',     icon: '⛈️' },
  99: { label: 'Thunderstorm',     icon: '⛈️' },
};

function getDayNightIcon(wmo, isDay) {
  if (isDay) return wmo.icon;
  // Night time icon substitutions
  const nightIcons = {
    '☀️':  '🌙',   // Clear -> Moon
    '🌤️': '🌙',   // Mainly clear -> Moon
    '⛅':  '🌙',   // Partly cloudy -> Moon  
    '☁️':  '☁️',   // Overcast stays the same
  };
  return nightIcons[wmo.icon] || wmo.icon;
}

const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

async function loadWeather() {
  try {
    const res = await fetch(
      'https://api.open-meteo.com/v1/forecast' +
'?latitude=52.9455&longitude=0.7245' +
'&current=temperature_2m,weathercode,windspeed_10m,apparent_temperature,precipitation_probability' +
'&hourly=temperature_2m,weathercode,precipitation_probability' +
'&daily=sunrise,sunset' +
'&timezone=Europe%2FLondon' +
'&forecast_days=2'
    );
    if (!res.ok) throw new Error('Weather fetch failed');
    const data = await res.json();
    renderWeather(data);
  } catch (err) {
    console.warn('Weather unavailable:', err);
    document.getElementById('weather-card').classList.add('hidden');
  }
}

function renderWeather(data) {
  const current = data.current;
  const hourly  = data.hourly;
  const daily   = data.daily;
  const wmo     = WMO_CODES[current.weathercode] || { label: 'Unknown', icon: '🌡️' };

  // ── Parse today's sunrise and sunset
  const sunrise = new Date(daily.sunrise[0]);
  const sunset  = new Date(daily.sunset[0]);
  const now     = new Date();
  const isDay   = now >= sunrise && now <= sunset;

  // ── Current conditions (with day/night icon adjustment)
  document.getElementById('weather-icon').textContent      = getDayNightIcon(wmo, isDay);
  document.getElementById('weather-temp').textContent      = `${Math.round(current.temperature_2m)}°`;
  document.getElementById('weather-condition').textContent = wmo.label;
  document.getElementById('weather-wind').textContent      =
    `Feels like ${Math.round(current.apparent_temperature)}°  💨 ${Math.round(current.windspeed_10m)} km/h`;

  // ── Find current hour index in hourly array
  const currentHour = now.getHours();
  const todayStr    = now.toISOString().split('T')[0];
  const startIndex  = hourly.time.findIndex(t => t === `${todayStr}T${String(currentHour).padStart(2,'0')}:00`);

  // ── Get tomorrow's sunrise and sunset for overnight hours
  const sunrise1 = new Date(daily.sunrise[1]);
  const sunset1  = new Date(daily.sunset[1]);

  // ── Build next 6 hours forecast
  const forecastEl = document.getElementById('weather-forecast');
  forecastEl.innerHTML = '';

  for (let i = 0; i < 6; i++) {
    const idx  = startIndex + i;
    if (idx >= hourly.time.length) break;

    const time    = new Date(hourly.time[idx]);
    const hour    = time.getHours();
    const label   = i === 0 ? 'Now' : `${String(hour).padStart(2,'0')}:00`;
    const wmoH    = WMO_CODES[hourly.weathercode[idx]] || { icon: '🌡️' };
    const temp    = Math.round(hourly.temperature_2m[idx]);
    const rain    = hourly.precipitation_probability[idx];

    // Check if this hour is daytime
    const isDayH  = (time >= sunrise && time <= sunset) ||
                    (time >= sunrise1 && time <= sunset1);

    forecastEl.innerHTML += `
      <div class="forecast-day">
        <span class="forecast-day-name">${label}</span>
        <span class="forecast-day-icon">${getDayNightIcon(wmoH, isDayH)}</span>
        <span class="forecast-day-temps">${temp}°</span>
        <span class="forecast-rain">${rain}%</span>
      </div>`;
  }

  document.getElementById('weather-card').classList.remove('hidden');
}

// ── APP STATE ──────────────────────────────────
let allEntries  = [];    // all records from JSONBin
let currentTab  = 'shops';
let map         = null;  // Leaflet map instance
let activeFilter = null;
let allEvents = [];
let adminLoggedIn = false;
let adminName     = '';
let headerTapCount = 0;
let headerTapTimer = null;
let editingEventId = null;
let eventSortOrder   = 'date';
let eventTypeFilter  = 'all';

// ── DAYS OF WEEK ──────────────────────────────
const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const DAY_LABELS = { monday:'Mon', tuesday:'Tue', wednesday:'Wed', thursday:'Thu', friday:'Fri', saturday:'Sat', sunday:'Sun' };
const TODAY_KEY  = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

// ── INIT ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
   checkSeasonalTab();
  loadData();
  loadWeather();
  registerServiceWorker();
  loadEvents();

  // ── Secret tap sequence on header title ──
  document.querySelector('.app-title').addEventListener('click', function(e) {
    e.stopPropagation();
    headerTapCount++;
    clearTimeout(headerTapTimer);
    headerTapTimer = setTimeout(() => {
      headerTapCount = 0;
    }, 3000);
    if (headerTapCount >= 5) {
      headerTapCount = 0;
      clearTimeout(headerTapTimer);
      openAdmin();
    }
  });

  // ── Populate location dropdown ──
  const select = document.getElementById('event-location-select');
  EVENT_LOCATIONS.forEach(loc => {
    const option = document.createElement('option');
    option.value = loc.name;
    option.textContent = loc.name;
    select.appendChild(option);
  });
});


function checkSeasonalTab() {
  if (CONFIG.SHOW_SEASONAL_TAB) {
    const tab   = document.getElementById('seasonal-tab');
    const label = document.getElementById('seasonal-tab-label');
    tab.classList.remove('hidden');
    label.textContent = CONFIG.SEASONAL_MODE === 'flowershow' ? 'Flower Show' : 'Craft Fair';
  }
}

// ── DATA LOADING ───────────────────────────────
async function loadData() {
  showState('loading');
  try {
    const res = await fetch(
      'https://raw.githubusercontent.com/keithjmorris/burnham-market-data/main/data.json'
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    // JSONBin wraps data in { record: [...] }
    allEntries = json;
    renderTab(currentTab);
  } catch (err) {
    console.error('Failed to load data:', err);
    showState('error');
  }
}

// ── EVENTS LOADING ─────────────────────────────
async function loadEvents() {
  try {
    const res = await fetch(
      'https://raw.githubusercontent.com/keithjmorris/burnham-market-data/main/events.json'
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allEvents = await res.json();
  } catch (err) {
    console.warn('Failed to load events:', err);
    allEvents = [];
  }
}

// ── TAB SWITCHING ──────────────────────────────
function switchTab(tab) {
  currentTab = tab;
  document.querySelector('.app-header').classList.remove('hidden');
  document.body.classList.remove('header-hidden');

  // Update tab bar active state
  document.querySelectorAll('.tab-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  // Update header subtitle
  const subtitles = {
  shops:      'Shops',
  restaurant: 'Eat & Drink',
  facility:   'Facilities',
  parking:    'Parking & Public Toilets',
  seasonal: CONFIG.SEASONAL_MODE === 'flowershow' ? 'Burnham Flower Show & Carnival' : 'BM Craft Fair',
  whatson: "What's On",
};
  document.getElementById('header-subtitle').textContent = subtitles[tab] || 'Village Guide';

  // Destroy map if switching away from map tabs
  if (tab !== 'parking' && map) {
  map.remove();
  map = null;
}

  activeFilter = null;
renderTab(tab);
}

// ── RENDER DISPATCHER ─────────────────────────
function renderTab(tab) {
  if (tab === 'parking') {
    renderMapTab(tab);
  } else if (tab === 'whatson') {
    renderEventsTab();
  } else if (tab === 'seasonal') {
    renderSeasonalTab();
  } else {
    renderCardTab(tab);
  }
}

// ── CARD TABS ─────────────────────────────────
function renderCardTab(tab) {
  // Show weather card only on shops and restaurant tabs
  const weatherCard = document.getElementById('weather-card');
  weatherCard.classList.toggle('hidden', !['shops', 'restaurant', 'facility', 'whatson'].includes(tab));

  showState('cards');
  const list = document.getElementById('cards-list');
  list.innerHTML = '';

  const categoryMap = { shops: 'shop', restaurant: 'restaurant', facility: 'facility', fair: 'fair' };
  let filtered = allEntries.filter(e => e.category === (categoryMap[tab] || tab));

  // Apply tag filter if active
  if (activeFilter) {
    filtered = filtered.filter(e => e.tags && e.tags.includes(activeFilter));
  }

  // Build filter bar
  const filterBar = buildFilterBar(tab, filtered.length, allEntries.filter(e => e.category === (categoryMap[tab] || tab)).length);
  if (filterBar) list.appendChild(filterBar);

  if (filtered.length === 0) {
    list.innerHTML += `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <p>No entries found for "${activeFilter}".</p>
      </div>`;
    return;
  }

  filtered.forEach(entry => {
    list.appendChild(buildCard(entry));
  });
}

// ── EVENTS TAB ─────────────────────────────────
function renderEventsTab() {
  const weatherCard = document.getElementById('weather-card');
  weatherCard.classList.toggle('hidden', false);
  showState('cards');

  const list = document.getElementById('cards-list');
  list.innerHTML = '';

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  // Build display list â€” one entry per event
  // For recurring events, calculate next occurrence and use that as the sort date
  let displayEvents = [];

  allEvents.forEach(e => {
  if (!e.type || e.type === 'one-off') {
    // One-off: include if end date (or start date if no end) hasn't passed
    const relevantDate = e.endDate ? new Date(e.endDate) : new Date(e.date);
    if (relevantDate >= twoDaysAgo) {
      displayEvents.push({ ...e, _sortDate: new Date(e.date) });
    }
  } else if (e.type === 'recurring') {
      // Recurring: include if end date hasn't passed (or no end date)
      if (!e.endDate || new Date(e.endDate) >= now) {
        const next = nextOccurrence(e);
        displayEvents.push({ ...e, _sortDate: next, _nextDate: next });
      }
    }
  });

  // â”€â”€ Filter bar
  const filterBar = document.createElement('div');
  filterBar.className = 'sort-bar';
  filterBar.innerHTML = `
    <span class="sort-label">Sort by:</span>
    <button class="sort-btn ${eventSortOrder === 'date' ? 'active' : ''}"
      onclick="setSortOrder('date')">Date</button>
    <button class="sort-btn ${eventSortOrder === 'posted' ? 'active' : ''}"
      onclick="setSortOrder('posted')">Recently Added</button>
    <span style="flex:1"></span>
    <button class="sort-btn ${eventTypeFilter === 'all' ? 'active' : ''}"
      onclick="setEventTypeFilter('all')">All</button>
    <button class="sort-btn ${eventTypeFilter === 'one-off' ? 'active' : ''}"
      onclick="setEventTypeFilter('one-off')">One-off</button>
    <button class="sort-btn ${eventTypeFilter === 'recurring' ? 'active' : ''}"
      onclick="setEventTypeFilter('recurring')">Regular</button>
  `;
  list.appendChild(filterBar);

  // Apply type filter
  if (eventTypeFilter !== 'all') {
    displayEvents = displayEvents.filter(e => {
      const type = e.type || 'one-off';
      return type === eventTypeFilter;
    });
  }

  // Apply sort
  if (eventSortOrder === 'date') {
    displayEvents.sort((a, b) => a._sortDate - b._sortDate);
  }
  // 'posted' uses natural array order (already preserved above)

  if (displayEvents.length === 0) {
    list.innerHTML += `
      <div class="event-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <p>No upcoming events at the moment.</p>
      </div>`;
    return;
  }

  displayEvents.forEach(event => {
    if (event.type === 'recurring') {
      list.appendChild(buildRecurringEventCard(event));
    } else {
      list.appendChild(buildEventCard(event));
    }
  });
}

function setEventSubTab(tab) {
  eventSubTab = tab;
  renderEventsTab();
  document.getElementById('app-main').scrollTop = 0;
}

function renderOneOffEvents(list) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  let upcoming = allEvents.filter(e =>
    (!e.type || e.type === 'one-off') && new Date(e.date) >= twoDaysAgo
  );

  // Sort bar
  const sortBar = document.createElement('div');
  sortBar.className = 'sort-bar';
  sortBar.innerHTML = `
    <span class="sort-label">Sort by:</span>
    <button class="sort-btn ${eventSortOrder === 'date' ? 'active' : ''}"
      onclick="setSortOrder('date')">Date</button>
    <button class="sort-btn ${eventSortOrder === 'posted' ? 'active' : ''}"
      onclick="setSortOrder('posted')">Recently Added</button>
  `;
  list.appendChild(sortBar);

  if (eventSortOrder === 'date') {
    upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  if (upcoming.length === 0) {
    list.innerHTML += `
      <div class="event-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <p>No upcoming events at the moment.</p>
      </div>`;
    return;
  }

  upcoming.forEach(event => list.appendChild(buildEventCard(event)));
}

function renderRecurringEvents(list) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let recurring = allEvents.filter(e => e.type === 'recurring');

  // Filter out events whose endDate has passed
  recurring = recurring.filter(e => {
    if (!e.endDate) return true;
    return new Date(e.endDate) >= today;
  });

  // Filter out events that haven't started yet? No â€” show them so people can plan ahead.
  // Sort by next occurrence
  recurring.sort((a, b) => nextOccurrence(a) - nextOccurrence(b));

  if (recurring.length === 0) {
    list.innerHTML += `
      <div class="event-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <p>No regular events listed at the moment.</p>
      </div>`;
    return;
  }

  recurring.forEach(event => list.appendChild(buildRecurringEventCard(event)));
}

// Returns the next Date object for a recurring event from today
function nextOccurrence(event) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const targetDay = dayNames.indexOf(event.dayOfWeek.toLowerCase());
  if (targetDay === -1) return today;

  const next = new Date(today);
  const todayDay = next.getDay();
  let daysUntil = (targetDay - todayDay + 7) % 7;
  if (daysUntil === 0) daysUntil = 0; // today counts

  next.setDate(next.getDate() + daysUntil);

  // If fortnightly, check parity against startDate
  if (event.frequency === 'fortnightly' && event.startDate) {
    const start = new Date(event.startDate);
    start.setHours(0,0,0,0);
    const weeksDiff = Math.round((next - start) / (7 * 24 * 60 * 60 * 1000));
    if (weeksDiff % 2 !== 0) {
      next.setDate(next.getDate() + 7);
    }
  }

  // If the calculated next occurrence is before the startDate, use startDate instead
  if (event.startDate) {
    const start = new Date(event.startDate);
    start.setHours(0,0,0,0);
    if (next < start) return start;
  }

  return next;
}

function daysUntilLabel(event) {
  const next = nextOccurrence(event);
  const today = new Date();
  today.setHours(0,0,0,0);
  const diff = Math.round((next - today) / (24 * 60 * 60 * 1000));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 7) return `In ${diff} days`;
  return next.toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' });
}

function frequencyLabel(event) {
  const day = event.dayOfWeek.charAt(0).toUpperCase() + event.dayOfWeek.slice(1);
  const freq = event.frequency === 'fortnightly' ? 'Every other' : 'Every';
  return `${freq} ${day} at ${event.time}`;
}
function setSortOrder(order) {
  eventSortOrder = order;
  renderEventsTab();
  document.getElementById('app-main').scrollTop = 0;
}

function setEventTypeFilter(filter) {
  eventTypeFilter = filter;
  renderEventsTab();
  document.getElementById('app-main').scrollTop = 0;
}

function buildEventCard(event) {
  const card = document.createElement('div');
  card.className = 'event-card';

  const date    = new Date(event.date);
  const day     = date.getDate();
  const month   = date.toLocaleString('en-GB', { month: 'short' }).toUpperCase();
  const weekday = date.toLocaleString('en-GB', { weekday: 'long' });
  const hasLocation = !!(event.latitude && event.longitude);
  let dateLineHtml;
  if (event.endDate) {
    const endDate = new Date(event.endDate);
    const endStr   = endDate.toLocaleDateString('en-GB', { day:'numeric', month:'short' });
    const startStr = date.toLocaleDateString('en-GB', { day:'numeric', month:'short' });
    dateLineHtml = `Starts ${startStr} · Ends ${endStr} · ${event.time}`;
  } else {
    dateLineHtml = `${weekday} ${event.time}`;
  }

  card.innerHTML = `
    <div class="event-header">
      <div class="event-date">
        <span class="event-date-day">${day}</span>
        <span class="event-date-month">${month}</span>
      </div>
      <span class="event-title">${event.title}</span>
    </div>
    <div class="event-body">
      <div class="event-meta">
        <div class="event-meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          ${dateLineHtml}
        </div>
        <div class="event-meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          ${event.location}
        </div>
      </div>
      <p class="event-description">${formatDescription(event.description)}</p>
      <div class="event-actions">
        ${hasLocation ? `
        <button class="event-action-btn" onclick="openDirections(${event.latitude},${event.longitude},'${encodeURIComponent(event.title)}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
          Directions
        </button>` : ''}
      </div>
    </div>
  `;
  return card;
}

function formatDescription(text) {
  // First handle line breaks
  let formatted = text.replace(/\n/g, '<br>');

  // Convert URLs into clickable links
  formatted = formatted.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener" style="color:var(--sea);text-decoration:underline;">$1</a>'
  );

  // Convert email addresses into clickable mailto: links
  formatted = formatted.replace(
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    '<a href="mailto:$1" style="color:var(--sea);text-decoration:underline;">$1</a>'
  );

  // Convert UK phone numbers into clickable tel: links
  formatted = formatted.replace(
    /(\+?\d{2,5}[\s-]?\d{3,4}[\s-]?\d{3,4})/g,
    '<a href="tel:$1" style="color:var(--sea);text-decoration:underline;">$1</a>'
  );

  return formatted;
}

function buildRecurringEventCard(event) {
  const card = document.createElement('div');
  card.className = 'event-card';

  const next    = event._nextDate || nextOccurrence(event);
  const day     = next.getDate();
  const month   = next.toLocaleString('en-GB', { month: 'short' }).toUpperCase();
  const weekday = next.toLocaleString('en-GB', { weekday: 'long' });
  const hasLocation = !!(event.latitude && event.longitude);
  const freqLabel   = frequencyLabel(event);

  let dateRangeHtml = '';
  if (event.endDate) {
    const until = new Date(event.endDate).toLocaleDateString('en-GB', { day:'numeric', month:'short' });
    dateRangeHtml = `<div class="event-meta-item" style="font-size:12px;opacity:0.7;">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      Until ${until}
    </div>`;
  }

  card.innerHTML = `
    <div class="event-header">
      <div class="event-date">
        <span class="event-date-day">${day}</span>
        <span class="event-date-month">${month}</span>
      </div>
      <div style="flex:1;min-width:0;">
        <span class="event-title">${event.title}</span>
        <span style="display:inline-block;margin-left:8px;font-size:10px;background:#e0ebe6;color:#2C4A3E;padding:2px 6px;border-radius:4px;font-weight:600;text-transform:uppercase;vertical-align:middle;">Regular</span>
      </div>
    </div>
    <div class="event-body">
      <div class="event-meta">
        <div class="event-meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          ${freqLabel}
        </div>
        <div class="event-meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          ${event.location}
        </div>
        ${dateRangeHtml}
      </div>
      <p class="event-description">${formatDescription(event.description)}</p>
      <div class="event-actions">
        ${hasLocation ? `
        <button class="event-action-btn" onclick="openDirections(${event.latitude},${event.longitude},'${encodeURIComponent(event.title)}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
          Directions
        </button>` : ''}
      </div>
    </div>
  `;
  return card;
}
function buildFilterBar(tab, filteredCount, totalCount) {
  // Only show on tabs that support filtering
  if (!['shops', 'facility', 'restaurant'].includes(tab)) return null;
  if (!activeFilter) return null;

  const bar = document.createElement('div');
  bar.className = 'filter-bar';
  bar.innerHTML = `
    <div class="filter-active">
      <span class="filter-tag-active">${activeFilter}</span>
      <button class="filter-clear" onclick="clearFilter()">✕</button>
    </div>
    <span class="filter-count">Showing ${filteredCount} of ${totalCount}</span>
  `;
  return bar;
}

function setFilter(tag) {
  activeFilter = tag;
  renderCardTab(currentTab);
  // Scroll back to top
  document.getElementById('app-main').scrollTop = 0;
}

function clearFilter() {
  activeFilter = null;
  renderCardTab(currentTab);
  document.getElementById('app-main').scrollTop = 0;
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
  const tagsHtml = tags.map(t => `<span class="card-tag" onclick="setFilter(this.getAttribute('data-tag'))" data-tag="${t}">${t}</span>`).join('');

  // ── Action buttons
  const hasPhone    = !!entry.phoneNumber;
  const hasWebsite  = !!entry.website;
  const hasLocation = !!(entry.latitude && entry.longitude);
  const hasHours    = DAYS.some(d => entry.openingHours?.[d]);
  const hasSocial   = !!entry.social;
const isInstagram = hasSocial && entry.social.includes('instagram');
const isFacebook  = hasSocial && entry.social.includes('facebook');

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
  <button class="card-action-btn ${hasSocial ? '' : 'disabled'}"
    onclick="${hasSocial ? `openWebsite('${entry.social}')` : ''}" title="Social media">
    ${isInstagram ? `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
    ` : `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
    `}
    Social
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

  setTimeout(() => {
    if (!map) {
      map = L.map('map-container').setView(CONFIG.MAP_CENTRE, CONFIG.MAP_ZOOM);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);
    } else {
      map.setView(CONFIG.MAP_CENTRE, CONFIG.MAP_ZOOM);
      map.eachLayer(layer => {
        if (layer instanceof L.Marker) map.removeLayer(layer);
      });
    }

    const legend = document.getElementById('map-legend');
    legend.innerHTML = '';

    // Show both parking and toilet pins together
    addMapMarkers('parking', '#2C4A3E', '🅿');
    addMapMarkers('toilets', '#4A7C8E', '🚻');
    addLegendItem(legend, '#2C4A3E', 'Car Park');
    addLegendItem(legend, '#4A7C8E', 'Public Toilets');

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
  document.getElementById('gallery-view').classList.toggle('hidden', state !== 'gallery');
}

// ── ADMIN ──────────────────────────────────────
function openAdmin() {
  document.getElementById('admin-backdrop').classList.remove('hidden');
  document.getElementById('admin-panel').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  if (!adminLoggedIn) {
    document.getElementById('admin-login').classList.remove('hidden');
    document.getElementById('admin-events').classList.add('hidden');
  } else {
    showAdminEvents();
  }
}

function closeAdmin() {
  document.getElementById('admin-backdrop').classList.add('hidden');
  document.getElementById('admin-panel').classList.add('hidden');
  document.body.style.overflow = '';
}

async function submitLogin() {
  const username = document.getElementById('admin-username').value.trim();
  const password = document.getElementById('admin-password').value.trim();
  const errorEl  = document.getElementById('admin-error');
  errorEl.classList.add('hidden');

  if (!username || !password) {
    errorEl.textContent = 'Please enter your email and password';
    errorEl.classList.remove('hidden');
    return;
  }

  try {
    const res = await fetch('/api/auth-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      adminLoggedIn = true;
      adminName     = `${data.firstName} ${data.lastName}`;
      document.getElementById('admin-login').classList.add('hidden');
      showAdminEvents();
    } else {
      errorEl.textContent = 'Invalid credentials — please try again';
      errorEl.classList.remove('hidden');
    }
  } catch (err) {
    errorEl.textContent = 'Connection error — please try again';
    errorEl.classList.remove('hidden');
  }
}

function showAdminEvents() {
  document.getElementById('admin-welcome').textContent = `Signed in as ${adminName}`;
  document.getElementById('admin-events').classList.remove('hidden');
  document.getElementById('admin-form').classList.add('hidden');
  renderAdminEventsList();
}

function renderAdminEventsList() {
  const list = document.getElementById('admin-events-list');
  list.innerHTML = '';

  if (allEvents.length === 0) {
    list.innerHTML = '<p style="font-size:14px;color:var(--text-light);text-align:center;padding:20px 0">No events yet</p>';
    return;
  }

  const oneOff    = allEvents.filter(e => !e.type || e.type === 'one-off')
                              .sort((a, b) => new Date(a.date) - new Date(b.date));
  const recurring = allEvents.filter(e => e.type === 'recurring')
                              .sort((a, b) => {
                                const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
                                return days.indexOf(a.dayOfWeek) - days.indexOf(b.dayOfWeek);
                              });

  const allSorted = [...oneOff, ...recurring];

  allSorted.forEach(event => {
    const item = document.createElement('div');
    item.className = 'admin-event-item';

    let dateStr;
    if (event.type === 'recurring') {
      const day = event.dayOfWeek.charAt(0).toUpperCase() + event.dayOfWeek.slice(1);
      const freq = event.frequency === 'fortnightly' ? 'Every other' : 'Every';
      dateStr = `${freq} ${day} Â· ${event.time}`;
    } else {
      dateStr = new Date(event.date).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) + ` Â· ${event.time}`;
    }

    item.innerHTML = `
      <div class="admin-event-item-info">
        <p class="admin-event-item-title">${event.title}
          <span style="font-size:10px;background:${event.type === 'recurring' ? '#e0ebe6' : '#f0eefc'};color:${event.type === 'recurring' ? '#2C4A3E' : '#4a4080'};padding:2px 6px;border-radius:4px;margin-left:6px;font-weight:600;text-transform:uppercase;">${event.type === 'recurring' ? 'Regular' : 'One-off'}</span>
        </p>
        <p class="admin-event-item-date">${dateStr}</p>
      </div>
      <div class="admin-event-item-buttons">
        <button class="admin-event-edit-btn" onclick="editEvent('${event.id}')">Edit</button>
        <button class="admin-event-delete-btn" onclick="deleteEvent('${event.id}')">Delete</button>
      </div>
    `;
    list.appendChild(item);
  });
}

function toggleEventTypeFields() {
  const isRecurring = document.getElementById('event-type-recurring').checked;
  document.getElementById('event-oneoff-fields').classList.toggle('hidden', isRecurring);
  document.getElementById('event-recurring-fields').classList.toggle('hidden', !isRecurring);
}

function showNewEventForm() {
  editingEventId = null;
  document.getElementById('admin-form-title').textContent = 'New Event';
  document.getElementById('admin-submit-btn').textContent = 'Post Event';
  document.getElementById('event-title').value       = '';
  document.getElementById('event-date').value        = '';
  document.getElementById('event-time').value        = '';
  document.getElementById('event-location-select').value = '';
  document.getElementById('event-location-custom').classList.add('hidden');
  document.getElementById('event-description').value = '';
  document.getElementById('admin-word-count').textContent = '0 / 50 words';
  // Reset event type to one-off
  document.getElementById('event-type-oneoff').checked = true;
  toggleEventTypeFields();
  document.getElementById('admin-form').classList.remove('hidden');
}


function editEvent(id) {
  const event = allEvents.find(e => e.id === id);
  if (!event) return;
  editingEventId = id;
  document.getElementById('admin-form-title').textContent = 'Edit Event';
  document.getElementById('admin-submit-btn').textContent = 'Save Changes';
  document.getElementById('event-title').value       = event.title;
  document.getElementById('event-description').value = event.description;
  checkWordCount();

  const isRecurring = event.type === 'recurring';
  document.getElementById(isRecurring ? 'event-type-recurring' : 'event-type-oneoff').checked = true;
  toggleEventTypeFields();

  if (isRecurring) {
    document.getElementById('event-day-of-week').value  = event.dayOfWeek   || '';
    document.getElementById('event-recurring-time').value = event.time      || '';
    document.getElementById('event-frequency').value   = event.frequency    || 'weekly';
    document.getElementById('event-start-date').value  = event.startDate    || '';
    document.getElementById('event-end-date').value    = event.endDate      || '';
  } else {
  document.getElementById('event-date').value         = event.date || '';
  document.getElementById('event-end-date-oneoff').value = event.endDate || '';
  document.getElementById('event-time').value         = event.time || '';
}

  // Set location dropdown
  const select   = document.getElementById('event-location-select');
  const knownLoc = EVENT_LOCATIONS.find(l => l.name === event.location);
  if (knownLoc) {
    select.value = event.location;
    document.getElementById('event-location-custom').classList.add('hidden');
  } else {
    select.value = 'Other';
    const custom = document.getElementById('event-location-custom');
    custom.classList.remove('hidden');
    custom.value = event.location;
  }

  document.getElementById('admin-form').classList.remove('hidden');
  document.getElementById('admin-form').scrollIntoView({ behavior: 'smooth' });
}

async function deleteEvent(id) {
  if (!confirm('Are you sure you want to delete this event?')) return;
  try {
    const res = await fetch('/api/post-event', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    const data = await res.json();
    if (res.ok) {
      allEvents = data.events;
      renderAdminEventsList();
      renderEventsTab();
    }
  } catch (err) {
    alert('Failed to delete event — please try again');
  }
}

function cancelEventForm() {
  document.getElementById('admin-form').classList.add('hidden');
  editingEventId = null;
}

function handleLocationSelect() {
  const select = document.getElementById('event-location-select');
  const custom = document.getElementById('event-location-custom');
  custom.classList.toggle('hidden', select.value !== 'Other');
}

function checkWordCount() {
  const text  = document.getElementById('event-description').value.trim();
  const words = text === '' ? 0 : text.split(/\s+/).length;
  const el    = document.getElementById('admin-word-count');
  el.textContent = `${words} / 400 words`;
  el.classList.toggle('over', words > 400);
}

async function submitEvent() {
  const title     = document.getElementById('event-title').value.trim();
  const locSelect = document.getElementById('event-location-select').value;
  const locCustom = document.getElementById('event-location-custom').value.trim();
  const desc      = document.getElementById('event-description').value.trim();
  const isRecurring = document.getElementById('event-type-recurring').checked;

  if (!title || !locSelect || !desc) {
    alert('Please fill in all required fields');
    return;
  }

  const words = desc.split(/\s+/).length;
  if (words > 400) {
    alert('Description must be 400 words or fewer');
    return;
  }

  const locData  = EVENT_LOCATIONS.find(l => l.name === locSelect);
  const location = locSelect === 'Other' ? locCustom : locSelect;
  const lat = locData?.lat || null;
  const lng = locData?.lng || null;

  let eventData;

  if (isRecurring) {
    const dayOfWeek  = document.getElementById('event-day-of-week').value;
    const time       = document.getElementById('event-recurring-time').value.trim();
    const frequency  = document.getElementById('event-frequency').value;
    const startDate  = document.getElementById('event-start-date').value;
    const endDate    = document.getElementById('event-end-date').value;

    if (!dayOfWeek || !time) {
      alert('Please fill in day of week and time');
      return;
    }

    eventData = {
      type: 'recurring',
      title, location, description: desc,
      dayOfWeek, time, frequency,
      startDate: startDate || null,
      endDate:   endDate   || null,
      latitude: lat, longitude: lng
    };
  } else {
  const date    = document.getElementById('event-date').value;
  const endDate = document.getElementById('event-end-date-oneoff').value;
  const time    = document.getElementById('event-time').value.trim();

  if (!date || !time) {
    alert('Please fill in date and time');
    return;
  }

  eventData = {
    type: 'one-off',
    title, date, time, location,
    endDate: endDate || null,
    description: desc,
    latitude: lat, longitude: lng
  };
}

  try {
    const method = editingEventId ? 'PUT' : 'POST';
    if (editingEventId) eventData.id = editingEventId;

    const res = await fetch('/api/post-event', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData)
    });
    const data = await res.json();

    if (res.ok) {
      allEvents = data.events;
      cancelEventForm();
      renderAdminEventsList();
      renderEventsTab();
    } else {
      alert('Failed to save event â€” please try again');
    }
  } catch (err) {
    alert('Connection error â€” please try again');
  }
}

// ── SEASONAL TAB ───────────────────────────────
let galleryIndex = 0;
let galleryTotal = 0;
let galleryStartX = 0;

function renderSeasonalTab() {
  document.getElementById('weather-card').classList.add('hidden');
  document.querySelector('.app-header').classList.add('hidden');
  document.body.classList.add('header-hidden');
  showState('gallery');
  if (CONFIG.SEASONAL_MODE === 'flowershow') {
    renderFlowerShowGallery();
  } else {
    renderFairCards();
  }
}

function renderFlowerShowGallery() {
  const header = document.getElementById('gallery-header');
  header.innerHTML = `
  <div style="display:flex;align-items:center;justify-content:space-between;">
    <div>
      <p class="gallery-header-title">Burnham Flower Show & Carnival</p>
      <p class="gallery-header-dates">Friday 11th & Saturday 12th July 2026</p>
    </div>
    <button onclick="openEntryForm()" style="
      background:white;
      color:var(--green);
      border:none;
      border-radius:20px;
      padding:8px 14px;
      font-size:13px;
      font-weight:700;
      font-family:var(--font-body);
      cursor:pointer;
      flex-shrink:0;
      margin-left:12px;
    ">Enter</button>
  </div>
`;

  const track  = document.getElementById('gallery-track');
  const dots   = document.getElementById('gallery-dots');
  const images = CONFIG.FLOWERSHOW_IMAGES;
  galleryTotal = images.length;
  galleryIndex = 0;
  track.innerHTML = '';
  dots.innerHTML  = '';

  images.forEach((name, i) => {
    const slide = document.createElement('div');
    slide.className = 'gallery-slide';
    slide.innerHTML = `<img src="${CONFIG.FLOWERSHOW_IMAGE_BASE}${name}${CONFIG.FLOWERSHOW_IMAGE_EXT}"
      alt="Flower Show image ${i + 1}" loading="lazy">`;
    track.appendChild(slide);

    const dot = document.createElement('div');
    dot.className = `gallery-dot${i === 0 ? ' active' : ''}`;
    dot.onclick = () => goToSlide(i);
    dots.appendChild(dot);
  });

  // Touch/swipe support
  const container = document.getElementById('gallery-container');
  container.addEventListener('touchstart', e => {
    galleryStartX = e.touches[0].clientX;
  }, { passive: true });

  container.addEventListener('touchend', e => {
    const diff = galleryStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextSlide();
      else prevSlide();
    }
  }, { passive: true });
}

function goToSlide(index) {
  galleryIndex = Math.max(0, Math.min(index, galleryTotal - 1));
  document.getElementById('gallery-track').style.transform = `translateX(-${galleryIndex * 100}vw)`;
  document.querySelectorAll('.gallery-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === galleryIndex);
  });
}

function nextSlide() { goToSlide(galleryIndex + 1); }
function prevSlide() { goToSlide(galleryIndex - 1); }

function renderFairCards() {
  showState('cards');
  const list = document.getElementById('cards-list');
  list.innerHTML = `
    <div class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      <p>Craft Fair information coming soon!</p>
    </div>`;
}

// ── FLOWER SHOW ENTRY FORM ──────────────────────
function openEntryForm() {
  document.getElementById('entry-backdrop').classList.remove('hidden');
  document.getElementById('entry-panel').classList.remove('hidden');
  document.getElementById('entry-success').classList.add('hidden');
  document.querySelectorAll('.entry-section').forEach(s => s.classList.add('hidden'));
  document.getElementById('entry-general').classList.remove('hidden');
  document.querySelectorAll('.entry-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('.entry-tab').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeEntryForm() {
  document.getElementById('entry-backdrop').classList.add('hidden');
  document.getElementById('entry-panel').classList.add('hidden');
  document.body.style.overflow = '';
}

function switchEntryTab(section) {
  document.querySelectorAll('.entry-section').forEach(s => s.classList.add('hidden'));
  document.getElementById(`entry-${section}`).classList.remove('hidden');
  document.querySelectorAll('.entry-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
}

function updateFee(section) {
  const input    = document.getElementById(`${section}-classes`).value;
  const classes  = input.split(',').map(s => s.trim()).filter(s => s !== '');
  const count    = classes.length;
  const fee      = (count * 0.20).toFixed(2);
  const display  = document.getElementById(`${section}-fee`);

  if (count === 0) {
    display.textContent = 'Enter class numbers to calculate fee';
  } else {
    display.textContent = `${count} class${count > 1 ? 'es' : ''} — fee: £${fee}`;
  }
}

async function submitEntry(section) {
  const name      = document.getElementById(`${section}-name`).value.trim();
  const address   = document.getElementById(`${section}-address`).value.trim();
  const telephone = document.getElementById(`${section}-telephone`).value.trim();
  const classes   = document.getElementById(`${section}-classes`).value.trim();

  if (!name || !address || !telephone || !classes) {
    alert('Please fill in all fields');
    return;
  }

  const classList = classes.split(',').map(s => s.trim()).filter(s => s !== '');
  const count     = classList.length;
  const fee       = `£${(count * 0.20).toFixed(2)}`;

  const sectionNames = {
    general:     'General (Adult Classes 1–92)',
    photography: 'Photography (Classes 56–59)',
    children:    'Children\'s (Classes 93–119)'
  };

  const data = {
    section:         sectionNames[section],
    name,
    address,
    telephone,
    classes:         classList.join(', '),
    numberOfClasses: count,
    totalFee:        fee,
    age:             section === 'children' ? document.getElementById('children-age').value : '',
    notes:           section === 'photography' ? `Photos per class: ${document.getElementById('photography-photos').value}` : '',
    submittedAt:     new Date().toISOString()
  };

  const btn = document.querySelector(`#entry-${section} .entry-submit-btn`);
  btn.textContent = 'Submitting…';
  btn.disabled = true;

  try {
    await flowerShowDb.ref('flower-show/entries').push(data);

    document.querySelectorAll('.entry-section').forEach(s => s.classList.add('hidden'));
    document.getElementById('success-fee').textContent = fee;
    document.getElementById('entry-success').classList.remove('hidden');
  } catch (err) {
    console.error('Flower show entry error:', err);
    alert('Submission failed — please try again');
    btn.textContent = 'Submit Entry';
    btn.disabled = false;
  }
}
    


// ── SERVICE WORKER ─────────────────────────────
function registerServiceWorker() {
  // Temporarily disabled during development
  // if ('serviceWorker' in navigator) {
  //   navigator.serviceWorker.register('service-worker.js')
  //     .then(() => console.log('Service Worker registered'))
  //     .catch(err => console.warn('Service Worker registration failed:', err));
  // }
}