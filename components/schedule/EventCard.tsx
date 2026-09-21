"use client";

import { Clock, FileText, MapPin, MessagesSquare, Users } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { colorFor } from "@/lib/schedule/colors";
import { LiveIndicatorBadge, type LiveStatus } from "@/components/schedule/LiveIndicatorBadge";
import { Tag } from "@/components/schedule/Tag";
import { type ConferenceEvent } from "@/lib/schedule/types";
import { cn } from "@/lib/utils";

interface EventCardProps {
  event: ConferenceEvent;
  onOpenChat: (event: ConferenceEvent) => void;
  liveStatus?: LiveStatus;
  /** Called when a tag/badget is clicked — delivers filtering value */
  onTagClick?: (tag: string) => void;
  /** Set of currently selected tags for visual pressed state */
  selectedTags?: string[];
}

export function EventCard({ event, onOpenChat, liveStatus, onTagClick, selectedTags = [] }: EventCardProps) {
  const activityColor = colorFor(event.activityType);
  const displayTags = event.tags.length > 0 ? event.tags : [event.thematicAxis];

  return (
    <Card className="group flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      {/* Time rail */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b bg-muted/40 px-5 py-2.5 text-sm text-foreground">
        <span className="inline-flex items-center gap-1.5 font-semibold tabular-nums">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <time dateTime={`${event.date}T${event.startTime}`}>{event.startTime}</time>
          <span aria-hidden="true">–</span>
          <time dateTime={`${event.date}T${event.endTime}`}>{event.endTime}</time>
        </span>
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          {event.venueLabel}
          {event.building && event.building !== "Unknown" && (
            <span className="text-muted-foreground/70">· {event.building}</span>
          )}
        </span>
        {liveStatus && <LiveIndicatorBadge status={liveStatus} showLabel />}
      </div>

      <CardHeader className="gap-2 pb-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className={cn("gap-1.5 border", activityColor.badge)}>
            <span
              aria-hidden="true"
              className={cn("h-1.5 w-1.5 rounded-full", activityColor.dot)}
            />
            {event.activityType}
          </Badge>
          {displayTags.map((tag) => {
            const isSelected = selectedTags.includes(tag);
            // Actionable tag — click filters the schedule (delivers value)
            return (
              <Tag
                key={tag}
                value={tag}
                selected={isSelected}
                interactive={!!onTagClick}
                onTagToggle={onTagClick}
                aria-label={`${isSelected ? "Quitar filtro" : "Filtrar por etiqueta"} ${tag}`}
                className={cn(!isSelected && "border")}
                data-slot="event-tag"
              />
            );
          })}
        </div>
        <CardTitle className="text-lg leading-snug">
          <h3>{event.title}</h3>
        </CardTitle>
        {event.speakers.length > 0 && (
          <CardDescription className="flex flex-wrap items-center gap-1">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{event.speakers.map((speaker) => speaker.name).join(", ")}</span>
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 pt-0">
        <Accordion type="single" collapsible>
          <AccordionItem value="details" className="border-b-0">
            <AccordionTrigger className="justify-start gap-2 py-2 text-sm font-medium text-foreground no-underline data-[state=open]:no-underline hover:no-underline [&>svg]:ml-0">
              Detalles de la sesión
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-3">
                {event.speakers.length > 0 && (
                  <>
                    <div className="flex flex-col gap-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Ponentes
                      </h4>
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
                    </div>
                    <Separator />
                  </>
                )}

                {event.papers.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <h4 className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                      Ponencias ({event.papers.length})
                    </h4>
                    <ul className="flex flex-col gap-3">
                      {event.papers.map((paper, index) => (
                        <li
                          key={`${paper.title}-${index}`}
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
                  </div>
                )}

                {event.speakers.length === 0 && event.papers.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Información de la sesión no disponible.
                  </p>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="mt-auto flex items-center justify-end border-t pt-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => onOpenChat(event)}
          >
            <MessagesSquare className="h-4 w-4" aria-hidden="true" />
            Discusión en vivo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}