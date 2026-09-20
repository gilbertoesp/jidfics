# VII JIDFICS — Programa Interactivo

Sitio web oficial de la **VII Jornadas Internacionales de Docencia e Investigación en Ciencias Sociales** (JIDFICS), celebrada en la **Universidad de Sonora, Campus Caborca** los días **23 y 24 de septiembre de 2026**.

> **Estado**: Programa interactivo desplegado — búsqueda full-text con índice invertido, filtrado por día/eje/tipo/sala/edificio, vista timeline por edificio, tarjetas expandibles, hoja lateral de discusión en vivo (UI lista para Supabase Realtime).

---

## 🚀 Demo en vivo

**Producción (Vercel)**: `https://jidfics.vercel.app` *(después del deploy)*

---

## ✨ Características

- **Búsqueda inteligente (nuevo)** — índice invertido + fuzzy matching (Levenshtein ≤ 2) + ranking ponderado (título > ponente > etiquetas > ponencias > sala > edificio). Maneja tildes y typos: "violncia" → "Violencia", "educacion" → "Educación".
- **Programa normalizado desde JSON real** — 45+ sesiones, 2 días, 6 edificios, 10+ ejes temáticos, 15+ tipos de actividad.
- **Filtrado multifacético** — busca por título, ponente, autor, institución, etiqueta, edificio, sala; combina facetas con lógica AND/OR.
- **Vista Timeline por edificio** — pestañas por edificio con contador de sesiones, timeline vertical cronológico.
- **Tarjetas de sesión expandibles** — detalle de ponentes + lista de ponencias con autores e instituciones; etiquetas accionables (click → filtra).
- **Filtros activos visibles** — barra de chips removibles con contador de resultados.
- **Discusión en vivo (UI)** — hoja lateral por sesión (`LiveChatSheet`), backend-ready para Supabase Realtime.
- **Seguimiento en tiempo real** — barra flotante con sesiones LIVE NOW / UP NEXT (30 min) agrupadas por sala.
- **Modo "Time Travel" (dev)** — simula hora del evento para probar estados live/up-next.
- **Accesibilidad (a11y)** — ARIA roles, foco visible, navegación por teclado, etiquetas en español.
- **Tema claro/oscuro** — `next-themes` con persistencia en `localStorage`.
- **Stack moderno** — Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS v4, shadcn/ui, TypeScript estricto.
- **Auth preparada** — Supabase SSR (`@supabase/ssr`) con `proxy.ts` (Next 16), cookies HttpOnly, refresco automático de sesión.
- **CI/CD** — GitHub Actions: lint + typecheck + tests + build en cada push/PR.
- **Tests (TDD)** — 93 tests Vitest: búsqueda (53), filtrado, normalización, integridad de datos, live sessions, smoke test Supabase.

---

## 🗂️ Estructura del proyecto

```
jidfics/
├── app/
│   ├── page.tsx                 # Página principal (Server Component) — usa ScheduleApp
│   ├── layout.tsx               # Root layout + providers
│   └── globals.css              # Estilos globales + variables CSS
├── components/
│   ├── schedule/
│   │   ├── ScheduleApp.tsx      # Componente monolítico principal (filtros + grid + timeline + live)
│   │   ├── ScheduleHeader.tsx   # Cabecera con metadata del evento
│   │   ├── EventCard.tsx        # Tarjeta de sesión expandible (etiquetas accionables)
│   │   ├── BuildingTimeline.tsx # Timeline vertical por edificio
│   │   ├── BuildingTimelines.tsx# Pestañas por edificio con contadores
│   │   ├── FilterPanel.tsx      # Panel de filtros (usa TagGroup)
│   │   ├── Tag.tsx              # Primitiva Tag + TagGroup + ActiveFiltersBar
│   │   ├── LiveIndicatorBadge.tsx
│   │   ├── FloatingSessionBar.tsx
│   │   ├── LiveChatSheet.tsx
│   │   └── TimeTravelDevPanel.tsx
│   ├── ui/                      # Primitivas shadcn/ui (Button, Input, Tabs, Accordion…)
│   └── theme-switcher.tsx       # Toggle claro/oscuro
├── lib/
│   ├── schedule/
│   │   ├── types.ts             # Tipos TS: Raw* (JSON) + normalizados
│   │   ├── normalize.ts         # Pipeline: JSON → eventos planos + meta + filtros derivados
│   │   ├── filter.ts            # Motor de filtrado puro (sin efectos)
│   │   ├── search.ts            # **NUEVO**: SearchEngine (índice invertido + fuzzy + ranking)
│   │   ├── hooks.ts             # **NUEVO**: hooks compuestos (useScheduleApp, useSearch, etc.)
│   │   ├── hooks/               # Hooks atómicos
│   │   │   └── useCurrentSession.ts  # Seguimiento live/up-next + time travel
│   │   ├── colors.ts            # Paleta hash-determinista (FNV-1a → 10 colores Tailwind)
│   │   ├── calendario_vii_jidfics.json   # Dataset real (fuente única)
│   │   ├── *.test.ts            # Tests unitarios + integridad de datos
│   ├── supabase/
│   │   ├── proxy.ts             # updateSession() para proxy.ts (Next 16)
│   │   ├── server.ts            # createClient() para Server Components
│   │   └── client.ts            # createClient() para Client Components
│   └── utils.ts                 # cn(), hasEnvVars
├── proxy.ts                     # Next 16 proxy (reemplaza middleware.ts)
├── src/test/                    # Tests de integración + búsqueda
│   └── search.test.ts           # 53 tests TDD del SearchEngine
├── .github/workflows/ci.yml     # CI: lint + typecheck + test + build
├── vitest.config.ts             # Config Vitest (alias @, node env, jsdom)
├── tailwind.config.ts           # Animaciones accordion + plugin animate
├── tsconfig.json                # TS estricto + paths @/*
└── README.md                    # Este archivo
```

---

## 🛠️ Desarrollo local

### Requisitos

- **bun** ≥ 1.1 (gestor de paquetes y runtime — `npm` falla con `ERESOLVE` en este repo)
- Node.js ≥ 20 (para `bun` y herramientas)

### Instalación

```bash
# Clonar
git clone git@github.com:gilbertoesp/jidfics.git
cd jidfics

# Instalar dependencias
bun install

# Variables de entorno (copia y edita)
cp .env.example .env
# Edita .env con tus credenciales de Supabase (ver abajo)

# Servidor de desarrollo (Turbopack)
bun run dev
```

Abre [http://localhost:3000](http://localhost:3000) — el programa interactivo carga en `/`.

### Variables de entorno

| Variable | Descripción | Requerida |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase (ej. `https://xxxxx.supabase.co`) | Sí (para auth/Realtime) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave pública (anon/publishable) de Supabase | Sí (para auth/Realtime) |

> **Nota**: El programa funciona **sin Supabase** (modo solo lectura) si omites las variables. El `proxy.ts` tiene un guard `hasEnvVars` que salta la verificación de sesión en desarrollo sin credenciales.

---

## 🧪 Tests

```bash
# Todas las suites (vitest con jsdom)
bunx vitest run

# Solo unitarias (rápido, sin jsdom)
bun test lib/schedule/

# Tests de búsqueda (TDD - 53 tests)
bunx vitest run src/test/search.test.ts
```

**Suites incluidas**:
- `src/test/search.test.ts` — **53 tests TDD** del SearchEngine: índice invertido, fuzzy matching (Levenshtein), prefix matching, ranking ponderado, highlighting, sugerencias, filtros combinados, español (tildes/ñ).
- `lib/schedule/normalize.test.ts` — normalización JSON → UI shape (7 tests).
- `lib/schedule/filter.test.ts` — motor de filtrado puro: fecha, búsqueda, facetas AND/OR (12 tests).
- `lib/schedule/data-integrity.test.ts` — guards sobre JSON real: IDs únicos, tiempos válidos, campos requeridos, **snapshot de 3 colisiones conocidas de sala/hora en jueves** (8 tests).
- `lib/schedule/hooks/useCurrentSession.test.ts` — live/up-next, agrupación por sala, time travel, límites de conferencia (10 tests).
- `tests/integration/supabase.test.ts` — conectividad real a Supabase (se salta sin credenciales).

---

## 📦 Build y deploy

```bash
# Build de producción (typecheck + lint + compile)
bun run build

# Preview local del build
bun run start
```

### Deploy a Vercel (producción)

1. **Vercel CLI** (ya instalado globalmente):
   ```bash
   vercel login          # OAuth device flow
   vercel link           # Vincula repo → proyecto Vercel
   vercel env add NEXT_PUBLIC_SUPABASE_URL production
   vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production
   vercel deploy --prod
   ```

2. **O bien: GitHub → Vercel Integration** (recomendado para CI/CD)
   - En Vercel: *Add New Project* → Importa `gilbertoesp/jidfics`
   - Vercel detecta Next.js automáticamente
   - En *Settings → Environment Variables*: añade `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (target: **Production**, **Preview**, **Development**)
   - Push a `main` → deploy automático a producción

### Supabase Vercel Integration (sincroniza env vars + URLs de auth)

1. En Vercel: *Project → Settings → Integrations → Supabase* → *Connect*
2. Selecciona tu proyecto Supabase → Vercel inyecta automáticamente:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (legacy, opcional)
3. **Auth URLs en Supabase Dashboard** (*Authentication → URL Configuration*):
   - **Site URL**: `https://jidfics.vercel.app` (tu dominio de prod)
   - **Redirect URLs**: añade también `https://jidfics-git-main-gilbertoesp.vercel.app/**` (previews de Vercel)
   - Esto permite login/OAuth en producción y previews.

---

## 🔐 Auth — Estado actual

- **Proxy SSR** (`proxy.ts` + `lib/supabase/proxy.ts`): refresca sesión en cada request, valida JWT con `getClaims()`.
- **Server Components**: `lib/supabase/server.ts` → `createClient()` usa `cookies()` de `next/headers`.
- **Client Components**: `lib/supabase/client.ts` → `createBrowserClient()`.
- **Rutas públicas**: `/` (programa) — **NO requiere login**.
- **Rutas protegidas (futuro)**: `/dashboard`, `/admin`, etc. — el proxy redirige a `/auth/login` si no hay sesión.

> ⚠️ **Ajuste pendiente antes de prod**: en `lib/supabase/proxy.ts` líneas 50-60, la condición `pathname !== "/"` bloquea el programa para usuarios no autenticados. Cambiar a:
> ```ts
> const publicPaths = ["/", "/auth", "/login"];
> if (!publicPaths.some(p => request.nextUrl.pathname.startsWith(p)) && !user) { ... }
> ```

---

## 🧱 Decisiones de arquitectura

| Área | Decisión | Rationale |
|---|---|---|
| **Normalización en build** | `normalizeEvents()` corre en `page.tsx` (Server Component) | Cero runtime cost; datos tipados en cliente |
| **Filtros dinámicos** | `deriveFilters()` extrae opciones del dataset | Sin unions hardcodeadas; admite nuevos ejes/tipos/salas sin tocar código |
| **Búsqueda (nuevo)** | `SearchEngine` con índice invertido + Levenshtein + ranking ponderado | Encuentra charlas por título/ponente/autor/institución/etiqueta/edificio/sala; tolera typos; <50ms |
| **Componente monolítico** | `ScheduleApp` unifica filtros, grid, timeline, live bar | Menos archivos, flujo de datos claro, fácil de mantener |
| **Hooks compuestos** | `useScheduleApp` orquesta search + filters + live + view + chat | Separación de concerns; testable; reutilizable |
| **Colores** | FNV-1a hash → 10 colores Tailwind (clase literal) | Determinista, sin colisiones, funciona en dark mode, tree-shakeable |
| **Venue keys** | `slugify(label)` (minúsculas, sin diacríticas, `-` como separador) | Dedupe "Sala de Usos Múltiples" / "sala de usos multiples" |
| **Next 16 proxy** | `export function proxy` en `proxy.ts` (no `middleware.ts`) | Convención oficial Next 16; build muestra `ƒ Proxy (Middleware)` |
| **Tests snapshot** | Colisiones conocidas de sala/hora en jueves fijadas en test | Detecta regresiones de integridad sin luchar contra datos editoriales |

---

## 📄 Licencia

Código del sitio: **MIT** — libre para usar, modificar y distribuir.

Datos del programa (JSON): **propiedad de los organizadores de JIDFICS** — uso autorizado para este sitio.

---

## 🤝 Créditos

- **Organización**: VII JIDFICS — Universidad de Sonora, Campus Caborca
- **Desarrollo**: Gilberto Espinoza ([@gilbertoesp](https://github.com/gilbertoesp))
- **Stack**: Next.js, Supabase, Tailwind CSS, shadcn/ui, Vitest, Vercel

---

## 📞 Contacto

- Issues: [GitHub Issues](https://github.com/gilbertoesp/jidfics/issues)
- Email: organización JIDFICS (ver sitio oficial)