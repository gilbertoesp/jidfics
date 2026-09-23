"use client";

import { Clock, MapPin } from "lucide-react";
import { useMemo } from "react";

import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@/components/reui/timeline";
import type { LiveStatus } from "@/components/schedule/LiveIndicatorBadge";
import { Tag } from "@/components/schedule/Tag";
import { Badge } from "@/components/ui/badge";
import { colorFor } from "@/lib/schedule/colors";
import { scheduleSorter } from "@/lib/schedule/filter";
import type { ConferenceEvent } from "@/lib/schedule/types";
import { cn } from "@/lib/utils";

export interface EventTimelineProps {
  /** Already sidebar-filtered events — the timeline itself filters nothing. */
  events: ConferenceEvent[];
  getLiveStatus?: (event: ConferenceEvent) => LiveStatus;
  onTagClick?: (tag: string) => void;
  selectedTags?: string[];
}

function indicatorClasses(
  event: ConferenceEvent,
  liveStatus?: LiveStatus,
): string {
  if (liveStatus === "live") {
    return "bg-emerald-500 border-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.18)]";
  }
  if (liveStatus === "up-next") {
    return "bg-amber-400 border-amber-400";
  }
  // idle → colour by activity type via deterministic palette
  return cn(colorFor(event.activityType).dot, "border-transparent");
}

/**
 * Single chronological timeline of all events — replaces the per-building
 * tabbed "location table" (BuildingTimelines).
 * - Sorts a COPY by `date` then `scheduleSorter` (startTime → locationLabel).
 * - Each item shows location label + building code, preserving the location
 *   context the removed building tabs used to carry.
 * - `TimelineIndicator` is coloured by live status (green pulse) or
 *   `colorFor(activityType)`.
 */
export function EventTimeline({
  events,
  getLiveStatus,
  onTagClick,
  selectedTags = [],
}: EventTimelineProps) {
  const sorted = useMemo(
    () =>
      [...events].sort(
        (a, b) => a.date.localeCompare(b.date) || scheduleSorter(a, b),
      ),
    [events],
  );

  // Active step: last live/up-next index + 1, or all completed if none — keeps
  // timeline separators coloured sensibly; fallback shows the whole track.
  // NOTE: hook must be before early return (rules-of-hooks)
  const activeStep = useMemo(() => {
    if (!getLiveStatus) return sorted.length;
    let lastActive = 0;
    sorted.forEach((e, idx) => {
      const s = getLiveStatus(e);
      if (s === "live" || s === "up-next") lastActive = idx + 1;
    });
    return lastActive > 0 ? lastActive : sorted.length;
  }, [sorted, getLiveStatus]);

  if (sorted.length === 0) {
    return (
      <p
        role="status"
        className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground"
      >
        No hay sesiones que coincidan con los filtros actuales.
      </p>
    );
  }

  return (
    <section
      aria-label="Línea de tiempo de sesiones"
      data-slot="event-timeline"
    >
      <Timeline
        orientation="vertical"
        defaultValue={activeStep}
        value={activeStep}
        className="w-full"
      >
        {sorted.map((event, index) => {
          const liveStatus = getLiveStatus?.(event);
          const isLive = liveStatus === "live";
          const isUpNext = liveStatus === "up-next";
          const activityColor = colorFor(event.activityType);

          return (
            <TimelineItem key={event.id} step={index + 1} className="gap-1">
              <TimelineHeader>
                <TimelineSeparator />
                <TimelineDate dateTime={`${event.date}T${event.startTime}`}>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
                    {event.date} {event.startTime}–{event.endTime}
                  </span>
                  {isLive && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                      <span
                        aria-hidden="true"
                        className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500"
                      />
                      En vivo
                    </span>
                  )}
                  {isUpNext && (
                    <span className="ml-2 inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                      Próximo
                    </span>
                  )}
                </TimelineDate>
                <TimelineTitle className="text-sm font-semibold leading-snug text-foreground">
                  {event.title}
                </TimelineTitle>
                <TimelineIndicator
                  className={cn(
                    "flex items-center justify-center",
                    indicatorClasses(event, liveStatus),
                  )}
                >
                  {isLive && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 rounded-full bg-emerald-500 opacity-30 animate-ping"
                    />
                  )}
                </TimelineIndicator>
              </TimelineHeader>

              <TimelineContent className="pt-1">
                <div className="flex flex-col gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                    {event.locationLabel}
                  </span>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        "gap-1.5 border text-[11px]",
                        activityColor.badge,
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          activityColor.dot,
                        )}
                      />
                      {event.activityType}
                    </Badge>
                    {event.tags.map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <Tag
                          key={`${event.id}-${tag}`}
                          value={tag}
                          selected={isSelected}
                          interactive={!!onTagClick}
                          onTagToggle={onTagClick}
                          aria-label={`${isSelected ? "Quitar filtro" : "Filtrar por etiqueta"} ${tag}`}
                          className="text-[11px] px-2 py-0.5"
                          data-slot="timeline-tag"
                        />
                      );
                    })}
                  </div>
                </div>
              </TimelineContent>
            </TimelineItem>
          );
        })}
      </Timeline>
    </section>
  );
}
