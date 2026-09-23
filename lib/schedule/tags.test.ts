import { describe, expect, it } from "vitest";
import rawCalendario from "@/lib/schedule/calendario_vii_jidfics.json";
import { EMPTY_FILTERS, type ScheduleFilters } from "@/lib/schedule/filter";
import { deriveFilters, normalizeEvents } from "@/lib/schedule/normalize";
import {
  categorizeDerived,
  categorizeTag,
  clearCategory,
  countSelectedCategory,
  splitTagsByCategory,
  type TagCategory,
  toTagOptions,
} from "@/lib/schedule/tags";
import type { RawCalendario, ScheduleDerived } from "@/lib/schedule/types";

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

const makeDerived = (partial: Partial<ScheduleDerived>): ScheduleDerived => ({
  axes: [],
  tags: [],
  activityTypes: [],
  venues: [],
  buildings: [],
  ...partial,
});

/* ------------------------------------------------------------------ */
/* categorizeTag — keyword classifier + manual overrides               */
/* ------------------------------------------------------------------ */

describe("categorizeTag", () => {
  it("classifies location keywords (word-boundary, case-insensitive)", () => {
    const locationTags = [
      "Sala de Usos Múltiples",
      "Aula 201D",
      "Auditorio",
      "Edificio 3B",
      "Planta Baja",
      "Piso 1",
    ];
    for (const tag of locationTags) {
      expect(categorizeTag(tag), tag).toBe("location");
    }
    // lowercase / no-diacritics inputs behave identically
    expect(categorizeTag("sala de danza")).toBe("location");
    expect(categorizeTag("AUDITORIO")).toBe("location");
  });

  it("defaults to topic and respects word boundaries", () => {
    const topicTags = ["Violencia", "Salud", "General", "Educación", "Género"];
    for (const tag of topicTags) {
      expect(categorizeTag(tag), tag).toBe("topic");
    }
    // "salado" contains "sala" but must NOT match (word boundary)
    expect(categorizeTag("Salado")).toBe("topic");
  });

  it("manual overrides win over keyword heuristics", () => {
    // Overrides are injectable so edge cases stay testable & data-driven.
    expect(categorizeTag("Módulo E", { "módulo e": "location" })).toBe(
      "location",
    );
    expect(categorizeTag("Sala Abierta", { "sala abierta": "topic" })).toBe(
      "topic",
    );
  });

  it("default overrides map is a plain record (data-driven edge cases)", () => {
    // A known entry from TAG_CATEGORY_OVERRIDES must win over the heuristic.
    const overrides: Record<string, TagCategory> = {
      "centro de convenciones": "location",
    };
    expect(categorizeTag("Centro de Convenciones", overrides)).toBe("location");
    // and with no override, keyword rules apply as usual
    expect(categorizeTag("Sala Grande")).toBe("location");
  });
});

/* ------------------------------------------------------------------ */
/* splitTagsByCategory                                                 */
/* ------------------------------------------------------------------ */

describe("splitTagsByCategory", () => {
  it("splits mixed tags, preserving order within each category", () => {
    const { topic, location } = splitTagsByCategory([
      "Violencia",
      "Sala 1",
      "Salud",
      "Auditorio Norte",
    ]);
    expect(topic).toEqual(["Violencia", "Salud"]);
    expect(location).toEqual(["Sala 1", "Auditorio Norte"]);
  });

  it("handles empty input", () => {
    expect(splitTagsByCategory([])).toEqual({ topic: [], location: [] });
  });
});

/* ------------------------------------------------------------------ */
/* toTagOptions + sorting                                              */
/* ------------------------------------------------------------------ */

describe("toTagOptions", () => {
  it("builds sorted TagOptions; explicit category overrides classification", () => {
    const options = toTagOptions(["Violencia", "Sala 1"], "topic");
    expect(options).toHaveLength(2);
    // topic rules = alphabetical (es), regardless of the tag's own heuristic
    expect(options.map((o) => o.value)).toEqual(["Sala 1", "Violencia"]);
    for (const option of options) {
      expect(option.category).toBe("topic");
      expect(option.sortKey.length).toBeGreaterThan(0);
    }
  });

  it("classifies when category is omitted", () => {
    const [topicOpt] = toTagOptions(["Salud"]);
    const [locationOpt] = toTagOptions(["Edificio 3B"]);
    expect(topicOpt.category).toBe("topic");
    expect(locationOpt.category).toBe("location");
  });

  it("label defaults to value; label map is honored", () => {
    const [plain] = toTagOptions(["abc"]);
    expect(plain.label).toBe("abc");
    const [mapped] = toTagOptions([
      { value: "3B", label: "Centro de Convenciones (Edificio 3B)" },
    ]);
    expect(mapped.label).toBe("Centro de Convenciones (Edificio 3B)");
  });
});

describe("category sorting", () => {
  it("topics sort alphabetically (es locale)", () => {
    const sorted = toTagOptions(
      ["Violencia", "Educación", "Bienestar"],
      "topic",
    );
    expect(sorted.map((o) => o.value)).toEqual([
      "Bienestar",
      "Educación",
      "Violencia",
    ]);
  });

  it("locations sort numerically-aware (room number, then alpha)", () => {
    const venues = toTagOptions(
      ["Sala 10 · Centro", "Sala 2 · Centro", "Sala 1 · Centro"],
      "location",
    );
    expect(venues.map((o) => o.value)).toEqual([
      "Sala 1 · Centro",
      "Sala 2 · Centro",
      "Sala 10 · Centro",
    ]);
  });

  it("buildings sort by numeric prefix then alpha (building → floor → room spirit)", () => {
    const buildings = toTagOptions(["201D", "1E", "3B"], "location");
    expect(buildings.map((o) => o.value)).toEqual(["1E", "3B", "201D"]);
  });
});

/* ------------------------------------------------------------------ */
/* categorizeDerived — full facet categorization                       */
/* ------------------------------------------------------------------ */

describe("categorizeDerived", () => {
  it("groups facets: tags+activityTypes → topic, venues+buildings → location", () => {
    const derived = categorizeDerived(
      makeDerived({
        tags: ["Salud", "Violencia"],
        activityTypes: ["Conferencia Magistral"],
        venues: [{ key: "sala-1", label: "Sala 1 · Centro" }],
        buildings: [
          { key: "3B", label: "Centro de Convenciones (Edificio 3B)" },
        ],
      }),
    );

    expect(derived.topic.tags.map((o) => o.value)).toEqual([
      "Salud",
      "Violencia",
    ]);
    expect(derived.type.activityTypes.map((o) => o.value)).toEqual([
      "Conferencia Magistral",
    ]);
    expect(derived.location.venues.map((o) => o.value)).toEqual(["sala-1"]);
    expect(derived.location.buildings.map((o) => o.value)).toEqual(["3B"]);
    // every option carries its category
    expect(derived.type.activityTypes[0]?.category).toBe("type");
    expect(derived.topic.tags[0]?.category).toBe("topic");
    expect(derived.location.buildings[0]?.category).toBe("location");
  });

  it("venue options keep the human label as display label", () => {
    const derived = categorizeDerived(
      makeDerived({
        venues: [
          { key: "sala-de-danza", label: "Sala de Danza · Edificio 1E" },
        ],
      }),
    );
    const [venue] = derived.location.venues;
    expect(venue?.value).toBe("sala-de-danza");
    expect(venue?.label).toBe("Sala de Danza · Edificio 1E");
  });
});

/* ------------------------------------------------------------------ */
/* Real dataset guard                                                  */
/* ------------------------------------------------------------------ */

describe("real dataset categorization", () => {
  const events = normalizeEvents(rawCalendario as RawCalendario);
  const categorized = categorizeDerived(deriveFilters(events));

  it("classifies every real tag as topic (dataset has no location tags)", () => {
    const values: string[] = categorized.topic.tags.map((o) => o.value);
    expect(values.length).toBeGreaterThanOrEqual(19);
    expect(categorized.location.tags).toEqual([]);
  });

  it("routes every real venue and building to location", () => {
    expect(categorized.location.venues.length).toBeGreaterThanOrEqual(6);
    expect(categorized.location.buildings.length).toBeGreaterThanOrEqual(6);
    for (const option of categorized.location.buildings) {
      expect(option.category).toBe("location");
    }
  });
});

/* ------------------------------------------------------------------ */
/* countSelectedCategory / clearCategory                               */
/* ------------------------------------------------------------------ */

const selected: ScheduleFilters = {
  ...EMPTY_FILTERS,
  tags: ["Salud"],
  activityTypes: ["Conferencia Magistral"],
  venues: ["sala-1", "sala-2"],
  buildings: ["3B"],
};

describe("countSelectedCategory", () => {
  it("sums facet selections per category", () => {
    expect(countSelectedCategory("topic", selected)).toBe(1); // tags only
    expect(countSelectedCategory("location", selected)).toBe(3); // venues + buildings
    expect(countSelectedCategory("topic", EMPTY_FILTERS)).toBe(0);
    expect(countSelectedCategory("location", EMPTY_FILTERS)).toBe(0);
  });
});

describe("clearCategory", () => {
  it("clears only the requested category, keeping date/search/other category", () => {
    const clearedLocation = clearCategory("location", selected);
    expect(clearedLocation.venues).toEqual([]);
    expect(clearedLocation.buildings).toEqual([]);
    expect(clearedLocation.tags).toEqual(["Salud"]);
    expect(clearedLocation.activityTypes).toEqual(["Conferencia Magistral"]);
    expect(clearedLocation.date).toBe(selected.date);
    expect(clearedLocation.searchQuery).toBe(selected.searchQuery);

    const clearedTopic = clearCategory("topic", selected);
    expect(clearedTopic.tags).toEqual([]);
    expect(clearedTopic.activityTypes).toEqual(["Conferencia Magistral"]);
    expect(clearedTopic.venues).toEqual(["sala-1", "sala-2"]);
    expect(clearedTopic.buildings).toEqual(["3B"]);
    expect(clearedTopic.date).toBe(selected.date);
  });

  it("does not mutate the input filters", () => {
    clearCategory("location", selected);
    expect(selected.venues).toEqual(["sala-1", "sala-2"]);
  });
});

/* ------------------------------------------------------------------ */
/* Three-category model (type | topic | location) — RED specs          */
/* ------------------------------------------------------------------ */

describe("TagCategory — three categories", () => {
  it("TagCategory type union includes 'type'", () => {
    // This will fail until types.ts is updated
    const cat: TagCategory = "type";
    expect(cat).toBe("type");
  });
});

describe("categorizeDerived — three-category routing", () => {
  it("routes activityTypes to 'type' category (not 'topic')", () => {
    const derived = categorizeDerived(
      makeDerived({
        tags: ["Salud", "Violencia"],
        activityTypes: ["Conferencia Magistral", "Panel"],
        venues: [{ key: "sala-1", label: "Sala 1 · Centro" }],
        buildings: [
          { key: "3B", label: "Centro de Convenciones (Edificio 3B)" },
        ],
      }),
    );

    // type category exists and has activityTypes
    expect(derived.type).toBeDefined();
    expect(derived.type.activityTypes.map((o) => o.value)).toEqual([
      "Conferencia Magistral",
      "Panel",
    ]);
    // topic no longer exposes activityTypes
    expect("activityTypes" in derived.topic).toBe(false);
    expect(derived.topic.tags.map((o) => o.value)).toEqual([
      "Salud",
      "Violencia",
    ]);
    // every option carries its category
    expect(derived.type.activityTypes[0]?.category).toBe("type");
    expect(derived.topic.tags[0]?.category).toBe("topic");
    expect(derived.location.buildings[0]?.category).toBe("location");
  });
});

describe("countSelectedCategory — three categories", () => {
  it("sums facet selections per category (type = activityTypes only)", () => {
    // selected has tags:1 + activityTypes:1 = topic:1, type:1, location:2 (venues) + 1 (building) = 3
    expect(countSelectedCategory("type", selected)).toBe(1); // activityTypes only
    expect(countSelectedCategory("topic", selected)).toBe(1); // tags only
    expect(countSelectedCategory("location", selected)).toBe(3); // venues + buildings
    expect(countSelectedCategory("type", EMPTY_FILTERS)).toBe(0);
    expect(countSelectedCategory("topic", EMPTY_FILTERS)).toBe(0);
    expect(countSelectedCategory("location", EMPTY_FILTERS)).toBe(0);
  });
});

describe("clearCategory — three categories", () => {
  it("clears only the requested category, keeping others intact", () => {
    const clearedType = clearCategory("type", selected);
    expect(clearedType.activityTypes).toEqual([]);
    expect(clearedType.tags).toEqual(["Salud"]);
    expect(clearedType.venues).toEqual(["sala-1", "sala-2"]);
    expect(clearedType.buildings).toEqual(["3B"]);
    expect(clearedType.date).toBe(selected.date);
    expect(clearedType.searchQuery).toBe(selected.searchQuery);

    const clearedTopic = clearCategory("topic", selected);
    expect(clearedTopic.tags).toEqual([]);
    expect(clearedTopic.activityTypes).toEqual(["Conferencia Magistral"]);
    expect(clearedTopic.venues).toEqual(["sala-1", "sala-2"]);
    expect(clearedTopic.buildings).toEqual(["3B"]);

    const clearedLocation = clearCategory("location", selected);
    expect(clearedLocation.venues).toEqual([]);
    expect(clearedLocation.buildings).toEqual([]);
    expect(clearedLocation.tags).toEqual(["Salud"]);
    expect(clearedLocation.activityTypes).toEqual(["Conferencia Magistral"]);
  });

  it("does not mutate the input filters", () => {
    clearCategory("type", selected);
    expect(selected.activityTypes).toEqual(["Conferencia Magistral"]);
    clearCategory("topic", selected);
    expect(selected.tags).toEqual(["Salud"]);
  });
});

describe("real dataset categorization — three categories", () => {
  const events = normalizeEvents(rawCalendario as RawCalendario);
  const categorized = categorizeDerived(deriveFilters(events));

  it("routes every real activityType to 'type' category (14 values)", () => {
    expect(categorized.type).toBeDefined();
    expect(categorized.type.activityTypes.length).toBe(14);
    for (const option of categorized.type.activityTypes) {
      expect(option.category).toBe("type");
    }
  });

  it("topic.tags has 19 values and no activityTypes", () => {
    const values: string[] = categorized.topic.tags.map((o) => o.value);
    expect(values.length).toBeGreaterThanOrEqual(19);
    expect("activityTypes" in categorized.topic).toBe(false);
  });
});
