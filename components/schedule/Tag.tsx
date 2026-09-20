"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { colorFor } from "@/lib/schedule/colors";

// ------------------------------------------------------------------
// Primitive: Tag — actionable, accessible, composable
// Follows building-components skill: composability, a11y, data attributes,
// customizability (cn), lightweight, transparency.
// ------------------------------------------------------------------

export interface TagProps extends Omit<React.ComponentProps<"button">, "value"> {
  /** Tag value (e.g. "Salud") */
  value: string;
  /** Visual label, defaults to value */
  label?: string;
  /** Selected/active state — drives data-state + aria-pressed */
  selected?: boolean;
  /** If true, renders as button with toggle behavior; else span */
  interactive?: boolean;
  /** Show remove icon when selected (for ActiveFilters) */
  removable?: boolean;
  /** Called when tag is toggled/removed */
  onTagToggle?: (value: string) => void;
  /** Called when remove icon is clicked (separate from toggle for ActiveFilters) */
  onRemove?: (value: string) => void;
  /** asChild polymorphism — render as child element via Slot */
  asChild?: boolean;
}

/**
 * Tag — composable primitive.
 * - Semantic: renders as <button> when interactive, <span> otherwise
 * - Accessible: aria-pressed, aria-label, keyboard Enter/Space, focus-visible
 * - Data attributes: data-slot="tag", data-state="selected|default", data-interactive
 * - Styling: deterministic colorFor(value) + Tailwind data-[state] variants
 */
export const Tag = React.forwardRef<HTMLButtonElement, TagProps>(
  (
    {
      value,
      label,
      selected = false,
      interactive = true,
      removable = false,
      onTagToggle,
      onRemove,
      asChild = false,
      className,
      children,
      onClick,
      onKeyDown,
      "aria-label": ariaLabel,
      ...props
    },
    ref,
  ) => {
    const displayLabel = label ?? value;
    const colors = colorFor(value);
    const Comp = asChild ? Slot : interactive ? "button" : "span";

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!interactive) return;
      onTagToggle?.(value);
      onClick?.(e);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (!interactive) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onTagToggle?.(value);
      }
      onKeyDown?.(e);
    };

    const handleRemoveClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      onRemove?.(value);
    };

    return (
      <Comp
        ref={ref}
        data-slot="tag"
        data-state={selected ? "selected" : "default"}
        data-interactive={interactive ? "true" : undefined}
        data-value={value}
        aria-pressed={interactive ? selected : undefined}
        aria-label={ariaLabel ?? (interactive ? `${selected ? "Quitar filtro" : "Filtrar por"} ${displayLabel}` : displayLabel)}
        tabIndex={interactive ? 0 : undefined}
        role={interactive && Comp === "span" ? "button" : undefined}
        onClick={interactive ? handleClick : undefined}
        onKeyDown={interactive ? handleKeyDown : undefined}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "data-[state=selected]:shadow-sm data-[state=selected]:border-primary data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground",
          "data-[state=default]:bg-background data-[state=default]:text-foreground data-[state=default]:hover:bg-accent",
          interactive && "cursor-pointer select-none",
          !interactive && "cursor-default",
          !selected && colors.badge,
          className,
        )}
        {...props}
      >
        <span
          aria-hidden="true"
          data-slot="tag-dot"
          className={cn(
            "h-1.5 w-1.5 rounded-full transition-colors",
            selected ? "bg-current" : colors.dot,
          )}
        />
        <span data-slot="tag-label">{children ?? displayLabel}</span>
        {selected && removable && (
          <button
            type="button"
            onClick={handleRemoveClick}
            aria-label={`Quitar ${displayLabel}`}
            data-slot="tag-remove"
            className="p-0.5 rounded hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X aria-hidden="true" data-slot="tag-remove-icon" className="h-3 w-3 opacity-70" />
          </button>
        )}
      </Comp>
    );
  },
);
Tag.displayName = "Tag";

// ------------------------------------------------------------------
// Compound: TagGroup — composable container for tags
// ------------------------------------------------------------------

export interface TagGroupProps extends React.ComponentProps<"div"> {
  /** Accessible label for the group */
  label: string;
}

export function TagGroup({ label, className, children, ...props }: TagGroupProps) {
  return (
    <div
      role="group"
      aria-label={label}
      data-slot="tag-group"
      data-label={label}
      className={cn("flex flex-wrap gap-2", className)}
      {...props}
    >
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

// ------------------------------------------------------------------
// Block: ActiveFiltersBar — delivers value: shows active filters + clear
// ------------------------------------------------------------------

export interface ActiveFiltersBarProps {
  tags: string[];
  buildings: string[];
  venues: string[];
  activityTypes: string[];
  onRemoveTag: (tag: string) => void;
  onRemoveBuilding: (building: string) => void;
  onRemoveVenue: (venue: string) => void;
  onRemoveActivityType: (type: string) => void;
  onClearAll: () => void;
  resultCount: number;
}

export function ActiveFiltersBar({
  tags,
  buildings,
  venues,
  activityTypes,
  onRemoveTag,
  onRemoveBuilding,
  onRemoveVenue,
  onRemoveActivityType,
  onClearAll,
  resultCount,
}: ActiveFiltersBarProps) {
  const hasActive = tags.length > 0 || buildings.length > 0 || venues.length > 0 || activityTypes.length > 0;

  if (!hasActive) return null;

  return (
    <div
      data-slot="active-filters-bar"
      aria-live="polite"
      aria-atomic="true"
      className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm sm:p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Filtros activos · {resultCount} {resultCount === 1 ? "sesión" : "sesiones"}
        </h3>
        <button
          type="button"
          onClick={onClearAll}
          data-slot="active-filters-clear"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md px-2 py-1"
          aria-label="Limpiar todos los filtros"
        >
          <X className="h-3 w-3" aria-hidden="true" />
          Limpiar
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Tag
            key={`active-tag-${tag}`}
            value={tag}
            selected
            removable
            onTagToggle={onRemoveTag}
            aria-label={`Quitar filtro de etiqueta ${tag}`}
            data-slot="active-tag"
          />
        ))}
        {buildings.map((b) => (
          <Tag
            key={`active-building-${b}`}
            value={b}
            label={b}
            selected
            removable
            onTagToggle={onRemoveBuilding}
            aria-label={`Quitar filtro de edificio ${b}`}
            data-slot="active-tag"
          />
        ))}
        {venues.map((v) => (
          <Tag
            key={`active-venue-${v}`}
            value={v}
            selected
            removable
            onTagToggle={onRemoveVenue}
            aria-label={`Quitar filtro de sala ${v}`}
            data-slot="active-tag"
          />
        ))}
        {activityTypes.map((t) => (
          <Tag
            key={`active-type-${t}`}
            value={t}
            selected
            removable
            onTagToggle={onRemoveActivityType}
            aria-label={`Quitar filtro de tipo ${t}`}
            data-slot="active-tag"
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Haz clic en una etiqueta para quitarla. Las etiquetas en las tarjetas también son accionables.
      </p>
    </div>
  );
}
