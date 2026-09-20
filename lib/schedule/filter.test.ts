import { describe, expect, it } from "vitest";

import {
  EMPTY_FILTERS,
  filterEvents,
  hasActiveFilters,
  scheduleSorter,
  type ScheduleFilters,
} from "@/lib/schedule/filter";
import { type ConferenceEvent } from "@/lib/schedule/types";

function makeEvent(partial: Partial<ConferenceEvent>): ConferenceEvent {
  return {
    id: "EVT",
    date: "2026-09-23",
    startTime: "09:00",
    endTime: "10:00",
    title: "Sesión",
    activityType: "Conferencia Magistral",
    thematicAxis: "Violencia",
    venueKey: "sala-1",
    venueLabel: "Sala 1 · Centro de Convenciones",
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
    venueKey: "sala-2",
    venueLabel: "Sala 2 · Sala Audiovisual",
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
    venueKey: "sala-1",
  }),
];

describe("filterEvents", () => {
  it("keeps only events on the selected date", () => {
    const result = filterEvents(events, { ...EMPTY_FILTERS, date: "2026-09-23" });
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
    expect(
      hasActiveFilters({ ...EMPTY_FILTERS, axes: ["Violencia"] }),
    ).toBe(true);
    expect(
      hasActiveFilters({ ...EMPTY_FILTERS, searchQuery: "mesa" }),
    ).toBe(true);
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