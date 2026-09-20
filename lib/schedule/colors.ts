export interface BadgeColor {
  badge: string;
  dot: string;
}

/**
 * Deterministic palette for arbitrary dataset strings (activity types,
 * thematic axes, venues). Class names are full literal strings so Tailwind
 * keeps them in the build.
 */
const PALETTE: BadgeColor[] = [
  {
    badge:
      "border-red-400/60 bg-red-100 text-red-900 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-300",
    dot: "bg-red-500",
  },
  {
    badge:
      "border-orange-400/60 bg-orange-100 text-orange-900 dark:border-orange-500/40 dark:bg-orange-500/15 dark:text-orange-300",
    dot: "bg-orange-500",
  },
  {
    badge:
      "border-amber-400/60 bg-amber-100 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  {
    badge:
      "border-emerald-400/60 bg-emerald-100 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  {
    badge:
      "border-teal-400/60 bg-teal-100 text-teal-900 dark:border-teal-500/40 dark:bg-teal-500/15 dark:text-teal-300",
    dot: "bg-teal-500",
  },
  {
    badge:
      "border-sky-400/60 bg-sky-100 text-sky-900 dark:border-sky-500/40 dark:bg-sky-500/15 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  {
    badge:
      "border-indigo-400/60 bg-indigo-100 text-indigo-900 dark:border-indigo-500/40 dark:bg-indigo-500/15 dark:text-indigo-300",
    dot: "bg-indigo-500",
  },
  {
    badge:
      "border-violet-400/60 bg-violet-100 text-violet-900 dark:border-violet-500/40 dark:bg-violet-500/15 dark:text-violet-300",
    dot: "bg-violet-500",
  },
  {
    badge:
      "border-fuchsia-400/60 bg-fuchsia-100 text-fuchsia-900 dark:border-fuchsia-500/40 dark:bg-fuchsia-500/15 dark:text-fuchsia-300",
    dot: "bg-fuchsia-500",
  },
  {
    badge:
      "border-rose-400/60 bg-rose-100 text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-300",
    dot: "bg-rose-500",
  },
];

/** FNV-1a 32-bit hash → stable palette index per label. */
function hashIndex(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) ^ (h >>> 13)) % PALETTE.length;
}

/** Stable color for any arbitrary string (axis, type, venue). */
export function colorFor(label: string): BadgeColor {
  return PALETTE[hashIndex(label)] ?? PALETTE[0];
}

/** Stable dot color used by filter pills, matching colorFor. */
export function dotFor(label: string): string {
  return colorFor(label).dot;
}