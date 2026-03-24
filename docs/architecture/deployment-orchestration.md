# Deployment Orchestration Architecture

## Overview

This document describes the re-architected deployment orchestration system for the Boatwork white-label website platform. The key change is **separating concerns**: template repos contain only website code, orchestration lives in a dedicated service, and contractor state is centralized in a database.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        YachtSupply GitHub Org                       │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ marine-pro-       │  │ marine-premium-   │  │ marine-ecommerce-│  │
│  │ website-template  │  │ website-template  │  │ website-template │  │
│  │                   │  │                   │  │                  │  │
│  │  Pure website     │  │  Pure website     │  │  Pure website    │  │
│  │  code only.       │  │  code only.       │  │  code only.      │  │
│  │  No orchestration │  │  No orchestration │  │  No orchestration│  │
│  │  No org secrets   │  │  No org secrets   │  │  No org secrets  │  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  │
│           │  webhook on push     │                      │            │
│           └──────────┬───────────┘──────────────────────┘            │
│                      │                                               │
│                      ▼                                               │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              boatwork-orchestrator (new repo)                 │   │
│  │                                                              │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌───────────────────────┐  │   │
│  │  │ Sync Engine │ │ Promote     │ │ Health / Preflight    │  │   │
│  │  │             │ │ Pipeline    │ │ Checks                │  │   │
│  │  │ • Pull from │ │             │ │                       │  │   │
│  │  │   any tmpl  │ │ • Merge     │ │ • Token validation    │  │   │
│  │  │ • Push to   │ │   template- │ │ • Repo access checks  │  │   │
│  │  │   N contrs  │ │   sync →    │ │ • Vercel connectivity │  │   │
│  │  │ • Version   │ │   main      │ │ • Branch state audit  │  │   │
│  │  │   compare   │ │ • Parallel  │ │                       │  │   │
│  │  │ • File-level│ │   batches   │ │                       │  │   │
│  │  │   diffing   │ │ • Retry +   │ │                       │  │   │
│  │  └─────────────┘ │   backoff   │ └───────────────────────┘  │   │
│  │                  └─────────────┘                             │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │                   PostgreSQL DB                       │   │   │
│  │  │  templates │ contractors │ sync_events │ deployments  │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  │                                                              │   │
│  │  Secrets: SYNC_TOKEN, VERCEL_TOKEN (org-level, ONE place)   │   │
│  └──────────────────────────────────┬───────────────────────────┘   │
│                                     │                               │
│                                     │ API calls                     │
│                                     ▼                               │
│  ┌────────────────────────────┐    ┌────────────────────────────┐  │
│  │ acme-marine-website        │    │ coastal-pro-website        │  │
│  │ (template: marine-pro)     │    │ (template: marine-premium) │  │
│  │ Deployed on Vercel         │    │ Deployed on Vercel         │  │
│  └────────────────────────────┘    └────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                     boatwork-dev (Admin Panel)                       │
│                                                                     │
│  Staff UI:                                                          │
│  • Manage contractors (assign/switch templates)                     │
│  • Trigger sync & promote operations                                │
│  • View deploy status, version drift, error logs                    │
│  • Provision new contractor sites                                   │
│                                                                     │
│  Calls orchestrator API (never GitHub/Vercel directly)              │
└─────────────────────────────────────────────────────────────────────┘
```

## Design Decisions

### 1. Where does the sync workflow live?

**Answer: Centralized in the orchestration service, NOT in template repos.**

Template repos emit a GitHub webhook on push to `main`. The orchestration service
receives this webhook and runs the sync pipeline for all contractors subscribed to
that template.

Why:
- Template repos stay pure — no `SYNC_TOKEN`, no GitHub Actions that write to other repos
- One sync implementation handles N templates (no duplicated workflow YAML)
- Centralized error handling, retry logic, and status tracking
- The orchestrator already has the org-level `SYNC_TOKEN` — templates don't need it

The sync can run as either:
- **A webhook-triggered API endpoint** on the orchestrator (preferred — instant)
- **A GitHub Actions workflow in the orchestrator repo** (fallback — scheduled or dispatch)

### 2. How does the orchestration service know which contractors use which template?

**Answer: A `contractors` table in the orchestrator's database.**

```
contractors.template_id → templates.id
```

Each contractor record stores:
- Which template they're assigned to
- Their current template version
- Their deploy status
- When they were provisioned

The orchestrator queries this table to determine which contractors need updates
when a template version changes.

### 3. How do we handle a contractor switching templates?

**Answer: A managed migration pipeline.**

1. Admin triggers template switch via the admin panel
2. Orchestrator creates a `template-switch-{new-template}-{sha}` branch on the contractor repo
3. Branch contains ALL files from the new template (full replacement of syncable files)
4. Contractor-specific files (`.boatwork-template`, `src/site.config.ts`) are preserved
5. PR is opened for review (template switches are NOT auto-merged — they're destructive)
6. On merge, the orchestrator updates `contractors.template_id` and `contractors.current_version`

Edge cases:
- If the contractor has customized files beyond `site.config.ts`, the PR will show conflicts
- The orchestrator flags these for manual review in the admin panel
- A "dry run" mode shows what would change before creating the PR

### 4. How do template version tracks work independently?

**Answer: Each template has its own semver track stored in its `.boatwork-template` file.**

```
marine-pro-website-template:       v2.3.1
marine-premium-website-template:   v1.0.4
marine-ecommerce-website-template: v0.5.0
```

The orchestrator tracks each template's version independently:
- `templates.current_version` stores the latest version for each template
- When template A bumps to v2.3.2, only contractors on template A get synced
- Template B contractors are unaffected

The `auto-version.yml` workflow stays in each template repo (it only bumps its own
version — no cross-repo access needed). On push, the orchestrator receives the
webhook, reads the new version, and triggers sync for subscribers.

### 5. Should the orchestration service be its own deployable or part of boatwork-dev?

**Answer: Its own deployable, separate from boatwork-dev.**

Why:
- **Separation of concerns**: Admin UI (boatwork-dev) vs infrastructure automation (orchestrator)
- **Different scaling**: The orchestrator may need longer timeouts, background jobs, retry queues
- **Different secrets**: The orchestrator holds org-level `SYNC_TOKEN` — boatwork-dev doesn't need it
- **Independent deploy cycles**: Orchestration logic changes shouldn't require redeploying the admin UI
- **Reliability**: If the admin panel goes down, in-flight syncs/promotes continue

Deployment options (in order of recommendation):
1. **Railway** — supports long-running processes, background workers, PostgreSQL
2. **Render** — similar to Railway, good for small API services
3. **Vercel** (with caveats) — works if all operations fit within function timeout limits

boatwork-dev calls the orchestrator's API for all sync/promote/status operations.

---

## DB Schema

### `templates`

Tracks each website template available in the platform.

```sql
CREATE TABLE templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,       -- 'marine-pro', 'marine-premium', 'marine-ecommerce'
  name          TEXT NOT NULL,              -- 'Marine Pro', 'Marine Premium'
  repo          TEXT UNIQUE NOT NULL,       -- 'YachtSupply/marine-pro-website-template'
  current_version TEXT NOT NULL DEFAULT '0.0.0',
  description   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed with existing template
INSERT INTO templates (slug, name, repo, current_version) VALUES
  ('marine-pro', 'Marine Pro', 'YachtSupply/marine-pro-website-template', '1.1.9');
```

### `contractors`

One row per contractor. Central source of truth for template assignment and deploy state.

```sql
CREATE TYPE deploy_status AS ENUM (
  'provisioning',  -- repo created, first deploy in progress
  'active',        -- deployed and healthy
  'syncing',       -- template sync in progress
  'promoting',     -- promote (merge to main) in progress
  'deploying',     -- Vercel deployment in progress
  'failed',        -- last operation failed
  'suspended'      -- contractor account suspended
);

CREATE TABLE contractors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,       -- 'acme-marine'
  repo            TEXT UNIQUE NOT NULL,       -- 'YachtSupply/acme-marine-website'
  template_id     UUID NOT NULL REFERENCES templates(id),
  current_version TEXT NOT NULL DEFAULT '0.0.0',
  target_version  TEXT,                       -- version being synced to (NULL if up-to-date)
  deploy_status   deploy_status NOT NULL DEFAULT 'provisioning',
  vercel_project_id TEXT,                     -- Vercel project ID for webhook correlation
  vercel_url      TEXT,                       -- production URL
  provisioned_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_synced_at  TIMESTAMPTZ,
  last_deployed_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contractors_template ON contractors(template_id);
CREATE INDEX idx_contractors_status ON contractors(deploy_status);
```

### `sync_events`

Audit log of every sync operation (template push to contractor).

```sql
CREATE TYPE sync_status AS ENUM ('pending', 'in_progress', 'success', 'failed', 'skipped');

CREATE TABLE sync_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id   UUID NOT NULL REFERENCES contractors(id),
  template_id     UUID NOT NULL REFERENCES templates(id),
  from_version    TEXT NOT NULL,
  to_version      TEXT NOT NULL,
  status          sync_status NOT NULL DEFAULT 'pending',
  branch_name     TEXT,                       -- 'template-sync-abc1234'
  pr_number       INTEGER,
  pr_url          TEXT,
  files_changed   INTEGER,
  error_message   TEXT,
  error_step      TEXT,                       -- 'create_branch', 'push_files', 'open_pr', 'auto_merge'
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sync_events_contractor ON sync_events(contractor_id);
CREATE INDEX idx_sync_events_status ON sync_events(status);
CREATE INDEX idx_sync_events_created ON sync_events(created_at DESC);
```

### `deploy_events`

Tracks Vercel deployment outcomes (populated via webhook).

```sql
CREATE TYPE deployment_status AS ENUM ('created', 'building', 'succeeded', 'failed', 'canceled');

CREATE TABLE deploy_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id       UUID REFERENCES contractors(id),
  vercel_deployment_id TEXT,
  vercel_project_name TEXT,
  status              deployment_status NOT NULL,
  url                 TEXT,
  git_branch          TEXT,
  git_sha             TEXT,
  error_message       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deploy_events_contractor ON deploy_events(contractor_id);
CREATE INDEX idx_deploy_events_status ON deploy_events(status);
CREATE INDEX idx_deploy_events_created ON deploy_events(created_at DESC);
```

### `template_switch_requests`

Tracks requests to switch a contractor from one template to another.

```sql
CREATE TYPE switch_status AS ENUM ('pending', 'pr_created', 'merged', 'failed', 'canceled');

CREATE TABLE template_switch_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id     UUID NOT NULL REFERENCES contractors(id),
  from_template_id  UUID NOT NULL REFERENCES templates(id),
  to_template_id    UUID NOT NULL REFERENCES templates(id),
  status            switch_status NOT NULL DEFAULT 'pending',
  pr_number         INTEGER,
  pr_url            TEXT,
  requested_by      TEXT,                     -- admin user who initiated
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at      TIMESTAMPTZ
);
```

---

## Orchestration Service — Repo Structure

```
boatwork-orchestrator/
├── src/
│   ├── index.ts                  # Express/Hono app entry point
│   ├── config.ts                 # Environment config with validation
│   ├── db/
│   │   ├── client.ts             # PostgreSQL connection (pg / drizzle)
│   │   ├── schema.ts             # Drizzle ORM schema definitions
│   │   └── migrations/           # SQL migration files
│   │       ├── 0001_initial.sql
│   │       └── ...
│   ├── routes/
│   │   ├── sync.ts               # POST /sync, POST /sync/:templateSlug
│   │   ├── promote.ts            # POST /promote, GET /promote/status
│   │   ├── health.ts             # GET /health, GET /health/preflight
│   │   ├── webhooks.ts           # POST /webhooks/github, POST /webhooks/vercel
│   │   ├── contractors.ts        # CRUD for contractor management
│   │   ├── templates.ts          # CRUD for template management
│   │   └── template-switch.ts    # POST /contractors/:id/switch-template
│   ├── services/
│   │   ├── sync-engine.ts        # Core sync logic (read template, push to contractors)
│   │   ├── promote-pipeline.ts   # Merge template-sync branches into main
│   │   ├── github-client.ts      # GitHub API wrapper (shared token)
│   │   ├── vercel-client.ts      # Vercel API wrapper (optional)
│   │   ├── version.ts            # Semver comparison utilities
│   │   └── concurrency.ts        # Parallel batch execution with limits
│   ├── middleware/
│   │   ├── auth.ts               # Bearer token auth for admin panel calls
│   │   └── webhook-verify.ts     # HMAC verification for GitHub/Vercel webhooks
│   └── types.ts                  # Shared TypeScript types
├── drizzle.config.ts
├── package.json
├── tsconfig.json
├── Dockerfile
├── .env.example
└── README.md
```

---

## Key API Endpoints

### Sync Operations

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/sync` | Trigger sync for all templates (or receives GitHub push webhook) |
| `POST` | `/api/sync/:templateSlug` | Trigger sync for a specific template to all its subscribers |
| `POST` | `/api/sync/:templateSlug/:contractorSlug` | Sync a specific template to a specific contractor |
| `GET`  | `/api/sync/status` | Current sync status across all contractors |
| `GET`  | `/api/sync/events` | Paginated sync event history |

### Promote Operations

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/promote` | Promote (merge template-sync → main) for all pending contractors |
| `POST` | `/api/promote/:contractorSlug` | Promote a specific contractor |
| `GET`  | `/api/promote/status` | Promote readiness status (which sites have template-sync branches) |
| `POST` | `/api/promote/retry` | Retry previously failed promotes `{ slugs: string[] }` |

### Contractor Management

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/contractors` | List all contractors with template/version/status |
| `GET`  | `/api/contractors/:slug` | Get single contractor details |
| `POST` | `/api/contractors` | Provision a new contractor site |
| `PATCH`| `/api/contractors/:slug` | Update contractor metadata |
| `POST` | `/api/contractors/:slug/switch-template` | Initiate template switch `{ templateSlug: string }` |

### Template Management

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/templates` | List all templates with current versions |
| `GET`  | `/api/templates/:slug` | Template details + subscriber count |
| `POST` | `/api/templates` | Register a new template |
| `GET`  | `/api/templates/:slug/subscribers` | List contractors using this template |
| `GET`  | `/api/templates/:slug/versions` | Version history for a template |

### Webhooks (Inbound)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/webhooks/github` | GitHub push events from template repos |
| `POST` | `/api/webhooks/vercel` | Vercel deployment status events |

### Health

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/health` | Basic health check |
| `GET`  | `/api/health/preflight` | Full preflight: tokens, DB, GitHub API, Vercel API |

---

## Updated Sync Workflow Design

### Flow (Multi-Template)

```
Template repo push to main
        │
        ▼
GitHub webhook → POST /api/webhooks/github
        │
        ▼
Orchestrator identifies template from webhook payload
        │
        ▼
Query DB: SELECT * FROM contractors WHERE template_id = :id
        │
        ▼
For each contractor (parallel, concurrency=5):
  ┌─────────────────────────────────────────┐
  │ 1. Read contractor's current version    │
  │    from .boatwork-template              │
  │                                         │
  │ 2. Compare with template's new version  │
  │    - Skip if up-to-date or ahead        │
  │    - Determine force vs optional        │
  │                                         │
  │ 3. Create template-sync-{sha} branch    │
  │    on contractor repo                   │
  │                                         │
  │ 4. Push all syncable files              │
  │    (skip: site.config.ts, .github/,     │
  │     .boatwork-template except version)  │
  │                                         │
  │ 5. Close stale template-sync PRs        │
  │                                         │
  │ 6. Open new PR with auto-merge          │
  │                                         │
  │ 7. Record sync_event in DB              │
  │                                         │
  │ 8. Update contractor.target_version     │
  │    and contractor.deploy_status         │
  └─────────────────────────────────────────┘
        │
        ▼
POST /api/webhooks/vercel receives deploy confirmation
        │
        ▼
Update contractor.current_version, deploy_status='active'
```

### What stays in template repos

Each template repo keeps ONLY:
- **`auto-version.yml`** — Bumps its own version on push to main (no cross-repo access)
- **`.boatwork-template`** — Declares template identity and version
- **Website code** — Everything else is pure Next.js website code

### What moves to the orchestrator

- Sync logic (currently in `sync-template.yml`)
- Promote logic (currently in `src/lib/promote.ts` + `src/app/api/promote/`)
- Health checks (currently in `src/app/api/promote/health/`)
- Webhook receiver (currently in `src/app/api/promote/webhook/`)
- GitHub API helpers (currently in `src/lib/github.ts`)

### Sync file exclusion rules

Each template can define a `.boatwork-sync-config.json` at its root:

```json
{
  "exclude": [
    ".github/",
    "src/site.config.ts",
    ".boatwork-template",
    ".boatwork-sync-config.json"
  ],
  "preserveContractorFields": {
    ".boatwork-template": ["contractorSlug", "provisionedAt"]
  }
}
```

The orchestrator reads this config from each template to determine sync rules.
If absent, the default exclusion list applies.

---

## Migration Plan

### Phase 1: Prepare (no breaking changes)

1. **Create `boatwork-orchestrator` repo** with the service scaffold
2. **Set up PostgreSQL** database with the schema above
3. **Seed the database** by scanning existing contractor repos:
   - One template record for `marine-pro-website-template`
   - One contractor record per `*-website` repo in the org
   - Read `.boatwork-template` from each to populate `current_version`
4. **Deploy the orchestrator** (Railway/Render) with `SYNC_TOKEN` and `VERCEL_TOKEN`
5. **Register GitHub webhooks** on `marine-pro-website-template` pointing to orchestrator

### Phase 2: Parallel run (both systems active)

6. **Run orchestrator sync in parallel** with the existing GitHub Actions workflow
   - Orchestrator syncs to a subset of contractors (canary)
   - Verify results match the existing workflow
7. **Move promote endpoints** — admin panel calls orchestrator instead of template's `/api/promote`
8. **Move webhook receiver** — update Vercel webhook URLs to point to orchestrator

### Phase 3: Cut over

9. **Disable `sync-template.yml`** in the template repo (delete or add `if: false`)
10. **Remove orchestration code from template repo**:
    - Delete `src/app/api/promote/` (route, webhook, health)
    - Delete `src/lib/promote.ts`
    - Trim `src/lib/github.ts` to only template-local helpers (version check)
    - Remove `SYNC_TOKEN` from template's env requirements
11. **Sync the cleanup to all contractor sites** — the orchestrator pushes the removal of
    promote endpoints to all contractors (they never needed these endpoints)

### Phase 4: Multi-template expansion

12. **Create additional template repos** (marine-premium, marine-ecommerce)
    - Each has its own `auto-version.yml` and `.boatwork-template`
    - Each has a GitHub webhook pointing to the orchestrator
13. **Register new templates** via `POST /api/templates`
14. **Admin panel** — add template selection when provisioning new contractors
15. **Template switch** — enable `POST /api/contractors/:slug/switch-template` in admin UI

### Rollback plan

- Phase 2 runs both systems in parallel, so rollback = re-enable the old workflow
- Orchestrator can be taken offline without affecting live contractor sites
- Contractor repos are unaffected — they just receive PRs from a different source
