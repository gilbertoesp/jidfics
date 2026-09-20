"use client";

import { useCallback } from "react";
import { CalendarDays, LayoutGrid, Timer, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tag } from "@/components/schedule/Tag";
import { TagGroup } from "@/components/schedule/Tag";
import { EventCard } from "@/components/schedule/EventCard";
import { BuildingTimelines } from "@/components/schedule/BuildingTimelines";
import { FloatingSessionBar } from "@/components/schedule/FloatingSessionBar";
import { LiveChatSheet } from "@/components/schedule/LiveChatSheet";
import { TimeTravelDevPanel } from "@/components/schedule/TimeTravelDevPanel";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useScheduleApp,
  type ScheduleFilters,
} from "@/lib/schedule/hooks";
import type { ConferenceEvent, ConferenceMeta, ScheduleDerived } from "@/lib/schedule/types";

interface ScheduleAppProps {
  events: ConferenceEvent[];
  meta: ConferenceMeta;
  derived: ScheduleDerived;
}

/** Filter section - extracted for readability */
function FilterSection({
  filters,
  derived,
  resultCount,
  onSearchChange,
  onToggleTag,
  onToggleAxis,
  onToggleActivityType,
  onToggleVenue,
  onToggleBuilding,
  onClear,
  hasActive,
}: {
  filters: ScheduleFilters;
  derived: ScheduleDerived;
  resultCount: number;
  onSearchChange: (query: string) => void;
  onToggleTag: (tag: string) => void;
  onToggleAxis: (axis: string) => void;
  onToggleActivityType: (type: string) => void;
  onToggleVenue: (venue: string) => void;
  onToggleBuilding: (building: string) => void;
  onClear: () => void;
  hasActive: boolean;
}) {
  return (
    <section aria-label="Filtros del programa" className="flex flex-col gap-5 rounded-xl border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
      {/* Search */}
      <div className="relative">
        <Label htmlFor="schedule-search" className="sr-only">Buscar sesiones</Label>
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="schedule-search"
          type="search"
          placeholder="Buscar por título, ponente, autor o institución…"
          value={filters.searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
          autoComplete="off"
          autoFocus
        />
      </div>

      <Separator />

      {/* Tags - using TagGroup */}
      <div className="flex flex-col gap-2" data-slot="filter-tag-group">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Etiquetas</span>
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

      {/* Activity Types */}
      <TagGroup label="Ejes temáticos">
        {derived.axes.map((axis) => (
          <Tag
            key={axis}
            value={axis}
            selected={filters.axes.includes(axis)}
            onTagToggle={onToggleAxis}
            aria-label={`${filters.axes.includes(axis) ? "Quitar filtro" : "Filtrar por eje"} ${axis}`}
            data-slot="filter-axis"
            className="min-h-9 px-3 py-1.5 text-sm"
          />
        ))}
      </TagGroup>

      {/* Activity Types */}
      <TagGroup label="Tipo de actividad">
        {derived.activityTypes.map((type) => (
          <Tag
            key={type}
            value={type}
            selected={filters.activityTypes.includes(type)}
            onTagToggle={onToggleActivityType}
            aria-label={`${filters.activityTypes.includes(type) ? "Quitar filtro" : "Filtrar por tipo"} ${type}`}
            data-slot="filter-activity"
            className="min-h-9 px-3 py-1.5 text-sm"
          />
        ))}
      </TagGroup>

      {/* Venues */}
      <TagGroup label="Sala / Lugar">
        {derived.venues.map((venue) => (
          <Tag
            key={venue.key}
            value={venue.key}
            selected={filters.venues.includes(venue.key)}
            onTagToggle={onToggleVenue}
            aria-label={`${filters.venues.includes(venue.key) ? "Quitar filtro" : "Filtrar por sala"} ${venue.label}`}
            data-slot="filter-venue"
            className="min-h-9 px-3 py-1.5 text-sm"
          >
            {venue.label}
          </Tag>
        ))}
      </TagGroup>

      {/* Buildings */}
      <TagGroup label="Edificio">
        {derived.buildings.map((building) => (
          <Tag
            key={building.key}
            value={building.key}
            selected={filters.buildings.includes(building.key)}
            onTagToggle={onToggleBuilding}
            aria-label={`${filters.buildings.includes(building.key) ? "Quitar filtro" : "Filtrar por edificio"} ${building.label}`}
            data-slot="filter-building"
            className="min-h-9 px-3 py-1.5 text-sm"
          >
            {building.label}
          </Tag>
        ))}
      </TagGroup>

      <Separator />

      {/* Results count + Clear */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" role="status" className="text-sm text-muted-foreground">
          {resultCount} {resultCount === 1 ? "sesión" : "sesiones"} encontradas
        </p>
        <Button type="button" variant="outline" size="sm" onClick={onClear} className="gap-1.5" disabled={!hasActive}>
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Limpiar filtros
        </Button>
      </div>
    </section>
  );
}

/** Active Filters Bar */
function ActiveFiltersBar({
  tags,
  axes,
  buildings,
  venues,
  activityTypes,
  onRemoveTag,
  onRemoveAxis,
  onRemoveBuilding,
  onRemoveVenue,
  onRemoveActivityType,
  onClearAll,
  resultCount,
}: {
  tags: string[];
  axes: string[];
  buildings: string[];
  venues: string[];
  activityTypes: string[];
  onRemoveTag: (tag: string) => void;
  onRemoveAxis: (axis: string) => void;
  onRemoveBuilding: (building: string) => void;
  onRemoveVenue: (venue: string) => void;
  onRemoveActivityType: (type: string) => void;
  onClearAll: () => void;
  resultCount: number;
}) {
  const hasActive = tags.length + axes.length + buildings.length + venues.length + activityTypes.length > 0;

  if (!hasActive) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="flex flex-wrap items-center gap-3 rounded-xl border bg-muted/50 p-3 text-sm"
      data-slot="active-filters-bar"
    >
      <span className="font-medium text-muted-foreground">Filtros activos:</span>
      
      <div className="flex flex-wrap gap-2" data-slot="active-tags">
        {tags.map((tag) => (
          <Tag
            key={tag}
            value={tag}
            selected
            removable
            onTagToggle={onRemoveTag}
            onRemove={onRemoveTag}
            aria-label={`Quitar filtro de etiqueta ${tag}`}
            data-slot="active-tag"
            className="bg-primary/10 border-primary text-primary"
          />
        ))}
        {axes.map((axis) => (
          <Tag
            key={axis}
            value={axis}
            selected
            removable
            onTagToggle={onRemoveAxis}
            onRemove={onRemoveAxis}
            aria-label={`Quitar filtro de eje ${axis}`}
            data-slot="active-axis"
            className="bg-purple/10 border-purple text-purple"
          />
        ))}
        {buildings.map((b) => (
          <Tag
            key={b}
            value={b}
            selected
            removable
            onTagToggle={onRemoveBuilding}
            onRemove={onRemoveBuilding}
            aria-label={`Quitar filtro de edificio ${b}`}
            data-slot="active-building"
            className="bg-blue/10 border-blue text-blue"
          />
        ))}
        {venues.map((v) => (
          <Tag
            key={v}
            value={v}
            selected
            removable
            onTagToggle={onRemoveVenue}
            onRemove={onRemoveVenue}
            aria-label={`Quitar filtro de sala ${v}`}
            data-slot="active-venue"
            className="bg-green/10 border-green text-green"
          />
        ))}
        {activityTypes.map((t) => (
          <Tag
            key={t}
            value={t}
            selected
            removable
            onTagToggle={onRemoveActivityType}
            onRemove={onRemoveActivityType}
            aria-label={`Quitar filtro de tipo ${t}`}
            data-slot="active-activity"
            className="bg-amber/10 border-amber text-amber"
          />
        ))}
      </div>

      <div className="flex-1" />
      
      <span className="text-xs text-muted-foreground">
        {resultCount} {resultCount === 1 ? "sesión" : "sesiones"}
      </span>
      
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        aria-label="Limpiar todos los filtros"
        className="gap-1 h-8"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">Limpiar todo</span>
      </Button>
    </div>
  );
}

/** View Switcher */
function ViewSwitcher({ view, onViewChange }: { view: "grid" | "timeline"; onViewChange: (view: "grid" | "timeline") => void }) {
  return (
    <div role="group" aria-label="Cambiar vista del programa" className="inline-flex items-center gap-1 rounded-lg bg-muted p-1">
      <Button
        type="button"
        size="sm"
        variant={view === "grid" ? "default" : "ghost"}
        aria-pressed={view === "grid"}
        onClick={() => onViewChange("grid")}
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
        onClick={() => onViewChange("timeline")}
        className="gap-1.5"
      >
        <Timer className="h-4 w-4" aria-hidden="true" />
        Timeline
      </Button>
    </div>
  );
}

/** Date Switcher */
function DateSwitcher({ 
  days, 
  selectedDate, 
  onDateChange 
}: { 
  days: { date: string; dayName: string }[];
  selectedDate: string;
  onDateChange: (date: string) => void;
}) {
  return (
    <Tabs value={selectedDate} onValueChange={onDateChange}>
      <TabsList className="grid w-full grid-cols-2 sm:w-auto" role="tablist" aria-label="Seleccionar día">
        {days.map((day) => (
          <TabsTrigger 
            key={day.date} 
            value={day.date} 
            className="gap-2"
            role="tab"
          >
            <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span>{day.dayName} {day.date.slice(8)}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

/** Main ScheduleApp Component */
export function ScheduleApp({ events, meta, derived }: ScheduleAppProps) {
  const {
    filters,
    view,
    chatEvent,
    barDismissed,
    activeDay,
    filteredEvents,
    clearFilters,
    toggleTag,
    toggleAxis,
    toggleBuilding,
    toggleVenue,
    toggleActivityType,
    setDate,
    setSearchQuery,
    setView,
    openChat,
    closeChat,
    dismissBar,
    scrollToEvent,
    liveByHall,
    upNextByHall,
    currentTime,
    isTimeTravel,
    isWithinConferenceDates,
    setTimeTravel,
    advanceMinutes,
    getLiveStatus,
    hasActiveFilters,
  } = useScheduleApp(events, meta);

  // Handle search input with debounced suggestions
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    // Could add debounced suggestions here
  }, [setSearchQuery]);

  // Handle tag click from EventCard/BuildingTimeline
  const handleTagClick = useCallback((tag: string) => {
    toggleTag(tag);
  }, [toggleTag]);

  // Render event grid
  const renderGrid = () => (
    <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2" role="list" aria-label={`Sesiones del ${activeDay?.dayName || "día"}`}>
      {filteredEvents.map((event) => (
        <li key={event.id} id={event.id} className="h-full">
          <EventCard
            event={event}
            onOpenChat={openChat}
            liveStatus={getLiveStatus(event)}
            onTagClick={handleTagClick}
            selectedTags={filters.tags}
          />
        </li>
      ))}
    </ul>
  );

  // Render timeline view
  const renderTimeline = () => (
    <div className="flex flex-col gap-4" role="region" aria-label="Timeline por edificio">
      <p className="text-sm text-muted-foreground">
        Vista cronológica por edificio — haz clic en cualquier etiqueta para filtrar
      </p>
      <BuildingTimelines
        events={filteredEvents}
        derived={derived}
        getLiveStatus={getLiveStatus}
        onTagClick={handleTagClick}
        selectedTags={filters.tags}
      />
    </div>
  );

  // Empty state
  const renderEmpty = () => (
    <div
      role="status"
      className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground"
      aria-live="polite"
    >
      {hasActiveFilters
        ? "No hay sesiones que coincidan con los filtros actuales. Intenta eliminar algún filtro."
        : "No hay sesiones programadas para este día."}
    </div>
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 pb-24">
      {/* Header: Date + View Switcher */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <DateSwitcher days={meta.days} selectedDate={filters.date} onDateChange={setDate} />
        <ViewSwitcher view={view} onViewChange={setView} />
      </div>

      {/* Filters */}
      <FilterSection
        filters={filters}
        derived={derived}
        resultCount={filteredEvents.length}
        onSearchChange={handleSearchChange}
        onToggleTag={toggleTag}
        onToggleAxis={toggleAxis}
        onToggleActivityType={toggleActivityType}
        onToggleVenue={toggleVenue}
        onToggleBuilding={toggleBuilding}
        onClear={clearFilters}
        hasActive={hasActiveFilters}
      />

      {/* Active Filters Bar */}
      <ActiveFiltersBar
        tags={filters.tags}
        axes={filters.axes}
        buildings={filters.buildings}
        venues={filters.venues}
        activityTypes={filters.activityTypes}
        onRemoveTag={toggleTag}
        onRemoveAxis={toggleAxis}
        onRemoveBuilding={toggleBuilding}
        onRemoveVenue={toggleVenue}
        onRemoveActivityType={toggleActivityType}
        onClearAll={clearFilters}
        resultCount={filteredEvents.length}
      />

      {/* Results */}
      <section aria-label={`Sesiones del ${activeDay?.dayName || "día"}`}>
        {filteredEvents.length === 0 ? renderEmpty() : view === "grid" ? renderGrid() : renderTimeline()}
      </section>

      {/* Live Chat Sheet */}
      <LiveChatSheet event={chatEvent} onOpenChange={closeChat} />

      {/* Floating Session Bar */}
      {!barDismissed && (
        <FloatingSessionBar
          liveByHall={liveByHall}
          upNextByHall={upNextByHall}
          onScrollToEvent={scrollToEvent}
          onDismiss={dismissBar}
        />
      )}

      {/* Time Travel Dev Panel */}
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