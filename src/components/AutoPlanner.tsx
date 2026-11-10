import { useMemo, useState } from "react";
import { CalendarClock, ArrowRight, Check, Sparkles } from "lucide-react";
import type { AppData, Habit } from "../types";
import { autoPlan } from "../planning";
import { DAYS, timeEnd } from "../data";
export default function AutoPlanner({
  data,
  busy,
  onApply,
}: {
  data: AppData;
  busy: boolean;
  onApply: (h: Habit[]) => Promise<void>;
}) {
  const [start, setStart] = useState("05:00"),
    [end, setEnd] = useState("22:00"),
    [buffer, setBuffer] = useState(20),
    [gap, setGap] = useState(5),
    [error, setError] = useState("");
  const plan = useMemo(
    () =>
      start < end
        ? autoPlan(data.habits, data.classes, { start, end, buffer, gap })
        : null,
    [data.habits, data.classes, start, end, buffer, gap],
  );
  const changed =
    plan?.habits.filter(
      (h) =>
        h.time.slice(0, 5) !==
        data.habits.find((x) => x.id === h.id)?.time.slice(0, 5),
    ) ?? [];
  return (
    <div className="form-stack planner-content">
      <div className="feature-intro">
        <span className="notification-hero">
          <CalendarClock size={30} />
        </span>
        <div>
          <h3>Ruang untuk kebiasaan baik.</h3>
          <p>
            Susun ulang jam rutinitas sesuai waktu kosong kuliah. Jam yang sama
            berlaku pada seluruh hari pengulangan.
          </p>
        </div>
      </div>
      <div className="form-grid">
        <label>
          Awal waktu aktif
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            required
          />
        </label>
        <label>
          Akhir waktu aktif
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            required
          />
        </label>
        <label>
          Jeda kuliah
          <select
            value={buffer}
            onChange={(e) => setBuffer(Number(e.target.value))}
          >
            {[20, 30, 45, 60].map((n) => (
              <option key={n} value={n}>
                {n} menit
              </option>
            ))}
          </select>
        </label>
        <label>
          Jeda antar rutinitas
          <select value={gap} onChange={(e) => setGap(Number(e.target.value))}>
            {[0, 5, 10, 15].map((n) => (
              <option key={n} value={n}>
                {n} menit
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="helper">
        Pratinjau dahulu. Jadwal kuliah, hari pengulangan, dan riwayat
        penyelesaian tetap tersimpan.
      </p>
      {!plan ? (
        <p className="form-error" role="alert">
          Jam akhir harus setelah jam awal.
        </p>
      ) : (
        <>
          <div className="planner-summary">
            <Sparkles size={18} />
            <strong>{changed.length} jam disesuaikan</strong>
            <span>{plan.unresolved.length} perlu diatur manual</span>
          </div>
          <div className="plan-list">
            {plan.habits.map((h) => {
              const old = data.habits.find((x) => x.id === h.id)!;
              const failed = plan.unresolved.includes(h.id);
              return (
                <article
                  key={h.id}
                  className={`plan-row ${failed ? "plan-warning" : ""}`}
                >
                  <div>
                    <strong>{h.title}</strong>
                    <small>
                      {h.days.map((d) => DAYS[d]).join(" · ")} · {h.duration}{" "}
                      menit
                    </small>
                    {failed && (
                      <small>
                        Belum ada slot bersama yang cukup. Jam lama
                        dipertahankan.
                      </small>
                    )}
                  </div>
                  <div className="plan-times">
                    <span>{old.time.slice(0, 5)}</span>
                    <ArrowRight size={14} />
                    <b>
                      {h.time.slice(0, 5)}–{timeEnd(h.time, h.duration)}
                    </b>
                  </div>
                </article>
              );
            })}
          </div>
          {!plan.habits.length && <p>Tambahkan rutinitas terlebih dahulu.</p>}
        </>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button
        className="primary full"
        disabled={busy || !plan || !changed.length}
        onClick={async () => {
          setError("");
          try {
            await onApply(changed);
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        <Check size={18} />
        {busy ? "Menyimpan…" : "Terapkan jadwal ini"}
      </button>
    </div>
  );
}
