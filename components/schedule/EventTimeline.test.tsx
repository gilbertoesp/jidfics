import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { EventTimeline } from "@/components/schedule/EventTimeline";
import type { LiveStatus } from "@/components/schedule/LiveIndicatorBadge";
import type { ConferenceEvent } from "@/lib/schedule/types";

/* Contract notes (builder context, en):
 * - Replaces the per-building tabbed "location table" (BuildingTimelines)
 *   with ONE chronological timeline of all (sidebar-filtered) events.
 * - No building tabs: queryByRole("tab") must stay empty; the section
 *   exposes data-slot="event-timeline" as its stable contract.
 * - Per item: time range, live/up-next badges, ONE location label
 *   "hall (Edificio X)" (code folded in; no building badge), clickable tags.
 */

function makeEvent(partial: Partial<ConferenceEvent>): ConferenceEvent {
  return {
    id: "e1",
    date: "2026-09-23",
    startTime: "09:00",
    endTime: "10:00",
    title: "Violencia digital",
    activityType: "Conferencia Magistral",
    thematicAxis: "Violencia",
    tags: ["Violencia"],
    building: "3B",
    locationKey: "sala-1",
    roomName: "Sala 1",
    locationLabel: "Centro de Convenciones (Edificio 3B)",
    hallName: "Centro de Convenciones",
    speakers: [],
    papers: [],
    ...partial,
  };
}

/** Shuffled across two days/buildings — must render date → time ordered. */
const events = [
  makeEvent({
    id: "e3",
    date: "2026-09-24",
    startTime: "09:00",
    title: "Día 2",
    building: "1M",
    locationKey: "sala-3",
    roomName: "Sala 3",
    locationLabel: "Sala Polivalente (Edificio 1M)",
    hallName: "Sala Polivalente",
  }),
  makeEvent({
    id: "e2",
    startTime: "11:00",
    building: "1E",
    locationKey: "sala-2",
    roomName: "Sala 2",
    locationLabel: "Sala Audiovisual (Edificio 1E)",
    hallName: "Sala Audiovisual",
    title: "Mesa tarde",
  }),
  makeEvent({ id: "e1", title: "Mañana" }),
];

function renderTimeline(
  props: Partial<Parameters<typeof EventTimeline>[0]> = {},
) {
  return render(
    <EventTimeline events={events} onTagClick={vi.fn()} {...props} />,
  );
}

describe("EventTimeline", () => {
  it("renders ONE timeline with no building tabs (location table removed)", () => {
    const { container } = renderTimeline();
    expect(
      container.querySelector('[data-slot="event-timeline"]'),
    ).toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Seleccionar edificio"),
    ).not.toBeInTheDocument();
    // a single timeline, not one per building
    expect(container.querySelectorAll('[data-slot="timeline"]')).toHaveLength(
      1,
    );
  });

  it("orders all events chronologically across days and buildings", () => {
    renderTimeline();
    const titles = screen
      .getAllByRole("heading", { level: 3 })
      .map((el) => el.textContent);
    expect(titles).toEqual(["Mañana", "Mesa tarde", "Día 2"]);
  });

  it("keeps location context per item: 'hall (Edificio X)' label, no badge", () => {
    renderTimeline();
    expect(
      screen.getByText("Centro de Convenciones (Edificio 3B)"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Sala Audiovisual (Edificio 1E)"),
    ).toBeInTheDocument();
    // building code folded into the label — no redundant badge
    expect(document.querySelector('[data-slot="event-building"]')).toBeNull();
  });

  it("fires onTagClick from a tag chip and reflects selection via aria-label", async () => {
    const user = userEvent.setup();
    const onTagClick = vi.fn();
    renderTimeline({ onTagClick, selectedTags: ["Violencia"] });

    // selected → chip advertises removal (each event sharing the tag renders one)
    const chip = screen.getAllByRole("button", {
      name: "Quitar filtro Violencia",
    })[0];
    expect(chip).toBeDefined();
    await user.click(chip);
    expect(onTagClick).toHaveBeenCalledWith("Violencia");

    renderTimeline({ onTagClick, selectedTags: [] });
    expect(
      screen.getAllByRole("button", { name: "Filtrar por etiqueta Violencia" })
        .length,
    ).toBeGreaterThan(0);
  });

  it("shows live/up-next badges from getLiveStatus", () => {
    const getLiveStatus = (event: ConferenceEvent): LiveStatus => {
      if (event.id === "e1") return "live";
      if (event.id === "e2") return "up-next";
      return "idle";
    };
    renderTimeline({ getLiveStatus });
    expect(screen.getByText("En vivo")).toBeInTheDocument();
    expect(screen.getByText("Próximo")).toBeInTheDocument();
  });

  it("renders a status message when no events match", () => {
    renderTimeline({ events: [] });
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(/No hay sesiones/);
  });
});
