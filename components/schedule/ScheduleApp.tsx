"use client";

import {
  CalendarDays,
  ChevronLeft,
  Filter,
  LayoutGrid,
  Timer,
  X,
} from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { BuildingTimelines } from "@/components/schedule/BuildingTimelines";
import { EventCard } from "@/components/schedule/EventCard";
import { EventDetailSheet } from "@/components/schedule/EventDetailSheet";
import { FloatingSessionBar } from "@/components/schedule/FloatingSessionBar";
import { FilterSidebar } from "@/components/schedule/filter/FilterSidebar";
import { LiveChatSheet } from "@/components/schedule/LiveChatSheet";
import { Tag } from "@/components/schedule/Tag";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { findRelatedEvents } from "@/lib/schedule/eventDetail";
import { useScheduleApp } from "@/lib/schedule/hooks";
import { clearCategory } from "@/lib/schedule/tags";
import type {
  ConferenceEvent,
  ConferenceMeta,
  ScheduleDerived,
  TagCategory,
} from "@/lib/schedule/types";
import { cn } from "@/lib/utils";

interface ScheduleAppProps {
  events: ConferenceEvent[];
  meta: ConferenceMeta;
  derived: ScheduleDerived;
}

/** Active Filters Bar */
function ActiveFiltersBar({
  tags,
  buildings,
  venues,
  activityTypes,
  onRemoveTag,
  onRemoveBuilding,
  onRemoveVenue,
  onRemoveActivityType,
  onClearAll,
  resultCount,
}: {
  tags: string[];
  buildings: string[];
  venues: string[];
  activityTypes: string[];
  onRemoveTag: (tag: string) => void;
  onRemoveBuilding: (building: string) => void;
  onRemoveVenue: (venue: string) => void;
  onRemoveActivityType: (type: string) => void;
  onClearAll: () => void;
  resultCount: number;
}) {
  const hasActive =
    tags.length + buildings.length + venues.length + activityTypes.length > 0;

  if (!hasActive) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="flex flex-wrap items-center gap-3 rounded-xl border bg-muted/50 p-3 text-sm"
      data-slot="active-filters-bar"
    >
      <span className="font-medium text-muted-foreground">
        Filtros activos:
      </span>

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
function ViewSwitcher({
  view,
  onViewChange,
}: {
  view: "grid" | "timeline";
  onViewChange: (view: "grid" | "timeline") => void;
}) {
  return (
    <fieldset
      aria-label="Cambiar vista del programa"
      className="inline-flex items-center gap-1 rounded-lg bg-muted p-1"
    >
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
    </fieldset>
  );
}

/** Date Switcher */
function DateSwitcher({
  days,
  selectedDate,
  onDateChange,
}: {
  days: { date: string; dayName: string }[];
  selectedDate: string;
  onDateChange: (date: string) => void;
}) {
  return (
    <Tabs value={selectedDate} onValueChange={onDateChange}>
      <TabsList
        className="grid w-full grid-cols-2 sm:w-auto"
        role="tablist"
        aria-label="Seleccionar día"
      >
        {days.map((day) => (
          <TabsTrigger
            key={day.date}
            value={day.date}
            className="gap-2"
            role="tab"
          >
            <CalendarDays
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <span>
              {day.dayName} {day.date.slice(8)}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

/** Mobile Sidebar Trigger */
const MobileSidebarTrigger = React.forwardRef<
  HTMLButtonElement,
  { onOpen: () => void }
>(({ onOpen }, ref) => {
  return (
    <Button
      ref={ref}
      type="button"
      variant="outline"
      size="icon"
      onClick={onOpen}
      aria-label="Abrir filtros"
      className="lg:hidden"
    >
      <Filter className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">Abrir filtros</span>
    </Button>
  );
});
MobileSidebarTrigger.displayName = "MobileSidebarTrigger";

/** Mobile Sidebar - simple fixed position overlay with focus trap */
function MobileSidebar({
  isOpen,
  onClose,
  children,
  triggerRef,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
}) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Focus trap effect
  // biome-ignore lint/correctness/useExhaustiveDependencies: triggerRef.current read once at effect start — refs must not be reactive deps
  useEffect(() => {
    if (!isOpen || !sidebarRef.current) return;

    // Capture trigger ref at effect start to avoid stale closure
    const trigger = triggerRef?.current;

    // Store previously focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Focus first focusable element in sidebar
    const focusableElements = Array.from(
      sidebarRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    // Handle Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      // Trap Tab key
      if (e.key === "Tab") {
        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden"; // Prevent background scroll

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      // Restore focus to trigger button
      if (
        previousActiveElement.current &&
        previousActiveElement.current !== document.body
      ) {
        previousActiveElement.current.focus();
      } else if (trigger) {
        trigger.focus();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50 animate-in fade-in-0 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Sidebar panel */}
      <aside
        ref={sidebarRef}
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-full max-w-sm bg-background border-r shadow-xl lg:hidden",
          isOpen ? "animate-slide-in-from-left" : "animate-slide-out-to-left",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Filtros"
      >
        <div className="flex flex-col h-full">
          {/* Header with close button */}
          <div className="flex items-center justify-between border-b p-4">
            <div>
              <h2 className="text-base font-semibold">Filtros</h2>
              <p className="text-xs text-muted-foreground">
                Busca y filtra sesiones por etiquetas, tipo, sala o edificio
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Cerrar filtros"
              className="p-1"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">{children}</div>
        </div>
      </aside>
    </>
  );
}

/** Main ScheduleApp Component */
export function ScheduleApp({ events, meta, derived }: ScheduleAppProps) {
  const {
    filters,
    setFilters,
    view,
    chatEvent,
    detailEvent,
    openDetail,
    closeDetail,
    barDismissed,
    activeDay,
    filteredEvents,
    clearFilters,
    toggleTag,
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
    getLiveStatus,
    hasActiveFilters,
  } = useScheduleApp(events, meta);

  // Mobile sidebar state - only used on mobile (< lg)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Ref for mobile sidebar trigger button (focus restoration)
  const mobileSidebarTriggerRef = useRef<HTMLButtonElement>(null);

  // Handle search input with debounced suggestions
  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);
    },
    [setSearchQuery],
  );

  // Handle tag click from EventCard/BuildingTimeline
  const handleTagClick = useCallback(
    (tag: string) => {
      toggleTag(tag);
    },
    [toggleTag],
  );

  // Related sessions for the open detail sheet (pure ranking, same day)
  const relatedEvents = useMemo(
    () => (detailEvent ? findRelatedEvents(events, detailEvent) : []),
    [events, detailEvent],
  );

  // Per-category clear (pure reducer from lib/schedule/tags.ts)
  const handleClearCategory = useCallback(
    (category: TagCategory) => {
      setFilters((prev) => clearCategory(category, prev));
    },
    [setFilters],
  );

  // Single sidebar definition shared by desktop (persistent) and mobile (overlay)
  const sidebar = (
    <FilterSidebar
      filters={filters}
      derived={derived}
      resultCount={filteredEvents.length}
      onSearchChange={handleSearchChange}
      onToggleTag={toggleTag}
      onToggleActivityType={toggleActivityType}
      onToggleVenue={toggleVenue}
      onToggleBuilding={toggleBuilding}
      onClear={clearFilters}
      onClearCategory={handleClearCategory}
    />
  );

  // Render event grid
  const renderGrid = () => (
    <ul
      className="grid grid-cols-1 gap-4 lg:grid-cols-2"
      aria-label={`Sesiones del ${activeDay?.dayName || "día"}`}
    >
      {filteredEvents.map((event) => (
        <li key={event.id} id={event.id} className="h-full">
          <EventCard
            event={event}
            onOpenChat={openChat}
            onOpenDetail={openDetail}
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
    <section className="flex flex-col gap-4" aria-label="Timeline por edificio">
      <p className="text-sm text-muted-foreground">
        Vista cronológica por edificio — haz clic en cualquier etiqueta para
        filtrar
      </p>
      <BuildingTimelines
        events={filteredEvents}
        derived={derived}
        getLiveStatus={getLiveStatus}
        onTagClick={handleTagClick}
        selectedTags={filters.tags}
      />
    </section>
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
      {/* Header: Date + View Switcher + Mobile Sidebar Trigger */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <DateSwitcher
          days={meta.days}
          selectedDate={filters.date}
          onDateChange={setDate}
        />
        <div className="flex items-center gap-2">
          <ViewSwitcher view={view} onViewChange={setView} />
          <MobileSidebarTrigger
            ref={mobileSidebarTriggerRef}
            onOpen={() => setMobileSidebarOpen(true)}
          />
        </div>
      </div>

      {/* Main content area: sidebar (desktop) + results */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Desktop Sidebar - always visible on lg+ */}
        <aside className="hidden lg:block lg:w-80 flex-shrink-0">
          {sidebar}
        </aside>

        {/* Mobile Sidebar - simple fixed overlay */}
        <MobileSidebar
          triggerRef={mobileSidebarTriggerRef}
          isOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
        >
          {sidebar}
        </MobileSidebar>

        {/* Results */}
        <main className="flex-1 min-w-0">
          {/* Active Filters Bar - always visible above results */}
          <ActiveFiltersBar
            tags={filters.tags}
            buildings={filters.buildings}
            venues={filters.venues}
            activityTypes={filters.activityTypes}
            onRemoveTag={toggleTag}
            onRemoveBuilding={toggleBuilding}
            onRemoveVenue={toggleVenue}
            onRemoveActivityType={toggleActivityType}
            onClearAll={clearFilters}
            resultCount={filteredEvents.length}
          />

          {/* Results */}
          <section aria-label={`Sesiones del ${activeDay?.dayName || "día"}`}>
            {filteredEvents.length === 0
              ? renderEmpty()
              : view === "grid"
                ? renderGrid()
                : renderTimeline()}
          </section>
        </main>
      </div>

      {/* Event Detail Sheet (URL-synced: ?event=<id>) */}
      <EventDetailSheet
        event={detailEvent}
        related={relatedEvents}
        selectedTags={filters.tags}
        onOpenChange={(open) => {
          if (!open) closeDetail();
        }}
        onTagClick={handleTagClick}
        onOpenRelated={openDetail}
      />

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
    </div>
  );
}
