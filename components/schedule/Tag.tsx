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
 * - Semantic: renders as <button> when interactive & not removable, <span> otherwise
 * - When removable: renders as inline-flex wrapper with label + remove button (no nested buttons)
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
    
    // When removable, we render a wrapper div with label + remove button as siblings
    // to avoid nested <button> elements (invalid HTML)
    const isRemovable = removable && selected;
    const Comp = asChild ? Slot : interactive && !isRemovable ? "button" : "span";

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!interactive || isRemovable) return;
      onTagToggle?.(value);
      onClick?.(e);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (!interactive || isRemovable) return;
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

    const handleLabelClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!interactive || !isRemovable) return;
      onTagToggle?.(value);
      onClick?.(e as unknown as React.MouseEvent<HTMLButtonElement>);
    };

    const handleLabelKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!interactive || !isRemovable) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onTagToggle?.(value);
      }
      onKeyDown?.(e as unknown as React.KeyboardEvent<HTMLButtonElement>);
    };

    const baseClassName = cn(
      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "data-[state=selected]:shadow-sm data-[state=selected]:border-primary data-[state=selected]:bg-primary data-[state=selected]:text-primary-foreground",
      "data-[state=default]:bg-background data-[state=default]:text-foreground data-[state=default]:hover:bg-accent",
      interactive && !isRemovable && "cursor-pointer select-none",
      !interactive && "cursor-default",
      isRemovable && "cursor-pointer select-none",
      !selected && colors.badge,
      className,
    );

    // When removable, render wrapper with label (clickable) + remove button as siblings
    if (isRemovable) {
      // Don't spread button-specific props to div
      return (
        <div
          data-slot="tag"
          data-state="selected"
          data-interactive="true"
          data-value={value}
          data-removable="true"
          className={baseClassName}
        >
          <span
            aria-hidden="true"
            data-slot="tag-dot"
            className={cn(
              "h-1.5 w-1.5 rounded-full transition-colors",
              "bg-current",
            )}
          />
          <span
            data-slot="tag-label"
            role="button"
            tabIndex={0}
            aria-label={ariaLabel ?? `Quitar filtro ${displayLabel}`}
            aria-pressed={true}
            onClick={handleLabelClick}
            onKeyDown={handleLabelKeyDown}
            className="cursor-pointer select-none"
          >
            {children ?? displayLabel}
          </span>
          <button
            type="button"
            onClick={handleRemoveClick}
            aria-label={`Quitar ${displayLabel}`}
            data-slot="tag-remove"
            className="p-0.5 rounded hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X aria-hidden="true" data-slot="tag-remove-icon" className="h-3 w-3 opacity-70" />
          </button>
        </div>
      );
    }

    // Normal (non-removable) rendering
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
        className={baseClassName}
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