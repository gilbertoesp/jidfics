import { ScheduleHeader } from "@/components/schedule/ScheduleHeader";
import { ScheduleClient } from "@/components/schedule/ScheduleClient";
import { ThemeSwitcher } from "@/components/theme-switcher";
import {
  deriveFilters,
  normalizeEvents,
  normalizeMeta,
} from "@/lib/schedule/normalize";
import type { RawCalendario } from "@/lib/schedule/types";
import rawCalendario from "@/lib/schedule/calendario_vii_jidfics.json";

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

      <ScheduleHeader meta={meta} />

      {/* Client boundary — all dynamic state lives below this point */}
      <ScheduleClient events={events} meta={meta} derived={derived} />

      <footer className="mt-8 border-t py-8 text-center text-xs text-muted-foreground">
        {meta.name} · {meta.venueInstitution}, Campus {meta.venueCampus}
      </footer>
    </main>
  );
}