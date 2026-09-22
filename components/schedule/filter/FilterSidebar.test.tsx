import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { FilterSidebar } from "@/components/schedule/filter/FilterSidebar";
import { EMPTY_FILTERS, type ScheduleFilters } from "@/lib/schedule/filter";
import type { ScheduleDerived } from "@/lib/schedule/types";

/* Contract notes (builder context, en):
 * - The sidebar is a composable BLOCK: two FilterGroup sections, one per
 *   TagCategory ("topic" | "location"), each with header, selected count
 *   and per-category clear (building-components: data-slot/data-category,
 *   role=group + aria-label in Spanish content).
 * - Facet mapping: tags+activityTypes → topic; venues+buildings → location.
 */

const derived: ScheduleDerived = {
  axes: [],
  tags: ["Salud", "Violencia"],
  activityTypes: ["Conferencia Magistral", "Mesa de Ponencias"],
  venues: [{ key: "sala-1", label: "Sala 1 · Centro de Convenciones" }],
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

describe("FilterSidebar", () => {
  it("renders one group per category with Spanish headers", () => {
    renderSidebar();
    expect(screen.getByRole("group", { name: "Temas" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Ubicaciones" })).toBeInTheDocument();
  });

  it("nests facets under the right category group", () => {
    renderSidebar();
    const topics = screen.getByRole("group", { name: "Temas" });
    const locations = screen.getByRole("group", { name: "Ubicaciones" });

    expect(topics).toHaveTextContent("Salud");
    expect(topics).toHaveTextContent("Conferencia Magistral");
    expect(locations).toHaveTextContent("Sala 1 · Centro de Convenciones");
    expect(locations).toHaveTextContent("Edificio 3B");
    // location group must not leak topic tags and vice versa
    expect(topics).not.toHaveTextContent("Sala 1 · Centro");
    expect(locations).not.toHaveTextContent("Violencia");
  });

  it("shows selected/total count per category", () => {
    renderSidebar({ tags: ["Salud"] }); // topic: 1 of 4, location: 0 of 2
    expect(screen.getByText("1/4")).toBeInTheDocument();
    expect(screen.getByText("0/2")).toBeInTheDocument();
  });

  it("per-category clear is disabled at zero and fires with the category", async () => {
    const user = userEvent.setup();
    renderSidebar({ venues: ["sala-1"] });

    const clearTopic = screen.getByRole("button", { name: "Limpiar Temas" });
    const clearLocation = screen.getByRole("button", { name: "Limpiar Ubicaciones" });
    expect(clearTopic).toBeDisabled();
    expect(clearLocation).toBeEnabled();

    await user.click(clearLocation);
    expect(baseProps.onClearCategory).toHaveBeenCalledWith("location");
  });

  it("forwards search input and global clear", async () => {
    const user = userEvent.setup();
    renderSidebar();

    await user.type(screen.getByPlaceholderText(/Buscar por título/), "viol");
    expect(baseProps.onSearchChange).toHaveBeenCalledWith("viol");

    const globalClear = screen.getByRole("button", { name: "Limpiar filtros" });
    expect(globalClear).toBeDisabled();
  });

  it("marks rendered tags with their category (data-category contract)", () => {
    renderSidebar();
    const salud = screen.getByRole("button", { name: "Filtrar por etiqueta Salud" });
    expect(salud).toHaveAttribute("data-category", "topic");
    const sala = screen.getByRole("button", { name: /Filtrar por sala/ });
    expect(sala).toHaveAttribute("data-category", "location");
  });

  it("announces result count politely", () => {
    renderSidebar();
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("4 sesiones encontradas");
    expect(status).toHaveAttribute("aria-live", "polite");
  });
});
