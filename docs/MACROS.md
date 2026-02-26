# Empire Dashboard: God Mode — Macros & Playbook Library

**Version 3.0** | Last updated: 2026-02-23

---

## Keyboard Shortcuts

| Shortcut | Context | Action |
|----------|---------|--------|
| `Ctrl/Cmd + K` | Global | Open One-Search |
| `Ctrl/Cmd + /` | Global | Toggle sidebar |
| `Esc` | Any modal | Close current modal/panel |
| `Enter` | Search fields | Execute search |
| `Tab` | Forms | Navigate to next field |

---

## Built-in Playbooks

Empire Dashboard ships with 6 composable playbooks that chain multiple OSINT operations into automated workflows.

### 1. Image Verify

**Purpose**: Verify the authenticity and provenance of an image.

| Step | Operation | Output |
|------|-----------|--------|
| 1 | EXIF Extraction | Camera model, GPS coords, timestamp, software |
| 2 | Reverse Image Search | Matching images across the web |
| 3 | Metadata Analysis | Modification history, compression artifacts |
| 4 | Confidence Scoring | Authenticity score (0-100) |

**Input**: Image URL or uploaded file
**Output**: Verification report with confidence score

---

### 2. Target Sweep

**Purpose**: Comprehensive open-source reconnaissance on a target identifier (name, domain, email, handle).

| Step | Operation | Output |
|------|-----------|--------|
| 1 | Identity Resolution | Linked accounts and profiles |
| 2 | Domain Intelligence | WHOIS, DNS, subdomains |
| 3 | Social Footprint | Public posts and activity |
| 4 | Document Search | Public filings and records |
| 5 | Report Generation | Consolidated dossier |

**Input**: Target identifier (name, email, domain, or handle)
**Output**: Multi-source intelligence dossier

---

### 3. Rapid Report

**Purpose**: Generate a structured intelligence briefing from current WORLDVIEW data.

| Step | Operation | Output |
|------|-----------|--------|
| 1 | Data Collection | Flights, seismic, weather, cyber, news |
| 2 | Threat Assessment | Priority ranking by severity |
| 3 | Geospatial Correlation | Map overlay of events |
| 4 | Briefing Generation | Markdown report with sections |

**Input**: Selected data layers (flights, seismic, weather, cyber, news)
**Output**: Formatted intelligence briefing (Markdown)

---

### 4. Social Publish Assist

**Purpose**: AI-assisted content creation and scheduling for social platforms.

| Step | Operation | Output |
|------|-----------|--------|
| 1 | Topic Analysis | Trending topics and keywords |
| 2 | Content Generation | Draft posts with variations |
| 3 | Image Generation | Supporting visuals |
| 4 | Schedule Planning | Optimal posting times |

**Input**: Topic or brief
**Output**: Ready-to-publish content package

---

### 5. Domain Recon

**Purpose**: Deep analysis of a domain's public infrastructure.

| Step | Operation | Output |
|------|-----------|--------|
| 1 | WHOIS Lookup | Registration details |
| 2 | DNS Enumeration | A, AAAA, MX, TXT, CNAME records |
| 3 | Subdomain Discovery | Public subdomains |
| 4 | Certificate Transparency | SSL/TLS certificate history |
| 5 | Technology Stack | Detected frameworks and services |

**Input**: Domain name
**Output**: Infrastructure intelligence report

---

### 6. Threat Intel Digest

**Purpose**: Aggregate and summarize current cyber threat intelligence.

| Step | Operation | Output |
|------|-----------|--------|
| 1 | CVE Collection | Latest vulnerabilities from NVD |
| 2 | Severity Ranking | CVSS score sorting |
| 3 | Affected Systems | Impact analysis |
| 4 | Mitigation Summary | Recommended actions |

**Input**: Time range and optional keyword filter
**Output**: Threat intelligence digest

---

## Agent Quick Actions

Each AI agent supports quick-action commands from the Agent Chat interface:

### Sun Tzu (General / Coordinator)
- `brief me` — Generate situation report from all active feeds
- `prioritize threats` — Rank current threats by severity
- `recommend playbook` — Suggest best playbook for current situation

### Pliny (Security)
- `scan inputs` — Check recent inputs for injection attempts
- `threat report` — Generate security threat summary
- `check perimeter` — Run security health check

### Karpathy (Code)
- `generate script` — Create code from natural language description
- `analyze code` — Review code for vulnerabilities
- `optimize query` — Improve database query performance

### Virgil (Media)
- `generate image` — Create image from text description
- `analyze media` — Extract metadata from media file
- `create thumbnail` — Generate thumbnail for evidence

### Cicero (Communications)
- `draft report` — Write formal intelligence report
- `summarize thread` — Condense conversation or feed
- `translate` — Translate text between languages

---

## Power User Workflows

### Workflow 1: Full Investigation Pipeline

```
1. One-Search → identify target
2. Target Sweep playbook → gather intelligence
3. Entity Graph → map relationships
4. Evidence Feed → capture and score evidence
5. Case Workspace → organize findings
6. Generate Report → produce briefing
7. Audit Log → verify chain of custody
```

### Workflow 2: Real-Time Monitoring

```
1. WORLDVIEW → enable all layers
2. Set polling intervals (60s default)
3. Live Feed → monitor incoming events
4. NL Query → ask specific questions
5. Rapid Report → generate periodic briefings
```

### Workflow 3: OSINT Tool Discovery

```
1. OSINT Tools → browse 53 tools by category
2. GitHub OSINT → search for additional tools
3. Health Checker → verify tool availability
4. Bookmarks → save favorites for quick access
5. Survivor Library → reference documentation
```

---

## Custom Playbook Creation

Playbooks are defined as JSON step arrays. Each step specifies:

```json
{
  "name": "Custom Playbook",
  "description": "My investigation workflow",
  "steps": [
    {
      "id": 1,
      "name": "Data Collection",
      "type": "search",
      "config": { "sources": ["github", "gdelt", "nvd"] }
    },
    {
      "id": 2,
      "name": "Analysis",
      "type": "llm",
      "config": { "agent": "sun_tzu", "prompt": "Analyze the collected data" }
    },
    {
      "id": 3,
      "name": "Report",
      "type": "export",
      "config": { "format": "markdown", "sections": ["summary", "findings"] }
    }
  ]
}
```

---

*Empire Dashboard: God Mode v3.0 — Macros & Playbook Library*
