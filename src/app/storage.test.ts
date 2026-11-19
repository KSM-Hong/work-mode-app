import { describe, it, expect } from "vitest";
import { addTime, emptyData, growth, todayKey } from "./storage";
describe("records", () => {
  it("work time adds to today and to the tree total", () => {
    const d = addTime(addTime(emptyData(), "work", 60), "rest", 30);
    expect(d.days[todayKey()]).toMatchObject({ work: 60, rest: 30 });
    expect(d.totalWorkSeconds).toBe(60);
  });
  it("tree grows per work minute and caps at full", () => {
    expect(growth(0)).toBe(0);
    expect(growth(60 * 3000)).toBe(0.5);
    expect(growth(60 * 99999)).toBe(1);
  });
});
import { setRating } from "./storage";
describe("daily rating", () => {
  it("stars are kept between 0 and 5 and saved on the day", () => {
    const d = setRating(emptyData(), "2026-11-16", { goal: 7, satisfaction: -2, focus: 3, note: "ok" });
    expect(d.days["2026-11-16"]!.rating).toEqual({ goal: 5, satisfaction: 0, focus: 3, note: "ok" });
  });
});
import { forestState } from "./storage";
describe("tree cycle", () => {
  it("a full tree moves to the back and a new seed starts", () => {
    expect(forestState(60 * 6000 * 3 + 60 * 3000)).toEqual({ forests: 0, grownTrees: 3, g: 0.5 });
  });
  it("10 full trees become one forest and start over", () => {
    expect(forestState(60 * 6000 * 10)).toEqual({ forests: 1, grownTrees: 0, g: 0 });
    expect(forestState(60 * 6000 * 12)).toEqual({ forests: 1, grownTrees: 2, g: 0 });
  });
});
