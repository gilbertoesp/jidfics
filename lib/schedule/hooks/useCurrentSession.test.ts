import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCurrentSession } from "@/lib/schedule/hooks/useCurrentSession";
import type { ConferenceEvent } from "@/lib/schedule/types";

const mockEvents: ConferenceEvent[] = [
  {
    id: "evt-1",
    date: "2026-09-23",
    startTime: "09:00",
    endTime: "10:00",
    title: "Conferencia Magistral",
    venueKey: "sala-1",
    venueLabel: "Sala 1 · Centro de Convenciones",
    activityType: "Conferencia Magistral",
    thematicAxis: "Salud",
    speakers: [],
    papers: [],
  },
  {
    id: "evt-2",
    date: "2026-09-23",
    startTime: "10:00",
    endTime: "11:00",
    title: "Mesa 1 · Violencia",
    venueKey: "sala-2",
    venueLabel: "Sala 2 · Sala Audiovisual",
    activityType: "Trabajos Libres",
    thematicAxis: "Violencia",
    speakers: [],
    papers: [],
  },
  {
    id: "evt-3",
    date: "2026-09-23",
    startTime: "11:00",
    endTime: "12:00",
    title: "Conversatorio",
    venueKey: "sala-3",
    venueLabel: "Sala 3 · Sala Polivalente",
    activityType: "Conversatorio",
    thematicAxis: "Educación",
    speakers: [],
    papers: [],
  },
  {
    id: "evt-4",
    date: "2026-09-24",
    startTime: "09:00",
    endTime: "10:00",
    title: "Clausura",
    venueKey: "sala-1",
    venueLabel: "Sala 1 · Centro de Convenciones",
    activityType: "Clausura",
    thematicAxis: "General",
    speakers: [],
    papers: [],
  },
];

describe("useCurrentSession", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns empty arrays before conference dates", () => {
    const beforeConf = new Date("2026-09-20T12:00:00");
    const { result } = renderHook(() =>
      useCurrentSession({ events: mockEvents, initialTime: beforeConf }),
    );

    expect(result.current.liveNow).toHaveLength(0);
    expect(result.current.upNext).toHaveLength(0);
    expect(result.current.isWithinConferenceDates).toBe(false);
  });

  it("returns empty arrays after conference dates", () => {
    const afterConf = new Date("2026-09-25T12:00:00");
    const { result } = renderHook(() =>
      useCurrentSession({ events: mockEvents, initialTime: afterConf }),
    );

    expect(result.current.liveNow).toHaveLength(0);
    expect(result.current.upNext).toHaveLength(0);
    expect(result.current.isWithinConferenceDates).toBe(false);
  });

  it("detects LIVE NOW session", () => {
    const duringEvent = new Date("2026-09-23T09:30:00");
    const { result } = renderHook(() =>
      useCurrentSession({ events: mockEvents, initialTime: duringEvent }),
    );

    expect(result.current.liveNow).toHaveLength(1);
    expect(result.current.liveNow[0].id).toBe("evt-1");
    expect(result.current.upNext).toHaveLength(0);
    expect(result.current.isWithinConferenceDates).toBe(true);
  });

  it("detects UP NEXT within 30 minutes", () => {
    const beforeEvent = new Date("2026-09-23T08:45:00"); // 15 min before 09:00
    const { result } = renderHook(() =>
      useCurrentSession({ events: mockEvents, initialTime: beforeEvent }),
    );

    expect(result.current.liveNow).toHaveLength(0);
    expect(result.current.upNext).toHaveLength(1);
    expect(result.current.upNext[0].id).toBe("evt-1");
  });

  it("does not show UP NEXT beyond 30 minutes", () => {
    const wayBefore = new Date("2026-09-23T08:00:00"); // 60 min before
    const { result } = renderHook(() =>
      useCurrentSession({ events: mockEvents, initialTime: wayBefore }),
    );

    expect(result.current.upNext).toHaveLength(0);
  });

  it("groups live events by hall", () => {
    const duringMultiple = new Date("2026-09-23T09:30:00");
    // evt-1 (sala-1) and evt-2 (sala-2) both live
    const eventsWithOverlap = [
      mockEvents[0], // sala-1, 09-10
      mockEvents[1], // sala-2, 10-11 -> not live at 09:30
    ];
    // Actually evt-2 starts at 10:00, so only evt-1 is live
    const { result } = renderHook(() =>
      useCurrentSession({ events: eventsWithOverlap, initialTime: duringMultiple }),
    );

    expect(result.current.liveByHall["Hall 1"]).toHaveLength(1);
    expect(result.current.liveByHall["Hall 2"]).toBeUndefined();
  });

  it("time-travel mode works with setTimeTravel", () => {
    const { result } = renderHook(() =>
      useCurrentSession({ events: mockEvents, initialTime: new Date("2026-09-20T12:00:00") }),
    );

    expect(result.current.isTimeTravel).toBe(false);

    act(() => {
      result.current.setTimeTravel(new Date("2026-09-23T09:30:00"));
    });

    expect(result.current.isTimeTravel).toBe(true);
    expect(result.current.liveNow).toHaveLength(1);
    expect(result.current.liveNow[0].id).toBe("evt-1");
  });

  it("exits time-travel when setTimeTravel(null)", () => {
    const { result } = renderHook(() =>
      useCurrentSession({ events: mockEvents, initialTime: new Date("2026-09-23T09:30:00") }),
    );

    act(() => {
      result.current.setTimeTravel(null);
    });

    expect(result.current.isTimeTravel).toBe(false);
  });

  it("advanceMinutes moves time forward in time-travel mode", () => {
    const { result } = renderHook(() =>
      useCurrentSession({ events: mockEvents, initialTime: new Date("2026-09-23T08:45:00") }),
    );

    act(() => {
      result.current.setTimeTravel(new Date("2026-09-23T08:45:00"));
    });
    expect(result.current.upNext).toHaveLength(1);

    act(() => {
      result.current.advanceMinutes(20);
    });

    expect(result.current.liveNow).toHaveLength(1);
    expect(result.current.liveNow[0].id).toBe("evt-1");
  });

  it("jumpToEvent sets time to event start", () => {
    const { result } = renderHook(() =>
      useCurrentSession({ events: mockEvents, initialTime: new Date("2026-09-20T12:00:00") }),
    );

    act(() => {
      result.current.setTimeTravel(new Date("2026-09-20T12:00:00"));
    });

    act(() => {
      result.current.jumpToEvent("evt-3"); // 11:00
    });

    expect(result.current.currentTime).not.toBeNull();
    expect(result.current.currentTime!.getHours()).toBe(11);
    expect(result.current.currentTime!.getMinutes()).toBe(0);
  });
});