import { ScheduleApp } from "@/components/schedule/ScheduleApp";
import { ThemeSwitcher } from "@/components/theme-switcher";
import rawCalendario from "@/lib/schedule/calendario_vii_jidfics.json";
import {
  deriveFilters,
  normalizeEvents,
  normalizeMeta,
} from "@/lib/schedule/normalize";
import type { RawCalendario } from "@/lib/schedule/types";

const calendario = rawCalendario as RawCalendario;

// Normalization runs once at build time on the server.
const events = normalizeEvents(calendario);
const meta = normalizeMeta(calendario);
const derived = deriveFilters(events);

/**
 * VII JIDFICS schedule — Server Component page skeleton.
 * Static layout (header, shell, data normalization) runs on the server;
 * the interactive filtering client mounts below with normalized data.
 */
export default function SchedulePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 flex items-center justify-between border-b bg-background/80 px-4 py-2 backdrop-blur-sm sm:px-6">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          JIDFICS · Programa
        </span>
        <ThemeSwitcher />
      </div>

      {/* Client boundary — all dynamic state lives below this point */}
      <ScheduleApp events={events} meta={meta} derived={derived} />

      <footer className="mt-8 border-t py-8 text-center text-xs text-muted-foreground">
        {meta.name} · {meta.hostInstitution}, Campus {meta.hostCampus}
      </footer>
    </main>
  );
}
