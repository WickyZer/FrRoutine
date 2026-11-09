import type { AppData, Habit, ClassItem } from "./types.ts";
export const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
export const FULL_DAYS = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];
export function newId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
const every = [0, 1, 2, 3, 4, 5, 6];
export const habitTemplates: [string, string, string, string, number][] = [
  ["Rapikan tempat tidur & minum air", "Kesehatan", "water", "05:15", 5],
  ["Peregangan pagi", "Kesehatan", "stretch", "05:20", 10],
  ["Baca 10 menit", "Pengembangan diri", "book", "05:30", 10],
  ["Jalan kaki atau olahraga ringan", "Kesehatan", "activity", "17:00", 20],
  ["Review materi kuliah", "Akademik", "graduation", "19:00", 15],
  ["Latihan bahasa Inggris", "Skill", "languages", "19:15", 15],
  ["Belajar coding & skill digital", "Skill", "code", "19:30", 30],
  ["Latihan mengetik & logika", "Skill", "keyboard", "20:00", 10],
  ["Catat pengeluaran harian", "Pribadi", "wallet", "20:10", 5],
  ["Refleksi & rencana besok", "Pribadi", "journal", "20:15", 10],
];
// Personal college timetables are kept in the hosted database, never in public source.
export const classTemplates: [string, number, string, string, string][] = [];
export function initialData(): AppData {
  return {
    habits: habitTemplates.map(([title, category, icon, time, duration]) => ({
      id: newId(),
      title,
      category,
      icon,
      time,
      duration,
      days: every,
      archived: false,
      created_at: new Date().toISOString(),
    })),
    classes: classTemplates.map(([title, day, start, end, room]) => ({
      id: newId(),
      title,
      day,
      start,
      end,
      room,
    })),
    completions: [],
    goals: [],
    journals: [],
    profile: { name: "Teman", timezone: "Asia/Makassar", onboarded: false },
  };
}
export function dateKey(date = new Date(), timezone = "Asia/Makassar") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
export function parseDate(key: string) {
  return new Date(`${key}T12:00:00+08:00`);
}
export function shiftDate(key: string, offset: number) {
  const d = parseDate(key);
  d.setUTCDate(d.getUTCDate() + offset);
  return dateKey(d);
}
export function weekday(key: string) {
  return parseDate(key).getUTCDay();
}
export function minutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
export function timeEnd(time: string, duration: number) {
  const total = minutes(time) + duration;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
export function scheduled(habit: Habit, key: string) {
  return (
    !habit.archived &&
    habit.days.includes(weekday(key)) &&
    dateKey(new Date(habit.created_at)) <= key
  );
}
export function conflicts(
  habit: Pick<Habit, "time" | "duration" | "days">,
  classes: ClassItem[],
  buffer = 20,
) {
  return classes.filter(
    (c) =>
      habit.days.includes(c.day) &&
      minutes(habit.time) < minutes(c.end) + buffer &&
      minutes(habit.time) + habit.duration > minutes(c.start) - buffer,
  );
}
export function dayStats(data: AppData, key: string) {
  const habits = data.habits.filter((h) => scheduled(h, key));
  const done = habits.filter((h) =>
    data.completions.some((c) => c.habit_id === h.id && c.date === key),
  );
  return {
    total: habits.length,
    done: done.length,
    percent: habits.length
      ? Math.round((done.length / habits.length) * 100)
      : 0,
    minutes: done.reduce((s, h) => s + h.duration, 0),
  };
}
// A productive day is >=70% of its scheduled habits. Today need not be finished yet.
export function streak(data: AppData, today: string) {
  let count = 0;
  let key = dayStats(data, today).percent >= 70 ? today : shiftDate(today, -1);
  for (let i = 0; i < 3660; i++) {
    const s = dayStats(data, key);
    if (!s.total || s.percent < 70) break;
    count++;
    key = shiftDate(key, -1);
  }
  return count;
}
export function weekDays(key: string) {
  const start = shiftDate(key, -((weekday(key) + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => shiftDate(start, i));
}
