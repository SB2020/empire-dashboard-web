# Empire Dashboard: God Mode — User Manual

**Version 3.0** | Last updated: 2026-02-23 | Classification: UNCLASSIFIED // PUBLIC

---

## What Is Empire Dashboard?

Empire Dashboard is a **legal, defensive open-source intelligence (OSINT) orchestration platform** that aggregates publicly available data into a single command center. It is designed for analysts, researchers, journalists, and security professionals who need to monitor, investigate, and report on open-source information — without ever crossing into unauthorized access or offensive operations.

> **Public Data Only.** Every data source used by this platform is publicly accessible. No credentials are stolen, no systems are penetrated, no private data is scraped without authorization. This is a hard boundary enforced by design.

---

## Getting Started

### Logging In

1. Click the login button on the landing page
2. Authenticate via Manus OAuth (your identity is verified through the platform)
3. You will land on the **Command Center** — the main dashboard

### Navigation

The sidebar on the left organizes the platform into sections:

| Section | Purpose |
|---------|---------|
| **CORE** | Command Center, WORLDVIEW, Chain of Command, Security, Vibe Coder, Media Command |
| **INTELLIGENCE** | OSINT feeds, intelligence queries, and analytics |
| **OSINT** | Live Feed, One-Search, Timeline, NL Query, Entity Graph, Case Workspace, Source Connectors, GitHub OSINT, OSINT Tools, Survivor Library, Op Metrics, Evidence Feed, Playbook Runner, Agent Chat, Connector Status |
| **CONTENT & TOOLS** | AI Content, Games, Social Platform |

---

## Core Pages

### Command Center (`/`)
Your operational dashboard. Shows real-time stats: total operations, active agents, security events, flights tracked, seismic events, and cyber threats. Includes quick-access cards for WORLDVIEW and Chain of Command, plus your bookmarked favorites.

### WORLDVIEW (`/worldview`)
A Google Maps-based geospatial intelligence viewer with live data overlays:
- **Flights**: Real-time aircraft positions from OpenSky Network
- **Seismic**: Earthquake data from USGS with heatmap overlay
- **Weather**: NWS alerts and conditions
- **World Cams**: 78 live camera streams across all continents
- **Street View**: Google Street View integration
- **Traffic Cameras**: Live interstate feeds
- **CRT/FLIR modes**: Visual filters for classified-intelligence aesthetic
- **Generate Report**: Export intelligence briefings as markdown

### Chain of Command (`/hierarchy`)
Visualizes the agent hierarchy. The President delegates to General Sun Tzu, who coordinates 5 specialized AI agents.

### Security Perimeter (`/security`)
Threat monitoring dashboard powered by the Pliny agent. Monitors prompt injection attempts, input sanitization, and threat detection.

### Vibe Coder (`/vibe-coder`)
AI-powered code generation interface using the Karpathy agent. Describe what you want in natural language, get working code.

### Media Command (`/media`)
Audio and visual content generation through the Virgil agent.

---

## OSINT Pages

### Live Feed (`/feed`)
Infinite-scroll real-time intelligence feed aggregating all OSINT sources. Filter by type, source, confidence level.

### One-Search (`/search`)
Unified cross-domain search across posts, images, videos, domains, and public records. One query, all sources.

### Timeline (`/timeline`)
Temporal event visualization. See how stories unfold over time. Zoom, pan, and filter by entity.

### NL Query (`/nlquery`)
Natural language intelligence queries. Ask questions in plain English like "What earthquakes happened near California this week?" and get structured answers from the OSINT data.

### Entity Graph (`/entities`)
Relationship mapping between people, organizations, locations, and events. Visual graph with connection strength indicators.

### Case Workspace (`/cases`)
Investigation management. Create cases, attach evidence, add annotations, track provenance. Export with redaction rules.

### Evidence Feed (`/evidence`)
Rich media evidence cards with confidence ribbons, provenance chains, and source verification badges. Each piece of evidence tracks: source URL, collector, timestamp, and confidence score.

### Playbook Runner (`/playbooks`)
Composable investigation workflows. Built-in playbooks include:
- **Image Verify**: EXIF extraction → reverse image search → metadata analysis
- **Target Sweep**: Multi-source reconnaissance on a target identifier
- **Rapid Report**: Automated intelligence briefing generation
- **Social Publish Assist**: Content creation and scheduling

### Agent Chat (`/agent-chat`)
Direct conversation with any of the 5 AI agents. Quick actions for common tasks (verify image, sweep target, summarize thread).

### GitHub OSINT (`/github`)
Search and analyze GitHub repositories for OSINT tools. Curated arsenal of 34+ security tools across 8 categories. Track and import repos.

### OSINT Tools (`/osint-tools`)
Directory of 53 OSINT tools across 20 categories (People Search, Breach Data, Social Media, Facial Recognition, etc.) with health status badges.

### Survivor Library (`/survivor-library`)
Browsable archive of 15,102 documents across 166 categories with download links. Includes bulk ZIP download per category.

### Connector Status (`/connector-status`)
Monitor OAuth and API connector health for 12 platforms (Twitter, Facebook, Instagram, Shodan, etc.).

---

## Themes

The platform ships with 10 themes accessible from the sidebar footer:

| Theme | Mode | Style |
|-------|------|-------|
| Oxford Dark | Dark | Deep teal-to-midnight, chrome accents |
| Monokai | Dark | Classic code editor palette |
| Solarized Dark | Dark | Warm amber on dark blue |
| Matrix | Dark | Green phosphor terminal |
| Dracula | Dark | Purple and pink on dark |
| Nord | Dark | Arctic blue palette |
| One Dark | Dark | Atom editor inspired |
| Cyberpunk | Dark | Neon pink and yellow |
| Solarized Light | Light | Warm ivory with blue accents |
| Arctic White | Light | Clean frost with sky-blue |

---

## Data Sources

All data sources are **publicly accessible APIs**:

| Source | Data Type | Update Frequency |
|--------|-----------|-----------------|
| OpenSky Network | Flight positions | 60s polling |
| USGS GeoJSON | Earthquakes | 60s polling |
| National Weather Service | Weather alerts | 60s polling |
| GDELT | Global news events | 60s polling |
| NVD (NIST) | CVE vulnerabilities | 60s polling |
| GitHub API | Repository data | On-demand |
| survivorlibrary.com | Document archive | Static |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Open One-Search |
| `Ctrl/Cmd + /` | Toggle sidebar |
| `Esc` | Close modals/panels |

---

## FAQ

**Q: Does this platform access private data?**
A: No. Every data source is publicly accessible. The platform enforces a strict public-data-only policy.

**Q: Can I use this for offensive operations?**
A: No. This is a defensive OSINT platform for monitoring, analysis, and reporting. It does not provide tools for hacking, intrusion, or unauthorized access.

**Q: How do I export my findings?**
A: Use the Generate Report button on WORLDVIEW, or export from Case Workspace. Evidence can be downloaded with full provenance chains.

**Q: Is the audit log tamper-proof?**
A: The audit log uses blockchain-lite SHA-256 hash chaining. Each entry includes a hash of the previous entry, making tampering detectable.

---

*Empire Dashboard: God Mode v3.0 — Legal Tier-1 Defensive OSINT Orchestration*
