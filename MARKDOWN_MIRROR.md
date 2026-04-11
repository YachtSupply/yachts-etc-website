# Markdown Mirror

Machine-readable markdown endpoints for AI agents, served at the root of every contractor website.

## Endpoints

| Path | Description |
|------|-------------|
| `/llms.txt` | Structured summary: business info, services, service areas, contact, hours, recent reviews (up to 10), certifications |
| `/llms-full.txt` | Extended version: full service descriptions, all reviews, FAQs, portfolio, common projects, structured data |

Both return `Content-Type: text/markdown; charset=utf-8` with `X-Robots-Tag: noindex`.

## How It Works

The markdown is generated at request time from the same data source (`getSiteData()` + `fetchBoatworkProfile()`) that powers the HTML pages. There is no separate sync process — the markdown and HTML always reflect the same data.

### Data flow

```
Boatwork API → getSiteData() / fetchBoatworkProfile()
                    ↓
              ┌─────┴─────┐
              │            │
         HTML pages    Markdown mirror
         (React)       (string concat)
```

### Files

- `src/lib/markdown-mirror.ts` — Pure generation functions (`generateLlmsTxt`, `generateLlmsFullTxt`)
- `src/app/api/llms/route.ts` — API route handler for `/llms.txt`
- `src/app/api/llms-full/route.ts` — API route handler for `/llms-full.txt`
- `next.config.mjs` — Rewrites `/llms.txt` → `/api/llms` and `/llms-full.txt` → `/api/llms-full`

## What Triggers Updates

The markdown endpoints are revalidated by the same triggers that update the HTML pages:

1. **Boatwork webhook** (`profile.updated`, `review.created`, `photo.added`, etc.) → calls `/api/boatwork/sync` → `revalidatePath('/api/llms')` + `revalidatePath('/api/llms-full')`
2. **Vercel cron** (every 6 hours) → same sync flow
3. **Template code push** via orchestrator → full Vercel rebuild (markdown routes rebuild automatically)

No additional triggers are needed. The markdown mirror piggybacks on the existing update pipeline.

## Caching

- `Cache-Control: public, max-age=3600` (1 hour)
- Next.js ISR revalidation clears the cache on data changes
- Between revalidations, responses are served from the edge cache

## For New Templates

Any new template must include the same markdown mirror. The generation logic is template-agnostic — it consumes the standard `SiteData` type and `BoatworkProfile` interface. To add it to a new template:

1. Copy `src/lib/markdown-mirror.ts` into the new template
2. Create API route handlers at `src/app/api/llms/route.ts` and `src/app/api/llms-full/route.ts`
3. Add rewrites in `next.config.mjs`: `/llms.txt` → `/api/llms`, `/llms-full.txt` → `/api/llms-full`
4. Add `/api/llms` and `/api/llms-full` to the revalidation list in `/api/boatwork/sync`

The markdown output is identical regardless of which visual template is active.
