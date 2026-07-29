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
  'flowershow22',
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

  // ── ROGUE TRADERS ──
  ROGUE_TRADERS_END: new Date('2026-07-11T23:59:59'),

  // ── MONTHLY MARKET ──
MARKET_DATES_2026: [
  '2026-03-28', '2026-04-25', '2026-05-23',
  '2026-06-27', '2026-07-25', '2026-08-22', '2026-09-19'
],

  // ── SEASONAL TAB CONTROL ──
  SHOW_SEASONAL_TAB: true,
  SEASONAL_MODE: 'fair',

  FLOWER_SHOW_ENTRY_OPEN: false,

  ROGUE_TRADERS_ENTRY_OPEN: false,
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

// ── ROGUE TRADERS CIPHER KEY ────────────────────
const ROGUE_CIPHER = {};
'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach((letter, i) => {
  ROGUE_CIPHER[i + 1] = letter;
});

let rogueSightings = [];
let allMarketStalls = [];
let marketCategoryFilter = '';
let previousTab = null;

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
let deferredInstallPrompt = null;


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
  // ── Install prompt ──
initInstallBanner();
// ── Frequency dropdown listener ──
  document.getElementById('event-frequency')?.addEventListener('change', function() {
    const specificDatesField = document.getElementById('specific-dates-field');
    if (specificDatesField) {
      specificDatesField.classList.toggle('hidden', this.value !== 'specific');
    }
  });
});

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
if (select) {
  EVENT_LOCATIONS.forEach(loc => {
    const option = document.createElement('option');
    option.value = loc.name;
    option.textContent = loc.name;
    select.appendChild(option);
  });
}


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
  const endDate = e.endDate ? new Date(e.endDate) : null;
  if (endDate && endDate < twoDaysAgo) return;
  
  // For specific dates, check if any upcoming dates remain
  if (e.frequency === 'specific' && e.specificDates) {
    const hasUpcoming = e.specificDates.some(d => new Date(d) >= twoDaysAgo);
    if (!hasUpcoming) return;
  }
  
  const next = nextOccurrence(e);
  if (!next) return;
  displayEvents.push({ ...e, _nextDate: next, _sortDate: next });
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
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Handle specific dates array
  if (event.frequency === 'specific' && event.specificDates) {
    const upcoming = event.specificDates
      .map(d => new Date(d))
      .filter(d => d >= now)
      .sort((a, b) => a - b);
    return upcoming.length > 0 ? upcoming[0] : null;
  }

  // Handle weekly events
  if (event.frequency === 'weekly') {
    const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const targetDay = days.indexOf((event.dayOfWeek || '').toLowerCase());
    if (targetDay === -1) return null;
    const next = new Date(now);
    const currentDay = next.getDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) daysUntil += 7;
    next.setDate(next.getDate() + daysUntil);
    return next;
  }

  // Handle monthly events (same day each month)
  if (event.frequency === 'monthly') {
    const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const targetDay = days.indexOf((event.dayOfWeek || '').toLowerCase());
    if (targetDay === -1) return null;
    const next = new Date(now);
    while (next.getDay() !== targetDay) {
      next.setDate(next.getDate() + 1);
    }
    return next;
  }

  return null;
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
  if (event.frequency === 'specific' && event.specificDates) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const upcoming = event.specificDates
      .map(d => new Date(d))
      .filter(d => d >= now)
      .sort((a, b) => a - b);
    if (upcoming.length > 0) {
      return upcoming[0].toLocaleDateString('en-GB', { 
        weekday: 'long', day: 'numeric', month: 'long' 
      }) + ' · ' + event.time;
    }
    return event.time || '';
  }
  if (event.frequency === 'weekly') {
    const day = event.dayOfWeek 
      ? event.dayOfWeek.charAt(0).toUpperCase() + event.dayOfWeek.slice(1) 
      : '';
    return `Every ${day} · ${event.time}`;
  }
  if (event.frequency === 'monthly') {
    const day = event.dayOfWeek 
      ? event.dayOfWeek.charAt(0).toUpperCase() + event.dayOfWeek.slice(1) 
      : '';
    return `Monthly ${day} · ${event.time}`;
  }
  return event.time || '';
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
  const hasDocument = !!event.documentUrl;
  let dateLineHtml;
  if (event.endDate) {
    const endDate = new Date(event.endDate);
    const endStr   = endDate.toLocaleDateString('en-GB', { day:'numeric', month:'short' });
    const startStr = date.toLocaleDateString('en-GB', { day:'numeric', month:'short' });
    dateLineHtml = `Starts ${startStr} · Ends ${endStr} · ${event.time}`;
  } else {
    dateLineHtml = `${weekday} ${event.time}`;
  }
  const isMarketEvent = (event.title || '').toLowerCase().includes('market');

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
      ${hasDocument ? `
  <button class="event-action-btn" onclick="openDocPanel('${encodeURIComponent(event.documentUrl)}','${encodeURIComponent(event.title)}')">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
    More info
  </button>` : ''}
  ${isMarketEvent ? `
<button class="event-action-btn" onclick="openMarketPanel('${event.date || ''}')">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  View Stalls
</button>` : ''}
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
  const hasDocument = !!event.documentUrl;
  const isMarketEvent = (event.title || '').toLowerCase().includes('market');
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
  ${hasDocument ? `
  <button class="event-action-btn" onclick="openDocPanel('${encodeURIComponent(event.documentUrl)}','${encodeURIComponent(event.title)}')">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
    More info
  </button>` : ''}
 ${isMarketEvent ? `
<button class="event-action-btn" onclick="openMarketPanel('${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}-${String(next.getDate()).padStart(2,'0')}')">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  View Stalls
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
   if (allEntries.length === 0) {
    setTimeout(() => renderMapTab(tab), 500);
    return;
  }
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

// Add back button if we came from Craft Fair
if (previousTab) {
  const backBtn = document.createElement('button');
  backBtn.textContent = '← Back to Craft Fair';
  backBtn.style.cssText = 'background:var(--green);color:white;border:none;border-radius:20px;padding:6px 14px;font-size:13px;font-weight:600;font-family:var(--font-body);cursor:pointer;margin-right:auto;';
  backBtn.onclick = () => {
    const dest = previousTab;
    previousTab = null;
    switchTab(dest);
  };
  legend.appendChild(backBtn);
}

    // Always show parking and toilets
    addMapMarkers('parking', '#2C4A3E', '🅿');
    addMapMarkers('toilets', '#4A7C8E', '🚻');
    addLegendItem(legend, '#2C4A3E', 'Car Park');
    addLegendItem(legend, '#4A7C8E', 'Public Toilets');

    // Show temporary Craft Fair parking when seasonal tab is in fair mode
    if (CONFIG.SHOW_SEASONAL_TAB && CONFIG.SEASONAL_MODE === 'fair') {
      addMapMarkers('parking-temp', '#C4622D', '🅿');
      addLegendItem(legend, '#C4622D', 'Craft Fair Parking (16 Aug only)');
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
  document.getElementById('admin-word-count').textContent = '0 / 400 words';
  document.getElementById('event-document-url').value = '';  // ← ADD THIS
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
  document.getElementById('event-document-url').value = event.documentUrl || '';
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
  specificDates: frequency === 'specific'
    ? document.getElementById('event-specific-dates').value
        .split('\n')
        .map(d => d.trim())
        .filter(d => d.match(/^\d{4}-\d{2}-\d{2}$/))
    : null,
  documentUrl: document.getElementById('event-document-url').value.trim() || null,
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
    documentUrl: document.getElementById('event-document-url').value.trim() || null,
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
  
  if (CONFIG.SEASONAL_MODE === 'flowershow') {
    document.querySelector('.app-header').classList.add('hidden');
    document.body.classList.add('header-hidden');
    showState('gallery');
    renderFlowerShowGallery();
  } else {
    // Craft Fair — show normal header
    document.querySelector('.app-header').classList.remove('hidden');
    document.body.classList.remove('header-hidden');
    document.getElementById('header-subtitle').textContent = 'Burnham Market Craft Fair';
    showState('cards');
    renderFairCards();
  }
}

function renderFlowerShowGallery() {
  const header = document.getElementById('gallery-header');
  const showRogueTraders = new Date() <= CONFIG.ROGUE_TRADERS_END;



header.innerHTML = `
  <p class="gallery-header-title">Burnham Flower Show & Carnival</p>
  <div style="display:flex;gap:6px;margin:8px 0;justify-content:center;">
    ${(showRogueTraders && CONFIG.ROGUE_TRADERS_ENTRY_OPEN) ? `
<button onclick="openRogueTraders()" style="
  background:white;
  color:var(--green);
  border:none;
  border-radius:20px;
  padding:8px 12px;
  font-size:12px;
  font-weight:700;
  font-family:var(--font-body);
  cursor:pointer;
  white-space:nowrap;
">🕵️ Rogue Traders</button>` : ''}
    ${CONFIG.FLOWER_SHOW_ENTRY_OPEN ? `
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
  white-space:nowrap;
">Flower Show Entry</button>
` : ''}
<a href="https://raw.githubusercontent.com/keithjmorris/burnham-market-images/main/images/flowershow/flowershow15.jpeg" 
   target="_blank" 
   rel="noopener"
   style="
     background:rgba(255,255,255,0.85);
     color:var(--green);
     border:none;
     border-radius:20px;
     padding:8px 12px;
     font-size:12px;
     font-weight:700;
     font-family:var(--font-body);
     cursor:pointer;
     white-space:nowrap;
     text-decoration:none;
     display:inline-block;
   ">📋 Entry Form</a>
  </div>
  <p class="gallery-header-dates">Friday 11th & Saturday 12th July 2026</p>
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

function openRogueTraders() {
  alert('Rogue Traders hunt tool coming soon!');
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

// ── CRAFT FAIR STALLS ──────────────────────────
let allStalls = [];
let stallCategoryFilter = '';

function renderFairCards() {
  // Load stalls from Firebase
  if (allStalls.length > 0) {
    renderStallCards();
    return;
  }

  const list = document.getElementById('cards-list');
  list.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>Loading stalls…</p></div>';

  flowerShowDb.ref('craft-fair/stalls').once('value', snap => {
    const raw = snap.val();
    if (!raw) {
      list.innerHTML = '<div class="empty-state"><p>No stalls found.</p></div>';
      return;
    }
    allStalls = Object.values(raw)
      .sort((a, b) => String(a.stallNumber).localeCompare(String(b.stallNumber)));
    renderStallCards();
  });
}

function renderStallCards() {
  const list = document.getElementById('cards-list');
  list.innerHTML = '';

  // Action buttons bar
  const actionBar = document.createElement('div');
  actionBar.style.cssText = 'display:flex;gap:8px;padding:12px 16px;background:white;border-bottom:1px solid var(--cream-dark);';
  actionBar.innerHTML = `
    <button onclick="openDocPanel('${encodeURIComponent('https://raw.githubusercontent.com/keithjmorris/burnham-market-craft-fair/main/images/craft-fair-map.png')}','Craft Fair Map')" style="
      flex:1;background:var(--green-muted);color:var(--green);border:none;border-radius:20px;
      padding:8px 12px;font-size:13px;font-weight:700;font-family:var(--font-body);cursor:pointer;">
      🗺 View Map
    </button>
    <button onclick="previousTab='seasonal';switchTab('parking')" style="
  flex:1;background:var(--green-muted);color:var(--green);border:none;border-radius:20px;
  padding:8px 12px;font-size:13px;font-weight:700;font-family:var(--font-body);cursor:pointer;">
  🅿 Parking
</button>
  `;
  list.appendChild(actionBar);

  // Category filter bar
  const categories = ['All', ...new Set(allStalls.map(s => s.category).filter(Boolean).sort())];
  const filterBar = document.createElement('div');
  filterBar.className = 'craft-filter-bar';
  filterBar.innerHTML = categories.map(cat => `
    <button class="craft-filter-pill ${(stallCategoryFilter === cat || (cat === 'All' && !stallCategoryFilter)) ? 'active' : ''}"
      onclick="setStallFilter('${cat}')">
      ${cat}
    </button>
  `).join('');
  list.appendChild(filterBar);

  const filtered = stallCategoryFilter && stallCategoryFilter !== 'All'
    ? allStalls.filter(s => s.category === stallCategoryFilter)
    : allStalls;

  if (filtered.length === 0) {
    list.innerHTML += '<div class="empty-state"><p>No stalls in this category.</p></div>';
    return;
  }

  filtered.forEach(stall => {
    list.appendChild(buildStallCard(stall));
  });
}

function setStallFilter(category) {
  stallCategoryFilter = category === 'All' ? '' : category;
  renderStallCards();
  document.getElementById('app-main').scrollTop = 0;
}

function buildStallCard(stall) {
  const card = document.createElement('div');
  card.className = 'card';

  const hasPhone    = !!stall.phone;
  const hasWebsite  = !!stall.website;
  const hasSocial   = !!(stall.instagram || stall.facebook);
  const isInstagram = !!stall.instagram;
  const socialUrl   = stall.instagram
    ? `https://www.instagram.com/${stall.instagram}`
    : `https://www.facebook.com/${stall.facebook}`;

  const imgHtml = stall.image
    ? `<img class="card-image" src="${stall.image}" alt="${stall.name}" loading="lazy" onerror="this.style.display='none'">`
    : `<div class="card-image-placeholder"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`;

  card.innerHTML = `
    <div class="card-top">
      ${imgHtml}
      <div class="card-info">
        <p class="card-name">${stall.name || 'Unknown'}</p>
        <p class="card-description">${stall.description ? stall.description.substring(0, 80) + (stall.description.length > 80 ? '…' : '') : ''}</p>
        ${stall.category ? `<div class="card-tags"><span class="card-tag">${stall.category}</span></div>` : ''}
        <p class="stall-number-badge">Stall ${stall.stallNumber || ''}</p>
      </div>
    </div>
    <div class="card-actions">
      <button class="card-action-btn ${hasPhone ? '' : 'disabled'}"
        onclick="${hasPhone ? `callPhone('${stall.phone}')` : ''}" title="Call">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.5 12 19.79 19.79 0 0 1 1.15 3.18 2 2 0 0 1 3.13 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 5.47 5.47l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        Call
      </button>
      <button class="card-action-btn" onclick="openStallDetail('${stall.stallNumber}')" title="Details">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
  Details
</button>
      <button class="card-action-btn ${hasWebsite ? '' : 'disabled'}"
        onclick="${hasWebsite ? `openWebsite('${stall.website}')` : ''}" title="Website">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        Website
      </button>
      <button class="card-action-btn ${hasSocial ? '' : 'disabled'}"
        onclick="${hasSocial ? `openWebsite('${socialUrl}')` : ''}" title="Social">
        ${isInstagram ? `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
        ` : `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
        `}
        Social
      </button>
      <button class="card-action-btn" onclick="openStallMapB('${stall.stallNumber}')" title="Find stall">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        Find
      </button>
    </div>
  `;
  return card;
}

function openStallDetail(stallNumber) {
  const stall = allStalls.find(s => String(s.stallNumber) === String(stallNumber));
  if (!stall) return;
  const panel = document.getElementById('stall-panel');
  const content = document.getElementById('stall-panel-content');
  document.getElementById('stall-panel-title').textContent = stall.name;

  const hasSocial  = !!(stall.instagram || stall.facebook);
  const socialUrl  = stall.instagram
    ? `https://www.instagram.com/${stall.instagram}`
    : `https://www.facebook.com/${stall.facebook}`;
  const socialLabel = stall.instagram ? 'Instagram' : 'Facebook';

  content.innerHTML = `
    ${stall.image ? `<img class="stall-detail-image" src="${stall.image}" alt="${stall.name}" />` : ''}
    <p class="stall-detail-name">${stall.name}</p>
    <p class="stall-detail-number">Stall ${stall.stallNumber || ''}</p>
    ${stall.category ? `<span class="stall-detail-tag">${stall.category}</span>` : ''}
    <p class="stall-detail-description">${stall.description || ''}</p>
    <div class="stall-detail-actions">
      ${stall.phone ? `
      <button class="stall-detail-btn" onclick="callPhone('${stall.phone}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.5 12 19.79 19.79 0 0 1 1.15 3.18 2 2 0 0 1 3.13 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 5.47 5.47l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        Call ${stall.phone}
      </button>` : ''}
      ${stall.website ? `
      <button class="stall-detail-btn" onclick="openWebsite('${stall.website}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        Visit website
      </button>` : ''}
      ${hasSocial ? `
      <button class="stall-detail-btn" onclick="openWebsite('${socialUrl}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
        ${socialLabel}
      </button>` : ''}
<button class="stall-detail-btn" onclick="openStallMapB('${stall.stallNumber}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        Find on map (Stall ${stall.stallNumber})
      </button>
    </div>
  `;

  panel.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function openStallMapB(stallNumber) {
  fetch('https://raw.githubusercontent.com/keithjmorris/burnham-market-data/main/stall-locations.json')
    .then(r => r.json())
    .then(locations => {
      const stallLoc = locations.find(l => String(l.stallNumber) === String(stallNumber));
console.log('Looking for stall:', stallNumber, 'Found:', stallLoc, 'All stall numbers:', locations.map(l => l.stallNumber));
      document.getElementById('doc-title').textContent = `Stall ${stallNumber} — tap to find on map`;
      const content = document.getElementById('doc-content');
      content.style.padding = '0';
      content.style.position = 'relative';
      content.innerHTML = `<div id="stall-map-leaflet" style="width:100%;height:100%;"></div>`;
      document.getElementById('doc-panel').classList.remove('hidden');
      document.body.style.overflow = 'hidden';

      setTimeout(() => {
        // Centre on selected stall if found, otherwise village centre
        const centre = stallLoc
          ? [stallLoc.lat, stallLoc.lng]
          : [52.9455, 0.7260];
        const zoom = stallLoc ? 20 : 18;

        const m = L.map('stall-map-leaflet', {
          center: centre,
          zoom: zoom,
          zoomControl: true
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 21,
          maxNativeZoom: 19
        }).addTo(m);

        // Only plot the selected stall
if (stallLoc) {
  const targetHtml = '<div style="background:#E8380D;color:white;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.5);">' + stallNumber + '</div>';
  const targetIcon = L.divIcon({
    html: targetHtml,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
  L.marker([stallLoc.lat, stallLoc.lng], { icon: targetIcon }).addTo(m);
}

// Show user's location as blue dot
m.locate({ setView: false, watch: false, enableHighAccuracy: true });
m.on('locationfound', function(e) {
  const userIcon = L.divIcon({
    html: '<div style="background:#4A90E2;border-radius:50%;width:16px;height:16px;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>',
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
  L.marker(e.latlng, { icon: userIcon }).addTo(m);
});

m.invalidateSize();
if (stallLoc) {
  m.setView([stallLoc.lat, stallLoc.lng], zoom, { animate: false });
}
      }, 150);
    })
    .catch(err => {
      console.error('Could not load stall locations:', err);
      openStallMap(stallNumber);
    });
}

function closeStallPanel() {
  document.getElementById('stall-panel').classList.add('hidden');
  document.getElementById('doc-panel').classList.add('hidden');
  document.body.style.overflow = '';
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

function openStallMap(stallNumber) {
  const mapUrl = 'https://raw.githubusercontent.com/keithjmorris/burnham-market-craft-fair/main/images/craft-fair-map.png';
  
  document.getElementById('doc-title').textContent = `Find Stall ${stallNumber} on the map`;
  
  const content = document.getElementById('doc-content');
  content.innerHTML = `
    <div style="width:100%;height:100%;overflow:auto;-webkit-overflow-scrolling:touch;background:#f5f5f5;">
      <img src="${mapUrl}" alt="Craft Fair Map" 
        style="width:200%;max-width:none;height:auto;display:block;"
        id="stall-map-img" />
    </div>
    <div style="position:absolute;top:10px;left:50%;transform:translateX(-50%);
      background:var(--green);color:white;padding:6px 16px;border-radius:20px;
      font-size:13px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.3);">
      Look for stall ${stallNumber}
    </div>
  `;
  
  document.getElementById('doc-panel').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
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

// ── ROGUE TRADERS HUNT TOOL ─────────────────────
function openRogueTraders() {
  document.getElementById('rt-backdrop').classList.remove('hidden');
  document.getElementById('rt-panel').classList.remove('hidden');
  document.getElementById('rt-content').classList.remove('hidden');
  document.getElementById('rt-success').classList.add('hidden');
  document.body.style.overflow = 'hidden';

  renderCipherKey();
  loadRogueProgress();
  renderSightings();
}

function closeRogueTraders() {
  document.getElementById('rt-backdrop').classList.add('hidden');
  document.getElementById('rt-panel').classList.add('hidden');
  document.body.style.overflow = '';
}

function renderCipherKey() {
  const grid = document.getElementById('rt-cipher-grid');
  grid.innerHTML = '';
  for (let i = 1; i <= 26; i++) {
    grid.innerHTML += `
      <div class="rt-cipher-cell">
        <span class="letter">${ROGUE_CIPHER[i]}</span>
        <span class="number">${i}</span>
      </div>`;
  }
}

function addSighting() {
  if (rogueSightings.length >= 15) {
    alert('You can record a maximum of 15 sightings');
    return;
  }
  rogueSightings.push({ shop: '', number: '', item: '' });
  renderSightings();
  saveRogueProgress();
}

function removeSighting(index) {
  rogueSightings.splice(index, 1);
  renderSightings();
  saveRogueProgress();
}

function updateSighting(index, field, value) {
  rogueSightings[index][field] = value;
  if (field === 'number') {
    renderDecodingTable();
  }
  saveRogueProgress();
}

function renderSightings() {
  const list = document.getElementById('rt-sightings-list');
  list.innerHTML = '';
  rogueSightings.forEach((sighting, i) => {
    const row = document.createElement('div');
    row.className = 'rt-sighting-row';
    row.innerHTML = `
      <input type="text" placeholder="Shop name" value="${sighting.shop}" 
        oninput="updateSighting(${i}, 'shop', this.value)" />
      <input type="number" placeholder="Number" value="${sighting.number}" min="1" max="26"
        oninput="updateSighting(${i}, 'number', this.value)" />
      <input type="text" placeholder="Rogue item" value="${sighting.item}"
        oninput="updateSighting(${i}, 'item', this.value)" />
      <button class="rt-sighting-delete" onclick="removeSighting(${i})">✕</button>
    `;
    list.appendChild(row);
  });
  renderDecodingTable();
}

function renderDecodingTable() {
  const table = document.getElementById('rt-decoding-table');
  const validNumbers = rogueSightings
    .map(s => s.number)
    .filter(n => n && n >= 1 && n <= 26);

  if (validNumbers.length === 0) {
    table.innerHTML = '<p style="font-size:12px;color:var(--text-light);">Add sightings with numbers above to see them decoded here.</p>';
    return;
  }

  table.innerHTML = '';
  validNumbers.forEach(num => {
    const letter = ROGUE_CIPHER[num] || '?';
    table.innerHTML += `
      <div class="rt-decoding-row">
        <span class="rt-decoding-number">${num}</span>
        <span class="rt-decoding-letter">${letter}</span>
      </div>`;
  });
}

function saveRogueProgress() {
  const progress = {
    sightings: rogueSightings,
    word1: document.getElementById('rt-word1')?.value || '',
    word2: document.getElementById('rt-word2')?.value || '',
    word3: document.getElementById('rt-word3')?.value || '',
    bonusShop: document.getElementById('rt-bonus-shop')?.value || '',
    bonusReason: document.getElementById('rt-bonus-reason')?.value || '',
    name: document.getElementById('rt-name')?.value || '',
    age: document.querySelector('input[name="rt-age"]:checked')?.value || ''
  };
  localStorage.setItem('rogueTradersProgress', JSON.stringify(progress));
}

function loadRogueProgress() {
  const saved = localStorage.getItem('rogueTradersProgress');
  if (!saved) {
    rogueSightings = [];
    return;
  }

  try {
    const progress = JSON.parse(saved);
    rogueSightings = progress.sightings || [];
    document.getElementById('rt-word1').value = progress.word1 || '';
    document.getElementById('rt-word2').value = progress.word2 || '';
    document.getElementById('rt-word3').value = progress.word3 || '';
    document.getElementById('rt-bonus-shop').value = progress.bonusShop || '';
    document.getElementById('rt-bonus-reason').value = progress.bonusReason || '';
    document.getElementById('rt-name').value = progress.name || '';
    if (progress.age) {
      const radio = document.querySelector(`input[name="rt-age"][value="${progress.age}"]`);
      if (radio) radio.checked = true;
    }
  } catch (err) {
    console.warn('Could not load Rogue Traders progress:', err);
    rogueSightings = [];
  }
}

async function submitRogueTraders() {
  const name = document.getElementById('rt-name').value.trim();
  const age  = document.querySelector('input[name="rt-age"]:checked')?.value;
  const word1 = document.getElementById('rt-word1').value.trim();
  const word2 = document.getElementById('rt-word2').value.trim();
  const word3 = document.getElementById('rt-word3').value.trim();

  if (!name || !age) {
    alert('Please enter your name and select Adult/Child before submitting');
    return;
  }

  if (!word1 && !word2 && !word3) {
    alert('Please enter your final solution before submitting');
    return;
  }

  const data = {
    name,
    age,
    sightings: rogueSightings,
    finalSolution: `${word1} / ${word2} / ${word3}`,
    bonusShop: document.getElementById('rt-bonus-shop').value.trim(),
    bonusReason: document.getElementById('rt-bonus-reason').value.trim(),
    submittedAt: new Date().toISOString()
  };

  const btn = document.querySelector('.rt-submit-btn');
  btn.textContent = 'Submitting…';
  btn.disabled = true;

  try {
    await flowerShowDb.ref('rogue-traders/entries').push(data);
    document.getElementById('rt-content').classList.add('hidden');
    document.getElementById('rt-success').classList.remove('hidden');
    localStorage.removeItem('rogueTradersProgress');
  } catch (err) {
    console.error('Rogue Traders submission error:', err);
    alert('Submission failed — please try again');
    btn.textContent = 'Submit My Entry';
    btn.disabled = false;
  }
}

// ── DOCUMENT PREVIEW PANEL ──────────────────────
function openDocPanel(encodedUrl, encodedTitle) {
  const url   = decodeURIComponent(encodedUrl);
  const title = decodeURIComponent(encodedTitle);

  document.getElementById('doc-title').textContent = title;

  const content = document.getElementById('doc-content');
  content.innerHTML = '';

  const ext = url.split('.').pop().toLowerCase().split('?')[0];

  if (['jpg','jpeg','png','gif','webp'].includes(ext)) {
    // Image preview
    content.innerHTML = `<img src="${url}" alt="${title}" />`;
  } else if (ext === 'pdf') {
    // PDF preview — try iframe first, fallback button for mobile
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      // iOS Safari can't embed PDFs in iframes reliably
      content.innerHTML = `
        <div class="doc-fallback">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <p>Tap below to open the document</p>
          <button class="doc-open-btn" onclick="window.open('${url}', '_blank')">Open PDF</button>
        </div>`;
    } else {
      content.innerHTML = `<iframe src="${url}" style="width:100%;height:100%;min-height:80vh;"></iframe>`;
    }
  } else {
    // Unknown type — just offer a link
    content.innerHTML = `
      <div class="doc-fallback">
        <p>Tap below to open this document</p>
        <button class="doc-open-btn" onclick="window.open('${url}', '_blank')">Open Document</button>
      </div>`;
  }

  document.getElementById('doc-panel').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeDocPanel() {
  document.getElementById('doc-panel').classList.add('hidden');
  document.body.style.overflow = '';
  document.getElementById('doc-content').innerHTML = '';
}
    
// ── INSTALL BANNER ─────────────────────────────
function initInstallBanner() {
  // Don't show if already installed or dismissed recently
  if (window.matchMedia('(display-mode: standalone)').matches) return;
  if (localStorage.getItem('installBannerDismissed')) return;

  const isIOS     = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  if (isIOS) {
    // iOS — show after a short delay with manual instructions
    setTimeout(() => showIOSBanner(), 3000);
  } else if (isAndroid) {
    // Android — listen for the native beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      deferredInstallPrompt = e;
      setTimeout(() => showAndroidBanner(), 3000);
    });
  }

  // Dismiss button
  document.getElementById('install-banner-dismiss').addEventListener('click', () => {
    dismissInstallBanner();
  });
}

function showIOSBanner() {
  const banner = document.getElementById('install-banner');
  const desc   = document.getElementById('install-banner-desc');
  const btn    = document.getElementById('install-banner-btn');
  const steps  = document.getElementById('install-banner-steps');

  desc.textContent = 'Save this app to your home screen for quick access!';
  btn.textContent  = 'Show me how';

  btn.addEventListener('click', () => {
    // Toggle the step-by-step instructions
    if (steps.classList.contains('hidden')) {
      steps.innerHTML = `
  <div class="install-step">
    <div class="install-step-number">1</div>
    <p class="install-step-text">Tap the <strong>three dots •••</strong> at the bottom right of your browser bar</p>
  </div>
  <div class="install-step">
    <div class="install-step-number">2</div>
    <p class="install-step-text">Tap <strong>"Share"</strong> from the menu that appears</p>
  </div>
  <div class="install-step">
    <div class="install-step-number">3</div>
    <p class="install-step-text">Scroll down and tap <strong>"Add to Home Screen"</strong></p>
  </div>
  <div class="install-step">
    <div class="install-step-number">4</div>
    <p class="install-step-text">Tap <strong>"Add"</strong> — the Burnham Market icon will appear on your home screen!</p>
  </div>
`;
      steps.classList.remove('hidden');
      btn.textContent = 'Got it ✓';
    } else {
      dismissInstallBanner();
    }
  });

  banner.classList.remove('hidden');
}

function showAndroidBanner() {
  const banner = document.getElementById('install-banner');
  const desc   = document.getElementById('install-banner-desc');
  const btn    = document.getElementById('install-banner-btn');

  desc.textContent = 'Save this app to your home screen for quick access!';
  btn.textContent  = 'Install';

  btn.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const result = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    dismissInstallBanner();
  });

  banner.classList.remove('hidden');
}

function dismissInstallBanner() {
  document.getElementById('install-banner').classList.add('hidden');
  // Remember for 30 days
  const expiry = Date.now() + (30 * 24 * 60 * 60 * 1000);
  localStorage.setItem('installBannerDismissed', expiry);
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

// ── MONTHLY MARKET HELPERS ──────────────────────
function getCurrentMarketMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getNextMarketDate() {
  const now = new Date();
  const upcoming = CONFIG.MARKET_DATES_2026
    .map(d => new Date(d))
    .filter(d => d >= now)
    .sort((a, b) => a - b);
  return upcoming.length > 0 ? upcoming[0] : null;
}

function isMarketStallActive(stall) {
  const currentMonth = getCurrentMarketMonth();
  return stall.activeMonths && stall.activeMonths.includes(currentMonth);
}

// ── MONTHLY MARKET PANEL ───────────────────────
function openMarketPanel(dateStr) {
  const date = new Date(dateStr);
  const dateLabel = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  document.getElementById('market-panel-title').textContent = `Burnham Market — ${dateLabel}`;
  document.getElementById('market-panel').classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  if (allMarketStalls.length > 0) {
    renderMarketStalls();
    return;
  }

  document.getElementById('market-stall-list').innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>Loading stalls…</p></div>';

  flowerShowDb.ref('monthly-market/stalls').once('value', snap => {
    const raw = snap.val();
    if (!raw) {
      document.getElementById('market-stall-list').innerHTML = '<div class="empty-state"><p>No stalls registered yet.</p></div>';
      return;
    }
    allMarketStalls = Object.values(raw)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    renderMarketStalls();
  });
}

function closeMarketPanel() {
  document.getElementById('market-panel').classList.add('hidden');
  document.body.style.overflow = '';
}

function renderMarketStalls() {
  const list = document.getElementById('market-stall-list');
  const filterBar = document.getElementById('market-filter-bar');
  list.innerHTML = '';

  // Category filter pills
  const categories = ['All', ...new Set(allMarketStalls.map(s => s.category).filter(Boolean).sort())];
  filterBar.innerHTML = categories.map(cat => `
    <button class="market-filter-pill ${(marketCategoryFilter === cat || (cat === 'All' && !marketCategoryFilter)) ? 'active' : ''}"
      onclick="setMarketFilter('${cat}')">
      ${cat}
    </button>
  `).join('');

  const filtered = marketCategoryFilter && marketCategoryFilter !== 'All'
    ? allMarketStalls.filter(s => s.category === marketCategoryFilter)
    : allMarketStalls;

  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-state"><p>No stalls in this category.</p></div>';
    return;
  }

  // Sort: active stalls first, then inactive
  const sorted = [...filtered].sort((a, b) => {
    const aActive = isMarketStallActive(a) ? 0 : 1;
    const bActive = isMarketStallActive(b) ? 0 : 1;
    return aActive - bActive;
  });

  sorted.forEach(stall => {
    list.appendChild(buildMarketStallCard(stall));
  });
}

function setMarketFilter(category) {
  marketCategoryFilter = category === 'All' ? '' : category;
  renderMarketStalls();
  document.getElementById('market-stall-list').scrollTop = 0;
}

function buildMarketStallCard(stall) {
  const card = document.createElement('div');
  const active = isMarketStallActive(stall);
  card.className = `card${active ? '' : ' market-inactive'}`;

  const hasPhone   = !!stall.phone;
  const hasWebsite = !!stall.website;
  const hasSocial  = !!(stall.instagram || stall.facebook);
  const isInstagram = !!stall.instagram;
  const socialUrl  = stall.instagram
    ? `https://www.instagram.com/${stall.instagram}`
    : `https://www.facebook.com/${stall.facebook}`;

  const imgHtml = stall.image
    ? `<img class="card-image" src="${stall.image}" alt="${stall.name}" loading="lazy" onerror="this.style.display='none'">`
    : `<div class="card-image-placeholder"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`;

  card.innerHTML = `
    <div class="card-top">
      ${imgHtml}
      <div class="card-info">
        <p class="card-name">${stall.name || 'Unknown'}</p>
        <p class="card-description">${stall.description ? stall.description.substring(0, 80) + (stall.description.length > 80 ? '…' : '') : ''}</p>
        ${stall.category ? `<div class="card-tags"><span class="card-tag">${stall.category}</span></div>` : ''}
        ${!active ? `<span class="market-inactive-badge">Not at this month's market</span>` : ''}
      </div>
    </div>
    <div class="card-actions market-card-actions">
      <button class="card-action-btn ${hasPhone ? '' : 'disabled'}"
        onclick="${hasPhone ? `callPhone('${stall.phone}')` : ''}" title="Call">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.5 12 19.79 19.79 0 0 1 1.15 3.18 2 2 0 0 1 3.13 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 5.47 5.47l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        Call
      </button>
      <button class="card-action-btn ${hasWebsite ? '' : 'disabled'}"
        onclick="${hasWebsite ? `openWebsite('${stall.website}')` : ''}" title="Website">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        Website
      </button>
      <button class="card-action-btn ${hasSocial ? '' : 'disabled'}"
        onclick="${hasSocial ? `openWebsite('${socialUrl}')` : ''}" title="Social">
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