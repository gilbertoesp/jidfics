"use client";

/**
 * EventDetailContent — compound COMPONENT (Header/Body/Footer, per
 * building-components naming conventions). Pure presentation: receives the
 * event + callbacks, owns only the transient "copied" feedback state.
 *
 * Props API (controlled): event, related, selectedTags, onTagClick,
 * onOpenRelated. Tag badges carry their category (topic|location) and act
 * as filters (same actionable Tag primitive as the sidebar/cards).
 *
 * A11y: SheetTitle/SheetDescription wired by Radix; sections are labelled
 * in Spanish (content context); copy feedback announced via role=status.
 * data-slot: event-detail-content | event-detail-header/body/footer
 */

import { useState } from "react";
import { FileText, Link2, MessagesSquare, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tag } from "@/components/schedule/Tag";
import { colorFor } from "@/lib/schedule/colors";
import { buildShareUrl } from "@/lib/schedule/eventDetail";
import { categorizeTag } from "@/lib/schedule/tags";
import type { ConferenceEvent } from "@/lib/schedule/types";
import { cn } from "@/lib/utils";

export interface EventDetailContentProps {
  event: ConferenceEvent;
  related: ConferenceEvent[];
  selectedTags: string[];
  onTagClick: (tag: string) => void;
  onOpenRelated: (event: ConferenceEvent) => void;
}

function SectionTitle({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <h4 className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {icon}
      {children}
    </h4>
  );
}

export function EventDetailContent({
  event,
  related,
  selectedTags,
  onTagClick,
  onOpenRelated,
}: EventDetailContentProps) {
  const [copied, setCopied] = useState(false);
  const activityColor = colorFor(event.activityType);
  const displayTags = event.tags.length > 0 ? event.tags : [event.thematicAxis];

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(
        buildShareUrl(window.location.origin, event.id),
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (permissions/insecure context) — stay silent.
    }
  }

  return (
    <div
      data-slot="event-detail-content"
      className="flex h-full flex-col gap-0"
    >
      {/* Header ------------------------------------------------------ */}
      <SheetHeader
        data-slot="event-detail-header"
        className="gap-2 border-b p-4 pr-12 text-left"
      >
        <Badge variant="outline" className={cn("gap-1.5 border", activityColor.badge)}>
          <span
            aria-hidden="true"
            className={cn("h-1.5 w-1.5 rounded-full", activityColor.dot)}
          />
          {event.activityType}
        </Badge>
        <SheetTitle className="text-lg leading-snug">{event.title}</SheetTitle>
        <SheetDescription className="text-sm">
          <time dateTime={`${event.date}T${event.startTime}`}>
            {event.startTime}
          </time>
          <span aria-hidden="true"> – </span>
          <time dateTime={`${event.date}T${event.endTime}`}>
            {event.endTime}
          </time>
          <span aria-hidden="true"> · </span>
          {event.venueLabel}
          {event.building !== "Unknown" && (
            <span aria-hidden="true"> · </span>
          )}
          {event.building !== "Unknown" && event.building}
        </SheetDescription>
      </SheetHeader>

      {/* Body -------------------------------------------------------- */}
      <div
        data-slot="event-detail-body"
        className="flex flex-1 flex-col gap-5 overflow-y-auto p-4"
      >
        {/* Etiquetas (actionable, categorized) */}
        <section aria-label="Etiquetas de la sesión" className="flex flex-col gap-2">
          <SectionTitle>Etiquetas</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {displayTags.map((tag) => {
              const selected = selectedTags.includes(tag);
              return (
                <Tag
                  key={tag}
                  value={tag}
                  category={categorizeTag(tag)}
                  selected={selected}
                  onTagToggle={onTagClick}
                  aria-label={
                    selected
                      ? `Quitar filtro ${tag}`
                      : `Filtrar por etiqueta ${tag}`
                  }
                  className={cn(!selected && "border")}
                />
              );
            })}
          </div>
        </section>

        {/* Ponentes */}
        {event.speakers.length > 0 && (
          <section aria-label="Ponentes" className="flex flex-col gap-2">
            <SectionTitle icon={<Users className="h-3.5 w-3.5" aria-hidden="true" />}>
              Ponentes
            </SectionTitle>
            <ul className="flex flex-col gap-1.5">
              {event.speakers.map((speaker) => (
                <li key={speaker.name} className="flex flex-col text-sm">
                  <span className="font-medium text-foreground">
                    {speaker.name}
                  </span>
                  <span className="text-muted-foreground">
                    {speaker.institution}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Ponencias */}
        {event.papers.length > 0 && (
          <section aria-label="Ponencias" className="flex flex-col gap-2">
            <SectionTitle icon={<FileText className="h-3.5 w-3.5" aria-hidden="true" />}>
              Ponencias ({event.papers.length})
            </SectionTitle>
            <ul className="flex flex-col gap-3">
              {event.papers.map((paper) => (
                <li
                  key={`${paper.title}-${paper.authors.join(",")}-${paper.institution}`}
                  className="flex flex-col gap-1 rounded-lg border bg-muted/30 p-3 text-sm"
                >
                  <span className="font-medium text-foreground">
                    {paper.title}
                  </span>
                  {paper.authors.length > 0 && (
                    <span className="text-muted-foreground">
                      {paper.authors.join(", ")}
                    </span>
                  )}
                  {paper.institution && (
                    <span className="text-xs text-muted-foreground/90">
                      {paper.institution}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {event.speakers.length === 0 && event.papers.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Información de la sesión no disponible.
          </p>
        )}

        {/* Sesiones relacionadas */}
        <section aria-label="Sesiones relacionadas" className="flex flex-col gap-2">
          <SectionTitle>Sesiones relacionadas</SectionTitle>
          {related.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin sesiones relacionadas.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {related.map((item) => (
                <li key={item.id}>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onOpenRelated(item)}
                    className="h-auto w-full flex-col items-start gap-0.5 whitespace-normal px-3 py-2 text-left"
                  >
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {item.startTime}–{item.endTime} · {item.venueLabel}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {item.title}
                    </span>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Footer ------------------------------------------------------ */}
      <div
        data-slot="event-detail-footer"
        className="flex items-center gap-2 border-t p-3"
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="gap-1.5"
        >
          <Link2 className="h-4 w-4" aria-hidden="true" />
          Copiar enlace
        </Button>
        <span
          role="status"
          aria-live="polite"
          className="text-xs text-muted-foreground"
        >
          {copied && "Enlace copiado"}
        </span>
        <div className="flex-1" />
        {/* TODO(calendar): ICS / Google Calendar export — README › TODO files */}
        {/* TODO(directions): map deep link (venue + building) — README › TODO files */}
        {/* TODO(auth): enable once chat auth ships (needs Supabase session). */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled
          aria-disabled="true"
          className="gap-1.5 opacity-60"
        >
          <MessagesSquare className="h-4 w-4" aria-hidden="true" />
          Comentar
        </Button>
      </div>
    </div>
  );
}
