/**
 * ============================================================================
 * SMART IRRIGATION CONTROLLER MODULE (AUTO & MANUAL MODES)
 * 
 * Auto Mode:
 *   - Runs automatically according to soil sensor moisture readings:
 *   - Starts when Soil Moisture < Dry Trigger Threshold (default < 25%)
 *   - Shuts off when Soil Moisture >= Stop Threshold (default >= 50%)
 *   - Hardware rain interlock immediately forces pump OFF during rain.
 * 
 * Manual Mode:
 *   - Direct manual ON/OFF control of the pump from the dashboard.
 *   - Instantly toggles the pump relay via cloud/backend command.
 * ============================================================================
 */

let irrigationState = {
  mode: "AUTO",             // "AUTO" or "MANUAL"
  pumpRunning: false,       // true = ON, false = OFF
  triggerThreshold: 25.0,   // % moisture to start pump in auto mode
  stopThreshold: 50.0,      // % moisture to shut off pump in auto mode
  currentMoisture: 32.0,    // % current moisture reading
  rainDetected: false,      // rain sensor state
  lastWatered: "20 Jan, 06:30 AM"
};

export function initIrrigationController() {
  console.log('[Irrigation] Initializing Smart Irrigation Controller...');

  // 1. Dashboard Mode Toggle Buttons
  const btnDashToggleMode = document.getElementById('dash-btn-toggle-mode');
  if (btnDashToggleMode) {
    btnDashToggleMode.addEventListener('click', toggleIrrigationMode);
  }

  // 2. Dashboard Manual Pump Control Buttons
  const btnDashPumpOn = document.getElementById('dash-btn-pump-on');
  const btnDashPumpOff = document.getElementById('dash-btn-pump-off');
  if (btnDashPumpOn) {
    btnDashPumpOn.addEventListener('click', () => setManualPump(true));
  }
  if (btnDashPumpOff) {
    btnDashPumpOff.addEventListener('click', () => setManualPump(false));
  }

  // 3. Dedicated Irrigation Page Controls
  const btnModeAuto = document.getElementById('btn-mode-auto');
  const btnModeManual = document.getElementById('btn-mode-manual');
  if (btnModeAuto) {
    btnModeAuto.addEventListener('click', () => setIrrigationMode("AUTO"));
  }
  if (btnModeManual) {
    btnModeManual.addEventListener('click', () => setIrrigationMode("MANUAL"));
  }

  // Toggle switch in dedicated view
  const btnManualToggle = document.getElementById('btn-manual-pump-toggle');
  if (btnManualToggle) {
    btnManualToggle.addEventListener('click', () => {
      if (irrigationState.mode !== "MANUAL") {
        if (window.showToast) window.showToast('Please switch to MANUAL mode first to override pump.');
        return;
      }
      setManualPump(!irrigationState.pumpRunning);
    });
  }

  // Emergency Stop Button
  const btnEmergency = document.getElementById('btn-emergency-stop');
  if (btnEmergency) {
    btnEmergency.addEventListener('click', () => {
      setManualPump(false);
      setIrrigationMode("MANUAL");
      if (window.showToast) window.showToast('EMERGENCY SHUTOFF! Pump stopped and locked in safe state.');
    });
  }

  // Threshold Slider
  const sliderDry = document.getElementById('slider-dry-threshold');
  const valDry = document.getElementById('val-dry-threshold');
  if (sliderDry && valDry) {
    sliderDry.addEventListener('input', (e) => {
      irrigationState.triggerThreshold = parseFloat(e.target.value);
      valDry.textContent = `${irrigationState.triggerThreshold}%`;
      updateIrrigationUI();
    });
  }

  // Fetch initial status from backend if available
  fetch('/api/irrigation/status')
    .then(res => res.json())
    .then(json => {
      if (json.success && json.data) {
        irrigationState.mode = json.data.mode || "AUTO";
        irrigationState.pumpRunning = json.data.pumpStatus || false;
        if (json.data.currentSoilMoisture) irrigationState.currentMoisture = json.data.currentSoilMoisture;
        updateIrrigationUI();
      }
    })
    .catch(() => updateIrrigationUI());

  updateIrrigationUI();
}

/**
 * Toggles between AUTO and MANUAL mode
 */
export function toggleIrrigationMode() {
  const newMode = irrigationState.mode === "AUTO" ? "MANUAL" : "AUTO";
  setIrrigationMode(newMode);
}

export function setIrrigationMode(mode) {
  irrigationState.mode = mode;

  // If switched to AUTO mode, immediately evaluate sensor condition
  if (mode === "AUTO") {
    evaluateAutoIrrigation();
  }

  // Sync with backend API
  fetch('/api/irrigation/mode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode })
  }).catch(() => {});

  updateIrrigationUI();
  if (window.showToast) {
    window.showToast(`Irrigation Subsystem switched to ${mode} Mode`);
  }
}

/**
 * Manually turns the pump ON or OFF (Allowed only in MANUAL mode)
 */
export function setManualPump(enable) {
  if (irrigationState.mode !== "MANUAL") {
    if (window.showToast) window.showToast('Switch to MANUAL mode first to control pump manually!');
    return;
  }

  if (enable && irrigationState.rainDetected) {
    if (window.showToast) window.showToast('Rain detected by physical sensor! Relay cannot be activated.');
    return;
  }

  irrigationState.pumpRunning = enable;
  if (enable) {
    irrigationState.lastWatered = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  // Sync with backend
  fetch('/api/irrigation/pump', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pump: enable })
  }).catch(() => {});

  updateIrrigationUI();
  if (window.showToast) {
    window.showToast(`Manual Command: Water Pump turned ${enable ? 'ON' : 'OFF'}`);
  }
}

/**
 * Evaluates sensor readings in AUTO mode
 */
export function evaluateAutoIrrigation() {
  if (irrigationState.mode !== "AUTO") return;

  // Safety: Rain locks pump off
  if (irrigationState.rainDetected) {
    irrigationState.pumpRunning = false;
    updateIrrigationUI();
    return;
  }

  // Auto sensor logic: Start when dry (< triggerThreshold), stop when optimal (>= stopThreshold)
  if (irrigationState.currentMoisture < irrigationState.triggerThreshold && !irrigationState.pumpRunning) {
    irrigationState.pumpRunning = true;
    irrigationState.lastWatered = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    if (window.showToast) {
      window.showToast(`Auto Mode: Soil Moisture is ${irrigationState.currentMoisture.toFixed(1)}% (< ${irrigationState.triggerThreshold}%). Pump activated.`);
    }
  } else if (irrigationState.currentMoisture >= irrigationState.stopThreshold && irrigationState.pumpRunning) {
    irrigationState.pumpRunning = false;
    if (window.showToast) {
      window.showToast(`Auto Mode: Soil reached ${irrigationState.currentMoisture.toFixed(1)}% (>= ${irrigationState.stopThreshold}%). Pump stopped.`);
    }
  }

  updateIrrigationUI();
}

/**
 * Ingests external telemetry updates
 */
export function updateIrrigationStateFromTelemetry(telemetry = {}) {
  if (telemetry.soil && typeof telemetry.soil.moisture === 'number') {
    irrigationState.currentMoisture = telemetry.soil.moisture;
  }
  if (telemetry.weatherStation && telemetry.weatherStation.rainDetected !== undefined) {
    irrigationState.rainDetected = telemetry.weatherStation.rainDetected;
  }

  if (irrigationState.mode === "AUTO") {
    evaluateAutoIrrigation();
  } else {
    updateIrrigationUI();
  }
}

/**
 * Updates all Dashboard & Page elements across the UI
 */
function updateIrrigationUI() {
  const isAuto = (irrigationState.mode === "AUTO");
  const isRunning = irrigationState.pumpRunning;

  // 1. Main Dashboard Top KPI Card
  const kpiPumpVal = document.getElementById('dash-kpi-pump-val');
  const kpiPumpBadge = document.getElementById('dash-kpi-pump-badge');
  if (kpiPumpVal) {
    kpiPumpVal.textContent = isRunning ? "Pump ON" : "Pump OFF";
    kpiPumpVal.style.color = isRunning ? "#16a34a" : "#0f2916";
  }
  if (kpiPumpBadge) {
    kpiPumpBadge.textContent = isAuto ? "Auto Mode" : "Manual Mode";
    kpiPumpBadge.className = isAuto ? "kpi-badge badge-auto" : "kpi-badge badge-moderate";
  }

  // 2. Main Dashboard Bottom Irrigation Status Card
  const modeBadge = document.getElementById('dash-irrigation-mode-badge');
  const statusHeading = document.getElementById('dash-irrigation-status-heading');
  const statusSubtext = document.getElementById('dash-irrigation-status-subtext');
  const pumpIcon = document.getElementById('dash-pump-graphic-icon');
  const manualControlsRow = document.getElementById('dash-manual-controls-row');
  const autoSensorInfo = document.getElementById('dash-auto-sensor-info');

  if (modeBadge) {
    modeBadge.textContent = isAuto ? "Mode : Automatic" : "Mode : Manual";
    modeBadge.className = isAuto ? "param-badge optimal" : "param-badge moderate";
  }

  if (statusHeading) {
    statusHeading.textContent = isRunning 
      ? (isAuto ? "Pump is ON (Auto Pulse)" : "Pump is ON (Manual)")
      : "Pump is OFF";
    statusHeading.style.color = isRunning ? "#16a34a" : "#0f2916";
  }

  if (statusSubtext) {
    statusSubtext.innerHTML = `Last Irrigation: <strong>${irrigationState.lastWatered}</strong>`;
  }

  if (pumpIcon) {
    pumpIcon.style.color = isRunning ? "#22c55e" : "#16a34a";
    if (isRunning) {
      pumpIcon.style.filter = "drop-shadow(0 0 10px rgba(34,197,94,0.6))";
    } else {
      pumpIcon.style.filter = "none";
    }
  }

  // Show or hide manual buttons on dashboard
  if (manualControlsRow) {
    manualControlsRow.style.display = isAuto ? "none" : "flex";
  }
  if (autoSensorInfo) {
    autoSensorInfo.style.display = isAuto ? "block" : "none";
  }

  // Update button active state
  const btnDashOn = document.getElementById('dash-btn-pump-on');
  const btnDashOff = document.getElementById('dash-btn-pump-off');
  if (btnDashOn && btnDashOff) {
    if (isRunning) {
      btnDashOn.style.background = "#16a34a";
      btnDashOn.style.color = "#fff";
      btnDashOff.style.background = "#f1f5f9";
      btnDashOff.style.color = "#64748b";
    } else {
      btnDashOff.style.background = "#dc2626";
      btnDashOff.style.color = "#fff";
      btnDashOn.style.background = "#f1f5f9";
      btnDashOn.style.color = "#64748b";
    }
  }

  // 3. Dedicated Smart Irrigation Page Elements
  const fullModeAuto = document.getElementById('btn-mode-auto');
  const fullModeManual = document.getElementById('btn-mode-manual');
  if (fullModeAuto && fullModeManual) {
    if (isAuto) {
      fullModeAuto.style.background = "#16a34a";
      fullModeAuto.style.color = "#fff";
      fullModeManual.style.background = "#fff";
      fullModeManual.style.color = "#475569";
    } else {
      fullModeManual.style.background = "#d97706";
      fullModeManual.style.color = "#fff";
      fullModeAuto.style.background = "#fff";
      fullModeAuto.style.color = "#475569";
    }
  }

  const manualSection = document.getElementById('dedicated-manual-controls-section');
  const autoSection = document.getElementById('dedicated-auto-controls-section');
  if (manualSection) manualSection.style.display = isAuto ? "none" : "block";
  if (autoSection) autoSection.style.display = isAuto ? "block" : "none";

  const btnDedicatedToggle = document.getElementById('btn-manual-pump-toggle');
  if (btnDedicatedToggle) {
    btnDedicatedToggle.innerHTML = isRunning 
      ? '<i class="fas fa-power-off"></i> Turn Pump OFF'
      : '<i class="fas fa-play"></i> Turn Pump ON';
    btnDedicatedToggle.style.background = isRunning ? "#dc2626" : "#16a34a";
    btnDedicatedToggle.style.color = "#fff";
  }

  const liveStateText = document.getElementById('dedicated-pump-live-state');
  if (liveStateText) {
    liveStateText.textContent = isRunning ? "PUMP IS RUNNING" : "PUMP IS STOPPED";
    liveStateText.style.color = isRunning ? "#16a34a" : "#dc2626";
  }

  const liveMoistureVal = document.getElementById('dedicated-current-moisture');
  if (liveMoistureVal) {
    liveMoistureVal.textContent = `${irrigationState.currentMoisture.toFixed(1)}%`;
  }
}
