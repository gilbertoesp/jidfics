import { describe, expect, it } from "vitest";

import {
  EMPTY_FILTERS,
  filterEvents,
  hasActiveFilters,
  type ScheduleFilters,
  scheduleSorter,
} from "@/lib/schedule/filter";
import type { ConferenceEvent } from "@/lib/schedule/types";

function makeEvent(partial: Partial<ConferenceEvent>): ConferenceEvent {
  return {
    id: "EVT",
    date: "2026-09-23",
    startTime: "09:00",
    endTime: "10:00",
    title: "Sesión",
    activityType: "Conferencia Magistral",
    thematicAxis: "Violencia",
    tags: ["Violencia"],
    building: "3B",
    venueKey: "sala-1",
    venueLabel: "Sala 1 · Centro de Convenciones",
    venueName: "Sala 1",
    speakers: [],
    papers: [],
    ...partial,
  };
}

const events: ConferenceEvent[] = [
  makeEvent({
    id: "a",
    date: "2026-09-23",
    startTime: "09:00",
    title: "Violencia digital",
    activityType: "Conferencia Magistral",
    thematicAxis: "Violencia",
    tags: ["Violencia"],
    building: "3B",
    venueKey: "sala-1",
    speakers: [{ name: "Dra. Ana", institution: "UNISON", role: "speaker" }],
  }),
  makeEvent({
    id: "b",
    date: "2026-09-23",
    startTime: "11:00",
    title: "Mesa 1 · Género",
    activityType: "Trabajos Libres",
    thematicAxis: "Género",
    tags: ["Género"],
    building: "1E",
    venueKey: "sala-2",
    venueLabel: "Sala 2 · Sala Audiovisual",
    venueName: "Sala 2",
    papers: [
      {
        title: "Mujeres y ciencia",
        authors: ["Carlos Ruiz"],
        institution: "UAS",
      },
    ],
  }),
  makeEvent({
    id: "c",
    date: "2026-09-24",
    startTime: "09:00",
    title: "Inauguración",
    activityType: "Inauguración",
    thematicAxis: "General",
    tags: ["General"],
    building: "3B",
    venueKey: "sala-1",
  }),
];

describe("filterEvents", () => {
  it("keeps only events on the selected date", () => {
    const result = filterEvents(events, {
      ...EMPTY_FILTERS,
      date: "2026-09-23",
    });
    expect(result.map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("matches search across title, speaker, and paper author/institution", () => {
    const byTitle = filterEvents(events, {
      ...EMPTY_FILTERS,
      date: "2026-09-23",
      searchQuery: "violencia",
    });
    expect(byTitle.map((e) => e.id)).toEqual(["a"]);

    const bySpeaker = filterEvents(events, {
      ...EMPTY_FILTERS,
      date: "2026-09-23",
      searchQuery: "ana",
    });
    expect(bySpeaker.map((e) => e.id)).toEqual(["a"]);

    const byAuthor = filterEvents(events, {
      ...EMPTY_FILTERS,
      date: "2026-09-23",
      searchQuery: "carlos",
    });
    expect(byAuthor.map((e) => e.id)).toEqual(["b"]);

    const byInstitution = filterEvents(events, {
      ...EMPTY_FILTERS,
      date: "2026-09-23",
      searchQuery: "uas",
    });
    expect(byInstitution.map((e) => e.id)).toEqual(["b"]);
  });

  it("ORs values inside a facet, ANDs across facets", () => {
    const result = filterEvents(events, {
      ...EMPTY_FILTERS,
      date: "2026-09-23",
      activityTypes: ["Conferencia Magistral", "Inauguración"],
    });
    expect(result.map((e) => e.id)).toEqual(["a"]); // Inauguración only on day 2

    const cross = filterEvents(events, {
      ...EMPTY_FILTERS,
      date: "2026-09-23",
      axes: ["Violencia", "Género"],
      venues: ["sala-2"],
    });
    expect(cross.map((e) => e.id)).toEqual(["b"]);
  });

  it("empty filters returns only the default date's events", () => {
    const result = filterEvents(events, EMPTY_FILTERS);
    expect(result.map((e) => e.id)).toEqual(["a", "b"]);
  });
});

describe("hasActiveFilters", () => {
  it("is false for empty filters", () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
  });

  it("is true when any facet has values", () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, axes: ["Violencia"] })).toBe(
      true,
    );
    expect(hasActiveFilters({ ...EMPTY_FILTERS, searchQuery: "mesa" })).toBe(
      true,
    );
  });
});

describe("scheduleSorter", () => {
  it("orders by start time then venue label", () => {
    const shuffled = [events[1], events[0]];
    expect(shuffled.sort(scheduleSorter).map((e) => e.id)).toEqual(["a", "b"]);
  });
});

describe("EMPTY_FILTERS", () => {
  it("is immutable to callers", () => {
    const filters: ScheduleFilters = { ...EMPTY_FILTERS, axes: ["Violencia"] };
    expect(EMPTY_FILTERS.axes).toEqual([]);
    expect(EMPTY_FILTERS.activityTypes).toEqual([]);
    expect(EMPTY_FILTERS.venues).toEqual([]);
    expect(filters.axes).toEqual(["Violencia"]);
  });
});

describe("tag and building filters", () => {
  it("filters by tags OR within facet", () => {
    const viol = filterEvents(events, {
      ...EMPTY_FILTERS,
      tags: ["Violencia"],
    });
    expect(viol.map((e) => e.id)).toEqual(["a"]);
    const multi = filterEvents(events, {
      ...EMPTY_FILTERS,
      tags: ["Violencia", "Género"],
    });
    expect(multi.map((e) => e.id).sort()).toEqual(["a", "b"]);
  });

  it("filters building AND tags", () => {
    const both = filterEvents(events, {
      ...EMPTY_FILTERS,
      buildings: ["3B"],
      tags: ["Violencia"],
    });
    expect(both.map((e) => e.id)).toEqual(["a"]);
    const miss = filterEvents(events, {
      ...EMPTY_FILTERS,
      buildings: ["1E"],
      tags: ["Violencia"],
    });
    expect(miss).toEqual([]);
  });

  it("search matches tag and building", () => {
    const byTag = filterEvents(events, {
      ...EMPTY_FILTERS,
      searchQuery: "violencia",
    });
    expect(byTag.map((e) => e.id)).toContain("a");
    const byBuilding = filterEvents(events, {
      ...EMPTY_FILTERS,
      searchQuery: "1E",
    });
    // b has building 1E, should match via building haystack
    expect(byBuilding.map((e) => e.id)).toContain("b");
  });

  it("hasActiveFilters true for tags/buildings", () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, tags: ["Género"] })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, buildings: ["3B"] })).toBe(
      true,
    );
  });
});
