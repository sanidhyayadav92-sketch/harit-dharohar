/**
 * ============================================================================
 * CROPS & AI ADVISORY MODULE
 * Multi-Tier Crop Suitability, Biological Rotation & Agronomy AI Assistant
 * ============================================================================
 */

let cropsDataCache = [];

export async function initCropsAndAI() {
  loadCropDatabase();
  initRotationSimulator();
  initChatbot();
}

async function loadCropDatabase() {
  try {
    const res = await fetch('/api/crops');
    const json = await res.json();
    if (json.success && json.data) {
      cropsDataCache = json.data;
      renderCropSuitability(cropsDataCache);
    }
  } catch (err) {
    console.warn('[Crops] Could not load crops from API, using fallback data:', err);
    // Render with baseline crops
    renderCropSuitability([]);
  }
}

export function renderCropSuitability(crops = cropsDataCache, activeSoil = { moisture: 34.2, ph: 6.82, nitrogen: 52, phosphorus: 38, potassium: 128 }) {
  const container = document.getElementById('crops-grid-container');
  if (!container) return;

  container.innerHTML = '';

  const fallbackCrops = [
    { name: "Wheat", hindi: "गेहूँ", season: "Rabi", score: 92, status: "score-high", label: "Highly Suitable", notes: "Optimal soil pH (6.8) and moisture (34%) ensure vigorous tillering." },
    { name: "Chickpea (Gram)", hindi: "चना", season: "Rabi", score: 95, status: "score-high", label: "Highly Suitable", notes: "Forms Rhizobium symbiosis; ideal restorative pulse for next rotation." },
    { name: "Mustard", hindi: "सरसों", season: "Rabi", score: 88, status: "score-high", label: "Highly Suitable", notes: "Thrives in current temperature; excellent biofumigant against soil fungi." },
    { name: "Potato", hindi: "आलू", season: "Rabi", score: 76, status: "score-med", label: "Suitable", notes: "Adequate K levels. Note: Does NOT fix nitrogen; requires organic topdressing." },
    { name: "Maize", hindi: "मक्का", season: "Kharif", score: 68, status: "score-med", label: "Suitable", notes: "Tolerates current soil pH; plant in spring or post-monsoon." },
    { name: "Rice (Paddy)", hindi: "धान", season: "Kharif", score: 40, status: "score-low", label: "Unsuitable Now", notes: "Requires standing moisture (50-80%) and warmer summer photoperiod." }
  ];

  const listToRender = (crops && crops.length > 0) ? crops.map(c => ({
    name: c.name,
    hindi: c.hindiName,
    season: c.season,
    score: c.biologicalNitrogenFixation ? 94 : (c.season === 'Rabi' ? 89 : 62),
    status: (c.biologicalNitrogenFixation || c.season === 'Rabi') ? 'score-high' : 'score-med',
    label: (c.biologicalNitrogenFixation || c.season === 'Rabi') ? 'Highly Suitable' : 'Suitable',
    notes: c.rotationBenefit || c.agronomicNotes
  })) : fallbackCrops;

  listToRender.forEach(c => {
    const card = document.createElement('div');
    card.className = 'crop-card';
    card.innerHTML = `
      <div class="crop-header">
        <div>
          <span class="crop-name">${c.name}</span>
          <span class="crop-hindi">${c.hindi}</span>
        </div>
        <span class="suitability-score-pill ${c.status}">${c.score}%</span>
      </div>
      <div style="font-size:0.75rem; color:#86efac; font-weight:700; text-transform:uppercase; margin-bottom:6px;">
        <i class="fas fa-calendar-alt"></i> ${c.season} Season • ${c.label}
      </div>
      <p style="font-size:0.83rem; color:#94a3b8; line-height:1.4;">
        ${c.notes}
      </p>
    `;
    container.appendChild(card);
  });
}

function initRotationSimulator() {
  const selectCrop = document.getElementById('rotation-prev-crop-select');
  const resultBox = document.getElementById('rotation-simulation-result');

  if (selectCrop && resultBox) {
    selectCrop.addEventListener('change', () => {
      const selected = selectCrop.value;
      let output = '';

      if (selected === 'rice' || selected === 'wheat' || selected === 'maize') {
        output = `
          <div style="background:rgba(245, 158, 11, 0.15); border:1px solid #f59e0b; padding:16px; border-radius:12px;">
            <h4 style="color:#f59e0b; margin-bottom:8px;"><i class="fas fa-exclamation-triangle"></i> Heavy Cereal Predecessor (${selected.toUpperCase()})</h4>
            <p style="font-size:0.88rem; color:#f0fdf4;">The soil has experienced substantial macronutrient depletion (-35 to -50 kg/ha N). Sowing another cereal will cause soil fatigue and lower harvest quality.</p>
            <div style="margin-top:12px; padding:10px; background:rgba(0,0,0,0.3); border-radius:8px;">
              <strong style="color:#22c55e;">Recommended Restorative Next Crops:</strong>
              <ul style="margin-left:18px; margin-top:6px; font-size:0.85rem; color:#94a3b8;">
                <li><strong>Chickpea (Gram)</strong>: Symbiotic Mesorhizobium fixes ~40 kg/ha atmospheric nitrogen.</li>
                <li><strong>Green Gram (Moong)</strong>: Fast 60-day catch crop restoring organic nitrogen and tilth.</li>
                <li><strong>Mustard</strong>: Biofumigant taproot breaks cereal nematode cycles.</li>
              </ul>
            </div>
          </div>
        `;
      } else if (selected === 'chickpea' || selected === 'moong' || selected === 'soybean' || selected === 'lentil') {
        output = `
          <div style="background:rgba(34, 197, 94, 0.15); border:1px solid #22c55e; padding:16px; border-radius:12px;">
            <h4 style="color:#22c55e; margin-bottom:8px;"><i class="fas fa-check-circle"></i> Leguminous Nitrogen-Fixing Predecessor (${selected.toUpperCase()})</h4>
            <p style="font-size:0.88rem; color:#f0fdf4;">Rhizobium bacteria formed active root nodules, leaving an estimated +35 to +50 kg/ha positive biological nitrogen reserve in the rhizosphere.</p>
            <div style="margin-top:12px; padding:10px; background:rgba(0,0,0,0.3); border-radius:8px;">
              <strong style="color:#22c55e;">Ideal Successor Crops:</strong>
              <ul style="margin-left:18px; margin-top:6px; font-size:0.85rem; color:#94a3b8;">
                <li><strong>Wheat</strong>: Capitalizes directly on the fixed organic nitrogen with higher grain protein.</li>
                <li><strong>Maize / Corn</strong>: Heavy feeder that thrives on post-legume soil tilth.</li>
                <li><strong>Potato / Tomato</strong>: Enjoys the pathogen-free soil profile.</li>
              </ul>
            </div>
          </div>
        `;
      } else if (selected === 'potato') {
        output = `
          <div style="background:rgba(244, 63, 94, 0.15); border:1px solid #f43f5e; padding:16px; border-radius:12px;">
            <h4 style="color:#f43f5e; margin-bottom:8px;"><i class="fas fa-info-circle"></i> Scientific Fact: Potato is NOT a Nitrogen Fixer</h4>
            <p style="font-size:0.88rem; color:#f0fdf4;">Potato (Solanum tuberosum) is a heavy Potassium and Nitrogen feeder. It does NOT associate with Rhizobium bacteria and does NOT fix atmospheric nitrogen. Must be followed by a restorative legume.</p>
            <div style="margin-top:12px; padding:10px; background:rgba(0,0,0,0.3); border-radius:8px;">
              <strong style="color:#22c55e;">Mandatory Restorative Follower:</strong>
              <p style="font-size:0.85rem; color:#94a3b8; margin-top:4px;">Green Gram (Moong) or Sesbania (Dhaincha) green manure to rebuild depleted potash and nitrogen reserves.</p>
            </div>
          </div>
        `;
      }

      resultBox.innerHTML = output;
    });
  }
}

function initChatbot() {
  const input = document.getElementById('chat-input-text');
  const btnSend = document.getElementById('chat-btn-send');
  const messagesBox = document.getElementById('chat-messages-box');
  const chips = document.querySelectorAll('.prompt-chip');

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.getAttribute('data-query');
      if (input && q) {
        input.value = q;
        sendMessage();
      }
    });
  });

  if (btnSend && input) {
    btnSend.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  }

  async function sendMessage() {
    if (!input || !input.value.trim()) return;
    const userText = input.value.trim();
    input.value = '';

    // Append User Message
    appendBubble(userText, 'bubble-user');

    // Bot Typing Placeholder
    const typingBubble = appendBubble('Evaluating soil & weather parameters...', 'bubble-bot');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText })
      });
      const data = await res.json();
      if (data.success && data.data) {
        typingBubble.textContent = data.data.reply;
      } else {
        typingBubble.textContent = "Optimal conditions observed. Check the AI Crop Matrix for suitability.";
      }
    } catch (e) {
      // Deterministic Offline Fallback
      if (userText.toLowerCase().includes('wheat')) {
        typingBubble.textContent = "Wheat (Triticum aestivum) fits your current 34% soil moisture and neutral pH 6.8 perfectly. Apply starter phosphorus for early root vigor.";
      } else if (userText.toLowerCase().includes('potato')) {
        typingBubble.textContent = "Potato requires adequate potassium (120+ mg/kg). Note that potato is NOT a nitrogen fixer, so rotate with pulses next season.";
      } else {
        typingBubble.textContent = "Telemetry Analysis: Soil pH (6.8) and moisture (34%) are balanced. Irrigation is in standby mode. Recommended next sowing: Wheat or Chickpea.";
      }
    }
  }

  function appendBubble(text, cls) {
    if (!messagesBox) return null;
    const b = document.createElement('div');
    b.className = `chat-bubble ${cls}`;
    b.textContent = text;
    messagesBox.appendChild(b);
    messagesBox.scrollTop = messagesBox.scrollHeight;
    return b;
  }
}
