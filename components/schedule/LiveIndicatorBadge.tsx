"use client";

import { AlertCircle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export type LiveStatus = "live" | "up-next" | "idle";

interface LiveIndicatorBadgeProps {
  status: LiveStatus;
  className?: string;
  showLabel?: boolean;
}

export function LiveIndicatorBadge({
  status,
  className,
  showLabel = true,
}: LiveIndicatorBadgeProps) {
  if (status === "idle") return null;

  const isLive = status === "live";
  const label = isLive ? "En vivo" : "Proximo";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all",
        isLive
          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800"
          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={isLive ? "Sesion en vivo" : "Sesion proxima a iniciar"}
    >
      <span
        className={cn(
          "relative flex h-2 w-2 items-center justify-center",
          isLive ? "text-green-500" : "text-yellow-500",
        )}
        aria-hidden="true"
      >
        {isLive && (
          <>
            <span
              className="absolute h-full w-full rounded-full bg-current opacity-75 animate-ping"
              aria-hidden="true"
            />
            <Circle
              className="relative h-2 w-2 rounded-full bg-current"
              aria-hidden="true"
            />
          </>
        )}
        {!isLive && <AlertCircle className="h-3 w-3" aria-hidden="true" />}
      </span>
      {showLabel && <span className="whitespace-nowrap">{label}</span>}
    </span>
  );
}
