"use client";

/**
 * FilterGroup — styled COMPONENT (building-components taxonomy), collapsible.
 *
 * One accordion section per TagCategory inside the FilterSidebar's
 * Radix Accordion (`type="multiple"`, all open by default, independently
 * collapsible — primitive → component → block chain, no new dependency).
 * Owns no open/close state in the header row: counts + clear are supplied
 * by the caller (controlled pattern); open state lives in the Accordion.
 *
 * Structure:
 *   AccordionItem[data-slot=filter-group][data-category=<TagCategory>]
 *   ├── header row: Trigger[data-slot=filter-group-trigger] (title +
 *   │   aria-live count, Radix supplies aria-expanded/data-state +
 *   │   roving keyboard nav) · Clear button as sibling (never toggles)
 *   └── Content → fieldset[aria-label=title] role=group (unmounts closed)
 *
 * data-slot: filter-group | filter-group-header | filter-group-trigger |
 *            filter-group-count | filter-group-body
 */

import { X } from "lucide-react";
import type * as React from "react";

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import type { TagCategory } from "@/lib/schedule/types";
import { cn } from "@/lib/utils";

export interface FilterGroupProps
  extends Omit<React.ComponentProps<"div">, "title"> {
  /** Accordion item value — doubles as the category (data-category). */
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
    <AccordionItem
      value={category}
      data-slot="filter-group"
      data-category={category}
      className={cn("border-b-0", className)}
      {...props}
    >
      <div
        data-slot="filter-group-header"
        className="flex items-center justify-between gap-2"
      >
        <AccordionTrigger
          data-slot="filter-group-trigger"
          className="h-auto flex-1 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:no-underline"
        >
          <span className="flex items-baseline gap-1.5">
            {title}
            <span
              data-slot="filter-group-count"
              aria-live="polite"
              className="text-xs font-normal tabular-nums"
            >
              {selectedCount}/{totalCount}
            </span>
          </span>
        </AccordionTrigger>
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
      <AccordionContent>
        <fieldset
          aria-label={title}
          data-slot="filter-group-body"
          className="flex flex-col gap-3"
        >
          {children}
        </fieldset>
      </AccordionContent>
    </AccordionItem>
  );
}
