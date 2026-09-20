import { describe, expect, it } from "vitest";

import {
  deriveFilters,
  normalizeEvents,
  normalizeMeta,
} from "@/lib/schedule/normalize";
import { dayLabel, type RawCalendario } from "@/lib/schedule/types";

const fixture: RawCalendario = {
  evento: "VII JIDFICS",
  edicion: "VII",
  fecha_inicio: "2026-09-23",
  fecha_fin: "2026-09-24",
  sede: { institucion: "Universidad de Sonora", campus: "Caborca", lugar: "Caborca, Sonora" },
  programa: [
    {
      fecha: "2026-09-23",
      dia: "Miércoles",
      eventos: [
        {
          id: "WED-001",
          hora_inicio: "09:00",
          hora_fin: "10:00",
          tipo_actividad: "Conferencia Magistral",
          titulo: "Una conferencia",
          lugar: "Centro de Convenciones",
          sala: "Sala 1",
          edificio: "3B",
          ponentes: [{ nombre: "Dra. Ana", institucion: "UNISON" }],
          eje_tematico: "Salud / Psicología",
        },
        {
          id: "WED-MESA-1",
          hora_inicio: "10:00",
          hora_fin: "12:00",
          tipo_actividad: "Trabajos Libres",
          mesa_numero: 1,
          lugar: "Sala Audiovisual",
          sala: "Sala 2",
          edificio: "1E",
          eje_tematico: "Violencia",
          ponencias: [
            {
              titulo: "Una ponencia",
              autores: ["Autor A", "Autor B"],
              institucion: "UAS",
            },
          ],
        },
      ],
    },
  ],
};

describe("normalizeEvents", () => {
  const events = normalizeEvents(fixture);

  it("flattens programa into one event per entry", () => {
    expect(events).toHaveLength(2);
    expect(events.map((e) => e.id)).toEqual(["WED-001", "WED-MESA-1"]);
  });

  it("maps session fields onto the UI shape", () => {
    expect(events[0]).toMatchObject({
      date: "2026-09-23",
      startTime: "09:00",
      endTime: "10:00",
      activityType: "Conferencia Magistral",
      thematicAxis: "Salud / Psicología",
      venueLabel: "Sala 1 · Centro de Convenciones",
      venueKey: "sala-1",
    });
    expect(events[0].speakers[0]).toEqual({
      name: "Dra. Ana",
      institution: "UNISON",
      role: "speaker",
    });
  });

  it("synthesizes a title for mesa events from number + axis", () => {
    expect(events[1].title).toBe("Mesa 1 · Violencia");
    expect(events[1].papers[0].authors).toEqual(["Autor A", "Autor B"]);
  });

  it("defaults missing eje_tematico to General", () => {
    const noAxis: RawCalendario = {
      ...fixture,
      programa: [
        {
          fecha: "2026-09-23",
          dia: "Miércoles",
          eventos: [
            {
              id: "X",
              hora_inicio: "09:00",
              hora_fin: "09:30",
              tipo_actividad: "Registro",
              titulo: "Registro",
              lugar: "Centro de Convenciones",
              sala: "Sala 1",
              edificio: "3B",
            },
          ],
        },
      ],
    };
    expect(normalizeEvents(noAxis)[0].thematicAxis).toBe("General");
  });
});

describe("normalizeMeta", () => {
  it("maps conference metadata", () => {
    const meta = normalizeMeta(fixture);
    expect(meta.edition).toBe("VII");
    expect(meta.venueCampus).toBe("Caborca");
    expect(meta.days).toEqual([
      { date: "2026-09-23", dayName: "Miércoles" },
    ]);
  });
});

describe("deriveFilters", () => {
  it("derives unique values in dataset order", () => {
    const derived = deriveFilters(
      normalizeEvents({
        ...fixture,
        programa: [
          {
            fecha: "2026-09-23",
            dia: "Miércoles",
            eventos: [
              fixture.programa[0].eventos[0],
              { ...fixture.programa[0].eventos[1], eje_tematico: "Género" },
            ],
          },
        ],
      }),
    );
    expect(derived.axes).toEqual(["Salud / Psicología", "Género"]);
    expect(derived.activityTypes).toEqual([
      "Conferencia Magistral",
      "Trabajos Libres",
    ]);
    expect(derived.venues).toContainEqual({
      key: "sala-1",
      label: "Sala 1 · Centro de Convenciones",
    });
  });
});

describe("dayLabel", () => {
  it("formats Spanish day labels", () => {
    expect(dayLabel("Miércoles", "2026-09-23")).toBe("Miércoles 23 de septiembre");
  });
});