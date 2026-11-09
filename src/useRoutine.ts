import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type {
  AppData,
  Habit,
  ClassItem,
  Goal,
  Journal,
  Profile,
} from "./types";
import { initialData } from "./data";
import { supabase } from "./supabase";
const LOCAL = "frroutine.guest.v1";
function readGuest(): AppData {
  try {
    const value = localStorage.getItem(LOCAL);
    if (value) {
      const parsed = JSON.parse(value);
      if (
        Array.isArray(parsed.habits) &&
        Array.isArray(parsed.classes) &&
        parsed.profile
      )
        return parsed;
    }
  } catch {}
  return initialData();
}
function fail(error: unknown): never {
  throw new Error(
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String(error.message)
        : "Terjadi kesalahan. Coba lagi.",
  );
}
export function useRoutine() {
  const [data, setData] = useState<AppData>(readGuest);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [issue, setIssue] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const identity = useRef<string | null>(null);
  const generation = useRef(0);
  const skipPersist = useRef(false);
  useEffect(() => {
    let alive = true;
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) setIssue(error.message);
        setUser(data.session?.user ?? null);
        setReady(true);
      })
      .catch((error) => {
        if (alive) {
          setIssue(error.message);
          setReady(true);
        }
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive) {
        setUser(session?.user ?? null);
        setReady(true);
      }
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);
  async function refresh(uid: string) {
    const token = ++generation.current;
    setLoading(true);
    setIssue("");
    try {
      const init = await supabase.rpc("initialize_frroutine");
      if (init.error) fail(init.error);
      const results = await Promise.all([
        supabase.from("habits").select("*").order("time"),
        supabase.from("completions").select("*"),
        supabase.from("classes").select("*").order("start"),
        supabase.from("goals").select("*"),
        supabase.from("journals").select("*"),
        supabase.from("profiles").select("*").eq("user_id", uid).single(),
      ]);
      for (const r of results) if (r.error) fail(r.error);
      if (identity.current !== uid || token !== generation.current) return;
      const [h, c, cl, g, j, p] = results;
      setData({
        habits: h.data as Habit[],
        completions: c.data!,
        classes: cl.data as ClassItem[],
        goals: g.data as Goal[],
        journals: j.data as Journal[],
        profile: p.data as Profile,
      });
    } catch (e) {
      if (identity.current === uid) setIssue((e as Error).message);
    } finally {
      if (identity.current === uid) setLoading(false);
    }
  }
  useEffect(() => {
    if (!ready) return;
    identity.current = user?.id ?? null;
    generation.current++;
    skipPersist.current = true;
    if (user) {
      setData({
        habits: [],
        completions: [],
        classes: [],
        goals: [],
        journals: [],
        profile: {
          name: user.user_metadata?.name || "Teman",
          timezone: "Asia/Makassar",
          onboarded: true,
        },
      });
      void refresh(user.id);
    } else {
      setLoading(false);
      setData(readGuest());
    }
  }, [user?.id, ready]);
  useEffect(() => {
    if (skipPersist.current) {
      skipPersist.current = false;
      return;
    }
    if (ready && !user && !loading) {
      try {
        localStorage.setItem(LOCAL, JSON.stringify(data));
      } catch {
        setIssue(
          "Penyimpanan perangkat penuh. Ekspor data Anda sebelum menutup aplikasi.",
        );
      }
    }
  }, [data, ready, user, loading]);
  async function mutate(
    remote: () => PromiseLike<{ error: unknown }>,
    update: (previous: AppData) => AppData,
  ) {
    if (lock.current) throw new Error("Tunggu penyimpanan sebelumnya selesai.");
    if (loading || (issue && user))
      throw new Error("Muat ulang data akun sebelum mengubahnya.");
    lock.current = true;
    setBusy(true);
    const uid = identity.current;
    try {
      if (user) {
        if (!navigator.onLine)
          throw new Error(
            "Anda sedang offline. Hubungkan internet untuk menyimpan data akun.",
          );
        const r = await remote();
        if (r.error) fail(r.error);
      }
      if (uid === identity.current) setData(update);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const uid = () => user?.id;
  return {
    data,
    user,
    ready,
    loading,
    issue,
    busy,
    retry: () => user && refresh(user.id),
    toggle: (habit_id: string, date: string) => {
      const exists = data.completions.some(
        (c) => c.habit_id === habit_id && c.date === date,
      );
      return mutate(
        () =>
          exists
            ? supabase
                .from("completions")
                .delete()
                .eq("habit_id", habit_id)
                .eq("date", date)
            : supabase
                .from("completions")
                .insert({ habit_id, date, user_id: uid() }),
        (d) => ({
          ...d,
          completions: exists
            ? d.completions.filter(
                (c) => !(c.habit_id === habit_id && c.date === date),
              )
            : [...d.completions, { habit_id, date }],
        }),
      );
    },
    saveHabit: (habit: Habit) =>
      mutate(
        () => supabase.from("habits").upsert({ ...habit, user_id: uid() }),
        (d) => ({
          ...d,
          habits: d.habits.some((h) => h.id === habit.id)
            ? d.habits.map((h) => (h.id === habit.id ? habit : h))
            : [...d.habits, habit],
        }),
      ),
    saveClass: (item: ClassItem) =>
      mutate(
        () => supabase.from("classes").upsert({ ...item, user_id: uid() }),
        (d) => ({
          ...d,
          classes: d.classes.some((c) => c.id === item.id)
            ? d.classes.map((c) => (c.id === item.id ? item : c))
            : [...d.classes, item],
        }),
      ),
    deleteClass: (id: string) =>
      mutate(
        () => supabase.from("classes").delete().eq("id", id),
        (d) => ({ ...d, classes: d.classes.filter((c) => c.id !== id) }),
      ),
    saveGoal: (goal: Goal) =>
      mutate(
        () => supabase.from("goals").upsert({ ...goal, user_id: uid() }),
        (d) => ({
          ...d,
          goals: d.goals.some((g) => g.id === goal.id)
            ? d.goals.map((g) => (g.id === goal.id ? goal : g))
            : [...d.goals, goal],
        }),
      ),
    deleteGoal: (id: string) =>
      mutate(
        () => supabase.from("goals").delete().eq("id", id),
        (d) => ({ ...d, goals: d.goals.filter((g) => g.id !== id) }),
      ),
    saveJournal: (journal: Journal) =>
      mutate(
        () =>
          supabase
            .from("journals")
            .upsert(
              { ...journal, user_id: uid() },
              { onConflict: "user_id,date" },
            ),
        (d) => ({
          ...d,
          journals: [
            ...d.journals.filter((j) => j.date !== journal.date),
            journal,
          ],
        }),
      ),
    saveProfile: (profile: Profile) =>
      mutate(
        () => supabase.from("profiles").update(profile).eq("user_id", uid()!),
        (d) => ({ ...d, profile }),
      ),
    signOut: async () => {
      const r = await supabase.auth.signOut();
      if (r.error) fail(r.error);
    },
  };
}
