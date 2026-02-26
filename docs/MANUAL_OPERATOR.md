# Empire Dashboard: God Mode — Operator Manual

**Version 3.0** | Last updated: 2026-02-23 | Classification: UNCLASSIFIED // TECHNICAL

---

## 1. Deployment Overview

Empire Dashboard is a full-stack web application deployed as a PWA-capable Node.js service.

### Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Frontend | React + TypeScript + Tailwind CSS | React 19, Tailwind 4 |
| Backend | Express + tRPC | Express 4, tRPC 11 |
| Database | TiDB (MySQL-compatible) | Via Drizzle ORM |
| Auth | Manus OAuth 2.0 | JWT sessions |
| Storage | S3-compatible | Via platform helpers |
| Maps | Google Maps JavaScript API | Via Manus proxy |
| LLM | Platform LLM helpers | Via invokeLLM |

### Environment Variables

All environment variables are injected by the platform. Do not hardcode or commit `.env` files.

| Variable | Purpose | Scope |
|----------|---------|-------|
| `DATABASE_URL` | Database connection string | Server |
| `JWT_SECRET` | Session cookie signing | Server |
| `VITE_APP_ID` | OAuth application ID | Client |
| `OAUTH_SERVER_URL` | OAuth backend URL | Server |
| `VITE_OAUTH_PORTAL_URL` | Login portal URL | Client |
| `BUILT_IN_FORGE_API_URL` | Platform API endpoint | Server |
| `BUILT_IN_FORGE_API_KEY` | Platform API auth token | Server |
| `VITE_FRONTEND_FORGE_API_KEY` | Frontend API token | Client |

---

## 2. Database Schema

The application uses 29 MySQL tables managed by Drizzle ORM. Schema is defined in `drizzle/schema.ts`.

### Migration Workflow

```bash
# 1. Edit drizzle/schema.ts
# 2. Generate migration SQL
pnpm drizzle-kit generate

# 3. Review generated SQL in drizzle/XXXX_*.sql
# 4. Apply via webdev_execute_sql tool
```

### Key Tables

| Table | Purpose | Critical Fields |
|-------|---------|----------------|
| `users` | User accounts | id, openId, name, role |
| `audit_log` | Immutable audit trail | id, action, actorId, prevHash, hash |
| `evidence_records` | Evidence items | id, title, confidence, sourceUrl |
| `cases` | Investigation cases | id, title, status, priority |
| `playbooks` | Workflow definitions | id, name, steps |
| `connectors` | API integrations | id, platform, status |

---

## 3. Security Operations

### Audit Log Verification

The audit log uses blockchain-lite SHA-256 hash chaining. Each entry contains:
- `prevHash`: SHA-256 hash of the previous entry
- `hash`: SHA-256(id | action | actorId | actorType | resourceType | resourceId | details | timestamp | prevHash)

To verify chain integrity programmatically:

```typescript
import { verifyAuditChain } from "./server/db";
const result = await verifyAuditChain();
// { valid: true, totalEntries: 150, verifiedEntries: 150 }
```

### Role Management

To promote a user to admin:
```sql
UPDATE users SET role = 'admin' WHERE openId = '<user_open_id>';
```

### Input Validation

All tRPC inputs are validated with Zod schemas. The Pliny agent monitors LLM inputs for prompt injection attempts.

---

## 4. API Reference

All API endpoints are accessible via tRPC at `/api/trpc/*`. Key routers:

### Public Procedures (no auth required)
- `osint.getFeed` — Real-time OSINT feed
- `osint.search` — Cross-domain search
- `github.search` — GitHub repository search
- `osintDirectory.getTools` — OSINT tools directory
- `survivorLibrary.getCategories` — Document library

### Protected Procedures (auth required)
- `evidence.create` — Submit evidence
- `playbook.execute` — Run playbook
- `agentInteraction.chat` — Agent conversation
- `connector.connect` — Connect platform
- `auditChain.verify` — Verify audit chain
- `auditChain.export` — Export audit log

---

## 5. Monitoring

### Health Checks
- Dev server status: `webdev_check_status`
- Database connectivity: Check `DATABASE_URL` connection
- External APIs: OSINT tool health checker (automated pings)

### Log Files
- `devserver.log` — Server startup and HMR
- `browserConsole.log` — Client-side errors
- `networkRequests.log` — HTTP request/response
- `sessionReplay.log` — User interaction events

---

## 6. Backup & Recovery

### Checkpoints
Use `webdev_save_checkpoint` to create snapshots before risky changes.
Use `webdev_rollback_checkpoint` to restore previous states.

### Database
The platform manages database backups. For manual exports:
- Use the Audit Chain page to export audit logs as JSON
- Use Case Workspace export for case data with provenance

---

*Empire Dashboard: God Mode v3.0 — Operator Manual*
