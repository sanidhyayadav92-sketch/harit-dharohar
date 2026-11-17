/**
 * ============================================================================
 * OPEN-METEO WEATHER ENGINE (FRONTEND)
 * Single External Weather Provider Integration for Harit Dharohar V2
 * 
 * Documentation: https://open-meteo.com/en/docs
 * Attribution: Weather data by Open-Meteo
 * ============================================================================
 */

let hourlyChartInstance = null;
let cachedWeatherData = null;
let lastFetchTime = 0;
const CLIENT_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function fetchAndRenderWeather(lat = 26.4499, lon = 80.3319) {
  const now = Date.now();
  if (cachedWeatherData && (now - lastFetchTime < CLIENT_CACHE_TTL)) {
    renderWeatherUI(cachedWeatherData);
    return cachedWeatherData;
  }

  const queryParams = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,wind_speed_10m,wind_direction_10m,surface_pressure,cloud_cover',
    hourly: 'temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,wind_speed_10m,et0_fao_evapotranspiration',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,sunrise,sunset,et0_fao_evapotranspiration',
    timezone: 'auto'
  });

  const url = `https://api.open-meteo.com/v1/forecast?${queryParams.toString()}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
    const data = await res.json();

    cachedWeatherData = data;
    lastFetchTime = now;
    renderWeatherUI(data);
    return data;
  } catch (err) {
    console.warn('[Open-Meteo Fetch Error]', err);
    // Try fetching from local backend if online
    try {
      const backendRes = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
      const json = await backendRes.json();
      if (json.success && json.data) {
        renderWeatherUI(json.data);
      }
    } catch (backendErr) {
      console.warn('Backend weather fallback unavailable:', backendErr);
    }
  }
}

function renderWeatherUI(data) {
  const current = data.current || {};
  const currentUnits = data.current_units || {};
  const hourly = data.hourly || {};
  const daily = data.daily || {};

  // 1. Current Weather Cards
  const tempVal = current.temperature_2m !== undefined ? current.temperature_2m.toFixed(1) : '28.6';
  const descVal = (current.cloud_cover > 50 ? 'Cloudy' : current.cloud_cover > 20 ? 'Partly Cloudy' : 'Sunny / Clear');

  // Dashboard KPI card
  const dashTemp = document.getElementById('dash-weather-temp');
  if (dashTemp) dashTemp.textContent = `${tempVal} °C`;
  const dashCond = document.getElementById('dash-weather-cond');
  if (dashCond) dashCond.textContent = descVal;

  // Live Weather Card
  const owmTemp = document.getElementById('owm-temp');
  if (owmTemp) owmTemp.textContent = `${tempVal} °C`;
  const owmDesc = document.getElementById('owm-desc');
  if (owmDesc) owmDesc.textContent = descVal;

  const owmHumidity = document.getElementById('owm-humidity');
  if (owmHumidity) owmHumidity.textContent = `${current.relative_humidity_2m || 72} %`;

  const owmPressure = document.getElementById('owm-pressure');
  if (owmPressure) owmPressure.textContent = `${current.surface_pressure ? current.surface_pressure.toFixed(0) : 1009} hPa`;

  const owmWind = document.getElementById('owm-wind');
  if (owmWind) owmWind.textContent = `${current.wind_speed_10m ? current.wind_speed_10m.toFixed(0) : 12} km/h`;

  const owmRain = document.getElementById('owm-rain');
  if (owmRain) owmRain.textContent = `${current.precipitation !== undefined ? current.precipitation.toFixed(1) : '0.0'} mm`;

  const rainProbList = hourly.precipitation_probability ? hourly.precipitation_probability.slice(0, 24) : [];
  const maxRainProb = rainProbList.length > 0 ? Math.max(...rainProbList) : 20;

  const owmRainProb = document.getElementById('owm-rain-prob');
  if (owmRainProb) owmRainProb.textContent = `${maxRainProb} %`;
  const isRainImminent = maxRainProb >= 60;

  const alertBadge = document.getElementById('weather-rain-alert');
  if (alertBadge) {
    if (isRainImminent) {
      alertBadge.className = 'status-badge badge-warning';
      alertBadge.innerHTML = `<i class="fas fa-cloud-rain"></i> Rain Likely (${maxRainProb}%) — Irrigation Hold Recommended`;
    } else {
      alertBadge.className = 'status-badge badge-optimal';
      alertBadge.innerHTML = `<i class="fas fa-sun"></i> Dry Weather (${maxRainProb}% Rain Risk)`;
    }
  }

  // 3. Render 7-Day Forecast Grid
  const dailyContainer = document.getElementById('weather-daily-forecast');
  if (dailyContainer && daily.time) {
    dailyContainer.innerHTML = '';
    daily.time.slice(0, 6).forEach((timeStr, idx) => {
      const date = new Date(timeStr);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const maxT = daily.temperature_2m_max[idx] !== undefined ? daily.temperature_2m_max[idx].toFixed(0) : '--';
      const minT = daily.temperature_2m_min[idx] !== undefined ? daily.temperature_2m_min[idx].toFixed(0) : '--';
      const rainP = daily.precipitation_probability_max[idx] || 0;
      const rainMm = daily.precipitation_sum ? daily.precipitation_sum[idx] : 0;
      const et0 = daily.et0_fao_evapotranspiration ? daily.et0_fao_evapotranspiration[idx] : 0;

      const card = document.createElement('div');
      card.className = 'crop-card';
      card.innerHTML = `
        <div style="font-weight:700; color:#fff; margin-bottom:4px;">${dayName}</div>
        <div style="font-size:1.4rem; font-weight:800; color:#86efac; margin-bottom:4px;">
          ${maxT}° <span style="font-size:0.9rem; color:#94a3b8;">/ ${minT}°C</span>
        </div>
        <div style="font-size:0.75rem; color:#94a3b8;">
          <i class="fas fa-cloud-rain" style="color:#06b6d4;"></i> Rain: ${rainP}% (${rainMm}mm)
        </div>
        <div style="font-size:0.75rem; color:#f59e0b; margin-top:2px;">
          <i class="fas fa-water"></i> ET₀: ${et0 ? et0.toFixed(1) : '3.8'} mm/day
        </div>
      `;
      dailyContainer.appendChild(card);
    });
  }

  // 4. Render 24h Hourly Trend Chart (Chart.js)
  renderHourlyChart(hourly);
}

function renderHourlyChart(hourly) {
  const canvas = document.getElementById('weather-hourly-chart');
  if (!canvas || !window.Chart) return;

  const labels = (hourly.time || []).slice(0, 16).map(t => {
    const d = new Date(t);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
  });

  const temps = (hourly.temperature_2m || []).slice(0, 16);
  const rainProbs = (hourly.precipitation_probability || []).slice(0, 16);

  if (hourlyChartInstance) {
    hourlyChartInstance.destroy();
  }

  const ctx = canvas.getContext('2d');
  hourlyChartInstance = new window.Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Temperature (°C)',
          data: temps,
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          yAxisID: 'yTemp',
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 3
        },
        {
          label: 'Rain Probability (%)',
          data: rainProbs,
          borderColor: '#06b6d4',
          backgroundColor: 'rgba(6, 182, 212, 0.15)',
          yAxisID: 'yRain',
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: { color: '#f0fdf4', font: { family: 'Plus Jakarta Sans', size: 11 } }
        }
      },
      scales: {
        x: {
          ticks: { color: '#94a3b8', font: { size: 10 } },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        },
        yTemp: {
          type: 'linear',
          position: 'left',
          ticks: { color: '#22c55e', font: { size: 10 } },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        },
        yRain: {
          type: 'linear',
          position: 'right',
          min: 0,
          max: 100,
          ticks: { color: '#06b6d4', font: { size: 10 } },
          grid: { display: false }
        }
      }
    }
  });
}
