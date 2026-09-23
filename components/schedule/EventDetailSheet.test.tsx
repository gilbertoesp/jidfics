import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  EventDetailSheet,
  type EventDetailSheetProps,
} from "@/components/schedule/EventDetailSheet";
import type { ConferenceEvent } from "@/lib/schedule/types";

/* Contract notes (builder context, en):
 * - Block composing the shadcn/Radix Sheet (primitive) + EventDetailContent.
 * - Responsive side: right panel (>=640px) / bottom sheet (<640px) via
 *   matchMedia — exposed as data-side on the dialog root.
 * - Escape/overlay/X close via Radix → onOpenChange(false); focus returns
 *   to the trigger automatically (Radix focus scope).
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
    tags: ["Violencia", "Tecnología"],
    building: "3B",
    locationKey: "sala-1",
    roomName: "Sala 1",
    locationLabel: "Centro de Convenciones (Edificio 3B)",
    hallName: "Centro de Convenciones",
    speakers: [
      { name: "Dra. Ana López", institution: "UNISON", role: "speaker" },
    ],
    papers: [
      { title: "Redes y acoso", authors: ["Carlos Ruiz"], institution: "UAS" },
    ],
    ...partial,
  };
}

const event = makeEvent({});
const related = [makeEvent({ id: "e2", title: "Mesa 2 · Género" })];

const baseProps: EventDetailSheetProps = {
  event,
  related,
  selectedTags: [],
  onOpenChange: vi.fn(),
  onTagClick: vi.fn(),
  onOpenRelated: vi.fn(),
};

function renderSheet(overrides: Partial<EventDetailSheetProps> = {}) {
  const props = { ...baseProps, ...overrides };
  return render(
    <EventDetailSheet
      {...props}
      onOpenChange={props.onOpenChange}
      onTagClick={props.onTagClick}
      onOpenRelated={props.onOpenRelated}
    />,
  );
}

function stubViewportWidth(width: number) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => {
      const min = /min-width:\s*(\d+)px/.exec(query);
      return {
        matches: min ? width >= Number(min[1]) : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("EventDetailSheet", () => {
  it("renders all session details in Spanish", () => {
    renderSheet();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("Violencia digital");
    expect(dialog).toHaveTextContent("09:00");
    expect(dialog).toHaveTextContent("Centro de Convenciones (Edificio 3B)");
    // building folded into the label — no trailing "· 3B" duplication
    expect(dialog).not.toHaveTextContent("· 3B");
    expect(dialog).toHaveTextContent("Dra. Ana López");
    expect(dialog).toHaveTextContent("Redes y acoso");
    expect(dialog).toHaveTextContent("Carlos Ruiz");
    expect(dialog).toHaveTextContent("Ponencias (1)");
    expect(dialog).toHaveTextContent("Conferencia Magistral");
  });

  it("lists related sessions and forwards selection", async () => {
    const user = userEvent.setup();
    const onOpenRelated = vi.fn();
    renderSheet({ onOpenRelated });

    const relatedButton = screen.getByRole("button", {
      name: /Mesa 2 · Género/,
    });
    await user.click(relatedButton);
    expect(onOpenRelated).toHaveBeenCalledWith(
      expect.objectContaining({ id: "e2" }),
    );
  });

  it("closes on Escape via onOpenChange(false)", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderSheet({ onOpenChange });

    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("copies the share link and announces it", async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getByRole("button", { name: "Copiar enlace" }));
    expect(await navigator.clipboard.readText()).toBe(
      `${window.location.origin}/?event=e1`,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Enlace copiado");
  });

  it("forwards tag clicks (actionable category badges)", async () => {
    const user = userEvent.setup();
    const onTagClick = vi.fn();
    renderSheet({ onTagClick, selectedTags: ["Violencia"] });

    await user.click(
      screen.getByRole("button", { name: "Quitar filtro Violencia" }),
    );
    expect(onTagClick).toHaveBeenCalledWith("Violencia");

    const tech = screen.getByRole("button", {
      name: /Filtrar por etiqueta Tecnología/,
    });
    expect(tech).toHaveAttribute("data-category", "topic");
  });

  it("uses a right panel on desktop and a bottom sheet on mobile", () => {
    stubViewportWidth(1024);
    const desktop = renderSheet();
    expect(screen.getByRole("dialog")).toHaveAttribute("data-side", "right");
    desktop.unmount();

    stubViewportWidth(375);
    renderSheet();
    expect(screen.getByRole("dialog")).toHaveAttribute("data-side", "bottom");
  });

  it("renders nothing (closed) when event is null", () => {
    renderSheet({ event: null });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
