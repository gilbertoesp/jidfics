import { CalendarDays, GraduationCap, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";

/**
 * Server Component: static event metadata skeleton.
 * No client interactivity — rendered on the server only.
 */
export function ScheduleHeader() {
  return (
    <header className="border-b bg-gradient-to-b from-primary/5 to-transparent dark:from-primary/10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-10 sm:px-6">
        <Badge
          variant="outline"
          className="w-fit gap-1.5 border-primary/30 bg-background/60 px-3 py-1 text-xs font-semibold uppercase tracking-wider"
        >
          <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
          VII JIDFICS · 2026
        </Badge>

        <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          VII International Conference on Social Sciences and Legal Sciences
        </h1>

        <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
          <span className="inline-flex items-center gap-2">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            <time dateTime="2026-09-23">September 23</time>
            <span aria-hidden="true">–</span>
            <time dateTime="2026-09-24">September 24, 2026</time>
          </span>
          <span className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            Universidad de Sonora, Campus Caborca
          </span>
        </div>
      </div>
    </header>
  );
}