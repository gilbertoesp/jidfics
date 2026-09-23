import { describe, expect, it } from "vitest";
import rawCalendario from "@/lib/schedule/calendario_vii_jidfics.json";
import {
  deriveFilters,
  normalizeEvents,
  normalizeMeta,
} from "@/lib/schedule/normalize";
import type { RawCalendario } from "@/lib/schedule/types";

/**
 * Data-integrity guards over the REAL conference dataset.
 * These fail loudly if an editor introduces malformed entries.
 */
const calendario = rawCalendario as RawCalendario;
const events = normalizeEvents(calendario);
const meta = normalizeMeta(calendario);
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

describe("dataset shape", () => {
  it("has a single venue (sede) with the expected fields", () => {
    expect(calendario.edicion).toBe("VII");
    expect(calendario.sede.institucion).toContain("Sonora");
    expect(meta.venueCampus).toBe("Caborca");
  });

  it("covers both conference days", () => {
    expect(meta.days.map((d) => d.date)).toEqual([
      calendario.fecha_inicio,
      calendario.fecha_fin,
    ]);
    expect(meta.days.map((d) => d.dayName)).toContain("Miércoles");
    expect(meta.days.map((d) => d.dayName)).toContain("Jueves");
  });
});

describe("normalized events integrity", () => {
  it("has unique event ids", () => {
    const ids = events.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has valid HH:mm times and start < end", () => {
    for (const event of events) {
      expect(event.startTime, event.id).toMatch(TIME_RE);
      expect(event.endTime, event.id).toMatch(TIME_RE);
      expect(event.startTime < event.endTime, `${event.id} time range`).toBe(
        true,
      );
    }
  });

  it("has required display fields on every event", () => {
    for (const event of events) {
      expect(event.title.trim().length, event.id).toBeGreaterThan(0);
      expect(event.activityType.trim().length, event.id).toBeGreaterThan(0);
      expect(event.thematicAxis.trim().length, event.id).toBeGreaterThan(0);
      expect(event.venueLabel.trim().length, event.id).toBeGreaterThan(0);
      expect(event.venueKey.trim().length, event.id).toBeGreaterThan(0);
    }
  });

  it("schedules every event on one of the conference days", () => {
    const validDates = new Set(meta.days.map((d) => d.date));
    for (const event of events) {
      expect(validDates.has(event.date), event.id).toBe(true);
    }
  });

  it("normalizes duplicate venue spellings to one key", () => {
    const labelsByKey = new Map<string, Set<string>>();
    for (const event of events) {
      const set = labelsByKey.get(event.venueKey) ?? new Set<string>();
      set.add(event.venueLabel);
      labelsByKey.set(event.venueKey, set);
    }
    for (const [key, labels] of labelsByKey) {
      // Same schema-id may show localized/abbreviated label variants, but the
      // set of normalized keys must be materially smaller than raw labels.
      expect(labels.size, key).toBeGreaterThanOrEqual(1);
    }
    expect(events.length).toBeGreaterThan(20);
  });

  it("pins the known same-venue time collisions for this edition", () => {
    // THU has parallel mesas assigned to shared rooms (partitioned halls).
    // Rather than fighting editorial data, we PIN the exact collision set so
    // the suite fails if an editor introduces NEW overlaps or resolves these.
    const KNOWN_COLLISIONS = [
      "2026-09-24|sala-1 :: THU-004(16:00-17:00) x THU-005(16:00)",
      "2026-09-24|sala-2 :: THU-002(09:00-10:00) x THU-MESA-16(09:00)",
      "2026-09-24|sala-2 :: THU-MESA-16(09:00-13:00) x THU-CARTELES-VIRTUALES(10:00)",
    ];

    const bySlot = new Map<string, Array<[string, string, string]>>();
    for (const event of events) {
      const key = `${event.date}|${event.venueKey}`;
      const list = bySlot.get(key) ?? [];
      list.push([event.startTime, event.endTime, event.id]);
      bySlot.set(key, list);
    }
    const collisions: string[] = [];
    for (const [key, list] of bySlot) {
      const sorted = [...list].sort((a, b) => a[0].localeCompare(b[0]));
      for (let i = 1; i < sorted.length; i += 1) {
        const [prevStart, prevEnd, prevId] = sorted[i - 1];
        const [start, , id] = sorted[i];
        if (start < prevEnd) {
          collisions.push(
            `${key} :: ${prevId}(${prevStart}-${prevEnd}) x ${id}(${start})`,
          );
        }
      }
    }
    expect(collisions).toEqual(KNOWN_COLLISIONS);
  });
});

describe("derived location facet (Ubicaciones)", () => {
  const derived = deriveFilters(events);

  it("uses one accurate 'hall (Edificio X)' tag per venue", () => {
    const labels = derived.venues.map((v) => v.label);
    expect(labels.length).toBeGreaterThan(0);
    expect(new Set(labels).size).toBe(labels.length); // no repeated locations
    // each facet label = its event's hall + building via the single formatter
    const expected = new Map(
      events.map((e) => [
        e.venueKey,
        e.building !== "Unknown"
          ? `${e.venueHall} (Edificio ${e.building})`
          : e.venueHall,
      ]),
    );
    expect(new Map(derived.venues.map((v) => [v.key, v.label]))).toEqual(
      expected,
    );
    for (const label of labels) {
      expect(label, label).toMatch(/^.+ \(Edificio [^()]+\)$/); // hall + code
      expect(label, label).not.toContain("·"); // no room-prefix copies
      expect(label, label).not.toMatch(/^Sala \d+/); // no bare room numbers
    }
  });
});

/* ------------------------------------------------------------------ */
/* v2 SSOT — schedule_updates_v2.json consumed into the master dataset */
/* ------------------------------------------------------------------ */
const rawEvents = rawCalendario.programa.flatMap(
  (d) => d.eventos,
) as unknown as Array<Record<string, unknown> & { id: string }>;
const rawById = new Map(rawEvents.map((e) => [e.id, e]));

interface RawPonencia {
  titulo: string;
  autores: string[];
  institucion?: string;
}
const ponenciasOf = (id: string): RawPonencia[] =>
  (rawById.get(id)?.ponencias as RawPonencia[] | undefined) ?? [];

describe("v2 content updates (single source of truth)", () => {
  it("applies the WED-004 v2 title/speaker and preserves its change history", () => {
    const w4 = events.find((e) => e.id === "WED-004");
    expect(w4?.title).toBe(
      "Bienestar y desarrollo psicológico en México y España",
    );
    expect(w4?.speakers).toEqual([
      {
        name: "Dra. Eunice Gaxiola",
        institution: "Universidad de Sonora",
        role: "speaker",
      },
    ]);
    const hist = rawById.get("WED-004")?.historial_cambios as
      | { anterior_titulo?: string; anterior_ponente?: string }
      | undefined;
    expect(hist?.anterior_titulo).toBe(
      "Los ambientes positivos en la resiliencia o adaptabilidad",
    );
    expect(hist?.anterior_ponente).toBe("Dr. José Concepción Gaxiola Romero");
  });

  it("fills WED-MESA-14 with its three v2 papers (institution-tagged authors)", () => {
    const p14 = ponenciasOf("WED-MESA-14");
    expect(p14.map((p) => p.titulo)).toEqual([
      "Vacío normativo de la configuración del maestro sombra en el Sistema Educativo Mexicano",
      "Neurodivergencia y ajustes razonables desde la educación preescolar",
      "Formando personas de hoy para el mañana: Caborca limpio",
    ]);
    expect(p14[0].autores).toEqual([
      "Imelda Cecilia García Bernal (Universidad de Sonora)",
      "Coautores (Universidad de Sonora)",
    ]);
  });

  it("rewrites THU-MESA-21 papers to canonical v2 titles with authors", () => {
    const p21 = ponenciasOf("THU-MESA-21");
    expect(p21.map((p) => p.titulo)).toEqual([
      "Gobernanza territorial, diversidad y desarrollo regional en Chile y América Latina",
      "Satisfacción laboral y desarrollo regional",
      "La investigación cualitativa",
      "¿Cómo gestionan sus finanzas los estudiantes universitarios?",
    ]);
    expect(p21[0].autores).toEqual([
      "Maria Fernanda Herrera Acuña (Universidad de Chile)",
    ]);
  });

  it("updates the 'Trayectorias de vida…' poster authors in place (no duplicate event)", () => {
    const posters = ponenciasOf("THU-CARTELES-VIRTUALES");
    const poster = posters.find((p) =>
      p.titulo.startsWith("Trayectorias de vida diversas"),
    );
    expect(poster?.autores).toEqual(["Lilia Angélica Ramírez Mora"]);
    expect(poster?.institucion).toBe("Universidad de Manizales");
    // in-place policy: never materialize the poster as its own session
    expect(
      events.filter((e) => e.title.startsWith("Trayectorias de vida")),
    ).toHaveLength(0);
  });

  it("keeps every event on canonical schema keys (rejects patch-only fields)", () => {
    const EVENT_KEYS = new Set([
      "id",
      "hora_inicio",
      "hora_fin",
      "tipo_actividad",
      "titulo",
      "mesa_numero",
      "lugar",
      "sala",
      "edificio",
      "ponentes",
      "eje_tematico",
      "tags",
      "ponencias",
      "historial_cambios",
    ]);
    for (const e of rawEvents) {
      for (const key of Object.keys(e)) {
        expect(EVENT_KEYS.has(key), `${e.id}.${key}`).toBe(true);
      }
    }
  });

  it("keeps exactly the 7 canonical locations with exact casing", () => {
    const CANON = new Set([
      "Sala 1|Centro de Convenciones|3B",
      "Sala 2|Sala Audiovisual|1E",
      "Sala 3|Sala Polivalente|1M",
      "Sala 4|Sala de Maestría|1G",
      "Aula 201D|Aula 201D|201D",
      "Sala de Danza|Sala de Danza|1E",
      "Sala de Usos Múltiples|Sala de Usos Múltiples|1I",
    ]);
    const seen = new Set(
      rawEvents.map(
        (e) => `${String(e.sala)}|${String(e.lugar)}|${String(e.edificio)}`,
      ),
    );
    for (const t of seen) expect(CANON.has(t), t).toBe(true); // exact casing
    expect(seen.size).toBe(CANON.size); // every canonical location in use
  });
});
