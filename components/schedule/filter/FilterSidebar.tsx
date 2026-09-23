"use client";

/**
 * FilterSidebar — composable BLOCK (building-components taxonomy).
 *
 * Replaces the former inline FilterSection of ScheduleApp. Structure:
 *
 *   FilterSidebar (search + results + global clear)
 *   └── Accordion[type=multiple] (all open by default)
 *       ├── FilterGroup[category=type]    "Tipo de actividad" (14 presentation modes)
 *       ├── FilterGroup[category=location] "Ubicaciones" → salas + edificios
 *       └── FilterGroup[category=topic]   "Temas" → etiquetas temáticas
 *
 * All grouping/sorting/counting logic is delegated to the pure module
 * `lib/schedule/tags.ts` (single ordering authority, independently sorted
 * per category). State stays controlled by the caller.
 *
 * A11y: section aria-label="Filtros del programa"; role=group fieldsets in
 * Spanish; accordion triggers expose aria-expanded (Radix roving keys);
 * result count role=status aria-live=polite.
 * data-slot: filter-sidebar
 */

import { Search, X } from "lucide-react";
import { useMemo } from "react";
import { FilterGroup } from "@/components/schedule/filter/FilterGroup";
import { Tag, TagGroup } from "@/components/schedule/Tag";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { hasActiveFilters, type ScheduleFilters } from "@/lib/schedule/filter";
import { categorizeDerived, countSelectedCategory } from "@/lib/schedule/tags";
import type {
  ScheduleDerived,
  TagCategory,
  TagOption,
} from "@/lib/schedule/types";

export interface FilterSidebarProps {
  filters: ScheduleFilters;
  derived: ScheduleDerived;
  resultCount: number;
  onSearchChange: (query: string) => void;
  onToggleTag: (tag: string) => void;
  onToggleActivityType: (type: string) => void;
  onToggleVenue: (venue: string) => void;
  onToggleBuilding: (building: string) => void;
  /** Clears every facet (keeps date + search query). */
  onClear: () => void;
  /** Clears one category's facets (tags+activityTypes | venues+buildings). */
  onClearCategory: (category: TagCategory) => void;
}

function FilterTag({
  option,
  category,
  selected,
  onToggle,
  ariaPrefix,
}: {
  option: TagOption;
  category: TagCategory;
  selected: boolean;
  onToggle: (value: string) => void;
  ariaPrefix: string;
}) {
  return (
    <Tag
      value={option.value}
      label={option.label}
      category={category}
      selected={selected}
      onTagToggle={onToggle}
      aria-label={`${selected ? "Quitar filtro" : ariaPrefix} ${option.label}`}
      className="min-h-9 w-full justify-start px-3 py-1.5 text-sm"
    >
      {option.label}
    </Tag>
  );
}

export function FilterSidebar({
  filters,
  derived,
  resultCount,
  onSearchChange,
  onToggleTag,
  onToggleActivityType,
  onToggleVenue,
  onToggleBuilding,
  onClear,
  onClearCategory,
}: FilterSidebarProps) {
  const categorized = useMemo(() => categorizeDerived(derived), [derived]);

  // Per-category selection / option totals (tags.ts is the single authority)
  const typeCount = countSelectedCategory("type", filters);
  const topicCount = countSelectedCategory("topic", filters);
  const locationCount = countSelectedCategory("location", filters);
  const typeTotal = categorized.type.activityTypes.length;
  const topicTotal = categorized.topic.tags.length;
  const locationTotal =
    categorized.location.tags.length +
    categorized.location.venues.length +
    categorized.location.buildings.length;

  return (
    <section
      aria-label="Filtros del programa"
      data-slot="filter-sidebar"
      className="flex flex-col gap-5"
    >
      {/* Search */}
      <div className="relative">
        <Label htmlFor="schedule-search" className="sr-only">
          Buscar sesiones
        </Label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id="schedule-search"
          type="search"
          placeholder="Buscar por título, ponente, autor o institución…"
          value={filters.searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
          autoComplete="off"
          autoFocus
        />
      </div>

      <Separator />

      {/* Three collapsible groups — requested order: type, location, topic */}
      <Accordion type="multiple" defaultValue={["type", "location", "topic"]}>
        {/* Type category: how the research is presented (facet-backed) */}
        <FilterGroup
          category="type"
          title="Tipo de actividad"
          selectedCount={typeCount}
          totalCount={typeTotal}
          onClear={() => onClearCategory("type")}
        >
          <TagGroup label="Opciones de tipo">
            {categorized.type.activityTypes.map((option) => (
              <FilterTag
                key={option.value}
                option={option}
                category="type"
                selected={filters.activityTypes.includes(option.value)}
                onToggle={onToggleActivityType}
                ariaPrefix="Filtrar por tipo"
              />
            ))}
          </TagGroup>
        </FilterGroup>

        {/* Location category: location-like tags + venues + buildings */}
        <FilterGroup
          category="location"
          title="Ubicaciones"
          selectedCount={locationCount}
          totalCount={locationTotal}
          onClear={() => onClearCategory("location")}
        >
          {categorized.location.tags.length > 0 && (
            <TagGroup label="Etiquetas de ubicación">
              {categorized.location.tags.map((option) => (
                <FilterTag
                  key={option.value}
                  option={option}
                  category="location"
                  selected={filters.tags.includes(option.value)}
                  onToggle={onToggleTag}
                  ariaPrefix="Filtrar por etiqueta"
                />
              ))}
            </TagGroup>
          )}

          <TagGroup label="Sala / Lugar">
            {categorized.location.venues.map((option) => (
              <FilterTag
                key={option.value}
                option={option}
                category="location"
                selected={filters.venues.includes(option.value)}
                onToggle={onToggleVenue}
                ariaPrefix="Filtrar por sala"
              />
            ))}
          </TagGroup>

          <TagGroup label="Edificio">
            {categorized.location.buildings.map((option) => (
              <FilterTag
                key={option.value}
                option={option}
                category="location"
                selected={filters.buildings.includes(option.value)}
                onToggle={onToggleBuilding}
                ariaPrefix="Filtrar por edificio"
              />
            ))}
          </TagGroup>
        </FilterGroup>

        {/* Topic category: thematic research tags only */}
        <FilterGroup
          category="topic"
          title="Temas"
          selectedCount={topicCount}
          totalCount={topicTotal}
          onClear={() => onClearCategory("topic")}
        >
          <TagGroup label="Etiquetas">
            {categorized.topic.tags.map((option) => (
              <FilterTag
                key={option.value}
                option={option}
                category="topic"
                selected={filters.tags.includes(option.value)}
                onToggle={onToggleTag}
                ariaPrefix="Filtrar por etiqueta"
              />
            ))}
          </TagGroup>
        </FilterGroup>
      </Accordion>

      <Separator />

      {/* Results count + global clear */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          role="status"
          aria-live="polite"
          className="text-sm text-muted-foreground"
        >
          {resultCount} {resultCount === 1 ? "sesión" : "sesiones"} encontradas
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClear}
          className="gap-1.5"
          disabled={!hasActiveFilters(filters)}
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Limpiar filtros
        </Button>
      </div>
    </section>
  );
}
