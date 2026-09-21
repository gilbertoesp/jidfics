"use client";

import { BuildingTimeline } from "@/components/schedule/BuildingTimeline";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ConferenceEvent, ScheduleDerived } from "@/lib/schedule/types";
import type { LiveStatus } from "@/components/schedule/LiveIndicatorBadge";

export interface BuildingTimelinesProps {
  events: ConferenceEvent[];
  derived: ScheduleDerived;
  getLiveStatus?: (event: ConferenceEvent) => LiveStatus;
  onTagClick?: (tag: string) => void;
  selectedTags?: string[];
}

/**
 * Tabbed view that renders a `BuildingTimeline` per building.
 * - `TabsList` contains one `TabsTrigger` per `derived.buildings`.
 * - Each `TabsContent` renders `BuildingTimeline` for that building.
 * - Default tab is the first building entry.
 * - Shows ALL events for each building across both conference days, sorted chronologically
 *   by `date` then `startTime` (delegated to `BuildingTimeline`).
 */
export function BuildingTimelines({
  events,
  derived,
  getLiveStatus,
  onTagClick,
  selectedTags = [],
}: BuildingTimelinesProps) {
  const buildings = derived.buildings;

  if (buildings.length === 0) {
    return (
      <p
        role="status"
        className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground"
      >
        No hay edificios disponibles.
      </p>
    );
  }

  const defaultValue = buildings[0]?.key ?? "";

  // Counts per building for clear UX — delivers value: user sees where sessions are
  const counts = new Map<string, number>();
  for (const e of events) counts.set(e.building, (counts.get(e.building) ?? 0) + 1);

  return (
    <Tabs defaultValue={defaultValue} className="w-full" data-slot="building-timelines">
      <TabsList
        aria-label="Seleccionar edificio"
        data-slot="building-timelines-list"
        className="inline-flex h-auto w-full flex-wrap items-center justify-start gap-1 rounded-lg bg-muted p-1"
      >
        {buildings.map((building) => {
          const count = counts.get(building.key) ?? 0;
          return (
            <TabsTrigger
              key={building.key}
              value={building.key}
              data-slot="building-tab"
              data-count={count}
              data-empty={count === 0 ? "true" : undefined}
              className="whitespace-nowrap text-xs sm:text-sm data-[empty=true]:opacity-60"
            >
              <span className="hidden sm:inline">{building.label}</span>
              <span className="sm:hidden">{building.key}</span>
              <span
                aria-hidden="true"
                data-slot="building-tab-count"
                className="ml-1.5 inline-flex min-h-4 min-w-4 items-center justify-center rounded bg-background px-1 py-0.5 text-[10px] font-semibold leading-none text-muted-foreground data-[empty=true]:hidden"
                data-empty={count === 0 ? "true" : undefined}
              >
                {count}
              </span>
            </TabsTrigger>
          );
        })}
      </TabsList>

      {buildings.map((building) => (
        <TabsContent
          key={building.key}
          value={building.key}
          className="mt-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <BuildingTimeline
            building={building}
            events={events}
            getLiveStatus={getLiveStatus}
            onTagClick={onTagClick}
            selectedTags={selectedTags}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}
