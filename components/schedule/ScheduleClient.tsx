"use client";

import { useMemo, useState, useCallback } from "react";

import { CalendarDays, LayoutGrid, Timer } from "lucide-react";

import { BuildingTimelines } from "@/components/schedule/BuildingTimelines";
import { EventCard } from "@/components/schedule/EventCard";
import { FilterPanel } from "@/components/schedule/FilterPanel";
import { FloatingSessionBar } from "@/components/schedule/FloatingSessionBar";
import { LiveChatSheet } from "@/components/schedule/LiveChatSheet";
import { TimeTravelDevPanel } from "@/components/schedule/TimeTravelDevPanel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  EMPTY_FILTERS,
  filterEvents,
  hasActiveFilters,
  scheduleSorter,
  type ScheduleFilters,
} from "@/lib/schedule/filter";
import {
  dayLabel,
  type ConferenceEvent,
  type ConferenceMeta,
  type ScheduleDerived,
} from "@/lib/schedule/types";
import { useCurrentSession } from "@/lib/schedule/hooks/useCurrentSession";

interface ScheduleClientProps {
  events: ConferenceEvent[];
  meta: ConferenceMeta;
  derived: ScheduleDerived;
}

export function ScheduleClient({ events, meta, derived }: ScheduleClientProps) {
  const [filters, setFilters] = useState<ScheduleFilters>({
    ...EMPTY_FILTERS,
    date: meta.days[0]?.date ?? EMPTY_FILTERS.date,
  });
  const [view, setView] = useState<"grid" | "timeline">("grid");
  const [chatEvent, setChatEvent] = useState<ConferenceEvent | null>(null);
  const [barDismissed, setBarDismissed] = useState(false);

  const {
    liveNow,
    upNext,
    liveByHall,
    upNextByHall,
    currentTime,
    isTimeTravel,
    isWithinConferenceDates,
    setTimeTravel,
    advanceMinutes,
  } = useCurrentSession({
    events,
  });

  const filteredEvents = useMemo(
    () => filterEvents(events, filters).sort(scheduleSorter),
    [events, filters],
  );

  function update(patch: Partial<ScheduleFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  const toggleValue = (selected: string[], value: string): string[] =>
    selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];

  const activeDay = meta.days.find((day) => day.date === filters.date);

  const getLiveStatus = useCallback((event: ConferenceEvent): "live" | "up-next" | "idle" => {
    if (liveNow.some((e) => e.id === event.id)) return "live";
    if (upNext.some((e) => e.id === event.id)) return "up-next";
    return "idle";
  }, [liveNow, upNext]);

  // Scroll to event without triggering time-travel
  const handleScrollToEvent = useCallback((eventId: string) => {
    const element = document.getElementById(eventId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.focus({ preventScroll: true });
    }
  }, []);

  // Dismiss floating bar for this session
  const handleDismissBar = useCallback(() => {
    setBarDismissed(true);
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 pb-24">
      {/* Date switcher + view switcher — visible in both views, filters still apply */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={filters.date}
          onValueChange={(value) => update({ date: value })}
        >
          <TabsList className="grid w-full grid-cols-2 sm:w-auto">
            {meta.days.map((day) => (
              <TabsTrigger key={day.date} value={day.date} className="gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span>{dayLabel(day.dayName, day.date)}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div
          role="group"
          aria-label="Cambiar vista del programa"
          className="inline-flex items-center gap-1 self-start rounded-lg bg-muted p-1 sm:self-auto"
        >
          <Button
            type="button"
            size="sm"
            variant={view === "grid" ? "default" : "ghost"}
            aria-pressed={view === "grid"}
            onClick={() => setView("grid")}
            className="gap-1.5"
          >
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            Grilla
          </Button>
          <Button
            type="button"
            size="sm"
            variant={view === "timeline" ? "default" : "ghost"}
            aria-pressed={view === "timeline"}
            onClick={() => setView("timeline")}
            className="gap-1.5"
          >
            <Timer className="h-4 w-4" aria-hidden="true" />
            Timeline por Edificio
          </Button>
        </div>
      </div>

      {/* Multi-facet filtering — visible in both views */}
      <FilterPanel
        filters={filters}
        derived={derived}
        resultCount={filteredEvents.length}
        onSearchChange={(searchQuery) => update({ searchQuery })}
        onToggleAxis={(axis) => setFilters((prev) => ({ ...prev, axes: toggleValue(prev.axes, axis) }))}
        onToggleTag={(tag) => setFilters((prev) => ({ ...prev, tags: toggleValue(prev.tags, tag) }))}
        onToggleActivityType={(type) =>
          setFilters((prev) => ({ ...prev, activityTypes: toggleValue(prev.activityTypes, type) }))
        }
        onToggleVenue={(venueKey) =>
          setFilters((prev) => ({ ...prev, venues: toggleValue(prev.venues, venueKey) }))
        }
        onToggleBuilding={(building) =>
          setFilters((prev) => ({ ...prev, buildings: toggleValue(prev.buildings, building) }))
        }
        onClear={() => setFilters({ ...EMPTY_FILTERS, date: filters.date })}
      />

      {/* Results */}
      <section aria-label={`Sesiones del ${activeDay ? activeDay.dayName : "dia"}`}>
        {filteredEvents.length === 0 ? (
          <p
            role="status"
            className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground"
          >
            {hasActiveFilters(filters)
              ? "No hay sesiones que coincidan con los filtros actuales. Intenta eliminar algún filtro."
              : "No hay sesiones programadas para este día."}
          </p>
        ) : view === "grid" ? (
          <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filteredEvents.map((event) => (
              <li key={event.id} id={event.id} className="h-full">
                <EventCard
                  event={event}
                  onOpenChat={setChatEvent}
                  liveStatus={getLiveStatus(event)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">Vista cronológica por edificio</p>
            <BuildingTimelines
              events={filteredEvents}
              derived={derived}
              getLiveStatus={getLiveStatus}
            />
          </div>
        )}
      </section>

      {/* Session live discussion side sheet */}
      <LiveChatSheet
        event={chatEvent}
        onOpenChange={(open) => {
          if (!open) setChatEvent(null);
        }}
      />

      {/* Floating Session Bar - shows live/up-next across halls */}
      {!barDismissed && (
        <FloatingSessionBar
          liveByHall={liveByHall}
          upNextByHall={upNextByHall}
          onScrollToEvent={handleScrollToEvent}
          onDismiss={handleDismissBar}
        />
      )}

      {/* Time Travel Debug Panel (dev only) */}
      <TimeTravelDevPanel
        currentTime={currentTime}
        isTimeTravel={isTimeTravel}
        isWithinConferenceDates={isWithinConferenceDates}
        setTimeTravel={setTimeTravel}
        advanceMinutes={advanceMinutes}
      />
    </div>
  );
}