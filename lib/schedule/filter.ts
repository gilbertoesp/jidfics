import type { ConferenceEvent } from "@/lib/schedule/types";

export interface ScheduleFilters {
  date: string; // YYYY-MM-DD
  searchQuery: string;
  axes: string[];
  tags: string[];
  activityTypes: string[];
  locations: string[]; // location keys
  buildings: string[];
}

export const EMPTY_FILTERS: ScheduleFilters = {
  date: "2026-09-23",
  searchQuery: "",
  axes: [],
  tags: [],
  activityTypes: [],
  locations: [],
  buildings: [],
};

function normalize(value: string): string {
  return value.toLocaleLowerCase("es").trim();
}

/** Case-insensitive search across titles, paper titles, speakers, authors, institutions, tags, building. */
function matchSearch(event: ConferenceEvent, query: string): boolean {
  if (!query) return true;

  const q = normalize(query);
  const haystack = [
    event.title,
    event.locationLabel,
    event.thematicAxis,
    event.activityType,
    event.building ?? "",
    ...(event.tags ?? []),
    ...event.speakers.flatMap((s) => [s.name, s.institution]),
    ...event.papers.flatMap((p) => [p.title, p.institution, ...p.authors]),
  ];

  return haystack.some((value) => normalize(value).includes(q));
}

/**
 * Multi-facet filter: AND across categories, OR within a category.
 * - date: exact match
 * - axes / tags / activityTypes / locations / buildings: empty array = no constraint
 * - searchQuery: substring across title/speakers/authors/institutions/tags/building
 */
export function filterEvents(
  events: ConferenceEvent[],
  filters: ScheduleFilters,
): ConferenceEvent[] {
  const { date, axes, tags, activityTypes, locations, buildings } = filters;

  return events.filter((event) => {
    if (event.date !== date) return false;
    if (!matchSearch(event, filters.searchQuery)) return false;
    if (axes.length > 0 && !axes.includes(event.thematicAxis)) return false;
    if (tags.length > 0 && !(event.tags ?? []).some((t) => tags.includes(t)))
      return false;
    if (activityTypes.length > 0 && !activityTypes.includes(event.activityType))
      return false;
    if (locations.length > 0 && !locations.includes(event.locationKey))
      return false;
    if (buildings.length > 0 && !buildings.includes(event.building))
      return false;
    return true;
  });
}

export function hasActiveFilters(filters: ScheduleFilters): boolean {
  return (
    filters.searchQuery.trim() !== "" ||
    filters.axes.length > 0 ||
    filters.tags.length > 0 ||
    filters.activityTypes.length > 0 ||
    filters.locations.length > 0 ||
    filters.buildings.length > 0
  );
}

export function scheduleSorter(a: ConferenceEvent, b: ConferenceEvent): number {
  return (
    a.startTime.localeCompare(b.startTime) ||
    a.locationLabel.localeCompare(b.locationLabel)
  );
}
