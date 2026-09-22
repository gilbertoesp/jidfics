"use client";

/**
 * FilterGroup — styled COMPONENT (building-components taxonomy).
 *
 * One section of the filter sidebar per TagCategory. Owns no state:
 * the caller supplies counts + clear callback (controlled pattern).
 *
 * Props API:
 *  - category     : "topic" | "location" → exposed as data-category
 *  - title        : Spanish section header (content context)
 *  - selectedCount/totalCount : header counter "n/total" (aria-live polite)
 *  - onClear      : per-category clear; button disabled at 0 selected
 *
 * A11y: role="group" + aria-label=title; clear button aria-label="Limpiar {title}".
 * data-slot: filter-group | filter-group-header | filter-group-count
 */

import * as React from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { TagCategory } from "@/lib/schedule/types";
import { cn } from "@/lib/utils";

export interface FilterGroupProps
  extends Omit<React.ComponentProps<"fieldset">, "title"> {
  category: TagCategory;
  /** Spanish header text (content context). */
  title: string;
  selectedCount: number;
  totalCount: number;
  onClear: () => void;
}

export function FilterGroup({
  category,
  title,
  selectedCount,
  totalCount,
  onClear,
  className,
  children,
  ...props
}: FilterGroupProps) {
  return (
    <fieldset
      aria-label={title}
      data-slot="filter-group"
      data-category={category}
      className={cn("flex flex-col gap-3", className)}
      {...props}
    >
      <div
        data-slot="filter-group-header"
        className="flex items-center justify-between gap-2"
      >
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
        <div className="flex items-center gap-1.5">
          <span
            data-slot="filter-group-count"
            aria-live="polite"
            className="text-xs tabular-nums text-muted-foreground"
          >
            {selectedCount}/{totalCount}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={selectedCount === 0}
            aria-label={`Limpiar ${title}`}
            className="h-7 gap-1 px-2 text-xs"
          >
            <X className="h-3 w-3" aria-hidden="true" />
            Limpiar
          </Button>
        </div>
      </div>
      {children}
    </fieldset>
  );
}
