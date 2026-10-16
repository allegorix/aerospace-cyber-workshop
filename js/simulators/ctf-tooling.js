// CTF Aerospace Tooling, Telemetry Decoder & Flag Validator
import { CTF_CHALLENGES, CHEAT_SHEET } from '../data.js';
import { sounds } from '../audio.js';

export class CtfTooling {
  constructor() {
    this.solvedFlags = new Set(JSON.parse(localStorage.getItem('aero_solved_flags') || '[]'));
    this.bindEvents();
    this.renderChallenges();
    this.renderCheatSheet();
  }

  bindEvents() {
    const btnDecode = document.getElementById('btn-decode-hex');
    if (btnDecode) {
      btnDecode.addEventListener('click', () => this.handleDecode());
    }

    const presetSelect = document.getElementById('decoder-preset-select');
    if (presetSelect) {
      presetSelect.addEventListener('change', (e) => {
        const input = document.getElementById('decoder-hex-input');
        if (input && e.target.value) {
          input.value = e.target.value;
          this.handleDecode();
        }
      });
    }
  }

  handleDecode() {
    const input = document.getElementById('decoder-hex-input');
    const output = document.getElementById('decoder-result');
    if (!input || !output) return;

    sounds.playClick();
    const hex = input.value.trim().replace(/^0x/, '').replace(/[^0-9A-Fa-f]/g, '');

    if (!hex) {
      output.innerHTML = `<div class="error-msg">Please enter a valid hexadecimal string or choose a preset.</div>`;
      return;
    }

    // Identify protocol heuristically
    if (hex.toUpperCase().startsWith("1ACFFC1D")) {
      // CCSDS Space Packet
      this.decodeCcsds(hex, output);
    } else if (hex.length === 28) {
      // 112-bit Mode S Extended Squitter
      this.decodeModeS(hex, output);
    } else if (hex.length === 8) {
      // 32-bit ARINC 429 word
      this.decodeArincWord(hex, output);
    } else {
      // Generic hex & ASCII dump
      this.decodeGeneric(hex, output);
    }
  }

  decodeModeS(hex, output) {
    const df = parseInt(hex.slice(0, 2), 16) >> 3;
    const icao = hex.slice(1, 7).toUpperCase();
    const payload = hex.slice(6, 22);
    const parity = hex.slice(22, 28);

    output.innerHTML = `
      <div class="decoded-card">
        <div class="proto-tag"><span class="badge success">ADS-B MODE S EXTENDED SQUITTER</span> 112 bits (14 bytes)</div>
        <div class="fields-grid mono">
          <div class="field"><span class="label">Downlink Format (DF)</span><span class="val">${df} (${df === 17 ? 'Extended Squitter Airborne' : 'Mode S reply'})</span></div>
          <div class="field"><span class="label">ICAO 24-bit Address</span><span class="val highlight">0x${icao}</span></div>
          <div class="field"><span class="label">Payload ME Field</span><span class="val">0x${payload} (56 bits)</span></div>
          <div class="field"><span class="label">CRC-24 Parity</span><span class="val">0x${parity}</span></div>
        </div>
        <div class="security-verdict">
          <strong>Security Analysis:</strong> Frame carries NO cryptographic signature or timestamp. Notice that the ICAO address (<code>${icao}</code>) is broadcast in plaintext.
        </div>
      </div>
    `;
  }

  decodeCcsds(hex, output) {
    const asm = hex.slice(0, 8); // 1ACFFC1D
    const rest = hex.slice(8);
    const vcid = parseInt(rest.slice(0, 4), 16) || 0;

    // Convert remaining bytes to ASCII text to look for hidden flags
    let ascii = "";
    for (let i = 0; i < rest.length; i += 2) {
      const code = parseInt(rest.substr(i, 2), 16);
      if (code >= 32 && code <= 126) {
        ascii += String.fromCharCode(code);
      } else {
        ascii += ".";
      }
    }

    const hasFlag = ascii.includes("FLAG{");

    output.innerHTML = `
      <div class="decoded-card">
        <div class="proto-tag"><span class="badge info">CCSDS SPACE PACKET PROTOCOL</span> Attached Sync Marker Found</div>
        <div class="fields-grid mono">
          <div class="field"><span class="label">Attached Sync Marker (ASM)</span><span class="val highlight">0x${asm} (0x1ACFFC1D)</span></div>
          <div class="field"><span class="label">Raw Payload Length</span><span class="val">${rest.length / 2} bytes</span></div>
          <div class="field"><span class="label">ASCII Carve Output</span><span class="val highlight ${hasFlag ? 'text-success' : ''}">${ascii}</span></div>
        </div>
        ${hasFlag ? `
          <div class="flag-extracted">
            🎉 <strong>FLAG DETECTED IN TELEMETRY STREAM:</strong> <code>${ascii.match(/FLAG\{.*?\}/)?.[0] || ascii}</code>
          </div>
        ` : ''}
      </div>
    `;
  }

  decodeArincWord(hex, output) {
    const val = parseInt(hex, 16);
    const bin = val.toString(2).padStart(32, '0');
    // Label is first 8 bits reversed
    const labelReversed = bin.slice(0, 8);
    const labelNorm = labelReversed.split('').reverse().join('');
    const labelOctal = parseInt(labelNorm, 2).toString(8).padStart(3, '0');

    output.innerHTML = `
      <div class="decoded-card">
        <div class="proto-tag"><span class="badge warning">ARINC 429 AVIONICS WORD</span> 32 bits (4 bytes)</div>
        <div class="fields-grid mono">
          <div class="field"><span class="label">Octal Label</span><span class="val highlight">Label ${labelOctal}</span></div>
          <div class="field"><span class="label">SDI (Bits 9-10)</span><span class="val">${bin.slice(8, 10)}</span></div>
          <div class="field"><span class="label">Data Field (Bits 11-29)</span><span class="val">0x${parseInt(bin.slice(10, 29), 2).toString(16).toUpperCase()}</span></div>
          <div class="field"><span class="label">SSM (Bits 30-31)</span><span class="val">${bin.slice(29, 31)}</span></div>
          <div class="field"><span class="label">Parity (Bit 32)</span><span class="val">${bin.slice(31, 32)}</span></div>
        </div>
      </div>
    `;
  }

  decodeGeneric(hex, output) {
    let ascii = "";
    for (let i = 0; i < hex.length; i += 2) {
      const code = parseInt(hex.substr(i, 2), 16);
      ascii += (code >= 32 && code <= 126) ? String.fromCharCode(code) : ".";
    }

    output.innerHTML = `
      <div class="decoded-card">
        <div class="proto-tag"><span class="badge">RAW HEX STREAM</span> ${hex.length / 2} bytes</div>
        <div class="mono" style="word-break: break-all; margin: 0.5rem 0; color: var(--cyan);">${hex}</div>
        <div class="field"><span class="label">ASCII Representation:</span> <span class="mono highlight">${ascii}</span></div>
      </div>
    `;
  }

  renderChallenges() {
    const container = document.getElementById('ctf-challenges-list');
    if (!container) return;

    container.innerHTML = CTF_CHALLENGES.map((ch, idx) => {
      const isSolved = this.solvedFlags.has(ch.id);
      return `
        <div class="challenge-card ${isSolved ? 'solved' : ''}" id="card-${ch.id}">
          <div class="ch-header">
            <div>
              <span class="ch-cat">${ch.category}</span>
              <h3 class="ch-title">${ch.title}</h3>
            </div>
            <div class="ch-points-badge">
              <span class="pts">${ch.points} PTS</span>
              <span class="status-icon">${isSolved ? '✓ SOLVED' : 'ACTIVE'}</span>
            </div>
          </div>
          <p class="ch-desc">${ch.description}</p>
          ${ch.payloadHex ? `
            <div class="ch-payload">
              <div class="ch-payload-label">Intercepted Telemetry Frame (Hex):</div>
              <div class="payload-box mono">
                <code>${ch.payloadHex}</code>
                <button class="btn-copy-sm" data-copy="${ch.payloadHex}">Copy</button>
              </div>
            </div>
          ` : ''}
          <div class="ch-submission">
            <input type="text" class="flag-input mono" id="flag-input-${ch.id}" placeholder="FLAG{...}" ${isSolved ? 'disabled value="' + ch.flag + '"' : ''}>
            <button class="btn btn-primary btn-submit-flag" data-id="${ch.id}" ${isSolved ? 'disabled' : ''}>
              ${isSolved ? 'Completed' : 'Submit Flag'}
            </button>
          </div>
          <div class="ch-hint-toggle" data-hint="hint-${ch.id}">💡 Need a Hint?</div>
          <div class="ch-hint hidden" id="hint-${ch.id}">${ch.hint}</div>
          <div class="ch-verdict hidden" id="verdict-${ch.id}"></div>
        </div>
      `;
    }).join('');

    // Bind challenge actions
    container.querySelectorAll('.btn-submit-flag').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        this.submitFlag(id);
      });
    });

    container.querySelectorAll('.ch-hint-toggle').forEach(tgl => {
      tgl.addEventListener('click', (e) => {
        const targetId = e.target.dataset.hint;
        const target = document.getElementById(targetId);
        if (target) {
          target.classList.toggle('hidden');
          sounds.playClick();
        }
      });
    });

    container.querySelectorAll('.btn-copy-sm').forEach(btn => {
      btn.addEventListener('click', (e) => {
        navigator.clipboard.writeText(e.target.dataset.copy);
        sounds.playClick();
        const orig = e.target.textContent;
        e.target.textContent = "Copied!";
        setTimeout(() => e.target.textContent = orig, 1200);
      });
    });

    this.updateScoreSummary();
  }

  submitFlag(id) {
    const ch = CTF_CHALLENGES.find(c => c.id === id);
    if (!ch) return;

    const input = document.getElementById(`flag-input-${id}`);
    const verdict = document.getElementById(`verdict-${id}`);
    const card = document.getElementById(`card-${id}`);
    const submitted = input ? input.value.trim() : '';

    if (submitted === ch.flag) {
      sounds.playSuccess();
      this.solvedFlags.add(id);
      localStorage.setItem('aero_solved_flags', JSON.stringify(Array.from(this.solvedFlags)));

      card.classList.add('solved');
      if (input) input.disabled = true;

      const submitBtn = card.querySelector('.btn-submit-flag');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Completed";
      }

      if (verdict) {
        verdict.className = 'ch-verdict success';
        verdict.classList.remove('hidden');
        verdict.innerHTML = `🎉 Correct Flag! +${ch.points} Points. <em>${ch.explanation}</em>`;
      }
    } else {
      sounds.playAlert();
      if (verdict) {
        verdict.className = 'ch-verdict error';
        verdict.classList.remove('hidden');
        verdict.innerHTML = `❌ Invalid Flag. Review the hint and verify telemetry fields!`;
      }
    }

    this.updateScoreSummary();
  }

  updateScoreSummary() {
    const scoreElem = document.getElementById('ctf-total-score');
    if (!scoreElem) return;

    let score = 0;
    let total = 0;
    CTF_CHALLENGES.forEach(c => {
      total += c.points;
      if (this.solvedFlags.has(c.id)) score += c.points;
    });

    scoreElem.textContent = `${score} / ${total} PTS (${this.solvedFlags.size} of ${CTF_CHALLENGES.length} Cleared)`;
  }

  renderCheatSheet() {
    const container = document.getElementById('cheat-sheet-content');
    if (!container) return;

    container.innerHTML = `
      <div class="cheat-category">
        <h4>📡 Aviation & ADS-B Tools</h4>
        <div class="cmd-list">
          ${CHEAT_SHEET.adsb.map(item => `
            <div class="cmd-row">
              <code class="mono">${item.cmd}</code>
              <span class="desc">${item.desc}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="cheat-category">
        <h4>🛰️ Space RF & Telemetry Tools</h4>
        <div class="cmd-list">
          ${CHEAT_SHEET.space.map(item => `
            <div class="cmd-row">
              <code class="mono">${item.cmd}</code>
              <span class="desc">${item.desc}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="cheat-category">
        <h4>✈️ Avionics Buses & Dissectors</h4>
        <div class="cmd-list">
          ${CHEAT_SHEET.avionics.map(item => `
            <div class="cmd-row">
              <code class="mono">${item.cmd}</code>
              <span class="desc">${item.desc}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
}
