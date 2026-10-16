// Avionics Bus Packet Inspector & Word Crafter (ARINC 429 & MIL-STD-1553)
import { sounds } from '../audio.js';

export class AvionicsSimulator {
  constructor(feedId, inspectorId) {
    this.feedElem = document.getElementById(feedId);
    this.inspectorElem = document.getElementById(inspectorId);
    this.timer = null;
    this.activeProtocol = 'arinc429'; // 'arinc429' or 'mil1553'

    // Virtual aircraft flight instruments state
    this.flightState = {
      altitude: 32000, // ft
      pitch: 2.4,      // deg
      airspeed: 450,   // kts
      heading: 268,    // deg
      status: "NORMAL"
    };

    this.standardWords = [
      { label: "203", labelName: "Pressure Altitude", sdi: "00", ssm: "00", val: () => this.flightState.altitude.toFixed(0) + " ft" },
      { label: "210", labelName: "True Airspeed", sdi: "01", ssm: "00", val: () => this.flightState.airspeed.toFixed(0) + " kts" },
      { label: "027", labelName: "Flight Path Angle", sdi: "00", ssm: "00", val: () => this.flightState.pitch.toFixed(1) + "°" },
      { label: "320", labelName: "Magnetic Heading", sdi: "00", ssm: "00", val: () => this.flightState.heading.toFixed(0) + "°" },
      { label: "310", labelName: "Present Pos Latitude", sdi: "00", ssm: "00", val: () => "51.4700 N" }
    ];

    this.bindEvents();
    this.startStreaming();
    this.updateInstrumentsDisplay();
  }

  bindEvents() {
    const btnInject = document.getElementById('btn-inject-arinc');
    if (btnInject) {
      btnInject.addEventListener('click', () => this.handleInjectWord());
    }

    const protoTabs = document.querySelectorAll('.proto-tab');
    protoTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        protoTabs.forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        this.activeProtocol = e.target.dataset.proto;
        sounds.playClick();
        this.clearFeed();
      });
    });
  }

  clearFeed() {
    if (this.feedElem) {
      this.feedElem.innerHTML = '';
    }
  }

  calculateOddParity(bits31) {
    let count = 0;
    for (let i = 0; i < bits31.length; i++) {
      if (bits31[i] === '1') count++;
    }
    // Odd parity: total number of 1s across all 32 bits must be ODD
    return (count % 2 === 0) ? '1' : '0';
  }

  formatBinaryWord(labelOctal, sdi, dataVal, ssm, forceBadParity = false) {
    // 8-bit label reversed for transmission
    let labelInt = parseInt(labelOctal, 8);
    let labelBin = labelInt.toString(2).padStart(8, '0');
    // Reverse bits for ARINC 429 transmission standard (bit 1 is LSB of label)
    labelBin = labelBin.split('').reverse().join('');

    let sdiBin = sdi.padStart(2, '0');
    let dataBin = Math.abs(parseInt(dataVal) || 0).toString(2).padStart(19, '0').slice(-19);
    let ssmBin = ssm.padStart(2, '0');

    let first31 = labelBin + sdiBin + dataBin + ssmBin;
    let parity = forceBadParity ? (this.calculateOddParity(first31) === '1' ? '0' : '1') : this.calculateOddParity(first31);
    let full32 = first31 + parity;

    // Hex representation
    let hex = parseInt(full32, 2).toString(16).toUpperCase().padStart(8, '0');
    return { full32, hex, parity, labelBin, sdiBin, dataBin, ssmBin };
  }

  handleInjectWord() {
    const labelInput = document.getElementById('craft-label').value;
    const sdiInput = document.getElementById('craft-sdi').value;
    const dataInput = document.getElementById('craft-data').value;
    const ssmInput = document.getElementById('craft-ssm').value;
    const badParity = document.getElementById('craft-bad-parity').checked;

    const crafted = this.formatBinaryWord(labelInput, sdiInput, dataInput, ssmInput, badParity);

    // Apply injection effects to virtual avionics instruments
    let effectMessage = "";
    if (badParity) {
      sounds.playAlert();
      effectMessage = "⚠️ PARITY FAULT: Word rejected by Flight Computer LRU due to bit error.";
    } else {
      sounds.playSuccess();
      if (labelInput === "203") {
        this.flightState.altitude = parseFloat(dataInput) || this.flightState.altitude;
        effectMessage = `ALTIMETER OVERRIDDEN TO ${this.flightState.altitude.toLocaleString()} FT!`;
      } else if (labelInput === "027") {
        this.flightState.pitch = parseFloat(dataInput) || this.flightState.pitch;
        effectMessage = `FLIGHT PATH PITCH OVERRIDDEN TO ${this.flightState.pitch}°!`;
      } else if (labelInput === "210") {
        this.flightState.airspeed = parseFloat(dataInput) || this.flightState.airspeed;
        effectMessage = `TRUE AIRSPEED OVERRIDDEN TO ${this.flightState.airspeed} KTS!`;
      } else {
        effectMessage = `CUSTOM BUS LABEL ${labelInput} (OCTAL) INJECTED INTO DATA STREAM.`;
      }
    }

    this.addFeedItem({
      time: new Date().toISOString().substring(11, 19),
      proto: "ARINC 429",
      label: labelInput,
      labelName: `INJECTED (0x${crafted.hex})`,
      data: `${dataInput} [${effectMessage}]`,
      raw: crafted.full32,
      hex: `0x${crafted.hex}`,
      isInjected: true,
      hasError: badParity
    });

    this.updateInstrumentsDisplay();
  }

  updateInstrumentsDisplay() {
    const altElem = document.getElementById('inst-alt');
    const pitchElem = document.getElementById('inst-pitch');
    const spdElem = document.getElementById('inst-spd');
    const horizonBar = document.getElementById('inst-horizon');

    if (altElem) altElem.textContent = `${this.flightState.altitude.toLocaleString()} FT`;
    if (pitchElem) pitchElem.textContent = `${this.flightState.pitch > 0 ? '+' : ''}${this.flightState.pitch}°`;
    if (spdElem) spdElem.textContent = `${this.flightState.airspeed} KTS`;

    if (horizonBar) {
      const clampedPitch = Math.max(-25, Math.min(25, this.flightState.pitch));
      horizonBar.style.transform = `translateY(${clampedPitch * -3}px)`;
    }
  }

  addFeedItem(item) {
    if (!this.feedElem) return;

    const div = document.createElement('div');
    div.className = `bus-entry ${item.isInjected ? 'injected' : ''} ${item.hasError ? 'error' : ''}`;
    div.innerHTML = `
      <div class="bus-col time">${item.time}</div>
      <div class="bus-col proto">${item.proto}</div>
      <div class="bus-col label mono">${item.label} (${item.labelName})</div>
      <div class="bus-col hex mono">${item.hex}</div>
      <div class="bus-col val">${item.data}</div>
    `;

    div.addEventListener('click', () => {
      this.inspectWord(item);
      sounds.playClick();
    });

    this.feedElem.prepend(div);
    while (this.feedElem.children.length > 30) {
      this.feedElem.removeChild(this.feedElem.lastChild);
    }
  }

  inspectWord(item) {
    if (!this.inspectorElem) return;
    this.inspectorElem.innerHTML = `
      <div class="inspector-card">
        <div class="card-title">
          <span>Word Dissector: ${item.labelName} [${item.hex}]</span>
          <span class="badge ${item.isInjected ? 'warning' : 'success'}">${item.isInjected ? 'SPOOFED ON BUS' : 'GENUINE LRU'}</span>
        </div>
        <div class="bit-breakdown mono">
          <div class="bit-group">
            <span class="tag">B1-8: Label (Oct ${item.label})</span>
            <span class="bits">${item.raw.slice(0, 8)}</span>
          </div>
          <div class="bit-group">
            <span class="tag">B9-10: SDI</span>
            <span class="bits">${item.raw.slice(8, 10)}</span>
          </div>
          <div class="bit-group">
            <span class="tag">B11-29: Data Payload</span>
            <span class="bits">${item.raw.slice(10, 29)}</span>
          </div>
          <div class="bit-group">
            <span class="tag">B30-31: SSM</span>
            <span class="bits">${item.raw.slice(29, 31)}</span>
          </div>
          <div class="bit-group ${item.hasError ? 'error-bits' : ''}">
            <span class="tag">B32: Parity (${item.hasError ? 'FAULT' : 'ODD OK'})</span>
            <span class="bits">${item.raw.slice(31, 32)}</span>
          </div>
        </div>
        <div class="note">
          <strong>Security Analysis:</strong> Because ARINC 429 lacks an authentication header or cryptographic counter, any Line Replaceable Unit (LRU) on the wire can transmit valid octal words that flight computers will accept as ground truth.
        </div>
      </div>
    `;
  }

  startStreaming() {
    this.timer = setInterval(() => {
      if (this.activeProtocol === 'arinc429') {
        const template = this.standardWords[Math.floor(Math.random() * this.standardWords.length)];
        const dataVal = template.val();
        const numVal = parseInt(dataVal.replace(/[^0-9]/g, '')) || 100;
        const crafted = this.formatBinaryWord(template.label, template.sdi, numVal, template.ssm);

        this.addFeedItem({
          time: new Date().toISOString().substring(11, 19),
          proto: "ARINC 429",
          label: template.label,
          labelName: template.labelName,
          data: dataVal,
          raw: crafted.full32,
          hex: `0x${crafted.hex}`,
          isInjected: false,
          hasError: false
        });
      } else {
        // MIL-STD-1553 Command / Response
        const rts = [
          { rt: "03", name: "Engine Control Unit", subaddr: "02", count: 4, action: "RX DATA" },
          { rt: "05", name: "Stores Management System", subaddr: "01", count: 2, action: "STATUS QUERY" },
          { rt: "08", name: "Inertial Nav System (INS)", subaddr: "04", count: 6, action: "TX ATTITUDE" }
        ];
        const r = rts[Math.floor(Math.random() * rts.length)];
        const hex = "BC-" + r.rt + "-" + (Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase());

        this.addFeedItem({
          time: new Date().toISOString().substring(11, 19),
          proto: "MIL-1553",
          label: `RT ${r.rt}`,
          labelName: r.name,
          data: `${r.action} (Subaddr ${r.subaddr}, WordCount ${r.count})`,
          raw: "10010011010101100010",
          hex: hex,
          isInjected: false,
          hasError: false
        });
      }
    }, 1400);
  }

  destroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }
}
