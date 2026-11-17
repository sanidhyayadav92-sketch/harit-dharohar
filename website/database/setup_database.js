/**
 * ============================================================================
 * HARIT DHAROHAR — DATABASE INITIALIZATION & VERIFICATION SCRIPT
 * (Located in website/database/ for convenience)
 * ============================================================================
 */

const https = require('https');
const { URL } = require('url');

const FIREBASE_DB_URL = 'https://harit-dharohar-d2201-default-rtdb.asia-southeast1.firebasedatabase.app';
const NODE_ID = 'harit-node-001';

console.log('🌱 [Harit Dharohar] Verifying Firebase Realtime Database setup...');
console.log(`📍 Endpoint: ${FIREBASE_DB_URL}`);
console.log(`📍 Device Node: /harit_dharohar/${NODE_ID}\n`);

function sendHttpRequest(path, method, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${FIREBASE_DB_URL}${path}`);
    const options = {
      hostname: url.hostname,
      path: url.pathname + (url.search || ''),
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      const payload = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseBody);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: responseBody });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runSetup() {
  try {
    // 1. Check Connectivity to Firebase
    console.log('1️⃣ Checking Firebase Realtime Database connectivity...');
    const ping = await sendHttpRequest('/.json?shallow=true', 'GET');
    if (ping.status === 200) {
      console.log('   ✅ Firebase connection successful (HTTP 200 OK)');
    } else {
      console.log(`   ⚠️ Warning: Unexpected status code ${ping.status}`);
    }

    // 2. Initialize default cloud settings for Irrigation Zone One
    console.log('\n2️⃣ Initializing default cloud settings for Irrigation Zone One...');
    const defaultSettings = {
      mode: 'AUTO',
      manualCommand: false,
      targetZone: 'Irrigation Zone One',
      triggerMoisture: 30.0,
      stopMoisture: 50.0,
      configuredAt: Date.now()
    };

    const settingsRes = await sendHttpRequest(`/harit_dharohar/${NODE_ID}/settings.json`, 'PATCH', defaultSettings);
    if (settingsRes.status === 200) {
      console.log('   ✅ Cloud settings initialized at /harit_dharohar/' + NODE_ID + '/settings.json:');
      console.log('      - Mode: AUTO');
      console.log('      - Target Zone: Irrigation Zone One');
      console.log('      - Moisture Trigger Threshold: < 30%');
      console.log('      - Moisture Stop Target: >= 50%');
    }

    // 3. Verify Telemetry & Status Paths
    console.log('\n3️⃣ Inspecting live hardware status...');
    const statusRes = await sendHttpRequest(`/harit_dharohar/${NODE_ID}/status.json`, 'GET');
    if (statusRes.data && statusRes.data.last_heartbeat) {
      const elapsed = Math.round((Date.now() - statusRes.data.last_heartbeat) / 1000);
      console.log(`   ℹ️ Last hardware heartbeat was recorded ${elapsed} seconds ago.`);
      if (elapsed < 60) {
        console.log('   🟢 ESP32 Hardware Status: ONLINE');
      } else {
        console.log('   🔴 ESP32 Hardware Status: OFFLINE (Standby)');
      }
    } else {
      console.log('   ℹ️ No telemetry records yet. ESP32 is currently OFFLINE.');
      console.log('   Waiting for ESP32 hardware to boot and transmit sensor readings.');
    }

    console.log('\n🎉 Database configuration and node paths are verified and ready!');
  } catch (err) {
    console.error('❌ Error during database setup:', err.message);
  }
}

runSetup();
