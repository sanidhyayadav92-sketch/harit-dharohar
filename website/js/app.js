/**
 * ============================================================================
 * HARIT DHAROHAR V2 — MASTER APPLICATION CONTROLLER
 * HARIT DHAROHAR V2 — AI-Powered Smart Agriculture Platform
 * Matches Official Reference UI System
 * ============================================================================
 */

import { initPWAInstaller } from './pwa-installer.js';
import { fetchAndRenderWeather } from './weather.js';
import { initLocationManager, getCurrentLocation } from './location.js';
import { initIrrigationController } from './irrigation.js';

let trendsChartInstance = null;

// Global Toast System
window.showToast = function(msg) {
  const toast = document.getElementById('app-toast');
  const text = document.getElementById('toast-text');
  if (toast && text) {
    text.textContent = msg;
    toast.style.display = 'flex';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 3500);
  }
};

// Global View Switcher
window.switchView = function(viewId) {
  const panels = document.querySelectorAll('.view-panel');
  panels.forEach(p => p.classList.remove('active'));

  const target = document.getElementById(viewId);
  if (target) {
    target.classList.add('active');
    window.location.hash = viewId.replace('view-', '');
  }

  // Update navigation highlighting
  const navLinks = document.querySelectorAll('.sidebar-item, .mobile-nav-btn');
  navLinks.forEach(link => {
    const targetHref = link.getAttribute('data-view');
    if (targetHref === viewId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Close mobile sidebar if open
  const sidebar = document.getElementById('app-sidebar');
  if (sidebar) sidebar.classList.remove('open');
};

document.addEventListener('DOMContentLoaded', () => {
  console.log('🌱 Initializing Harit Dharohar V2 Nature-Tech Dashboard...');

  // 1. Navigation Event Listeners
  const navItems = document.querySelectorAll('[data-view]');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const viewId = item.getAttribute('data-view');
      window.switchView(viewId);
    });
  });

  // Mobile Menu Toggle
  const btnMobile = document.getElementById('btn-mobile-toggle');
  const sidebar = document.getElementById('app-sidebar');
  if (btnMobile && sidebar) {
    btnMobile.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  // 2. Initialize Subsystems
  initPWAInstaller();
  initLocationManager();
  initIrrigationController();

  // 3. Render 7-Day Soil Parameter Trends Chart (Exact Match to Screenshot)
  renderSoilTrendsChart();

  // 4. Fetch Live Open-Meteo Weather for Kanpur
  const loc = getCurrentLocation();
  fetchAndRenderWeather(loc.latitude, loc.longitude);

  // 5. Hash Routing
  if (window.location.hash) {
    const route = window.location.hash.replace('#', 'view-');
    if (document.getElementById(route)) {
      window.switchView(route);
    }
  }

  // 6. Crop Rotation Select Simulator Listener
  const selPrev = document.getElementById('sel-previous-crop');
  const simBox = document.getElementById('rotation-sim-box');
  if (selPrev && simBox) {
    selPrev.addEventListener('change', () => {
      const v = selPrev.value;
      if (v === 'potato') {
        simBox.innerHTML = `
          <i class="fas fa-exclamation-triangle" style="color:#dc2626; font-size:1.2rem;"></i>
          <div>
            <strong>Scientific Fact:</strong> Potato is a heavy potassium/nitrogen consumer and does <strong>NOT</strong> fix biological nitrogen. It must be rotated with a restorative pulse (Moong or Chickpea) to rebuild soil health and disrupt fungal wilt.
          </div>
        `;
      } else if (v === 'chickpea' || v === 'moong') {
        simBox.innerHTML = `
          <i class="fas fa-check-circle" style="color:#16a34a; font-size:1.2rem;"></i>
          <div>
            <strong>Biological Nitrogen Restored:</strong> Legume nodules with Rhizobium bacteria added +35 to +50 kg/ha organic nitrogen. Follow with heavy grain feeders such as Wheat or Maize.
          </div>
        `;
      } else {
        simBox.innerHTML = `
          <i class="fas fa-lightbulb" style="color:#d97706; font-size:1.2rem;"></i>
          <div>
            <strong>Recommendation:</strong> After exhaustive cereals, plant a restorative pulse (Chickpea/Lentil) to replenish nitrogen and break cereal nematode cycles.
          </div>
        `;
      }
    });
  }

  console.log('✅ Harit Dharohar V2 Loaded Successfully.');
});

function renderSoilTrendsChart() {
  const canvas = document.getElementById('soil-trends-chart');
  if (!canvas || !window.Chart) return;

  if (trendsChartInstance) {
    trendsChartInstance.destroy();
  }

  const ctx = canvas.getContext('2d');
  trendsChartInstance = new window.Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Jan 16', 'Jan 17', 'Jan 18', 'Jan 19', 'Jan 20', 'Jan 21', 'Jan 22'],
      datasets: [
        {
          label: 'K (Potassium)',
          data: [205, 208, 212, 210, 215, 218, 222],
          borderColor: '#22c55e',
          backgroundColor: '#22c55e',
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 3
        },
        {
          label: 'Moisture (%)',
          data: [31, 33, 35, 32, 30, 32, 34],
          borderColor: '#0ea5e9',
          backgroundColor: '#0ea5e9',
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 3
        },
        {
          label: 'N (Nitrogen)',
          data: [40, 41, 43, 42, 45, 42, 44],
          borderColor: '#ef4444',
          backgroundColor: '#ef4444',
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 3
        },
        {
          label: 'P (Phosphorus)',
          data: [27, 28, 29, 28, 30, 29, 31],
          borderColor: '#f97316',
          backgroundColor: '#f97316',
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f2916',
          titleFont: { family: 'Plus Jakarta Sans', size: 12 },
          bodyFont: { family: 'Plus Jakarta Sans', size: 11 }
        }
      },
      scales: {
        x: {
          ticks: { color: '#64748b', font: { size: 10, family: 'Plus Jakarta Sans' } },
          grid: { display: false }
        },
        y: {
          min: 0,
          max: 250,
          ticks: { stepSize: 50, color: '#64748b', font: { size: 10 } },
          grid: { color: '#f1f5f9' }
        }
      }
    }
  });
}
