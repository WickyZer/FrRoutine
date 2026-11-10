import {
  Coffee,
  Timer,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Flame,
} from "lucide-react";
import type { FocusModel } from "../useFocus";
import type { Habit, Completion } from "../types";
import { dateKey, scheduled } from "../data";
export function timerText(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
export default function FocusRoom({
  focus,
  habits,
  completions,
  today,
  busy,
  onComplete,
}: {
  focus: FocusModel;
  habits: Habit[];
  completions: Completion[];
  today: string;
  busy: boolean;
  onComplete: (id: string) => Promise<void>;
}) {
  const { state, left } = focus;
  const locked = state.status === "running" || state.status === "paused";
  const selected = habits.find((h) => h.id === state.habitId);
  const done = completions.some(
    (c) => c.habit_id === state.habitId && c.date === today,
  );
  const daySessions = focus.sessions.filter(
    (s) => dateKey(new Date(s.completedAt)) === today,
  );
  return (
    <div className="focus-room form-stack">
      <div className="segmented">
        <button
          disabled={locked}
          className={state.phase === "focus" ? "selected" : ""}
          onClick={() => focus.configure("focus", 25)}
        >
          <Timer size={16} /> Fokus
        </button>
        <button
          disabled={locked}
          className={state.phase === "break" ? "selected" : ""}
          onClick={() => focus.configure("break", 5)}
        >
          <Coffee size={16} /> Istirahat
        </button>
      </div>
      <div className="form-grid">
        <label>
          Aktivitas
          <select
            disabled={locked || state.phase === "break"}
            value={state.habitId}
            onChange={(e) => {
              const h = habits.find((h) => h.id === e.target.value);
              focus.configure(
                state.phase,
                state.duration,
                h?.id ?? "",
                h?.title ?? "Fokus bebas",
              );
            }}
          >
            <option value="">Fokus bebas</option>
            {habits
              .filter((h) => !h.archived)
              .map((h) => (
                <option value={h.id} key={h.id}>
                  {h.title}
                </option>
              ))}
          </select>
        </label>
        <label>
          Durasi
          <select
            disabled={locked}
            value={state.duration}
            onChange={(e) =>
              focus.configure(
                state.phase,
                Number(e.target.value),
                state.habitId,
                state.title,
              )
            }
          >
            {(state.phase === "focus" ? [15, 25, 45, 60] : [5, 10, 15]).map(
              (n) => (
                <option key={n} value={n}>
                  {n} menit
                </option>
              ),
            )}
          </select>
        </label>
      </div>
      <div
        className={`focus-orbit ${state.status === "running" ? "is-running" : ""}`}
        style={
          {
            "--focus-progress": `${100 * (1 - left / (state.duration * 60))}%`,
          } as React.CSSProperties
        }
      >
        <div>
          {state.phase === "focus" ? <Timer size={25} /> : <Coffee size={25} />}
          <strong
            role="timer"
            aria-label={`${Math.floor(left / 60)} menit ${left % 60} detik`}
          >
            {timerText(left)}
          </strong>
          <span>
            {state.status === "finished"
              ? "Sesi selesai"
              : state.status === "paused"
                ? "Sedang dijeda"
                : state.status === "running"
                  ? "Satu hal dalam satu waktu"
                  : "Siap untuk mulai?"}
          </span>
        </div>
      </div>
      <p className="focus-activity">
        {state.phase === "break"
          ? "Tarik napas. Beri diri Anda jeda."
          : state.title}
      </p>
      {state.status === "finished" ? (
        <>
          <p className="form-success" role="status">
            {state.phase === "focus"
              ? "Sesi fokus tercatat. Waktunya beristirahat."
              : "Istirahat selesai. Siap kembali fokus?"}
          </p>
          <button
            className="primary full"
            onClick={() =>
              focus.configure(
                state.phase === "focus" ? "break" : "focus",
                state.phase === "focus" ? 5 : 25,
              )
            }
          >
            {state.phase === "focus" ? (
              <Coffee size={18} />
            ) : (
              <Play size={18} />
            )}{" "}
            {state.phase === "focus"
              ? "Siapkan istirahat 5 menit"
              : "Siapkan fokus berikutnya"}
          </button>
          {selected &&
            scheduled(selected, today) &&
            focus.sessions.some(
              (s) =>
                s.id === state.id && dateKey(new Date(s.completedAt)) === today,
            ) &&
            state.phase === "focus" && (
              <button
                disabled={busy || done}
                className="secondary full"
                onClick={() => void onComplete(selected.id)}
              >
                <CheckCircle2 size={17} />
                {done ? "Rutinitas sudah selesai" : "Tandai rutinitas selesai"}
              </button>
            )}
        </>
      ) : (
        <button className="primary full" onClick={focus.toggle}>
          {state.status === "running" ? (
            <Pause size={18} />
          ) : (
            <Play size={18} />
          )}{" "}
          {state.status === "running"
            ? "Jeda"
            : state.status === "paused"
              ? "Lanjutkan"
              : "Mulai sesi"}
        </button>
      )}
      <button className="text-button" onClick={focus.reset}>
        <RotateCcw size={15} /> Atur ulang sesi
      </button>
      <p className="helper">
        Timer tetap berjalan saat dialog ditutup. Sesi dan riwayat fokus
        tersimpan pada perangkat ini, terpisah untuk setiap akun.
      </p>
      {focus.saveError && (
        <p className="form-warning">
          Penyimpanan perangkat tidak tersedia; jangan muat ulang sebelum sesi
          selesai.
        </p>
      )}
      <div className="focus-history">
        <h3>
          <Flame size={18} /> Fokus hari ini
        </h3>
        <div className="focus-totals">
          <strong>
            {daySessions.length}
            <small>sesi selesai</small>
          </strong>
          <strong>
            {daySessions.reduce((n, s) => n + s.minutes, 0)}
            <small>menit fokus</small>
          </strong>
        </div>
        {focus.sessions.slice(0, 4).map((s) => (
          <div className="focus-history-row" key={s.id}>
            <span>
              {s.title}
              <small>
                {new Intl.DateTimeFormat("id-ID", {
                  timeZone: "Asia/Makassar",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(s.completedAt))}
              </small>
            </span>
            <b>{s.minutes} mnt</b>
          </div>
        ))}
      </div>
    </div>
  );
}
