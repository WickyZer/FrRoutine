import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  LoaderCircle,
  Mail,
  LockKeyhole,
  Trash2,
  Check,
  ShieldCheck,
} from "lucide-react";
import type { Habit, ClassItem, Goal } from "../types";
import { DAYS, FULL_DAYS, conflicts, minutes, newId } from "../data";
import { supabase } from "../supabase";
import { HabitIcon } from "./Visuals";
export function AuthForm({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email")).trim();
    const password = String(f.get("password"));
    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setMessage(
          "Tautan pemulihan sudah dikirim jika email terdaftar. Periksa kotak masuk Anda.",
        );
      } else if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name: String(f.get("name")).trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        if (data.session) onDone();
        else
          setMessage(
            "Akun dibuat. Konfirmasi melalui email, lalu kembali ke sini untuk masuk.",
          );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onDone();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="auth-intro">
        <img src="/brand/wordmark.webp" alt="FrRoutine" />
        <p>Satu ruang untuk tumbuh, di semua perangkat Anda.</p>
      </div>
      {mode !== "reset" && (
        <div className="segmented">
          <button
            className={mode === "login" ? "selected" : ""}
            onClick={() => {
              setMode("login");
              setError("");
              setMessage("");
            }}
          >
            Masuk
          </button>
          <button
            className={mode === "register" ? "selected" : ""}
            onClick={() => {
              setMode("register");
              setError("");
              setMessage("");
            }}
          >
            Daftar
          </button>
        </div>
      )}
      <form onSubmit={submit} className="form-stack">
        {mode === "register" && (
          <label>
            Nama Anda
            <input
              name="name"
              autoComplete="name"
              required
              maxLength={60}
              placeholder="Nama lengkap Anda"
            />
          </label>
        )}
        <label>
          Email
          <div className="input-icon">
            <Mail size={18} />
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="nama@email.com"
            />
          </div>
        </label>
        {mode !== "reset" && (
          <label>
            Password
            <div className="input-icon">
              <LockKeyhole size={18} />
              <input
                name="password"
                type="password"
                autoComplete={
                  mode === "register" ? "new-password" : "current-password"
                }
                minLength={8}
                required
                placeholder="Minimal 8 karakter"
              />
            </div>
          </label>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="form-success" role="status">
            {message}
          </p>
        )}
        <button className="primary" disabled={busy}>
          {busy ? (
            <LoaderCircle className="spin" size={18} />
          ) : (
            <ArrowRight size={18} />
          )}{" "}
          {mode === "register"
            ? "Buat akun"
            : mode === "reset"
              ? "Kirim tautan pemulihan"
              : "Masuk ke FrRoutine"}
        </button>
        <button
          type="button"
          className="text-button"
          onClick={() => {
            setMode(mode === "reset" ? "login" : "reset");
            setError("");
            setMessage("");
          }}
        >
          {mode === "reset" ? "Kembali ke masuk" : "Lupa password?"}
        </button>
      </form>
      <div className="privacy-note">
        <ShieldCheck size={16} />
        <span>
          Data akun Anda tersimpan privat dan terpisah dari mode perangkat.
        </span>
      </div>
    </>
  );
}
export function HabitForm({
  habit,
  classes,
  busy,
  onSave,
  onArchive,
}: {
  habit?: Habit;
  classes: ClassItem[];
  busy: boolean;
  onSave: (h: Habit) => Promise<void>;
  onArchive?: () => Promise<void>;
}) {
  const [days, setDays] = useState(habit?.days ?? [0, 1, 2, 3, 4, 5, 6]);
  const [icon, setIcon] = useState(habit?.icon ?? "book");
  const [error, setError] = useState("");
  const [time, setTime] = useState(habit?.time.slice(0, 5) ?? "17:30");
  const [duration, setDuration] = useState(habit?.duration ?? 15);
  const clashes = conflicts({ days, time, duration }, classes);
  const icons = [
    "book",
    "code",
    "languages",
    "activity",
    "water",
    "graduation",
    "keyboard",
    "wallet",
    "journal",
    "stretch",
  ];
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const f = new FormData(e.currentTarget);
    const actualTime = String(f.get("time"));
    const actualDuration = Number(f.get("duration"));
    if (!days.length) {
      setError("Pilih setidaknya satu hari.");
      return;
    }
    if (minutes(actualTime) + actualDuration >= 1440) {
      setError("Rutinitas harus selesai sebelum tengah malam.");
      return;
    }
    if (
      conflicts({ days, time: actualTime, duration: actualDuration }, classes)
        .length
    ) {
      setError(
        "Ubah jam atau hari terlebih dahulu agar tidak berbenturan dengan kuliah.",
      );
      return;
    }
    try {
      await onSave({
        id: habit?.id ?? newId(),
        title: String(f.get("title")).trim(),
        category: String(f.get("category")),
        icon,
        time: actualTime,
        duration: actualDuration,
        days,
        archived: false,
        created_at: habit?.created_at ?? new Date().toISOString(),
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <form onSubmit={submit} className="form-stack">
      <label>
        Nama rutinitas
        <input
          name="title"
          defaultValue={habit?.title}
          maxLength={100}
          required
          placeholder="Misalnya, baca 10 halaman"
        />
      </label>
      <div className="form-grid">
        <label>
          Mulai
          <input
            name="time"
            type="time"
            value={time}
            onInput={(e) => setTime(e.currentTarget.value)}
            onChange={(e) => setTime(e.target.value)}
            required
          />
        </label>
        <label>
          Durasi (menit)
          <input
            name="duration"
            type="number"
            value={duration}
            onInput={(e) => setDuration(Number(e.currentTarget.value))}
            onChange={(e) => setDuration(Number(e.target.value))}
            min={1}
            max={240}
            required
          />
        </label>
      </div>
      <label>
        Kategori
        <select
          name="category"
          defaultValue={habit?.category ?? "Pengembangan diri"}
        >
          {[
            "Pengembangan diri",
            "Akademik",
            "Skill",
            "Kesehatan",
            "Pribadi",
          ].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend>Ulangi setiap</legend>
        <div className="day-picker">
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={days.includes(d)}
              className={days.includes(d) ? "selected" : ""}
              onClick={() =>
                setDays((v) =>
                  v.includes(d) ? v.filter((x) => x !== d) : [...v, d],
                )
              }
            >
              {DAYS[d]}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Ikon rutinitas</legend>
        <div className="icon-picker">
          {icons.map((i) => (
            <button
              key={i}
              type="button"
              aria-label={`Pilih ikon ${i}`}
              aria-pressed={icon === i}
              onClick={() => setIcon(i)}
              className={icon === i ? "selected" : ""}
            >
              <HabitIcon name={i} size={21} />
            </button>
          ))}
        </div>
      </fieldset>
      {clashes.length > 0 && (
        <p className="form-warning">
          Berbenturan dengan{" "}
          {clashes
            .map((c) => `${c.title} (${DAYS[c.day]}, ${c.start.slice(0, 5)})`)
            .join(", ")}
          . Termasuk jeda 20 menit untuk persiapan kuliah.
        </p>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <button className="primary" disabled={busy}>
        <Check size={18} />
        {busy ? "Menyimpan…" : "Simpan rutinitas"}
      </button>
      {habit && onArchive && (
        <button
          type="button"
          className="danger text-button"
          disabled={busy}
          onClick={() => {
            void onArchive().catch((e) => setError(e.message));
          }}
        >
          <Trash2 size={16} />
          Arsipkan rutinitas
        </button>
      )}
    </form>
  );
}
export function ClassForm({
  item,
  classes,
  habits,
  busy,
  onSave,
  onDelete,
}: {
  item?: ClassItem;
  classes: ClassItem[];
  habits: Habit[];
  busy: boolean;
  onSave: (c: ClassItem) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const c: ClassItem = {
      id: item?.id ?? newId(),
      title: String(f.get("title")).trim(),
      day: Number(f.get("day")),
      start: String(f.get("start")),
      end: String(f.get("end")),
      room: String(f.get("room")).trim(),
    };
    if (c.end <= c.start) {
      setError("Jam selesai harus setelah jam mulai.");
      return;
    }
    if (
      classes.some(
        (x) =>
          x.id !== c.id &&
          x.day === c.day &&
          minutes(x.start) < minutes(c.end) &&
          minutes(x.end) > minutes(c.start),
      )
    ) {
      setError("Jam ini berbenturan dengan kelas lain.");
      return;
    }
    if (habits.some((h) => !h.archived && conflicts(h, [c]).length)) {
      setError(
        "Jadwal ini berbenturan dengan rutinitas, termasuk jeda persiapan 20 menit. Ubah rutinitas atau jam kelas terlebih dahulu.",
      );
      return;
    }
    try {
      await onSave(c);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <form className="form-stack" onSubmit={submit}>
      <label>
        Mata kuliah
        <input
          name="title"
          required
          maxLength={100}
          defaultValue={item?.title}
        />
      </label>
      <label>
        Hari
        <select name="day" defaultValue={item?.day ?? 1}>
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <option key={d} value={d}>
              {FULL_DAYS[d]}
            </option>
          ))}
        </select>
      </label>
      <div className="form-grid">
        <label>
          Mulai
          <input
            name="start"
            type="time"
            required
            defaultValue={item?.start.slice(0, 5) ?? "08:00"}
          />
        </label>
        <label>
          Selesai
          <input
            name="end"
            type="time"
            required
            defaultValue={item?.end.slice(0, 5) ?? "09:30"}
          />
        </label>
      </div>
      <label>
        Ruangan
        <input
          name="room"
          maxLength={100}
          defaultValue={item?.room}
          placeholder="Gedung / ruang kuliah"
        />
      </label>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <button className="primary" disabled={busy}>
        Simpan jadwal
      </button>
      {item && onDelete && (
        <button
          type="button"
          className="danger text-button"
          disabled={busy}
          onClick={() => void onDelete().catch((e) => setError(e.message))}
        >
          <Trash2 size={16} />
          Hapus jadwal
        </button>
      )}
    </form>
  );
}
export function GoalForm({
  busy,
  onSave,
}: {
  busy: boolean;
  onSave: (g: Goal) => Promise<void>;
}) {
  const [error, setError] = useState("");
  return (
    <form
      className="form-stack"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        try {
          await onSave({
            id: newId(),
            title: String(f.get("title")).trim(),
            category: String(f.get("category")),
            target: Number(f.get("target")),
            current: 0,
            unit: String(f.get("unit")).trim(),
          });
        } catch (e) {
          setError((e as Error).message);
        }
      }}
    >
      <label>
        Target Anda
        <input
          name="title"
          required
          maxLength={100}
          placeholder="Selesaikan dasar JavaScript"
        />
      </label>
      <div className="form-grid">
        <label>
          Jumlah target
          <input
            name="target"
            type="number"
            min={1}
            max={100000}
            required
            defaultValue={30}
          />
        </label>
        <label>
          Satuan
          <input name="unit" required maxLength={20} defaultValue="sesi" />
        </label>
      </div>
      <label>
        Kategori
        <select name="category">
          {["Skill", "Akademik", "Kesehatan", "Pribadi"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="primary" disabled={busy}>
        Buat target
      </button>
    </form>
  );
}
export function PasswordForm({ onDone }: { onDone: () => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="form-stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const password = String(new FormData(e.currentTarget).get("password"));
        const { error } = await supabase.auth.updateUser({ password });
        setBusy(false);
        if (error) setError(error.message);
        else onDone();
      }}
    >
      <label>
        Password baru
        <input
          type="password"
          name="password"
          minLength={8}
          required
          autoComplete="new-password"
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button disabled={busy} className="primary">
        Simpan password baru
      </button>
    </form>
  );
}
