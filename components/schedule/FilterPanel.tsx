"use client";

import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { dotFor } from "@/lib/schedule/colors";
import { type ScheduleFilters } from "@/lib/schedule/filter";
import { type ScheduleDerived } from "@/lib/schedule/types";
import { cn } from "@/lib/utils";
import { Tag, TagGroup } from "@/components/schedule/Tag";

/* ------------------------------------------------------------------ */
/* Generic toggle pill group                                          */
/* ------------------------------------------------------------------ */

interface PillOption {
  value: string;
  label: string;
}

interface PillGroupProps {
  id: string;
  legend: string;
  options: PillOption[];
  selected: string[];
  onToggle: (value: string) => void;
}

function PillGroup({ id, legend, options, selected, onToggle }: PillGroupProps) {
  return (
    <fieldset className="flex flex-col gap-2" data-slot="pill-group" data-label={legend}>
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
        data-slot="pill-group-content"
      >
        {options.map((option) => {
          const active = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              data-slot="filter-pill"
              data-state={active ? "active" : "inactive"}
              data-value={option.value}
              onClick={() => onToggle(option.value)}
              className={cn(
                "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                "data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm",
                "data-[state=inactive]:border-input data-[state=inactive]:bg-background data-[state=inactive]:text-foreground hover:data-[state=inactive]:bg-accent hover:data-[state=inactive]:text-accent-foreground",
              )}
            >
              <span
                aria-hidden="true"
                data-slot="filter-pill-dot"
                className={cn("h-2 w-2 rounded-full", active ? "bg-current" : dotFor(option.label ?? ""))}
              />
              {option.label}
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
  derived: ScheduleDerived;
  resultCount: number;
  onSearchChange: (query: string) => void;
  /** @deprecated Use onToggleTag instead — kept for backwards compat */
  onToggleAxis?: (axis: string) => void;
  onToggleTag: (tag: string) => void;
  onToggleActivityType: (type: string) => void;
  onToggleVenue: (venueKey: string) => void;
  onToggleBuilding: (building: string) => void;
  onClear: () => void;
}

export function FilterPanel({
  filters,
  derived,
  resultCount,
  onSearchChange,
  onToggleAxis: _onToggleAxis,
  onToggleTag,
  onToggleActivityType,
  onToggleVenue,
  onToggleBuilding,
  onClear,
}: FilterPanelProps) {
  void _onToggleAxis;
  return (
    <section
      aria-label="Filtros del programa"
      className="flex flex-col gap-5 rounded-xl border bg-card p-4 text-card-foreground shadow-sm sm:p-5"
    >
      {/* Search */}
      <div className="relative">
        <Label htmlFor="schedule-search" className="sr-only">
          Buscar sesiones
        </Label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id="schedule-search"
          type="search"
          placeholder="Buscar por título, ponente, autor o institución…"
          value={filters.searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
          autoComplete="off"
        />
      </div>

      <Separator />

      {/* Composable TagGroup — building-components skill: composition, data-attributes, a11y */}
      <div className="flex flex-col gap-2" data-slot="filter-tag-group">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Etiquetas
        </span>
        <TagGroup label="Etiquetas">
          {derived.tags.map((tag) => (
            <Tag
              key={tag}
              value={tag}
              selected={filters.tags.includes(tag)}
              onTagToggle={onToggleTag}
              aria-label={`${filters.tags.includes(tag) ? "Quitar filtro" : "Filtrar por etiqueta"} ${tag}`}
              data-slot="filter-tag"
              className="min-h-9 px-3 py-1.5 text-sm"
            />
          ))}
        </TagGroup>
      </div>

      <PillGroup
        id="activity-filter"
        legend="Tipo de actividad"
        options={derived.activityTypes.map((type) => ({ value: type, label: type }))}
        selected={filters.activityTypes}
        onToggle={onToggleActivityType}
      />

      <PillGroup
        id="venue-filter"
        legend="Sala / Lugar"
        options={derived.venues.map((venue) => ({
          value: venue.key,
          label: venue.label,
        }))}
        selected={filters.venues}
        onToggle={onToggleVenue}
      />

      <PillGroup
        id="building-filter"
        legend="Edificio"
        options={derived.buildings.map((b) => ({ value: b.key, label: b.label }))}
        selected={filters.buildings}
        onToggle={onToggleBuilding}
      />

      <Separator />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          aria-live="polite"
          role="status"
          className="text-sm text-muted-foreground"
        >
          {resultCount} {resultCount === 1 ? "sesión" : "sesiones"} encontradas
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClear}
          className="gap-1.5"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Limpiar filtros
        </Button>
      </div>
    </section>
  );
}