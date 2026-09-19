import {
  type ActivityType,
  type ConferenceDate,
  type ConferenceEvent,
  type ThematicAxis,
  type VenueId,
} from "@/lib/schedule/types";

export interface ScheduleFilters {
  date: ConferenceDate;
  searchQuery: string;
  axes: ThematicAxis[];
  activityTypes: ActivityType[];
  venues: VenueId[];
}

export const EMPTY_FILTERS: ScheduleFilters = {
  date: "2026-09-23",
  searchQuery: "",
  axes: [],
  activityTypes: [],
  venues: [],
};

function normalize(value: string): string {
  return value.toLocaleLowerCase().trim();
}

/** Case-insensitive search across title, speakers, authors, and institutions. */
function matchSearch(event: ConferenceEvent, query: string): boolean {
  if (!query) return true;

  const q = normalize(query);
  const haystack = [
    event.title,
    event.venueLabel,
    event.abstract,
    ...event.speakers.flatMap((s) => [s.name, s.institution]),
    ...event.authors.flatMap((a) => [a.name, a.institution]),
  ];

  return haystack.some((value) => normalize(value).includes(q));
}

/**
 * Multi-facet filter with AND across categories and OR within a category.
 * - date: exact match
 * - axes / activityTypes / venues: empty array = no constraint (show all)
 * - searchQuery: substring match (see matchSearch)
 */
export function filterEvents(
  events: ConferenceEvent[],
  filters: ScheduleFilters,
): ConferenceEvent[] {
  const { date, axes, activityTypes, venues } = filters;

  return events.filter((event) => {
    if (event.date !== date) return false;
    if (!matchSearch(event, filters.searchQuery)) return false;
    if (axes.length > 0 && !axes.includes(event.thematicAxis)) return false;
    if (activityTypes.length > 0 && !activityTypes.includes(event.activityType))
      return false;
    if (venues.length > 0 && !venues.includes(event.venueId)) return false;
    return true;
  });
}

export function hasActiveFilters(filters: ScheduleFilters): boolean {
  return (
    filters.searchQuery.trim() !== "" ||
    filters.axes.length > 0 ||
    filters.activityTypes.length > 0 ||
    filters.venues.length > 0
  );
}

export function scheduleSorter(a: ConferenceEvent, b: ConferenceEvent): number {
  return a.startTime.localeCompare(b.startTime) || a.venueId.localeCompare(b.venueId);
}