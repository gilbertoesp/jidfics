"use client";

import { BuildingTimeline } from "@/components/schedule/BuildingTimeline";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ConferenceEvent, ScheduleDerived } from "@/lib/schedule/types";
import type { LiveStatus } from "@/components/schedule/LiveIndicatorBadge";

export interface BuildingTimelinesProps {
  events: ConferenceEvent[];
  derived: ScheduleDerived;
  getLiveStatus?: (event: ConferenceEvent) => LiveStatus;
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

  return (
    <Tabs defaultValue={defaultValue} className="w-full">
      <TabsList
        aria-label="Seleccionar edificio"
        className="inline-flex h-auto w-full flex-wrap items-center justify-start gap-1 rounded-lg bg-muted p-1"
      >
        {buildings.map((building) => (
          <TabsTrigger
            key={building.key}
            value={building.key}
            className="whitespace-nowrap text-xs sm:text-sm"
          >
            <span className="hidden sm:inline">{building.label}</span>
            <span className="sm:hidden">{building.key}</span>
          </TabsTrigger>
        ))}
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
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}
