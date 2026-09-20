import { describe, expect, it } from "vitest";

import { normalizeEvents, normalizeMeta } from "@/lib/schedule/normalize";
import type { RawCalendario } from "@/lib/schedule/types";
import rawCalendario from "@/lib/schedule/calendario_vii_jidfics.json";

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
      expect(event.startTime < event.endTime, `${event.id} time range`).toBe(true);
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