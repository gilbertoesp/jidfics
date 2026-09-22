"use client";

/**
 * useEventDetails — ATOMIC HOOK: URL-driven detail-sheet state.
 *
 * Contract (builder context, en):
 *  - State source of truth is the URL (`?event=<id>`), read once on mount
 *    and validated against known ids (see lib/schedule/eventDetail.ts).
 *  - openDetail/closeDetail use history.replaceState (no router, no
 *    history spam; preserves unrelated params on close).
 *  - detailEvent is derived from id → events lookup; null when closed.
 *
 * Keyboard map: n/a (state only — Escape/close handled by the Sheet).
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  parseEventParam,
  removeEventParam,
  serializeEventParam,
} from "@/lib/schedule/eventDetail";
import type { ConferenceEvent } from "@/lib/schedule/types";

export interface UseEventDetails {
  /** Currently open event (null = closed). */
  detailEvent: ConferenceEvent | null;
  openDetail: (event: ConferenceEvent) => void;
  closeDetail: () => void;
}

export function useEventDetails(events: ConferenceEvent[]): UseEventDetails {
  const knownIds = useMemo(() => events.map((event) => event.id), [events]);
  const [detailId, setDetailId] = useState<string | null>(null);

  // Deep link: read once on mount (client-only), strictly validated.
  useEffect(() => {
    const id = parseEventParam(window.location.search, knownIds);
    if (id) setDetailId(id);
  }, [knownIds]);

  const detailEvent = useMemo(
    () => events.find((event) => event.id === detailId) ?? null,
    [events, detailId],
  );

  const openDetail = useCallback((event: ConferenceEvent) => {
    setDetailId(event.id);
    window.history.replaceState(null, "", serializeEventParam(event.id));
  }, []);

  const closeDetail = useCallback(() => {
    setDetailId(null);
    const remaining = removeEventParam(window.location.search);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${remaining}`,
    );
  }, []);

  return { detailEvent, openDetail, closeDetail };
}
