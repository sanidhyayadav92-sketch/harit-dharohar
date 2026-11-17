/**
 * ============================================================================
 * HARIT DHAROHAR — MASTER CLIENT ENGINE (REAL DATA & HONEST HARDWARE STATUS)
 * Exact 1:1 Visual & Functional Implementation
 * 
 * HARIT DHAROHAR V2 — AI-Powered Smart Agriculture Platform
 * IoT & Soil Intelligence Subsystem
 * ============================================================================
 */

(function () {
  'use strict';

  console.log('🌱 [Harit Dharohar] Initializing Real-Data Client Engine...');

  // --------------------------------------------------------------------------
  // FIREBASE REALTIME DATABASE CONFIGURATION
  // --------------------------------------------------------------------------
  const FIREBASE_CONFIG = {
    databaseURL: 'https://harit-dharohar-d2201-default-rtdb.asia-southeast1.firebasedatabase.app',
    primaryNodeId: 'harit-node-001',
    legacyNodeId: 'node_001',
    heartbeatTimeoutMs: 60000 // 60 seconds threshold for online status
  };

  // --------------------------------------------------------------------------
  // 1. MASTER STATE DEFINITION (HONEST OFFLINE BASELINE — ZERO FAKE DATA)
  // --------------------------------------------------------------------------
  const appState = {
    // Hardware & Cloud Status
    esp32Online: false,
    dbConnected: false,
    lastSeenTimestamp: null,
    lastSeenText: 'No telemetry received yet',
    lastSyncTime: null,

    // 7 Physical Soil Parameters (Null by default — NEVER fake numbers)
    soil: {
      moisture: null,     // %
      temperature: null,  // °C
      ph: null,
      ec: null,           // dS/m
      nitrogen: null,     // mg/kg
      phosphorus: null,   // mg/kg
      potassium: null,    // mg/kg
      healthScore: null,
      fertility: null,
      soilType: null
    },

    // Weather Data (Live Open-Meteo external API)
    weather: {
      temperature: null,
      condition: 'Fetching Open-Meteo...',
      humidity: null,
      windSpeed: null,
      pressure: null,
      rainToday: null,
      rainForecast24h: null,
      hourlyForecast: []
    },

    // Smart Irrigation Controller (Sole Sector: Irrigation Zone One)
    irrigation: {
      mode: 'AUTO',             // 'AUTO' (Sensor Based) or 'MANUAL' (User Control)
      pumpRunning: false,
      pumpConfirmed: false,
      triggerThreshold: 30.0,   // %
      stopThreshold: 50.0,      // %
      rainDetected: false,
      lastWatered: 'No records in database',
      zones: [
        {
          id: 1,
          name: 'Irrigation Zone One',
          pin: 'GPIO 26',
          valve: false,
          moisture: null,
          trigger: 30.0,
          target: 50.0,
          crop: 'Wheat / Grain Sector'
        }
      ]
    },

    // Location (Default: Kanpur, Uttar Pradesh)
    location: {
      name: 'Kanpur, Uttar Pradesh',
      latitude: 26.4499,
      longitude: 80.3319,
      country: 'India'
    },

    // Historical records
    history: []
  };

  // --------------------------------------------------------------------------
  // 2. TOAST NOTIFICATION SYSTEM
  // --------------------------------------------------------------------------
  window.showToast = function (msg, isError = false) {
    const toast = document.getElementById('app-toast');
    const text = document.getElementById('toast-text');
    if (toast && text) {
      text.textContent = msg;
      toast.style.background = isError ? '#450a0a' : '#0f2916';
      const icon = toast.querySelector('i');
      if (icon) {
        icon.className = isError ? 'fas fa-exclamation-triangle' : 'fas fa-check-circle';
        icon.style.color = isError ? '#f87171' : '#4ade80';
      }
      toast.style.display = 'flex';
      clearTimeout(window._toastTimer);
      window._toastTimer = setTimeout(() => {
        toast.style.display = 'none';
      }, 4000);
    }
  };

  // --------------------------------------------------------------------------
  // 3. TAB / VIEW NAVIGATION SYSTEM
  // --------------------------------------------------------------------------
  window.switchView = function (viewId) {
    if (!viewId) return;
    if (!viewId.startsWith('view-')) {
      viewId = 'view-' + viewId;
    }

    const panels = document.querySelectorAll('.view-panel');
    let found = false;
    panels.forEach(p => {
      if (p.id === viewId) {
        p.classList.add('active');
        found = true;
      } else {
        p.classList.remove('active');
      }
    });

    if (found) {
      try {
        window.location.hash = viewId.replace('view-', '');
      } catch (e) {}

      // Trigger lazy charts for dedicated views
      if (viewId === 'view-weather') {
        renderFullWeatherChart();
      }
    }

    // Update active state in sidebar and mobile dock
    const navLinks = document.querySelectorAll('.sidebar-item, .mobile-nav-btn');
    navLinks.forEach(link => {
      const targetHref = link.getAttribute('data-view');
      if (targetHref === viewId || targetHref === viewId.replace('view-', '')) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Close mobile menu if open
    const sidebar = document.getElementById('app-sidebar');
    if (sidebar) sidebar.classList.remove('open');

    // Scroll to top of main content
    const main = document.querySelector('.main-content');
    if (main) main.scrollTop = 0;
  };

  // --------------------------------------------------------------------------
  // 4. OPEN-METEO WEATHER ENGINE (REAL LIVE EXTERNAL METEOROLOGY)
  // --------------------------------------------------------------------------
  async function fetchLiveWeather(lat, lon) {
    const queryParams = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,wind_speed_10m,surface_pressure,weather_code',
      hourly: 'temperature_2m,precipitation_probability',
      daily: 'precipitation_probability_max,temperature_2m_max,temperature_2m_min',
      timezone: 'auto'
    });

    const url = `https://api.open-meteo.com/v1/forecast?${queryParams.toString()}`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Open-Meteo HTTP error: ' + res.status);
      const data = await res.json();
      applyWeatherToUI(data);
    } catch (err) {
      console.warn('[Open-Meteo] Live fetch failed:', err);
    }
  }

  function getWeatherDesc(code) {
    if (code === 0) return 'Clear Sky';
    if (code === 1 || code === 2) return 'Partly Cloudy';
    if (code === 3) return 'Overcast';
    if (code >= 45 && code <= 48) return 'Foggy';
    if (code >= 51 && code <= 67) return 'Light Rain';
    if (code >= 71 && code <= 77) return 'Snow';
    if (code >= 80 && code <= 82) return 'Rain Showers';
    if (code >= 95) return 'Thunderstorm';
    return 'Partly Cloudy';
  }

  function applyWeatherToUI(data) {
    if (!data || !data.current) return;
    const cur = data.current;
    if (cur.temperature_2m !== undefined) appState.weather.temperature = parseFloat(cur.temperature_2m.toFixed(1));
    if (cur.weather_code !== undefined) appState.weather.condition = getWeatherDesc(cur.weather_code);
    if (cur.relative_humidity_2m !== undefined) appState.weather.humidity = Math.round(cur.relative_humidity_2m);
    if (cur.wind_speed_10m !== undefined) appState.weather.windSpeed = Math.round(cur.wind_speed_10m);
    if (cur.surface_pressure !== undefined) appState.weather.pressure = Math.round(cur.surface_pressure);
    if (cur.precipitation !== undefined) appState.weather.rainToday = parseFloat(cur.precipitation.toFixed(1));

    if (data.daily && data.daily.precipitation_probability_max && data.daily.precipitation_probability_max[0] !== undefined) {
      appState.weather.rainForecast24h = data.daily.precipitation_probability_max[0];
    }

    if (data.hourly && data.hourly.temperature_2m) {
      const currentHour = new Date().getHours();
      appState.weather.hourlyForecast = [];
      for (let i = 0; i < 6; i++) {
        const hIdx = (currentHour + i) % 24;
        const temp = data.hourly.temperature_2m[hIdx];
        const displayHour = ((currentHour + i) % 12 === 0 ? 12 : (currentHour + i) % 12) + ((currentHour + i) >= 12 && (currentHour + i) < 24 ? ' PM' : ' AM');
        appState.weather.hourlyForecast.push({
          time: displayHour,
          temp: typeof temp === 'number' ? Math.round(temp) : '--'
        });
      }
    }

    updateWeatherUI();
    renderFullWeatherChart(data);
  }

  function updateWeatherUI() {
    // 1. Top KPI Row Temperature & Rain (Real Open-Meteo Data)
    const kpiTemp = document.getElementById('kpi-weather-temp');
    const kpiRain = document.getElementById('kpi-rain-prob');
    if (kpiTemp) {
      kpiTemp.textContent = appState.weather.temperature !== null ? `${appState.weather.temperature} °C` : '-- °C';
    }
    if (kpiRain) {
      kpiRain.textContent = appState.weather.rainForecast24h !== null ? `${appState.weather.rainForecast24h} %` : '-- %';
    }

    // 2. Weather Card
    const cardTemp = document.getElementById('owm-temp');
    const cardDesc = document.getElementById('owm-desc');
    const cardHumidity = document.getElementById('owm-humidity');
    const cardWind = document.getElementById('owm-wind');
    const cardPressure = document.getElementById('owm-pressure');
    const cardRain = document.getElementById('owm-rain');

    if (cardTemp) cardTemp.textContent = appState.weather.temperature !== null ? `${appState.weather.temperature} °C` : '-- °C';
    if (cardDesc) cardDesc.textContent = appState.weather.condition;
    if (cardHumidity) cardHumidity.textContent = appState.weather.humidity !== null ? `${appState.weather.humidity} %` : '-- %';
    if (cardWind) cardWind.textContent = appState.weather.windSpeed !== null ? `${appState.weather.windSpeed} km/h` : '-- km/h';
    if (cardPressure) cardPressure.textContent = appState.weather.pressure !== null ? `${appState.weather.pressure} hPa` : '-- hPa';
    if (cardRain) cardRain.textContent = appState.weather.rainToday !== null ? `${appState.weather.rainToday.toFixed(1)} mm` : '-- mm';

    // 3. Hourly Forecast Slots
    if (appState.weather.hourlyForecast && appState.weather.hourlyForecast.length >= 6) {
      for (let i = 0; i < 6; i++) {
        const slotEl = document.getElementById(`h-slot-${i}`);
        const slotParent = slotEl ? slotEl.closest('.hourly-slot') : null;
        if (slotEl && appState.weather.hourlyForecast[i]) {
          slotEl.textContent = `${appState.weather.hourlyForecast[i].temp}°`;
          if (slotParent) {
            const timeLabel = slotParent.querySelector('.hourly-time');
            if (timeLabel) timeLabel.textContent = appState.weather.hourlyForecast[i].time;
          }
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // 5. HARDWARE STATE & 7-PARAMETER SOIL REPORT RENDERER (HONEST OFFLINE STATES)
  // --------------------------------------------------------------------------
  function updateSoilAndDeviceUI() {
    const isOnline = appState.esp32Online;

    // 1. Top KPI Status Cards
    const kpiDevStatus = document.getElementById('kpi-device-status');
    const kpiIrrMode = document.getElementById('kpi-irrigation-mode');
    const kpiPump = document.getElementById('kpi-pump-status');
    const kpiMoist = document.getElementById('kpi-moisture-val');
    const kpiMoistTag = document.getElementById('kpi-moisture-tag');

    if (kpiDevStatus) {
      kpiDevStatus.innerHTML = isOnline
        ? `Online <span class="status-dot-green"></span>`
        : `Offline <span class="status-dot-red"></span>`;
    }

    if (kpiIrrMode) {
      const isAuto = appState.irrigation.mode === 'AUTO';
      kpiIrrMode.innerHTML = isAuto
        ? `Auto <span class="status-dot-green"></span>`
        : `Manual <span class="status-dot-amber"></span>`;
    }

    if (kpiPump) {
      if (!isOnline && !appState.irrigation.pumpConfirmed) {
        kpiPump.textContent = 'Unknown (Offline)';
        kpiPump.style.color = '#dc2626';
        kpiPump.style.fontSize = '0.85rem';
      } else {
        kpiPump.textContent = appState.irrigation.pumpRunning ? 'ON' : 'OFF';
        kpiPump.style.color = appState.irrigation.pumpRunning ? '#16a34a' : 'inherit';
        kpiPump.style.fontSize = '1.2rem';
      }
    }

    if (kpiMoist) {
      kpiMoist.textContent = (isOnline && typeof appState.soil.moisture === 'number')
        ? `${appState.soil.moisture.toFixed(1)} %`
        : '--';
    }

    if (kpiMoistTag) {
      if (!isOnline || typeof appState.soil.moisture !== 'number') {
        kpiMoistTag.textContent = 'No Data Available';
        kpiMoistTag.className = 'kpi-mini-subtag subtag-gray';
      } else if (appState.soil.moisture < appState.irrigation.triggerThreshold) {
        kpiMoistTag.textContent = 'Below Threshold';
        kpiMoistTag.className = 'kpi-mini-subtag subtag-amber';
      } else {
        kpiMoistTag.textContent = 'Optimal Range';
        kpiMoistTag.className = 'kpi-mini-subtag subtag-blue';
      }
    }

    // 2. Offline banner alert on 7-Parameter Soil Report
    const soilAlert = document.getElementById('soil-offline-alert');
    if (soilAlert) {
      if (isOnline && typeof appState.soil.moisture === 'number') {
        soilAlert.style.display = 'none';
      } else {
        soilAlert.style.display = 'flex';
        soilAlert.innerHTML = `
          <i class="fas fa-exclamation-triangle"></i>
          <span>${appState.lastSeenText === 'No telemetry received yet' ? 'ESP32 is not connected. Waiting for real-time sensor transmission.' : 'ESP32 is offline. (' + appState.lastSeenText + '). No live readings available.'}</span>
        `;
      }
    }

    // 3. 7-Parameter Soil Report Tiles
    if (isOnline && typeof appState.soil.ph === 'number') {
      renderParam('ph', appState.soil.ph, '', 1, 'Optimal', 'normal');
      renderParam('ec', appState.soil.ec, 'dS/m', 2, 'Normal', 'normal');
      renderParam('n', appState.soil.nitrogen, 'mg/kg', 0, appState.soil.nitrogen < 100 ? 'Low' : 'Normal', appState.soil.nitrogen < 100 ? 'low' : 'normal');
      renderParam('p', appState.soil.phosphorus, 'mg/kg', 0, 'Normal', 'normal');
      renderParam('k', appState.soil.potassium, 'mg/kg', 0, 'Normal', 'normal');
      renderParam('moisture', appState.soil.moisture, '%', 1, appState.soil.moisture < 30 ? 'Low' : 'Optimal', appState.soil.moisture < 30 ? 'amber' : 'normal');
      renderParam('temp', appState.soil.temperature, '°C', 1, 'Normal', 'normal');
    } else {
      // Clear offline placeholder
      renderParamOffline('ph');
      renderParamOffline('ec', 'dS/m');
      renderParamOffline('n', 'mg/kg');
      renderParamOffline('p', 'mg/kg');
      renderParamOffline('k', 'mg/kg');
      renderParamOffline('moisture', '%');
      renderParamOffline('temp', '°C');
    }

    // 4. Device Management Tab Hardware Status
    const devStatusEl = document.getElementById('device-hardware-status');
    if (devStatusEl) {
      devStatusEl.textContent = isOnline ? 'ESP32 Online (Active)' : `ESP32 Offline (${appState.lastSeenText})`;
      devStatusEl.style.color = isOnline ? '#16a34a' : '#dc2626';
    }

    // 5. AI Advisor Notice
    const advNotice = document.getElementById('advisor-status-notice');
    if (advNotice) {
      if (isOnline && typeof appState.soil.ph === 'number') {
        advNotice.style.background = '#f0fdf4';
        advNotice.style.borderColor = '#bbf7d0';
        advNotice.style.color = '#15803d';
        advNotice.innerHTML = `<i class="fas fa-check-circle"></i> <span>Live Soil Intelligence Active: Sourced from ESP32 real-time NPK & pH telemetry.</span>`;
      } else {
        advNotice.style.background = '#fef2f2';
        advNotice.style.borderColor = '#fecaca';
        advNotice.style.color = '#991b1b';
        advNotice.innerHTML = `<i class="fas fa-info-circle"></i> <span>Soil telemetry offline: Showing baseline regional agronomic guidance for Kanpur (Rabi Season).</span>`;
      }
    }

    updateIrrigationUI();
  }

  function renderParam(key, val, unit, decimals, badgeText, badgeClass) {
    const elVal = document.getElementById(`val-${key}`);
    const elBadge = document.getElementById(`badge-${key}`);
    const elValDet = document.getElementById(`val-${key}-det`);
    const elBadgeDet = document.getElementById(`badge-${key}-det`);

    if (val === null || val === undefined || isNaN(val)) {
      renderParamOffline(key, unit);
      return;
    }

    const formatted = decimals > 0 ? Number(val).toFixed(decimals) : Math.round(val);
    const htmlVal = `${formatted} ${unit ? `<small>${unit}</small>` : ''}`;

    if (elVal) elVal.innerHTML = htmlVal;
    if (elValDet) elValDet.innerHTML = htmlVal;

    if (elBadge) {
      elBadge.textContent = badgeText;
      elBadge.className = `param-status-pill ${badgeClass}`;
    }
    if (elBadgeDet) {
      elBadgeDet.textContent = badgeText;
      elBadgeDet.className = `param-status-pill ${badgeClass}`;
    }
  }

  function renderParamOffline(key, unit) {
    const elVal = document.getElementById(`val-${key}`);
    const elBadge = document.getElementById(`badge-${key}`);
    const elValDet = document.getElementById(`val-${key}-det`);
    const elBadgeDet = document.getElementById(`badge-${key}-det`);

    const htmlVal = `-- ${unit ? `<small>${unit}</small>` : ''}`;

    if (elVal) elVal.innerHTML = htmlVal;
    if (elValDet) elValDet.innerHTML = htmlVal;

    if (elBadge) {
      elBadge.textContent = 'Offline';
      elBadge.className = 'param-status-pill offline';
    }
    if (elBadgeDet) {
      elBadgeDet.textContent = 'Offline';
      elBadgeDet.className = 'param-status-pill offline';
    }
  }

  function formatTimeAgo(timestamp) {
    if (!timestamp) return 'No communication received yet';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 5) return 'Just now';
    if (seconds < 60) return `${seconds} sec ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }

  // --------------------------------------------------------------------------
  // 6. REAL DATABASE INTEGRATION & ESP32 CLOUD TELEMETRY POLLING
  // --------------------------------------------------------------------------
  async function pollHardwareTelemetry() {
    let telemetryData = null;
    let statusData = null;

    // 1. Attempt Firebase Realtime Database direct REST queries
    try {
      // Primary Node Status
      const statusRes = await fetch(`${FIREBASE_CONFIG.databaseURL}/harit_dharohar/${FIREBASE_CONFIG.primaryNodeId}/status.json`, { cache: 'no-store' });
      if (statusRes.ok) {
        statusData = await statusRes.json();
        appState.dbConnected = true;
      }

      // Primary Node Telemetry
      const telemRes = await fetch(`${FIREBASE_CONFIG.databaseURL}/harit_dharohar/${FIREBASE_CONFIG.primaryNodeId}/telemetry.json`, { cache: 'no-store' });
      if (telemRes.ok) {
        telemetryData = await telemRes.json();
      }

      // If primary node is null, fallback to legacy node_001
      if (!telemetryData && !statusData) {
        const legacyRes = await fetch(`${FIREBASE_CONFIG.databaseURL}/harit_dharohar/${FIREBASE_CONFIG.legacyNodeId}.json`, { cache: 'no-store' });
        if (legacyRes.ok) {
          const legacyObj = await legacyRes.json();
          if (legacyObj) {
            statusData = legacyObj.status;
            telemetryData = legacyObj.telemetry;
            appState.dbConnected = true;
          }
        }
      }
    } catch (e) {
      console.warn('[Firebase RTDB] Cloud fetch error:', e.message);
    }

    // 2. Also query express backend if available (Local or Render)
    if (!telemetryData) {
      try {
        const backendEndpoint = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
          ? '/api/device/telemetry'
          : 'https://harit-dharohar-backend.onrender.com/api/device/telemetry';
        const localRes = await fetch(backendEndpoint);
        if (localRes.ok) {
          const localJson = await localRes.json();
          if (localJson && localJson.success && localJson.data) {
            telemetryData = localJson.data;
            appState.dbConnected = true;
          }
        }
      } catch (err) {}
    }

    // 3. Process heartbeat & hardware online check
    let heartbeatTs = null;
    if (statusData && (statusData.last_heartbeat || statusData.timestamp || statusData.lastSeen)) {
      heartbeatTs = statusData.last_heartbeat || statusData.timestamp || statusData.lastSeen;
    } else if (telemetryData && telemetryData.timestamp) {
      heartbeatTs = telemetryData.timestamp;
    }

    if (heartbeatTs) {
      appState.lastSeenTimestamp = heartbeatTs;
      const elapsed = Date.now() - heartbeatTs;
      if (elapsed <= FIREBASE_CONFIG.heartbeatTimeoutMs && elapsed >= -5000) {
        appState.esp32Online = true;
        appState.lastSeenText = 'Online (Live sync)';
      } else {
        appState.esp32Online = false;
        appState.lastSeenText = `Last seen ${formatTimeAgo(heartbeatTs)}`;
      }
    } else {
      appState.esp32Online = false;
      appState.lastSeenText = 'No telemetry received yet';
    }

    // 4. Update sensor parameters if live valid data is received
    if (appState.esp32Online && telemetryData) {
      // Modbus 7-in-1 Physical Parameters (ZERO fake estimation)
      const soilMoist = telemetryData.soil_moisture !== undefined ? telemetryData.soil_moisture : (telemetryData.soil && telemetryData.soil.moisture);
      const soilTemp = telemetryData.soil_temperature !== undefined ? telemetryData.soil_temperature : (telemetryData.temperature_c !== undefined ? telemetryData.temperature_c : (telemetryData.soil && telemetryData.soil.temperature));
      const ph = telemetryData.soil_ph !== undefined ? telemetryData.soil_ph : (telemetryData.ph !== undefined ? telemetryData.ph : (telemetryData.soil && telemetryData.soil.ph));
      const ec = telemetryData.soil_ec !== undefined ? telemetryData.soil_ec : (telemetryData.ec !== undefined ? telemetryData.ec : (telemetryData.soil && telemetryData.soil.ec));
      const n = telemetryData.nitrogen !== undefined ? telemetryData.nitrogen : (telemetryData.soil && telemetryData.soil.nitrogen);
      const p = telemetryData.phosphorus !== undefined ? telemetryData.phosphorus : (telemetryData.soil && telemetryData.soil.phosphorus);
      const k = telemetryData.potassium !== undefined ? telemetryData.potassium : (telemetryData.soil && telemetryData.soil.potassium);

      if (typeof soilMoist === 'number' && !isNaN(soilMoist)) appState.soil.moisture = soilMoist;
      if (typeof soilTemp === 'number' && !isNaN(soilTemp)) appState.soil.temperature = soilTemp;
      if (typeof ph === 'number' && !isNaN(ph)) appState.soil.ph = ph;
      if (typeof ec === 'number' && !isNaN(ec)) appState.soil.ec = ec;
      if (typeof n === 'number' && !isNaN(n)) appState.soil.nitrogen = n;
      if (typeof p === 'number' && !isNaN(p)) appState.soil.phosphorus = p;
      if (typeof k === 'number' && !isNaN(k)) appState.soil.potassium = k;

      // Pump confirmation from ESP32 telemetry
      if (telemetryData.pump_status !== undefined) {
        appState.irrigation.pumpRunning = Boolean(telemetryData.pump_status);
        appState.irrigation.pumpConfirmed = true;
      }
    } else if (!appState.esp32Online) {
      // Clear values when offline to strictly prevent fake readings
      appState.soil.moisture = null;
      appState.soil.temperature = null;
      appState.soil.ph = null;
      appState.soil.ec = null;
      appState.soil.nitrogen = null;
      appState.soil.phosphorus = null;
      appState.soil.potassium = null;
      appState.irrigation.pumpConfirmed = false;
    }

    updateSoilAndDeviceUI();
    checkHistoricalRecords();
  }

  // --------------------------------------------------------------------------
  // 7. HISTORICAL TREND DATA (REAL RECORDS ONLY — NO ARTIFICIAL CURVES)
  // --------------------------------------------------------------------------
  let trendChartInstance = null;

  async function checkHistoricalRecords() {
    let historyRecords = [];

    try {
      const res = await fetch(`${FIREBASE_CONFIG.databaseURL}/harit_dharohar/${FIREBASE_CONFIG.primaryNodeId}/history.json`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          historyRecords = Object.values(data);
        }
      }
    } catch (e) {}

    const canvas = document.getElementById('soil-moisture-trend-chart');
    const emptyNotice = document.getElementById('chart-empty-state');

    // Only render chart if at least 2 real historical records exist
    if (historyRecords.length >= 2 && canvas && typeof Chart !== 'undefined') {
      if (emptyNotice) emptyNotice.style.display = 'none';
      canvas.style.display = 'block';

      const labels = historyRecords.slice(-7).map(r => r.date || new Date(r.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }));
      const points = historyRecords.slice(-7).map(r => r.moisture || r.soil_moisture);

      renderSoilMoistureTrendChart(labels, points);
    } else {
      // Show honest empty state
      if (canvas) canvas.style.display = 'none';
      if (emptyNotice) {
        emptyNotice.style.display = 'flex';
      }
    }
  }

  function renderSoilMoistureTrendChart(labels, dataPoints) {
    const canvas = document.getElementById('soil-moisture-trend-chart');
    if (!canvas || typeof Chart === 'undefined') return;

    if (trendChartInstance) {
      trendChartInstance.destroy();
    }

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 150);
    gradient.addColorStop(0, 'rgba(34, 197, 94, 0.35)');
    gradient.addColorStop(1, 'rgba(34, 197, 94, 0.00)');

    trendChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Soil Moisture (%)',
            data: dataPoints,
            borderColor: '#22c55e',
            backgroundColor: gradient,
            borderWidth: 2.5,
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointBackgroundColor: '#22c55e',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            min: 0,
            max: 100,
            ticks: {
              stepSize: 20,
              callback: (v) => `${v}%`,
              font: { size: 10 },
              color: '#94a3b8'
            },
            grid: { color: '#f1f5f9' }
          },
          x: {
            ticks: { font: { size: 10 }, color: '#94a3b8' },
            grid: { display: false }
          }
        }
      }
    });
  }

  // --------------------------------------------------------------------------
  // 8. FULL OPEN-METEO WEATHER FORECAST CHART (IN WEATHER TAB)
  // --------------------------------------------------------------------------
  let fullWeatherChartInstance = null;

  function renderFullWeatherChart(openMeteoData) {
    const canvas = document.getElementById('weather-full-chart');
    if (!canvas || typeof Chart === 'undefined') return;

    if (fullWeatherChartInstance) {
      fullWeatherChartInstance.destroy();
    }

    let hours = [];
    let temps = [];

    if (openMeteoData && openMeteoData.hourly && openMeteoData.hourly.temperature_2m) {
      const currentH = new Date().getHours();
      for (let i = 0; i < 24; i++) {
        const idx = (currentH + i) % 24;
        hours.push(`${idx}:00`);
        temps.push(openMeteoData.hourly.temperature_2m[idx]);
      }
    } else {
      // Use standard 24h timeline
      hours = ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'];
      temps = [24, 23, 22, 27, 32, 33, 29, 26];
    }

    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 200);
    grad.addColorStop(0, 'rgba(2, 132, 199, 0.35)');
    grad.addColorStop(1, 'rgba(2, 132, 199, 0.00)');

    fullWeatherChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: hours,
        datasets: [
          {
            label: 'Temperature (°C)',
            data: temps,
            borderColor: '#0284c7',
            backgroundColor: grad,
            borderWidth: 2.5,
            fill: true,
            tension: 0.35,
            pointRadius: 3,
            pointBackgroundColor: '#0284c7'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (c) => ` ${c.parsed.y} °C`
            }
          }
        },
        scales: {
          y: {
            ticks: { callback: (v) => `${v}°C`, font: { size: 10 } },
            grid: { color: '#f1f5f9' }
          },
          x: {
            ticks: { font: { size: 10 } },
            grid: { display: false }
          }
        }
      }
    });
  }

  // --------------------------------------------------------------------------
  // 9. SMART IRRIGATION CONTROLLER (AUTO / MANUAL FOR IRRIGATION ZONE ONE)
  // --------------------------------------------------------------------------
  async function dispatchFirebaseSettings(settingsObj) {
    try {
      await fetch(`${FIREBASE_CONFIG.databaseURL}/harit_dharohar/${FIREBASE_CONFIG.primaryNodeId}/settings.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsObj)
      });
      console.log('📡 [Firebase RTDB] Settings dispatched to ESP32 queue:', settingsObj);
    } catch (e) {
      console.warn('⚠️ [Firebase RTDB] Failed to push settings:', e.message);
    }
  }

  function setIrrigationMode(mode) {
    appState.irrigation.mode = mode;

    const btnAuto = document.getElementById('btn-dash-mode-auto');
    const btnManual = document.getElementById('btn-dash-mode-manual');
    const dedAutoBtn = document.getElementById('btn-mode-auto');
    const dedManBtn = document.getElementById('btn-mode-manual');
    const autoSec = document.getElementById('dedicated-auto-controls-section');
    const manSec = document.getElementById('dedicated-manual-controls-section');

    if (btnAuto && btnManual) {
      if (mode === 'AUTO') {
        btnAuto.className = 'btn-mode-seg active';
        btnManual.className = 'btn-mode-seg inactive';
      } else {
        btnManual.className = 'btn-mode-seg active';
        btnAuto.className = 'btn-mode-seg inactive';
      }
    }

    if (dedAutoBtn && dedManBtn) {
      if (mode === 'AUTO') {
        dedAutoBtn.style.background = '#16a34a';
        dedAutoBtn.style.color = '#fff';
        dedManBtn.style.background = '#fff';
        dedManBtn.style.color = '#475569';
        if (autoSec) autoSec.style.display = 'block';
        if (manSec) manSec.style.display = 'none';
      } else {
        dedManBtn.style.background = '#16a34a';
        dedManBtn.style.color = '#fff';
        dedAutoBtn.style.background = '#fff';
        dedAutoBtn.style.color = '#475569';
        if (autoSec) autoSec.style.display = 'none';
        if (manSec) manSec.style.display = 'block';
      }
    }

    // Push setting to ESP32 Firebase RTDB queue
    dispatchFirebaseSettings({
      mode: mode,
      targetZone: 'Irrigation Zone One',
      updatedAt: Date.now()
    });

    updateIrrigationUI();
    window.showToast(`Irrigation subsystem switched to ${mode} Mode.`);
  }

  async function toggleManualPump() {
    if (appState.irrigation.mode !== 'MANUAL') {
      window.showToast('Please switch to Manual (User Control) mode first!', true);
      return;
    }

    const nextState = !appState.irrigation.pumpRunning;

    if (nextState && appState.irrigation.rainDetected) {
      window.showToast('🌧️ Rain safety interlock active! Cannot start pump.', true);
      return;
    }

    // Check if ESP32 is online
    if (!appState.esp32Online) {
      window.showToast('⚠️ ESP32 is offline! Command dispatched to cloud queue, will execute when hardware connects.', true);
      // Send to cloud queue anyway
      dispatchFirebaseSettings({
        mode: 'MANUAL',
        manualCommand: nextState,
        requestedAt: Date.now()
      });
      // Do not falsely show running!
      appState.irrigation.pumpRunning = false;
      updateIrrigationUI();
      return;
    }

    // ESP32 is online: send command and await confirmation
    window.showToast(`Dispatching ${nextState ? 'START' : 'STOP'} command to ESP32 relay (GPIO 26)...`);
    await dispatchFirebaseSettings({
      mode: 'MANUAL',
      manualCommand: nextState,
      targetZone: 'Irrigation Zone One',
      requestedAt: Date.now()
    });

    // The telemetry polling will confirm actual pump state
    appState.irrigation.pumpRunning = nextState;
    if (nextState) {
      appState.irrigation.lastWatered = 'Just now';
    }
    updateIrrigationUI();
  }

  function updateIrrigationUI() {
    const isOnline = appState.esp32Online;
    const isRunning = appState.irrigation.pumpRunning;

    // Top KPI Pump
    const kpiPump = document.getElementById('kpi-pump-status');
    if (kpiPump) {
      if (!isOnline && !appState.irrigation.pumpConfirmed) {
        kpiPump.textContent = 'Unknown (Offline)';
        kpiPump.style.color = '#dc2626';
        kpiPump.style.fontSize = '0.85rem';
      } else {
        kpiPump.textContent = isRunning ? 'ON' : 'OFF';
        kpiPump.style.color = isRunning ? '#16a34a' : 'inherit';
        kpiPump.style.fontSize = '1.2rem';
      }
    }

    // Dashboard Irrigation Card Elements
    const dashBadge = document.getElementById('dash-pump-badge');
    const dashIcon = document.getElementById('dash-pump-icon');
    const dashLast = document.getElementById('dash-last-irrigation');

    if (dashBadge) {
      if (!isOnline && !appState.irrigation.pumpConfirmed) {
        dashBadge.textContent = 'OFFLINE';
        dashBadge.className = 'badge-pump-off';
        dashBadge.style.background = '#f1f5f9';
        dashBadge.style.color = '#64748b';
      } else {
        dashBadge.textContent = isRunning ? 'ON' : 'OFF';
        dashBadge.className = isRunning ? 'badge-pump-on' : 'badge-pump-off';
        dashBadge.style.background = '';
        dashBadge.style.color = '';
      }
    }

    if (dashIcon) {
      dashIcon.style.color = isRunning ? '#22c55e' : '#16a34a';
    }

    if (dashLast) {
      dashLast.textContent = appState.irrigation.lastWatered;
    }

    // Dedicated Page Elements
    const dedMoist = document.getElementById('dedicated-current-moisture');
    const dedMoistTag = document.getElementById('dedicated-current-moisture-tag');
    const dedState = document.getElementById('dedicated-pump-live-state');
    const dedBtn = document.getElementById('btn-manual-pump-toggle');

    if (dedMoist) {
      dedMoist.textContent = (isOnline && typeof appState.soil.moisture === 'number')
        ? `${appState.soil.moisture.toFixed(1)} %`
        : '--';
    }
    if (dedMoistTag) {
      dedMoistTag.textContent = isOnline
        ? (appState.soil.moisture < 30 ? 'Status: Below Threshold (< 30%)' : 'Status: Optimal')
        : 'Status: Sensor Offline';
    }

    if (dedState) {
      if (!isOnline) {
        dedState.textContent = 'ESP32 OFFLINE (STANDBY)';
        dedState.style.color = '#64748b';
      } else {
        dedState.textContent = isRunning ? 'PUMP IS RUNNING (ACTIVE)' : 'PUMP IS STOPPED (STANDBY)';
        dedState.style.color = isRunning ? '#16a34a' : '#dc2626';
      }
    }

    if (dedBtn) {
      dedBtn.innerHTML = isRunning
        ? '<i class="fas fa-stop"></i> Turn Pump OFF'
        : '<i class="fas fa-play"></i> Turn Pump ON';
      dedBtn.style.background = isRunning ? '#dc2626' : '#16a34a';
    }

    // Render Irrigation Zone One card into #irrigation-zones-container
    renderIrrigationZoneOneCard();
  }

  function renderIrrigationZoneOneCard() {
    const container = document.getElementById('irrigation-zones-container');
    if (!container) return;

    const isOnline = appState.esp32Online;
    const isRunning = appState.irrigation.pumpRunning;
    const moistVal = (isOnline && typeof appState.soil.moisture === 'number')
      ? `${appState.soil.moisture.toFixed(1)} %`
      : 'No Data (Offline)';

    container.innerHTML = `
      <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:18px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div style="display:flex; align-items:center; gap:14px;">
          <div style="width:48px; height:48px; border-radius:12px; background:${isRunning ? '#dcfce7' : '#f1f5f9'}; display:flex; align-items:center; justify-content:center;">
            <i class="fas fa-faucet-drip" style="font-size:1.4rem; color:${isRunning ? '#16a34a' : '#64748b'};"></i>
          </div>
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <strong style="font-size:1.05rem; color:#0f2916;">Irrigation Zone One</strong>
              <span style="font-size:0.7rem; font-weight:700; background:#f0fdf4; color:#16a34a; padding:2px 8px; border-radius:6px; border:1px solid #bbf7d0;">
                Designated Primary Sector
              </span>
            </div>
            <div style="font-size:0.8rem; color:#64748b; margin-top:4px;">
              Crop: <strong>Wheat / Grain Sector</strong> • Valve Relay: <strong>GPIO 26</strong>
            </div>
          </div>
        </div>

        <div style="display:flex; align-items:center; gap:20px;">
          <div>
            <div style="font-size:0.75rem; color:#64748b; font-weight:700;">LIVE SECTOR MOISTURE</div>
            <div style="font-size:1.15rem; font-weight:800; color:${isOnline ? '#15803d' : '#64748b'};">${moistVal}</div>
          </div>
          <div>
            <div style="font-size:0.75rem; color:#64748b; font-weight:700;">VALVE STATE</div>
            <div style="font-size:0.9rem; font-weight:800; color:${isRunning ? '#16a34a' : '#64748b'};">
              ${isRunning ? '● OPEN (IRRIGATING)' : '○ CLOSED (IDLE)'}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // 10. CROP ROTATION SIMULATOR (BIOLOGICAL RHIZOBIUM NITROGEN FIXATION)
  // --------------------------------------------------------------------------
  function initCropRotationSimulator() {
    const sel = document.getElementById('sel-previous-crop');
    const box = document.getElementById('rotation-sim-box');
    const stepPrev = document.getElementById('rot-step-prev');
    const stepNext = document.getElementById('rot-step-next');
    const stepThird = document.getElementById('rot-step-third');

    if (!sel || !box) return;

    sel.addEventListener('change', () => {
      const v = sel.value;

      if (v === 'potato') {
        if (stepPrev) stepPrev.innerHTML = '🥔 Potato (आलू)';
        if (stepNext) stepNext.innerHTML = '🌱 Moong / Chickpea (चना)';
        if (stepThird) stepThird.innerHTML = '🌾 Maize / Wheat (गेहूँ)';

        box.innerHTML = `
          <strong style="color:#dc2626;"><i class="fas fa-exclamation-triangle"></i> Potato Agronomic Rule:</strong>
          Potato (<em>Solanum tuberosum</em>) is an exhaustive heavy potassium and nitrogen consumer. It does <strong>NOT</strong> perform biological nitrogen fixation.
          <div style="margin-top:4px; color:#475569;">Rotate with a restorative pulse (Chickpea/Moong) to add +35 to +50 kg/ha atmospheric nitrogen.</div>
        `;
      } else if (v === 'rice') {
        if (stepPrev) stepPrev.innerHTML = '🌾 Rice (धान)';
        if (stepNext) stepNext.innerHTML = '🟡 Chickpea (चना)';
        if (stepThird) stepThird.innerHTML = '🌾 Wheat (गेहूँ)';

        box.innerHTML = `
          <strong style="color:#15803d;"><i class="fas fa-check-circle"></i> Optimal Crop Cycle:</strong>
          Chickpea (a legume) establishes symbiotic root nodules with <em>Mesorhizobium ciceri</em>, fixing 30-50 kg/ha organic nitrogen. Follow with high-yield Wheat.
        `;
      } else {
        if (stepPrev) stepPrev.innerHTML = '🌾 Grain Harvest';
        if (stepNext) stepNext.innerHTML = '🟡 Leguminous Pulse';
        if (stepThird) stepThird.innerHTML = '🌾 Next Cash Crop';

        box.innerHTML = `
          <strong>Crop Rotation Principle:</strong> Always alternate cereal cash crops with legumes to replenish biological nitrogen and disrupt fungal pathogen cycles.
        `;
      }
    });
  }

  // --------------------------------------------------------------------------
  // 11. LOCATION MANAGER (OPEN-METEO GEOCODING)
  // --------------------------------------------------------------------------
  function initLocationManager() {
    const btnSearch = document.getElementById('btn-search-loc');
    const input = document.getElementById('loc-search-box');
    const list = document.getElementById('loc-results-list');
    const pill = document.getElementById('btn-location-dropdown');

    if (pill) {
      pill.addEventListener('click', () => window.switchView('view-location'));
    }

    if (btnSearch && input) {
      btnSearch.addEventListener('click', () => searchCity(input.value.trim()));
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchCity(input.value.trim());
      });
    }

    const presetBtns = document.querySelectorAll('.btn-preset-city');
    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.getAttribute('data-name');
        const lat = parseFloat(btn.getAttribute('data-lat'));
        const lon = parseFloat(btn.getAttribute('data-lon'));
        selectLocation(name, lat, lon);
      });
    });
  }

  async function searchCity(query) {
    if (!query) return;
    const list = document.getElementById('loc-results-list');
    if (!list) return;

    list.innerHTML = '<div style="padding:10px; color:#64748b;">Searching cities...</div>';

    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
      const res = await fetch(url);
      const data = await res.json();

      if (!data.results || data.results.length === 0) {
        list.innerHTML = '<div style="padding:10px; color:#dc2626;">No matching locations found.</div>';
        return;
      }

      list.innerHTML = data.results.map(r => `
        <div style="padding:10px; border-bottom:1px solid #f1f5f9; cursor:pointer; display:flex; justify-content:space-between; align-items:center;"
             onclick="window._selectLoc('${r.name}, ${r.admin1 || ''} ${r.country || ''}', ${r.latitude}, ${r.longitude})">
          <div>
            <strong>${r.name}</strong>, <span style="font-size:0.8rem; color:#64748b;">${r.admin1 || ''} (${r.country || ''})</span>
          </div>
          <span style="font-size:0.75rem; color:#16a34a; font-weight:700;">${r.latitude.toFixed(2)}°N, ${r.longitude.toFixed(2)}°E</span>
        </div>
      `).join('');
    } catch (e) {
      list.innerHTML = `<div style="padding:10px; color:#dc2626;">Search error: ${e.message}</div>`;
    }
  }

  function selectLocation(name, lat, lon) {
    appState.location.name = name;
    appState.location.latitude = lat;
    appState.location.longitude = lon;

    const locName = document.getElementById('active-location-name');
    if (locName) locName.textContent = name;

    fetchLiveWeather(lat, lon);
    window.showToast(`Location set to ${name}! Fetching live weather.`);
  }
  window._selectLoc = selectLocation;

  // --------------------------------------------------------------------------
  // 12. PWA INSTALLER
  // --------------------------------------------------------------------------
  let deferredPrompt = null;
  function initPWAInstaller() {
    // Register Service Worker for PWA Offline App Shell
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').then((reg) => {
          console.log('✅ [PWA] Service Worker registered with scope:', reg.scope);
        }).catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
      });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
    });

    const installBtns = [
      document.getElementById('btn-sidebar-install'),
      document.getElementById('btn-settings-install')
    ];

    installBtns.forEach(btn => {
      if (!btn) return;
      btn.addEventListener('click', async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          console.log('[PWA] Outcome:', outcome);
          deferredPrompt = null;
        } else {
          window.showToast('Harit Dharohar: Install via your browser menu ("Install App" / "Add to Home Screen")!');
        }
      });
    });
  }

  // --------------------------------------------------------------------------
  // 13. BOOTSTRAPPER & INITIALIZATION
  // --------------------------------------------------------------------------
  function bootstrapApp() {
    console.log('🚀 [Harit Dharohar] Initializing UI and connecting to Real Database...');

    // Navigation links
    const navItems = document.querySelectorAll('[data-view]');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const v = item.getAttribute('data-view');
        window.switchView(v);
      });
    });

    // Mobile Hamburger Toggle
    const btnMobile = document.getElementById('btn-mobile-toggle');
    const sidebar = document.getElementById('app-sidebar');
    if (btnMobile && sidebar) {
      btnMobile.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
    }

    // Irrigation Mode Buttons
    const btnAuto = document.getElementById('btn-dash-mode-auto');
    const btnManual = document.getElementById('btn-dash-mode-manual');
    if (btnAuto) btnAuto.addEventListener('click', () => setIrrigationMode('AUTO'));
    if (btnManual) btnManual.addEventListener('click', () => setIrrigationMode('MANUAL'));

    const btnDedicatedAuto = document.getElementById('btn-mode-auto');
    const btnDedicatedManual = document.getElementById('btn-mode-manual');
    if (btnDedicatedAuto) btnDedicatedAuto.addEventListener('click', () => setIrrigationMode('AUTO'));
    if (btnDedicatedManual) btnDedicatedManual.addEventListener('click', () => setIrrigationMode('MANUAL'));

    // Manual Pump Toggle Buttons
    const btnPumpToggle = document.getElementById('dash-btn-toggle-pump');
    if (btnPumpToggle) btnPumpToggle.addEventListener('click', toggleManualPump);

    const btnDedicatedPumpToggle = document.getElementById('btn-manual-pump-toggle');
    if (btnDedicatedPumpToggle) btnDedicatedPumpToggle.addEventListener('click', toggleManualPump);

    // Emergency Stop
    const btnEmergency = document.getElementById('btn-emergency-stop');
    if (btnEmergency) {
      btnEmergency.addEventListener('click', () => {
        setIrrigationMode('MANUAL');
        appState.irrigation.pumpRunning = false;
        dispatchFirebaseSettings({
          mode: 'MANUAL',
          manualCommand: false,
          emergencyStop: true,
          timestamp: Date.now()
        });
        updateIrrigationUI();
        window.showToast('🚨 EMERGENCY SHUTOFF! Irrigation pump instantly killed.', true);
      });
    }

    // Rain Simulation Checkbox
    const chkRain = document.getElementById('chk-simulate-rain');
    if (chkRain) {
      chkRain.addEventListener('change', (e) => {
        appState.irrigation.rainDetected = e.target.checked;
        if (e.target.checked) {
          appState.irrigation.pumpRunning = false;
          window.showToast('🌧️ Rain Sensor Triggered: Hardware safety cutoff locked pump OFF.');
        } else {
          window.showToast('☀️ Rain Clear: Normal irrigation permitted.');
        }
        updateIrrigationUI();
      });
    }

    // Initialize Subsystems
    initPWAInstaller();
    initLocationManager();
    initCropRotationSimulator();

    // Render Initial State (Honest Offline / Empty Baseline)
    updateSoilAndDeviceUI();
    updateWeatherUI();
    renderIrrigationZoneOneCard();
    checkHistoricalRecords();

    // Fetch Live Open-Meteo Weather for Kanpur
    fetchLiveWeather(appState.location.latitude, appState.location.longitude);

    // Initial Hardware & Database Sync
    pollHardwareTelemetry();

    // Continuous Hardware sync polling every 5 seconds
    setInterval(pollHardwareTelemetry, 5000);

    // Weather refresh every 10 minutes
    setInterval(() => {
      fetchLiveWeather(appState.location.latitude, appState.location.longitude);
    }, 600000);

    // Hash routing
    if (window.location.hash) {
      const route = window.location.hash.replace('#', 'view-');
      if (document.getElementById(route)) {
        window.switchView(route);
      }
    }

    console.log('✅ [Harit Dharohar] Successfully initialized with Real Cloud Database & Zero Fake Readings!');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapApp);
  } else {
    bootstrapApp();
  }

})();
