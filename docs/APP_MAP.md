# Empire Dashboard: God Mode — Architecture Map

**Version 3.0** | Last updated: 2026-02-23

---

## Stack Overview

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (Browser/PWA)                  │
│  React 19 + Tailwind 4 + tRPC Client + Google Maps      │
│  Wouter routing · shadcn/ui · Framer Motion · JSZip      │
├─────────────────────────────────────────────────────────┤
│                    tRPC v11 (JSON-RPC)                   │
│              /api/trpc/* — Superjson transport            │
├─────────────────────────────────────────────────────────┤
│                    SERVER (Express 4)                     │
│  tRPC routers · Drizzle ORM · Manus OAuth · LLM helpers  │
│  S3 storage · Notification · Image generation            │
├─────────────────────────────────────────────────────────┤
│                    DATABASE (TiDB/MySQL)                  │
│  Drizzle schema · Migrations · 15+ tables                │
├─────────────────────────────────────────────────────────┤
│                    EXTERNAL APIs (Public)                 │
│  OpenSky · USGS · NWS · GDELT · NVD · GitHub · Shodan   │
└─────────────────────────────────────────────────────────┘
```

---

## Frontend Routes (22 pages)

| Route | Page Component | Section | Auth Required |
|-------|---------------|---------|---------------|
| `/` | Home.tsx | CORE | No |
| `/worldview` | WorldView.tsx | CORE | No |
| `/hierarchy` | Hierarchy.tsx | CORE | No |
| `/security` | Security.tsx | CORE | No |
| `/vibe-coder` | VibeCoder.tsx | CORE | No |
| `/media` | MediaCommand.tsx | CORE | No |
| `/feed` | Feed.tsx | INTELLIGENCE | No |
| `/search` | Search.tsx | INTELLIGENCE | No |
| `/timeline` | Timeline.tsx | OSINT | No |
| `/nlquery` | NLQuery.tsx | OSINT | No |
| `/entities` | EntityGraph.tsx | OSINT | No |
| `/cases` | CaseWorkspace.tsx | OSINT | No |
| `/connectors` | SourceConnectors.tsx | OSINT | No |
| `/github` | GitHubOSINT.tsx | OSINT | No |
| `/osint-tools` | OsintTools.tsx | OSINT | No |
| `/survivor-library` | SurvivorLibrary.tsx | OSINT | No |
| `/op-metrics` | OpMetrics.tsx | OSINT | No |
| `/evidence` | EvidenceFeed.tsx | OSINT | Yes |
| `/playbooks` | PlaybookRunner.tsx | OSINT | Yes |
| `/agent-chat` | AgentInteraction.tsx | OSINT | Yes |
| `/connector-status` | ConnectorStatus.tsx | OSINT | Yes |
| `/social` | SocialPlatform.tsx | CONTENT | No |

---

## tRPC Router Map (18 routers)

| Router | Key Procedures | Auth Level |
|--------|---------------|------------|
| `auth` | me, logout | Public/Protected |
| `system` | notifyOwner | Protected |
| `theme` | list, getActive, setActive | Public/Protected |
| `osint` | getFeed, search, getTimeline, nlQuery, getEntities, getEntityGraph | Public |
| `cases` | list, create, getById, addEvidence, updateStatus | Protected |
| `social` | getPosts, createPost, getAnalytics | Protected |
| `agents` | list, chat, getHistory | Protected |
| `hierarchy` | getStructure, getAgentDetails | Public |
| `security` | getThreats, getMetrics, getAlerts | Public |
| `github` | search, getRepoDetails, importRepo, getTrackedRepos, removeTrackedRepo | Public/Protected |
| `osintDirectory` | getTools, getCategories, searchTools | Public |
| `survivorLibrary` | getCategories, getCategoryItems, searchAll, getBreaches, getCategoryDownloadUrls | Public |
| `toolHealth` | checkTool, checkAll, getResults | Public |
| `bookmarks` | list, add, remove | Protected |
| `reports` | generate | Protected |
| `evidence` | list, create, updateStatus, delete | Protected |
| `playbook` | list, getById, execute, getRunHistory | Protected |
| `agentInteraction` | listAgents, chat, explain, quickAction | Protected |
| `connector` | list, connect, disconnect | Protected |

---

## Database Schema (15+ tables)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `user` | User accounts | id, openId, name, role, avatar |
| `cases` | Investigation cases | id, title, status, priority, userId |
| `case_evidence` | Evidence attached to cases | id, caseId, type, content, source |
| `social_posts` | Social content | id, content, platform, status |
| `tracked_repos` | GitHub repo imports | id, repoFullName, stars, language |
| `bookmarks` | User favorites | id, userId, itemType, itemId, title |
| `tool_health_checks` | OSINT tool uptime | id, toolName, url, status, responseTime |
| `evidence_records` | Evidence feed items | id, title, mediaType, confidence, source |
| `playbooks` | Playbook definitions | id, name, description, steps |
| `playbook_runs` | Playbook execution history | id, playbookId, status, results |
| `case_annotations` | Case notes/annotations | id, caseId, authorId, content |
| `audit_log` | Immutable audit trail | id, action, actorId, details, prevHash |
| `connectors` | OAuth/API connector status | id, platform, status, userId |

---

## External API Integrations

| API | Endpoint | Data | Rate Limit |
|-----|----------|------|------------|
| OpenSky Network | opensky-network.org/api | Live flights | 10 req/10s |
| USGS Earthquake | earthquake.usgs.gov/fdsnws | Seismic events | Unlimited |
| National Weather Service | api.weather.gov | Weather alerts | Unlimited |
| GDELT | api.gdeltproject.org | Global events | Unlimited |
| NVD (NIST) | services.nvd.nist.gov | CVE data | 5 req/30s |
| GitHub API | api.github.com | Repos, users | 60 req/hr (unauth) |
| Survivor Library | survivorlibrary.com | Document archive | Static |

---

## Security Architecture

```
┌──────────────────────────────────────────┐
│           PUBLIC DATA BOUNDARY           │
│  ┌────────────────────────────────────┐  │
│  │  All API calls → public endpoints  │  │
│  │  No credential theft               │  │
│  │  No unauthorized access            │  │
│  │  No private data scraping          │  │
│  └────────────────────────────────────┘  │
├──────────────────────────────────────────┤
│           AUTHENTICATION                 │
│  Manus OAuth → JWT session cookie        │
│  protectedProcedure → ctx.user required  │
│  adminProcedure → role === 'admin'       │
├──────────────────────────────────────────┤
│           AUDIT TRAIL                    │
│  Blockchain-lite SHA-256 hash chain      │
│  Every action logged: who/what/when      │
│  Immutable — append only, no deletes     │
├──────────────────────────────────────────┤
│           GOVERNANCE                     │
│  Public-data-only filter on all sources  │
│  Attestation headers on exports          │
│  Provenance chain on all evidence        │
└──────────────────────────────────────────┘
```

---

## File Structure

```
empire-dashboard-web/
├── client/
│   ├── public/              # Static assets, PWA icons
│   │   ├── manifest.json    # PWA manifest
│   │   └── sw.js            # Service worker
│   ├── src/
│   │   ├── components/      # Reusable UI (DashboardLayout, Map, AIChatBox)
│   │   ├── contexts/        # React contexts (Theme, Auth)
│   │   ├── hooks/           # Custom hooks
│   │   ├── lib/             # tRPC client, themes, utilities
│   │   ├── pages/           # 22 page components
│   │   ├── App.tsx          # Route definitions
│   │   ├── main.tsx         # Providers & entry
│   │   └── index.css        # Global styles & theme variables
│   └── index.html           # HTML shell with PWA meta tags
├── server/
│   ├── _core/               # Framework (OAuth, context, LLM, env)
│   ├── routers.ts           # All tRPC routers (2000+ lines)
│   ├── db.ts                # Database helpers
│   ├── github.ts            # GitHub OSINT service
│   ├── cameras.ts           # World cam definitions (78 cameras)
│   ├── storage.ts           # S3 file storage helpers
│   └── *.test.ts            # Vitest test suites
├── drizzle/
│   ├── schema.ts            # Database schema (15+ tables)
│   └── 000X_*.sql           # Migration files
├── docs/
│   ├── PROJECT_MANIFEST.json # Auto-generated from todo.md
│   ├── MANUAL.md            # User manual (this file)
│   ├── APP_MAP.md           # Architecture map
│   ├── SECURITY_MODEL.md    # Security & governance
│   └── MACROS.md            # Playbook & macro library
├── scripts/
│   └── generate_manifest.mjs # Manifest generator script
├── shared/                   # Shared types & constants
└── todo.md                   # Project tracking (200+ items)
```

---

*Empire Dashboard: God Mode v3.0 — Architecture Map*
