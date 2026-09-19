"use client";

import { Clock, MapPin, MessagesSquare, Users } from "lucide-react";

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
import { ACTIVITY_TYPE_COLORS, THEMATIC_AXIS_COLORS } from "@/lib/schedule/colors";
import { type ConferenceEvent } from "@/lib/schedule/types";
import { cn } from "@/lib/utils";

interface EventCardProps {
  event: ConferenceEvent;
  onOpenChat: (event: ConferenceEvent) => void;
}

export function EventCard({ event, onOpenChat }: EventCardProps) {
  const activityColor = ACTIVITY_TYPE_COLORS[event.activityType];
  const axisColor = THEMATIC_AXIS_COLORS[event.thematicAxis];

  return (
    <Card className="group flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      {/* Time rail */}
      <div className="flex items-center gap-3 border-b bg-muted/40 px-5 py-2.5 text-sm text-foreground">
        <span className="inline-flex items-center gap-1.5 font-semibold tabular-nums">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <time dateTime={`${event.date}T${event.startTime}`}>{event.startTime}</time>
          <span aria-hidden="true">–</span>
          <time dateTime={`${event.date}T${event.endTime}`}>{event.endTime}</time>
        </span>
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          {event.venueLabel}
        </span>
      </div>

      <CardHeader className="gap-2 pb-3">
        <div className="flex flex-wrap gap-2">
          <Badge
            variant="outline"
            className={cn("gap-1.5 border", activityColor.badge)}
          >
            <span
              aria-hidden="true"
              className={cn("h-1.5 w-1.5 rounded-full", activityColor.dot)}
            />
            {event.activityType}
          </Badge>
          <Badge variant="outline" className={cn("gap-1.5 border", axisColor.badge)}>
            <span
              aria-hidden="true"
              className={cn("h-1.5 w-1.5 rounded-full", axisColor.dot)}
            />
            {event.thematicAxis}
          </Badge>
        </div>
        <CardTitle className="text-lg leading-snug">
          <h3>{event.title}</h3>
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-1">
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          <span>
            {event.speakers
              .map((speaker) => speaker.name)
              .join(", ")}
          </span>
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 pt-0">
        <Accordion type="single" collapsible>
          <AccordionItem value="details" className="border-b-0">
            <AccordionTrigger className="justify-start gap-2 py-2 text-sm font-medium text-foreground no-underline data-[state=open]:no-underline hover:no-underline [&>svg]:ml-0">
              Presentation details
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-3">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {event.abstract}
                </p>
                <Separator />
                <div className="flex flex-col gap-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Speakers
                  </h4>
                  <ul className="flex flex-col gap-1.5">
                    {event.speakers.map((speaker) => (
                      <li
                        key={`${speaker.name}-${speaker.role}`}
                        className="flex flex-col text-sm"
                      >
                        <span className="font-medium text-foreground">
                          {speaker.name}
                          <span className="ml-1.5 text-xs normal-case text-muted-foreground">
                            ({speaker.role})
                          </span>
                        </span>
                        <span className="text-muted-foreground">
                          {speaker.institution}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col gap-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Authors &amp; affiliations
                  </h4>
                  <ul className="flex flex-col gap-1.5">
                    {event.authors.map((author) => (
                      <li
                        key={`${author.name}-${author.institution}`}
                        className="flex flex-col text-sm"
                      >
                        <span className="font-medium text-foreground">
                          {author.name}
                        </span>
                        <span className="text-muted-foreground">
                          {author.institution}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
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
            Live discussion
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}