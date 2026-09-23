import type { ConferenceEvent } from "@/lib/schedule/types";

/** Spanish text normalization: lowercase, remove diacritics, handle ñ */
export function normalizeSpanish(text: string): string {
  return text
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n")
    .trim();
}

/** Levenshtein distance for fuzzy matching */
export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Initialize matrix with first row (0..a.length) and first column (0..b.length)
  const matrix = Array.from({ length: b.length + 1 }, (_, i) =>
    Array.from({ length: a.length + 1 }, (_, j) => (i === 0 ? j : i)),
  );

  for (let i = 1; i <= b.length; i++) {
    matrix[i][0] = i;
  }
  for (let j = 1; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + 1, // substitution
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/** Field weights for ranking (higher = more important) */
const FIELD_WEIGHTS = {
  title: 10,
  speakerName: 9,
  speakerInstitution: 6,
  tag: 8,
  thematicAxis: 7,
  paperTitle: 7,
  paperAuthor: 6,
  paperInstitution: 5,
  venue: 5,
  building: 4,
} as const;

type FieldName = keyof typeof FIELD_WEIGHTS;

/** Indexed term with its locations and weights */
interface IndexedTerm {
  term: string;
  locations: Map<string, Map<FieldName, number>>; // eventId -> field -> count
}

/** Search result with score and highlights */
export interface SearchResult {
  event: ConferenceEvent;
  score: number;
  highlights: string[];
  matchedFields: FieldName[];
}

/** Search filters */
export interface SearchFilters {
  date?: string;
  tags?: string[];
  buildings?: string[];
  activityTypes?: string[];
  venues?: string[];
}

/** Inverted index search engine */
export class SearchEngine {
  private index = new Map<string, IndexedTerm>();
  private events: ConferenceEvent[];
  private eventMap: Map<string, ConferenceEvent>;
  private allTerms: string[] = [];
  private maxEditDistance = 2;

  constructor(events: ConferenceEvent[]) {
    this.events = events;
    this.eventMap = new Map(events.map((e) => [e.id, e]));
    this.buildIndex();
    this.allTerms = Array.from(this.index.keys()).sort();
  }

  /** Build inverted index from all events */
  private buildIndex(): void {
    for (const event of this.events) {
      this.indexEvent(event);
    }
  }

  /** Index a single event */
  private indexEvent(event: ConferenceEvent): void {
    const addTerm = (term: string, field: FieldName): void => {
      const normalized = normalizeSpanish(term);
      if (!normalized) return;

      let indexed = this.index.get(normalized);
      if (!indexed) {
        indexed = { term: normalized, locations: new Map() };
        this.index.set(normalized, indexed);
      }

      let eventLocations = indexed.locations.get(event.id);
      if (!eventLocations) {
        eventLocations = new Map();
        indexed.locations.set(event.id, eventLocations);
      }

      eventLocations.set(field, (eventLocations.get(field) ?? 0) + 1);
    };

    // Title - highest weight
    for (const word of this.tokenize(event.title)) {
      addTerm(word, "title");
    }

    // Speakers
    for (const speaker of event.speakers) {
      for (const word of this.tokenize(speaker.name)) {
        addTerm(word, "speakerName");
      }
      for (const word of this.tokenize(speaker.institution)) {
        addTerm(word, "speakerInstitution");
      }
    }

    // Tags
    for (const tag of event.tags) {
      for (const word of this.tokenize(tag)) {
        addTerm(word, "tag");
      }
    }

    // Thematic axis
    for (const word of this.tokenize(event.thematicAxis)) {
      addTerm(word, "thematicAxis");
    }

    // Papers
    for (const paper of event.papers) {
      for (const word of this.tokenize(paper.title)) {
        addTerm(word, "paperTitle");
      }
      for (const author of paper.authors) {
        for (const word of this.tokenize(author)) {
          addTerm(word, "paperAuthor");
        }
      }
      if (paper.institution) {
        for (const word of this.tokenize(paper.institution)) {
          addTerm(word, "paperInstitution");
        }
      }
    }

    // Venue label + room (rooms stay searchable without a label prefix)
    for (const word of this.tokenize(event.venueLabel)) {
      addTerm(word, "venue");
    }
    for (const word of this.tokenize(event.roomName)) {
      addTerm(word, "venue");
    }

    // Building
    for (const word of this.tokenize(event.building)) {
      addTerm(word, "building");
    }
  }

  /** Simple tokenizer - split on non-word chars, keep meaningful tokens */
  private tokenize(text: string): string[] {
    return text
      .split(/[\s\p{Punctuation}]+/u)
      .map((w) => w.trim())
      .filter((w) => w.length >= 2); // Skip very short tokens
  }

  /** Get index statistics */
  getIndexStats() {
    let totalLocations = 0;
    for (const term of this.index.values()) {
      for (const loc of term.locations.values()) {
        totalLocations += loc.size;
      }
    }
    return {
      totalDocuments: this.events.length,
      uniqueTerms: this.index.size,
      totalLocations,
    };
  }

  /** Main search entry point */
  search(query: string, filters: SearchFilters = {}): SearchResult[] {
    const normalizedQuery = normalizeSpanish(query).trim();

    if (!normalizedQuery) {
      // Empty query - return all events (filtered by date if specified)
      return this.applyFilters(this.events, filters).map((event) => ({
        event,
        score: 1,
        highlights: [],
        matchedFields: [],
      }));
    }

    const queryTerms = this.tokenize(normalizedQuery);
    if (queryTerms.length === 0) {
      return this.applyFilters(this.events, filters).map((event) => ({
        event,
        score: 1,
        highlights: [],
        matchedFields: [],
      }));
    }

    // Find candidate events for each query term
    const candidateScores = new Map<string, Map<FieldName, number>>();

    for (const qTerm of queryTerms) {
      // Exact matches
      const exactTerm = this.index.get(qTerm);
      if (exactTerm) {
        for (const [eventId, fields] of exactTerm.locations) {
          let eventFields = candidateScores.get(eventId);
          if (!eventFields) {
            eventFields = new Map();
            candidateScores.set(eventId, eventFields);
          }
          for (const [field, count] of fields) {
            eventFields.set(
              field,
              (eventFields.get(field) ?? 0) + count * FIELD_WEIGHTS[field],
            );
          }
        }
      }

      // Fuzzy matches (only if query term is long enough)
      if (qTerm.length >= 4) {
        for (const [indexedTerm, indexed] of this.index) {
          if (indexedTerm === qTerm) continue; // Skip exact match
          const distance = levenshteinDistance(qTerm, indexedTerm);
          if (distance <= this.maxEditDistance && distance > 0) {
            const fuzzyWeight = 1 - distance / (this.maxEditDistance + 1); // 0.66 to 0.33
            for (const [eventId, fields] of indexed.locations) {
              let eventFields = candidateScores.get(eventId);
              if (!eventFields) {
                eventFields = new Map();
                candidateScores.set(eventId, eventFields);
              }
              for (const [field, count] of fields) {
                eventFields.set(
                  field,
                  (eventFields.get(field) ?? 0) +
                    count * FIELD_WEIGHTS[field] * fuzzyWeight,
                );
              }
            }
          }
        }
      }

      // Prefix matches (for autocomplete-like behavior)
      for (const [indexedTerm, indexed] of this.index) {
        if (indexedTerm.startsWith(qTerm) && indexedTerm !== qTerm) {
          const prefixWeight = 0.5;
          for (const [eventId, fields] of indexed.locations) {
            let eventFields = candidateScores.get(eventId);
            if (!eventFields) {
              eventFields = new Map();
              candidateScores.set(eventId, eventFields);
            }
            for (const [field, count] of fields) {
              eventFields.set(
                field,
                (eventFields.get(field) ?? 0) +
                  count * FIELD_WEIGHTS[field] * prefixWeight,
              );
            }
          }
        }
      }
    }

    // Convert to results with scores
    const results: SearchResult[] = [];

    for (const [eventId, fields] of candidateScores) {
      const event = this.eventMap.get(eventId);
      if (!event) continue;

      // Apply filters
      if (!this.matchesFilters(event, filters)) continue;

      // Calculate total score
      let totalScore = 0;
      const matchedFields: FieldName[] = [];
      for (const [field, score] of fields) {
        totalScore += score;
        matchedFields.push(field);
      }

      // Normalize score (roughly 0-1 range)
      const normalizedScore = Math.min(1, totalScore / 50);

      // Generate highlights
      const highlights = this.generateHighlights(
        event,
        queryTerms,
        matchedFields,
      );

      results.push({
        event,
        score: normalizedScore,
        highlights,
        matchedFields,
      });
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return results;
  }

  /** Check if event matches filters */
  private matchesFilters(
    event: ConferenceEvent,
    filters: SearchFilters,
  ): boolean {
    if (filters.date && event.date !== filters.date) return false;
    if (
      filters.tags?.length &&
      !filters.tags.some((t) => event.tags.includes(t))
    )
      return false;
    if (
      filters.buildings?.length &&
      !filters.buildings.includes(event.building)
    )
      return false;
    if (
      filters.activityTypes?.length &&
      !filters.activityTypes.includes(event.activityType)
    )
      return false;
    if (filters.venues?.length && !filters.venues.includes(event.venueKey))
      return false;
    return true;
  }

  /** Apply filters without search */
  private applyFilters(
    events: ConferenceEvent[],
    filters: SearchFilters,
  ): ConferenceEvent[] {
    return events.filter((e) => this.matchesFilters(e, filters));
  }

  /** Generate highlighted snippets for matched terms */
  private generateHighlights(
    event: ConferenceEvent,
    queryTerms: string[],
    matchedFields: FieldName[],
  ): string[] {
    const highlights: string[] = [];
    const allQueryTerms = new Set(queryTerms);

    // Helper to highlight a text
    const highlightText = (text: string, maxLen = 120): string => {
      let result = text;
      // Sort terms by length descending to avoid partial replacements
      const sortedTerms = [...allQueryTerms].sort(
        (a, b) => b.length - a.length,
      );
      for (const term of sortedTerms) {
        const regex = new RegExp(`(${term})`, "gi");
        result = result.replace(regex, "**$1**");
      }
      if (result.length > maxLen) {
        // Find first highlight and center around it
        const firstMark = result.indexOf("**");
        if (firstMark >= 0) {
          const start = Math.max(0, firstMark - 40);
          result = `...${result.slice(start, start + maxLen)}...`;
        } else {
          result = `${result.slice(0, maxLen)}...`;
        }
      }
      return result;
    };

    // Title highlights
    if (matchedFields.includes("title")) {
      highlights.push(`Título: ${highlightText(event.title)}`);
    }

    // Speaker highlights
    if (
      matchedFields.includes("speakerName") ||
      matchedFields.includes("speakerInstitution")
    ) {
      for (const speaker of event.speakers) {
        const speakerText = `${speaker.name} (${speaker.institution})`;
        if (queryTerms.some((t) => normalizeSpanish(speakerText).includes(t))) {
          highlights.push(`Ponente: ${highlightText(speakerText)}`);
        }
      }
    }

    // Tag highlights
    if (
      matchedFields.includes("tag") ||
      matchedFields.includes("thematicAxis")
    ) {
      const tagText = event.tags.join(", ");
      if (queryTerms.some((t) => normalizeSpanish(tagText).includes(t))) {
        highlights.push(`Etiquetas: ${highlightText(tagText)}`);
      }
      const axisText = event.thematicAxis;
      if (queryTerms.some((t) => normalizeSpanish(axisText).includes(t))) {
        highlights.push(`Eje: ${highlightText(axisText)}`);
      }
    }

    // Paper highlights
    if (
      matchedFields.includes("paperTitle") ||
      matchedFields.includes("paperAuthor")
    ) {
      for (const paper of event.papers) {
        const paperText = `${paper.title} - ${paper.authors.join(", ")}`;
        if (queryTerms.some((t) => normalizeSpanish(paperText).includes(t))) {
          highlights.push(`Ponencia: ${highlightText(paperText)}`);
        }
      }
    }

    // Venue/Building highlights
    if (matchedFields.includes("venue") || matchedFields.includes("building")) {
      const locText = event.venueLabel;
      if (queryTerms.some((t) => normalizeSpanish(locText).includes(t))) {
        highlights.push(`Lugar: ${highlightText(locText)}`);
      }
    }

    return highlights.slice(0, 3); // Limit highlights
  }

  /** Get autocomplete suggestions */
  getSuggestions(prefix: string, max = 10): string[] {
    const normalized = normalizeSpanish(prefix).trim();
    if (!normalized || normalized.length < 2) return [];

    const suggestions: string[] = [];
    for (const term of this.allTerms) {
      if (term.startsWith(normalized)) {
        suggestions.push(term);
        if (suggestions.length >= max) break;
      }
    }
    return suggestions;
  }

  /** Get all events for a date (for empty query) */
  getEventsForDate(date: string): ConferenceEvent[] {
    return this.events.filter((e) => e.date === date);
  }
}

/** Create search engine from normalized events */
export function createSearchEngine(events: ConferenceEvent[]): SearchEngine {
  return new SearchEngine(events);
}
