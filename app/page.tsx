import { ScheduleHeader } from "@/components/schedule/ScheduleHeader";
import { ScheduleClient } from "@/components/schedule/ScheduleClient";
import { ThemeSwitcher } from "@/components/theme-switcher";
import type { ConferenceEvent } from "@/lib/schedule/types";
import rawEvents from "@/lib/schedule/calendario_vii_jidfics.json";

const events = rawEvents as ConferenceEvent[];

/**
 * VII JIDFICS schedule — Server Component page skeleton.
 *
 * Static layout (header, shell) is rendered on the server; the interactive
 * filtering client mounts below with the dataset passed as props.
 */
export default function SchedulePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 flex items-center justify-between border-b bg-background/80 px-4 py-2 backdrop-blur-sm sm:px-6">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          VII JIDFICS · Programa
        </span>
        <ThemeSwitcher />
      </div>

      <ScheduleHeader />

      {/* Client boundary — all dynamic state lives below this point */}
      <ScheduleClient events={events} />

      <footer className="mt-8 border-t py-8 text-center text-xs text-muted-foreground">
        VII JIDFICS · September 23–24, 2026 · Universidad de Sonora, Campus
        Caborca
      </footer>
    </main>
  );
}