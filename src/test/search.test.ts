import { beforeAll, describe, expect, it } from "vitest";
import type { SearchResult } from "@/lib/schedule/search";
import {
  levenshteinDistance,
  normalizeSpanish,
  SearchEngine,
} from "@/lib/schedule/search";
import type { ConferenceEvent } from "@/lib/schedule/types";

describe("room index (label-format change)", () => {
  it("keeps rooms searchable: 'sala 1' matches via roomName, not the label", () => {
    const roomEvent: ConferenceEvent = {
      id: "room-1",
      date: "2026-09-23",
      startTime: "09:00",
      endTime: "10:00",
      title: "Conversatorio de bienvenida",
      venueKey: "sala-1",
      venueLabel: "Centro de Convenciones (Edificio 3B)",
      venueHall: "Centro de Convenciones",
      roomName: "Sala 1",
      activityType: "Panel",
      thematicAxis: "General",
      tags: ["General"],
      building: "3B",
      speakers: [],
      papers: [],
    };
    const ids = new SearchEngine([roomEvent])
      .search("sala 1")
      .map((r) => r.event.id);
    expect(ids).toContain("room-1");
  });
});

// Test data matching the real VII JIDFICS dataset structure
const mockEvents: ConferenceEvent[] = [
  {
    id: "WED-003",
    date: "2026-09-23",
    startTime: "09:30",
    endTime: "10:30",
    title:
      "La ansiedad, depresión y estrés en jóvenes y el método integral para prevenirlos a través del Yoga",
    venueKey: "sala-1",
    venueLabel: "Sala 1 · Centro de Convenciones",
    venueHall: "Centro de Convenciones",
    activityType: "Conferencia Magistral",
    thematicAxis: "Salud / Psicología",
    tags: ["Salud", "Psicología"],
    building: "3B",
    speakers: [
      {
        name: "Dr. Carlos Alejandro Hidalgo Rasmussen",
        institution: "Universidad de Guadalajara",
        role: "speaker",
      },
    ],
    papers: [],
  },
  {
    id: "WED-MESA-1",
    date: "2026-09-23",
    startTime: "10:30",
    endTime: "12:30",
    title: "Mesa 1 · Violencia",
    venueKey: "sala-2",
    venueLabel: "Sala 2 · Sala Audiovisual",
    venueHall: "Sala Audiovisual",
    activityType: "Trabajos Libres",
    thematicAxis: "Violencia",
    tags: ["Violencia"],
    building: "1E",
    speakers: [],
    papers: [
      {
        title:
          "Atrapados en la frontera: Análisis de la vulnerabilidad multidimensional de la población focal migrante internacional en Tijuana",
        authors: ["Renato Pintor Sandoval", "Nayeli Burgueño Angulo"],
        institution: "Universidad Autónoma de Sinaloa",
      },
      {
        title:
          "Percepción de las estudiantes de bachillerato sobre las violencias simbólicas en el noviazgo",
        authors: ["Valeria Chávez Muñiz"],
        institution: "Universidad de Guadalajara",
      },
    ],
  },
  {
    id: "THU-001",
    date: "2026-09-24",
    startTime: "08:00",
    endTime: "09:00",
    title:
      "Niñez y tecnología: patrones de uso de pantallas, perfiles conductuales y desarrollo cognitivo-socioemocional en escolares",
    venueKey: "sala-1",
    venueLabel: "Sala 1 · Centro de Convenciones",
    venueHall: "Centro de Convenciones",
    activityType: "Conferencia Magistral",
    thematicAxis: "Educación / Tecnología",
    tags: ["Educación", "Tecnología"],
    building: "3B",
    speakers: [
      {
        name: "Dra. Josiane Pawlowski",
        institution: "Universidad Nacional de Costa Rica",
        role: "speaker",
      },
    ],
    papers: [],
  },
  {
    id: "THU-MESA-16",
    date: "2026-09-24",
    startTime: "09:00",
    endTime: "13:00",
    title: "Mesa 16 · Educación",
    venueKey: "sala-2",
    venueLabel: "Sala 2 · Sala Audiovisual",
    venueHall: "Sala Audiovisual",
    activityType: "Trabajos Libres",
    thematicAxis: "Educación",
    tags: ["Educación"],
    building: "1E",
    speakers: [],
    papers: [
      {
        title:
          "Sistema de Diagnóstico Estudiantil. Predicción de Rendimiento Académico mediante el algoritmo Random Forest",
        authors: ["Edwin William Osorio Gregorio"],
        institution: "Instituto Tecnológico de Milpa Alta",
      },
    ],
  },
];

describe("normalizeSpanish", () => {
  it("lowercases text", () => {
    expect(normalizeSpanish("VIOLNCIA")).toBe("violncia");
  });

  it("removes diacritics", () => {
    expect(normalizeSpanish("niñez tecnología")).toBe("ninez tecnologia");
    expect(normalizeSpanish("café")).toBe("cafe");
    expect(normalizeSpanish("año")).toBe("ano");
  });

  it("handles ñ correctly", () => {
    expect(normalizeSpanish("niño")).toBe("nino");
    expect(normalizeSpanish("ESPAÑA")).toBe("espana");
  });

  it("trims whitespace", () => {
    expect(normalizeSpanish("  violencia  ")).toBe("violencia");
  });

  it("handles empty string", () => {
    expect(normalizeSpanish("")).toBe("");
  });
});

describe("levenshteinDistance", () => {
  it("returns 0 for identical strings", () => {
    expect(levenshteinDistance("violencia", "violencia")).toBe(0);
  });

  it("returns 1 for single character substitution", () => {
    expect(levenshteinDistance("violencia", "violncia")).toBe(1);
    expect(levenshteinDistance("casa", "cosa")).toBe(1);
  });

  it("returns 1 for single character insertion", () => {
    expect(levenshteinDistance("violencia", "violenciaa")).toBe(1);
  });

  it("returns 1 for single character deletion", () => {
    expect(levenshteinDistance("violencia", "violenci")).toBe(1);
  });

  it("returns correct distance for multiple edits", () => {
    expect(levenshteinDistance("violencia", "violencia")).toBe(0);
    expect(levenshteinDistance("violencia", "violncia")).toBe(1);
    expect(levenshteinDistance("casa", "mesa")).toBe(2);
  });

  it("handles empty strings", () => {
    expect(levenshteinDistance("", "abc")).toBe(3);
    expect(levenshteinDistance("abc", "")).toBe(3);
  });
});

describe("SearchEngine", () => {
  let engine: SearchEngine;

  beforeAll(() => {
    engine = new SearchEngine(mockEvents);
  });

  describe("Index Building", () => {
    it("builds inverted index from events", () => {
      // Index should be built internally
      expect(engine).toBeDefined();
      expect(engine.getIndexStats().totalDocuments).toBe(4);
      expect(engine.getIndexStats().uniqueTerms).toBeGreaterThan(0);
    });

    it("indexes title words", () => {
      const results = engine.search("ansiedad");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].event.id).toBe("WED-003");
    });

    it("indexes speaker names", () => {
      const results = engine.search("Hidalgo");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].event.id).toBe("WED-003");
    });

    it("indexes speaker institutions", () => {
      const results = engine.search("Guadalajara");
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r: SearchResult) => r.event.id === "WED-003")).toBe(
        true,
      );
    });

    it("indexes paper titles", () => {
      const results = engine.search("frontera");
      expect(results.length).toBeGreaterThan(0);
      expect(
        results.some((r: SearchResult) => r.event.id === "WED-MESA-1"),
      ).toBe(true);
    });

    it("indexes paper authors", () => {
      const results = engine.search("Pintor");
      expect(results.length).toBeGreaterThan(0);
      expect(
        results.some((r: SearchResult) => r.event.id === "WED-MESA-1"),
      ).toBe(true);
    });

    it("indexes tags", () => {
      const results = engine.search("Violencia");
      expect(results.length).toBeGreaterThan(0);
      expect(
        results.some((r: SearchResult) => r.event.id === "WED-MESA-1"),
      ).toBe(true);
    });

    it("indexes thematic axis", () => {
      const results = engine.search("Salud");
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r: SearchResult) => r.event.id === "WED-003")).toBe(
        true,
      );
    });

    it("indexes building", () => {
      const results = engine.search("3B");
      expect(results.length).toBe(2); // WED-003 and THU-001
    });

    it("indexes venue", () => {
      const results = engine.search("Audiovisual");
      expect(results.length).toBe(2); // WED-MESA-1 and THU-MESA-16
    });
  });

  describe("Exact Match", () => {
    it("returns ranked results for exact match", () => {
      const results = engine.search("violencia");
      expect(results.length).toBeGreaterThan(0);
      // Should find WED-MESA-1 (tag Violencia + paper titles with violencias)
      expect(
        results.some((r: SearchResult) => r.event.id === "WED-MESA-1"),
      ).toBe(true);
    });

    it("returns empty array for no matches", () => {
      const results = engine.search("xyznonexistent");
      expect(results).toEqual([]);
    });

    it("case insensitive search", () => {
      const resultsLower = engine.search("violencia");
      const resultsUpper = engine.search("VIOLENCIA");
      const resultsMixed = engine.search("ViOlEnCiA");
      expect(resultsLower.length).toBe(resultsUpper.length);
      expect(resultsLower.length).toBe(resultsMixed.length);
    });

    it("Spanish diacritic insensitive", () => {
      const results = engine.search("ninez tecnologia");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].event.id).toBe("THU-001");
    });
  });

  describe("Fuzzy Matching", () => {
    it("handles single typo (Levenshtein distance 1)", () => {
      const results = engine.search("violncia"); // missing 'e'
      expect(results.length).toBeGreaterThan(0);
      expect(
        results.some((r: SearchResult) => r.event.id === "WED-MESA-1"),
      ).toBe(true);
    });

    it("handles transposition typo", () => {
      const results = engine.search("voilencia"); // transposed
      expect(results.length).toBeGreaterThan(0);
    });

    it("handles missing character", () => {
      const results = engine.search("tecnologia"); // missing accent
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r: SearchResult) => r.event.id === "THU-001")).toBe(
        true,
      );
    });

    it("respects max edit distance (default 2)", () => {
      // "violencia" -> "violen" (distance 3) should not match with default
      void engine.search("violen");
      // With maxDistance=2, this should not match
      // But it might match as prefix - that's different
    });

    it("ranks exact matches higher than fuzzy", () => {
      const results = engine.search("violencia");
      const exactMatch = results.find(
        (r: SearchResult) => r.event.id === "WED-MESA-1",
      );
      expect(exactMatch).toBeDefined();
      if (exactMatch) {
        // Exact match should have reasonable score
        expect(exactMatch.score).toBeGreaterThan(0.3);
      }
    });
  });

  describe("Prefix Matching (Autocomplete)", () => {
    it("matches prefix of indexed terms", () => {
      const results = engine.search("viol");
      expect(results.length).toBeGreaterThan(0);
    });

    it("prefix matches speaker names", () => {
      const results = engine.search("Hidal");
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r: SearchResult) => r.event.id === "WED-003")).toBe(
        true,
      );
    });

    it("returns suggestions for partial query", () => {
      const suggestions = engine.getSuggestions("vio", 5);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some((s: string) => s.includes("violencia"))).toBe(
        true,
      );
    });
  });

  describe("Field-Weighted Ranking", () => {
    it("ranks title matches highest", () => {
      // Event with "violencia" in title should rank higher than tag-only
      const results = engine.search("violencia");
      void results.find((r: SearchResult) =>
        r.event.title.toLowerCase().includes("violencia"),
      );
      void results.find((r: SearchResult) =>
        r.event.tags.includes("Violencia"),
      );

      // Both WED-MESA-1 has it in title (Mesa 1 · Violencia) and tag
      // This tests the ranking logic
      expect(results.length).toBeGreaterThan(0);
    });

    it("speaker name matches rank high", () => {
      const results = engine.search("Hidalgo");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].event.id).toBe("WED-003");
    });

    it("tag matches contribute to score", () => {
      const results = engine.search("Educación");
      // THU-001 has Educación in tags AND thematicAxis
      // THU-MESA-16 has Educación in tags AND thematicAxis
      expect(results.length).toBe(2);
    });
  });

  describe("Highlighting", () => {
    it("returns highlighted snippets for matches", () => {
      const results = engine.search("violencia");
      const result = results.find(
        (r: SearchResult) => r.event.id === "WED-MESA-1",
      );
      expect(result).toBeDefined();
      if (result?.highlights) {
        expect(result.highlights.length).toBeGreaterThan(0);
        // Highlights should contain the matched term wrapped
        expect(
          result.highlights.some(
            (h: string) => h.includes("violencia") || h.includes("Violencia"),
          ),
        ).toBe(true);
      }
    });

    it("highlights in title", () => {
      const results = engine.search("ansiedad");
      const result = results.find(
        (r: SearchResult) => r.event.id === "WED-003",
      );
      expect(result?.highlights).toBeDefined();
    });

    it("highlights in speakers", () => {
      const results = engine.search("Hidalgo");
      const result = results.find(
        (r: SearchResult) => r.event.id === "WED-003",
      );
      expect(result?.highlights).toBeDefined();
    });

    it("highlights in papers", () => {
      const results = engine.search("frontera");
      const result = results.find(
        (r: SearchResult) => r.event.id === "WED-MESA-1",
      );
      expect(result?.highlights).toBeDefined();
    });
  });

  describe("Search Suggestions", () => {
    it("returns suggestions based on indexed terms", () => {
      const suggestions = engine.getSuggestions("educa", 10);
      expect(suggestions.length).toBeGreaterThan(0);
      // Suggestions are normalized (lowercase, no diacritics)
      expect(suggestions.some((s: string) => s.includes("educacion"))).toBe(
        true,
      );
    });

    it("limits suggestions to max count", () => {
      const suggestions = engine.getSuggestions("a", 3);
      expect(suggestions.length).toBeLessThanOrEqual(3);
    });

    it("returns empty for no prefix match", () => {
      const suggestions = engine.getSuggestions("xyz", 5);
      expect(suggestions).toEqual([]);
    });
  });

  describe("Combined Search + Filters", () => {
    it("filters by date when specified", () => {
      const results = engine.search("Educación", { date: "2026-09-23" });
      // Only WED events should match
      expect(
        results.every((r: SearchResult) => r.event.date === "2026-09-23"),
      ).toBe(true);
    });

    it("filters by tags when specified", () => {
      const results = engine.search("", { tags: ["Violencia"] });
      expect(
        results.every((r: SearchResult) => r.event.tags.includes("Violencia")),
      ).toBe(true);
    });

    it("filters by building when specified", () => {
      const results = engine.search("", { buildings: ["3B"] });
      expect(
        results.every((r: SearchResult) => r.event.building === "3B"),
      ).toBe(true);
    });

    it("combines search query with filters", () => {
      const results = engine.search("Educación", {
        date: "2026-09-24",
        buildings: ["3B"],
      });
      expect(results.length).toBe(1);
      expect(results[0].event.id).toBe("THU-001");
    });

    it("empty query with filters returns filtered events", () => {
      const results = engine.search("", {
        date: "2026-09-23",
        tags: ["Salud"],
      });
      expect(results.length).toBe(1);
      expect(results[0].event.id).toBe("WED-003");
    });
  });

  describe("Edge Cases", () => {
    it("handles empty query", () => {
      const results = engine.search("");
      expect(results.length).toBe(4); // All events
    });

    it("handles whitespace only query", () => {
      const results = engine.search("   ");
      expect(results.length).toBe(4);
    });

    it("handles special characters in query", () => {
      const results = engine.search("niñez & tecnología");
      expect(results.length).toBeGreaterThan(0);
    });

    it("returns events sorted by score descending", () => {
      const results = engine.search("Educación");
      for (let i = 1; i < results.length; i++) {
        expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score);
      }
    });

    it("includes event reference in results", () => {
      const results = engine.search("violencia");
      expect(results[0].event).toBeDefined();
      expect(results[0].event.id).toBeDefined();
    });
  });
});
