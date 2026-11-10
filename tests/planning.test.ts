import test from "node:test";
import assert from "node:assert/strict";
import {
  autoPlan,
  reminderEvents,
  focusRemaining,
  finishFocus,
  type FocusState,
} from "../src/planning.ts";
import { conflicts, initialData, minutes } from "../src/data.ts";
import type { Habit, ClassItem } from "../src/types.ts";
const h = (id: string, time = "08:00", days = [1, 2]): Habit => ({
  id,
  title: id,
  time,
  days,
  duration: 30,
  category: "Skill",
  icon: "book",
  archived: false,
  created_at: "2026-01-01T00:00:00Z",
});
const c: ClassItem = {
  id: "class",
  title: "Kuliah",
  day: 1,
  start: "08:00",
  end: "10:00",
  room: "",
};
const opts = { start: "07:00", end: "12:00", buffer: 20, gap: 5 };
test("automatic plan avoids every recurring class and leaves space between habits", () => {
  const result = autoPlan([h("a"), h("b", "08:30")], [c], opts);
  assert.equal(result.unresolved.length, 0);
  for (const item of result.habits)
    assert.equal(conflicts(item, [c], 20).length, 0);
  const [a, b] = result.habits
    .map((x) => minutes(x.time))
    .sort((a, b) => a - b);
  assert.ok(b - a >= 35);
  assert.deepEqual(result.habits[0].days, [1, 2]);
});
test("no shared slot preserves original habit rather than silently dropping days", () => {
  const original = h("a");
  const result = autoPlan([original], [c], {
    ...opts,
    start: "08:00",
    end: "09:00",
  });
  assert.deepEqual(result.unresolved, ["a"]);
  assert.deepEqual(result.habits[0], original);
  assert.equal(original.time, "08:00");
});
test("planner ignores archived habits and permits equal slots on different days", () => {
  const result = autoPlan(
    [
      h("a", "08:00", [1]),
      h("b", "08:00", [2]),
      { ...h("old"), archived: true },
    ],
    [],
    opts,
  );
  assert.equal(result.habits.length, 2);
  assert.equal(result.habits[0].time, result.habits[1].time);
});
test("reminders include next-day classes whose lead crosses WITA midnight", () => {
  const d = initialData();
  d.habits = [];
  d.classes = [{ ...c, day: 2, start: "00:05" }];
  const events = reminderEvents(d, new Date("2026-11-09T23:58:00+08:00"), {
    enabled: true,
    lead: 10,
    habits: true,
    classes: true,
  });
  assert.equal(events[0].date, "2026-11-10");
  assert.equal(events[0].due, Date.parse("2026-11-09T23:55:00+08:00"));
});
test("completed and archived routines do not trigger reminders", () => {
  const d = initialData();
  d.classes = [];
  d.habits = [h("done"), { ...h("old"), archived: true }];
  d.completions = [{ habit_id: "done", date: "2026-11-09" }];
  const events = reminderEvents(d, new Date("2026-11-09T08:00:00+08:00"), {
    enabled: true,
    lead: 0,
    habits: true,
    classes: false,
  });
  assert.ok(!events.some((e) => e.date === "2026-11-09"));
  assert.ok(!events.some((e) => e.title === "old"));
});
const state: FocusState = {
  id: "session",
  phase: "focus",
  duration: 25,
  remaining: 1500,
  status: "running",
  end: 100000,
  habitId: "a",
  title: "Belajar",
};
test("focus resumes against absolute deadline and records an expired session only once", () => {
  assert.equal(focusRemaining(state, 70000), 30);
  const finished = finishFocus(state, [], 101000);
  assert.equal(finished.state.status, "finished");
  assert.equal(finished.sessions.length, 1);
  const again = finishFocus(state, finished.sessions, 102000);
  assert.equal(again.sessions.length, 1);
  assert.equal(
    finishFocus(finished.state, finished.sessions, 102000).sessions.length,
    1,
  );
});
test("paused sessions and breaks never inflate completed focus minutes", () => {
  assert.equal(
    focusRemaining(
      { ...state, status: "paused", remaining: 60, end: null },
      999999,
    ),
    60,
  );
  assert.equal(
    finishFocus({ ...state, status: "paused" }, [], 999999).sessions.length,
    0,
  );
  assert.equal(
    finishFocus({ ...state, phase: "break" }, [], 999999).sessions.length,
    0,
  );
});
