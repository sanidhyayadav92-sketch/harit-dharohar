/**
 * ============================================================================
 * LOCATION MANAGEMENT MODULE
 * Dynamic Geocoding via Open-Meteo & Farm Coordinate Management
 * Default Location: Kanpur, Uttar Pradesh, India (lat: 26.4499, lon: 80.3319)
 * ============================================================================
 */

import { fetchAndRenderWeather } from './weather.js';

let currentLocation = {
  city: 'Kanpur',
  state: 'Uttar Pradesh',
  country: 'India',
  latitude: 26.4499,
  longitude: 80.3319
};

export function initLocationManager() {
  loadSavedLocation();

  const searchInput = document.getElementById('location-search-input');
  const searchResults = document.getElementById('location-search-results');
  const btnSaveManual = document.getElementById('btn-save-manual-location');
  const topbarPill = document.getElementById('topbar-location-pill');

  if (topbarPill) {
    topbarPill.addEventListener('click', () => {
      if (window.switchView) window.switchView('view-location');
    });
  }

  // Geocoding Search with Open-Meteo
  let debounceTimeout = null;
  if (searchInput && searchResults) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      clearTimeout(debounceTimeout);
      if (q.length < 2) {
        searchResults.innerHTML = '';
        return;
      }

      debounceTimeout = setTimeout(async () => {
        searchResults.innerHTML = '<div style="padding:10px; color:#86efac;">Searching cities...</div>';
        try {
          const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=en&format=json`;
          const res = await fetch(url);
          const data = await res.json();

          searchResults.innerHTML = '';
          if (data.results && data.results.length > 0) {
            data.results.forEach(item => {
              const row = document.createElement('div');
              row.className = 'location-search-item';
              row.style.cssText = 'padding:12px; border-bottom:1px solid rgba(74,222,128,0.15); cursor:pointer; font-size:0.9rem;';
              row.innerHTML = `<strong>${item.name}</strong>, ${item.admin1 ? item.admin1 + ', ' : ''}${item.country} <span style="font-size:0.75rem; color:#94a3b8; margin-left:8px;">(${item.latitude.toFixed(2)}°, ${item.longitude.toFixed(2)}°)</span>`;
              
              row.addEventListener('click', () => {
                applyNewLocation({
                  city: item.name,
                  state: item.admin1 || '',
                  country: item.country,
                  latitude: item.latitude,
                  longitude: item.longitude
                });
                searchResults.innerHTML = '';
                searchInput.value = '';
                if (window.showToast) window.showToast(`Location set to ${item.name}, ${item.country}`);
              });

              searchResults.appendChild(row);
            });
          } else {
            searchResults.innerHTML = '<div style="padding:10px; color:#94a3b8;">No matching location found.</div>';
          }
        } catch (err) {
          searchResults.innerHTML = '<div style="padding:10px; color:#f43f5e;">Geocoding search failed. Check network connection.</div>';
        }
      }, 350);
    });
  }

  // Manual Coordinates Save
  if (btnSaveManual) {
    btnSaveManual.addEventListener('click', () => {
      const latInput = document.getElementById('manual-lat-input');
      const lonInput = document.getElementById('manual-lon-input');
      const nameInput = document.getElementById('manual-city-input');

      const lat = parseFloat(latInput?.value);
      const lon = parseFloat(lonInput?.value);
      const city = nameInput?.value.trim() || 'Custom Farm Location';

      if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        applyNewLocation({
          city,
          state: '',
          country: '',
          latitude: lat,
          longitude: lon
        });
        if (window.showToast) window.showToast(`Coordinates saved: ${lat.toFixed(4)}°, ${lon.toFixed(4)}°`);
      } else {
        alert('Please enter valid Latitude (-90 to 90) and Longitude (-180 to 180).');
      }
    });
  }
}

function loadSavedLocation() {
  const saved = localStorage.getItem('harit_dharohar_location');
  if (saved) {
    try {
      currentLocation = JSON.parse(saved);
    } catch (e) {}
  }
  updateLocationUI();
}

export function getCurrentLocation() {
  return currentLocation;
}

function applyNewLocation(loc) {
  currentLocation = loc;
  localStorage.setItem('harit_dharohar_location', JSON.stringify(loc));
  updateLocationUI();
  // Refresh Open-Meteo weather
  fetchAndRenderWeather(loc.latitude, loc.longitude);
}

function updateLocationUI() {
  const label = `${currentLocation.city}${currentLocation.state ? ', ' + currentLocation.state : ''}`;
  const pillText = document.getElementById('topbar-location-text');
  if (pillText) pillText.textContent = label;

  const activeDisplay = document.getElementById('active-location-display');
  if (activeDisplay) {
    activeDisplay.innerHTML = `
      <strong>${label}</strong> (${currentLocation.country || 'India'})<br>
      <span style="font-size:0.8rem; color:#86efac; font-family:'JetBrains Mono';">
        Lat: ${currentLocation.latitude.toFixed(4)}° N, Lon: ${currentLocation.longitude.toFixed(4)}° E
      </span>
    `;
  }
}
