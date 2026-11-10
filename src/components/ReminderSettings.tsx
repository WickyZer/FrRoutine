import { useState } from "react";
import { Bell, BellRing, Check, Clock3 } from "lucide-react";
import type { AppData } from "../types";
import { reminderEvents, type ReminderSettings as Settings } from "../planning";
import { systemNotification } from "../useReminders";
export default function ReminderSettings({
  data,
  settings,
  onChange,
  saveError,
}: {
  data: AppData;
  settings: Settings;
  onChange: (s: Settings) => void;
  saveError: boolean;
}) {
  const [permission, setPermission] = useState<string>(() =>
    "Notification" in window ? Notification.permission : "unsupported",
  );
  const [feedback, setFeedback] = useState("");
  const upcoming = reminderEvents(data, new Date(), settings)
    .filter((e) => e.at > Date.now())
    .slice(0, 6);
  return (
    <div className="form-stack reminder-settings">
      <div className="feature-intro">
        <span className="notification-hero">
          <BellRing size={30} />
        </span>
        <div>
          <h3>Sedikit dorongan, tepat waktu.</h3>
          <p>
            Pengingat kuliah dan rutinitas dengan waktu persiapan pilihan Anda.
          </p>
        </div>
      </div>
      <label className="reminder-toggle">
        <span>
          <strong>Pengingat aktivitas</strong>
          <small>
            {settings.enabled ? "Aktif pada perangkat ini" : "Belum aktif"}
          </small>
        </span>
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => onChange({ ...settings, enabled: e.target.checked })}
        />
      </label>
      <label>
        Ingatkan sebelum mulai
        <select
          value={settings.lead}
          onChange={(e) =>
            onChange({ ...settings, lead: Number(e.target.value) })
          }
        >
          {[0, 5, 10, 15, 30].map((n) => (
            <option value={n} key={n}>
              {n ? `${n} menit sebelumnya` : "Tepat saat mulai"}
            </option>
          ))}
        </select>
      </label>
      <div className="reminder-types">
        <label>
          <input
            type="checkbox"
            checked={settings.habits}
            onChange={(e) =>
              onChange({ ...settings, habits: e.target.checked })
            }
          />{" "}
          Rutinitas
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.classes}
            onChange={(e) =>
              onChange({ ...settings, classes: e.target.checked })
            }
          />{" "}
          Kuliah
        </label>
      </div>
      <div className="reminder-permission">
        <strong>
          <Bell size={16} /> Notifikasi browser
        </strong>
        <p>
          {permission === "granted"
            ? "Izin diberikan. Notifikasi browser tersedia."
            : permission === "denied"
              ? "Izin diblokir. Ubah izin notifikasi melalui pengaturan situs pada browser."
              : permission === "unsupported"
                ? "Browser ini belum mendukung notifikasi sistem. Pengingat dalam aplikasi tetap tersedia."
                : "Izinkan notifikasi agar pengingat juga tampil melalui browser."}
        </p>
        {permission === "default" && (
          <button
            className="secondary full"
            onClick={async () => {
              try {
                setPermission(await Notification.requestPermission());
              } catch {
                setFeedback(
                  "Tidak dapat meminta izin. Periksa pengaturan browser.",
                );
              }
            }}
          >
            Izinkan notifikasi browser
          </button>
        )}
        {permission === "granted" && (
          <button
            className="secondary full"
            onClick={async () =>
              setFeedback(
                (await systemNotification(
                  "FrRoutine · Pengingat siap",
                  "Ini contoh notifikasi aktivitas Anda.",
                  "frroutine-test",
                ))
                  ? "Notifikasi percobaan dikirim."
                  : "Notifikasi tidak terkirim. Periksa pengaturan perangkat.",
              )
            }
          >
            <Check size={17} /> Coba notifikasi
          </button>
        )}
      </div>
      <p className="helper">
        Pengingat berjalan selama FrRoutine terbuka. Jika aplikasi ditutup atau
        perangkat menidurkan browser, pengingat belum dapat dijamin terkirim.
        Pilihan tersimpan di perangkat ini.
      </p>
      {saveError && (
        <p className="form-warning">
          Pilihan belum dapat disimpan pada perangkat ini.
        </p>
      )}
      {feedback && (
        <p role="status" className="form-success">
          {feedback}
        </p>
      )}
      <div className="upcoming-reminders">
        <h4>Aktivitas berikutnya · WITA</h4>
        {upcoming.map((e) => (
          <div key={e.id}>
            <Clock3 size={16} />
            <span>
              {e.title}
              <small>
                {e.kind} · {e.date}
              </small>
            </span>
            <strong>{e.time}</strong>
          </div>
        ))}
        {!upcoming.length && (
          <p>Belum ada aktivitas mendatang. Tambahkan rutinitas atau kelas.</p>
        )}
      </div>
    </div>
  );
}
