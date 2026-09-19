"use client";

import { useMemo, useState } from "react";

import { CalendarDays } from "lucide-react";

import { EventCard } from "@/components/schedule/EventCard";
import { FilterPanel } from "@/components/schedule/FilterPanel";
import { LiveChatSheet } from "@/components/schedule/LiveChatSheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  EMPTY_FILTERS,
  filterEvents,
  hasActiveFilters,
  scheduleSorter,
  type ScheduleFilters,
} from "@/lib/schedule/filter";
import {
  DATE_LABELS,
  DATE_SHORT_LABELS,
  type ActivityType,
  type ConferenceDate,
  type ConferenceEvent,
  type ThematicAxis,
  type VenueId,
} from "@/lib/schedule/types";

interface ScheduleClientProps {
  events: ConferenceEvent[];
}

export function ScheduleClient({ events }: ScheduleClientProps) {
  const [filters, setFilters] = useState<ScheduleFilters>(EMPTY_FILTERS);
  const [chatEvent, setChatEvent] = useState<ConferenceEvent | null>(null);

  const filteredEvents = useMemo(
    () => filterEvents(events, filters).sort(scheduleSorter),
    [events, filters],
  );

  function update(patch: Partial<ScheduleFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  const toggleValue = <T extends string>(
    selected: T[],
    value: T,
  ): T[] =>
    selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      {/* Date switcher (tablist) */}
      <Tabs
        value={filters.date}
        onValueChange={(value) => update({ date: value as ConferenceDate })}
      >
        <TabsList className="grid w-full grid-cols-2 sm:w-auto">
          {(Object.keys(DATE_LABELS) as ConferenceDate[]).map((date) => (
            <TabsTrigger key={date} value={date} className="gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span className="hidden sm:inline">{DATE_LABELS[date]}</span>
              <span className="sm:hidden">{DATE_SHORT_LABELS[date]}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Multi-facet filtering */}
      <FilterPanel
        filters={filters}
        resultCount={filteredEvents.length}
        onSearchChange={(searchQuery) => update({ searchQuery })}
        onToggleAxis={(axis: ThematicAxis) =>
          update({ axes: toggleValue(filters.axes, axis) })
        }
        onToggleActivityType={(type: ActivityType) =>
          update({ activityTypes: toggleValue(filters.activityTypes, type) })
        }
        onToggleVenue={(venue: VenueId) =>
          update({ venues: toggleValue(filters.venues, venue) })
        }
        onClear={() => setFilters(EMPTY_FILTERS)}
      />

      {/* Results */}
      <section aria-label={`Sessions on ${DATE_LABELS[filters.date]}`}>
        {filteredEvents.length === 0 ? (
          <p
            role="status"
            className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground"
          >
            {hasActiveFilters(filters)
              ? "No sessions match your current filters. Try clearing one or more filters."
              : "No sessions scheduled for this day."}
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filteredEvents.map((event) => (
              <li key={event.id} className="h-full">
                <EventCard event={event} onOpenChat={setChatEvent} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Session live discussion side sheet */}
      <LiveChatSheet
        event={chatEvent}
        onOpenChange={(open) => {
          if (!open) setChatEvent(null);
        }}
      />
    </div>
  );
}