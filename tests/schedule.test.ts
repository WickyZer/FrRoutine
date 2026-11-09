import test from "node:test";
import assert from "node:assert/strict";
import {
  conflicts,
  dateKey,
  dayStats,
  initialData,
  minutes,
  scheduled,
  shiftDate,
  streak,
  timeEnd,
  weekDays,
} from "../src/data.ts";
import type { ClassItem, Habit } from "../src/types.ts";
const habit: Habit = {
  id: "h1",
  title: "Belajar",
  category: "Skill",
  icon: "code",
  time: "19:00",
  duration: 15,
  days: [0, 1, 2, 3, 4, 5, 6],
  archived: false,
  created_at: "2026-11-01T00:00:00Z",
};
const course: ClassItem = {
  id: "c1",
  title: "Kuliah",
  day: 1,
  start: "08:35",
  end: "09:45",
  room: "A",
};
test("date boundaries use WITA, including midnight and year rollover", () => {
  assert.equal(dateKey(new Date("2026-11-09T16:00:00Z")), "2026-11-10");
  assert.equal(shiftDate("2026-01-01", -1), "2025-12-31");
  assert.equal(shiftDate("2026-12-31", 1), "2027-01-01");
});
test("weeks run Monday to Sunday across month boundaries", () => {
  assert.deepEqual(weekDays("2026-11-01"), [
    "2026-10-26",
    "2026-10-27",
    "2026-10-28",
    "2026-10-29",
    "2026-10-30",
    "2026-10-31",
    "2026-11-01",
  ]);
});
test("overlap detection includes travel buffer and repeated days", () => {
  assert.equal(
    conflicts({ ...habit, time: "08:00", duration: 16 }, [course]).length,
    1,
  );
  assert.equal(
    conflicts({ ...habit, time: "08:00", duration: 15 }, [course]).length,
    0,
  );
  assert.equal(
    conflicts({ ...habit, time: "09:45", duration: 10 }, [course]).length,
    1,
  );
  assert.equal(
    conflicts({ ...habit, time: "10:05", duration: 10 }, [course]).length,
    0,
  );
  assert.equal(
    conflicts({ ...habit, time: "08:40", days: [2] }, [course]).length,
    0,
  );
});
test("statistics count scheduled habits once, not duplicate or foreign completions", () => {
  const data = {
    ...initialData(),
    habits: [habit],
    completions: [
      { habit_id: "h1", date: "2026-11-09" },
      { habit_id: "h1", date: "2026-11-09" },
      { habit_id: "other", date: "2026-11-09" },
    ],
  };
  assert.deepEqual(dayStats(data, "2026-11-09"), {
    total: 1,
    done: 1,
    percent: 100,
    minutes: 15,
  });
  assert.equal(scheduled({ ...habit, archived: true }, "2026-11-09"), false);
  assert.equal(scheduled({ ...habit, days: [2] }, "2026-11-09"), false);
  assert.equal(scheduled(habit, "2026-10-31"), false);
});
test("streak survives unfinished today, resets on missed prior day", () => {
  const data = {
    ...initialData(),
    habits: [habit],
    completions: [
      { habit_id: "h1", date: "2026-11-07" },
      { habit_id: "h1", date: "2026-11-08" },
    ],
  };
  assert.equal(streak(data, "2026-11-09"), 2);
  assert.equal(streak(data, "2026-11-10"), 0);
  data.completions.push({ habit_id: "h1", date: "2026-11-09" });
  assert.equal(streak(data, "2026-11-09"), 3);
});
test("duration formatting preserves exact end boundaries", () => {
  assert.equal(timeEnd("19:30:00", 30), "20:00");
  assert.equal(timeEnd("23:50", 10), "24:00");
  assert.equal(minutes("06:40:00"), 400);
});
