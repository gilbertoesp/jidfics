import { describe, expect, it } from "vitest";

import {
  buildShareUrl,
  findRelatedEvents,
  parseEventParam,
  removeEventParam,
  serializeEventParam,
} from "@/lib/schedule/eventDetail";
import type { ConferenceEvent } from "@/lib/schedule/types";

/* Contract notes (builder context, en):
 * - URL deep-link: `?event=<id>` validated STRICTLY against known ids
 *   (junk/unknown ids → null, never rendered).
 * - Related sessions: same date only; ranking =
 *   same start time (4) + same location (2) + same thematic axis (1);
 *   score 0 excluded; ties broken chronologically; capped by limit.
 */

function makeEvent(partial: Partial<ConferenceEvent>): ConferenceEvent {
  return {
    id: "EVT",
    date: "2026-09-23",
    startTime: "09:00",
    endTime: "10:00",
    title: "Sesión",
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
    ...partial,
  };
}

const self = makeEvent({ id: "e1" });
const events: ConferenceEvent[] = [
  self,
  makeEvent({
    id: "e2",
    startTime: "09:00",
    locationKey: "sala-1",
    roomName: "Sala 1",
    locationLabel: "Sala 1 · Centro de Convenciones",
    hallName: "Centro de Convenciones",
    thematicAxis: "Género",
  }), // 4+2=6
  makeEvent({
    id: "e3",
    startTime: "09:00",
    locationKey: "sala-2",
    roomName: "Sala 2",
    locationLabel: "Sala 2 · Audiovisual",
    hallName: "Audiovisual",
    thematicAxis: "Violencia",
  }), // 4+1=5
  makeEvent({
    id: "e4",
    startTime: "10:00",
    locationKey: "sala-1",
    roomName: "Sala 1",
    locationLabel: "Sala 1 · Centro de Convenciones",
    hallName: "Centro de Convenciones",
    thematicAxis: "Género",
  }), // 2
  makeEvent({
    id: "e5",
    startTime: "11:00",
    locationKey: "sala-2",
    roomName: "Sala 2",
    locationLabel: "Sala 2 · Audiovisual",
    hallName: "Audiovisual",
    thematicAxis: "Educación",
  }), // 0 → excluded
  makeEvent({
    id: "e6",
    startTime: "09:00",
    locationKey: "sala-1",
    roomName: "Sala 1",
    locationLabel: "Sala 1 · Centro de Convenciones",
    hallName: "Centro de Convenciones",
    thematicAxis: "Salud",
  }), // 4+2=6
  makeEvent({
    id: "e7",
    date: "2026-09-24",
    startTime: "09:00",
    locationKey: "sala-1",
    roomName: "Sala 1",
    locationLabel: "Sala 1 · Centro de Convenciones",
    hallName: "Centro de Convenciones",
  }), // other day → excluded
];

describe("parseEventParam", () => {
  it("returns the id only when present in knownIds", () => {
    expect(parseEventParam("?event=e1", ["e1", "e2"])).toBe("e1");
    expect(parseEventParam("?event=e2", ["e1", "e2"])).toBe("e2");
  });

  it("parses alongside other params", () => {
    expect(parseEventParam("?date=2026-09-23&event=e2", ["e1", "e2"])).toBe(
      "e2",
    );
  });

  it("rejects unknown, empty, or junk input", () => {
    expect(parseEventParam("?event=nope", ["e1"])).toBeNull();
    expect(parseEventParam("?event=", ["e1"])).toBeNull();
    expect(parseEventParam("?", ["e1"])).toBeNull();
    expect(parseEventParam("", ["e1"])).toBeNull();
    expect(parseEventParam(undefined, ["e1"])).toBeNull();
    expect(parseEventParam(null, ["e1"])).toBeNull();
    expect(parseEventParam("?event=<script>", ["e1"])).toBeNull();
  });
});

describe("serializeEventParam / removeEventParam", () => {
  it("round-trips with parse", () => {
    const serialized = serializeEventParam("e1");
    expect(serialized).toBe("?event=e1");
    expect(parseEventParam(serialized, ["e1"])).toBe("e1");
  });

  it("encodes exotic ids", () => {
    expect(serializeEventParam("a/b")).toBe("?event=a%2Fb");
    expect(parseEventParam("?event=a%2Fb", ["a/b"])).toBe("a/b");
  });

  it("strips only the event param on close", () => {
    expect(removeEventParam("?event=e1")).toBe("");
    expect(removeEventParam("?event=e1&x=1")).toBe("?x=1");
    expect(removeEventParam("?x=1")).toBe("?x=1");
    expect(removeEventParam("")).toBe("");
    expect(removeEventParam(null)).toBe("");
  });
});

describe("buildShareUrl", () => {
  it("builds a canonical shareable URL", () => {
    expect(buildShareUrl("https://jidfics.vercel.app", "e1")).toBe(
      "https://jidfics.vercel.app/?event=e1",
    );
  });

  it("replaces an existing event param instead of duplicating it", () => {
    expect(buildShareUrl("https://x.dev/?event=old", "e1")).toBe(
      "https://x.dev/?event=e1",
    );
  });
});

describe("findRelatedEvents", () => {
  it("ranks time → location → axis and excludes unrelated/other-day sessions", () => {
    const related = findRelatedEvents(events, self);
    expect(related.map((e) => e.id)).toEqual(["e2", "e6", "e3", "e4"]);
  });

  it("never includes itself", () => {
    const ids = findRelatedEvents(events, self).map((e) => e.id);
    expect(ids).not.toContain("e1");
  });

  it("respects the limit", () => {
    expect(findRelatedEvents(events, self, 2).map((e) => e.id)).toEqual([
      "e2",
      "e6",
    ]);
  });

  it("returns empty when nothing matches", () => {
    const loner = makeEvent({
      id: "x1",
      locationKey: "sala-9",
      roomName: "Sala 9",
      thematicAxis: "Único",
      startTime: "13:00",
    });
    expect(findRelatedEvents([loner], loner)).toEqual([]);
  });
});
