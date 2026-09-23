# VII JIDFICS — Programa Interativo

Sitio web oficial de la **VII Jornadas Internacionales de Docencia e Investigación en Ciencias Sociales** (JIDFICS), celebrada en la **Universidad de Sonora, Campus Caborca** los días **23 y 24 de septiembre de 2026**.

> **Estado (v1.1)**: búsqueda full-text con índice invertido · filtros **colapsables por categoría** (Tipo / Ubicaciones / Temas) con conteo y limpieza por grupo · vista timeline única (eventos filtrados en orden cronológico) · **hoja de detalle de sesión** (panel derecho en escritorio, bottom sheet en móvil, deep-link `?event=<id>`) · discusión en vivo (UI, backend-ready).

> ℹ️ Este README tiene dos contextos separados:
> **Contenido (es)** — información del evento y del sitio · **Guía técnica (en)** — documentation for builders.

---

## 🚀 Demo en vivo

**Producción (Vercel)**: `https://jidfics.vercel.app` *(después del deploy)*

---

# Contenido (es)

## ✨ Características

- **Búsqueda inteligente** — índice invertido + fuzzy matching (Levenshtein ≤ 2) + ranking ponderado (título > ponente > etiquetas > ponencias > sala > edificio). Maneja tildes y typos: "violncia" → "Violencia", "educacion" → "Educación".
- **Programa normalizado desde JSON real** — 45+ sesiones, 2 días, 6 edificios, 10+ ejes temáticos, 14 tipos de actividad.
- **Filtros colapsables por categoría (nuevo)** — tres grupos plegables (acordeón, todos abiertos por defecto) en orden **Tipo → Ubicaciones → Temas**, cada uno con contador `seleccionados/total` y limpieza por grupo: **Tipo de actividad** (Inauguración, Panel, …; orden alfabético `es`), **Ubicaciones** (una etiqueta por sala `Sala * (Edificio *)`, sin duplicados, orden numérico-aware) y **Temas** (etiquetas temáticas). Clasificación por palabras clave con mapa de excepciones (`lib/schedule/tags.ts`); el esquema de filtros no cambia (agrupación solo-presentación).
- **Filtrado multifacético** — título, ponente, autor, institución, etiqueta, edificio, sala; facetas combinadas con lógica AND/OR.
- **Hoja de detalle de sesión (nuevo)** — al pulsar "Detalles de la sesión" en cualquier tarjeta: ponentes, ponencias completas, etiquetas accionables, **sesiones relacionadas** (mismo día, ranking hora → sala → eje), copiar enlace compartible. Panel derecho en escritorio (≈448 px), bottom sheet en móvil; deep-link `?event=<id>` valida el id antes de abrir.
- **Vista Timeline (nueva)** — línea de tiempo única con TODOS los eventos del día en orden cronológico, ya filtrados por la barra lateral; cada sesión muestra sala + edificio, indicadores de vivo/próximo y etiquetas clicables para filtrar.
- **Filtros activos visibles** — barra de chips removibles con contador de resultados.
- **Discusión en vivo (UI)** — hoja lateral por sesión (`LiveChatSheet`), backend-ready para Supabase Realtime. *Autenticación de participantes para comentar: considerada, pendiente (ver tabla de TODOs).*
- **Seguimiento en tiempo real** — barra flotante con sesiones LIVE NOW / UP NEXT (30 min) agrupadas por sala.
- **Accesibilidad (a11y)** — ARIA roles, focus trap en diálogos, Escape para cerrar, foco devuelto al disparador, navegación por teclado, etiquetas en español.
- **Tema claro/oscuro** — `next-themes` con persistencia en `localStorage`.
- **CI/CD** — GitHub Actions: lint + typecheck + tests + build en cada push/PR.
- **Tests (TDD)** — **172 tests Vitest** en 13 suites (ver Guía técnica).

## 📌 Archivos con TODOs

El trabajo pendiente vive **en el código** como comentarios `TODO(área)`. Índice rápido:

| Archivo | Marcadores |
|---|---|
| `components/schedule/LiveChatSheet.tsx` | `TODO(auth)` acceso de participantes (OAuth 1-click + caché cifrada, considerado) · `TODO(realtime)` canal Supabase Realtime |
| `components/schedule/EventDetailContent.tsx` | `TODO(calendar)` exportar a calendario (ICS/Google) · `TODO(directions)` indicaciones en mapa · `TODO(auth)` habilitar Comentar con sesión |
| `lib/schedule/hooks.ts` | `TODO(backlog)` mis sesiones · notificaciones · vista multi-día · perfiles de ponentes |
| `lib/supabase/proxy.ts` | `TODO(auth)` lista de rutas públicas antes de producción |
| `lib/schedule/tags.ts` | `TODO(data)` excepciones de clasificación de etiquetas |

Listarlos todos: `grep -rn 'TODO(' app components lib`

---

# Guía técnica (en)

## 🗂️ Project structure

```
jidfics/
├── app/
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
│   │   ├── calendario_vii_jidfics.json  # Real dataset (single source of truth)
│   │   └── *.test.ts
│   ├── supabase/
│   │   ├── proxy.ts              # updateSession() for Next 16 proxy
│   │   ├── server.ts             # createClient() for Server Components
│   │   └── client.ts             # createClient() for Browser
│   └── utils.ts                  # cn(), hasEnvVars
├── proxy.ts                      # Next 16 proxy (replaces middleware.ts)
├── src/test/search.test.ts       # 53 TDD tests for SearchEngine
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

**Suites — 172 tests total (170 + 2 integration skipped without credentials):**

| Suite | Tests | Covers |
|---|---|---|
| `src/test/search.test.ts` | 53 | inverted index, fuzzy (Levenshtein), prefix, ranking, highlights, Spanish diacritics |
| `lib/schedule/tags.test.ts` | 27 | keyword classification, overrides, 3-way `type\|topic\|location` routing, sorting (incl. `Sala * (Edificio *)` rooms), counts/clear, real dataset |
| `lib/schedule/eventDetail.test.ts` | 12 | `?event` strict parsing, share URL, related-session ranking |
| `lib/schedule/filter.test.ts` | 12 | date/search/facets AND-OR |
| `lib/schedule/data-integrity.test.ts` | 9 | real JSON guards + known room/time collision snapshot + Ubicaciones label dedupe |
| `lib/schedule/normalize.test.ts` | 7 | JSON → UI shape |
| `lib/schedule/hooks/useCurrentSession.test.ts` | 10 | live/up-next, grouping, time travel |
| `lib/schedule/hooks/useEventDetails.test.ts` | 4 | URL-driven sheet state (replaceState, deep link) |
| `lib/env.test.ts` | 13 | env schema validation (server-only guards) |
| `components/schedule/filter/FilterSidebar.test.tsx` | 9 | 3 collapsible groups (order, scoped counts, `aria-expanded` collapse, per-group clear, `data-category`), rooms-only Ubicaciones |
| `components/schedule/EventDetailSheet.test.tsx` | 7 | details rendering, Escape, clipboard, related, responsive `data-side` |
| `components/schedule/EventTimeline.test.tsx` | 6 | single timeline (no building tabs), chronological order, venue+building per item, tag clicks, live badges |
| `tests/integration/supabase.test.ts` | 3* | real connectivity (*2 skip without credentials) |

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

- **Proxy SSR** (`proxy.ts` + `lib/supabase/proxy.ts`): refreshes the session per request, validates the JWT with `getClaims()`.
- **Renders**: `/` (schedule) is **public, no login**. Future protected routes (`/dashboard`, `/admin`) redirect to `/auth/login`.
- **Pending**: replace the single `pathname !== "/"` check with an explicit public-paths list — tracked as `TODO(auth)` in `lib/supabase/proxy.ts`.
- **Chat auth (considered, NOT built)**: lightweight participant sign-in to comment; evolution path is one-click OAuth (Google / LinkedIn) with a **localStorage-encrypted profile cache** (WebCrypto AES-GCM, per-session key). That cache is a UX optimization only — **never an auth boundary**; the real session stays in the HttpOnly cookie handled by `proxy.ts`. Typing strategy: generated Supabase DB types. Design notes live in `TODO(auth)` at `components/schedule/LiveChatSheet.tsx`.

## 🧱 Architecture decisions

| Area | Decision | Rationale |
|---|---|---|
| Normalization at build | `normalizeEvents()` runs in `page.tsx` (Server Component) | Zero runtime cost, typed data on the client |
| Dynamic facets | `deriveFilters()` extracts options from the dataset | No hardcoded unions; new axes/types/venues need no code change |
| Search | `SearchEngine` (inverted index + Levenshtein + weighted ranking) | Tolerates typos, <50ms |
| **Tag categories** | Pure classifier + override map + three-category reducer (`type\|topic\|location`) in `lib/schedule/tags.ts`; **presentation-only grouping** (filters schema unchanged) | Single ordering authority; `type` is facet-backed only (never keyword-inferred); no filter-serialization breakage; edge cases data-driven via `TODO(data)` |
| **Collapsible groups** | Existing shadcn/Radix Accordion (`type="multiple"`, all open by default) wrapping `FilterGroup` | No new dependency; unmount-on-close content, roving keyboard nav and `aria-expanded` free from Radix |
| **Detail sheet** | shadcn/Radix Sheet (Dialog primitive) + `data-side` responsive switch | No new dependency; focus trap/Escape/focus-return free from Radix |
| **URL state** | `history.replaceState` (no router, no `useSearchParams`) | No Suspense requirement, no history spam, still deep-linkable |
| Composite hooks | `useScheduleApp` orchestrates search + filters + live + view + chat + details | Separation of concerns, testable |
| Colors | FNV-1a hash → 10 Tailwind colors (literal classes) | Deterministic, dark-mode safe, tree-shakeable |
| Venue keys | `slugify(label)` (lowercase, diacritics stripped, `-` separator) | Dedupe "Sala de Usos Múltiples" / "sala de usos multiples" |
| Next 16 proxy | `export function proxy` in `proxy.ts` (not `middleware.ts`) | Official Next 16 convention |
| Snapshot tests | Known Thursday room/time collisions fixed in a test | Catches data regressions without fighting editorial data |
| Component taxonomy | primitive (Radix) → component (`Tag`, `FilterGroup`) → block (`FilterSidebar`, `EventDetailSheet`) → utility (`tags.ts`, `eventDetail.ts`) | building-components skill: composition, `data-slot`/`data-state` contracts, code = documentation |

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
