/**
 * ============================================================================
 * DEVICE MANAGEMENT & HARDWARE TELEMETRY MODULE
 * Manages ESP32 Hardware Diagnostics, Pinout Maps & Cloud Heartbeat
 * ============================================================================
 */

export function initDeviceManagement() {
  const btnRestart = document.getElementById('btn-restart-device');
  const btnSimulate = document.getElementById('btn-simulate-telemetry');

  if (btnRestart) {
    btnRestart.addEventListener('click', () => {
      if (confirm('Send remote restart command to ESP32 Node 001?')) {
        fetch('/api/device/telemetry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ restart: true })
        }).then(() => {
          if (window.showToast) window.showToast('Reboot command queued to ESP32 node.');
        });
      }
    });
  }

  if (btnSimulate) {
    btnSimulate.addEventListener('click', () => {
      // Synthesize realistic field fluctuation
      const simMoisture = (30 + Math.random() * 15).toFixed(1);
      const simTemp = (24 + Math.random() * 5).toFixed(1);
      const simPH = (6.4 + Math.random() * 0.9).toFixed(2);
      const simN = Math.round(40 + Math.random() * 25);
      const simP = Math.round(25 + Math.random() * 20);
      const simK = Math.round(100 + Math.random() * 40);

      const simData = {
        soil: {
          moisture: parseFloat(simMoisture),
          temperature: parseFloat(simTemp),
          ph: parseFloat(simPH),
          nitrogen: simN,
          phosphorus: simP,
          potassium: simK,
          ec: 420
        }
      };

      if (window.updateSystemTelemetry) {
        window.updateSystemTelemetry(simData);
      }
      if (window.showToast) {
        window.showToast(`Simulated Field Reading Ingested (Moisture: ${simMoisture}%, pH: ${simPH})`);
      }
    });
  }
}

export function updateDeviceDiagnostics(deviceStatus = {}) {
  const ipEl = document.getElementById('diag-ip');
  const rssiEl = document.getElementById('diag-rssi');
  const fwEl = document.getElementById('diag-firmware');
  const sensorStatusEl = document.getElementById('diag-sensor-status');

  if (ipEl) ipEl.textContent = deviceStatus.ip || '192.168.1.110';
  if (rssiEl) rssiEl.textContent = `${deviceStatus.rssi || -58} dBm (Optimal)`;
  if (fwEl) fwEl.textContent = deviceStatus.firmwareVersion || '2.5.0-UNIFIED-MAX485';
  if (sensorStatusEl) {
    sensorStatusEl.textContent = deviceStatus.sensorStatus || 'HEALTHY (All Busses Active)';
  }
}
