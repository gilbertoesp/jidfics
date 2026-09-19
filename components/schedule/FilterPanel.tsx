"use client";

import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  ACTIVITY_TYPE_COLORS,
  THEMATIC_AXIS_COLORS,
  VENUE_COLORS,
} from "@/lib/schedule/colors";
import {
  ACTIVITY_TYPES,
  THEMATIC_AXES,
  VENUES,
  VENUE_IDS,
} from "@/lib/schedule/types";
import { type ScheduleFilters } from "@/lib/schedule/filter";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Generic toggle pill group                                          */
/* ------------------------------------------------------------------ */

interface PillGroupProps<T extends string> {
  id: string;
  legend: string;
  options: readonly T[];
  selected: T[];
  onToggle: (value: T) => void;
  colorFor: (value: T) => { dot: string };
  labelFor?: (value: T) => string;
}

function PillGroup<T extends string>({
  id,
  legend,
  options,
  selected,
  onToggle,
  colorFor,
  labelFor,
}: PillGroupProps<T>) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="sr-only">{legend}</legend>
      <span
        id={`${id}-label`}
        className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {legend}
      </span>
      <div
        role="group"
        aria-labelledby={`${id}-label`}
        className="flex flex-wrap gap-2"
      >
        {options.map((option) => {
          const active = selected.includes(option);
          const { dot } = colorFor(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(option)}
              className={cn(
                "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <span
                aria-hidden="true"
                className={cn("h-2 w-2 rounded-full", active ? "bg-current" : dot)}
              />
              {labelFor ? labelFor(option) : option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/* ------------------------------------------------------------------ */
/* Filter panel                                                       */
/* ------------------------------------------------------------------ */

interface FilterPanelProps {
  filters: ScheduleFilters;
  resultCount: number;
  onSearchChange: (query: string) => void;
  onToggleAxis: (axis: ScheduleFilters["axes"][number]) => void;
  onToggleActivityType: (type: ScheduleFilters["activityTypes"][number]) => void;
  onToggleVenue: (venue: ScheduleFilters["venues"][number]) => void;
  onClear: () => void;
}

export function FilterPanel({
  filters,
  resultCount,
  onSearchChange,
  onToggleAxis,
  onToggleActivityType,
  onToggleVenue,
  onClear,
}: FilterPanelProps) {
  return (
    <section
      aria-label="Schedule filters"
      className="flex flex-col gap-5 rounded-xl border bg-card p-4 text-card-foreground shadow-sm sm:p-5"
    >
      {/* Search */}
      <div className="relative">
        <Label htmlFor="schedule-search" className="sr-only">
          Search sessions
        </Label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id="schedule-search"
          type="search"
          placeholder="Search by title, speaker, author, or institution…"
          value={filters.searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
          autoComplete="off"
        />
      </div>

      <Separator />

      <PillGroup
        id="axis-filter"
        legend="Filter by thematic axis"
        options={THEMATIC_AXES}
        selected={filters.axes}
        onToggle={onToggleAxis}
        colorFor={(v) => THEMATIC_AXIS_COLORS[v]}
      />

      <PillGroup
        id="activity-filter"
        legend="Filter by activity type"
        options={ACTIVITY_TYPES}
        selected={filters.activityTypes}
        onToggle={onToggleActivityType}
        colorFor={(v) => ACTIVITY_TYPE_COLORS[v]}
      />

      <PillGroup
        id="venue-filter"
        legend="Filter by room / venue"
        options={VENUE_IDS}
        selected={filters.venues}
        onToggle={onToggleVenue}
        colorFor={(v) => VENUE_COLORS[v]}
        labelFor={(v) => VENUES[v]}
      />

      <Separator />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          aria-live="polite"
          role="status"
          className="text-sm text-muted-foreground"
        >
          {resultCount} {resultCount === 1 ? "session" : "sessions"} found
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClear}
          disabled={resultCount === 0}
          className="gap-1.5"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Clear filters
        </Button>
      </div>
    </section>
  );
}