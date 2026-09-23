import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EventCard } from "@/components/schedule/EventCard";
import type { ConferenceEvent } from "@/lib/schedule/types";

/* Contract: ONE location label per card — "hall (Edificio X)".
 * The trailing "· building" suffix was folded into venueLabel (no dupes). */

const event: ConferenceEvent = {
  id: "WED-004",
  date: "2026-09-23",
  startTime: "10:30",
  endTime: "11:30",
  title: "Bienestar y desarrollo psicológico",
  venueKey: "sala-1",
  venueLabel: "Centro de Convenciones (Edificio 3B)",
  venueHall: "Centro de Convenciones",
  roomName: "Sala 1",
  activityType: "Conferencia Magistral",
  thematicAxis: "Salud",
  tags: ["Salud"],
  building: "3B",
  speakers: [],
  papers: [],
};

describe("EventCard", () => {
  it("shows the unified location label", () => {
    render(<EventCard event={event} onOpenChat={vi.fn()} />);
    expect(
      screen.getByText("Centro de Convenciones (Edificio 3B)"),
    ).toBeInTheDocument();
  });

  it("folds the building code into the label (no trailing suffix)", () => {
    render(<EventCard event={event} onOpenChat={vi.fn()} />);
    expect(screen.queryByText("· 3B")).toBeNull();
  });
});
