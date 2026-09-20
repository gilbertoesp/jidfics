"use client";

import { useState, useCallback, useMemo } from "react";
import { createSearchEngine, type SearchResult } from "@/lib/schedule/search";
import {
  EMPTY_FILTERS,
  filterEvents,
  hasActiveFilters,
  scheduleSorter,
  type ScheduleFilters,
} from "@/lib/schedule/filter";
import {
  type ConferenceEvent,
  type ConferenceMeta,
} from "@/lib/schedule/types";
import { useCurrentSession } from "@/lib/schedule/hooks/useCurrentSession";

/** Hook for search functionality */
export function useSearch(events: ConferenceEvent[]) {
  const [query, setQueryState] = useState("");
  const [searchEngine] = useState(() => createSearchEngine(events));
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const search = useCallback(
    (searchQuery: string, filters: Partial<ScheduleFilters> = {}) => {
      setQueryState(searchQuery);
      const searchResults = searchEngine.search(searchQuery, filters);
      setResults(searchResults);
    },
    [searchEngine],
  );

  const getSuggestions = useCallback(
    (prefix: string) => {
      if (prefix.length < 2) {
        setSuggestions([]);
        return [];
      }
      const suggs = searchEngine.getSuggestions(prefix, 8);
      setSuggestions(suggs);
      return suggs;
    },
    [searchEngine],
  );

  return {
    query,
    setQuery: search,
    results,
    suggestions,
    searchEngine,
    getSuggestions,
  };
}

/** Hook for filter state management */
export function useScheduleFilters(meta: ConferenceMeta) {
  const [filters, setFilters] = useState<ScheduleFilters>({
    ...EMPTY_FILTERS,
    date: meta.days[0]?.date ?? EMPTY_FILTERS.date,
  });

  const toggleValue = useCallback(
    (selected: string[], value: string): string[] =>
      selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value],
    [],
  );

  const update = useCallback((patch: Partial<ScheduleFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const clearAll = useCallback(() => {
    setFilters({ ...EMPTY_FILTERS, date: filters.date });
  }, [filters.date]);

  const toggleTag = useCallback((tag: string) => {
    setFilters((prev) => ({ ...prev, tags: toggleValue(prev.tags, tag) }));
  }, [toggleValue]);

  const toggleBuilding = useCallback((building: string) => {
    setFilters((prev) => ({ ...prev, buildings: toggleValue(prev.buildings, building) }));
  }, [toggleValue]);

  const toggleVenue = useCallback((venue: string) => {
    setFilters((prev) => ({ ...prev, venues: toggleValue(prev.venues, venue) }));
  }, [toggleValue]);

  const toggleActivityType = useCallback((type: string) => {
    setFilters((prev) => ({ ...prev, activityTypes: toggleValue(prev.activityTypes, type) }));
  }, [toggleValue]);

  const toggleAxis = useCallback((axis: string) => {
    setFilters((prev) => ({ ...prev, axes: toggleValue(prev.axes, axis) }));
  }, [toggleValue]);

  const setDate = useCallback((date: string) => {
    update({ date });
  }, [update]);

  const setSearchQuery = useCallback((searchQuery: string) => {
    update({ searchQuery });
  }, [update]);

  return {
    filters,
    setFilters,
    update,
    clearAll,
    toggleTag,
    toggleBuilding,
    toggleVenue,
    toggleActivityType,
    toggleAxis,
    setDate,
    setSearchQuery,
    hasActive: hasActiveFilters(filters),
  };
}

/** Hook for live session tracking */
export function useLiveSessions(events: ConferenceEvent[]) {
  const {
    liveNow,
    upNext,
    liveByHall,
    upNextByHall,
    currentTime,
    isTimeTravel,
    isWithinConferenceDates,
    setTimeTravel,
    advanceMinutes,
  } = useCurrentSession({ events });

  const getLiveStatus = useCallback(
    (event: ConferenceEvent): "live" | "up-next" | "idle" => {
      if (liveNow.some((e) => e.id === event.id)) return "live";
      if (upNext.some((e) => e.id === event.id)) return "up-next";
      return "idle";
    },
    [liveNow, upNext],
  );

  return {
    liveNow,
    upNext,
    liveByHall,
    upNextByHall,
    currentTime,
    isTimeTravel,
    isWithinConferenceDates,
    setTimeTravel,
    advanceMinutes,
    getLiveStatus,
  };
}

/** Hook for view management */
export function useScheduleView() {
  const [view, setView] = useState<"grid" | "timeline">("grid");
  return { view, setView };
}

/** Hook for chat/sidebar state */
export function useChatState() {
  const [chatEvent, setChatEvent] = useState<ConferenceEvent | null>(null);
  const openChat = useCallback((event: ConferenceEvent) => setChatEvent(event), []);
  const closeChat = useCallback(() => setChatEvent(null), []);
  return { chatEvent, openChat, closeChat };
}

/** Hook for floating bar dismissal */
export function useFloatingBar() {
  const [dismissed, setDismissed] = useState(false);
  const dismiss = useCallback(() => setDismissed(true), []);
  return { dismissed, dismiss };
}

/** Main schedule logic hook - combines everything */
export function useScheduleApp(events: ConferenceEvent[], meta: ConferenceMeta) {
  const filtersHook = useScheduleFilters(meta);
  const liveHook = useLiveSessions(events);
  const viewHook = useScheduleView();
  const chatHook = useChatState();
  const barHook = useFloatingBar();

  // Combine search with filters
  const searchHook = useSearch(events);

  // Memoized filtered events using search engine when query exists, otherwise use filterEvents
  const filteredEvents = useMemo(() => {
    const { searchQuery, ...otherFilters } = filtersHook.filters;
    if (searchQuery.trim()) {
      // Use search engine with combined filters
      const searchResults = searchHook.searchEngine.search(searchQuery, {
        date: otherFilters.date,
        axes: otherFilters.axes,
        tags: otherFilters.tags,
        buildings: otherFilters.buildings,
        activityTypes: otherFilters.activityTypes,
        venues: otherFilters.venues,
      });
      return searchResults.map((r) => r.event).sort(scheduleSorter);
    }
    // Fallback to simple filterEvents for non-search filtering
    return filterEvents(events, filtersHook.filters).sort(scheduleSorter);
  }, [events, filtersHook.filters, searchHook.searchEngine]);

  const activeDay = meta.days.find((day) => day.date === filtersHook.filters.date);

  // Scroll to event helper
  const scrollToEvent = useCallback((eventId: string) => {
    const element = document.getElementById(eventId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.focus({ preventScroll: true });
    }
  }, []);

  return {
    // State
    filters: filtersHook.filters,
    view: viewHook.view,
    chatEvent: chatHook.chatEvent,
    barDismissed: barHook.dismissed,
    activeDay,
    filteredEvents,

    // Actions
    setFilters: filtersHook.setFilters,
    updateFilters: filtersHook.update,
    clearFilters: filtersHook.clearAll,
    toggleTag: filtersHook.toggleTag,
    toggleBuilding: filtersHook.toggleBuilding,
    toggleVenue: filtersHook.toggleVenue,
    toggleActivityType: filtersHook.toggleActivityType,
    toggleAxis: filtersHook.toggleAxis,
    setDate: filtersHook.setDate,
    setSearchQuery: filtersHook.setSearchQuery,
    setView: viewHook.setView,
    openChat: chatHook.openChat,
    closeChat: chatHook.closeChat,
    dismissBar: barHook.dismiss,
    scrollToEvent,

    // Search
    searchQuery: searchHook.query,
    searchResults: searchHook.results,
    searchSuggestions: searchHook.suggestions,
    search: searchHook.setQuery,
    getSuggestions: searchHook.getSuggestions,

    // Live sessions
    ...liveHook,
    hasActiveFilters: filtersHook.hasActive,
  };
}

export type { ScheduleFilters } from "@/lib/schedule/filter";