"use client";

import {
  addMinutes,
  differenceInMinutes,
  endOfDay,
  isAfter,
  isBefore,
  parse,
  startOfDay,
} from "date-fns";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ConferenceEvent } from "@/lib/schedule/types";

const CONFERENCE_START = "2026-09-23";
const CONFERENCE_END = "2026-09-24";
const TICK_INTERVAL_MS = 10_000;
const UP_NEXT_WINDOW_MIN = 30;

// Pre-parsed conference boundaries (module level, no new Date() at render time)
const CONFERENCE_START_DATE = parse(
  CONFERENCE_START,
  "yyyy-MM-dd",
  new Date(0),
);
const CONFERENCE_END_DATE = parse(CONFERENCE_END, "yyyy-MM-dd", new Date(0));
const CONFERENCE_START_DAY = startOfDay(CONFERENCE_START_DATE);
const CONFERENCE_END_DAY = endOfDay(CONFERENCE_END_DATE);

/** Parse "YYYY-MM-DD" + "HH:mm" into a Date in local timezone. */
function parseEventTime(date: string, time: string): Date {
  return parse(`${date}T${time}`, "yyyy-MM-dd'T'HH:mm", new Date(0));
}

/** Check if a date falls within conference dates (inclusive). */
function isWithinConference(date: Date): boolean {
  return (
    !isBefore(date, CONFERENCE_START_DAY) && !isAfter(date, CONFERENCE_END_DAY)
  );
}

/** Compute live/up-next status for a single event at a given time. */
function computeEventStatus(
  event: ConferenceEvent,
  now: Date,
): "live" | "up-next" | "idle" {
  const start = parseEventTime(event.date, event.startTime);
  const end = parseEventTime(event.date, event.endTime);

  if (!isBefore(now, start) && isBefore(now, end)) {
    return "live";
  }
  const diff = differenceInMinutes(start, now);
  if (diff > 0 && diff <= UP_NEXT_WINDOW_MIN) {
    return "up-next";
  }
  return "idle";
}

/** Group events by hall (Sala 1-4 = Halls 1-4, others = "Otras"). */
function getHallLabel(venueKey: string): string {
  if (venueKey.startsWith("sala-1")) return "Hall 1";
  if (venueKey.startsWith("sala-2")) return "Hall 2";
  if (venueKey.startsWith("sala-3")) return "Hall 3";
  if (venueKey.startsWith("sala-4")) return "Hall 4";
  return "Otras";
}

export interface UseCurrentSessionOptions {
  events: ConferenceEvent[];
  initialTime?: Date;
  tickIntervalMs?: number;
  enabled?: boolean;
}

export interface UseCurrentSessionReturn {
  liveNow: ConferenceEvent[];
  upNext: ConferenceEvent[];
  liveByHall: Record<string, ConferenceEvent[]>;
  upNextByHall: Record<string, ConferenceEvent[]>;
  currentTime: Date | null;
  isTimeTravel: boolean;
  isWithinConferenceDates: boolean;
  setTimeTravel: (date: Date | null) => void;
  advanceMinutes: (min: number) => void;
  jumpToEvent: (eventId: string) => void;
}

export function useCurrentSession({
  events,
  initialTime,
  tickIntervalMs = TICK_INTERVAL_MS,
  enabled = true,
}: UseCurrentSessionOptions): UseCurrentSessionReturn {
  const [timeTravelTime, setTimeTravelTime] = useState<Date | null>(
    initialTime ?? null,
  );
  const [now, setNow] = useState<Date | null>(null);

  const isTimeTravel = timeTravelTime !== null;
  const effectiveTime = isTimeTravel ? timeTravelTime : now;

  const isWithinConferenceDates = useMemo(
    () => (effectiveTime ? isWithinConference(effectiveTime) : false),
    [effectiveTime],
  );

  // Initialize current time on mount (client-side only)
  useEffect(() => {
    setNow(new Date());
  }, []);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initializedRef = useRef(false);

  // Tick effect - updates real time every interval when not in time-travel mode
  useEffect(() => {
    if (!enabled || isTimeTravel) {
      // Cleanup if we entered time-travel or disabled
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return;
    }

    // Mark as initialized after first render
    if (!initializedRef.current) {
      initializedRef.current = true;
      setNow(new Date());
    }

    const tick = () => setNow(new Date());
    tick();
    tickRef.current = setInterval(tick, tickIntervalMs);
    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [enabled, isTimeTravel, tickIntervalMs]);

  // Sync now to timeTravelTime when entering time-travel mode
  useEffect(() => {
    if (isTimeTravel && timeTravelTime) {
      setNow(timeTravelTime);
    }
  }, [isTimeTravel, timeTravelTime]);

  const liveNow = useMemo(() => {
    if (!isWithinConferenceDates || !effectiveTime) return [];
    return events.filter(
      (e) => computeEventStatus(e, effectiveTime) === "live",
    );
  }, [events, effectiveTime, isWithinConferenceDates]);

  const upNext = useMemo(() => {
    if (!isWithinConferenceDates || !effectiveTime) return [];
    return events.filter(
      (e) => computeEventStatus(e, effectiveTime) === "up-next",
    );
  }, [events, effectiveTime, isWithinConferenceDates]);

  const liveByHall = useMemo(() => {
    const map: Record<string, ConferenceEvent[]> = {};
    for (const e of liveNow) {
      const hall = getHallLabel(e.venueKey);
      if (!map[hall]) {
        map[hall] = [];
      }
      map[hall].push(e);
    }
    return map;
  }, [liveNow]);

  const upNextByHall = useMemo(() => {
    const map: Record<string, ConferenceEvent[]> = {};
    for (const e of upNext) {
      const hall = getHallLabel(e.venueKey);
      if (!map[hall]) {
        map[hall] = [];
      }
      map[hall].push(e);
    }
    return map;
  }, [upNext]);

  const setTimeTravel = useCallback((date: Date | null) => {
    setTimeTravelTime(date);
  }, []);

  // Only advances time when in time-travel mode
  const advanceMinutes = useCallback(
    (min: number) => {
      if (!isTimeTravel || !timeTravelTime) {
        // In real-time mode, advanceMinutes is a no-op
        // Could optionally throw or warn in development
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "[useCurrentSession] advanceMinutes called but not in time-travel mode",
          );
        }
        return;
      }
      const next = addMinutes(timeTravelTime, min);
      setTimeTravelTime(next);
    },
    [isTimeTravel, timeTravelTime],
  );

  // Only jumps to event when in time-travel mode
  const jumpToEvent = useCallback(
    (eventId: string) => {
      if (!isTimeTravel) {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "[useCurrentSession] jumpToEvent called but not in time-travel mode",
          );
        }
        return;
      }
      const event = events.find((e) => e.id === eventId);
      if (!event) return;
      const target = parseEventTime(event.date, event.startTime);
      setTimeTravelTime(target);
    },
    [events, isTimeTravel],
  );

  return {
    liveNow,
    upNext,
    liveByHall,
    upNextByHall,
    currentTime: effectiveTime,
    isTimeTravel,
    isWithinConferenceDates,
    setTimeTravel,
    advanceMinutes,
    jumpToEvent,
  };
}
