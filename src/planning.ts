import type { Habit, ClassItem, AppData } from "./types";
import {
  minutes,
  timeEnd,
  conflicts,
  dateKey,
  shiftDate,
  weekday,
  scheduled,
} from "./data.ts";
export interface PlanOptions {
  start: string;
  end: string;
  buffer: number;
  gap: number;
}
export function autoPlan(
  habits: Habit[],
  classes: ClassItem[],
  options: PlanOptions,
) {
  const result = habits.filter((h) => !h.archived).map((h) => ({ ...h }));
  const unresolved: string[] = [];
  const start = minutes(options.start),
    end = minutes(options.end);
  if (!Number.isFinite(start + end) || start >= end)
    throw new Error("Jam akhir harus setelah jam awal.");
  for (const h of result) {
    const slots: number[] = [];
    for (let m = start; m + h.duration <= end; m += 5) slots.push(m);
    // Prefer a familiar hour, then the earliest equally close free slot.
    slots.sort(
      (a, b) =>
        Math.abs(a - minutes(h.time)) - Math.abs(b - minutes(h.time)) || a - b,
    );
    const found = slots.find((m) => {
      const time = timeEnd("00:00", m);
      return (
        !conflicts({ ...h, time }, classes, options.buffer).length &&
        !result.some(
          (other) =>
            other.id !== h.id &&
            other.days.some((d) => h.days.includes(d)) &&
            m < minutes(other.time) + other.duration + options.gap &&
            m + h.duration + options.gap > minutes(other.time),
        )
      );
    });
    if (found === undefined) unresolved.push(h.id);
    else h.time = timeEnd("00:00", found);
  }
  return { habits: result, unresolved };
}
export interface ReminderSettings {
  enabled: boolean;
  lead: number;
  habits: boolean;
  classes: boolean;
}
export interface ReminderEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  at: number;
  due: number;
  kind: "Rutinitas" | "Kuliah";
}
export function reminderEvents(
  data: AppData,
  now: Date,
  settings: ReminderSettings,
): ReminderEvent[] {
  const today = dateKey(now, data.profile.timezone);
  // App currently supports WITA; use an explicit offset instead of the device zone.
  return [today, shiftDate(today, 1)]
    .flatMap((date) => {
      const items: {
        id: string;
        title: string;
        time: string;
        kind: "Rutinitas" | "Kuliah";
      }[] = [];
      if (settings.habits)
        data.habits
          .filter(
            (h) =>
              scheduled(h, date) &&
              !data.completions.some(
                (c) => c.habit_id === h.id && c.date === date,
              ),
          )
          .forEach((h) =>
            items.push({
              id: `h-${h.id}`,
              title: h.title,
              time: h.time.slice(0, 5),
              kind: "Rutinitas",
            }),
          );
      if (settings.classes)
        data.classes
          .filter((c) => c.day === weekday(date))
          .forEach((c) =>
            items.push({
              id: `c-${c.id}`,
              title: c.title,
              time: c.start.slice(0, 5),
              kind: "Kuliah",
            }),
          );
      return items.map((item) => {
        const at = Date.parse(`${date}T${item.time}:00+08:00`);
        return {
          ...item,
          date,
          id: `${date}-${item.id}-${item.time}-${settings.lead}`,
          at,
          due: at - settings.lead * 60000,
        };
      });
    })
    .sort((a, b) => a.at - b.at);
}
export type FocusPhase = "focus" | "break";
export interface FocusSession {
  id: string;
  habitId: string;
  title: string;
  minutes: number;
  completedAt: string;
}
export interface FocusState {
  phase: FocusPhase;
  duration: number;
  remaining: number;
  end: number | null;
  status: "idle" | "running" | "paused" | "finished";
  habitId: string;
  title: string;
  id: string;
}
export function focusRemaining(state: FocusState, now: number) {
  return state.status === "running" && state.end !== null
    ? Math.max(0, Math.ceil((state.end - now) / 1000))
    : state.remaining;
}
export function finishFocus(
  state: FocusState,
  sessions: FocusSession[],
  now: number,
) {
  if (state.status !== "running" || focusRemaining(state, now) > 0)
    return { state, sessions };
  const record: FocusSession = {
    id: state.id,
    habitId: state.habitId,
    title: state.title,
    minutes: state.duration,
    completedAt: new Date(state.end ?? now).toISOString(),
  };
  return {
    state: { ...state, status: "finished" as const, remaining: 0, end: null },
    sessions:
      state.phase === "focus" && !sessions.some((s) => s.id === record.id)
        ? [record, ...sessions].slice(0, 300)
        : sessions,
  };
}
