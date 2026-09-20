"use client";

import { useState, useEffect, useCallback } from "react";
import { RotateCcw, Play, Pause, FastForward, SkipBack } from "lucide-react";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import type { UseCurrentSessionReturn } from "@/lib/schedule/hooks/useCurrentSession";

const CONFERENCE_START = "2026-09-23";
const CONFERENCE_END = "2026-09-24";

export function TimeTravelDevPanel({
  currentTime,
  isTimeTravel,
  isWithinConferenceDates,
  setTimeTravel,
  advanceMinutes,
}: Pick<
  UseCurrentSessionReturn,
  "currentTime" | "isTimeTravel" | "isWithinConferenceDates" | "setTimeTravel" | "advanceMinutes"
>) {
  // Use real current time as fallback for initial slider value
  // Use lazy initializer to avoid new Date() during prerender
  const [sliderValue, setSliderValue] = useState(() => {
    if (typeof window !== "undefined") {
      return currentTime?.getTime() ?? Date.now();
    }
    return currentTime?.getTime() ?? 0;
  });
  const [isPlaying, setIsPlaying] = useState(false);

  // Initialize slider value on mount (client-side only)
  useEffect(() => {
    if (sliderValue === 0 && currentTime) {
      setSliderValue(currentTime.getTime());
    } else if (sliderValue === 0) {
      setSliderValue(Date.now());
    }
  }, [currentTime, sliderValue]);

  const confStart = startOfDay(parseISO(CONFERENCE_START));
  const confEnd = endOfDay(parseISO(CONFERENCE_END));
  const minTime = confStart.getTime();
  const maxTime = confEnd.getTime();

  // Sync slider value to hook's timeTravelTime when in time-travel mode
  // This keeps the slider in sync when the hook's time changes (e.g., via jumpToEvent)
  useEffect(() => {
    if (isTimeTravel && currentTime) {
      setSliderValue(currentTime.getTime());
    } else if (!isTimeTravel) {
      // In real-time mode, slider follows real time
      setSliderValue(Date.now());
    }
  }, [isTimeTravel, currentTime]);

  const handleSliderChange = useCallback((value: number) => {
    const date = new Date(value);
    setSliderValue(value);
    // Always call setTimeTravel - the hook will handle mode logic
    setTimeTravel(date);
  }, [setTimeTravel]);

  const handleSliderEnd = useCallback(() => {
    // Slider drag ended - already synced via handleSliderChange
  }, []);

  const togglePlay = useCallback(() => {
    if (!isTimeTravel) {
      // Enter time-travel mode at current real time
      setTimeTravel(new Date());
    }
    setIsPlaying((prev) => !prev);
  }, [isTimeTravel, setTimeTravel]);

  // Auto-advance when playing
  useEffect(() => {
    if (isPlaying && isTimeTravel) {
      const interval = setInterval(() => {
        advanceMinutes(5);
        // Slider will sync via the effect above when currentTime changes
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isPlaying, isTimeTravel, advanceMinutes]);

  // Preset buttons - use simulated time when in time-travel mode
  const getPresetDate = useCallback((label: string) => {
    switch (label) {
      case "Ahora":
        // Use simulated time if in time-travel, otherwise real time
        return isTimeTravel && currentTime ? currentTime : new Date();
      case "Inicio Dia 1":
        return new Date(`${CONFERENCE_START}T08:00:00`);
      case "Inicio Dia 2":
        return new Date(`${CONFERENCE_END}T08:00:00`);
      case "Fin Evento":
        return new Date(`${CONFERENCE_END}T23:59:00`);
      default:
        return new Date();
    }
  }, [isTimeTravel, currentTime]);

  const PRESETS = [
    { label: "Ahora" },
    { label: "Inicio Dia 1" },
    { label: "Inicio Dia 2" },
    { label: "Fin Evento" },
  ] as const;

  if (process.env.NODE_ENV === "production") return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 right-4 z-50 mx-auto max-w-5xl w-full border rounded-t-xl bg-background/95 backdrop-blur-sm shadow-lg p-4",
        "transition-all duration-300",
      )}
      role="region"
      aria-label="Control de viaje en el tiempo (solo desarrollo)"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Modo Viaje en el Tiempo (Dev)</h3>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
            isTimeTravel
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
          )}
        >
          {isTimeTravel ? (
            <>
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75" />
                <span className="relative rounded-full h-1.5 w-1.5 bg-green-500" />
              </span>
              ACTIVO
            </>
          ) : (
            "INACTIVO"
          )}
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <label
            htmlFor="time-travel-slider"
            className="block text-xs text-muted-foreground mb-1"
          >
            Tiempo simulado: {format(new Date(sliderValue), "EEE dd MMM HH:mm")}
          </label>
          <input
            id="time-travel-slider"
            type="range"
            min={minTime}
            max={maxTime}
            step={60000}
            value={sliderValue}
            onChange={(e) => handleSliderChange(Number(e.target.value))}
            onMouseUp={handleSliderEnd}
            onTouchEnd={handleSliderEnd}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            aria-label="Control de tiempo simulado"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                const date = getPresetDate(preset.label);
                setSliderValue(date.getTime());
                setTimeTravel(date);
                setIsPlaying(false);
              }}
              className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (isTimeTravel) {
                advanceMinutes(-5);
              }
            }}
            disabled={!isTimeTravel}
            className={cn(
              "p-1.5 rounded transition-colors",
              isTimeTravel
                ? "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                : "bg-gray-100 dark:bg-gray-800 opacity-50 cursor-not-allowed",
            )}
            aria-label="Retroceder 5 minutos"
          >
            <SkipBack className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={togglePlay}
            className="p-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            aria-label={isPlaying ? "Pausar" : "Reproducir"}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => {
              if (isTimeTravel) {
                advanceMinutes(5);
              }
            }}
            disabled={!isTimeTravel}
            className={cn(
              "p-1.5 rounded transition-colors",
              isTimeTravel
                ? "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                : "bg-gray-100 dark:bg-gray-800 opacity-50 cursor-not-allowed",
            )}
            aria-label="Avanzar 5 minutos"
          >
            <FastForward className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setTimeTravel(null);
              setIsPlaying(false);
              setSliderValue(Date.now());
            }}
            className="ml-auto p-1.5 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Volver al tiempo real"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        <div className="text-xs text-muted-foreground">
          <p>Hora actual: {format(currentTime ?? (typeof window !== "undefined" ? new Date() : new Date(0)), "yyyy-MM-dd HH:mm:ss")}</p>
          <p>Dentro de fechas de conferencia: {isWithinConferenceDates ? "Si" : "No"}</p>
        </div>
      </div>
    </div>
  );
}