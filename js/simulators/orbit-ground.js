// Orbit Pass, RF Waterfall & Ground Station Attack Surface Simulator
import { sounds } from '../audio.js';

export class OrbitSimulator {
  constructor(orbitCanvasId, waterfallCanvasId) {
    this.orbitCanvas = document.getElementById(orbitCanvasId);
    this.waterfallCanvas = document.getElementById(waterfallCanvasId);
    if (!this.orbitCanvas || !this.waterfallCanvas) return;

    this.orbitCtx = this.orbitCanvas.getContext('2d');
    this.waterfallCtx = this.waterfallCanvas.getContext('2d');

    this.orbitAngle = 0; // Satellite position along orbit track
    this.animationFrame = null;
    this.waterfallHistory = [];
    this.antennaAzimuth = 184.2;
    this.antennaElevation = 45.0;
    this.isCompromised = false;

    this.initCanvases();
    this.bindEvents();
    this.startLoop();
  }

  initCanvases() {
    const dpr = window.devicePixelRatio || 1;

    // Orbit Canvas
    const oRect = this.orbitCanvas.getBoundingClientRect();
    this.oWidth = oRect.width || 420;
    this.oHeight = oRect.height || 280;
    this.orbitCanvas.width = this.oWidth * dpr;
    this.orbitCanvas.height = this.oHeight * dpr;
    this.orbitCtx.scale(dpr, dpr);

    // Waterfall Canvas
    const wRect = this.waterfallCanvas.getBoundingClientRect();
    this.wWidth = wRect.width || 420;
    this.wHeight = wRect.height || 180;
    this.waterfallCanvas.width = this.wWidth * dpr;
    this.waterfallCanvas.height = this.wHeight * dpr;
    this.waterfallCtx.scale(dpr, dpr);

    // Initialize waterfall rows
    this.waterfallRows = 45;
  }

  bindEvents() {
    window.addEventListener('resize', () => this.initCanvases());

    const btnOverride = document.getElementById('btn-gs-override');
    if (btnOverride) {
      btnOverride.addEventListener('click', () => this.executeGroundStationExploit());
    }

    const btnResetGs = document.getElementById('btn-gs-reset');
    if (btnResetGs) {
      btnResetGs.addEventListener('click', () => this.resetGroundStation());
    }
  }

  executeGroundStationExploit() {
    sounds.playAlert();
    this.isCompromised = true;
    this.antennaAzimuth = 45.0; // Deliberate misalignment!
    this.antennaElevation = 10.0;

    const responseBox = document.getElementById('gs-api-response');
    if (responseBox) {
      responseBox.innerHTML = `
        <div class="api-output success mono">
          <div class="status-code">HTTP/1.1 200 OK [REST API EXPLOIT SUCCESSFUL]</div>
          <pre>{
  "status": "OVERRIDE_ACTIVE",
  "azimuth_commanded": 45.0,
  "elevation_commanded": 10.0,
  "dish_lock": "BROKEN_MISALIGNED",
  "auth_token": "FLAG{GSAAS_UNAUTH_UPLINK_REST_2026}",
  "warning": "RF link lost with CUBESAT-ALPHA. Loss of Signal (LOS)."
}</pre>
        </div>
      `;
    }

    const gsBadge = document.getElementById('gs-lock-badge');
    if (gsBadge) {
      gsBadge.className = 'badge danger pulse';
      gsBadge.textContent = 'DISH MISALIGNED // LOCK LOST';
    }
  }

  resetGroundStation() {
    sounds.playClick();
    this.isCompromised = false;
    this.antennaAzimuth = 184.2;
    this.antennaElevation = 45.0;

    const responseBox = document.getElementById('gs-api-response');
    if (responseBox) {
      responseBox.innerHTML = `
        <div class="api-output mono">
          <div class="status-code">HTTP/1.1 200 OK [NOMINAL]</div>
          <pre>{
  "status": "TRACKING_ACTIVE",
  "azimuth": 184.2,
  "elevation": 45.0,
  "dish_lock": "AOS_OPTIMAL"
}</pre>
        </div>
      `;
    }

    const gsBadge = document.getElementById('gs-lock-badge');
    if (gsBadge) {
      gsBadge.className = 'badge success';
      gsBadge.textContent = 'GROUND DISH: TRACKING NOMINAL';
    }
  }

  startLoop() {
    let lastTime = performance.now();
    let waterfallTimer = 0;

    const loop = (currentTime) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // Orbit satellite: complete pass every 16 seconds
      this.orbitAngle = (this.orbitAngle + 0.38 * dt) % (Math.PI * 2);

      // Waterfall update every 120ms
      waterfallTimer += dt;
      if (waterfallTimer > 0.1) {
        waterfallTimer = 0;
        this.updateWaterfall();
      }

      this.renderOrbit();
      this.renderWaterfall();

      this.animationFrame = requestAnimationFrame(loop);
    };

    this.animationFrame = requestAnimationFrame(loop);
  }

  renderOrbit() {
    const { orbitCtx: ctx, oWidth: w, oHeight: h, orbitAngle } = this;
    ctx.clearRect(0, 0, w, h);

    const centerX = w / 2;
    const centerY = h / 2 + 10;
    const earthRadius = 55;

    // Deep space background stars
    ctx.fillStyle = '#050a12';
    ctx.fillRect(0, 0, w, h);

    // Earth globe
    const earthGrad = ctx.createRadialGradient(centerX - 15, centerY - 15, 5, centerX, centerY, earthRadius);
    earthGrad.addColorStop(0, '#1a4c6e');
    earthGrad.addColorStop(0.7, '#0b233a');
    earthGrad.addColorStop(1, '#051320');

    ctx.fillStyle = earthGrad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, earthRadius, 0, Math.PI * 2);
    ctx.fill();

    // Atmosphere halo
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.35)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Ground Station location on Earth
    const gsX = centerX + 12;
    const gsY = centerY - 45;

    // Ground Station RF coverage cone
    ctx.save();
    ctx.fillStyle = this.isCompromised ? 'rgba(255, 51, 102, 0.12)' : 'rgba(0, 229, 255, 0.12)';
    ctx.strokeStyle = this.isCompromised ? 'rgba(255, 51, 102, 0.6)' : 'rgba(0, 229, 255, 0.6)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(gsX, gsY);
    ctx.lineTo(gsX - 110, gsY - 70);
    ctx.lineTo(gsX + 110, gsY - 70);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Ground station dish icon
    ctx.fillStyle = this.isCompromised ? '#ff3366' : '#00e5ff';
    ctx.beginPath();
    ctx.arc(gsX, gsY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '9px monospace';
    ctx.fillText("GS-MADRID", gsX + 8, gsY + 3);

    // Orbit ellipse
    const a = 150; // semi-major axis
    const b = 60;  // semi-minor axis
    const tilt = -0.3; // inclination tilt

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(tilt);
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.25)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.ellipse(0, 0, a, b, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Satellite position
    const satOrbitX = a * Math.cos(orbitAngle);
    const satOrbitY = b * Math.sin(orbitAngle);
    // Rotate by tilt
    const satX = centerX + satOrbitX * Math.cos(tilt) - satOrbitY * Math.sin(tilt);
    const satY = centerY + satOrbitX * Math.sin(tilt) + satOrbitY * Math.cos(tilt);

    // Is satellite inside ground station beam?
    const inBeam = (satY < gsY) && (Math.abs(satX - gsX) < 95) && !this.isCompromised;

    // Draw active RF link beam if in coverage
    if (inBeam) {
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(gsX, gsY);
      ctx.lineTo(satX, satY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Satellite body & solar panels
    ctx.save();
    ctx.translate(satX, satY);

    // Solar panels
    ctx.fillStyle = '#00a8ff';
    ctx.fillRect(-12, -2, 7, 4);
    ctx.fillRect(5, -2, 7, 4);

    // CubeSat body
    ctx.fillStyle = inBeam ? '#00ff88' : '#e0e6ed';
    ctx.fillRect(-4, -4, 8, 8);
    ctx.strokeStyle = '#050a12';
    ctx.lineWidth = 1;
    ctx.strokeRect(-4, -4, 8, 8);

    // Label
    ctx.font = '9px monospace';
    ctx.fillStyle = inBeam ? '#00ff88' : '#c8f0ff';
    ctx.fillText("CUBESAT-01", 10, -6);
    ctx.fillStyle = 'rgba(200, 240, 255, 0.6)';
    ctx.fillText(inBeam ? "AOS (LINK LOCK)" : "LOS (ORBITING)", 10, 5);

    ctx.restore();

    // Telemetry text overlay
    const doppler = (Math.sin(orbitAngle) * 32.4).toFixed(1);
    const elev = inBeam ? (75 - Math.abs(satX - gsX) * 0.5).toFixed(1) : "0.0";

    const telBox = document.getElementById('orbit-telemetry-box');
    if (telBox) {
      telBox.innerHTML = `
        <div class="orbit-stat"><span class="lbl">Pass Status</span><span class="val ${inBeam ? 'text-success' : ''}">${inBeam ? 'AOS // IN PASS' : 'LOS // OUT OF VIEW'}</span></div>
        <div class="orbit-stat"><span class="lbl">Doppler Shift</span><span class="val mono">${doppler > 0 ? '+' : ''}${doppler} kHz</span></div>
        <div class="orbit-stat"><span class="lbl">Elevation</span><span class="val mono">${elev}°</span></div>
        <div class="orbit-stat"><span class="lbl">Carrier Freq</span><span class="val mono">437.525 MHz</span></div>
      `;
    }
  }

  updateWaterfall() {
    const bins = 60;
    const row = new Array(bins).fill(0);

    // Noise floor
    for (let i = 0; i < bins; i++) {
      row[i] = Math.random() * 0.15;
    }

    // Peak signal in center drifting with Doppler
    const centerBin = Math.floor(bins / 2 + Math.sin(this.orbitAngle) * 14);
    if (!this.isCompromised && centerBin >= 2 && centerBin < bins - 2) {
      row[centerBin] = 0.95;
      row[centerBin - 1] = 0.7;
      row[centerBin + 1] = 0.7;
      row[centerBin - 2] = 0.35;
      row[centerBin + 2] = 0.35;
    }

    this.waterfallHistory.unshift(row);
    if (this.waterfallHistory.length > this.waterfallRows) {
      this.waterfallHistory.pop();
    }
  }

  renderWaterfall() {
    const { waterfallCtx: ctx, wWidth: w, wHeight: h } = this;
    ctx.clearRect(0, 0, w, h);

    if (this.waterfallHistory.length === 0) return;

    const rowHeight = h / this.waterfallRows;
    const bins = this.waterfallHistory[0].length;
    const binWidth = w / bins;

    this.waterfallHistory.forEach((row, yIdx) => {
      const y = yIdx * rowHeight;
      row.forEach((intensity, xIdx) => {
        const x = xIdx * binWidth;

        // Color map: dark blue -> cyan -> yellow -> red
        let r = 0, g = 0, b = 0;
        if (intensity < 0.25) {
          b = Math.floor(intensity * 4 * 180);
        } else if (intensity < 0.6) {
          const t = (intensity - 0.25) / 0.35;
          g = Math.floor(t * 220);
          b = 220;
        } else if (intensity < 0.85) {
          const t = (intensity - 0.6) / 0.25;
          r = Math.floor(t * 255);
          g = 255;
          b = Math.floor((1 - t) * 150);
        } else {
          const t = (intensity - 0.85) / 0.15;
          r = 255;
          g = Math.floor((1 - t) * 200);
          b = 0;
        }

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x, y, binWidth + 0.5, rowHeight + 0.5);
      });
    });

    // Frequency grid line overlay
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '9px monospace';
    ctx.fillText("437.525 MHz (f0)", w / 2 + 5, 12);
  }

  destroy() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }
}
