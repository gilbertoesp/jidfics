/* ------------------------------------------------------------------ */
/* Raw dataset shape (calendario_vii_jidfics.json as shipped)        */
/* ------------------------------------------------------------------ */

export interface RawPonente {
  nombre: string;
  institucion: string;
}

export interface RawPonencia {
  titulo: string;
  autores: string[];
  institucion: string;
}

/** Session-level event (conferencia, inauguración, conversatorio…). */
export interface RawEventoSesion {
  id: string;
  hora_inicio: string;
  hora_fin: string;
  tipo_actividad: string;
  titulo: string;
  lugar: string;
  sala: string;
  edificio: string;
  ponentes?: RawPonente[];
  eje_tematico?: string;
  tags?: string[];
  ponencias?: undefined;
  mesa_numero?: undefined;
}

/** Mesa (Trabajos Libres / Carteles / Posgrados) holding multiple papers. */
export interface RawEventoMesa {
  id: string;
  hora_inicio: string;
  hora_fin: string;
  tipo_actividad: string;
  titulo?: string;
  lugar: string;
  sala: string;
  edificio: string;
  ponentes?: RawPonente[];
  eje_tematico?: string;
  tags?: string[];
  ponencias?: RawPonencia[];
  mesa_numero?: number;
}

export type RawEvento = RawEventoSesion | RawEventoMesa;

export interface RawDia {
  fecha: string; // YYYY-MM-DD
  dia: string; // Miércoles / Jueves
  eventos: RawEvento[];
}

export interface RawSede {
  institucion: string;
  campus: string;
  lugar: string;
}

export interface RawCalendario {
  evento: string;
  edicion: string;
  fecha_inicio: string;
  fecha_fin: string;
  sede: RawSede;
  programa: RawDia[];
}

/* ------------------------------------------------------------------ */
/* Normalized shape consumed by the UI                                 */
/* ------------------------------------------------------------------ */

export interface Speaker {
  name: string;
  institution: string;
  role: "speaker" | "moderator" | "chair";
}

export interface Paper {
  title: string;
  authors: string[];
  institution: string;
}

export interface ConferenceEvent {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  title: string;
  /** Normalized room key (e.g. "sala-1", "sala-de-danza", "aula-201d"). */
  venueKey: string;
  /** Human label, e.g. "Sala 1 · Centro de Convenciones". */
  venueLabel: string;
  /** Raw `tipo_actividad` — dynamic, dataset-driven. */
  activityType: string;
  /** Raw `eje_tematico` — dynamic, dataset-driven. */
  thematicAxis: string;
  /** Individual thematic tags derived from `eje_tematico` (split on "/"). */
  tags: string[];
  /** Building identifier (e.g. "3B", "1E", "1M", "1G", "201D", "1I"). */
  building: string;
  speakers: Speaker[];
  papers: Paper[];
}

export interface ConferenceMeta {
  name: string;
  edition: string;
  startDate: string;
  endDate: string;
  venueInstitution: string;
  venueCampus: string;
  venueLocation: string;
  /** One entry per day: { date, dayName }. */
  days: { date: string; dayName: string }[];
}

export interface ScheduleDerived {
  /** Unique thematic axes in dataset order. */
  axes: string[];
  /** Unique thematic tags in dataset order. */
  tags: string[];
  /** Unique activity types in dataset order. */
  activityTypes: string[];
  /** Unique venue keys + labels. */
  venues: { key: string; label: string }[];
  /** Unique buildings in dataset order. */
  buildings: { key: string; label: string }[];
}

/** Short human label for tab switcher (derived from day + date). */
export function dayLabel(dayName: string, date: string): string {
  const [, month, day] = date.split("-");
  const monthNames = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  return `${dayName} ${Number(day)} de ${monthNames[Number(month) - 1]}`;
}