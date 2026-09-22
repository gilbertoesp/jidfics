/**
 * Event detail utilities — pure, side-effect free (no window/router access).
 *
 * Contract (builder context, en):
 *  - Deep link: `?event=<id>` — parseEventParam validates STRICTLY against
 *    knownIds (unknown/junk → null); never trust the query string.
 *  - removeEventParam strips only `event`, preserving other params (close path).
 *  - Related sessions: same date only, ranked by
 *    same start time (4) + same venue (2) + same thematic axis (1),
 *    score 0 excluded, ties broken chronologically, capped by `limit`.
 *  - buildShareUrl produces a canonical URL via URL/URLSearchParams (encoding safe).
 *
 * Keyboard map: none (utility — non-visual).
 * Consumed by: lib/schedule/hooks/useEventDetails.ts, EventDetailSheet.
 */

import { scheduleSorter } from "@/lib/schedule/filter";
import type { ConferenceEvent } from "@/lib/schedule/types";

/** Extract the validated event id from a query string ("?a=1&event=x"). */
export function parseEventParam(
  search: string | null | undefined,
  knownIds: readonly string[],
): string | null {
  if (!search) return null;
  const query = search.startsWith("?") ? search.slice(1) : search;
  const raw = new URLSearchParams(query).get("event");
  if (!raw) return null;
  return knownIds.includes(raw) ? raw : null;
}

/** Serialize an id into its query-string form (encoding-safe). */
export function serializeEventParam(id: string): string {
  return `?event=${encodeURIComponent(id)}`;
}

/** Remove only the `event` param; "" when nothing remains. */
export function removeEventParam(search: string | null | undefined): string {
  if (!search) return "";
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  params.delete("event");
  const remaining = params.toString();
  return remaining ? `?${remaining}` : "";
}

/** Canonical shareable URL for a session (used by "Copiar enlace"). */
export function buildShareUrl(base: string, id: string): string {
  const url = new URL(base);
  url.searchParams.set("event", id);
  return url.toString();
}

const WEIGHT_SAME_TIME = 4;
const WEIGHT_SAME_VENUE = 2;
const WEIGHT_SAME_AXIS = 1;

/** Related sessions: same day, scored time > venue > axis, chronologically tie-broken. */
export function findRelatedEvents(
  events: readonly ConferenceEvent[],
  event: ConferenceEvent,
  limit = 4,
): ConferenceEvent[] {
  return events
    .filter((candidate) => candidate.id !== event.id && candidate.date === event.date)
    .map((candidate) => {
      let score = 0;
      if (candidate.startTime === event.startTime) score += WEIGHT_SAME_TIME;
      if (candidate.venueKey === event.venueKey) score += WEIGHT_SAME_VENUE;
      if (candidate.thematicAxis === event.thematicAxis) score += WEIGHT_SAME_AXIS;
      return { candidate, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || scheduleSorter(a.candidate, b.candidate))
    .slice(0, limit)
    .map((row) => row.candidate);
}
