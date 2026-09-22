import { CalendarDays, GraduationCap, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { ConferenceMeta } from "@/lib/schedule/types";

interface ScheduleHeaderProps {
  meta: ConferenceMeta;
}

/**
 * Server Component: static event metadata skeleton.
 * Rendered on the server only — no client interactivity.
 */
export function ScheduleHeader({ meta }: ScheduleHeaderProps) {
  return (
    <header className="border-b bg-gradient-to-b from-primary/5 to-transparent dark:from-primary/10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-10 sm:px-6">
        <Badge
          variant="outline"
          className="w-fit gap-1.5 border-primary/30 bg-background/60 px-3 py-1 text-xs font-semibold uppercase tracking-wider"
        >
          <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
          JIDFICS · Edición {meta.edition}
        </Badge>

        <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {meta.name}
        </h1>

        <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
          <span className="inline-flex items-center gap-2">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            <time dateTime={meta.startDate}>
              {new Date(`${meta.startDate}T12:00:00`).toLocaleDateString(
                "es-MX",
                {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                },
              )}
            </time>
            <span aria-hidden="true">–</span>
            <time dateTime={meta.endDate}>
              {new Date(`${meta.endDate}T12:00:00`).toLocaleDateString(
                "es-MX",
                {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                },
              )}
            </time>
          </span>
          <span className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {meta.venueInstitution}, Campus {meta.venueCampus} ·{" "}
            {meta.venueLocation}
          </span>
        </div>
      </div>
    </header>
  );
}
