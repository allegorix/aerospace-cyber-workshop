// Live Wallpaper: Interactive Orbital Constellation & Deep Space Particle Engine
// Renders dynamic satellite mesh networks, laser links, telemetry packets & twinkling starfield

export class LiveWallpaper {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.running = true;
    this.animationFrame = null;
    this.mode = 'full'; // 'full' (constellation + stars), 'stars' (calm stars only), 'paused'

    // Mouse coordinates for interactive parallax
    this.mouse = { x: -1000, y: -1000, targetX: -1000, targetY: -1000, active: false };

    // Space entities
    this.stars = [];
    this.satellites = [];
    this.dataPackets = [];
    this.meteors = [];
    this.orbitRings = [];

    this.maxSatellites = 18;
    this.linkDistance = 170;
    this.lastMeteorTime = performance.now();

    this.initCanvas();
    this.createStars();
    this.createSatellites();
    this.createOrbitRings();
    this.bindEvents();
    this.startLoop();
  }

  initCanvas() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.scale(this.dpr, this.dpr);
  }

  createStars() {
    this.stars = [];
    const count = Math.min(220, Math.floor((this.width * this.height) / 7000));

    for (let i = 0; i < count; i++) {
      const isTinted = Math.random() > 0.75;
      const tint = isTinted ? (Math.random() > 0.5 ? '#00e5ff' : '#ffb300') : '#ffffff';

      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: Math.random() * 1.8 + 0.4,
        baseAlpha: Math.random() * 0.7 + 0.2,
        alpha: 0.5,
        twinkleSpeed: Math.random() * 2 + 0.8,
        twinklePhase: Math.random() * Math.PI * 2,
        tint: tint,
        vx: (Math.random() - 0.5) * 0.05,
        vy: (Math.random() - 0.5) * 0.05
      });
    }
  }

  createSatellites() {
    this.satellites = [];
    const callsigns = [
      "SAT-01", "LEO-4", "STAR-7", "IRID-12", "CUBE-A", "RECON-9",
      "NAV-3", "AERO-08", "OPTIC-2", "RELAY-5", "NEXUS-1", "SENT-6",
      "ORION-4", "ATLAS-8", "POLAR-3", "ECHO-11", "SOLAR-2", "CYBER-0"
    ];

    for (let i = 0; i < this.maxSatellites; i++) {
      const angle = (i / this.maxSatellites) * Math.PI * 2;
      const speed = Math.random() * 0.35 + 0.2;
      const heading = (Math.random() * 0.6 - 0.3) + (Math.random() > 0.5 ? 0 : Math.PI);

      this.satellites.push({
        id: callsigns[i % callsigns.length],
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: Math.cos(heading) * speed,
        vy: Math.sin(heading) * speed,
        size: Math.random() * 2 + 2.5,
        altitude: Math.floor(Math.random() * 400 + 420), // km
        beaconPhase: Math.random() * Math.PI * 2,
        color: i % 4 === 0 ? '#ffb300' : (i % 3 === 0 ? '#00ff88' : '#00e5ff')
      });
    }
  }

  createOrbitRings() {
    this.orbitRings = [
      {
        cx: this.width * 0.5,
        cy: this.height * 0.85,
        rx: this.width * 0.75,
        ry: this.height * 0.35,
        angle: -0.15,
        rotSpeed: 0.0003,
        alpha: 0.12
      },
      {
        cx: this.width * 0.45,
        cy: this.height * 0.9,
        rx: this.width * 0.9,
        ry: this.height * 0.42,
        angle: 0.08,
        rotSpeed: -0.0002,
        alpha: 0.08
      }
    ];
  }

  spawnMeteor() {
    const startX = Math.random() * this.width * 0.8;
    const startY = Math.random() * this.height * 0.3;
    const length = Math.random() * 140 + 80;
    const angle = (Math.PI / 4) + (Math.random() * 0.4 - 0.2); // ~45 deg downward
    const speed = Math.random() * 9 + 14;

    this.meteors.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      length: length,
      alpha: 1.0,
      decay: Math.random() * 0.02 + 0.015,
      color: Math.random() > 0.4 ? '#00e5ff' : '#ffffff'
    });
  }

  spawnDataPacket(s1, s2) {
    this.dataPackets.push({
      source: s1,
      target: s2,
      progress: 0,
      speed: Math.random() * 0.018 + 0.012,
      color: s1.color
    });
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.initCanvas();
      this.createStars();
      this.createOrbitRings();
    });

    window.addEventListener('mousemove', (e) => {
      this.mouse.targetX = e.clientX;
      this.mouse.targetY = e.clientY;
      this.mouse.active = true;
    });

    window.addEventListener('mouseleave', () => {
      this.mouse.active = false;
    });

    // Pause rendering when tab is hidden to save battery
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.running = false;
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
      } else if (this.mode !== 'paused') {
        this.running = true;
        this.startLoop();
      }
    });
  }

  setMode(newMode) {
    this.mode = newMode;
    if (newMode === 'paused') {
      this.running = false;
      if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
      this.clear();
    } else {
      if (!this.running) {
        this.running = true;
        this.startLoop();
      }
    }
  }

  cycleMode() {
    const modes = ['full', 'stars', 'paused'];
    const currentIdx = modes.indexOf(this.mode);
    const nextMode = modes[(currentIdx + 1) % modes.length];
    this.setMode(nextMode);
    return nextMode;
  }

  startLoop() {
    let lastTime = performance.now();

    const loop = (currentTime) => {
      if (!this.running) return;

      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // Smooth mouse lerp
      if (this.mouse.active) {
        this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.1;
        this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.1;
      }

      this.update(dt, currentTime);
      this.render(currentTime);

      this.animationFrame = requestAnimationFrame(loop);
    };

    this.animationFrame = requestAnimationFrame(loop);
  }

  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  update(dt, time) {
    // Occasional meteor spawn (every 5-9 seconds)
    if (time - this.lastMeteorTime > 6000 + Math.random() * 4000) {
      this.lastMeteorTime = time;
      this.spawnMeteor();
    }

    // Update Stars
    this.stars.forEach(s => {
      s.x = (s.x + s.vx + this.width) % this.width;
      s.y = (s.y + s.vy + this.height) % this.height;
      s.alpha = s.baseAlpha + Math.sin(time * 0.002 * s.twinkleSpeed + s.twinklePhase) * 0.3;
      s.alpha = Math.max(0.1, Math.min(1.0, s.alpha));
    });

    // Update Meteors
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      m.x += m.vx;
      m.y += m.vy;
      m.alpha -= m.decay;
      if (m.alpha <= 0 || m.x > this.width + 100 || m.y > this.height + 100) {
        this.meteors.splice(i, 1);
      }
    }

    if (this.mode !== 'full') return;

    // Update Satellites
    this.satellites.forEach(sat => {
      sat.x += sat.vx;
      sat.y += sat.vy;

      // Wrap around screen boundaries with margin
      if (sat.x < -30) sat.x = this.width + 30;
      if (sat.x > this.width + 30) sat.x = -30;
      if (sat.y < -30) sat.y = this.height + 30;
      if (sat.y > this.height + 30) sat.y = -30;

      // Gentle mouse interaction (faint repelling force)
      if (this.mouse.active) {
        const dx = sat.x - this.mouse.x;
        const dy = sat.y - this.mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 120 && dist > 1) {
          const force = (120 - dist) / 120;
          sat.x += (dx / dist) * force * 1.5;
          sat.y += (dy / dist) * force * 1.5;
        }
      }

      sat.beaconPhase += dt * 3;
    });

    // Random chance to spawn telemetry data packet along an active link
    if (Math.random() < 0.03 && this.dataPackets.length < 8) {
      const s1 = this.satellites[Math.floor(Math.random() * this.satellites.length)];
      const s2 = this.satellites[Math.floor(Math.random() * this.satellites.length)];
      if (s1 !== s2 && Math.hypot(s1.x - s2.x, s1.y - s2.y) < this.linkDistance) {
        this.spawnDataPacket(s1, s2);
      }
    }

    // Update Data Packets
    for (let i = this.dataPackets.length - 1; i >= 0; i--) {
      const p = this.dataPackets[i];
      p.progress += p.speed;
      if (p.progress >= 1.0) {
        this.dataPackets.splice(i, 1);
      }
    }

    // Rotate Orbit Rings
    this.orbitRings.forEach(r => {
      r.angle += r.rotSpeed;
    });
  }

  render(time) {
    const { ctx, width, height } = this;
    ctx.clearRect(0, 0, width, height);

    // 1. Render Orbit Trajectory Ellipses
    if (this.mode === 'full') {
      this.orbitRings.forEach(r => {
        ctx.save();
        ctx.translate(r.cx, r.cy);
        ctx.rotate(r.angle);
        ctx.strokeStyle = `rgba(0, 229, 255, ${r.alpha})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([8, 12]);
        ctx.beginPath();
        ctx.ellipse(0, 0, r.rx, r.ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      });
    }

    // 2. Render Stars
    this.stars.forEach(s => {
      ctx.fillStyle = s.tint;
      ctx.globalAlpha = s.alpha;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // 3. Render Meteors / Shooting Stars
    this.meteors.forEach(m => {
      const tailX = m.x - (m.vx * m.length) / 20;
      const tailY = m.y - (m.vy * m.length) / 20;

      const grad = ctx.createLinearGradient(tailX, tailY, m.x, m.y);
      grad.addColorStop(0, 'rgba(0, 229, 255, 0)');
      grad.addColorStop(1, `rgba(255, 255, 255, ${m.alpha})`);

      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(m.x, m.y);
      ctx.stroke();

      // Meteor head spark
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(m.x, m.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });

    if (this.mode !== 'full') return;

    // 4. Render Inter-Satellite Laser Links (Mesh Network)
    for (let i = 0; i < this.satellites.length; i++) {
      for (let j = i + 1; j < this.satellites.length; j++) {
        const s1 = this.satellites[i];
        const s2 = this.satellites[j];
        const dist = Math.hypot(s1.x - s2.x, s1.y - s2.y);

        if (dist < this.linkDistance) {
          const proximity = 1 - (dist / this.linkDistance);
          const alpha = proximity * 0.35;

          // Glowing laser line
          ctx.strokeStyle = `rgba(0, 229, 255, ${alpha})`;
          ctx.lineWidth = proximity * 1.5;
          ctx.beginPath();
          ctx.moveTo(s1.x, s1.y);
          ctx.lineTo(s2.x, s2.y);
          ctx.stroke();
        }
      }
    }

    // 5. Render In-Transit Telemetry Packets
    this.dataPackets.forEach(p => {
      const curX = p.source.x + (p.target.x - p.source.x) * p.progress;
      const curY = p.source.y + (p.target.y - p.source.y) * p.progress;

      ctx.fillStyle = '#00ff88';
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(curX, curY, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // 6. Render Satellites
    this.satellites.forEach(sat => {
      ctx.save();
      ctx.translate(sat.x, sat.y);

      // Beacon ping ring
      const pulse = (Math.sin(sat.beaconPhase) + 1) * 0.5; // 0 to 1
      const pulseRadius = sat.size + pulse * 10;
      const pulseAlpha = (1 - pulse) * 0.45;

      ctx.strokeStyle = `rgba(0, 229, 255, ${pulseAlpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, pulseRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Satellite body (diamond/crosshair)
      ctx.fillStyle = sat.color;
      ctx.shadowColor = sat.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(0, -sat.size);
      ctx.lineTo(sat.size, 0);
      ctx.lineTo(0, sat.size);
      ctx.lineTo(-sat.size, 0);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      // Solar panel wings
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-sat.size - 4, 0);
      ctx.lineTo(sat.size + 4, 0);
      ctx.stroke();

      // Satellite callsign tag
      ctx.font = '8px monospace';
      ctx.fillStyle = 'rgba(200, 240, 255, 0.65)';
      ctx.fillText(sat.id, 8, -4);
      ctx.fillStyle = 'rgba(200, 240, 255, 0.4)';
      ctx.fillText(`${sat.altitude}km`, 8, 5);

      ctx.restore();
    });

    // 7. Mouse Beacon (faint HUD crosshair under cursor if active)
    if (this.mouse.active) {
      const mx = this.mouse.x;
      const my = this.mouse.y;

      ctx.save();
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(mx, my, 18, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(mx - 24, my);
      ctx.lineTo(mx - 18, my);
      ctx.moveTo(mx + 18, my);
      ctx.lineTo(mx + 24, my);
      ctx.moveTo(mx, my - 24);
      ctx.lineTo(mx, my - 18);
      ctx.moveTo(mx, my + 18);
      ctx.lineTo(mx, my + 24);
      ctx.stroke();

      ctx.font = '8px monospace';
      ctx.fillStyle = 'rgba(0, 229, 255, 0.4)';
      ctx.fillText(`GEO: ${(mx / width * 360 - 180).toFixed(1)}° / ${((height - my) / height * 180 - 90).toFixed(1)}°`, mx + 24, my - 8);
      ctx.restore();
    }
  }

  destroy() {
    this.running = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }
}
