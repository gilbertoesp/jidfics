import {
  type ConferenceEvent,
  type ConferenceMeta,
  type RawCalendario,
  type RawEvento,
  type ScheduleDerived,
} from "@/lib/schedule/types";

/** Lowercase without diacritics — used to derive stable venue keys. */
function slugify(value: string): string {
  return value
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeVenueLabel(sala: string, lugar: string): string {
  return `${sala} · ${lugar}`;
}

/** Sense of a title: mesa events carry papers instead of a title. */
function titleFor(evento: RawEvento): string {
  if (evento.titulo) return evento.titulo;
  if (evento.mesa_numero !== undefined) {
    return `Mesa ${evento.mesa_numero}${evento.eje_tematico ? ` · ${evento.eje_tematico}` : ""}`;
  }
  return evento.tipo_actividad;
}

function toSpeakers(evento: RawEvento) {
  return (evento.ponentes ?? []).map((p) => ({
    name: p.nombre,
    institution: p.institucion,
    role: "speaker" as const,
  }));
}

function toPapers(evento: RawEvento) {
  return (evento.ponencias ?? []).map((p) => ({
    title: p.titulo,
    authors: p.autores ?? [],
    institution: p.institucion ?? "",
  }));
}

/**
 * Pure transformation: raw Spanish calendar JSON → UI-shaped events.
 * Time-parses nothing — the dataset is the single source of truth.
 */
export function normalizeEvents(calendario: RawCalendario): ConferenceEvent[] {
  const events: ConferenceEvent[] = [];

  for (const day of calendario.programa) {
    for (const evento of day.eventos) {
      events.push({
        id: evento.id,
        date: day.fecha,
        startTime: evento.hora_inicio,
        endTime: evento.hora_fin,
        title: titleFor(evento),
        venueKey: slugify(evento.sala),
        venueLabel: normalizeVenueLabel(evento.sala, evento.lugar),
        activityType: evento.tipo_actividad,
        thematicAxis: evento.eje_tematico ?? "General",
        speakers: toSpeakers(evento),
        papers: toPapers(evento),
      });
    }
  }

  return events;
}

export function normalizeMeta(calendario: RawCalendario): ConferenceMeta {
  return {
    name: calendario.evento,
    edition: calendario.edicion,
    startDate: calendario.fecha_inicio,
    endDate: calendario.fecha_fin,
    venueInstitution: calendario.sede.institucion,
    venueCampus: calendario.sede.campus,
    venueLocation: calendario.sede.lugar,
    days: calendario.programa.map((day) => ({
      date: day.fecha,
      dayName: day.dia,
    })),
  };
}

/** Unique values in dataset order — drives the filter pills. */
export function deriveFilters(events: ConferenceEvent[]): ScheduleDerived {
  const axes = [...new Set(events.map((e) => e.thematicAxis))];
  const activityTypes = [...new Set(events.map((e) => e.activityType))];

  const venueMap = new Map<string, string>();
  for (const event of events) {
    if (!venueMap.has(event.venueKey)) {
      venueMap.set(event.venueKey, event.venueLabel);
    }
  }
  const venues = [...venueMap.entries()].map(([key, label]) => ({ key, label }));

  return { axes, activityTypes, venues };
}