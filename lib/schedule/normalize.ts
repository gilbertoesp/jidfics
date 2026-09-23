import type {
  ConferenceEvent,
  ConferenceMeta,
  RawCalendario,
  RawEvento,
  ScheduleDerived,
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

/**
 * Single source of truth for the location display format (DDD ubiquitous
 * language): `hall (Edificio X)` — bare hall when the building is unknown.
 */
export function locationLabel(hall: string, building: string): string {
  return building && building !== "Unknown"
    ? `${hall} (Edificio ${building})`
    : hall;
}

/** Building label mapping for human-readable names. */
export function buildingLabel(edificio: string): string {
  const labels: Record<string, string> = {
    "3B": "Centro de Convenciones (Edificio 3B)",
    "1E": "Sala Audiovisual / Danza (Edificio 1E)",
    "1M": "Sala Polivalente (Edificio 1M)",
    "1G": "Sala de Maestría (Edificio 1G)",
    "201D": "Aula 201D (Edificio 201D)",
    "1I": "Sala de Usos Múltiples (Edificio 1I)",
  };
  return labels[edificio] ?? `Edificio ${edificio}`;
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
      // Use tags from JSON, or derive from eje_tematico as fallback. Filter empty strings from split.
      const rawTags = evento.tags;
      const tags =
        rawTags && rawTags.length > 0
          ? rawTags.map((t) => t.trim()).filter(Boolean)
          : evento.eje_tematico
            ? evento.eje_tematico
                .split("/")
                .map((s) => s.trim())
                .filter(Boolean)
            : ["General"];
      const normalizedTags = tags.length > 0 ? tags : ["General"];

      const building = evento.edificio?.trim() || "Unknown";

      events.push({
        id: evento.id,
        date: day.fecha,
        startTime: evento.hora_inicio,
        endTime: evento.hora_fin,
        title: titleFor(evento),
        venueKey: slugify(evento.sala),
        roomName: evento.sala,
        venueLabel: locationLabel(evento.lugar, building),
        venueHall: evento.lugar,
        activityType: evento.tipo_actividad,
        thematicAxis: evento.eje_tematico ?? "General",
        tags: normalizedTags,
        building,
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

  // Collect unique tags from all events
  const tagSet = new Set<string>();
  for (const event of events) {
    for (const tag of event.tags) {
      tagSet.add(tag);
    }
  }
  const tags = [...tagSet].sort((a, b) => a.localeCompare(b, "es"));

  const activityTypes = [...new Set(events.map((e) => e.activityType))];

  const venueMap = new Map<string, string>();
  for (const event of events) {
    if (!venueMap.has(event.venueKey)) {
      // "hall (Edificio X)" via the single formatter — same text as cards.
      venueMap.set(event.venueKey, event.venueLabel);
    }
  }
  const venues = [...venueMap.entries()].map(([key, label]) => ({
    key,
    label,
  }));

  // Unique buildings — filter out Unknown to avoid "Edificio Unknown" tab
  const buildingMap = new Map<string, string>();
  for (const event of events) {
    if (event.building === "Unknown") continue;
    if (!buildingMap.has(event.building)) {
      buildingMap.set(event.building, buildingLabel(event.building));
    }
  }
  const buildings = [...buildingMap.entries()].map(([key, label]) => ({
    key,
    label,
  }));

  return { axes, tags, activityTypes, venues, buildings };
}
