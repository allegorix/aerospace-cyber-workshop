// Aerospace Cybersecurity Workshop - Comprehensive Curriculum & Slide Data
export const WORKSHOP_META = {
  title: "Aerospace Cybersecurity: From Aviation Buses to Orbital Telemetry",
  subtitle: "Reframing High-Altitude Systems as Networked Linux Boxes & Legacy Routers",
  totalDuration: 45, // minutes
  tracks: [
    { id: 1, name: "Track 1: ADS-B RF Broadcast", icon: "📡", color: "var(--cyan)" },
    { id: 2, name: "Track 2: SatCom RF & Telemetry", icon: "🛰️", color: "var(--blue)" },
    { id: 3, name: "Track 3: Ground Station Exploitation", icon: "🌍", color: "var(--amber)" },
    { id: 4, name: "Track 4: Internal Avionics Buses", icon: "✈️", color: "var(--purple)" }
  ]
};

export const MODULES = [
  {
    id: 1,
    title: "Demystifying Aerospace",
    slidesRange: "Slides 1–3",
    startSlide: 1,
    endSlide: 3,
    duration: 10,
    timeStart: 0,
    timeEnd: 10,
    coreObjective: "Break the intimidation barrier; reframe satellites and planes as networked Linux boxes and legacy routers.",
    badge: "Module 01 // Foundations",
    summary: "Strip away the mystique of aerospace engineering. Understand that modern spacecraft and modern airliners run embedded operating systems, microcontrollers, and serial communications that match standard computing architecture, but with unique physical constraints.",
    keyConcepts: [
      "Satellites are networked Linux/RTOS embedded systems in harsh thermal/radiation environments.",
      "Planes are flying corporate local-area networks with strict safety-critical segmentation.",
      "The fundamental difference is physical access: remote RF replaces Ethernet jacks.",
      "Decades-old legacy protocols (ARINC 429, MIL-STD-1553, CCSDS) predate adversarial threat models."
    ]
  },
  {
    id: 2,
    title: "Aviation Security (ADS-B & Buses)",
    slidesRange: "Slides 4–6",
    startSlide: 4,
    endSlide: 6,
    duration: 12,
    timeStart: 10,
    timeEnd: 22,
    coreObjective: "Explain how planes broadcast locations (Track 1) and talk internally (Track 4).",
    badge: "Module 02 // Avionics & RF",
    summary: "Explore the dual nature of aircraft cyber communications: unencrypted, unauthenticated RF broadcast to the entire world (ADS-B), and deterministic internal serial buses connecting critical flight control computers (ARINC 429 & MIL-STD-1553).",
    keyConcepts: [
      "Track 1 (ADS-B): 1090 MHz Mode S Extended Squitter lacks authentication, encryption, and anti-replay.",
      "Ghost aircraft injection, false TCAS triggers, and flight path manipulation with $35 SDRs.",
      "Track 4 (Avionics Buses): ARINC 429 unidirectional point-to-point 32-bit words with simple parity.",
      "MIL-STD-1553 command/response architecture, Bus Controllers, and Line Replaceable Unit (LRU) trust models."
    ]
  },
  {
    id: 3,
    title: "Space Systems (RF, Telemetry & Ground)",
    slidesRange: "Slides 7–9",
    startSlide: 7,
    endSlide: 9,
    duration: 13,
    timeStart: 22,
    timeEnd: 35,
    coreObjective: "Explain how satellites communicate with Earth (Track 2) and why Ground Stations are the softest targets (Track 3).",
    badge: "Module 03 // Space & Ground",
    summary: "Analyze the space mission ecosystem across the RF space link and ground infrastructure. Demystify TT&C (Telemetry, Tracking, and Command), CCSDS protocols, and understand why attackers target Internet-connected ground stations rather than fighting orbital physics.",
    keyConcepts: [
      "Track 2 (SatCom): TT&C uplink/downlink architecture, Doppler shifts, CCSDS Space Packet Protocol.",
      "Unencrypted downlinks: eavesdropping on weather, imagery, and unauthenticated command replays.",
      "Track 3 (Ground Stations): GSaaS (AWS Ground Station, Azure Orbital, Leaf Space) attack surfaces.",
      "Web management consoles, vulnerable rotator APIs, compromised VPNs (KA-SAT AcidRain incident case study)."
    ]
  },
  {
    id: 4,
    title: "Rules of Engagement & Tooling",
    slidesRange: "Slides 10–12",
    startSlide: 10,
    endSlide: 12,
    duration: 10,
    timeStart: 35,
    timeEnd: 45,
    coreObjective: "Walk through the starter kit, CTF tips, Capstone intro, and live Q&A.",
    badge: "Module 04 // Hands-on & CTF",
    summary: "Equip participants with real-world software-defined radio tooling, protocol dissectors, and forensic analysis strategies. Establish strict RF safety boundaries, introduce the Capstone scenario, and open the floor for live interactive Q&A.",
    keyConcepts: [
      "Aerospace Hacker Starter Kit: RTL-SDR, HackRF, GNU Radio, dump1090, gr-satellites, Wireshark, Gpredict.",
      "CTF Flag-Hunting Strategies: waterfall spectrogram analysis, baud rate estimation, sync word carving.",
      "Capstone Challenge: Operation SkyShield - Multi-stage forensic investigation of rogue transponders and compromised ground stations.",
      "Strict Rules of Engagement: RF transmission laws, passive listening vs simulated injection, responsible disclosure."
    ]
  }
];

export const SLIDES = [
  // SLIDE 1
  {
    id: 1,
    moduleId: 1,
    slideNumber: "Slide 1 of 12",
    title: "Breaking the Intimidation Barrier",
    subtitle: "It's Just Embedded Systems with Wings and Solar Panels",
    duration: "3 mins",
    track: null,
    quote: "If you can reverse engineer an IoT router or sniff a CAN bus, you can hack aerospace.",
    contentBlocks: [
      {
        type: "lead",
        text: "Aerospace security often feels inaccessible because it is surrounded by military jargon, NASA acronyms, and specialized hardware. In reality, modern aircraft and satellites share the exact same architectural principles as standard networked computers."
      },
      {
        type: "comparisonGrid",
        left: {
          title: "Standard Enterprise / IoT IT",
          items: [
            "Linux / FreeRTOS / Yocto running on ARM or x86",
            "Ethernet (IEEE 802.3), Wi-Fi, serial UART, CAN bus",
            "REST APIs, JSON payloads, binary struct serialization",
            "Firewalls, network segmentation (VLANs), DMZ",
            "Attacker connects via Ethernet, Wi-Fi, or Internet"
          ]
        },
        right: {
          title: "Aerospace / Satellite / Avionics",
          items: [
            "Linux / VxWorks / RTEMS running on ARM, LEON3, or PowerPC",
            "AFDX (Deterministic Ethernet), ARINC 429, MIL-STD-1553, SpaceWire",
            "CCSDS Space Packets, Mode S squitters, raw telemetry frames",
            "Physical data diodes, Aircraft Control Domain (ACD) isolation",
            "Attacker connects via Radio Frequency (SDR), ground portals, or maintenance ports"
          ]
        }
      },
      {
        type: "keyTakeaway",
        title: "The Mental Shift",
        text: "You do not need an aerospace degree to audit these systems. You need embedded systems reverse engineering, RF signal fundamentals, and network protocol analysis."
      }
    ],
    speakerNotes: [
      "Hook the audience: Ask how many people think hacking a satellite requires access to a secret government lab or a multimillion-dollar dish.",
      "Emphasize that a CubeSat on-board computer (OBC) is frequently an off-the-shelf Raspberry Pi Compute Module or an STM32 ARM microcontroller running Linux or FreeRTOS.",
      "Clarify the key difference: In aerospace, there is rarely a physical Ethernet port you can walk up to on-orbit. The radio frequency (RF) link IS the network cable.",
      "Address safety: Stress that while the principles are identical to IT security, the consequences of failure are kinetic. That is why safety standards (DO-178C, DO-254) exist."
    ],
    interactiveAction: {
      type: "jumpToModule",
      label: "Explore Module 1 Overview",
      target: "curriculum"
    }
  },

  // SLIDE 2
  {
    id: 2,
    moduleId: 1,
    slideNumber: "Slide 2 of 12",
    title: "Satellites as Orbiting Linux Boxes & Routers",
    subtitle: "Inside the Modern CubeSat and LEO Spacecraft Architecture",
    duration: "3.5 mins",
    track: null,
    quote: "A low Earth orbit satellite is an autonomous server rack hurtling through vacuum at 17,500 mph.",
    contentBlocks: [
      {
        type: "lead",
        text: "The modern commercial space boom (NewSpace) shifted satellites from custom radiation-hardened ASICs to Commercial-Off-The-Shelf (COTS) hardware running open-source operating systems."
      },
      {
        type: "architectureDiagram",
        title: "Satellite Subsystem Decomposition",
        nodes: [
          { name: "OBC (On-Board Computer)", desc: "Runs Linux/RTEMS, handles schedule, telemetry logging & command execution" },
          { name: "EPS (Power Subsystem)", desc: "Battery management, solar panel MPPT, voltage regulation via I2C/CAN" },
          { name: "ADCS (Attitude Control)", desc: "Magnetorquers, reaction wheels, star trackers for pointing accuracy" },
          { name: "COMM / Transceiver", desc: "UHF/S-band SDR transceiver connected to antenna; modulates/demodulates RF packets" },
          { name: "Payload Computer", desc: "High-resolution camera, radar, or edge AI compute node on internal Ethernet/SpaceWire" }
        ]
      },
      {
        type: "codeExploration",
        title: "The Internal Bus Network",
        codeSnippet: `// Example CubeSat internal bus communication over CAN / I2C
// Frame format often maps directly to standard microcontrollers:
struct telemetry_packet_t {
    uint8_t  subsystem_id;  // 0x01: EPS, 0x02: ADCS, 0x03: Payload
    uint16_t sequence_num;  // Monotonic packet counter
    uint32_t timestamp_utc; // Unix epoch on-orbit
    float    battery_volts; // 7.4V nominal
    float    temp_celsius;  // Solar panel temperature
    uint16_t checksum_crc;  // CCITT CRC-16
};`
      },
      {
        type: "vulnerabilityHighlight",
        title: "Why Are They 'Routers'?",
        text: "Satellites act as store-and-forward routers. When out of line-of-sight with Earth, they buffer telemetry and commands using Delay-Tolerant Networking (DTN / RFC 5050) or CCSDS protocols. A vulnerability in the packet parsing parser can lead to remote kernel panic or infinite reboot loops."
      }
    ],
    speakerNotes: [
      "Walk through the subsystems: Compare EPS to a server's redundant power supply; compare ADCS to server rack gyroscopes and cooling fans.",
      "Mention SpaceWire: It is essentially low-voltage differential signaling (LVDS) point-to-point serial designed by ESA, similar to high-speed USB/FireWire.",
      "Highlight the 'reboot in space' dilemma: Watchdogs are vital. If bad telemetry crashes the on-board computer, the satellite can enter a permanent tumble unless hardware recovery routines trigger."
    ]
  },

  // SLIDE 3
  {
    id: 3,
    moduleId: 1,
    slideNumber: "Slide 3 of 12",
    title: "Planes as Flying Corporate Networks",
    subtitle: "Avionics Network Domains, Data Diodes & Physical Segmentation",
    duration: "3.5 mins",
    track: null,
    quote: "An Airbus A350 or Boeing 787 generates up to a terabyte of network telemetry per flight across isolated security zones.",
    contentBlocks: [
      {
        type: "lead",
        text: "Modern commercial aircraft are distributed networks containing hundreds of Line Replaceable Units (LRUs) communicating across strictly defined security domains."
      },
      {
        type: "domainsList",
        domains: [
          {
            name: "Aircraft Control Domain (ACD)",
            securityLevel: "CRITICAL (DAL A)",
            desc: "Flight management computers, fly-by-wire controls, engine FADEC, primary flight displays. Isolated by physical air gaps or hardware data diodes."
          },
          {
            name: "Airline Information Services Domain (AISD)",
            securityLevel: "OPERATIONAL (DAL C)",
            desc: "Electronic Flight Bags (EFBs), maintenance logging, flight crew operational data, aircraft performance monitoring."
          },
          {
            name: "Passenger Information and Entertainment Domain (PIESD)",
            securityLevel: "NON-CRITICAL (DAL E)",
            desc: "In-Flight Entertainment (IFE) seatback screens, passenger Wi-Fi routers, cabin lighting and environmental controls."
          }
        ]
      },
      {
        type: "threatMatrix",
        title: "The Historical Trust Model vs Modern Reality",
        text: "In the 1980s, physical isolation was the only defense because passengers could never touch cockpit wiring. Today, wireless EFBs, USB maintenance sticks, satellite broadband connections, and connected cabin sensors create logical bridges across the air gap."
      }
    ],
    speakerNotes: [
      "Explain Design Assurance Levels (DAL): DAL A (catastrophic failure if breached, e.g. elevator control) down to DAL E (no safety impact, e.g. seatback movie player).",
      "Explain Data Diodes: Hardware optical fibers that physically transmit photons in one direction only. Data can flow from ACD -> AISD for logging, but zero packets can travel backward.",
      "Point out the vulnerability surface: Maintenance updates! Who audits the laptop of the ground crew plugging an Ethernet or ARINC 615 loader cable into the avionics rack?"
    ]
  },

  // SLIDE 4
  {
    id: 4,
    moduleId: 2,
    slideNumber: "Slide 4 of 12",
    title: "Track 1: ADS-B — Cleartext in the Sky",
    subtitle: "Automatic Dependent Surveillance-Broadcast: 1090 MHz Mode S",
    duration: "4 mins",
    track: 1,
    quote: "Planes broadcast their exact GPS coordinates, altitude, speed, and callsign unencrypted every single second.",
    contentBlocks: [
      {
        type: "lead",
        text: "ADS-B is the backbone of global air traffic control modernization (FAA NextGen and Eurocontrol SESAR). It replaced radar with self-reporting GPS telemetry. However, it was designed with ZERO cryptographic protection."
      },
      {
        type: "specBreakdown",
        title: "1090 MHz Mode S Extended Squitter Frame (112 Bits)",
        fields: [
          { bits: "5 bits", name: "DF (Downlink Format)", desc: "17 = Extended Squitter broadcast from airborne transponder" },
          { bits: "3 bits", name: "CA (Capability)", desc: "Transponder level and airborne/ground status" },
          { bits: "24 bits", name: "ICAO Address", desc: "Unique 24-bit hex aircraft identifier (e.g. A0123F for FAA registry)" },
          { bits: "56 bits", name: "ME (Message Field)", desc: "Payload: Airborne Position, Airborne Velocity, Callsign, or Squawk Code" },
          { bits: "24 bits", name: "PI (Parity/Interrogator)", desc: "CRC-24 parity check (detects bit errors, provides zero cryptographic integrity)" }
        ]
      },
      {
        type: "codeExploration",
        title: "Sniffing ADS-B with a $35 Dongle",
        codeSnippet: `# Using open-source dump1090 with RTL-SDR USB receiver
$ rtl_adsb -g 40 | dump1090 --interactive --net
Hex Frame: *8D40621D58C382D690C8AC2863A7;
Decoded:
  DF: 17 (Extended Squitter)
  ICAO: 40621D (British Airways BAW117)
  Altitude: 36,000 ft
  Latitude: 51.4700 N, Longitude: -0.4543 W
  Speed: 482 knots, Heading: 268 deg`
      }
    ],
    speakerNotes: [
      "Demonstrate why ADS-B was designed this way: In the 1990s, the priority was maximum interoperability between all civil aviation authorities worldwide. Crypto keys would have required a global PKI that nations could not agree on.",
      "Show how easy it is to decode: A Raspberry Pi with dump1090 can track every commercial flight within a 150-nautical-mile radius.",
      "Transition to the security problem: If anyone can receive it without authentication, what stops anyone from transmitting it?"
    ],
    interactiveAction: {
      type: "openSimulator",
      target: "adsb",
      label: "Launch ADS-B Live Radar Simulator"
    }
  },

  // SLIDE 5
  {
    id: 5,
    moduleId: 2,
    slideNumber: "Slide 5 of 12",
    title: "Track 1: Attacks on ADS-B & Countermeasures",
    subtitle: "Ghost Aircraft Injection, TCAS Manipulation & MLAT Defenses",
    duration: "4 mins",
    track: 1,
    quote: "A HackRF can make air traffic control believe 50 Boeing 777s are descending simultaneously on an airport runway.",
    contentBlocks: [
      {
        type: "lead",
        text: "Because ADS-B packets lack authentication and timestamps, an adversary with a software-defined radio can execute three primary classes of attacks."
      },
      {
        type: "attackGrid",
        attacks: [
          {
            name: "Ghost Aircraft Injection",
            severity: "HIGH",
            desc: "Synthesizing valid 112-bit Mode S frames with bogus ICAO addresses, plausible flight plans, and moving coordinates. Simulators like Flightgear or custom Python scripts can flood ATC monitors."
          },
          {
            name: "TCAS Collision Spoofing",
            severity: "CRITICAL",
            desc: "Injecting a ghost plane on an immediate collision course with a real aircraft. This forces the onboard Traffic Collision Avoidance System (TCAS) to issue an automated Resolution Advisory (RA) — ordering the pilot to climb or dive abruptly."
          },
          {
            name: "Ground Station Denial of Service",
            severity: "MEDIUM",
            desc: "Flooding the 1090 MHz channel with high-power pulses or garbage preamble patterns, blinding ADS-B receivers across a regional sector."
          }
        ]
      },
      {
        type: "defenseHighlight",
        title: "How the Industry Defends: Multilateration (MLAT)",
        text: "Civil ATC does not solely trust ADS-B self-reporting. They use Multilateration (MLAT) / Time Difference of Arrival (TDOA). Multiple ground receivers synchronize nanosecond atomic clocks. If a signal claims to come from 50 miles away but arrives at all receivers with identical timing, it was transmitted by a local ground-based SDR and is instantly flagged as a spoof."
      }
    ],
    speakerNotes: [
      "Mention real-world research: Andrei Costin and Matthias Schäfer demonstrated ghost aircraft injection at Black Hat and DEF CON.",
      "Explain the TCAS danger: Flight crews are legally mandated to obey TCAS Resolution Advisories immediately over air traffic controller voice commands.",
      "Explain why cryptographically signing ADS-B is hard: Low bandwidth channel (1 Mbps PPM modulation), high packet collision rate, and key revocation logistics for 100,000+ aircraft worldwide."
    ],
    interactiveAction: {
      type: "openSimulator",
      target: "adsb",
      label: "Test Ghost Aircraft Injection & MLAT Defense"
    }
  },

  // SLIDE 6
  {
    id: 6,
    moduleId: 2,
    slideNumber: "Slide 6 of 12",
    title: "Track 4: Avionics Buses — How Planes Talk Internally",
    subtitle: "ARINC 429 & MIL-STD-1553 Protocol Anatomy and Exploitation",
    duration: "4 mins",
    track: 4,
    quote: "Inside the fuselage, flight instruments communicate over deterministic serial lines designed in 1977.",
    contentBlocks: [
      {
        type: "lead",
        text: "Once an attacker gains a foothold in an avionics LRU (Line Replaceable Unit), they must navigate internal avionics buses: ARINC 429 in civil aviation and MIL-STD-1553 in military/space craft."
      },
      {
        type: "comparisonGrid",
        left: {
          title: "ARINC 429 (Civil Commercial)",
          items: [
            "Topology: Unidirectional point-to-point / multidrop (1 transmitter, up to 20 listeners)",
            "Signaling: Bipolar Return-to-Zero (BPRZ) differential twisted pair (±10V, 0V)",
            "Speed: Low-speed 12.5 kbps or High-speed 100 kbps",
            "Framing: Fixed 32-bit words (8-bit Octal Label, 2-bit SDI, 19-bit Data, 2-bit SSM, 1-bit Parity)",
            "Trust: Zero crypto. Anyone connected to the wire can forge labels and corrupt sensor readings."
          ]
        },
        right: {
          title: "MIL-STD-1553 (Military & Space)",
          items: [
            "Topology: Command/Response dual-redundant shared balanced bus",
            "Signaling: Manchester II bi-phase differential (±18V to ±27V)",
            "Speed: 1.0 Mbps synchronous data rate",
            "Framing: 20-bit words (Sync pulse, 16-bit payload, Odd Parity bit)",
            "Trust: Central Bus Controller (BC) polls Remote Terminals (RTs). No authentication on responses."
          ]
        }
      },
      {
        type: "codeExploration",
        title: "ARINC 429 32-Bit Word Structure",
        codeSnippet: `Bit 1-8:   Label (Octal representation, e.g. 310 = Present Position Latitude)
Bit 9-10:  SDI (Source / Destination Identifier - which display/LRU gets it)
Bit 11-29: Data Field (Binary BNR format or Binary Coded Decimal BCD)
Bit 30-31: SSM (Sign / Status Matrix: Normal Operation, Warning, Test, Fault)
Bit 32:    Parity Bit (Odd parity check: total count of 1s must be odd)`
      }
    ],
    speakerNotes: [
      "Explain the security paradox: ARINC 429's physical unidirectionality is fantastic for safety because a listener cannot physically transmit back up the wire.",
      "However: If a compromised LRU sits between a sensor and a flight computer (e.g. maintenance diagnostic port or rogue firmware), it can inject spoofed pitch/altitude words.",
      "Transition to AFDX: Modern airliners (Boeing 787, A380) use AFDX (Avionics Full-Duplex Switched Ethernet), which uses standard Ethernet frames with deterministic virtual links."
    ],
    interactiveAction: {
      type: "openSimulator",
      target: "avionics",
      label: "Inspect & Craft ARINC 429 Bus Words"
    }
  },

  // SLIDE 7
  {
    id: 7,
    moduleId: 3,
    slideNumber: "Slide 7 of 12",
    title: "Track 2: Space Systems — RF, Telemetry & Space Links",
    subtitle: "Uplink, Downlink, TT&C, and CCSDS Packet Standards",
    duration: "4.5 mins",
    track: 2,
    quote: "A satellite in low Earth orbit travels at 7.8 km/s; you get a 10-minute communication pass before it vanishes over the horizon.",
    contentBlocks: [
      {
        type: "lead",
        text: "Space mission architecture relies on Telemetry, Tracking, and Command (TT&C). Commands travel UP (uplink); spacecraft health and payload data travel DOWN (downlink)."
      },
      {
        type: "specBreakdown",
        title: "The RF Space Link Characteristics",
        fields: [
          { bits: "Frequencies", name: "Bands", desc: "UHF/VHF (CubeSats), S-Band (TT&C, 2-4 GHz), X-Band (Payload Data, 8 GHz), Ka-Band (Broadband, 26-40 GHz)" },
          { bits: "Doppler Shift", name: "Physical Challenge", desc: "Due to 28,000 km/h velocity, carrier frequencies shift by up to ±50 kHz during an overhead pass" },
          { bits: "Modulation", name: "Waveforms", desc: "FSK, BPSK, QPSK, DVB-S2 (modern high-throughput broadcast)" },
          { bits: "Sync Word", name: "Packet Framing", desc: "CCSDS standard ASM (Attached Sync Marker): 0x1ACFFC1D prefix precedes all space frames" }
        ]
      },
      {
        type: "vulnerabilityHighlight",
        title: "Vulnerabilities on the Space Link",
        text: "Many educational, scientific, and legacy commercial satellites transmit unencrypted downlinks. Anyone with a \$30 SDR and an antenna can capture high-resolution Earth imagery, private IoT telemetry, or satellite internal health metrics. On the uplink side, lack of HMAC/authentication allows command replay or unauthorized command injection."
      }
    ],
    speakerNotes: [
      "Explain CCSDS: The Consultative Committee for Space Data Systems is the 'IETF of Space'. It defines the Space Packet Protocol (SPP), which looks like a lightweight IP packet.",
      "Highlight Doppler Correction: Ground stations and SDR software (Gpredict) must continuously steer their receiver tuning as the satellite passes overhead.",
      "Show how accessible downlink interception is: Weather satellites like NOAA-15/18/19 and Russian Meteor-M transmit unencrypted LRPT/APT imagery daily that any student can decode in their backyard."
    ],
    interactiveAction: {
      type: "openSimulator",
      target: "websdr",
      label: "Live Tracking: Meteor Scatter & Spacecraft Radar (GRAVES / WebSDR)"
    }
  },

  // SLIDE 8
  {
    id: 8,
    moduleId: 3,
    slideNumber: "Slide 8 of 12",
    title: "Track 3: Ground Stations — The Softest Underbelly",
    subtitle: "Why Hack the Spacecraft When You Can Hack the Web Server Connected to the Dish?",
    duration: "4.5 mins",
    track: 3,
    quote: "Orbital mechanics are unforgiving, but ground station web portals run on Apache and default passwords.",
    contentBlocks: [
      {
        type: "lead",
        text: "The most common fallacy in space security is focusing exclusively on the satellite. Ground stations are connected to the public Internet, run commodity enterprise software, and control the high-power uplink amplifiers."
      },
      {
        type: "architectureDiagram",
        title: "Ground Station Attack Surface Decomposition",
        nodes: [
          { name: "Public Web Consoles / GSaaS APIs", desc: "REST/gRPC interfaces for scheduling satellite passes and telemetry ingestion (AWS Ground Station, Azure Orbital, Leaf Space)" },
          { name: "Mission Control Software (MCS)", desc: "Software like NASA OpenSatKit, Ball Aerospace COSMOS, Yamcs running on Ubuntu/CentOS servers" },
          { name: "Antenna Rotator & Tracking Controllers", desc: "Industrial microcontrollers (Modbus over TCP, serial bridges) controlling azimuth/elevation motors" },
          { name: "High Power Amplifiers (HPA) & Modems", desc: "RF transmitters that convert IP packets into microwave gigahertz signals beamed to orbit" }
        ]
      },
      {
        type: "attackGrid",
        attacks: [
          {
            name: "Unauthenticated API Telecommand Injection",
            severity: "CRITICAL",
            desc: "If an attacker compromises the mission control API or web dashboard, they can queue malicious telecommands directly into the scheduled uplink pipeline."
          },
          {
            name: "Antenna Azimuth / Elevation Denial of Service",
            severity: "HIGH",
            desc: "Hacking the rotator controller over Modbus/serial to misalign the dish by 5 degrees, causing complete Loss of Signal (LOS) for the entire 10-minute orbital pass."
          },
          {
            name: "Supply Chain & Ground Modem Firmware Wipe",
            severity: "CRITICAL",
            desc: "Targeting ground satellite modems with destructive wiper malware via exposed VPN management interfaces."
          }
        ]
      }
    ],
    speakerNotes: [
      "Highlight the asymmetry: Building an antenna and tracking dish to uplink to a satellite requires high power, FCC/ITU licenses, and RF skills. Hacking a ground station requires an unpatched CVE or leaked API token.",
      "Introduce the term GSaaS: Ground Station as a Service. Startups now rent ground station passes by the minute over AWS/Azure APIs. Cloud misconfigurations now equal space mission compromise!",
      "Reinforce the core objective: Ground stations are the softest targets in the space cyber kill chain."
    ],
    interactiveAction: {
      type: "openSimulator",
      target: "orbit",
      label: "Audit Ground Station Vulnerable API Endpoints"
    }
  },

  // SLIDE 9
  {
    id: 9,
    moduleId: 3,
    slideNumber: "Slide 9 of 12",
    title: "Tracks 2 & 3 Combined: Real-World Case Studies",
    subtitle: "From the Viasat KA-SAT AcidRain Attack to Hack-A-Sat On-Orbit CTF",
    duration: "4 mins",
    track: 3,
    quote: "Cyberwarfare in space has already happened, and it targeted ground modems and Linux firmware.",
    contentBlocks: [
      {
        type: "lead",
        text: "Aerospace security is no longer theoretical. Real-world adversaries and military cyber exercises prove that modern space conflicts unfold through ground and network infrastructure."
      },
      {
        type: "comparisonGrid",
        left: {
          title: "Case Study 1: Viasat KA-SAT Cyberattack (2022)",
          items: [
            "Vector: Exploited an unpatched Fortinet VPN appliance on the ground management network.",
            "Action: Pivoted into the satellite ground segment control plane (Skylogic ground infrastructure).",
            "Payload: Deployed 'AcidRain' ELF wiper malware to tens of thousands of ground satellite modems.",
            "Impact: Overwrote flash memory, bricking civilian internet, military comms, and 5,800 wind turbines in Europe.",
            "Lesson: The satellite on-orbit was unharmed, but the ground terminals were wiped remotely."
          ]
        },
        right: {
          title: "Case Study 2: US Space Force Hack-A-Sat (2020–2024)",
          items: [
            "Context: First sanctioned hacking competition against a physical satellite on orbit (Moonlighter).",
            "Challenges: Reverse engineering flight software, decoding sensor telemetry, ADCS quaternion math.",
            "Payload: Competitors exploited memory corruptions to patch attitude control and capture flags.",
            "Takeaway: Modern aerospace defenders must understand both Linux exploit dev and astrodynamics."
          ]
        }
      },
      {
        type: "keyTakeaway",
        title: "Modern Hardening Principles",
        text: "1. Zero Trust between ground and space (all telecommands must have cryptographic nonces and HMAC signatures). 2. Out-of-band ground station network segmentation. 3. Immutable firmware recovery partitions on ground modems and space processors."
      }
    ],
    speakerNotes: [
      "Tell the AcidRain story with dramatic flair: February 24, 2022. Hours before troops moved, an adversary attacked ground terminals. It is the most consequential space cyberattack in history.",
      "Mention Moonlighter: US Space Force and Air Force launched an actual 3U CubeSat specifically for DEF CON Hack-A-Sat finals. Real hackers commanded real thrusters and camera payloads.",
      "Emphasize to students: This field is hiring aggressively right now because governments and satellite constellations realized their ground and space assets are vulnerable."
    ]
  },

  // SLIDE 10
  {
    id: 10,
    moduleId: 4,
    slideNumber: "Slide 10 of 12",
    title: "Tooling & The Aerospace Hacker Starter Kit",
    subtitle: "Software-Defined Radios, Signal Demodulators, and Bus Dissectors",
    duration: "3.5 mins",
    track: null,
    quote: "You do not need a million-dollar lab: a $35 SDR and open-source software give you an aerospace SIGINT station.",
    contentBlocks: [
      {
        type: "lead",
        text: "The barrier to entry for aerospace security research has collapsed. A laptop and open-source software tools can analyze aviation and satellite signals directly."
      },
      {
        type: "toolMatrix",
        categories: [
          {
            category: "RF Hardware",
            tools: [
              { name: "RTL-SDR v4 (~$35)", desc: "RX-only (500 kHz – 1.7 GHz). Perfect for ADS-B 1090 MHz, NOAA weather, ACARS, and VHF satcom." },
              { name: "HackRF One (~$150-$300)", desc: "Half-duplex TX/RX (1 MHz – 6 GHz). Capable of transmitting test frames into RF test cages." },
              { name: "BladeRF / LimeSDR", desc: "Full-duplex MIMO transceivers for advanced digital modulation and high sample rates." }
            ]
          },
          {
            category: "Signal Processing & Demodulation",
            tools: [
              { name: "GQRX / SDR++", desc: "Interactive GUI spectrum waterfalls for hunting active RF signals and carrier frequencies." },
              { name: "Inspectrum", desc: "Visual reverse-engineering tool for raw I/Q samples (frequency, symbol rate, phase shifts)." },
              { name: "GNU Radio & Companion", desc: "Visual DSP flowchart builder for filtering, demodulating, and decoding custom RF protocols." },
              { name: "gr-satellites", desc: "Huge open-source GNU Radio telemetry decoder supporting over 100 on-orbit amateur & scientific satellites." }
            ]
          },
          {
            category: "Protocol & Orbit Analysis",
            tools: [
              { name: "dump1090 & readsb", desc: "Dedicated ADS-B Mode S decoders that output JSON telemetry and web map interfaces." },
              { name: "Wireshark Dissectors", desc: "Built-in dissectors for ARINC 429, MIL-STD-1553, CCSDS, and DVB-S2 baseband frames." },
              { name: "Gpredict / Skyfield", desc: "Real-time satellite orbital tracking, TLE propagation, and Doppler shift calculation." }
            ]
          }
        ]
      }
    ],
    speakerNotes: [
      "Reiterate budget: Point out that RTL-SDR is so cheap that any university student or hobbyist can buy one tomorrow.",
      "Warn about transmitting: Reiterate that HackRF can transmit, which requires caution and adherence to legal regulations (Part 15, RF shielding).",
      "Point to Wireshark: Many people don't realize Wireshark can parse ARINC 429, MIL-STD-1553, and CCSDS packets right out of the box!"
    ],
    interactiveAction: {
      type: "openSimulator",
      target: "ctf",
      label: "Open CTF Starter Kit & Decoders"
    }
  },

  // SLIDE 11
  {
    id: 11,
    moduleId: 4,
    slideNumber: "Slide 11 of 12",
    title: "CTF Tips & Aerospace Flag-Hunting Strategies",
    subtitle: "From Raw I/Q Recordings to Recovering the Secret Telemetry Flag",
    duration: "3.5 mins",
    track: null,
    quote: "In an aerospace CTF, the flag is hidden in the physics of the waveform or the structure of the binary frame.",
    contentBlocks: [
      {
        type: "lead",
        text: "Aerospace CTF challenges (like Hack-A-Sat, DEF CON Aerospace Village, and CySat) follow distinct analytical methodologies."
      },
      {
        type: "stepsList",
        steps: [
          {
            step: "01. Waterfall Reconnaissance",
            detail: "Open the raw `.cfile` or `.sigmf` in Inspectrum or GQRX. Determine if the signal is Amplitude (ASK), Frequency (FSK), or Phase (BPSK/QPSK) modulated. Measure the symbol rate by zooming into transitions."
          },
          {
            step: "02. Sync Marker Hunting",
            detail: "All packetized protocols use synchronization preambles. Look for CCSDS `0x1ACFFC1D`, ADS-B 8-microsecond PPM preamble, or AX.25 `0x7E` flags. Once found, frame alignment is solved."
          },
          {
            step: "03. De-whitening & Descrambling",
            detail: "Space transmitters scramble bit streams with LFSR polynomials (e.g. CCSDS standard 8-bit pseudo-random scrambler) to maintain clock synchronization. Unscramble the payload to see ASCII text."
          },
          {
            step: "04. Parity & CRC Carving",
            detail: "Check parity bits and CRC polynomial algorithms (CRC-16 CCITT, CRC-24 Mode S, CRC-32). If bits look corrupted, look for inverted bits or parity flip vulnerabilities."
          },
          {
            step: "05. Ground API Audit",
            detail: "If the challenge provides an IP address for a 'Ground Station Portal', look for standard web/API bugs: path traversal in telemetry logs, unauthenticated command injection, or SQL injection."
          }
        ]
      },
      {
        type: "proTip",
        title: "Golden Rule of Aerospace Signals",
        text: "Never discard the raw I/Q samples! Unlike HTTP requests that you can re-fetch, an RF pass is transient. If you record the raw spectrum, you can replay it and test demodulation filters indefinitely."
      }
    ],
    speakerNotes: [
      "Share CTF war stories: Often beginners get stuck because they try to open a .sigmf file in a text editor. Explain that raw I/Q data is interleaved complex 32-bit floats or 8-bit signed integers.",
      "Explain Inspectrum's power: You can drag cursors to calculate symbol rate down to the single hertz, making GNU Radio symbol synchronization trivial.",
      "Encourage the audience: Even if you do not know the exact protocol, searching for known headers or hex patterns will unlock 80% of CTF flags."
    ],
    interactiveAction: {
      type: "openSimulator",
      target: "ctf",
      label: "Practice on Interactive Telemetry Decoder"
    }
  },

  // SLIDE 12
  {
    id: 12,
    moduleId: 4,
    slideNumber: "Slide 12 of 12",
    title: "Capstone Challenge, Rules of Engagement & Live Q&A",
    subtitle: "Operation SkyShield Briefing, Safe Research Boundaries & Open Floor",
    duration: "3 mins",
    track: null,
    quote: "With great RF power comes great FCC & FAA legal liability. Obey the Rules of Engagement.",
    contentBlocks: [
      {
        type: "lead",
        text: "Before starting the hands-on capstone challenges, we review our legal and ethical boundaries, followed by the mission briefing."
      },
      {
        type: "roeCallout",
        title: "STRICT RULES OF ENGAGEMENT (RoE)",
        rules: [
          "RF TRANSMISSION STRICTLY PROHIBITED: Do not transmit over-the-air on 1090 MHz ADS-B, GPS L1 (1575.42 MHz), or satellite frequencies. Transmitting on aviation/emergency frequencies is a federal felony.",
          "HARDWARE RF CAGES ONLY: If conducting TX experiments with HackRF, you MUST use an SMA dummy load, an RF coaxial cable with 30dB attenuator, or an RF anechoic shield box.",
          "PASSIVE RECEIVE IS 100% LEGAL: Listening to open broadcast ADS-B and public weather satellites with an RTL-SDR is fully legal in most jurisdictions under open-skies frameworks.",
          "SCOPE LIMITS: Target only the challenge IP ranges, simulated buses, and provided PCAPs."
        ]
      },
      {
        type: "capstoneBriefing",
        title: "Capstone Briefing: Operation SkyShield",
        scenario: "A rogue aircraft transponder has entered regional airspace broadcasting an anomalous emergency squawk code (7700), while an orbiting satellite ground dish has stopped tracking due to a compromised management interface. Your team must:",
        missions: [
          "Mission 1: Intercept ADS-B frame stream, isolate the rogue ghost aircraft, and extract its ICAO hex address.",
          "Mission 2: Decode downlinked CCSDS telemetry packet to reveal the satellite's corrupted command word.",
          "Mission 3: Exploit the unauthenticated Ground Station API to restore antenna tracking and submit the final flag!"
        ]
      }
    ],
    speakerNotes: [
      "Drive home the RoE firmly: Stress that jamming GPS or ADS-B can endanger real human lives on approach to airports. Never be reckless with transmitters.",
      "Build excitement for the Capstone: The interactive simulators built into this portal let every participant solve all 3 missions right in their browser without needing physical SDR hardware today!",
      "Open the floor: Invite audience questions regarding aviation bus security, satellite downlinks, ground station vectors, and career paths in aerospace cybersecurity."
    ],
    interactiveAction: {
      type: "openSimulator",
      target: "ctf",
      label: "Start Capstone Challenge Missions"
    }
  }
];

export const CTF_CHALLENGES = [
  {
    id: "mission-1",
    title: "Mission 1: The Phantom Squawk (ADS-B)",
    category: "Aviation RF Forensics",
    points: 100,
    difficulty: "Beginner",
    description: "An unauthenticated Mode S transmitter is spoofing commercial aircraft coordinates over the airport sector. A packet capture of the suspicious frame is provided below. Decode the Downlink Format (DF), extract the 24-bit ICAO aircraft address, and find the flag encoded in the hex payload.",
    payloadHex: "8D40621D58C382D690C8AC2863A7",
    hint: "Notice the ICAO address bytes right after the DF/CA header (bits 9 to 32). In this frame, the ICAO is 40621D. What flag is hidden in the flight ID?",
    flag: "FLAG{MODE_S_NO_CRYPTO_40621D}",
    explanation: "ADS-B Mode S Extended Squitter (DF 17) broadcasts the 24-bit ICAO identifier in cleartext without digital signature. Any receiver can capture and decode it!"
  },
  {
    id: "mission-2",
    title: "Mission 2: CCSDS Orbital Telemetry Hijack",
    category: "Space Systems Telemetry",
    points: 200,
    difficulty: "Intermediate",
    description: "A CubeSat transmitted a downlinked space packet before entering safe mode. The raw frame begins with the standard CCSDS Attached Sync Marker (0x1ACFFC1D). Parse the telemetry data field to recover the on-board computer's emergency debug message.",
    payloadHex: "1ACFFC1D08A2C001001B464C41477B53504143455F5041434B45545F53594E437DCB84",
    hint: "Strip the 4-byte ASM (1ACFFC1D) and the 6-byte CCSDS primary header. Convert the hex bytes 464C4147... into ASCII text!",
    flag: "FLAG{SPACE_PACKET_SYNC}",
    explanation: "CCSDS Space Packets use 0x1ACFFC1D for frame synchronization. Converting the data bytes (0x46=F, 0x4C=L, 0x41=A, 0x47=G...) reveals the flag in cleartext!"
  },
  {
    id: "mission-3",
    title: "Mission 3: Ground Station API Misconfig",
    category: "Ground Infrastructure Exploitation",
    points: 300,
    difficulty: "Advanced",
    description: "A commercial Ground Station as a Service (GSaaS) web controller exposed an unprotected actuator API endpoint (/api/v1/antenna/override). Inspect the ground station simulation, trigger an azimuth override to realign the dish to 184.2 degrees, and capture the uplink authorization token flag.",
    endpoint: "/api/v1/antenna/override?azimuth=184.2&elevation=42.0&auth=bypass",
    hint: "Use the Ground Station Attack Surface tab in the simulator. Send an override command with azimuth=184.2 to unlock the dish lock flag.",
    flag: "FLAG{GSAAS_UNAUTH_UPLINK_REST_2026}",
    explanation: "Ground stations running REST APIs without mutual TLS or JWT authentication allow remote adversaries on the local network or internet to override antenna tracking!"
  }
];

export const CHEAT_SHEET = {
  adsb: [
    { cmd: "dump1090 --interactive --net", desc: "Start interactive Mode S decoder with web map server on port 8080" },
    { cmd: "rtl_adsb -g 40 | tee raw_adsb.txt", desc: "Dump raw 1090 MHz ADS-B pulse frames from RTL-SDR at 40dB gain" },
    { cmd: "soapy_power -f 1085M:1095M -b 100k -g 40 -r 10", desc: "Measure RF power distribution around 1090 MHz channel" }
  ],
  space: [
    { cmd: "gr-satellites --list", desc: "List all supported on-orbit satellite telemetry decoders in GNU Radio" },
    { cmd: "gpredict", desc: "GUI satellite tracker with real-time pass prediction and Doppler radio control" },
    { cmd: "predict -q /etc/predict/satellites.tle", desc: "Quick CLI satellite pass prediction against fresh NORAD two-line element sets" }
  ],
  avionics: [
    { cmd: "tshark -i any -Y 'arinc429'", desc: "Filter live capture for ARINC 429 avionics bus packets in Wireshark CLI" },
    { cmd: "can-utils: candump can0", desc: "Dump CAN aerospace bus telemetry frames (used on CubeSats and UAVs)" }
  ]
};
