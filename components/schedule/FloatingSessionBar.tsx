"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronUp, ChevronDown, X, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConferenceEvent } from "@/lib/schedule/types";

interface FloatingSessionBarProps {
  liveByHall: Record<string, ConferenceEvent[]>;
  upNextByHall: Record<string, ConferenceEvent[]>;
  onScrollToEvent: (eventId: string) => void;
  onDismiss?: () => void;
}

const HALLS = ["Hall 1", "Hall 2", "Hall 3", "Hall 4"] as const;
const OTROS_HALL = "Otras";

function formatTime(date: string, time: string): string {
  return time;
}

function getEventKey(hall: string, event: ConferenceEvent): string {
  return `${hall}-${event.id}`;
}

export function FloatingSessionBar({
  liveByHall,
  upNextByHall,
  onScrollToEvent,
  onDismiss,
}: FloatingSessionBarProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const barRef = useRef<HTMLDivElement>(null);

  const hasLiveEvents = Object.values(liveByHall).some((arr) => arr.length > 0);
  const hasUpNextEvents = Object.values(upNextByHall).some((arr) => arr.length > 0);

  useEffect(() => {
    if (!hasLiveEvents && !hasUpNextEvents) {
      setIsVisible(false);
    } else {
      setIsVisible(true);
    }
  }, [hasLiveEvents, hasUpNextEvents]);

  if (!isVisible) return null;

  const handleScrollTo = (eventId: string) => {
    onScrollToEvent(eventId);
    const element = document.getElementById(eventId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.focus({ preventScroll: true });
    }
  };

  const renderHallSection = (
    hall: string,
    liveEvents: ConferenceEvent[],
    upNextEvents: ConferenceEvent[],
  ) => {
    const allEvents = [...liveEvents, ...upNextEvents];
    if (allEvents.length === 0) return null;

    return (
      <div key={hall} className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {hall}
          </span>
          <span className="text-xs text-muted-foreground/70">
            {liveEvents.length > 0 && (
              <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                <Radio className="h-3 w-3 text-green-500" aria-hidden="true" />
                {liveEvents.length}
              </span>
            )}
            {upNextEvents.length > 0 && (
              <span className="inline-flex items-center gap-1 text-yellow-600 dark:text-yellow-400 ml-2">
                <Radio className="h-3 w-3 text-yellow-500" aria-hidden="true" />
                {upNextEvents.length}
              </span>
            )}
          </span>
        </div>
        <div className="flex flex-col gap-1 px-2 pb-2">
          {liveEvents.map((event) => (
            <button
              key={getEventKey(hall, event)}
              type="button"
              onClick={() => handleScrollTo(event.id)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-left transition-colors",
                "hover:bg-green-50 dark:hover:bg-green-900/20",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500",
              )}
              aria-label={`Ir a ${event.title}, en vivo`}
            >
              <span className="flex h-1.5 w-1.5 rounded-full bg-green-500 animate-ping" aria-hidden="true" />
              <span className="truncate font-medium text-green-800 dark:text-green-200">{event.title}</span>
              <span className="text-green-600 dark:text-green-400 whitespace-nowrap text-[10px]">
                {formatTime(event.date, event.startTime)}
              </span>
            </button>
          ))}
          {upNextEvents.map((event) => (
            <button
              key={getEventKey(hall, event)}
              type="button"
              onClick={() => handleScrollTo(event.id)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-left transition-colors",
                "hover:bg-yellow-50 dark:hover:bg-yellow-900/20",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500",
              )}
              aria-label={`Ir a ${event.title}, proxima a iniciar`}
            >
              <span className="flex h-1.5 w-1.5 rounded-full bg-yellow-500" aria-hidden="true" />
              <span className="truncate font-medium text-yellow-800 dark:text-yellow-200">{event.title}</span>
              <span className="text-yellow-600 dark:text-yellow-400 whitespace-nowrap text-[10px]">
                {formatTime(event.date, event.startTime)}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={barRef}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-5xl border-t bg-background/95 backdrop-blur-sm shadow-lg transition-all duration-300",
        isExpanded ? "pb-0" : "pb-0",
      )}
      role="region"
      aria-label="Sesiones en vivo y proximas"
      aria-live="polite"
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "absolute -top-2 right-4 mx-auto max-w-5xl flex h-8 w-8 items-center justify-center rounded-full bg-background border shadow-lg",
          "hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
        aria-label={isExpanded ? "Contraer barra de sesiones" : "Expandir barra de sesiones"}
        aria-expanded={isExpanded}
      >
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="absolute -top-2 left-4 mx-auto max-w-5xl flex h-8 w-8 items-center justify-center rounded-full bg-background border shadow-lg hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Cerrar barra de sesiones"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      <div className={cn("px-4 py-3 transition-all duration-300 overflow-hidden", isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0")}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {HALLS.map((hall) => renderHallSection(hall, liveByHall[hall] ?? [], upNextByHall[hall] ?? []))}
          {renderHallSection(OTROS_HALL, liveByHall[OTROS_HALL] ?? [], upNextByHall[OTROS_HALL] ?? [])}
        </div>

        {!hasLiveEvents && !hasUpNextEvents && (
          <p className="text-center text-sm text-muted-foreground py-4">
            No hay sesiones en vivo ni proximas en este momento.
          </p>
        )}
      </div>
    </div>
  );
}