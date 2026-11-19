export type Rating = { goal: number; satisfaction: number; focus: number; note: string };
export type DayRecord = { work: number; rest: number; note: string; rating?: Rating }; // seconds
export type SoundId = "chime" | "bell" | "digital" | "soft";
export type Prefs = { sound: SoundId; volume: number; opacity: number; dark: boolean }; // volume/opacity 0..100
export type Data = {
  days: Record<string, DayRecord>;
  totalWorkSeconds: number;
  settings: { work: number; rest: number }; // minutes
  prefs: Prefs;
};
const KEY = "grove-timer-data-v1";
export const defaultPrefs = (): Prefs => ({ sound: "chime", volume: 70, opacity: 100, dark: false });
export const emptyData = (): Data => ({ days: {}, totalWorkSeconds: 0, settings: { work: 25, rest: 5 }, prefs: defaultPrefs() });
export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function load(): Data {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyData();
    const p = JSON.parse(raw);
    return { ...emptyData(), ...p, prefs: { ...defaultPrefs(), ...p.prefs } };
  } catch {
    return emptyData();
  }
}
export function save(d: Data) {
  localStorage.setItem(KEY, JSON.stringify(d));
}
export function addTime(d: Data, kind: "work" | "rest", seconds: number): Data {
  const k = todayKey();
  const day = d.days[k] ?? { work: 0, rest: 0, note: "" };
  return {
    ...d,
    totalWorkSeconds: d.totalWorkSeconds + (kind === "work" ? seconds : 0),
    days: { ...d.days, [k]: { ...day, [kind]: day[kind] + seconds } },
  };
}
const clampStar = (n: number) => Math.max(0, Math.min(5, Math.round(n)));
export function setRating(d: Data, day: string, r: Rating): Data {
  const prev = d.days[day] ?? { work: 0, rest: 0, note: "" };
  const rating = { goal: clampStar(r.goal), satisfaction: clampStar(r.satisfaction), focus: clampStar(r.focus), note: r.note };
  return { ...d, days: { ...d.days, [day]: { ...prev, rating } } };
}
/** Tree growth 0..1: reaches full size after 100 hours of work. */
export const FULL_TREE_MINUTES = 6000;
export const growth = (workSeconds: number) => Math.min(1, workSeconds / 60 / FULL_TREE_MINUTES);
/** Trees repeat: each full tree joins the background; 10 full trees become one forest, then the count restarts. */
export function forestState(workSeconds: number) {
  const min = workSeconds / 60;
  const trees = Math.floor(min / FULL_TREE_MINUTES);
  return { forests: Math.floor(trees / 10), grownTrees: trees % 10, g: (min % FULL_TREE_MINUTES) / FULL_TREE_MINUTES };
}
