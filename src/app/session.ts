import { todayKey } from "./storage";

export type Phase = "work" | "rest";
export type TimerSettings = { work: number; rest: number };

export function timerOnStart(phase: Phase, left: number, settings: TimerSettings, stoppedWith: TimerSettings | null, hasSession: boolean, restart = false) {
  if (!hasSession || left <= 0) return { phase: "work" as const, left: settings.work * 60 };
  return { phase, left: restart || (stoppedWith !== null && stoppedWith[phase] !== settings[phase]) ? settings[phase] * 60 : left };
}

export function gradingDates(startDay: string | null, now = new Date()) {
  const today = todayKey(now);
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  return { today, yesterday: todayKey(yesterdayDate), selected: startDay && startDay < today ? startDay : today };
}