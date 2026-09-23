import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useEventDetails } from "@/lib/schedule/hooks/useEventDetails";
import type { ConferenceEvent } from "@/lib/schedule/types";

/* Contract notes (builder context, en):
 * - Controlled by the URL: open → history.replaceState("?event=<id>"),
 *   close → param stripped, other params preserved.
 * - Deep link is read once on mount and validated against known ids.
 * - No Next router dependency (replaceState = no history spam on open/close).
 */

function makeEvent(id: string): ConferenceEvent {
  return {
    id,
    date: "2026-09-23",
    startTime: "09:00",
    endTime: "10:00",
    title: `Sesión ${id}`,
    activityType: "Conferencia Magistral",
    thematicAxis: "Violencia",
    tags: ["Violencia"],
    building: "3B",
    locationKey: "sala-1",
    roomName: "Sala 1",
    locationLabel: "Sala 1 · Centro de Convenciones",
    hallName: "Centro de Convenciones",
    speakers: [],
    papers: [],
  };
}

const events = [makeEvent("e1"), makeEvent("e2")];

beforeEach(() => {
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("useEventDetails", () => {
  it("opens an event and writes ?event=<id> to the URL", () => {
    const { result } = renderHook(() => useEventDetails(events));
    expect(result.current.detailEvent).toBeNull();

    act(() => result.current.openDetail(events[1]));
    expect(result.current.detailEvent?.id).toBe("e2");
    expect(window.location.search).toBe("?event=e2");
  });

  it("closes and strips only the event param", () => {
    window.history.replaceState(null, "", "/?event=e1&utm=x");
    const { result } = renderHook(() => useEventDetails(events));

    // deep link read on mount
    expect(result.current.detailEvent?.id).toBe("e1");

    act(() => result.current.closeDetail());
    expect(result.current.detailEvent).toBeNull();
    expect(window.location.search).toBe("?utm=x");
  });

  it("ignores unknown deep-link ids", () => {
    window.history.replaceState(null, "", "/?event=evil");
    const { result } = renderHook(() => useEventDetails(events));
    expect(result.current.detailEvent).toBeNull();
    expect(window.location.search).toBe("?event=evil"); // untouched until user acts
  });

  it("switches directly between related events (replace, not push)", () => {
    const { result } = renderHook(() => useEventDetails(events));
    act(() => result.current.openDetail(events[0]));
    act(() => result.current.openDetail(events[1]));
    expect(result.current.detailEvent?.id).toBe("e2");
    expect(window.location.search).toBe("?event=e2");
  });
});
