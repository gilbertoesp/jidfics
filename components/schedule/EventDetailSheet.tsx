"use client";

/**
 * EventDetailSheet — composable BLOCK: shadcn/Radix Sheet (primitive)
 * + EventDetailContent. Replaces the former in-card accordion.
 *
 * Responsive behavior:
 *  - >= 640px → right panel (sm:max-w-md ≈ 448px)
 *  - <  640px → bottom sheet (full width, max-h 85dvh)
 *  exposed as data-side on the dialog root (data-attributes contract).
 *
 * State: fully controlled — parent owns open/close (useEventDetails drives
 * `?event=<id>`). Escape/overlay/X → onOpenChange(false); focus trap +
 * focus return handled by Radix.
 *
 * Keyboard map: Escape close · Tab cycles inside sheet (Radix focus scope).
 */

import { useEffect, useState } from "react";

import { EventDetailContent } from "@/components/schedule/EventDetailContent";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { ConferenceEvent } from "@/lib/schedule/types";

/** SSR-safe viewport probe (defaults to desktop until mounted). */
export function useIsDesktop(minWidth = 640): boolean {
  const query = `(min-width: ${minWidth}px)`;
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mediaQuery = window.matchMedia(query);
    setIsDesktop(mediaQuery.matches);
    const onChange = (event: MediaQueryListEvent) =>
      setIsDesktop(event.matches);
    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, [query]);

  return isDesktop;
}

export interface EventDetailSheetProps {
  /** Null = closed. When set, the sheet opens for that session. */
  event: ConferenceEvent | null;
  related: ConferenceEvent[];
  selectedTags: string[];
  onOpenChange: (open: boolean) => void;
  onTagClick: (tag: string) => void;
  onOpenRelated: (event: ConferenceEvent) => void;
}

export function EventDetailSheet({
  event,
  related,
  selectedTags,
  onOpenChange,
  onTagClick,
  onOpenRelated,
}: EventDetailSheetProps) {
  const isDesktop = useIsDesktop();

  return (
    <Sheet open={event !== null} onOpenChange={onOpenChange}>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        data-slot="event-detail-sheet"
        className={
          isDesktop
            ? "w-full p-0 sm:max-w-md"
            : "max-h-[85dvh] rounded-t-xl p-0 sm:max-w-none"
        }
      >
        {event && (
          <EventDetailContent
            event={event}
            related={related}
            selectedTags={selectedTags}
            onTagClick={onTagClick}
            onOpenRelated={onOpenRelated}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
