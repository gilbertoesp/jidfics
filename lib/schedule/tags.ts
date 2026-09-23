/**
 * Tag categorization utilities — pure, side-effect free.
 *
 * Contract (builder context, en):
 *  - Every filter option belongs to exactly one `TagCategory`:
 *    "type" (tipo_actividad: how research is presented — facet-backed only) |
 *    "topic" (ejes temáticos) | "location" (salas, edificios).
 *  - Classification of free text = keyword heuristic (word-boundary,
 *    diacritic/case-insensitive) with an injectable manual-override map;
 *    heuristic only ever emits topic|location ("type" comes from the facet).
 *  - Sorting is independent per category:
 *    type/topic → alphabetical, `es` locale (accents respected)
 *    location   → numeric-aware (room/building number padded, then alpha).
 *  - Counts/clears operate per category over `ScheduleFilters` and never mutate.
 *
 * Keyboard map: none (utility — non-visual).
 * data-slot surface: consumed by `components/schedule/filter/*` only.
 */

import type { ScheduleFilters } from "@/lib/schedule/filter";
import type {
  ScheduleDerived,
  TagCategory,
  TagOption,
} from "@/lib/schedule/types";

export type { TagCategory, TagOption } from "@/lib/schedule/types";

/* ------------------------------------------------------------------ */
/* Classification                                                      */
/* ------------------------------------------------------------------ */

/** Word-boundary location keywords (Sala, Aula, …) — matched on normalized text. */
export const LOCATION_KEYWORDS: readonly string[] = [
  "sala",
  "aula",
  "auditorio",
  "edificio",
  "planta",
  "piso",
  "lugar",
];

/**
 * Manual classification overrides keyed by the normalized tag value
 * (lowercase, diacritics stripped). Wins over LOCATION_KEYWORDS.
 * TODO(data): add edge cases here as organizers refine venue naming.
 */
export const TAG_CATEGORY_OVERRIDES: Record<string, TagCategory> = {};

function normalizeForMatch(value: string): string {
  return value
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Classify a tag as "location" or "topic".
 * @param tag Raw tag/label text (Spanish content).
 * @param overrides Normalized-key override map; defaults to TAG_CATEGORY_OVERRIDES.
 */
export function categorizeTag(
  tag: string,
  overrides: Record<string, TagCategory> = TAG_CATEGORY_OVERRIDES,
): TagCategory {
  const normalized = normalizeForMatch(tag);
  // Overrides are matched on normalized keys (accents/case-insensitive both sides).
  for (const [key, value] of Object.entries(overrides)) {
    if (normalizeForMatch(key) === normalized) return value;
  }

  for (const keyword of LOCATION_KEYWORDS) {
    // Word-boundary match so "salado" never matches "sala".
    const pattern = new RegExp(`(?:^|[^a-z0-9])${keyword}(?:$|[^a-z0-9])`);
    if (pattern.test(normalized)) return "location";
  }
  return "topic";
}

/* ------------------------------------------------------------------ */
/* Sorting                                                             */
/* ------------------------------------------------------------------ */

function sortKeyFor(label: string): string {
  // Room labels embed "(Edificio 1E)" — building digits must not outrank the
  // room number, so digit extraction ignores the parenthesized suffix.
  const base = label.replace(/\s*\([^)]*\)/g, "");
  const digits = base.match(/\d+/g) ?? [];
  const padded = digits.map((d) => d.padStart(6, "0")).join("");
  return padded + normalizeForMatch(label);
}

/** Numeric-aware ascending comparator for location options. */
function compareLocation(a: TagOption, b: TagOption): number {
  if (a.sortKey < b.sortKey) return -1;
  if (a.sortKey > b.sortKey) return 1;
  return a.label.localeCompare(b.label, "es");
}

/** Alphabetical (es) comparator for topic options. */
function compareTopic(a: TagOption, b: TagOption): number {
  return a.label.localeCompare(b.label, "es");
}

/** Independent per-category sorting — the single ordering authority. */
export function compareTagOptions(a: TagOption, b: TagOption): number {
  return a.category === "location" && b.category === "location"
    ? compareLocation(a, b)
    : compareTopic(a, b);
}

/* ------------------------------------------------------------------ */
/* TagOptions                                                          */
/* ------------------------------------------------------------------ */

export type TagInput = string | { value: string; label?: string };

/**
 * Build sorted TagOptions from raw values/labels.
 * @param category Forces one category (facet-backed lists); omitted = classified per value.
 */
export function toTagOptions(
  inputs: readonly TagInput[],
  category?: TagCategory,
): TagOption[] {
  const options: TagOption[] = inputs.map((input) => {
    const value = typeof input === "string" ? input : input.value;
    const label =
      (typeof input === "string" ? undefined : input.label) ?? value;
    const resolved: TagCategory = category ?? categorizeTag(value);
    return { value, label, category: resolved, sortKey: sortKeyFor(label) };
  });
  return options.sort(compareTagOptions);
}

/** Split raw tag texts by category, preserving input order within each. */
export function splitTagsByCategory(tags: readonly string[]): {
  topic: string[];
  location: string[];
} {
  const topic: string[] = [];
  const location: string[] = [];
  for (const tag of tags) {
    (categorizeTag(tag) === "location" ? location : topic).push(tag);
  }
  return { topic, location };
}

/* ------------------------------------------------------------------ */
/* Derived facets → categorized structure                              */
/* ------------------------------------------------------------------ */

export interface CategorizedDerived {
  type: { activityTypes: TagOption[] };
  topic: { tags: TagOption[] };
  location: { tags: TagOption[]; venues: TagOption[]; buildings: TagOption[] };
}

/** Group + sort every derived facet by category (sidebar input). */
export function categorizeDerived(
  derived: ScheduleDerived,
): CategorizedDerived {
  const { topic: topicTags, location: locationTags } = splitTagsByCategory(
    derived.tags,
  );
  return {
    type: {
      activityTypes: toTagOptions(
        derived.activityTypes.map((t) => ({ value: t })),
        "type",
      ),
    },
    topic: {
      tags: toTagOptions(topicTags, "topic"),
    },
    location: {
      tags: toTagOptions(locationTags, "location"),
      venues: toTagOptions(
        derived.venues.map((v) => ({ value: v.key, label: v.label })),
        "location",
      ),
      buildings: toTagOptions(
        derived.buildings.map((b) => ({ value: b.key, label: b.label })),
        "location",
      ),
    },
  };
}

/* ------------------------------------------------------------------ */
/* Selection counts + per-category clear (pure reducers)               */
/* ------------------------------------------------------------------ */

function facetValues(
  category: TagCategory,
  filters: ScheduleFilters,
): string[] {
  if (category === "type") return filters.activityTypes;
  if (category === "location") return [...filters.venues, ...filters.buildings];
  return filters.tags; // topic
}

/** Selected count per category (activityTypes | tags | venues+buildings). */
export function countSelectedCategory(
  category: TagCategory,
  filters: ScheduleFilters,
): number {
  return facetValues(category, filters).length;
}

/** Return new filters with only `category` facets emptied (never mutates). */
export function clearCategory(
  category: TagCategory,
  filters: ScheduleFilters,
): ScheduleFilters {
  if (category === "type") return { ...filters, activityTypes: [] };
  if (category === "location") return { ...filters, venues: [], buildings: [] };
  return { ...filters, tags: [] }; // topic
}
