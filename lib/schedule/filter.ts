import { type ConferenceEvent } from "@/lib/schedule/types";

export interface ScheduleFilters {
  date: string; // YYYY-MM-DD
  searchQuery: string;
  axes: string[];
  activityTypes: string[];
  venues: string[]; // venue keys
}

export const EMPTY_FILTERS: ScheduleFilters = {
  date: "2026-09-23",
  searchQuery: "",
  axes: [],
  activityTypes: [],
  venues: [],
};

function normalize(value: string): string {
  return value.toLocaleLowerCase("es").trim();
}

/** Case-insensitive search across titles, paper titles, speakers, authors, institutions. */
function matchSearch(event: ConferenceEvent, query: string): boolean {
  if (!query) return true;

  const q = normalize(query);
  const haystack = [
    event.title,
    event.venueLabel,
    event.thematicAxis,
    event.activityType,
    ...event.speakers.flatMap((s) => [s.name, s.institution]),
    ...event.papers.flatMap((p) => [
      p.title,
      p.institution,
      ...p.authors,
    ]),
  ];

  return haystack.some((value) => normalize(value).includes(q));
}

/**
 * Multi-facet filter: AND across categories, OR within a category.
 * - date: exact match
 * - axes / activityTypes / venues: empty array = no constraint
 * - searchQuery: substring across title/speakers/authors/institutions
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
    if (venues.length > 0 && !venues.includes(event.venueKey)) return false;
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
  return (
    a.startTime.localeCompare(b.startTime) ||
    a.venueLabel.localeCompare(b.venueLabel)
  );
}