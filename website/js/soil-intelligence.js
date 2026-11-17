/**
 * ============================================================================
 * SOIL INTELLIGENCE & 7-PARAMETER TELEMETRY MODULE
 * Evaluates Soil Fertility, NPK Macronutrients & Microbiome Balance
 * ============================================================================
 */

let npkChartInstance = null;

export function renderSoilIntelligence(soil = {}) {
  const moisture = typeof soil.moisture === 'number' ? soil.moisture : 34.2;
  const temp = typeof soil.temperature === 'number' ? soil.temperature : 25.6;
  const ph = typeof soil.ph === 'number' ? soil.ph : 6.82;
  const n = typeof soil.nitrogen === 'number' ? soil.nitrogen : 52;
  const p = typeof soil.phosphorus === 'number' ? soil.phosphorus : 38;
  const k = typeof soil.potassium === 'number' ? soil.potassium : 128;
  const ec = typeof soil.ec === 'number' ? soil.ec : 410;

  // 1. Update Core Metric Cards
  updateCardValue('soil-moisture-val', `${moisture.toFixed(1)}%`);
  updateCardValue('soil-temp-val', `${temp.toFixed(1)}°C`);
  updateCardValue('soil-ph-val', ph.toFixed(2));
  updateCardValue('soil-n-val', `${n} mg/kg`);
  updateCardValue('soil-p-val', `${p} mg/kg`);
  updateCardValue('soil-k-val', `${k} mg/kg`);
  updateCardValue('soil-ec-val', `${ec} µS/cm`);

  // 2. Status Badges
  setBadge('badge-moisture', moisture < 20 ? 'badge-danger' : moisture <= 45 ? 'badge-optimal' : 'badge-warning',
           moisture < 20 ? 'Critical Deficit' : moisture <= 45 ? 'Optimal' : 'Saturated');

  setBadge('badge-ph', ph < 6.0 ? 'badge-warning' : ph <= 7.5 ? 'badge-optimal' : 'badge-warning',
           ph < 6.0 ? 'Acidic' : ph <= 7.5 ? 'Optimal Neutral' : 'Alkaline');

  setBadge('badge-n', n < 20 ? 'badge-danger' : n <= 55 ? 'badge-optimal' : 'badge-warning',
           n < 20 ? 'Low Deficit' : n <= 55 ? 'Adequate' : 'Surplus');

  setBadge('badge-p', p < 15 ? 'badge-danger' : p <= 40 ? 'badge-optimal' : 'badge-warning',
           p < 15 ? 'Low Deficit' : p <= 40 ? 'Adequate' : 'Surplus');

  setBadge('badge-k', k < 60 ? 'badge-danger' : k <= 140 ? 'badge-optimal' : 'badge-warning',
           k < 60 ? 'Low Deficit' : k <= 140 ? 'Adequate' : 'Surplus');

  setBadge('badge-ec', ec < 800 ? 'badge-optimal' : 'badge-warning',
           ec < 800 ? 'Non-Saline' : 'Salinity Alert');

  // 3. Overall Soil Health & Fertility Calculation
  const totalNPK = n + p + k;
  const totalEl = document.getElementById('soil-total-npk');
  if (totalEl) totalEl.textContent = `${totalNPK} mg/kg`;

  let healthScore = 72;
  if (ph >= 6.2 && ph <= 7.5) healthScore += 12;
  if (totalNPK >= 160 && totalNPK <= 300) healthScore += 10;
  if (moisture >= 26 && moisture <= 42) healthScore += 6;
  healthScore = Math.min(96, Math.max(20, healthScore));

  const scoreEl = document.getElementById('soil-health-score');
  if (scoreEl) scoreEl.textContent = healthScore;

  const fertilityStatusEl = document.getElementById('soil-fertility-rating');
  if (fertilityStatusEl) {
    fertilityStatusEl.textContent = healthScore >= 80 ? 'HIGH FERTILITY' : healthScore >= 50 ? 'MEDIUM FERTILITY' : 'LOW FERTILITY';
  }

  // 4. Render NPK Bar / Radar Chart (Chart.js)
  renderNPKChart(n, p, k);
}

function updateCardValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setBadge(id, className, text) {
  const el = document.getElementById(id);
  if (el) {
    el.className = `status-badge ${className}`;
    el.textContent = text;
  }
}

function renderNPKChart(n, p, k) {
  const canvas = document.getElementById('soil-npk-chart');
  if (!canvas || !window.Chart) return;

  if (npkChartInstance) {
    npkChartInstance.destroy();
  }

  const ctx = canvas.getContext('2d');
  npkChartInstance = new window.Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Nitrogen (N)', 'Phosphorus (P)', 'Potassium (K)'],
      datasets: [
        {
          label: 'Current Field Telemetry (mg/kg)',
          data: [n, p, k],
          backgroundColor: [
            'rgba(34, 197, 94, 0.7)',
            'rgba(245, 158, 11, 0.7)',
            'rgba(168, 85, 247, 0.7)'
          ],
          borderColor: ['#22c55e', '#f59e0b', '#a855f7'],
          borderWidth: 2,
          borderRadius: 8
        },
        {
          label: 'Optimal Agronomic Target (mg/kg)',
          data: [45, 30, 110],
          type: 'line',
          borderColor: '#06b6d4',
          borderDash: [5, 5],
          pointRadius: 4,
          pointBackgroundColor: '#06b6d4',
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#f0fdf4', font: { family: 'Plus Jakarta Sans', size: 11 } } }
      },
      scales: {
        x: {
          ticks: { color: '#94a3b8', font: { size: 11 } },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        },
        y: {
          ticks: { color: '#94a3b8', font: { size: 10 } },
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          suggestedMax: 160
        }
      }
    }
  });
}
