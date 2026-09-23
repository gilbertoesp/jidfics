import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";

import { FilterSidebar } from "@/components/schedule/filter/FilterSidebar";
import { EMPTY_FILTERS, type ScheduleFilters } from "@/lib/schedule/filter";
import type { ScheduleDerived, TagCategory } from "@/lib/schedule/types";

/* Contract notes (builder context, en):
 * - The sidebar is a composable BLOCK: three collapsible FilterGroup
 *   sections in order type → location → topic (building-components:
 *   data-slot="filter-group" + data-category="type|topic|location";
 *   Radix Accordion trigger exposes aria-expanded; role=group fieldset
 *   body in Spanish).
 * - Facet mapping: activityTypes → type; tags → topic;
 *   venues → location as ONE room-only list in "Sala * (Edificio *)" format
 *   (the old "Sala # · Sala *" venue labels and the separate building row
 *   were duplicates — both removed). Counts/clears are per category.
 */

const derived: ScheduleDerived = {
  axes: [],
  tags: ["Salud", "Violencia"],
  activityTypes: ["Conferencia Magistral", "Mesa de Ponencias"],
  venues: [{ key: "sala-1", label: "Sala 1 (Edificio 3B)" }],
  buildings: [{ key: "3B", label: "Centro de Convenciones (Edificio 3B)" }],
};

const baseProps = {
  derived,
  resultCount: 4,
  onSearchChange: vi.fn(),
  onToggleTag: vi.fn(),
  onToggleActivityType: vi.fn(),
  onToggleVenue: vi.fn(),
  onToggleBuilding: vi.fn(),
  onClear: vi.fn(),
  onClearCategory: vi.fn(),
};

function renderSidebar(filters: Partial<ScheduleFilters> = {}) {
  return render(
    <FilterSidebar {...baseProps} filters={{ ...EMPTY_FILTERS, ...filters }} />,
  );
}

/** Locate one collapsible group by its stable data-slot/data-category contract. */
function group(container: HTMLElement, category: TagCategory): HTMLElement {
  const el = container.querySelector<HTMLElement>(
    `[data-slot="filter-group"][data-category="${category}"]`,
  );
  if (!el) throw new Error(`missing filter-group[data-category=${category}]`);
  return el;
}

/** Header count text ("n/total") inside a group. */
function countIn(container: HTMLElement, category: TagCategory): string {
  return (
    group(container, category).querySelector<HTMLElement>(
      '[data-slot="filter-group-count"]',
    )?.textContent ?? ""
  );
}

/** Collapsible header trigger (Radix AccordionTrigger wrapper). */
function triggerIn(container: HTMLElement, category: TagCategory): HTMLElement {
  const el = group(container, category).querySelector<HTMLElement>(
    '[data-slot="filter-group-trigger"]',
  );
  if (!el) throw new Error(`missing filter-group-trigger in ${category}`);
  return el;
}

describe("FilterSidebar", () => {
  it("renders three collapsible groups in order type → location → topic", () => {
    const { container } = renderSidebar();
    const order = [
      ...container.querySelectorAll('[data-slot="filter-group"]'),
    ].map((el) => el.getAttribute("data-category"));
    expect(order).toEqual(["type", "location", "topic"]);
    // each group exposes its Spanish header as a role=group fieldset
    expect(
      screen.getByRole("group", { name: "Tipo de actividad" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Ubicaciones" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Temas" })).toBeInTheDocument();
  });

  it("nests facets under the right category group", () => {
    const { container } = renderSidebar();
    const topic = group(container, "topic");
    const type = group(container, "type");
    const location = group(container, "location");

    expect(topic).toHaveTextContent("Salud");
    expect(topic).toHaveTextContent("Violencia");
    // activity types left "Temas" — they are presentation modes, not topics
    expect(topic).not.toHaveTextContent("Conferencia Magistral");
    expect(type).toHaveTextContent("Conferencia Magistral");
    expect(type).toHaveTextContent("Mesa de Ponencias");
    expect(location).toHaveTextContent("Sala 1 (Edificio 3B)");
    // building row removed — rooms carry the building in their own label
    expect(location).not.toHaveTextContent("Centro de Convenciones");
    expect(topic).not.toHaveTextContent("Sala 1 (Edificio");
    expect(location).not.toHaveTextContent("Violencia");
  });

  it("offers no building options in Ubicaciones (rooms only)", () => {
    renderSidebar();
    expect(
      screen.queryAllByRole("button", { name: /^Filtrar por edificio/ }),
    ).toEqual([]);
  });

  it("shows selected/total count scoped per category", () => {
    const { container } = renderSidebar({ tags: ["Salud"] });
    expect(countIn(container, "type")).toBe("0/2");
    expect(countIn(container, "location")).toBe("0/1"); // rooms only, no building row
    expect(countIn(container, "topic")).toBe("1/2");
  });

  it("per-category clear is disabled at zero and fires with its category", async () => {
    const user = userEvent.setup();
    renderSidebar({ activityTypes: ["Panel"], venues: ["sala-1"] });

    const clearType = screen.getByRole("button", {
      name: "Limpiar Tipo de actividad",
    });
    const clearTopic = screen.getByRole("button", { name: "Limpiar Temas" });
    const clearLocation = screen.getByRole("button", {
      name: "Limpiar Ubicaciones",
    });
    expect(clearType).toBeEnabled();
    expect(clearTopic).toBeDisabled(); // no tags selected → topic at zero
    expect(clearLocation).toBeEnabled();

    await user.click(clearType);
    expect(baseProps.onClearCategory).toHaveBeenLastCalledWith("type");
    await user.click(clearLocation);
    expect(baseProps.onClearCategory).toHaveBeenLastCalledWith("location");
  });

  it("collapses and reopens a group via its trigger (aria-expanded)", async () => {
    const user = userEvent.setup();
    const { container } = renderSidebar();
    const trigger = triggerIn(container, "type");
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await user.click(trigger);
    expect(triggerIn(container, "type")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    // Radix unmounts closed content → type options leave the DOM
    expect(
      screen.queryByRole("button", {
        name: "Filtrar por tipo Conferencia Magistral",
      }),
    ).not.toBeInTheDocument();

    await user.click(triggerIn(container, "type"));
    expect(triggerIn(container, "type")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(
      screen.getByRole("button", {
        name: "Filtrar por tipo Conferencia Magistral",
      }),
    ).toBeInTheDocument();
    // other groups stay open (type=multiple accordion)
    expect(
      screen.getByRole("button", { name: "Filtrar por etiqueta Salud" }),
    ).toBeInTheDocument();
  });

  it("forwards search input and global clear", async () => {
    const user = userEvent.setup();
    // Controlled harness: mirrors real usage where the parent owns the value.
    function SearchHarness() {
      const [query, setQuery] = React.useState("");
      return (
        <FilterSidebar
          {...baseProps}
          filters={{ ...EMPTY_FILTERS, searchQuery: query }}
          onSearchChange={(value) => {
            setQuery(value);
            baseProps.onSearchChange(value);
          }}
        />
      );
    }
    render(<SearchHarness />);

    await user.type(screen.getByPlaceholderText(/Buscar por título/), "viol");
    expect(baseProps.onSearchChange).toHaveBeenLastCalledWith("viol");

    // A non-empty query counts as an active filter → global clear enables.
    const globalClear = screen.getByRole("button", { name: "Limpiar filtros" });
    expect(globalClear).toBeEnabled();
  });

  it("marks rendered tags with their category (data-category contract)", () => {
    renderSidebar();
    const salud = screen.getByRole("button", {
      name: "Filtrar por etiqueta Salud",
    });
    expect(salud).toHaveAttribute("data-category", "topic");
    const sala = screen.getByRole("button", { name: /Filtrar por sala/ });
    expect(sala).toHaveAttribute("data-category", "location");
    const tipo = screen.getByRole("button", {
      name: "Filtrar por tipo Conferencia Magistral",
    });
    expect(tipo).toHaveAttribute("data-category", "type");
  });

  it("announces result count politely", () => {
    renderSidebar();
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("4 sesiones encontradas");
    expect(status).toHaveAttribute("aria-live", "polite");
  });
});
