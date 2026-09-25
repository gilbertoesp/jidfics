# VII JIDFICS — Programa Interativo

Sitio web oficial de la **VII Jornadas Internacionales de Docencia e Investigación en Ciencias Sociales** (JIDFICS), celebrada en la **Universidad de Sonora, Campus Caborca** los días **23 y 24 de septiembre de 2026**.

> **Estado (v1.2)**: búsqueda full-text con índice invertido · filtros **colapsables por categoría** (Tipo / Ubicaciones / Temas) con conteo y limpieza por grupo · vista timeline única (eventos filtrados en orden cronológico) · **hoja de detalle de sesión** (panel derecho en escritorio, bottom sheet en móvil, deep-link `?event=<id>`) · discusión en vivo (UI, backend-ready) · **datos SSOT** (un único JSON; el parche v2 se consumió en `calendario_vii_jidfics.json`) · ubicación en formato `Salón (Edificio X)` en todo el sitio · vocabulario único (DDD).

> ℹ️ Este README tiene dos contextos separados:
> **Contenido (es)** — información del evento y del sitio · **Guía técnica (en)** — documentation for builders.

---

## 🚀 Demo en vivo

**Producción (Vercel)**: `https://jidfics.vercel.app` *(después del deploy)*

---

# Contenido (es)

## ✨ Características

- **Búsqueda inteligente** — índice invertido + fuzzy matching (Levenshtein ≤ 2) + ranking ponderado (título > ponente > etiquetas > ponencias > ubicación > edificio). Maneja tildes y typos: "violncia" → "Violencia", "educacion" → "Educación".
- **Programa normalizado desde JSON real** — 45+ sesiones, 2 días, 6 edificios, 10+ ejes temáticos, 14 tipos de actividad.
- **Filtros colapsables por categoría (nuevo)** — tres grupos plegables (acordeón, todos abiertos por defecto) en orden **Tipo → Ubicaciones → Temas**, cada uno con contador `seleccionados/total` y limpieza por grupo: **Tipo de actividad** (Inauguración, Panel, …; orden alfabético `es`), **Ubicaciones** (una etiqueta unificada por ubicación, formato `Salón (Edificio X)` — `Centro de Convenciones (Edificio 3B)`, `Sala Polivalente (Edificio 1M)`, … — sin duplicados; la sala ya no se muestra pero `roomName` sigue indexado: buscar "sala 1" funciona) y **Temas** (etiquetas temáticas). Clasificación por palabras clave con mapa de excepciones (`lib/schedule/tags.ts`); el esquema de filtros no cambia (agrupación solo-presentación).
- **Filtrado multifacético** — título, ponente, autor, institución, etiqueta, edificio, sala; facetas combinadas con lógica AND/OR.
- **Hoja de detalle de sesión (nuevo)** — al pulsar "Detalles de la sesión" en cualquier tarjeta: ponentes, ponencias completas, etiquetas accionables, **sesiones relacionadas** (mismo día, ranking hora → sala → eje), copiar enlace compartible. Panel derecho en escritorio (≈448 px), bottom sheet en móvil; deep-link `?event=<id>` valida el id antes de abrir.
- **Vista Timeline (nueva)** — línea de tiempo única con TODOS los eventos del día en orden cronológico, ya filtrados por la barra lateral; cada sesión muestra la ubicación unificada `Salón (Edificio X)`, indicadores de vivo/próximo y etiquetas clicables para filtrar.
- **Filtros activos visibles** — barra de chips removibles con contador de resultados.
- **Discusión en vivo (UI)** — hoja lateral por sesión (`LiveChatSheet`), backend-ready para Supabase Realtime. *Autenticación de participantes para comentar: considerada, pendiente (ver tabla de TODOs).*
- **Seguimiento en tiempo real** — barra flotante con sesiones LIVE NOW / UP NEXT (30 min) agrupadas por salón (nombre real del recinto).
- **Accesibilidad (a11y)** — ARIA roles, focus trap en diálogos, Escape para cerrar, foco devuelto al disparador, navegación por teclado, etiquetas en español.
- **Tema claro/oscuro** — `next-themes` con persistencia en `localStorage`.
- **CI/CD** — GitHub Actions: lint + typecheck + tests + build en cada push/PR.
- **Tests (TDD)** — **242 tests Vitest** en 20 suites (ver Guía técnica).

## 📌 Archivos con TODOs

El trabajo pendiente vive **en el código** como comentarios `TODO(área)`. Índice rápido:

| Archivo | Marcadores |
|---|---|
| `components/schedule/LiveChatSheet.tsx` | `TODO(auth)` acceso de participantes (OAuth 1-click + caché cifrada, considerado) · `TODO(realtime)` canal Supabase Realtime |
| `components/schedule/EventDetailContent.tsx` | `TODO(calendar)` exportar a calendario (ICS/Google) · `TODO(directions)` indicaciones en mapa · `TODO(auth)` habilitar Comentar con sesión |
| `lib/schedule/hooks.ts` | `TODO(backlog)` mis sesiones · notificaciones · vista multi-día · perfiles de ponentes |
| `proxy.ts` | `TODO(auth)` lista de rutas públicas antes de producción (policy table) |
| `lib/schedule/tags.ts` | `TODO(data)` excepciones de clasificación de etiquetas |

Listarlos todos: `grep -rn 'TODO(' app components lib`

---

# Guía técnica (en)

## 🗂️ Project structure

```
jidfics/
├── app/
│   ├── api/oauth/token/route.ts  # POST RFC 8693 token exchange — seam entry (route.test.ts)
│   ├── page.tsx                  # Server Component — runs normalize*() at build time
│   ├── layout.tsx                # Root layout + providers
│   └── globals.css               # Global styles + CSS variables
├── components/
│   ├── schedule/
│   │   ├── ScheduleApp.tsx       # Orchestrator: header, sidebars, grid, timeline, sheets
│   │   ├── filter/               # Composable filter block
│   │   │   ├── FilterSidebar.tsx # Block: 3 collapsible groups (type > location > topic)
│   │   │   ├── FilterGroup.tsx   # Component: accordion item (trigger + count + clear)
│   │   │   └── FilterSidebar.test.tsx
│   │   ├── EventCard.tsx         # Card → opens detail sheet (aria-haspopup) + chat
│   │   ├── EventCard.test.tsx    # location label contract (no building suffix)
│   │   ├── EventDetailSheet.tsx  # Block: Radix Sheet, responsive side (data-side)
│   │   ├── EventDetailContent.tsx# Compound: Header / Body / Footer
│   │   ├── EventDetailSheet.test.tsx
│   │   ├── EventTimeline.tsx     # Block: single chronological timeline (sidebar-filtered)
│   │   ├── EventTimeline.test.tsx
│   │   ├── LiveChatSheet.tsx     # Chat UI (TODO(auth) + TODO(realtime))
│   │   ├── FloatingSessionBar.tsx / LiveIndicatorBadge.tsx
│   │   ├── ScheduleHeader.tsx
│   │   └── Tag.tsx               # Tag primitive + TagGroup (data-slot/data-state/data-category)
│   ├── ui/                       # shadcn/Radix primitives (Sheet, Button, Tabs, Accordion…)
│   └── theme-switcher.tsx        # Light/dark toggle
├── lib/
│   ├── schedule/
│   │   ├── types.ts              # Raw* (JSON) + normalized types + TagCategory/TagOption
│   │   ├── normalize.ts          # Pipeline: JSON → flat events + derived facets
│   │   ├── filter.ts             # Pure filter engine (AND across facets, OR within)
│   │   ├── search.ts             # SearchEngine (inverted index + fuzzy + ranking)
│   │   ├── tags.ts               # Categorization, per-category sorting, counts/clear (pure)
│   │   ├── tags.test.ts
│   │   ├── eventDetail.ts        # ?event param parsing + related-sessions ranking (pure)
│   │   ├── eventDetail.test.ts
│   │   ├── hooks.ts              # Composite hooks (useScheduleApp, useSearch…)
│   │   ├── hooks/
│   │   │   ├── useCurrentSession.ts  # live/up-next + time travel (dev)
│   │   │   └── useEventDetails.ts    # URL-driven detail sheet state
│   │   ├── colors.ts             # Deterministic FNV-1a → Tailwind palette
│   │   ├── calendario_vii_jidfics.json  # SSOT dataset (v2 updates consumed, 45 events)
│   │   └── *.test.ts
│   ├── auth/
│   │   └── rbac.ts                # Role tiers (user/admin/super_admin) + ROLE_RANK
│   ├── oauth/
│   │   ├── claims.ts              # Zod parse of primary JWT claims (app_metadata.roles, authorization.scopes)
│   │   ├── policy.ts              # Zod boundary + narrowScope/intersectScopes/capTier
│   │   ├── primary.ts             # primary Supabase JWT verify (jose HS256 + SUPABASE_JWT_SECRET)
│   │   ├── signer.ts              # EdDSA access/delegation tokens (jose), 300s/60s TTL
│   │   ├── store.ts               # fail-closed client registry + denylist (Supabase)
│   │   └── *.test.ts
│   ├── sandbox/
│   │   ├── claims.ts              # Zod delegation claims (sub=auth.uid source, use, scope, role, jti)
│   │   ├── rls.ts                 # authorizeContainerAccess — auth.uid()=owner RLS gate (fail-closed)
│   │   └── *.test.ts
│   ├── supabase/
│   │   ├── server.ts             # createClient() for Server Components
│   │   ├── service.ts            # createServiceClient() (service-role, server-only)
│   │   └── client.ts             # createClient() for Browser
│   └── utils.ts                  # cn(), hasEnvVars
├── proxy.ts                      # Next 16 proxy (replaces middleware.ts)
├── src/test/search.test.ts       # 54 TDD tests for SearchEngine
├── .github/workflows/ci.yml      # CI: lint + typecheck + test + build
├── vitest.config.ts / vitest.setup.ts  # jsdom + RTL + jest-dom matchers
├── tsconfig.json                 # strict TS + paths @/*
└── README.md                     # This file
```

## 🛠️ Local development

### Requirements

- **bun** ≥ 1.1 (package manager + runtime — `npm` fails with `ERESOLVE` in this repo)
- Node.js ≥ 20

### Setup

```bash
git clone git@github.com:gilbertoesp/jidfics.git
cd jidfics
bun install
cp .env.example .env   # add Supabase credentials (optional, see below)
bun run dev            # Turbopack dev server
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

| Variable | Description | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes (auth/Realtime) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable/anon key | Yes (auth/Realtime) |
| `AUTH_TOKEN_PRIVATE_KEY` | Ed25519 PKCS#8 PEM — signs OAuth access tokens (server-only) | Yes (token exchange) |
| `SUPABASE_SECRET_KEY` | Supabase service-role key (server-only) | Yes (token exchange) |
| `SUPABASE_JWT_SECRET` | HS256 secret verifying primary Supabase JWTs (server-only) | Yes (primary subject) |
| `AUTH_URL` | Public issuer URL for minted tokens | Prod: recommended |

> The schedule works **without Supabase** (read-only mode). `proxy.ts` skips session checks via the `hasEnvVars` guard when credentials are missing.

## 🧪 Testing (TDD)

```bash
bunx vitest run                     # all suites (jsdom)
bunx vitest run lib/schedule/       # pure units only
bunx vitest run components/         # component tests (RTL + user-event)
bun run typecheck                   # tsc --noEmit
bun run lint                        # biome check . && eslint .
bun run format                      # biome autofix + format (write mode)
```

**Suites — 242 tests total (240 + 2 integration skipped without credentials):**

| Suite | Tests | Covers |
|---|---|---|
| `src/test/search.test.ts` | 54 | inverted index (incl. `roomName`), fuzzy (Levenshtein), prefix, ranking, highlights, Spanish diacritics |
| `lib/schedule/tags.test.ts` | 27 | keyword classification, overrides, 3-way `type\|topic\|location` routing, sorting (room numbers, paren suffixes), counts/clear, real dataset |
| `lib/schedule/eventDetail.test.ts` | 12 | `?event` strict parsing, share URL, related-session ranking |
| `lib/schedule/filter.test.ts` | 12 | date/search/facets AND-OR |
| `lib/schedule/data-integrity.test.ts` | 15 | real JSON guards + v2 SSOT merge (WED-004 · mesas 14/21 · póster) + schema-key whitelist + canonical 7-location registry + `hall (Edificio X)` accuracy + collision snapshot |
| `lib/schedule/normalize.test.ts` | 7 | JSON → UI shape |
| `lib/schedule/hooks/useCurrentSession.test.ts` | 10 | live/up-next, grouping, time travel |
| `lib/schedule/hooks/useEventDetails.test.ts` | 4 | URL-driven sheet state (replaceState, deep link) |
| `lib/env.test.ts` | 13 | env schema validation (server-only guards) |
| `components/schedule/filter/FilterSidebar.test.tsx` | 9 | 3 collapsible groups (order, scoped counts, `aria-expanded` collapse, per-group clear, `data-category`), unified `hall (Edificio X)` Ubicaciones |
| `components/schedule/EventDetailSheet.test.tsx` | 7 | details rendering, Escape, clipboard, related, responsive `data-side` |
| `components/schedule/EventTimeline.test.tsx` | 6 | single timeline (no building tabs), chronological order, unified location label per item, tag clicks, live badges |
| `components/schedule/EventCard.test.tsx` | 2 | unified location label (building folded in, no suffix) |
| `tests/integration/supabase.test.ts` | 3* | real connectivity (*2 skip without credentials) |
| `app/api/oauth/token/route.test.ts` | 18 | RFC 8693 contract (200/400/401), no-escalation, actor `act`, denylist, foreign audience, primary JWT → 60s delegation |
| `lib/oauth/policy.test.ts` | 14 | Zod boundary (missing/unsupported fields), `narrowScope`/`intersectScopes`/`capTier` invariants |
| `lib/oauth/claims.test.ts` | 10 | primary claims Zod parse (unknown role rejected), `highestRole`/`primaryScope`/`denylistId` |
| `lib/oauth/store.test.ts` | 6 | fail-closed Supabase lookups (client registry, denylist) mocked at the DB seam |
| `lib/sandbox/claims.test.ts` | 6 | delegation claims Zod boundary (missing sub/scope/jti, unknown role/use rejected) |
| `lib/sandbox/rls.test.ts` | 7 | container RLS gate entry: uid ownership, admin override, scope cover, fail-closed codes |

### TDD workflow (failsafe branches)

1. Branch from `main`: `feat/phase-N-<scope>`.
2. **RED** commit: tests only (fails).
3. **GREEN** commit: minimal implementation (passes).
4. Gates before merge: `bun run typecheck && bun run lint && bunx vitest run && bun run build`.
5. Merge via PR; `main` never carries half-finished work.

### Lint & format (Biome + ESLint 9 hybrid)

- **Split:** `biome.json` owns formatting, `organizeImports` and general lint; `eslint.config.mjs` (unchanged) owns React/Next correctness rules. No rule overlap.
- **Pre-commit:** husky → lint-staged runs both linters on **staged files only** (fast; auto-fixes format, blocks real errors). CI re-runs the full `lint:biome` + `lint:eslint` + `typecheck` gates.
- Intentional exceptions are documented inline as `// biome-ignore <rule>: <reason>` (or scoped `overrides` in `biome.json` for tests/`lib/supabase` non-null env assertions).

## 📦 Build & deploy

```bash
bun run build   # typecheck + compile + static generation (Next 16: no lint here)
bun run start   # preview production build
```

### Vercel

```bash
vercel login
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production
vercel deploy --prod
```

Push to `main` auto-deploys to production (PRs get previews) via the Vercel GitHub integration — no Actions deployer. Manual fallback: the CLI flow above. In Supabase (*Authentication → URL Configuration*): Site URL `https://jidfics.vercel.app` and the Vercel preview pattern as redirect URLs.

## 🔐 Auth — current state

- **Proxy** (`proxy.ts`, Next 16): Auth.js `auth()` wrapper runs per request; validates the session cookie and gates `/protected`.
- **Renders**: `/` (schedule) is **public, no login**. Future protected routes (`/dashboard`, `/admin`) redirect to `/auth/login`.
- **Pending**: replace the hardcoded matcher with an explicit route-policy table (public / authed / role) — tracked as `TODO(auth)` in `proxy.ts`.
- **Token exchange (feature seam)**: `POST /api/oauth/token` (RFC 8693, `urn:ietf:params:oauth:grant-type:token-exchange`) — Zod-validated form boundary, issues **300s EdDSA access tokens** carrying `act` (actor), `azp`, `aud`, `scope` and tier claim. Invariants: requested scope ⊆ subject ∩ client allow-list (delegation only narrows) · tier ≤ min(subject, client) · denylisted `jti` → `401 invalid_token` · foreign audience → `400 invalid_target`. Seams: entry `app/api/oauth/token/route.ts` → exits `lib/oauth/signer.ts` (jose) and `lib/oauth/store.ts` (Supabase, fail-closed). Tables (`oauth_clients`, `token_denylist`) land with Phase 1 migrations — the store denies everything until then.
- **Primary JWT → Delegation Tokens**: `subject_token_type=urn:jidfics:token-type:primary` verifies a Supabase primary JWT (`lib/oauth/primary.ts`, jose HS256 + `SUPABASE_JWT_SECRET`), then Zod-parses `app_metadata.roles` (unknown role → `401 invalid_token`) and `authorization.scopes` (`lib/oauth/claims.ts`). With `requested_token_type=urn:jidfics:token-type:delegation` the exchange mints a **60s downscoped Delegation Token** (`use:"delegation"`, scope = `authorization.scopes ∩ client.allowed_scopes`, tier = `min(highest(roles), client)`) — the credential handed to the AI agent tool loop (next phase). Denylist id falls back `jti → session_id`; neither present → lookup skipped.
- **Container sandbox RLS gate (feature seam)**: `authorizeContainerAccess({ token, requiredScope, resourceOwnerId })` (`lib/sandbox/rls.ts`) — verifies the token (exit `lib/oauth/signer.ts`, mocked in tests), Zod-parses delegation claims (`lib/sandbox/claims.ts`: `sub` = `auth.uid()` source, `use`, `scope`, `role`, `jti`), then applies minimal RLS invariants mirroring `auth.uid() = owner`: only `use:"delegation"` tokens authenticate · foreign uid → `uid_mismatch` (admin roles override) · uncovered action → `missing_scope` · any verification/Zod failure → `invalid_claims`. Every refusal throws typed `RlsDeniedError` (fail-closed) — the future MCP/sandbox route maps `code` → `403 Forbidden`.
- **Chat auth (considered, NOT built)**: lightweight participant sign-in to comment; evolution path is one-click OAuth (Google / LinkedIn) with a **localStorage-encrypted profile cache** (WebCrypto AES-GCM, per-session key). That cache is a UX optimization only — **never an auth boundary**; the real session stays in the HttpOnly cookie handled by `proxy.ts`. Typing strategy: generated Supabase DB types. Design notes live in `TODO(auth)` at `components/schedule/LiveChatSheet.tsx`.

## 🧱 Architecture decisions

| Area | Decision | Rationale |
|---|---|---|
| Normalization at build | `normalizeEvents()` runs in `page.tsx` (Server Component) | Zero runtime cost, typed data on the client |
| Dynamic facets | `deriveFilters()` extracts options from the dataset | No hardcoded unions; new axes/types/locations need no code change |
| Search | `SearchEngine` (inverted index + Levenshtein + weighted ranking) | Tolerates typos, <50ms |
| **Tag categories** | Pure classifier + override map + three-category reducer (`type\|topic\|location`) in `lib/schedule/tags.ts`; **presentation-only grouping** (filters schema unchanged) | Single ordering authority; `type` is facet-backed only (never keyword-inferred); no filter-serialization breakage; edge cases data-driven via `TODO(data)` |
| **Collapsible groups** | Existing shadcn/Radix Accordion (`type="multiple"`, all open by default) wrapping `FilterGroup` | No new dependency; unmount-on-close content, roving keyboard nav and `aria-expanded` free from Radix |
| **Detail sheet** | shadcn/Radix Sheet (Dialog primitive) + `data-side` responsive switch | No new dependency; focus trap/Escape/focus-return free from Radix |
| **URL state** | `history.replaceState` (no router, no `useSearchParams`) | No Suspense requirement, no history spam, still deep-linkable |
| Composite hooks | `useScheduleApp` orchestrates search + filters + live + view + chat + details | Separation of concerns, testable |
| Colors | FNV-1a hash → 10 Tailwind colors (literal classes) | Deterministic, dark-mode safe, tree-shakeable |
| Location keys | `slugify(roomName)` + `formatLocationLabel()` → `hall (Edificio X)` | Dedupe "Sala de Usos Múltiples" / "sala de usos multiples"; one display formatter for chips/cards/sheet/timeline |
| Next 16 proxy | `export function proxy` in `proxy.ts` (not `middleware.ts`) | Official Next 16 convention |
| **Token exchange** | In-app RFC 8693 AS (`POST /api/oauth/token`) — Zod boundary, EdDSA via `jose`, fail-closed store | Delegation only narrows (scope ⊆, tier ≤); no external AS infra |
| Snapshot tests | Known Thursday room/time collisions fixed in a test | Catches data regressions without fighting editorial data |
| Component taxonomy | primitive (Radix) → component (`Tag`, `FilterGroup`) → block (`FilterSidebar`, `EventDetailSheet`) → utility (`tags.ts`, `eventDetail.ts`) | building-components skill: composition, `data-slot`/`data-state` contracts, code = documentation |

## 🗣️ Ubiquitous language (DDD)

One term per concept — data, code, tests and this README speak the same vocabulary:

| Term | Meaning | Canonical home |
|---|---|---|
| **event / sesión** | one program entry (id, times, day) | `RawEvento` → `ConferenceEvent` |
| **locationKey** | deduped room slug (`sala-1`, `aula-201d`) — facet & filter value | `ConferenceEvent.locationKey` |
| **roomName** | raw room (`Sala 1`) — not displayed, indexed for search ("sala 1") | `ConferenceEvent.roomName` |
| **hallName** | venue hall (`Centro de Convenciones`) — Ubicaciones chip source | `ConferenceEvent.hallName` |
| **building** | code (`3B`, or `Unknown`) | `ConferenceEvent.building` |
| **locationLabel** | display `hall (Edificio X)` via `formatLocationLabel()` (bare hall if `Unknown`) — chips, cards, sheet, timeline | `lib/schedule/normalize.ts` |
| **locations** | the Ubicaciones facet (`ScheduleDerived` / `ScheduleFilters` / search) | `filter.ts`, `tags.ts` |
| **host\*** | conference sede metadata (`hostInstitution`, `hostCampus`, `hostLocation`) | `ConferenceMeta` |
| **`location` category** | filter category id `type \| topic \| location` (unchanged) | `TagCategory` |

Retired: `venueKey` / `venueLabel` / `venueHall` / `venues` / `venue*` meta / `toggleVenue` / `getHallLabel` ("Hall 1..4"). Sweep check: `grep -rni 'venue' lib components src app` → 0 hits.

## 🗃️ Data — single source of truth

- **`lib/schedule/calendario_vii_jidfics.json` is the only dataset** (45 events, 2 days). The organizer's v2 patch (`schedule_updates_v2.json`) was **consumed into it and deleted** — no second copy can drift.
- Consumed v2 updates: WED-004 title/speaker (prior values preserved in the optional, unrendered `historial_cambios`), WED-MESA-14's three papers, THU-MESA-21 canonical titles + authors, poster authorship updated **in place** inside `THU-CARTELES-VIRTUALES`, canonical `Sala de Usos Múltiples` casing.
- Guardrails in `data-integrity.test.ts` (red on drift): schema-key **whitelist** (patch-only keys such as `ponencias_detalladas` / `fecha` are rejected), the exact **7 canonical `(sala, lugar, edificio)` triples**, `hall (Edificio X)` label accuracy, 45 unique event ids, known collision snapshot.
- To update the program: edit only that JSON, then run `bunx vitest run lib/schedule/data-integrity.test.ts`.

---

## 📄 Licencia

Código del sitio: **MIT** — libre para usar, modificar y distribuir.

Datos del programa (JSON): **propiedad de los organizadores de JIDFICS** — uso autorizado para este sitio.

## 🤝 Créditos

- **Organización**: VII JIDFICS — Universidad de Sonora, Campus Caborca
- **Desarrollo**: Gilberto Espinoza ([@gilbertoesp](https://github.com/gilbertoesp))
- **Stack**: Next.js, Supabase, Tailwind CSS, shadcn/ui, Vitest, Vercel

## 📞 Contacto

- Issues: [GitHub Issues](https://github.com/gilbertoesp/jidfics/issues)
- Email: organización JIDFICS (ver sitio oficial)
