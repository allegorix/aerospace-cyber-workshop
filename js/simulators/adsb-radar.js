// ADS-B 1090 MHz Interactive Radar & Spoofing Simulator
import { sounds } from '../audio.js';

export class AdsbSimulator {
  constructor(canvasId, packetFeedId, statusId) {
    this.canvas = document.getElementById(canvasId);
    this.packetFeed = document.getElementById(packetFeedId);
    this.statusElem = document.getElementById(statusId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.angle = 0;
    this.mlatEnabled = false;
    this.ghostInjected = false;
    this.selectedTarget = null;
    this.animationFrame = null;
    this.lastPacketTime = 0;

    // Base aircraft fleet
    this.targets = [
      {
        id: "T1",
        icao: "A4C981",
        callsign: "UAL821",
        distance: 42, // nm
        bearing: 45,  // degrees
        speed: 460,   // knots
        alt: 34000,   // ft
        heading: 220,
        squawk: "1200",
        isSpoofed: false,
        groundStations: [42.1, 41.9, 42.4, 42.0] // Measured TDOA distances
      },
      {
        id: "T2",
        icao: "40621D",
        callsign: "BAW117",
        distance: 68,
        bearing: 135,
        speed: 495,
        alt: 37000,
        heading: 290,
        squawk: "3412",
        isSpoofed: false,
        groundStations: [68.0, 68.2, 67.9, 68.1]
      },
      {
        id: "T3",
        icao: "394A55",
        callsign: "AFR042",
        distance: 28,
        bearing: 250,
        speed: 380,
        alt: 21000,
        heading: 75,
        squawk: "5501",
        isSpoofed: false,
        groundStations: [28.1, 28.0, 28.2, 27.9]
      },
      {
        id: "T4",
        icao: "C01A9E",
        callsign: "ACA870",
        distance: 85,
        bearing: 310,
        speed: 510,
        alt: 39000,
        heading: 140,
        squawk: "2104",
        isSpoofed: false,
        groundStations: [85.1, 84.9, 85.3, 85.0]
      }
    ];

    this.initCanvas();
    this.bindEvents();
    this.startLoop();
  }

  initCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width || 480;
    this.height = rect.height || 480;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;
    this.radius = Math.min(this.centerX, this.centerY) - 24;
  }

  bindEvents() {
    window.addEventListener('resize', () => this.initCanvas());

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      let found = null;
      this.targets.forEach(t => {
        const rad = (t.bearing - 90) * (Math.PI / 180);
        const r = (t.distance / 100) * this.radius;
        const tx = this.centerX + r * Math.cos(rad);
        const ty = this.centerY + r * Math.sin(rad);
        const dist = Math.hypot(x - tx, y - ty);
        if (dist < 18) {
          found = t;
        }
      });

      this.selectedTarget = found;
      sounds.playClick();
      this.updateSelectionUI();
    });
  }

  injectGhostAircraft() {
    if (this.ghostInjected) return;
    this.ghostInjected = true;
    sounds.playAlert();

    const ghost = {
      id: "GHOST-99",
      icao: "F00F99",
      callsign: "GHOST99",
      distance: 35,
      bearing: 15,
      speed: 1850, // Impossible Mach 2.5 speed!
      alt: 45000,
      heading: 195,
      squawk: "7700", // Emergency squawk
      isSpoofed: true,
      // TDOA values will be wildly mismatched because transmission actually originates from ground SDR at (0,0)
      groundStations: [4.1, 4.2, 4.1, 4.3]
    };

    this.targets.push(ghost);
    this.selectedTarget = ghost;
    this.updateSelectionUI();

    if (this.statusElem) {
      this.statusElem.innerHTML = `<span class="badge danger">ALERT: GHOST TARGET INJECTED</span> <span class="mono">ICAO: F00F99 // SQUAWK: 7700 // NO CRYPTOGRAPHIC SIGNATURE</span>`;
    }

    this.emitPacket({
      df: 17,
      icao: "F00F99",
      callsign: "GHOST99",
      alt: 45000,
      rawHex: "8DF00F99201389D690C8AC2863A7",
      isSpoof: true
    });
  }

  clearGhost() {
    this.targets = this.targets.filter(t => !t.isSpoofed);
    this.ghostInjected = false;
    this.selectedTarget = null;
    this.updateSelectionUI();
    if (this.statusElem) {
      this.statusElem.innerHTML = `<span class="badge success">NORMAL AIRSPACE</span> <span class="mono">MONITORING 1090 MHz MODE S BROADCASTS</span>`;
    }
  }

  toggleMlat() {
    this.mlatEnabled = !this.mlatEnabled;
    sounds.playClick();
    if (this.statusElem) {
      if (this.mlatEnabled) {
        this.statusElem.innerHTML = `<span class="badge info">MLAT VERIFICATION: ACTIVE</span> <span class="mono">4 TDOA GROUND SENSORS CORRELATING PHASE ARRIVAL</span>`;
      } else {
        this.statusElem.innerHTML = `<span class="badge warning">MLAT VERIFICATION: DISABLED</span> <span class="mono">TRUSTING ADS-B SELF-REPORTED COORDINATES</span>`;
      }
    }
  }

  updateSelectionUI() {
    const infoPanel = document.getElementById('adsb-target-info');
    if (!infoPanel) return;

    if (!this.selectedTarget) {
      infoPanel.innerHTML = `<div class="empty-state">Click any blip on the radar screen to inspect Mode S telemetry.</div>`;
      return;
    }

    const t = this.selectedTarget;
    const isDetectedSpoof = this.mlatEnabled && t.isSpoofed;

    infoPanel.innerHTML = `
      <div class="target-card ${isDetectedSpoof ? 'spoof-detected' : (t.isSpoofed ? 'spoof-unverified' : '')}">
        <div class="card-header">
          <div>
            <div class="callsign">${t.callsign}</div>
            <div class="icao mono">ICAO: 0x${t.icao}</div>
          </div>
          <span class="badge ${isDetectedSpoof ? 'danger pulse' : (t.isSpoofed ? 'warning' : 'success')}">
            ${isDetectedSpoof ? 'SPOOF DETECTED // TDOA REJECT' : (t.isSpoofed ? 'UNAUTHENTICATED (PLAUSIBLE)' : 'AUTHENTIC SQUAWK')}
          </span>
        </div>
        <div class="telemetry-grid">
          <div class="item"><span class="lbl">Altitude</span><span class="val">${t.alt.toLocaleString()} ft</span></div>
          <div class="item"><span class="lbl">Ground Speed</span><span class="val">${t.speed} kts</span></div>
          <div class="item"><span class="lbl">Bearing / Dist</span><span class="val">${t.bearing}° / ${t.distance.toFixed(1)} nm</span></div>
          <div class="item"><span class="lbl">Squawk Code</span><span class="val ${t.squawk === '7700' ? 'text-danger' : ''}">${t.squawk}</span></div>
        </div>
        ${isDetectedSpoof ? `
          <div class="mlat-verdict">
            <strong>⚠️ TDOA Multilateration Failure:</strong>
            Claimed distance: ${t.distance} nm. Measured 4-station delta: ~4.1 nm (Originating from local ground SDR!).
            <br><span class="highlight">Resolution: Rejected from ATC Primary Display.</span>
          </div>
        ` : (t.isSpoofed ? `
          <div class="mlat-warning">
            <strong>⚠️ No Crypto Protection:</strong>
            ADS-B accepts this track as genuine because Mode S lacks cryptographic signatures. Turn ON MLAT verification to catch it!
          </div>
        ` : '')}
      </div>
    `;
  }

  emitPacket(pkt) {
    if (!this.packetFeed) return;
    const item = document.createElement('div');
    item.className = `packet-entry ${pkt.isSpoof ? 'spoofed' : ''}`;
    item.innerHTML = `
      <span class="time">${new Date().toISOString().substring(11, 19)}</span>
      <span class="raw mono">${pkt.rawHex || '8D' + pkt.icao + '58C382D690C8AC'}</span>
      <span class="desc">DF=${pkt.df} [${pkt.callsign}] ${pkt.alt}ft ${pkt.isSpoof ? '⚠️ SPOOF' : '✓'}</span>
    `;
    this.packetFeed.prepend(item);
    while (this.packetFeed.children.length > 25) {
      this.packetFeed.removeChild(this.packetFeed.lastChild);
    }
  }

  startLoop() {
    let lastTime = performance.now();

    const loop = (currentTime) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // Rotate sweep line (4 seconds per 360 deg sweep = 90 deg/s)
      this.angle = (this.angle + 90 * dt) % 360;

      // Play subtle radar ping at 0 degrees
      if (this.angle < 2 && Math.random() > 0.6) {
        sounds.playRadarPing();
      }

      // Drift targets slowly along heading
      this.targets.forEach(t => {
        t.distance += (t.speed / 7200) * dt;
        if (t.distance > 95) t.distance = 25;
      });

      // Periodically emit real decoded ADS-B packet
      if (currentTime - this.lastPacketTime > 1800) {
        this.lastPacketTime = currentTime;
        const randTarget = this.targets[Math.floor(Math.random() * this.targets.length)];
        this.emitPacket({
          df: 17,
          icao: randTarget.icao,
          callsign: randTarget.callsign,
          alt: randTarget.alt,
          isSpoof: randTarget.isSpoofed
        });
      }

      this.render();
      this.animationFrame = requestAnimationFrame(loop);
    };

    this.animationFrame = requestAnimationFrame(loop);
  }

  render() {
    const { ctx, centerX, centerY, radius, angle } = this;
    ctx.clearRect(0, 0, this.width, this.height);

    // Background circle
    ctx.fillStyle = '#0a1017';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    // Concentric range rings (25nm, 50nm, 75nm, 100nm)
    [0.25, 0.5, 0.75, 1.0].forEach((ratio, idx) => {
      const r = radius * ratio;
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
      ctx.stroke();

      // Range text
      ctx.fillStyle = 'rgba(0, 229, 255, 0.45)';
      ctx.font = '10px monospace';
      ctx.fillText(`${(ratio * 100).toFixed(0)} NM`, centerX + 4, centerY - r + 12);
    });

    // Crosshairs & degree spokes
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.12)';
    for (let deg = 0; deg < 360; deg += 45) {
      const rad = deg * (Math.PI / 180);
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + radius * Math.cos(rad), centerY + radius * Math.sin(rad));
      ctx.stroke();
    }

    // 4 Ground Stations (for MLAT)
    if (this.mlatEnabled) {
      const gStations = [
        { x: centerX - 60, y: centerY - 60, name: "GS-ALPHA" },
        { x: centerX + 70, y: centerY - 50, name: "GS-BRAVO" },
        { x: centerX - 50, y: centerY + 65, name: "GS-CHARLIE" },
        { x: centerX + 60, y: centerY + 70, name: "GS-DELTA" }
      ];

      gStations.forEach(gs => {
        ctx.fillStyle = '#00e5ff';
        ctx.fillRect(gs.x - 3, gs.y - 3, 6, 6);
        ctx.font = '9px monospace';
        ctx.fillStyle = 'rgba(0, 229, 255, 0.7)';
        ctx.fillText(gs.name, gs.x + 6, gs.y + 3);
      });
    }

    // Draw Targets
    this.targets.forEach(t => {
      const rad = (t.bearing - 90) * (Math.PI / 180);
      const r = (t.distance / 100) * radius;
      const x = centerX + r * Math.cos(rad);
      const y = centerY + r * Math.sin(rad);

      const isDetectedSpoof = this.mlatEnabled && t.isSpoofed;
      const isSelected = this.selectedTarget && this.selectedTarget.id === t.id;

      // Target icon / diamond
      ctx.save();
      ctx.translate(x, y);

      if (isDetectedSpoof) {
        // Red flashing warning diamond
        ctx.strokeStyle = '#ff3366';
        ctx.fillStyle = 'rgba(255, 51, 102, 0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fill();

        // Draw MLAT reject rays back to ground stations
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 51, 102, 0.4)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.restore();
        ctx.save();
        ctx.translate(x, y);
      } else if (t.isSpoofed) {
        // Amber unauthenticated ghost
        ctx.strokeStyle = '#ffb300';
        ctx.fillStyle = 'rgba(255, 179, 0, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(6, 0);
        ctx.lineTo(0, 6);
        ctx.lineTo(-6, 0);
        ctx.closePath();
        ctx.stroke();
        ctx.fill();
      } else {
        // Normal green/cyan aircraft blip
        ctx.strokeStyle = '#00ff88';
        ctx.fillStyle = 'rgba(0, 255, 136, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Selection ring
      if (isSelected) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.arc(0, 0, 13, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Callsign label and alt
      ctx.fillStyle = isDetectedSpoof ? '#ff3366' : (t.isSpoofed ? '#ffb300' : '#c8f0ff');
      ctx.font = '10px monospace';
      ctx.fillText(t.callsign, 9, -2);
      ctx.fillStyle = 'rgba(200, 240, 255, 0.6)';
      ctx.font = '9px monospace';
      ctx.fillText(`FL${Math.round(t.alt / 100)} ${t.speed}kt`, 9, 9);

      ctx.restore();
    });

    // Rotating Radar Sweep Line & Phosphor Glow
    const sweepRad = (angle - 90) * (Math.PI / 180);
    const sweepX = centerX + radius * Math.cos(sweepRad);
    const sweepY = centerY + radius * Math.sin(sweepRad);

    const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    grad.addColorStop(0, 'rgba(0, 229, 255, 0.05)');
    grad.addColorStop(1, 'rgba(0, 229, 255, 0.0)');

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, sweepRad - 0.35, sweepRad);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 229, 255, 0.12)';
    ctx.fill();

    // The sharp sweep beam
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(sweepX, sweepY);
    ctx.stroke();
    ctx.restore();

    // Outer border ring
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  destroy() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }
}
