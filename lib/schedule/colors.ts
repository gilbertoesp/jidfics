import { type ActivityType, type ThematicAxis, type VenueId } from "@/lib/schedule/types";

export interface BadgeColor {
  badge: string;
  dot: string;
}

/** Consistent color mapping for Activity Type badges (light + dark variants). */
export const ACTIVITY_TYPE_COLORS: Record<ActivityType, BadgeColor> = {
  "Masters Keynote": {
    badge:
      "border-amber-400/60 bg-amber-100 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  "Free Papers": {
    badge:
      "border-sky-400/60 bg-sky-100 text-sky-900 dark:border-sky-500/40 dark:bg-sky-500/15 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  Symposium: {
    badge:
      "border-violet-400/60 bg-violet-100 text-violet-900 dark:border-violet-500/40 dark:bg-violet-500/15 dark:text-violet-300",
    dot: "bg-violet-500",
  },
  "Panel Discussion": {
    badge:
      "border-emerald-400/60 bg-emerald-100 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  Posters: {
    badge:
      "border-rose-400/60 bg-rose-100 text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-300",
    dot: "bg-rose-500",
  },
};

/** Consistent color mapping for Thematic Axis badges (light + dark variants). */
export const THEMATIC_AXIS_COLORS: Record<ThematicAxis, BadgeColor> = {
  Violence: {
    badge:
      "border-red-400/60 bg-red-100 text-red-900 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-300",
    dot: "bg-red-500",
  },
  Gender: {
    badge:
      "border-fuchsia-400/60 bg-fuchsia-100 text-fuchsia-900 dark:border-fuchsia-500/40 dark:bg-fuchsia-500/15 dark:text-fuchsia-300",
    dot: "bg-fuchsia-500",
  },
  Education: {
    badge:
      "border-indigo-400/60 bg-indigo-100 text-indigo-900 dark:border-indigo-500/40 dark:bg-indigo-500/15 dark:text-indigo-300",
    dot: "bg-indigo-500",
  },
  Law: {
    badge:
      "border-slate-400/60 bg-slate-200 text-slate-800 dark:border-slate-500/40 dark:bg-slate-500/20 dark:text-slate-300",
    dot: "bg-slate-500",
  },
  Health: {
    badge:
      "border-teal-400/60 bg-teal-100 text-teal-900 dark:border-teal-500/40 dark:bg-teal-500/15 dark:text-teal-300",
    dot: "bg-teal-500",
  },
  "Regional Development": {
    badge:
      "border-orange-400/60 bg-orange-100 text-orange-900 dark:border-orange-500/40 dark:bg-orange-500/15 dark:text-orange-300",
    dot: "bg-orange-500",
  },
  Migration: {
    badge:
      "border-cyan-400/60 bg-cyan-100 text-cyan-900 dark:border-cyan-500/40 dark:bg-cyan-500/15 dark:text-cyan-300",
    dot: "bg-cyan-500",
  },
};

/** Neutral highlight used on active filter pills. */
export const VENUE_COLORS: Record<VenueId, BadgeColor> = {
  "hall-1": {
    badge:
      "border-sky-400/60 bg-sky-100 text-sky-900 dark:border-sky-500/40 dark:bg-sky-500/15 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  "hall-2": {
    badge:
      "border-violet-400/60 bg-violet-100 text-violet-900 dark:border-violet-500/40 dark:bg-violet-500/15 dark:text-violet-300",
    dot: "bg-violet-500",
  },
  "hall-3": {
    badge:
      "border-emerald-400/60 bg-emerald-100 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  "hall-4": {
    badge:
      "border-amber-400/60 bg-amber-100 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300",
    dot: "bg-amber-500",
  },
};