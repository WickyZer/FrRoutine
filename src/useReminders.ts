import { useEffect, useRef, useState } from "react";
import type { AppData } from "./types";
import { reminderEvents, type ReminderSettings } from "./planning";
const defaults: ReminderSettings = {
  enabled: false,
  lead: 10,
  habits: true,
  classes: true,
};
function read(key: string): ReminderSettings {
  try {
    const p = JSON.parse(localStorage.getItem(key) ?? "null");
    if (p)
      return {
        enabled: p.enabled === true,
        lead: [0, 5, 10, 15, 30].includes(p.lead) ? p.lead : 10,
        habits: p.habits !== false,
        classes: p.classes !== false,
      };
  } catch {}
  return defaults;
}
export async function systemNotification(
  title: string,
  body: string,
  tag: string,
) {
  if (!("Notification" in window) || Notification.permission !== "granted")
    return false;
  try {
    const registration =
      "serviceWorker" in navigator
        ? await navigator.serviceWorker.getRegistration()
        : undefined;
    if (registration)
      await registration.showNotification(title, {
        body,
        tag,
        icon: "/icons/icon-192.png",
        data: { url: "/#schedule" },
      });
    else new Notification(title, { body, tag, icon: "/icons/icon-192.png" });
    return true;
  } catch {
    return false;
  }
}
export function useReminders(
  data: AppData,
  scope: string,
  ready: boolean,
  onReminder: (message: string) => void,
) {
  const key = `frroutine.reminders.v2.${scope}`;
  const [stored, setStored] = useState(() => ({ key, settings: read(key) }));
  const [saveError, setSaveError] = useState(false);
  const sent = useRef(new Set<string>());
  const callback = useRef(onReminder);
  callback.current = onReminder;
  useEffect(() => {
    sent.current.clear();
    setStored({ key, settings: read(key) });
  }, [key]);
  useEffect(() => {
    if (stored.key !== key) return;
    try {
      localStorage.setItem(key, JSON.stringify(stored.settings));
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }, [stored, key]);
  const settings = stored.key === key ? stored.settings : defaults;
  useEffect(() => {
    if (!ready || !settings.enabled) return;
    const tick = () => {
      const now = new Date();
      const events = reminderEvents(data, now, settings).filter(
        (e) =>
          e.due <= now.getTime() &&
          now.getTime() - e.due < 90000 &&
          e.at >= now.getTime() - 90000,
      );
      for (const e of events) {
        const id = `${key}.${e.id}`;
        let previous = false;
        try {
          previous = localStorage.getItem(id) === "1";
        } catch {}
        if (previous || sent.current.has(id)) continue;
        sent.current.add(id);
        try {
          localStorage.setItem(id, "1");
        } catch {}
        const message = `${e.kind}: ${e.title} · ${e.time} WITA`;
        callback.current(message);
        void systemNotification(
          settings.lead
            ? `${settings.lead} menit lagi`
            : "Waktunya aktivitas Anda",
          message,
          id,
        );
      }
    };
    tick();
    const timer = setInterval(tick, 15000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [data, settings, key, ready]);
  return {
    settings,
    setSettings: (settings: ReminderSettings) => setStored({ key, settings }),
    saveError,
  };
}
