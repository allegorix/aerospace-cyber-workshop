// Main Application Controller for Aerospace Cybersecurity Workshop
import { MODULES, SLIDES, WORKSHOP_META } from './data.js';
import { sounds } from './audio.js';
import { AdsbSimulator } from './simulators/adsb-radar.js';
import { AvionicsSimulator } from './simulators/avionics-bus.js';
import { OrbitSimulator } from './simulators/orbit-ground.js';
import { CtfTooling } from './simulators/ctf-tooling.js';
import { MeteorRadarSimulator } from './simulators/meteor-radar.js';
import { LiveWallpaper } from './live-wallpaper.js';

class AppController {
  constructor() {
    this.currentView = 'curriculum'; // 'curriculum', 'slides', 'simulators', 'ctf'
    this.currentSlideIdx = 0; // 0 to 11 (Slides 1 to 12)
    this.speakerNotesOpen = false;

    // Workshop Timer state (45 minutes = 2700 seconds)
    this.totalWorkshopSeconds = 45 * 60;
    this.remainingSeconds = 45 * 60;
    this.timerRunning = false;
    this.timerInterval = null;
    this.currentActiveModuleId = 1;

    // Simulator & wallpaper instances
    this.adsbSim = null;
    this.avionicsSim = null;
    this.orbitSim = null;
    this.ctfTooling = null;
    this.meteorRadarSim = null;
    this.liveWallpaper = null;

    this.init();
  }

  init() {
    this.liveWallpaper = new LiveWallpaper('live-wallpaper-canvas');
    this.renderCurriculum();
    this.initTimer();
    this.bindGlobalEvents();
    this.showView('curriculum');
    this.initSimulators();
  }

  initSimulators() {
    this.adsbSim = new AdsbSimulator('radarCanvas', 'adsb-packet-feed', 'adsb-sim-status');
    this.avionicsSim = new AvionicsSimulator('bus-feed', 'word-inspector-container');
    this.orbitSim = new OrbitSimulator('orbitCanvas', 'waterfallCanvas');
    this.ctfTooling = new CtfTooling();
    this.meteorRadarSim = new MeteorRadarSimulator('sdrWaterfallCanvas', 'sim-panel-websdr');

    // Bind simulator action buttons
    const btnGhost = document.getElementById('btn-inject-ghost');
    if (btnGhost) {
      btnGhost.addEventListener('click', () => this.adsbSim.injectGhostAircraft());
    }

    const btnClearGhost = document.getElementById('btn-clear-ghost');
    if (btnClearGhost) {
      btnClearGhost.addEventListener('click', () => this.adsbSim.clearGhost());
    }

    const btnMlat = document.getElementById('btn-toggle-mlat');
    if (btnMlat) {
      btnMlat.addEventListener('click', () => this.adsbSim.toggleMlat());
    }
  }

  bindGlobalEvents() {
    // Top navigation buttons
    document.querySelectorAll('[data-view-nav]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetView = e.currentTarget.dataset.viewNav;
        this.showView(targetView);
        sounds.playClick();
      });
    });

    // Quick Live Radar WebSDR button in header actions
    const btnWebsdrNav = document.getElementById('btn-open-websdr-nav');
    if (btnWebsdrNav) {
      btnWebsdrNav.addEventListener('click', () => {
        this.showView('simulators');
        const websdrTab = document.querySelector('[data-sim-tab="websdr"]');
        if (websdrTab) websdrTab.click();
        sounds.playClick();
      });
    }

    // Audio mute button
    const muteBtn = document.getElementById('btn-audio-toggle');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        const isMuted = sounds.toggleMute();
        muteBtn.innerHTML = isMuted ? '🔇 Audio Off' : '🔊 Audio On';
        muteBtn.classList.toggle('muted', isMuted);
      });
    }

    // Live Wallpaper mode toggle
    const liveWpBtn = document.getElementById('btn-toggle-live-wp');
    if (liveWpBtn && this.liveWallpaper) {
      liveWpBtn.addEventListener('click', () => {
        const nextMode = this.liveWallpaper.cycleMode();
        sounds.playClick();
        if (nextMode === 'full') {
          liveWpBtn.innerHTML = '🪐 Live: Full Orbit';
          liveWpBtn.classList.remove('muted');
        } else if (nextMode === 'stars') {
          liveWpBtn.innerHTML = '✨ Live: Calm Stars';
          liveWpBtn.classList.remove('muted');
        } else {
          liveWpBtn.innerHTML = '⏸️ Live: Paused';
          liveWpBtn.classList.add('muted');
        }
      });
    }

    // Background brightness toggle
    const bgBtn = document.getElementById('btn-toggle-bg');
    const bgOverlay = document.getElementById('aerospace-bg-overlay');
    const bgModes = [
      { name: 'Vibrant', class: 'vibrant' },
      { name: 'Balanced', class: 'balanced' },
      { name: 'Stealth', class: 'stealth' }
    ];
    let currentBgModeIdx = 0; // Starts vibrant so the background image is crystal clear!

    if (bgBtn && bgOverlay) {
      bgOverlay.className = `aerospace-bg-overlay ${bgModes[currentBgModeIdx].class}`;
      bgBtn.addEventListener('click', () => {
        currentBgModeIdx = (currentBgModeIdx + 1) % bgModes.length;
        const mode = bgModes[currentBgModeIdx];
        bgOverlay.className = `aerospace-bg-overlay ${mode.class}`;
        bgBtn.innerHTML = `🌌 BG: ${mode.name}`;
        sounds.playClick();
      });
    }

    // Keyboard navigation
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (this.currentView === 'slides') {
        if (e.key === 'ArrowRight' || e.key === ' ') {
          e.preventDefault();
          this.nextSlide();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          this.prevSlide();
        } else if (e.key === 's' || e.key === 'S') {
          this.toggleSpeakerNotes();
        } else if (e.key === 'f' || e.key === 'F') {
          this.toggleFullscreen();
        }
      }
    });

    // Slide navigation controls
    const btnNext = document.getElementById('btn-next-slide');
    const btnPrev = document.getElementById('btn-prev-slide');
    if (btnNext) btnNext.addEventListener('click', () => this.nextSlide());
    if (btnPrev) btnPrev.addEventListener('click', () => this.prevSlide());

    const btnNotesToggle = document.getElementById('btn-toggle-notes');
    if (btnNotesToggle) btnNotesToggle.addEventListener('click', () => this.toggleSpeakerNotes());

    const btnFullscreen = document.getElementById('btn-fullscreen-deck');
    if (btnFullscreen) btnFullscreen.addEventListener('click', () => this.toggleFullscreen());

    // Timer controls
    const btnTimerToggle = document.getElementById('btn-timer-toggle');
    const btnTimerReset = document.getElementById('btn-timer-reset');
    if (btnTimerToggle) btnTimerToggle.addEventListener('click', () => this.toggleTimer());
    if (btnTimerReset) btnTimerReset.addEventListener('click', () => this.resetTimer());

    // Shortcuts modal
    const btnShortcuts = document.getElementById('btn-open-shortcuts');
    const modalShortcuts = document.getElementById('modal-shortcuts');
    const btnCloseShortcuts = document.getElementById('btn-close-shortcuts');
    if (btnShortcuts && modalShortcuts) {
      btnShortcuts.addEventListener('click', () => {
        modalShortcuts.classList.remove('hidden');
        sounds.playClick();
      });
    }
    if (btnCloseShortcuts && modalShortcuts) {
      btnCloseShortcuts.addEventListener('click', () => {
        modalShortcuts.classList.add('hidden');
        sounds.playClick();
      });
    }
  }

  showView(viewName, optSlideNum = null) {
    this.currentView = viewName;

    // Update active nav links
    document.querySelectorAll('[data-view-nav]').forEach(btn => {
      if (btn.dataset.viewNav === viewName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Toggle view sections
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.add('hidden');
    });

    const activeSec = document.getElementById(`view-${viewName}`);
    if (activeSec) {
      activeSec.classList.remove('hidden');
    }

    if (viewName === 'slides') {
      if (optSlideNum !== null) {
        this.currentSlideIdx = Math.max(0, Math.min(SLIDES.length - 1, optSlideNum - 1));
      }
      this.renderSlideDeck();
    } else if (viewName === 'simulators') {
      setTimeout(() => {
        if (this.meteorRadarSim) {
          this.meteorRadarSim.resizeCanvas();
          this.meteorRadarSim.drawWaterfall();
        }
      }, 40);
    }
  }

  // Workshop Run-of-Show Master Countdown Timer
  initTimer() {
    this.updateTimerDisplay();
  }

  toggleTimer() {
    sounds.playClick();
    const btn = document.getElementById('btn-timer-toggle');
    if (this.timerRunning) {
      clearInterval(this.timerInterval);
      this.timerRunning = false;
      if (btn) btn.innerHTML = '▶ Play';
    } else {
      this.timerRunning = true;
      if (btn) btn.innerHTML = '⏸ Pause';
      this.timerInterval = setInterval(() => {
        if (this.remainingSeconds > 0) {
          this.remainingSeconds--;
          this.updateTimerDisplay();
        } else {
          clearInterval(this.timerInterval);
          this.timerRunning = false;
          sounds.playAlert();
          if (btn) btn.innerHTML = '▶ Play';
        }
      }, 1000);
    }
  }

  resetTimer() {
    sounds.playClick();
    clearInterval(this.timerInterval);
    this.timerRunning = false;
    this.remainingSeconds = this.totalWorkshopSeconds;
    const btn = document.getElementById('btn-timer-toggle');
    if (btn) btn.innerHTML = '▶ Play';
    this.updateTimerDisplay();
  }

  updateTimerDisplay() {
    const elapsedMinutes = (this.totalWorkshopSeconds - this.remainingSeconds) / 60;
    const mins = Math.floor(this.remainingSeconds / 60);
    const secs = this.remainingSeconds % 60;
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    const timerElem = document.getElementById('timer-clock');
    if (timerElem) timerElem.textContent = formatted;

    // Determine active module based on time elapsed
    // Module 1: 0 - 10m
    // Module 2: 10 - 22m
    // Module 3: 22 - 35m
    // Module 4: 35 - 45m
    let activeMod = 1;
    if (elapsedMinutes >= 35) activeMod = 4;
    else if (elapsedMinutes >= 22) activeMod = 3;
    else if (elapsedMinutes >= 10) activeMod = 2;

    if (activeMod !== this.currentActiveModuleId) {
      this.currentActiveModuleId = activeMod;
      sounds.playModuleChime();
      this.highlightActiveModule();
    }

    const progressPercent = ((this.totalWorkshopSeconds - this.remainingSeconds) / this.totalWorkshopSeconds) * 100;
    const bar = document.getElementById('timer-progress-fill');
    if (bar) bar.style.width = `${progressPercent}%`;

    const activeModBadge = document.getElementById('timer-active-mod');
    if (activeModBadge) {
      activeModBadge.textContent = `Active: Module ${activeMod} (${MODULES[activeMod - 1].title})`;
    }
  }

  highlightActiveModule() {
    document.querySelectorAll('.module-card').forEach(card => {
      const modId = parseInt(card.dataset.moduleId);
      if (modId === this.currentActiveModuleId) {
        card.classList.add('active-timer-mod');
      } else {
        card.classList.remove('active-timer-mod');
      }
    });
  }

  // Curriculum View Rendering
  renderCurriculum() {
    const container = document.getElementById('curriculum-modules-grid');
    if (!container) return;

    container.innerHTML = MODULES.map(mod => {
      const modSlides = SLIDES.filter(s => s.moduleId === mod.id);
      return `
        <div class="module-card ${mod.id === this.currentActiveModuleId ? 'active-timer-mod' : ''}" data-module-id="${mod.id}">
          <div class="mod-header">
            <span class="mod-badge mono">${mod.badge}</span>
            <div class="mod-time-badge mono">⏱️ ${mod.duration} MINS | ${mod.slidesRange}</div>
          </div>
          <h2 class="mod-title">${mod.title}</h2>
          <div class="mod-objective">
            <span class="obj-label">🎯 CORE OBJECTIVE:</span>
            <p>${mod.coreObjective}</p>
          </div>
          <p class="mod-summary">${mod.summary}</p>

          <div class="mod-concepts">
            <strong>Key Concepts & Takeaways:</strong>
            <ul>
              ${mod.keyConcepts.map(c => `<li>${c}</li>`).join('')}
            </ul>
          </div>

          <div class="mod-slides-list">
            <span class="slides-heading">Slides in this Module:</span>
            <div class="slide-pills">
              ${modSlides.map(s => `
                <button class="slide-pill" data-slide-id="${s.id}">
                  <span class="pill-num">#${s.id}</span>
                  <span class="pill-name">${s.title}</span>
                </button>
              `).join('')}
            </div>
          </div>

          <div class="mod-actions">
            <button class="btn btn-primary btn-launch-mod" data-start-slide="${mod.startSlide}">
              Launch Presentation (${mod.slidesRange})
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Bind slide jump pills and module buttons
    container.querySelectorAll('.slide-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        const slideId = parseInt(e.currentTarget.dataset.slideId);
        sounds.playClick();
        this.showView('slides', slideId);
      });
    });

    container.querySelectorAll('.btn-launch-mod').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const startSlide = parseInt(e.currentTarget.dataset.startSlide);
        sounds.playClick();
        this.showView('slides', startSlide);
      });
    });
  }

  // Slide Deck Rendering & Navigation
  renderSlideDeck() {
    const slide = SLIDES[this.currentSlideIdx];
    if (!slide) return;

    // Header updates
    const titleElem = document.getElementById('slide-title');
    const subtitleElem = document.getElementById('slide-subtitle');
    const numBadge = document.getElementById('slide-number-badge');
    const trackBadge = document.getElementById('slide-track-badge');
    const durBadge = document.getElementById('slide-duration-badge');
    const contentArea = document.getElementById('slide-dynamic-content');

    if (titleElem) titleElem.textContent = slide.title;
    if (subtitleElem) subtitleElem.textContent = slide.subtitle;
    if (numBadge) numBadge.textContent = slide.slideNumber;
    if (durBadge) durBadge.textContent = `⏱️ ${slide.duration}`;

    if (trackBadge) {
      if (slide.track) {
        const trackMeta = WORKSHOP_META.tracks.find(t => t.id === slide.track);
        trackBadge.innerHTML = `<span class="track-tag" style="border-color: ${trackMeta.color}; color: ${trackMeta.color}">${trackMeta.icon} ${trackMeta.name}</span>`;
      } else {
        const modMeta = MODULES.find(m => m.id === slide.moduleId);
        trackBadge.innerHTML = `<span class="mod-tag mono">${modMeta.badge}</span>`;
      }
    }

    // Render Slide Content Blocks
    if (contentArea) {
      contentArea.innerHTML = `
        ${slide.quote ? `
          <blockquote class="slide-quote">
            "${slide.quote}"
          </blockquote>
        ` : ''}

        <div class="slide-blocks">
          ${slide.contentBlocks.map(block => this.renderContentBlock(block)).join('')}
        </div>

        ${slide.interactiveAction ? `
          <div class="slide-action-box">
            <div class="action-desc">🚀 Interactive Simulation Ready for this Topic:</div>
            <button class="btn btn-accent btn-slide-sim" data-target="${slide.interactiveAction.target}">
              ${slide.interactiveAction.label} →
            </button>
          </div>
        ` : ''}
      `;

      // Bind slide action button if present
      const btnSim = contentArea.querySelector('.btn-slide-sim');
      if (btnSim) {
        btnSim.addEventListener('click', () => {
          sounds.playClick();
          const target = btnSim.dataset.target;
          if (target === 'adsb' || target === 'avionics' || target === 'orbit' || target === 'websdr') {
            this.showView('simulators');
            // activate relevant tab in simulators
            const simTab = document.querySelector(`[data-sim-tab="${target}"]`);
            if (simTab) simTab.click();
          } else if (target === 'ctf') {
            this.showView('ctf');
          } else {
            this.showView(target);
          }
        });
      }
    }

    // Update Speaker Notes
    const notesContainer = document.getElementById('speaker-notes-content');
    if (notesContainer) {
      notesContainer.innerHTML = `
        <h4>Presenter Talking Points & Facilitator Guide</h4>
        <ul>
          ${slide.speakerNotes.map(n => `<li>${n}</li>`).join('')}
        </ul>
      `;
    }

    // Update thumbnails rail
    this.renderSlideThumbnails();

    // Update progress bar
    const slideBar = document.getElementById('slide-progress-fill');
    if (slideBar) {
      const pct = ((this.currentSlideIdx + 1) / SLIDES.length) * 100;
      slideBar.style.width = `${pct}%`;
    }
  }

  renderContentBlock(block) {
    if (block.type === 'lead') {
      return `<p class="slide-lead">${block.text}</p>`;
    }
    if (block.type === 'comparisonGrid') {
      return `
        <div class="deck-comparison-grid">
          <div class="comp-col left">
            <h4>${block.left.title}</h4>
            <ul>${block.left.items.map(it => `<li>${it}</li>`).join('')}</ul>
          </div>
          <div class="comp-col right">
            <h4>${block.right.title}</h4>
            <ul>${block.right.items.map(it => `<li>${it}</li>`).join('')}</ul>
          </div>
        </div>
      `;
    }
    if (block.type === 'architectureDiagram') {
      return `
        <div class="deck-arch-diagram">
          <div class="arch-title">${block.title}</div>
          <div class="arch-nodes">
            ${block.nodes.map(n => `
              <div class="arch-node">
                <div class="node-name">${n.name}</div>
                <div class="node-desc">${n.desc}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
    if (block.type === 'codeExploration') {
      return `
        <div class="deck-code-block">
          <div class="code-title">${block.title}</div>
          <pre class="mono"><code>${this.escapeHtml(block.codeSnippet)}</code></pre>
        </div>
      `;
    }
    if (block.type === 'vulnerabilityHighlight' || block.type === 'keyTakeaway' || block.type === 'proTip') {
      return `
        <div class="deck-highlight-box ${block.type}">
          <h4>${block.title}</h4>
          <p>${block.text}</p>
        </div>
      `;
    }
    if (block.type === 'domainsList') {
      return `
        <div class="deck-domains-list">
          ${block.domains.map(d => `
            <div class="domain-card">
              <div class="dom-header">
                <span class="dom-name">${d.name}</span>
                <span class="dom-level mono">${d.securityLevel}</span>
              </div>
              <p class="dom-desc">${d.desc}</p>
            </div>
          `).join('')}
        </div>
      `;
    }
    if (block.type === 'specBreakdown') {
      return `
        <div class="deck-spec-table">
          <div class="spec-title">${block.title}</div>
          <div class="spec-rows">
            ${block.fields.map(f => `
              <div class="spec-row">
                <span class="spec-bits mono">${f.bits}</span>
                <span class="spec-name mono">${f.name}</span>
                <span class="spec-desc">${f.desc}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
    if (block.type === 'attackGrid') {
      return `
        <div class="deck-attack-grid">
          ${block.attacks.map(a => `
            <div class="attack-card">
              <div class="att-header">
                <span class="att-name">${a.name}</span>
                <span class="badge ${a.severity === 'CRITICAL' ? 'danger' : 'warning'}">${a.severity}</span>
              </div>
              <p class="att-desc">${a.desc}</p>
            </div>
          `).join('')}
        </div>
      `;
    }
    if (block.type === 'defenseHighlight') {
      return `
        <div class="deck-defense-box">
          <h4>🛡️ ${block.title}</h4>
          <p>${block.text}</p>
        </div>
      `;
    }
    if (block.type === 'toolMatrix') {
      return `
        <div class="deck-tool-matrix">
          ${block.categories.map(cat => `
            <div class="tool-cat">
              <h4>${cat.category}</h4>
              <div class="tool-items">
                ${cat.tools.map(t => `
                  <div class="tool-item">
                    <span class="tool-name mono">${t.name}</span>
                    <span class="tool-desc">${t.desc}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }
    if (block.type === 'stepsList') {
      return `
        <div class="deck-steps-list">
          ${block.steps.map(s => `
            <div class="step-row">
              <div class="step-num mono">${s.step}</div>
              <div class="step-detail">${s.detail}</div>
            </div>
          `).join('')}
        </div>
      `;
    }
    if (block.type === 'roeCallout') {
      return `
        <div class="deck-roe-box">
          <h4>⚖️ ${block.title}</h4>
          <ul>
            ${block.rules.map(r => `<li><strong>${r.split(':')[0]}:</strong>${r.split(':')[1] || ''}</li>`).join('')}
          </ul>
        </div>
      `;
    }
    if (block.type === 'capstoneBriefing') {
      return `
        <div class="deck-capstone-brief">
          <h4>🛰️ ${block.title}</h4>
          <p>${block.scenario}</p>
          <ol>
            ${block.missions.map(m => `<li>${m}</li>`).join('')}
          </ol>
        </div>
      `;
    }
    return '';
  }

  escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  renderSlideThumbnails() {
    const container = document.getElementById('slide-thumbnails-rail');
    if (!container) return;

    container.innerHTML = SLIDES.map((s, idx) => `
      <div class="thumb-card ${idx === this.currentSlideIdx ? 'active' : ''}" data-idx="${idx}">
        <span class="thumb-num">#${s.id}</span>
        <span class="thumb-title">${s.title}</span>
      </div>
    `).join('');

    container.querySelectorAll('.thumb-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.idx);
        this.currentSlideIdx = idx;
        sounds.playClick();
        this.renderSlideDeck();
      });
    });
  }

  nextSlide() {
    if (this.currentSlideIdx < SLIDES.length - 1) {
      this.currentSlideIdx++;
      sounds.playClick();
      this.renderSlideDeck();
    }
  }

  prevSlide() {
    if (this.currentSlideIdx > 0) {
      this.currentSlideIdx--;
      sounds.playClick();
      this.renderSlideDeck();
    }
  }

  toggleSpeakerNotes() {
    sounds.playClick();
    this.speakerNotesOpen = !this.speakerNotesOpen;
    const drawer = document.getElementById('speaker-notes-drawer');
    const btn = document.getElementById('btn-toggle-notes');
    if (drawer) {
      drawer.classList.toggle('open', this.speakerNotesOpen);
    }
    if (btn) {
      btn.classList.toggle('active', this.speakerNotesOpen);
    }
  }

  toggleFullscreen() {
    const elem = document.getElementById('view-slides');
    if (!document.fullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }
}

// Bootstrap on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new AppController();

  // Handle Simulator tab clicks
  document.querySelectorAll('[data-sim-tab]').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('[data-sim-tab]').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.sim-panel').forEach(p => p.classList.add('hidden'));

      e.currentTarget.classList.add('active');
      const targetPanel = document.getElementById(`sim-panel-${e.currentTarget.dataset.simTab}`);
      if (targetPanel) {
        targetPanel.classList.remove('hidden');
      }

      if (e.currentTarget.dataset.simTab === 'websdr' && window.app && window.app.meteorRadarSim) {
        setTimeout(() => {
          window.app.meteorRadarSim.resizeCanvas();
          window.app.meteorRadarSim.drawWaterfall();
        }, 30);
      }

      sounds.playClick();
    });
  });
});
