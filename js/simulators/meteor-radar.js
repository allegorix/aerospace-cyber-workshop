// Live Meteor & Spacecraft Radar Simulator (CAMRAS Dwingeloo WebSDR / GRAVES 143.050 MHz & BRAMS 49.988 MHz)
import { sounds } from '../audio.js';

export class MeteorRadarSimulator {
  constructor(canvasId, containerId) {
    this.canvasId = canvasId;
    this.containerId = containerId;
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

    // Receiver State (exact parameters from user's screenshot)
    this.frequency = 143050.00; // in kHz
    this.vfoA = 143050.00;
    this.vfoB = 49988.50;
    this.currentVfo = 'A';
    this.band = 'graves'; // 70cm sat, 70cm EME, 70cm T, 2m, graves, aero, 4m, 6m, lofar, 8m, jove, VLF
    this.mode = 'CW'; // CW, LSB, USB, AM, FM, AMsync
    this.filterBw = 0.40; // in kHz
    this.volume = 75;
    this.muted = false;
    this.squelch = false;
    this.autonotch = false;
    this.noiseReduction = false;
    this.sMeterDbm = -100.2;
    this.peakDbm = -100.2;
    this.speed = 'slow'; // slow, medium, fast
    this.size = 'medium'; // small, medium, large, extra large
    this.viewMode = 'waterfall'; // spectrum, waterfall
    this.brightness = 50;
    this.moreContrast = false;
    this.hideLabels = false;
    this.fullWindowWidth = false;

    // Dish Telemetry (CAMRAS Dwingeloo 25-meter Radio Telescope)
    this.dishAzimuth = 30.001;
    this.dishElevation = 30.000;
    this.dishMode = 'showstand';
    this.connectedUsers = 10;

    // View mode: 'tactical' (high-res canvas waterfall + event detector) or 'embed' (live WebSDR iframe)
    this.displayMode = 'tactical';

    // Waterfall resolution & buffers
    this.fftBins = 512;
    this.freqMin = 143020.00; // kHz
    this.freqMax = 143120.00; // kHz
    this.waterfallRows = [];
    this.maxRows = 220;

    // Active space events
    this.activeMeteors = [];
    this.activeSatellites = [];
    this.meteorLog = [];
    this.satelliteLog = [];
    this.currentTrackedSat = null;

    // Real-time animation
    this.animId = null;
    this.lastFrameTime = 0;
    this.frameInterval = 100; // slow = 100ms, medium = 50ms, fast = 25ms
    this.autoEventTimer = null;

    this.init();
  }

  init() {
    this.bufW = 512;
    this.bufH = 200;
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = this.bufW;
    this.offscreenCanvas.height = this.bufH;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d');
    if (this.offscreenCtx) {
      this.offscreenData = this.offscreenCtx.createImageData(this.bufW, this.bufH);
    }

    if (this.canvas) {
      this.resizeCanvas();
      window.addEventListener('resize', () => this.resizeCanvas());
    }

    this.initPresets();
    this.initWaterfallBuffer();
    this.bindControls();
    this.startAutoEvents();
    this.startLoop();

    // Populate initial logs with authentic samples
    this.seedInitialEvents();
  }

  resizeCanvas() {
    if (!this.canvas) {
      this.canvas = document.getElementById(this.canvasId);
      if (this.canvas) this.ctx = this.canvas.getContext('2d');
    }
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    if (Math.abs(this.canvas.width - w) > 2 || Math.abs(this.canvas.height - h) > 2) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  initWaterfallBuffer() {
    this.waterfallRows = [];
    const width = 512;
    const centerBin = Math.round(width * ((143050.00 - this.freqMin) / (this.freqMax - this.freqMin)));
    const auxBin = Math.round(width * ((143070.00 - this.freqMin) / (this.freqMax - this.freqMin)));
    const lusatBin = Math.round(width * ((143078.00 - this.freqMin) / (this.freqMax - this.freqMin)));

    for (let r = 0; r < this.maxRows; r++) {
      const row = new Float32Array(width);
      for (let i = 0; i < width; i++) {
        // Authentic RF cosmic noise floor: ~ -100 dBm with realistic speckle
        row[i] = -100.5 + (Math.random() - 0.5) * 6.5;
      }

      // Continuous GRAVES Space Surveillance Radar Carrier (143.050 MHz CW)
      if (centerBin >= 0 && centerBin < width) {
        row[centerBin] = -62.0 + (Math.random() - 0.5) * 2.5;
        if (centerBin > 0) row[centerBin - 1] = -72.0 + (Math.random() - 0.5) * 2.0;
        if (centerBin < width - 1) row[centerBin + 1] = -72.0 + (Math.random() - 0.5) * 2.0;
        if (centerBin > 1) row[centerBin - 2] = -84.0;
        if (centerBin < width - 2) row[centerBin + 2] = -84.0;
      }

      // Secondary beacons (Aux 143.070 & LUSAT 143.078)
      if (auxBin >= 0 && auxBin < width) {
        row[auxBin] = -88.0 + (Math.random() - 0.5) * 2.0;
      }
      if (lusatBin >= 0 && lusatBin < width) {
        row[lusatBin] = -82.0 + (Math.random() - 0.5) * 3.0;
      }

      // PRE-SEED EVENT 1: Active Overdense Meteor Bolide Reflection (Rows 18 to 48)
      if (r >= 18 && r <= 48) {
        const meteorAge = r - 18; // 0 to 30
        const dopplerShiftHz = 420 - meteorAge * 14; // Whistles down from +420 Hz toward 0 Hz
        const meteorKhz = 143050.00 + (dopplerShiftHz / 1000);
        const mBin = Math.round(width * ((meteorKhz - this.freqMin) / (this.freqMax - this.freqMin)));
        const trailWidth = Math.max(3, Math.floor(10 * (1 - meteorAge / 34)));
        const power = -64.0 + (meteorAge * 0.85); // -64 dBm decaying to -89 dBm

        for (let off = -trailWidth; off <= trailWidth; off++) {
          const bin = mBin + off;
          if (bin >= 0 && bin < width) {
            const falloff = 1 - Math.abs(off) / (trailWidth + 1);
            const val = power * falloff + (Math.random() - 0.5) * 3.0;
            row[bin] = Math.max(row[bin], val);
          }
        }
      }

      // PRE-SEED EVENT 2: Satellite Doppler S-Curve Pass (ISS NORAD 25544, Rows 72 to 142)
      if (r >= 72 && r <= 142) {
        const passProgress = (r - 72) / 70; // 0 to 1
        const dopplerHz = -Math.sin((passProgress - 0.5) * Math.PI) * 1350;
        const satKhz = 143050.00 + (dopplerHz / 1000);
        const sBin = Math.round(width * ((satKhz - this.freqMin) / (this.freqMax - this.freqMin)));
        if (sBin >= 0 && sBin < width) {
          row[sBin] = -68.0 + (Math.random() - 0.5) * 2.0;
          if (sBin > 0) row[sBin - 1] = Math.max(row[sBin - 1], -79.0);
          if (sBin < width - 1) row[sBin + 1] = Math.max(row[sBin + 1], -79.0);
        }
      }

      // PRE-SEED EVENT 3: Underdense Meteor Head Echo (Rows 168 to 178)
      if (r >= 168 && r <= 178) {
        const dopplerHz = -580 + (r - 168) * 40;
        const meteorKhz = 143050.00 + (dopplerHz / 1000);
        const mBin = Math.round(width * ((meteorKhz - this.freqMin) / (this.freqMax - this.freqMin)));
        if (mBin >= 0 && mBin < width) {
          row[mBin] = -74.0 + (Math.random() - 0.5) * 3.0;
          if (mBin > 0) row[mBin - 1] = Math.max(row[mBin - 1], -84.0);
          if (mBin < width - 1) row[mBin + 1] = Math.max(row[mBin + 1], -84.0);
        }
      }

      this.waterfallRows.push(row);
    }
  }

  initPresets() {
    this.presets = {
      graves: {
        name: 'GRAVES Space Surveillance Radar',
        freq: 143050.00,
        band: 'graves',
        mode: 'CW',
        filter: 0.40,
        url: 'http://websdr.camras.nl:8901/?tune=143050cw',
        desc: 'French military bistatic radar (143.050 MHz CW) detecting satellites, space debris & meteor trails.',
        freqMin: 143020.00,
        freqMax: 143120.00,
        labels: [
          { freq: 143050.00, label: 'GRAVES space radar', highlight: true },
          { freq: 143070.00, label: 'Aux' },
          { freq: 143078.00, label: 'LUSAT' },
          { freq: 143100.00, label: 'Patrouille de France display team' }
        ]
      },
      brams: {
        name: 'BRAMS Belgian Radio Meteor Beacon',
        freq: 49988.50,
        band: '6m',
        mode: 'USB',
        filter: 2.40,
        url: 'http://websdr.camras.nl:8901/?tune=49988.50usb',
        desc: 'Belgian RAdio Meteor Stations continuous beacon (49.9885 MHz) for forward-scatter meteor detection.',
        freqMin: 49970.00,
        freqMax: 50010.00,
        labels: [
          { freq: 49988.50, label: 'BRAMS Meteor Beacon (Dourbes)', highlight: true },
          { freq: 49995.00, label: 'Ionosphere Sounder' }
        ]
      },
      lusat: {
        name: 'LUSAT / OSCAR-19 Satellite Downlink',
        freq: 143078.00,
        band: 'graves',
        mode: 'CW',
        filter: 0.50,
        url: 'http://websdr.camras.nl:8901/?tune=143078cw',
        desc: 'Microsatellite CW beacon & telemetry transponder detected within the GRAVES passband.',
        freqMin: 143020.00,
        freqMax: 143120.00,
        labels: [
          { freq: 143050.00, label: 'GRAVES space radar' },
          { freq: 143078.00, label: 'LUSAT (LO-19 Satellite)', highlight: true }
        ]
      },
      sat70cm: {
        name: 'CAMRAS 70cm Amateur Satellite Band',
        freq: 436650.00,
        band: '70cm sat',
        mode: 'FM',
        filter: 12.00,
        url: 'http://websdr.camras.nl:8901/?tune=436650fm',
        desc: 'Dwingeloo 25m dish tracking CubeSat telemetry and amateur satellite downlinks.',
        freqMin: 436500.00,
        freqMax: 436800.00,
        labels: [
          { freq: 436650.00, label: 'CubeSat Downlink', highlight: true },
          { freq: 436795.00, label: 'ISS Packet Digipeater' }
        ]
      }
    };
  }

  // Pre-load recent events so telemetry table looks lively immediately
  seedInitialEvents() {
    const now = Date.now();
    this.meteorLog = [
      {
        time: new Date(now - 42000).toLocaleTimeString(),
        freq: '143050.22',
        doppler: '+220 Hz',
        duration: '0.45s',
        peakSnr: '-78.4 dB',
        velocity: '58.4 km/s',
        type: 'Underdense Trail'
      },
      {
        time: new Date(now - 128000).toLocaleTimeString(),
        freq: '143049.85',
        doppler: '-150 Hz',
        duration: '1.80s',
        peakSnr: '-69.1 dB',
        velocity: '44.2 km/s',
        type: 'Overdense Bolide'
      },
      {
        time: new Date(now - 280000).toLocaleTimeString(),
        freq: '143050.60',
        doppler: '+600 Hz',
        duration: '0.28s',
        peakSnr: '-82.0 dB',
        velocity: '66.1 km/s',
        type: 'Head Echo'
      }
    ];

    this.renderMeteorLog();
  }

  bindControls() {
    // Frequency Input & Step Buttons
    const freqInput = document.getElementById('sdr-freq-input');
    if (freqInput) {
      freqInput.addEventListener('change', (e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val)) this.setFrequency(val);
      });
    }

    // Step +/- buttons
    const stepMap = {
      'btn-step-m3': -10.0,
      'btn-step-m2': -1.0,
      'btn-step-m1': -0.1,
      'btn-step-p1': +0.1,
      'btn-step-p2': +1.0,
      'btn-step-p3': +10.0
    };
    Object.keys(stepMap).forEach(btnId => {
      const btn = document.getElementById(btnId);
      if (btn) {
        btn.addEventListener('click', () => {
          this.setFrequency(this.frequency + stepMap[btnId]);
          sounds.playClick();
        });
      }
    });

    // VFO A/B and A->B
    const btnVfoAB = document.getElementById('btn-vfo-ab');
    const btnVfoCopy = document.getElementById('btn-vfo-copy');
    if (btnVfoAB) {
      btnVfoAB.addEventListener('click', () => {
        if (this.currentVfo === 'A') {
          this.vfoA = this.frequency;
          this.currentVfo = 'B';
          this.setFrequency(this.vfoB);
        } else {
          this.vfoB = this.frequency;
          this.currentVfo = 'A';
          this.setFrequency(this.vfoA);
        }
        btnVfoAB.textContent = `VFO: ${this.currentVfo}`;
        sounds.playClick();
      });
    }
    if (btnVfoCopy) {
      btnVfoCopy.addEventListener('click', () => {
        if (this.currentVfo === 'A') this.vfoB = this.frequency;
        else this.vfoA = this.frequency;
        sounds.playClick();
      });
    }

    // Mode Buttons (CW, LSB, USB, AM, FM, AMsync)
    document.querySelectorAll('[data-sdr-mode]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('[data-sdr-mode]').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.mode = e.currentTarget.dataset.sdrMode;
        sounds.playClick();
      });
    });

    // Band Radios
    document.querySelectorAll('input[name="sdr-band"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.selectBand(e.target.value);
        sounds.playClick();
      });
    });

    // Filter bandwidth narrower / wider
    const btnFilterNarrow = document.getElementById('btn-filter-narrow');
    const btnFilterWide = document.getElementById('btn-filter-wide');
    const filterDisplay = document.getElementById('sdr-filter-disp');
    if (btnFilterNarrow) {
      btnFilterNarrow.addEventListener('click', () => {
        this.filterBw = Math.max(0.10, parseFloat((this.filterBw - 0.10).toFixed(2)));
        if (filterDisplay) filterDisplay.textContent = `${this.filterBw.toFixed(2)} kHz`;
        sounds.playClick();
      });
    }
    if (btnFilterWide) {
      btnFilterWide.addEventListener('click', () => {
        this.filterBw = Math.min(6.00, parseFloat((this.filterBw + 0.10).toFixed(2)));
        if (filterDisplay) filterDisplay.textContent = `${this.filterBw.toFixed(2)} kHz`;
        sounds.playClick();
      });
    }

    // Volume Slider & Mute
    const volSlider = document.getElementById('sdr-volume-slider');
    const muteBox = document.getElementById('sdr-mute-toggle');
    if (volSlider) {
      volSlider.addEventListener('input', (e) => {
        this.volume = parseInt(e.target.value, 10);
      });
    }
    if (muteBox) {
      muteBox.addEventListener('change', (e) => {
        this.muted = e.target.checked;
      });
    }

    // Waterfall Settings Speed
    document.querySelectorAll('input[name="wf-speed"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.speed = e.target.value;
        if (this.speed === 'slow') this.frameInterval = 100;
        else if (this.speed === 'medium') this.frameInterval = 55;
        else this.frameInterval = 25;
      });
    });

    // Preset Buttons
    document.querySelectorAll('[data-sdr-preset]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.loadPreset(e.currentTarget.dataset.sdrPreset);
        sounds.playClick();
      });
    });

    // Trigger Meteor Reflection Manually
    const btnTriggerMeteor = document.getElementById('btn-trigger-meteor');
    if (btnTriggerMeteor) {
      btnTriggerMeteor.addEventListener('click', () => {
        this.injectMeteorEvent();
      });
    }

    // Trigger Spacecraft Pass Manually
    const btnTriggerSat = document.getElementById('btn-trigger-sat');
    if (btnTriggerSat) {
      btnTriggerSat.addEventListener('click', () => {
        this.injectSatellitePass();
      });
    }

    // Switch between Embedded WebSDR iframe and Canvas Radar Spectrogram
    const btnToggleStream = document.getElementById('btn-toggle-sdr-stream');
    if (btnToggleStream) {
      btnToggleStream.addEventListener('click', () => {
        this.toggleStreamMode();
        sounds.playClick();
      });
    }

    // Interactive Click-to-tune directly on the waterfall canvas (CAMRAS WebSDR tuning)
    if (this.canvas) {
      this.canvas.style.cursor = 'crosshair';
      this.canvas.addEventListener('click', (e) => {
        const rect = this.canvas.getBoundingClientRect();
        if (rect.width > 0) {
          const clickX = e.clientX - rect.left;
          const ratio = Math.max(0, Math.min(1, clickX / rect.width));
          const tunedKhz = this.freqMin + ratio * (this.freqMax - this.freqMin);
          this.setFrequency(tunedKhz);
          sounds.playClick();
        }
      });
    }

    // Waterfall View Mode (waterfall vs spectrum oscilloscope)
    document.querySelectorAll('input[name="wf-view"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.viewMode = e.target.value;
      });
    });

    // Brightness and Contrast controls
    const brightSlider = document.getElementById('sdr-brightness-slider');
    if (brightSlider) {
      brightSlider.addEventListener('input', (e) => {
        this.brightness = parseInt(e.target.value, 10);
      });
    }
    const contrastChk = document.getElementById('sdr-contrast-chk');
    if (contrastChk) {
      contrastChk.addEventListener('change', (e) => {
        this.moreContrast = e.target.checked;
      });
    }
  }

  setFrequency(khz) {
    this.frequency = parseFloat(khz.toFixed(2));
    const input = document.getElementById('sdr-freq-input');
    if (input) input.value = this.frequency.toFixed(2);

    // Update active preset if matches
    const currentPreset = this.presets[this.band];
    if (currentPreset) {
      currentPreset.freq = this.frequency;
    }

    // Update embed iframe src if active
    this.updateIframeSrc();
  }

  selectBand(bandName) {
    this.band = bandName;
    if (this.presets[bandName]) {
      this.loadPreset(bandName);
    } else if (bandName === 'graves') {
      this.loadPreset('graves');
    } else if (bandName === '6m') {
      this.loadPreset('brams');
    }
  }

  loadPreset(presetKey) {
    const preset = this.presets[presetKey];
    if (!preset) return;

    this.frequency = preset.freq;
    this.band = preset.band;
    this.mode = preset.mode;
    this.filterBw = preset.filter;
    this.freqMin = preset.freqMin;
    this.freqMax = preset.freqMax;

    // Update DOM
    const input = document.getElementById('sdr-freq-input');
    if (input) input.value = this.frequency.toFixed(2);

    const filterDisplay = document.getElementById('sdr-filter-disp');
    if (filterDisplay) filterDisplay.textContent = `${this.filterBw.toFixed(2)} kHz`;

    // Highlight mode button
    document.querySelectorAll('[data-sdr-mode]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.sdrMode === this.mode);
    });

    // Check band radio
    const bandRadio = document.querySelector(`input[name="sdr-band"][value="${this.band}"]`);
    if (bandRadio) bandRadio.checked = true;

    // Update preset pills
    document.querySelectorAll('[data-sdr-preset]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.sdrPreset === presetKey);
    });

    // Reset waterfall buffer for new band span
    this.initWaterfallBuffer();
    this.updateIframeSrc();

    // Update info description
    const descElem = document.getElementById('sdr-preset-desc');
    if (descElem) {
      descElem.innerHTML = `<strong>${preset.name}:</strong> ${preset.desc}`;
    }
  }

  updateIframeSrc() {
    const iframe = document.getElementById('websdr-live-iframe');
    if (iframe) {
      const modeStr = this.mode.toLowerCase();
      const tuneUrl = `http://websdr.camras.nl:8901/?tune=${this.frequency.toFixed(2)}${modeStr}`;
      if (iframe.src !== tuneUrl) {
        iframe.src = tuneUrl;
      }
    }
  }

  toggleStreamMode() {
    const canvasWrap = document.getElementById('sdr-canvas-wrapper');
    const iframeWrap = document.getElementById('sdr-iframe-wrapper');
    const toggleBtn = document.getElementById('btn-toggle-sdr-stream');

    if (this.displayMode === 'tactical') {
      this.displayMode = 'embed';
      if (canvasWrap) canvasWrap.classList.add('hidden');
      if (iframeWrap) iframeWrap.classList.remove('hidden');
      if (toggleBtn) toggleBtn.innerHTML = '📊 Switch to Tactical Radar Spectrogram';
      this.updateIframeSrc();
    } else {
      this.displayMode = 'tactical';
      if (canvasWrap) canvasWrap.classList.remove('hidden');
      if (iframeWrap) iframeWrap.classList.add('hidden');
      if (toggleBtn) toggleBtn.innerHTML = '📡 Switch to Embedded Live WebSDR Stream';
      this.resizeCanvas();
    }
  }

  // Periodic autonomous meteor trail reflections & satellite passes
  startAutoEvents() {
    this.autoEventTimer = setInterval(() => {
      // 65% chance of meteor trail ping (sporadic rate)
      if (Math.random() < 0.65 && this.activeMeteors.length === 0) {
        this.injectMeteorEvent(true);
      }
      // 25% chance of satellite pass Doppler curve
      if (Math.random() < 0.25 && this.activeSatellites.length === 0) {
        this.injectSatellitePass(true);
      }
      // Simulate minor rotator drift on Dwingeloo dish
      this.dishAzimuth = parseFloat((30.001 + (Math.random() - 0.5) * 0.008).toFixed(3));
      this.dishElevation = parseFloat((30.000 + (Math.random() - 0.5) * 0.004).toFixed(3));
      const azElElem = document.getElementById('dwingeloo-azel');
      if (azElElem) {
        azElElem.textContent = `az: ${this.dishAzimuth.toFixed(3)}°  el: ${this.dishElevation.toFixed(3)}°`;
      }
    }, 12000);
  }

  // Inject a meteor reflection into the RF waterfall
  injectMeteorEvent(isAuto = false) {
    const isOverdense = Math.random() < 0.35; // Overdense bolide (lasts longer)
    const dopplerShift = (Math.random() - 0.45) * 800; // ± 400 Hz Doppler shift
    const durationSec = isOverdense ? (1.5 + Math.random() * 2.5) : (0.2 + Math.random() * 0.5);
    const peakSnr = isOverdense ? (-70 + Math.random() * 8) : (-84 + Math.random() * 9);
    const velocity = (32 + Math.random() * 38).toFixed(1); // 32 to 70 km/s (Perseids/Sporadic)
    const type = isOverdense ? 'Overdense Bolide' : (durationSec < 0.35 ? 'Head Echo' : 'Underdense Trail');

    const meteor = {
      centerKhz: this.frequency + (dopplerShift / 1000),
      dopplerHz: dopplerShift,
      bandwidthKhz: isOverdense ? 2.5 : 0.8,
      durationRows: Math.floor(durationSec * (1000 / this.frameInterval)),
      remainingRows: Math.floor(durationSec * (1000 / this.frameInterval)),
      snr: peakSnr,
      isOverdense: isOverdense
    };

    this.activeMeteors.push(meteor);

    // Audio acoustic Doppler ping
    if (!this.muted) {
      const pingPitch = 1000 + Math.floor(dopplerShift);
      sounds.playMeteorPing(Math.max(400, Math.min(2200, pingPitch)), durationSec);
    }

    // Flash S-meter peak
    this.sMeterDbm = parseFloat(peakSnr.toFixed(1));
    this.peakDbm = parseFloat(peakSnr.toFixed(1));
    this.updateSmeterUI();

    // Log to table
    const logItem = {
      time: new Date().toLocaleTimeString(),
      freq: (this.frequency + (dopplerShift / 1000)).toFixed(2),
      doppler: `${dopplerShift > 0 ? '+' : ''}${Math.round(dopplerShift)} Hz`,
      duration: `${durationSec.toFixed(2)}s`,
      peakSnr: `${peakSnr.toFixed(1)} dB`,
      velocity: `${velocity} km/s`,
      type: type
    };

    this.meteorLog.unshift(logItem);
    if (this.meteorLog.length > 8) this.meteorLog.pop();
    this.renderMeteorLog();

    // Temporary highlight badge
    const badge = document.getElementById('sdr-event-badge');
    if (badge) {
      badge.textContent = `☄️ METEOR REFLECTION DETECTED: ${logItem.doppler} // ${logItem.duration}`;
      badge.className = 'badge warning pulse';
      setTimeout(() => {
        badge.textContent = 'RECEIVER MONITORING // 143.050 MHz GRAVES';
        badge.className = 'badge info mono';
      }, 4000);
    }
  }

  // Inject a Satellite Pass with distinctive Doppler S-curve
  injectSatellitePass(isAuto = false) {
    const satelliteCatalog = [
      { name: 'ISS (Zarya)', norad: '25544', alt: '418 km', rcs: '400 m²', maxDoppler: 1400 },
      { name: 'Tiangong Space Station', norad: '48274', alt: '385 km', rcs: '120 m²', maxDoppler: 1450 },
      { name: 'Hubble Space Telescope', norad: '20580', alt: '535 km', rcs: '15 m²', maxDoppler: 1280 },
      { name: 'Starlink-3124', norad: '52841', alt: '545 km', rcs: '2.5 m²', maxDoppler: 1320 },
      { name: 'SL-16 R/B (Zenit Debris)', norad: '22220', alt: '840 km', rcs: '10 m²', maxDoppler: 1100 }
    ];

    const sat = satelliteCatalog[Math.floor(Math.random() * satelliteCatalog.length)];
    const totalSteps = 60; // 60 waterfall steps to draw full S-curve

    const pass = {
      sat: sat,
      step: 0,
      totalSteps: totalSteps,
      maxDoppler: sat.maxDoppler,
      baseKhz: this.frequency
    };

    this.activeSatellites.push(pass);
    this.currentTrackedSat = sat;

    // Play Doppler Chirp Whistle
    if (!this.muted) {
      sounds.playDopplerChirp(1600, 700, 1.2);
    }

    // Flash S-meter
    this.sMeterDbm = -74.2;
    this.updateSmeterUI();

    // Update Spacecraft Telemetry HUD
    this.renderSatelliteHUD(sat, '+1,240 Hz');

    const badge = document.getElementById('sdr-event-badge');
    if (badge) {
      badge.textContent = `🛰️ PASS DETECTED: ${sat.name} (NORAD ${sat.norad}) // DOPPLER S-CURVE`;
      badge.className = 'badge success pulse';
      setTimeout(() => {
        badge.textContent = 'RECEIVER MONITORING // 143.050 MHz GRAVES';
        badge.className = 'badge info mono';
      }, 5000);
    }
  }

  renderSatelliteHUD(sat, currentDoppler) {
    const container = document.getElementById('sdr-satellite-hud');
    if (!container) return;

    container.innerHTML = `
      <div class="sat-hud-card">
        <div class="sat-hud-header">
          <div>
            <h4 style="color: #fff; font-size: 1.05rem;">🛰️ ${sat.name}</h4>
            <span class="mono" style="font-size: 0.75rem; color: var(--cyan);">NORAD ID: ${sat.norad} // LEO ORBIT</span>
          </div>
          <span class="badge success mono">RADAR REFLECTION LOCK</span>
        </div>
        <div class="sat-hud-grid">
          <div class="hud-stat"><span class="lbl">RADIAL VELOCITY</span><span class="val mono">7.68 km/s</span></div>
          <div class="hud-stat"><span class="lbl">DOPPLER SHIFT</span><span class="val mono" style="color: var(--amber);">${currentDoppler}</span></div>
          <div class="hud-stat"><span class="lbl">TARGET ALTITUDE</span><span class="val mono">${sat.alt}</span></div>
          <div class="hud-stat"><span class="lbl">RADAR CROSS SECTION</span><span class="val mono">${sat.rcs}</span></div>
          <div class="hud-stat"><span class="lbl">PASS DURATION</span><span class="val mono">~4.8 min</span></div>
          <div class="hud-stat"><span class="lbl">REFLECTED BEACON</span><span class="val mono" style="color: var(--cyan);">143.050 MHz</span></div>
        </div>
      </div>
    `;
  }

  renderMeteorLog() {
    const tbody = document.getElementById('sdr-meteor-table-body');
    if (!tbody) return;

    if (this.meteorLog.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No meteor events detected yet. Monitoring 143.050 MHz forward scatter...</td></tr>`;
      return;
    }

    tbody.innerHTML = this.meteorLog.map(m => `
      <tr class="meteor-row">
        <td class="mono">${m.time}</td>
        <td class="mono" style="color: var(--cyan);">${m.freq}</td>
        <td class="mono" style="color: var(--amber); font-weight: 700;">${m.doppler}</td>
        <td class="mono">${m.duration}</td>
        <td class="mono">${m.peakSnr}</td>
        <td class="mono">${m.velocity}</td>
        <td><span class="badge ${m.type.includes('Bolide') ? 'danger' : 'info'} mono" style="font-size: 0.65rem;">${m.type}</span></td>
      </tr>
    `).join('');
  }

  updateSmeterUI() {
    const valElem = document.getElementById('sdr-smeter-val');
    const barElem = document.getElementById('sdr-smeter-bar');
    if (valElem) {
      valElem.textContent = `${this.sMeterDbm.toFixed(1)} dB: peak ${this.peakDbm.toFixed(1)} dB`;
    }
    if (barElem) {
      // Map -110 dB to -60 dB -> 0% to 100%
      const pct = Math.max(0, Math.min(100, ((this.sMeterDbm - (-110)) / 50) * 100));
      barElem.style.width = `${pct}%`;
    }
  }

  // Animation Loop (Generates new FFT waterfall slice at regular intervals)
  startLoop() {
    const loop = (timestamp) => {
      if (timestamp - this.lastFrameTime >= this.frameInterval) {
        this.lastFrameTime = timestamp;
        this.stepWaterfall();
        this.drawWaterfall();
      }
      this.animId = requestAnimationFrame(loop);
    };
    this.animId = requestAnimationFrame(loop);
  }

  // Advance waterfall by 1 row
  stepWaterfall() {
    const width = 512;
    const newRow = new Float32Array(width);

    // Baseline thermal RF noise: -101 to -98 dBm with authentic speckle
    for (let i = 0; i < width; i++) {
      newRow[i] = -100.5 + (Math.random() - 0.5) * 6.5;
    }

    // GRAVES Space Radar Carrier line (143050.00 kHz)
    const carrierBin = Math.round(width * ((143050.00 - this.freqMin) / (this.freqMax - this.freqMin)));
    if (carrierBin >= 0 && carrierBin < width) {
      newRow[carrierBin] = -62.0 + (Math.random() - 0.5) * 2.5;
      if (carrierBin > 0) newRow[carrierBin - 1] = -72.0 + (Math.random() - 0.5) * 2.0;
      if (carrierBin < width - 1) newRow[carrierBin + 1] = -72.0 + (Math.random() - 0.5) * 2.0;
      if (carrierBin > 1) newRow[carrierBin - 2] = -84.0;
      if (carrierBin < width - 2) newRow[carrierBin + 2] = -84.0;
    }

    // Secondary markers (Aux 143.070 & LUSAT 143.078)
    const auxBin = Math.round(width * ((143070.00 - this.freqMin) / (this.freqMax - this.freqMin)));
    if (auxBin >= 0 && auxBin < width) newRow[auxBin] = -88.0 + (Math.random() - 0.5) * 2.0;

    const lusatBin = Math.round(width * ((143078.00 - this.freqMin) / (this.freqMax - this.freqMin)));
    if (lusatBin >= 0 && lusatBin < width) {
      const isPulse = (Math.floor(Date.now() / 400) % 2) === 0;
      newRow[lusatBin] = isPulse ? -81.0 : -92.0;
    }

    // Render active meteors with broad ionization blooming
    for (let m = this.activeMeteors.length - 1; m >= 0; m--) {
      const meteor = this.activeMeteors[m];
      const mBin = Math.round(width * ((meteor.centerKhz - this.freqMin) / (this.freqMax - this.freqMin)));
      const radius = meteor.isOverdense ? 5 : 2;

      for (let offset = -radius; offset <= radius; offset++) {
        const bin = mBin + offset;
        if (bin >= 0 && bin < width) {
          const falloff = 1 - (Math.abs(offset) / (radius + 1));
          const val = meteor.snr * falloff + (Math.random() - 0.5) * 2.0;
          newRow[bin] = Math.max(newRow[bin], val);
        }
      }

      meteor.remainingRows--;
      if (meteor.remainingRows <= 0) {
        this.activeMeteors.splice(m, 1);
      }
    }

    // Render active satellite Doppler S-curves
    for (let s = this.activeSatellites.length - 1; s >= 0; s--) {
      const satPass = this.activeSatellites[s];
      const progress = satPass.step / satPass.totalSteps;
      const normalizedShift = -Math.sin((progress - 0.5) * Math.PI);
      const currentDoppler = normalizedShift * satPass.maxDoppler;
      const satKhz = satPass.baseKhz + (currentDoppler / 1000);

      const sBin = Math.round(width * ((satKhz - this.freqMin) / (this.freqMax - this.freqMin)));
      if (sBin >= 0 && sBin < width) {
        newRow[sBin] = -67.0 + (Math.random() - 0.5) * 2.5;
        if (sBin > 0) newRow[sBin - 1] = Math.max(newRow[sBin - 1], -78.0);
        if (sBin < width - 1) newRow[sBin + 1] = Math.max(newRow[sBin + 1], -78.0);
      }

      satPass.step++;
      if (satPass.step >= satPass.totalSteps) {
        this.activeSatellites.splice(s, 1);
      }
    }

    // Decay S-meter smoothly toward noise floor
    if (this.sMeterDbm > -100.2) {
      this.sMeterDbm = Math.max(-100.2, this.sMeterDbm - 0.6);
      this.updateSmeterUI();
    }

    // Push new row and drop oldest
    this.waterfallRows.unshift(newRow);
    if (this.waterfallRows.length > this.maxRows) {
      this.waterfallRows.pop();
    }
  }

  // Draw the entire waterfall and overlay labels onto the canvas
  drawWaterfall() {
    if (!this.ctx || !this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return; // Element hidden in inactive tab; skip drawing frame safely
    }

    const w = Math.round(rect.width);
    const h = Math.round(rect.height);

    if (Math.abs(this.canvas.width - w) > 2 || Math.abs(this.canvas.height - h) > 2) {
      this.canvas.width = w;
      this.canvas.height = h;
    }

    const numRows = this.waterfallRows.length;
    if (numRows === 0) return;

    // Support Alternative Spectrum View (Oscilloscope Mode)
    if (this.viewMode === 'spectrum') {
      this.drawSpectrum(w, h);
      return;
    }

    if (!this.offscreenCtx || !this.offscreenData) return;

    const bufW = this.bufW;
    const bufH = this.bufH;
    const data = this.offscreenData.data;
    const rulerH = 34;
    const waterfallH = Math.max(10, h - rulerH);

    const brightOffset = (this.brightness - 50) * 0.25;

    // Render RF power levels into fixed 512x200 offscreen image buffer
    for (let y = 0; y < bufH; y++) {
      const rowIdx = Math.floor((y / bufH) * numRows);
      const row = this.waterfallRows[rowIdx] || this.waterfallRows[0];
      const yOffset = y * bufW;

      for (let x = 0; x < bufW; x++) {
        const dbm = row[x] || -102;
        let norm = ((dbm + brightOffset) - (-105)) / 45;
        if (this.moreContrast) {
          norm = Math.pow(Math.max(0, Math.min(1, norm)), 1.3);
        } else {
          norm = Math.max(0, Math.min(1, norm));
        }

        let r = 0, g = 0, b = 0;
        if (norm < 0.22) {
          // Ambient cosmic noise: Deep navy to electric sapphire/cobalt
          const t = norm / 0.22;
          r = Math.floor(10 + 15 * t);
          g = Math.floor(30 + 50 * t);
          b = Math.floor(80 + 100 * t);
        } else if (norm < 0.52) {
          // Weak scatter / sidebands: Cobalt to radiant cyan
          const t = (norm - 0.22) / 0.30;
          r = Math.floor(25 * (1 - t * 0.5));
          g = Math.floor(80 + 145 * t);
          b = Math.floor(180 + 75 * t);
        } else if (norm < 0.82) {
          // Medium-strong signals (meteors & satellites): Cyan to golden amber
          const t = (norm - 0.52) / 0.30;
          r = Math.floor(12 + 243 * t);
          g = Math.floor(225 + 20 * t * (1 - t * 0.3));
          b = Math.floor(255 * (1 - t));
        } else {
          // Strong signals (radar carrier core & bolide head): Gold to blazing white
          const t = (norm - 0.82) / 0.18;
          r = 255;
          g = Math.floor(245 + 10 * t);
          b = Math.floor(40 + 215 * t);
        }

        const pixelIdx = (yOffset + x) * 4;
        data[pixelIdx] = r;
        data[pixelIdx + 1] = g;
        data[pixelIdx + 2] = b;
        data[pixelIdx + 3] = 255;
      }
    }

    this.offscreenCtx.putImageData(this.offscreenData, 0, 0);

    // Blit onto visible canvas scaled to current container width/height
    this.ctx.clearRect(0, 0, w, h);
    this.ctx.drawImage(this.offscreenCanvas, 0, 0, bufW, bufH, 0, 0, w, waterfallH);

    // Overlay frequency labels and annotations (identical to WebSDR screenshot)
    if (!this.hideLabels) {
      this.drawScaleAndLabels(w, h);
    }

    // Overlay tuned VFO cursor & filter bandwidth
    this.drawTunedCursor(w, h);

    // Live Tactical Scanline HUD at top
    this.drawHudOverlay(w, h);
  }

  // Live Spectrum Analyzer (Oscilloscope Mode)
  drawSpectrum(w, h) {
    const latestRow = this.waterfallRows[0];
    if (!latestRow) return;

    this.ctx.fillStyle = '#030812';
    this.ctx.fillRect(0, 0, w, h);

    const rulerH = 34;
    const plotH = h - rulerH;

    // Draw dBm horizontal grid lines
    this.ctx.save();
    this.ctx.font = '9px monospace';
    this.ctx.textBaseline = 'middle';
    const dbSteps = [-50, -60, -70, -80, -90, -100, -110];

    dbSteps.forEach(db => {
      const y = plotH * (1 - ((db - (-115)) / 70));
      this.ctx.strokeStyle = db === -100 ? 'rgba(0, 229, 255, 0.35)' : 'rgba(255, 255, 255, 0.08)';
      this.ctx.setLineDash([3, 4]);
      this.ctx.beginPath();
      this.ctx.moveTo(35, y);
      this.ctx.lineTo(w, y);
      this.ctx.stroke();

      this.ctx.fillStyle = db === -100 ? '#00e5ff' : 'rgba(255, 255, 255, 0.45)';
      this.ctx.fillText(`${db} dB`, 2, y);
    });
    this.ctx.setLineDash([]);

    // Draw spectrum curve with gradient fill
    const grad = this.ctx.createLinearGradient(0, 0, 0, plotH);
    grad.addColorStop(0, 'rgba(0, 255, 136, 0.45)');
    grad.addColorStop(0.5, 'rgba(0, 229, 255, 0.2)');
    grad.addColorStop(1, 'rgba(0, 30, 80, 0.05)');

    this.ctx.beginPath();
    this.ctx.moveTo(35, plotH);

    for (let x = 0; x < latestRow.length; x++) {
      const dbm = latestRow[x];
      const px = 35 + (x / latestRow.length) * (w - 35);
      const py = Math.max(10, Math.min(plotH, plotH * (1 - ((dbm - (-115)) / 70))));
      this.ctx.lineTo(px, py);
    }

    this.ctx.lineTo(w, plotH);
    this.ctx.closePath();
    this.ctx.fillStyle = grad;
    this.ctx.fill();

    // Trace curve line
    this.ctx.beginPath();
    for (let x = 0; x < latestRow.length; x++) {
      const dbm = latestRow[x];
      const px = 35 + (x / latestRow.length) * (w - 35);
      const py = Math.max(10, Math.min(plotH, plotH * (1 - ((dbm - (-115)) / 70))));
      if (x === 0) this.ctx.moveTo(px, py);
      else this.ctx.lineTo(px, py);
    }
    this.ctx.strokeStyle = '#00ff88';
    this.ctx.lineWidth = 1.5;
    this.ctx.stroke();

    this.ctx.restore();

    this.drawScaleAndLabels(w, h);
    this.drawTunedCursor(w, h);
    this.drawHudOverlay(w, h);
  }

  drawScaleAndLabels(w, h) {
    const rulerH = 34;
    const rulerY = h - rulerH;
    const spanKhz = this.freqMax - this.freqMin;

    this.ctx.save();

    // Ruler background strip
    this.ctx.fillStyle = '#060f1b';
    this.ctx.fillRect(0, rulerY, w, rulerH);
    this.ctx.strokeStyle = 'rgba(0, 229, 255, 0.35)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(0, rulerY);
    this.ctx.lineTo(w, rulerY);
    this.ctx.stroke();

    // Draw frequency tick marks every 5 kHz (CAMRAS WebSDR screenshot appearance)
    this.ctx.font = '9px monospace';
    this.ctx.textBaseline = 'top';

    const tickStep = spanKhz > 150 ? 25 : (spanKhz > 60 ? 5 : 2);
    const startTick = Math.ceil(this.freqMin / tickStep) * tickStep;

    for (let f = startTick; f <= this.freqMax; f += tickStep) {
      const pct = (f - this.freqMin) / spanKhz;
      const x = Math.round(pct * w);

      // Minor tick line
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      this.ctx.beginPath();
      this.ctx.moveTo(x, rulerY);
      this.ctx.lineTo(x, rulerY + 5);
      this.ctx.stroke();

      // Tick number label
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      const text = `${Math.round(f)}`;
      const tw = this.ctx.measureText(text).width;
      if (x - tw / 2 >= 2 && x + tw / 2 <= w - 2) {
        this.ctx.fillText(text, x - tw / 2, rulerY + 6);
      }
    }

    // Now render the WebSDR preset labels (amber boxes with black text, as in user screenshot)
    const currentPreset = this.presets[this.band] || this.presets['graves'];
    const labels = currentPreset.labels || [];

    labels.forEach(item => {
      const pct = (item.freq - this.freqMin) / spanKhz;
      const x = pct * w;

      if (x >= 0 && x <= w) {
        // Vertical guideline
        this.ctx.strokeStyle = item.highlight ? 'rgba(255, 179, 0, 0.5)' : 'rgba(0, 229, 255, 0.25)';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([2, 4]);
        this.ctx.beginPath();
        this.ctx.moveTo(x, 22);
        this.ctx.lineTo(x, rulerY);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Amber tag box (CAMRAS WebSDR screenshot appearance)
        this.ctx.font = 'bold 9px monospace';
        const labelText = item.label;
        const textWidth = this.ctx.measureText(labelText).width;
        const boxW = textWidth + 8;
        const boxX = Math.max(2, Math.min(w - boxW - 2, x - boxW / 2));
        const boxY = rulerY + 18;

        this.ctx.fillStyle = item.highlight ? '#ff9900' : 'rgba(220, 140, 30, 0.85)';
        this.ctx.strokeStyle = '#ffb300';
        this.ctx.lineWidth = 1;
        this.ctx.fillRect(boxX, boxY, boxW, 14);
        this.ctx.strokeRect(boxX, boxY, boxW, 14);

        this.ctx.fillStyle = '#000000';
        this.ctx.fillText(labelText, boxX + 4, boxY + 2);
      }
    });

    this.ctx.restore();
  }

  drawTunedCursor(w, h) {
    const rulerH = 34;
    const rulerY = h - rulerH;
    const spanKhz = this.freqMax - this.freqMin;
    const pct = (this.frequency - this.freqMin) / spanKhz;
    const x = pct * w;
    const filterPx = Math.max(3, (this.filterBw / spanKhz) * w);

    this.ctx.save();

    // 1. Filter passband shade across waterfall
    this.ctx.fillStyle = 'rgba(0, 229, 255, 0.18)';
    this.ctx.fillRect(x - filterPx / 2, 0, filterPx, rulerY);

    // 2. Yellow center line cursor
    this.ctx.strokeStyle = '#ffff00';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(x, 0);
    this.ctx.lineTo(x, rulerY);
    this.ctx.stroke();

    // 3. Green notch pointer bracket at the ruler boundary (CAMRAS WebSDR exact look)
    this.ctx.fillStyle = '#00ff66';
    this.ctx.strokeStyle = '#00ff66';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x - 5, rulerY + 6);
    this.ctx.lineTo(x, rulerY);
    this.ctx.lineTo(x + 5, rulerY + 6);
    this.ctx.stroke();

    // 4. Live Tuned frequency badge at top of line
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    this.ctx.fillRect(x - 38, 2, 76, 16);
    this.ctx.strokeStyle = '#ffff00';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x - 38, 2, 76, 16);

    this.ctx.fillStyle = '#ffff00';
    this.ctx.font = 'bold 9px monospace';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(`${this.frequency.toFixed(2)} kHz`, x - 34, 4);

    this.ctx.restore();
  }

  drawHudOverlay(w, h) {
    this.ctx.save();
    this.ctx.font = '10px monospace';
    this.ctx.textBaseline = 'top';

    // Flashing green live stream indicator
    const isBlink = (Math.floor(Date.now() / 600) % 2) === 0;
    this.ctx.fillStyle = isBlink ? '#00ff88' : '#00aa55';
    this.ctx.beginPath();
    this.ctx.arc(10, 10, 3.5, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#00e5ff';
    this.ctx.fillText(`LIVE FFT SPECTROGRAM // 512 BINS // SPEED: ${this.speed.toUpperCase()} // NOISE: -100.2 dBm`, 20, 5);

    // Right-aligned dish azimuth and elevation
    const statusText = `CAMRAS 25m DISH // AZ: ${this.dishAzimuth.toFixed(1)}° EL: ${this.dishElevation.toFixed(1)}°`;
    const tw = this.ctx.measureText(statusText).width;
    this.ctx.fillStyle = 'rgba(255, 179, 0, 0.85)';
    this.ctx.fillText(statusText, w - tw - 10, 5);

    this.ctx.restore();
  }

  destroy() {
    if (this.animId) cancelAnimationFrame(this.animId);
    if (this.autoEventTimer) clearInterval(this.autoEventTimer);
  }
}
