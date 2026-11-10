import { useEffect, useState } from "react";
import { newId } from "./data";
import {
  finishFocus,
  focusRemaining,
  type FocusState,
  type FocusSession,
  type FocusPhase,
} from "./planning";
const idle = (): FocusState => ({
  phase: "focus",
  duration: 25,
  remaining: 1500,
  end: null,
  status: "idle",
  habitId: "",
  title: "Fokus bebas",
  id: newId(),
});
function read(key: string): { state: FocusState; sessions: FocusSession[] } {
  try {
    const p = JSON.parse(localStorage.getItem(key) ?? "null");
    if (
      p &&
      ["idle", "running", "paused", "finished"].includes(p.state?.status) &&
      ["focus", "break"].includes(p.state?.phase) &&
      Number.isFinite(p.state.remaining) &&
      p.state.duration >= 1 &&
      p.state.duration <= 120 &&
      Array.isArray(p.sessions)
    )
      return p;
  } catch {}
  return { state: idle(), sessions: [] };
}
export function useFocus(scope: string) {
  const key = `frroutine.focus.v1.${scope}`;
  const [stored, setStored] = useState(() => ({ key, ...read(key) }));
  const [now, setNow] = useState(Date.now());
  const [saveError, setSaveError] = useState(false);
  useEffect(() => {
    setStored({ key, ...read(key) });
  }, [key]);
  useEffect(() => {
    if (stored.key !== key) return;
    try {
      localStorage.setItem(key, JSON.stringify(stored));
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }, [stored, key]);
  useEffect(() => {
    const tick = () => {
      const n = Date.now();
      setNow(n);
      setStored((s) => {
        if (s.key !== key) return s;
        const next = finishFocus(s.state, s.sessions, n);
        return next.state === s.state ? s : { ...s, ...next };
      });
    };
    tick();
    if (stored.state.status !== "running") return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [key, stored.state.status]);
  const current =
    stored.key === key ? stored : { key, state: idle(), sessions: [] };
  function configure(
    phase: FocusPhase,
    duration: number,
    habitId = "",
    title = "Fokus bebas",
  ) {
    setStored((s) => ({
      ...s,
      state: {
        ...idle(),
        phase,
        duration,
        remaining: duration * 60,
        habitId,
        title,
      },
    }));
  }
  return {
    state: current.state,
    sessions: current.sessions,
    left: focusRemaining(current.state, now),
    saveError,
    configure,
    toggle: () =>
      setStored((s) =>
        s.state.status === "running"
          ? {
              ...s,
              state: {
                ...s.state,
                status: "paused",
                remaining: focusRemaining(s.state, Date.now()),
                end: null,
              },
            }
          : {
              ...s,
              state: {
                ...s.state,
                status: "running",
                end: Date.now() + s.state.remaining * 1000,
              },
            },
      ),
    reset: () =>
      setStored((s) => ({
        ...s,
        state: {
          ...s.state,
          status: "idle",
          remaining: s.state.duration * 60,
          end: null,
          id: newId(),
        },
      })),
  };
}
export type FocusModel = ReturnType<typeof useFocus>;
