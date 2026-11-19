import { describe, expect, it } from "vitest";
import { gradingDates, timerOnStart } from "./session";

describe("paused timer", () => {
  const settings = { work: 25, rest: 5 };
  it("Resume keeps the time remaining when settings did not change", () => {
    expect(timerOnStart("work", 1421, settings, settings, true)).toEqual({ phase: "work", left: 1421 });
  });
  it("Restart resets work to the configured duration", () => {
    expect(timerOnStart("work", 1421, settings, settings, true, true)).toEqual({ phase: "work", left: 1500 });
  });
  it("Restart resets rest to the configured rest duration", () => {
    expect(timerOnStart("rest", 41, settings, settings, true, true)).toEqual({ phase: "rest", left: 300 });
  });
  it("Resume uses changed settings without changing the paused phase", () => {
    expect(timerOnStart("work", 1421, { work: 30, rest: 5 }, settings, true)).toEqual({ phase: "work", left: 1800 });
  });
});

describe("overnight grading", () => {
  it("defaults to the session's previous day after midnight", () => {
    expect(gradingDates("2026-11-18", new Date(2026, 10, 19, 0, 5))).toEqual({ today: "2026-11-19", yesterday: "2026-11-18", selected: "2026-11-18" });
  });
  it("keeps the starting day for sessions lasting more than two days", () => {
    expect(gradingDates("2026-11-16", new Date(2026, 10, 19, 1))).toMatchObject({ selected: "2026-11-16" });
  });
  it("defaults a manual grade to today and computes yesterday across year boundaries", () => {
    expect(gradingDates(null, new Date(2027, 0, 1, 1))).toEqual({ today: "2027-01-01", yesterday: "2026-12-31", selected: "2027-01-01" });
  });
});