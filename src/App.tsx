import AutoPlanner from "./components/AutoPlanner";
import FocusRoom, { timerText } from "./components/FocusRoom";
import ReminderSettings from "./components/ReminderSettings";
import { useFocus } from "./useFocus";
import { useReminders, systemNotification } from "./useReminders";
import GlassSettings, { useGlassAppearance } from "./components/GlassSettings";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock3,
  Cloud,
  CloudOff,
  Code2,
  Flame,
  GraduationCap,
  House,
  LayoutGrid,
  LoaderCircle,
  LogOut,
  Menu,
  MoreHorizontal,
  NotebookPen,
  Pencil,
  Play,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Target,
  Timer,
  Trash2,
  Trophy,
  UserRound,
  WifiOff,
  X,
} from "lucide-react";
import { useRoutine } from "./useRoutine";
import {
  DAYS,
  FULL_DAYS,
  dateKey,
  dayStats,
  parseDate,
  shiftDate,
  weekday,
  weekDays,
  scheduled,
  streak,
  timeEnd,
  minutes,
} from "./data";
import type { ClassItem, Habit, Page, Profile } from "./types";
import {
  BadgeArt,
  GlassFlame,
  HabitIcon,
  Landscape,
  ProgressRing,
} from "./components/Visuals";
import Modal from "./components/Modal";
import {
  AuthForm,
  ClassForm,
  GoalForm,
  HabitForm,
  PasswordForm,
} from "./components/Forms";
import { supabase } from "./supabase";
const nav = [
  { id: "home", label: "Beranda", icon: House },
  { id: "routines", label: "Rutinitas", icon: CheckCircle2 },
  { id: "schedule", label: "Jadwal kuliah", icon: CalendarDays },
  { id: "stats", label: "Statistik", icon: BarChart3 },
  { id: "goals", label: "Target & pencapaian", icon: Trophy },
  { id: "journal", label: "Jurnal harian", icon: NotebookPen },
] as const;
type Dialog =
  | "auth"
  | "habit"
  | "class"
  | "goal"
  | "planner"
  | "notifications"
  | "focus"
  | "password"
  | null;
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
function Panel({
  children,
  className = "",
  solid = false,
}: {
  children: ReactNode;
  className?: string;
  solid?: boolean;
}) {
  return (
    <section className={`panel ${solid ? "solid" : ""} ${className}`}>
      {children}
    </section>
  );
}
function Empty({
  icon: Icon = Sparkles,
  title,
  body,
  action,
}: {
  icon?: typeof Sparkles;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span>
        <Icon size={26} strokeWidth={1.5} />
      </span>
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}
function SectionTitle({
  icon: Icon,
  title,
  action,
}: {
  icon: typeof House;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <h2>
        <span className="heading-icon">
          <Icon size={19} strokeWidth={1.8} />
        </span>
        {title}
      </h2>
      {action}
    </div>
  );
}
export default function App() {
  const glassAppearance = useGlassAppearance();
  const model = useRoutine();
  const { data, user, busy, loading, issue, ready } = model;
  const [page, setPage] = useState<Page>(() => {
    const key = window.location.hash.slice(1);
    return [
      "home",
      "routines",
      "schedule",
      "stats",
      "goals",
      "journal",
      "profile",
    ].includes(key)
      ? (key as Page)
      : "home";
  });
  const [now, setNow] = useState(new Date());
  const today = dateKey(now, data.profile.timezone);
  const [selected, setSelected] = useState(() => dateKey());
  const [week, setWeek] = useState(() => dateKey());
  const [dialog, setDialog] = useState<Dialog>(null);
  const [editingHabit, setEditingHabit] = useState<Habit | undefined>();
  const [editingClass, setEditingClass] = useState<ClassItem | undefined>();
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Semua");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [period, setPeriod] = useState(7);
  const [journalText, setJournalText] = useState("");
  const [mood, setMood] = useState("Baik");
  const [journalDirty, setJournalDirty] = useState(false);
  const toastTimer = useRef<number | undefined>(undefined);
  function notify(message: string) {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 5000);
  }
  const focus = useFocus(user?.id ?? "guest");
  const reminders = useReminders(
    data,
    user?.id ?? "guest",
    ready && !loading && !issue,
    notify,
  );
  const focusNotice = useRef("");
  useEffect(() => {
    if (
      focus.state.status === "finished" &&
      focusNotice.current !== focus.state.id
    ) {
      focusNotice.current = focus.state.id;
      const message =
        focus.state.phase === "focus"
          ? "Sesi fokus selesai dan tercatat. Waktunya istirahat."
          : "Istirahat selesai. Siap kembali fokus?";
      notify(message);
      void systemNotification(
        "FrRoutine · Sesi selesai",
        message,
        focus.state.id,
      );
    }
  }, [focus.state.status, focus.state.id]);
  function navigate(next: Page) {
    setPage(next);
    window.location.hash = next;
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function newHabit() {
    setEditingHabit(undefined);
    setDialog("habit");
  }
  async function run(action: () => Promise<unknown>, success?: string) {
    try {
      await action();
      if (success) notify(success);
    } catch (e) {
      notify((e as Error).message);
    }
  }
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    const changed = () => {
      setOnline(navigator.onLine);
    };
    const install = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as InstallEvent);
    };
    const installed = () => setInstallEvent(null);
    const hash = () => {
      const p = window.location.hash.slice(1);
      if (
        [
          "home",
          "routines",
          "schedule",
          "stats",
          "goals",
          "journal",
          "profile",
        ].includes(p)
      )
        setPage(p as Page);
    };
    window.addEventListener("online", changed);
    window.addEventListener("offline", changed);
    window.addEventListener("beforeinstallprompt", install);
    window.addEventListener("appinstalled", installed);
    window.addEventListener("hashchange", hash);
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setDialog("password");
    });
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", changed);
      window.removeEventListener("offline", changed);
      window.removeEventListener("beforeinstallprompt", install);
      window.removeEventListener("appinstalled", installed);
      window.removeEventListener("hashchange", hash);
      subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    const journal = data.journals.find((j) => j.date === selected);
    setJournalText(journal?.content ?? "");
    setMood(journal?.mood ?? "Baik");
    setJournalDirty(false);
  }, [selected, user?.id, loading]);
  useEffect(() => {
    const previous = today;
    const timer = window.setInterval(() => {
      const current = dateKey(new Date(), data.profile.timezone);
      if (current !== previous) {
        setSelected(current);
        setWeek(current);
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [today, data.profile.timezone]);
  const stats = dayStats(data, selected);
  const active = data.habits.filter((h) => !h.archived);
  const scheduledHabits = active
    .filter((h) => scheduled(h, selected))
    .sort((a, b) => a.time.localeCompare(b.time));
  const habits = active
    .filter(
      (h) =>
        scheduled(h, selected) &&
        (category === "Semua" || h.category === category) &&
        h.title.toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) => a.time.localeCompare(b.time));
  const streakCount = streak(data, today);
  const weekKeys = weekDays(week);
  const weekStats = weekDays(today).map((key) => ({
    key,
    ...dayStats(data, key),
  }));
  const allDone = data.completions.length;
  const completedGoals = data.goals.filter((g) => g.current >= g.target).length;
  const badgeStates = [
    allDone >= 1,
    allDone >= 10,
    streakCount >= 3,
    completedGoals >= 1,
    allDone >= 100,
  ];
  const classesToday = data.classes
    .filter((c) => c.day === weekday(selected))
    .sort((a, b) => a.start.localeCompare(b.start));
  const firstName = data.profile.name.split(" ")[0] || "Teman";
  const currentTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: data.profile.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  const hour = Number(currentTime.split(":")[0]);
  const greeting =
    hour < 11 ? "pagi" : hour < 15 ? "siang" : hour < 18 ? "sore" : "malam";
  const nextClasses = Array.from({ length: 8 }, (_, i) => ({
    key: shiftDate(today, i),
    offset: i,
  }))
    .flatMap(({ key, offset }) =>
      data.classes
        .filter(
          (c) =>
            c.day === weekday(key) &&
            (offset !== 0 || c.end.slice(0, 5) > currentTime),
        )
        .map((c) => ({ ...c, key, offset })),
    )
    .sort((a, b) => a.offset - b.offset || a.start.localeCompare(b.start));
  const nextClass = nextClasses[0];
  const totalDuration = active.reduce((sum, h) => sum + h.duration, 0);
  const rangeKeys = Array.from({ length: period }, (_, i) =>
    shiftDate(today, -(period - 1 - i)),
  );
  const rangeStats = rangeKeys.map((key) => ({ key, ...dayStats(data, key) }));
  const validDays = rangeStats.filter((s) => s.total);
  const avg = validDays.length
    ? Math.round(
        validDays.reduce((sum, s) => sum + s.percent, 0) / validDays.length,
      )
    : 0;
  function weekPicker() {
    return (
      <div className="week-calendar glass">
        <div className="week-controls">
          <button
            className="icon-button"
            aria-label="Minggu sebelumnya"
            onClick={() => {
              setWeek(shiftDate(week, -7));
              setSelected(shiftDate(selected, -7));
            }}
          >
            <ChevronLeft size={17} />
          </button>
          <span>
            {new Intl.DateTimeFormat("id-ID", {
              month: "long",
              year: "numeric",
              timeZone: data.profile.timezone,
            }).format(parseDate(week))}
          </span>
          <button
            className="icon-button"
            aria-label="Minggu berikutnya"
            onClick={() => {
              setWeek(shiftDate(week, 7));
              setSelected(shiftDate(selected, 7));
            }}
          >
            <ChevronRight size={17} />
          </button>
        </div>
        <div className="week-days">
          {weekKeys.map((key) => (
            <button
              key={key}
              className={`day ${selected === key ? "active" : ""} ${key === today ? "today" : ""}`}
              aria-pressed={selected === key}
              aria-label={new Intl.DateTimeFormat("id-ID", {
                dateStyle: "full",
                timeZone: data.profile.timezone,
              }).format(parseDate(key))}
              onClick={() => setSelected(key)}
            >
              <span>{DAYS[weekday(key)]}</span>
              <strong>{Number(key.slice(-2))}</strong>
              <i />
            </button>
          ))}
        </div>
      </div>
    );
  }
  function routineList(limit?: number) {
    const list = limit ? habits.slice(0, limit) : habits;
    return (
      <>
        {list.length ? (
          list.map((h) => {
            const done = data.completions.some(
              (c) => c.habit_id === h.id && c.date === selected,
            );
            return (
              <div className={`routine-item ${done ? "done" : ""}`} key={h.id}>
                <span className={`routine-icon cat-${h.category}`}>
                  <HabitIcon name={h.icon} size={22} />
                </span>
                <button
                  className="routine-copy"
                  aria-label={`Ubah ${h.title}`}
                  onClick={() => {
                    setEditingHabit(h);
                    setDialog("habit");
                  }}
                >
                  <strong>{h.title}</strong>
                  <span>
                    {h.time.slice(0, 5)} – {timeEnd(h.time, h.duration)}
                    <i />
                    {h.duration} menit
                  </span>
                </button>
                <button
                  className="check-control"
                  role="checkbox"
                  aria-checked={done}
                  aria-label={`${done ? "Batalkan" : "Selesaikan"} ${h.title}`}
                  disabled={
                    busy ||
                    loading ||
                    selected > today ||
                    Boolean(user && issue)
                  }
                  onClick={() =>
                    void run(
                      () => model.toggle(h.id, selected),
                      done ? undefined : "Satu langkah lagi. Bagus!",
                    )
                  }
                >
                  {done && <Check size={17} strokeWidth={2.8} />}
                </button>
              </div>
            );
          })
        ) : (
          <Empty
            title={
              query ? "Rutinitas tidak ditemukan" : "Ruang untuk kebiasaan baru"
            }
            body={
              query
                ? "Coba kata kunci lain."
                : "Tambahkan rutinitas ringan untuk hari ini."
            }
            action={
              !query && (
                <button className="text-button" onClick={newHabit}>
                  <Plus size={16} />
                  Tambah rutinitas
                </button>
              )
            }
          />
        )}
      </>
    );
  }
  function classList() {
    return classesToday.length ? (
      <div className="class-timeline">
        {classesToday.map((c) => (
          <button
            className="class-row"
            key={c.id}
            onClick={() => {
              setEditingClass(c);
              setDialog("class");
            }}
          >
            <span className="timeline-dot" />
            <time>
              {c.start.slice(0, 5)}
              <small>{c.end.slice(0, 5)}</small>
            </time>
            <span>
              <strong>{c.title}</strong>
              <small>{c.room || "Ruangan belum diisi"}</small>
            </span>
            <ChevronRight size={16} />
          </button>
        ))}
      </div>
    ) : (
      <Empty
        icon={GraduationCap}
        title="Tidak ada kuliah hari ini"
        body="Gunakan waktu luang untuk belajar, beristirahat, atau mengejar target Anda."
      />
    );
  }
  function activityChart() {
    return (
      <div
        className="bar-chart"
        role="img"
        aria-label={weekStats
          .map((s) => `${DAYS[weekday(s.key)]}: ${s.percent}%`)
          .join(", ")}
      >
        {weekStats.map((s) => (
          <div
            className={`bar-column ${s.key === today ? "current" : ""}`}
            key={s.key}
          >
            <span>{s.key > today ? "—" : `${s.percent}%`}</span>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{ height: `${s.key > today ? 0 : s.percent}%` }}
              />
            </div>
            <small>{DAYS[weekday(s.key)]}</small>
            {s.key === today && <i />}
          </div>
        ))}
      </div>
    );
  }
  const progressPanel = (
    <Panel className="progress-panel">
      <SectionTitle
        icon={LayoutGrid}
        title="Progres hari ini"
        action={
          <button className="subtle-link" onClick={() => navigate("stats")}>
            Detail
            <ArrowUpRight size={14} />
          </button>
        }
      />
      <div className="progress-content">
        <ProgressRing value={stats.percent} />
        <div className="progress-copy">
          <span className="eyebrow">LANGKAH KECIL, SETIAP HARI</span>
          <strong>
            {stats.done}
            <span> / {stats.total}</span>
          </strong>
          <p>rutinitas diselesaikan</p>
          <div className="mini-progress">
            <i style={{ width: `${stats.percent}%` }} />
          </div>
          <small>
            {stats.percent === 100 && stats.total
              ? "Hari yang luar biasa. Pertahankan!"
              : stats.done
                ? "Anda sedang membangun versi terbaik."
                : "Mulai dari satu kebiasaan hari ini."}
          </small>
        </div>
      </div>
    </Panel>
  );
  const routinesPanel = (
    <Panel className="routines-panel" solid>
      <SectionTitle
        icon={CheckCircle2}
        title={selected === today ? "Rutinitas hari ini" : "Rutinitas terpilih"}
        action={
          <button
            className="icon-button small"
            aria-label="Tambah rutinitas"
            onClick={newHabit}
          >
            <Plus size={19} />
          </button>
        }
      />
      <div className="routine-summary">
        <span>
          {stats.done} dari {stats.total} selesai
        </span>
        <span>
          {stats.total ? Math.max(0, stats.total - stats.done) : 0} tersisa
        </span>
      </div>
      <div className="thin-progress">
        <span style={{ width: `${stats.percent}%` }} />
      </div>
      <div className="routine-list">
        {routineList(page === "home" ? 5 : undefined)}
      </div>
      {page === "home" && (
        <button className="routine-footer" onClick={() => navigate("routines")}>
          Lihat semua rutinitas <ArrowRight size={16} />
        </button>
      )}
    </Panel>
  );
  return (
    <div
      className={`app ${collapsed ? "sidebar-collapsed" : ""}`}
      style={glassAppearance.style}
    >
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="ribbon ribbon-one" />
      <div className="ribbon ribbon-two" />
      <a className="skip-link" href="#main">
        Lewati ke konten
      </a>
      {sidebarOpen && (
        <button
          className="sidebar-scrim"
          aria-label="Tutup navigasi"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside className={`sidebar glass ${sidebarOpen ? "open" : ""}`}>
        <button
          className="brand"
          onClick={() => navigate("home")}
          aria-label="FrRoutine beranda"
        >
          <img
            src="/brand/wordmark.webp"
            alt="FrRoutine — Plan. Do. Achieve."
          />
        </button>
        <span className="nav-caption">RUANG PERSONAL ANDA</span>
        <nav aria-label="Navigasi utama">
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${page === id ? "active" : ""}`}
              aria-current={page === id ? "page" : undefined}
              onClick={() => navigate(id)}
              title={label}
            >
              <Icon size={20} strokeWidth={1.7} />
              <span>{label}</span>
              {page === id && <i />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className={`nav-item ${page === "profile" ? "active" : ""}`}
            onClick={() => navigate("profile")}
            title="Pengaturan"
          >
            <Settings2 size={20} />
            <span>Pengaturan</span>
          </button>
          <div className="inspiration-card">
            <Landscape />
            <div>
              <span className="tiny-label">SEDIKIT DEMI SEDIKIT</span>
              <p>
                Versi terbaikmu
                <br />
                sedang dibangun.
              </p>
              <span className="inspiration-line" />
            </div>
          </div>
          <button
            className="sidebar-account"
            onClick={() => (user ? navigate("profile") : setDialog("auth"))}
          >
            <span className="avatar">
              {firstName.slice(0, 1).toUpperCase()}
            </span>
            <span>
              <strong>{user ? firstName : "Ruang pribadi"}</strong>
              <small>
                {user ? "Akun tersinkron" : "Masuk untuk sinkronisasi"}
              </small>
            </span>
            <ChevronRight size={16} />
          </button>
        </div>
        <button
          className="collapse-button icon-button"
          aria-label={collapsed ? "Perluas sidebar" : "Perkecil sidebar"}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </aside>
      <main id="main" className="main">
        <header className="topbar">
          <div className="topbar-start">
            <button
              className="icon-button mobile-menu"
              aria-label="Buka navigasi"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <span className="date-label">
              <CalendarDays size={16} />
              {new Intl.DateTimeFormat("id-ID", {
                weekday: "short",
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: data.profile.timezone,
              }).format(now)}
            </span>
            <img
              className="mobile-wordmark"
              src="/brand/wordmark.webp"
              alt="FrRoutine"
            />
          </div>
          <div className="topbar-actions">
            <label className="search-box glass">
              <Search size={18} />
              <input
                aria-label="Cari rutinitas"
                placeholder="Cari rutinitas…"
                value={query}
                onInput={(e) => {
                  setQuery(e.currentTarget.value);
                  if (page !== "routines") navigate("routines");
                }}
                onChange={(e) => setQuery(e.target.value)}
              />
              <span>/</span>
            </label>
            <button
              className="icon-button glass notification-button"
              aria-label="Pengingat"
              onClick={() => setDialog("notifications")}
            >
              <Bell size={20} />
              <i />
            </button>
            <button
              className="profile-button glass"
              aria-label="Buka profil"
              onClick={() => navigate("profile")}
            >
              <span className="avatar">
                {firstName.slice(0, 1).toUpperCase()}
              </span>
              <ChevronDown size={15} />
            </button>
          </div>
        </header>
        <div className="page-heading">
          <div>
            <span className="eyebrow">
              {page === "home"
                ? "PLAN. DO. ACHIEVE."
                : page === "routines"
                  ? "KEBIASAAN YANG BERARTI"
                  : page === "schedule"
                    ? "RUANG UNTUK SEMUANYA"
                    : page === "stats"
                      ? "SETIAP LANGKAH TERHITUNG"
                      : page === "goals"
                        ? "TUMBUH DENGAN TUJUAN"
                        : page === "journal"
                          ? "SEJENAK UNTUK DIRI SENDIRI"
                          : "RUANG PERSONAL"}
            </span>
            <h1 className={page === "home" ? "greeting-title" : undefined}>
              {page === "home" ? (
                <>
                  Selamat {greeting}, <span>{firstName}.</span>
                  <Sparkles className="greeting-spark" size={29} />
                </>
              ) : page === "routines" ? (
                "Rutinitas Anda."
              ) : page === "schedule" ? (
                "Jadwal yang seimbang."
              ) : page === "stats" ? (
                "Perjalanan Anda."
              ) : page === "goals" ? (
                "Sedikit lebih dekat."
              ) : page === "journal" ? (
                "Bagaimana hari Anda?"
              ) : (
                "Tentang Anda."
              )}
            </h1>
            <p>
              {page === "home"
                ? "Hari baru, kesempatan baru untuk menjadi lebih baik."
                : page === "routines"
                  ? "Konsistensi dimulai dari hal sederhana yang diulang."
                  : page === "schedule"
                    ? "Kuliah tetap utama, kebiasaan baik tetap berjalan."
                    : page === "stats"
                      ? "Lihat kebiasaan kecil Anda membentuk perubahan."
                      : page === "goals"
                        ? "Ubah niat menjadi langkah yang bisa Anda ukur."
                        : page === "journal"
                          ? "Simpan cerita, pelajaran, dan hal kecil yang Anda syukuri."
                          : "Atur ruang yang mendukung versi terbaik Anda."}
            </p>
          </div>
          {page === "home" ? (
            <button className="primary header-cta" onClick={newHabit}>
              <Plus size={18} />
              Rutinitas baru
            </button>
          ) : page === "routines" ? (
            <button className="primary header-cta" onClick={newHabit}>
              <Plus size={18} />
              Tambah rutinitas
            </button>
          ) : page === "schedule" ? (
            <button
              className="primary header-cta"
              onClick={() => {
                setEditingClass(undefined);
                setDialog("class");
              }}
            >
              <Plus size={18} />
              Tambah kelas
            </button>
          ) : page === "goals" ? (
            <button
              className="primary header-cta"
              onClick={() => setDialog("goal")}
            >
              <Plus size={18} />
              Target baru
            </button>
          ) : null}
        </div>
        {!online && (
          <div className="status-banner">
            <WifiOff size={17} />
            {user
              ? "Anda offline. Data akun dapat dilihat, penyimpanan memerlukan internet."
              : "Mode offline. Perubahan disimpan pada perangkat ini."}
          </div>
        )}
        {!user && ready && (
          <div className="guest-banner">
            <span>
              <CloudOff size={16} />
              <span>
                Mode perangkat <small>· progres tersimpan di browser ini</small>
              </span>
            </span>
            <button onClick={() => setDialog("auth")}>
              Sinkronkan akun
              <ArrowRight size={14} />
            </button>
          </div>
        )}
        {issue && (
          <div className="status-banner error" role="alert">
            <span>{issue}</span>
            <button className="text-button" onClick={() => model.retry()}>
              Coba lagi
            </button>
          </div>
        )}
        {loading && (
          <div className="status-banner" role="status">
            <LoaderCircle size={18} className="spin" />
            Memuat ruang pribadi Anda…
          </div>
        )}
        {(page === "home" ||
          page === "routines" ||
          page === "schedule" ||
          page === "journal") && (
          <div className="calendar-row">
            {weekPicker()}
            <button
              className="today-button"
              onClick={() => {
                setWeek(today);
                setSelected(today);
              }}
            >
              Hari ini
              <ArrowDownToLine size={15} />
            </button>
          </div>
        )}
        {page === "home" && (
          <div className="dashboard-grid">
            {progressPanel}
            <Panel className="activity-panel">
              <SectionTitle
                icon={BarChart3}
                title="Aktivitas mingguan"
                action={<span className="card-caption">Minggu ini</span>}
              />
              {activityChart()}
            </Panel>
            {routinesPanel}
            <Panel className="classes-panel">
              <SectionTitle
                icon={GraduationCap}
                title="Jadwal kuliah"
                action={
                  <button
                    className="subtle-link"
                    onClick={() => navigate("schedule")}
                  >
                    Semua
                    <ArrowUpRight size={14} />
                  </button>
                }
              />
              {classList()}
              {nextClass && (
                <button
                  className="next-class"
                  onClick={() => {
                    setSelected(nextClass.key);
                    setWeek(nextClass.key);
                    navigate("schedule");
                  }}
                >
                  <div className="next-class-icon">
                    <GraduationCap size={25} />
                  </div>
                  <div>
                    <span>
                      {nextClass.offset === 0
                        ? "KELAS BERIKUTNYA"
                        : nextClass.offset === 1
                          ? "BESOK"
                          : FULL_DAYS[nextClass.day].toUpperCase()}
                    </span>
                    <strong>{nextClass.title}</strong>
                    <small>
                      {nextClass.start.slice(0, 5)} –{" "}
                      {nextClass.end.slice(0, 5)}
                    </small>
                  </div>
                  <ArrowUpRight size={19} />
                </button>
              )}
            </Panel>
            <Panel className="streak-panel">
              <div className="streak-info">
                <span className="eyebrow">KONSISTENSI ANDA</span>
                <h2>
                  {streakCount}
                  <span> hari</span>
                </h2>
                <p>
                  {streakCount
                    ? "Jaga ritme baik ini."
                    : "Hari pertama dimulai dari sini."}
                </p>
                <div className="streak-days">
                  {weekStats.map((s) => (
                    <span
                      key={s.key}
                      className={s.percent >= 70 ? "achieved" : ""}
                      aria-label={`${DAYS[weekday(s.key)]} ${s.percent >= 70 ? "target tercapai" : "belum tercapai"}`}
                    >
                      {s.percent >= 70 ? (
                        <Check size={12} />
                      ) : (
                        DAYS[weekday(s.key)].slice(0, 1)
                      )}
                    </span>
                  ))}
                </div>
              </div>
              <GlassFlame />
            </Panel>
            <Panel className="achievements-panel">
              <SectionTitle
                icon={Trophy}
                title="Pencapaian"
                action={
                  <button
                    className="subtle-link"
                    aria-label="Lihat pencapaian"
                    onClick={() => navigate("goals")}
                  >
                    <ArrowUpRight size={16} />
                  </button>
                }
              />
              <div className="badges">
                {badgeStates.map((unlocked, i) => (
                  <BadgeArt index={i} unlocked={unlocked} key={i} />
                ))}
              </div>
              <p>
                {badgeStates.filter(Boolean).length} dari 5 lencana terbuka{" "}
                <span>· terus bertumbuh</span>
              </p>
            </Panel>
            <Panel className="focus-panel">
              <div className="focus-symbol">
                <Timer size={26} />
              </div>
              <div>
                <h2>Saatnya fokus.</h2>
                <p>25 menit untuk satu langkah berarti.</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setDialog("focus")}
                aria-label="Mulai sesi fokus"
              >
                <Play size={19} fill="currentColor" />
              </button>
            </Panel>
          </div>
        )}
        {page === "routines" && (
          <>
            <div className="filter-row">
              <div className="filters">
                {["Semua", "Skill", "Akademik", "Kesehatan", "Pribadi"].map(
                  (c) => (
                    <button
                      className={category === c ? "selected" : ""}
                      key={c}
                      onClick={() => setCategory(c)}
                    >
                      {c}
                    </button>
                  ),
                )}
              </div>
              <span>{habits.length} rutinitas</span>
            </div>
            <div className="routine-page-grid">
              {routinesPanel}
              <div className="routine-side">
                {progressPanel}
                <Panel>
                  <SectionTitle icon={Timer} title="Waktu untuk diri sendiri" />
                  <div className="big-number">
                    {totalDuration}
                    <span> menit</span>
                  </div>
                  <p className="muted">
                    Total durasi semua rutinitas aktif. Bagi menjadi sesi pendek
                    agar terasa ringan.
                  </p>
                  <button
                    className="secondary full"
                    onClick={() => setDialog("focus")}
                  >
                    <Play size={17} />
                    Mulai sesi fokus
                  </button>
                </Panel>
                <Panel className="tip-card">
                  <Sparkles size={23} />
                  <h3>Cukup konsisten.</h3>
                  <p>
                    Tidak perlu sempurna. Capai 70% rutinitas harian untuk
                    membangun streak Anda.
                  </p>
                </Panel>
                {data.habits.some((h) => h.archived) && (
                  <Panel>
                    <h3>Rutinitas diarsipkan</h3>
                    {data.habits
                      .filter((h) => h.archived)
                      .map((h) => (
                        <div className="archived-item" key={h.id}>
                          <span>{h.title}</span>
                          <button
                            className="text-button"
                            onClick={() => {
                              setEditingHabit(h);
                              setDialog("habit");
                            }}
                          >
                            Pulihkan
                          </button>
                        </div>
                      ))}
                  </Panel>
                )}
              </div>
            </div>
          </>
        )}
        {page === "schedule" && (
          <div className="schedule-layout">
            <Panel className="schedule-main">
              <SectionTitle
                icon={CalendarDays}
                title={`${FULL_DAYS[weekday(selected)]}, ${new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", timeZone: data.profile.timezone }).format(parseDate(selected))}`}
                action={<span className="pill">WITA</span>}
              />
              <div className="schedule-timeline">
                {[
                  ...classesToday.map((c) => ({
                    id: c.id,
                    time: c.start,
                    end: c.end,
                    title: c.title,
                    detail: c.room,
                    type: "class",
                    item: c,
                  })),
                  ...scheduledHabits.map((h) => ({
                    id: h.id,
                    time: h.time,
                    end: timeEnd(h.time, h.duration),
                    title: h.title,
                    detail: `${h.duration} menit · ${h.category}`,
                    type: "habit",
                    item: h,
                  })),
                ]
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map((event) => (
                    <button
                      className={`schedule-event ${event.type}`}
                      key={event.id}
                      onClick={() => {
                        if (event.type === "class") {
                          setEditingClass(event.item as ClassItem);
                          setDialog("class");
                        } else {
                          setEditingHabit(event.item as Habit);
                          setDialog("habit");
                        }
                      }}
                    >
                      <time>
                        {event.time.slice(0, 5)}
                        <small>{event.end.slice(0, 5)}</small>
                      </time>
                      <div className="event-body">
                        <span>
                          {event.type === "class" ? (
                            <GraduationCap size={19} />
                          ) : (
                            <CheckCircle2 size={19} />
                          )}
                          <small>
                            {event.type === "class" ? "KULIAH" : "RUTINITAS"}
                          </small>
                        </span>
                        <strong>{event.title}</strong>
                        <small>{event.detail}</small>
                      </div>
                      <Pencil size={15} />
                    </button>
                  ))}
              </div>
              {!classesToday.length && !scheduledHabits.length && (
                <Empty
                  title="Hari yang masih kosong"
                  body="Tambahkan kelas atau rutinitas untuk mengatur hari ini."
                />
              )}
            </Panel>
            <div className="routine-side">
              <Panel className="planner-card">
                <span className="heading-icon">
                  <Sparkles size={24} />
                </span>
                <h3>Temukan ritme terbaik.</h3>
                <p>
                  Susun rutinitas di sela kuliah, dengan waktu persiapan dan
                  istirahat.
                </p>
                <button
                  className="primary full"
                  disabled={busy || loading}
                  onClick={() => setDialog("planner")}
                >
                  <Sparkles size={17} /> Jadwal otomatis
                </button>
              </Panel>
              <Panel className="tip-card">
                <GraduationCap size={27} />
                <h3>Kuliah tetap prioritas.</h3>
                <p>
                  Rutinitas baru diperiksa terhadap jadwal kelas, dengan jeda
                  persiapan 20 menit.
                </p>
              </Panel>
              <Panel>
                <SectionTitle icon={LayoutGrid} title="Ringkasan minggu" />
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                  <button
                    className="week-summary"
                    key={d}
                    onClick={() =>
                      setSelected(weekKeys.find((k) => weekday(k) === d)!)
                    }
                  >
                    <span>{FULL_DAYS[d]}</span>
                    <strong>
                      {data.classes.filter((c) => c.day === d).length} kelas
                    </strong>
                    <ChevronRight size={14} />
                  </button>
                ))}
              </Panel>
              <button
                className="secondary full"
                onClick={() => {
                  setEditingClass(undefined);
                  setDialog("class");
                }}
              >
                <Plus size={17} />
                Tambah kelas
              </button>
            </div>
          </div>
        )}
        {page === "stats" && (
          <>
            <div className="stats-toolbar">
              <div className="segmented">
                {[7, 30].map((p) => (
                  <button
                    className={period === p ? "selected" : ""}
                    key={p}
                    onClick={() => setPeriod(p)}
                  >
                    {p} hari terakhir
                  </button>
                ))}
              </div>
              <span className="muted">Berdasarkan progres Anda</span>
            </div>
            <div className="stat-cards">
              {[
                {
                  label: "Rata-rata harian",
                  value: `${avg}%`,
                  icon: BarChart3,
                },
                {
                  label: "Rutinitas selesai",
                  value: rangeStats.reduce((s, d) => s + d.done, 0),
                  icon: CheckCircle2,
                },
                {
                  label: "Menit bertumbuh",
                  value: rangeStats.reduce((s, d) => s + d.minutes, 0),
                  icon: Clock3,
                },
                {
                  label: "Streak aktif",
                  value: `${streakCount} hari`,
                  icon: Flame,
                },
              ].map((s) => (
                <Panel key={s.label}>
                  <s.icon className="accent" size={22} />
                  <span className="stat-label">{s.label}</span>
                  <strong className="stat-value">{s.value}</strong>
                </Panel>
              ))}
            </div>
            <Panel className="chart-panel">
              <SectionTitle icon={BarChart3} title="Ritme produktivitas" />
              <div
                className="line-chart"
                role="img"
                aria-label={rangeStats
                  .map((s) => `${s.key}: ${s.percent}%`)
                  .join(", ")}
              >
                <div className="chart-y">
                  <span>100%</span>
                  <span>50%</span>
                  <span>0%</span>
                </div>
                <div className="chart-canvas">
                  <svg
                    viewBox="0 0 900 220"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient id="chartGradient" x2="0" y2="1">
                        <stop stopColor="#ff8a2b" stopOpacity=".32" />
                        <stop offset="1" stopColor="#ff8a2b" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="chartStroke">
                        <stop stopColor="#ff941b" />
                        <stop offset="1" stopColor="#a91639" />
                      </linearGradient>
                    </defs>
                    {[0, 50, 100].map((y) => (
                      <line
                        key={y}
                        x1="0"
                        x2="900"
                        y1={210 - y * 2}
                        y2={210 - y * 2}
                        stroke="#d9c9be"
                        strokeDasharray="4 5"
                      />
                    ))}
                    <path
                      d={`M 0 210 ${rangeStats.map((s, i) => `L ${(i * 900) / (period - 1)} ${210 - s.percent * 2}`).join(" ")} L 900 210 Z`}
                      fill="url(#chartGradient)"
                    />
                    <polyline
                      points={rangeStats
                        .map(
                          (s, i) =>
                            `${(i * 900) / (period - 1)},${210 - s.percent * 2}`,
                        )
                        .join(" ")}
                      fill="none"
                      stroke="url(#chartStroke)"
                      strokeWidth="4"
                      vectorEffect="non-scaling-stroke"
                      strokeLinejoin="round"
                    />
                    {rangeStats.map((s, i) => (
                      <circle
                        key={s.key}
                        cx={(i * 900) / (period - 1)}
                        cy={210 - s.percent * 2}
                        r={period === 7 ? 5 : 2}
                        fill="#ce431d"
                      />
                    ))}
                  </svg>
                  <div className="chart-x">
                    {[
                      rangeStats[0],
                      rangeStats[Math.floor(period / 2)],
                      rangeStats[period - 1],
                    ].map((s) => (
                      <span key={s.key}>
                        {s.key.slice(8)}{" "}
                        {new Intl.DateTimeFormat("id-ID", {
                          month: "short",
                          timeZone: data.profile.timezone,
                        }).format(parseDate(s.key))}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              {allDone === 0 && (
                <p className="chart-note">
                  Grafik dimulai dari nol. Setiap rutinitas yang Anda selesaikan
                  akan tampil di sini.
                </p>
              )}
            </Panel>
            <div className="stats-bottom">
              <Panel>
                <SectionTitle
                  icon={Target}
                  title="Kebiasaan paling konsisten"
                />
                {active
                  .slice()
                  .sort(
                    (a, b) =>
                      data.completions.filter((c) => c.habit_id === b.id)
                        .length -
                      data.completions.filter((c) => c.habit_id === a.id)
                        .length,
                  )
                  .slice(0, 5)
                  .map((h) => (
                    <div className="habit-ranking" key={h.id}>
                      <HabitIcon name={h.icon} size={19} />
                      <span>{h.title}</span>
                      <strong>
                        {
                          data.completions.filter((c) => c.habit_id === h.id)
                            .length
                        }
                        x
                      </strong>
                    </div>
                  ))}
              </Panel>
              <Panel className="tip-card">
                <GlassFlame />
                <h3>Streak yang bermakna.</h3>
                <p>
                  Capai minimal 70% rutinitas terjadwal dalam satu hari untuk
                  menambah streak. Hari ini tetap bisa Anda selesaikan.
                </p>
                <p>
                  Statistik memakai jadwal rutinitas aktif saat ini, sejak
                  tanggal rutinitas dibuat.
                </p>
              </Panel>
            </div>
          </>
        )}
        {page === "goals" && (
          <>
            <div className="goals-grid">
              {data.goals.map((g) => (
                <Panel className="goal-card" key={g.id}>
                  <div className="goal-top">
                    <span className="routine-icon">
                      <Target size={23} />
                    </span>
                    <span className="pill">{g.category}</span>
                    <button
                      className="icon-button small"
                      aria-label={`Hapus target ${g.title}`}
                      onClick={() => {
                        if (window.confirm(`Hapus target “${g.title}”?`))
                          void run(
                            () => model.deleteGoal(g.id),
                            "Target dihapus.",
                          );
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <h2>{g.title}</h2>
                  <p>
                    <strong>{g.current}</strong> / {g.target} {g.unit}
                  </p>
                  <div className="thin-progress">
                    <span
                      style={{
                        width: `${Math.min(100, (g.current / g.target) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="goal-actions">
                    <button
                      className="secondary"
                      disabled={busy || g.current === 0}
                      onClick={() =>
                        void run(() =>
                          model.saveGoal({ ...g, current: g.current - 1 }),
                        )
                      }
                    >
                      −1
                    </button>
                    <button
                      className="primary"
                      disabled={busy || g.current >= g.target}
                      onClick={() =>
                        void run(
                          () =>
                            model.saveGoal({
                              ...g,
                              current: Math.min(g.target, g.current + 1),
                            }),
                          g.current + 1 >= g.target
                            ? "Target tercapai. Selamat!"
                            : undefined,
                        )
                      }
                    >
                      {g.current >= g.target ? (
                        <>
                          <Check size={16} />
                          Tercapai
                        </>
                      ) : (
                        <>
                          <Plus size={16} />
                          Tambah progres
                        </>
                      )}
                    </button>
                  </div>
                </Panel>
              ))}
              {!data.goals.length && (
                <Panel>
                  <Empty
                    icon={Target}
                    title="Apa yang ingin Anda capai?"
                    body="Mulai dari satu target kecil, seperti 10 sesi belajar atau 30 halaman buku."
                    action={
                      <button
                        className="primary"
                        onClick={() => setDialog("goal")}
                      >
                        <Plus size={17} />
                        Buat target pertama
                      </button>
                    }
                  />
                </Panel>
              )}
              {data.goals.length > 0 && (
                <button
                  className="new-goal-card"
                  onClick={() => setDialog("goal")}
                >
                  <Plus size={24} />
                  <span>Tambah target baru</span>
                </button>
              )}
            </div>
            <Panel className="achievement-collection">
              <SectionTitle icon={Trophy} title="Koleksi pencapaian" />
              <p className="muted">Lencana terbuka dari progres asli Anda.</p>
              <div className="achievement-grid">
                {[
                  "Langkah pertama",
                  "Terus bertumbuh",
                  "Ritme tiga hari",
                  "Target tercapai",
                  "Seratus langkah",
                ].map((title, i) => (
                  <div key={title} className={badgeStates[i] ? "unlocked" : ""}>
                    <BadgeArt index={i} unlocked={badgeStates[i]} />
                    <strong>{title}</strong>
                    <small>
                      {
                        [
                          "Selesaikan 1 rutinitas",
                          "Selesaikan 10 rutinitas",
                          "Raih streak 3 hari",
                          "Selesaikan 1 target",
                          "Selesaikan 100 rutinitas",
                        ][i]
                      }
                    </small>
                    <span>{badgeStates[i] ? "Terbuka" : "Belum terbuka"}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </>
        )}
        {page === "journal" && (
          <div className="journal-layout">
            <Panel solid>
              <SectionTitle icon={NotebookPen} title="Catatan kecil hari ini" />
              <p className="muted">
                {new Intl.DateTimeFormat("id-ID", {
                  dateStyle: "full",
                  timeZone: data.profile.timezone,
                }).format(parseDate(selected))}
              </p>
              <fieldset className="mood-field">
                <legend>Perasaan Anda</legend>
                <div className="filters">
                  {["Bahagia", "Baik", "Biasa", "Lelah", "Sedih"].map((m) => (
                    <button
                      className={mood === m ? "selected" : ""}
                      key={m}
                      onClick={() => {
                        setMood(m);
                        setJournalDirty(true);
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </fieldset>
              <label className="journal-label" htmlFor="journal">
                Apa yang Anda pelajari, syukuri, atau ingin perbaiki?
              </label>
              <textarea
                id="journal"
                value={journalText}
                onInput={(e) => {
                  setJournalText(e.currentTarget.value);
                  setJournalDirty(true);
                }}
                onChange={(e) => {
                  setJournalText(e.target.value);
                  setJournalDirty(true);
                }}
                placeholder="Hari ini, saya…"
                maxLength={10000}
                rows={10}
              />
              <div className="journal-bottom">
                <span>
                  {journalText.length} / 10.000
                  {journalDirty ? " · belum disimpan" : ""}
                </span>
                <button
                  className="primary"
                  disabled={busy || selected > today}
                  onClick={() =>
                    void run(async () => {
                      await model.saveJournal({
                        date: selected,
                        content: journalText,
                        mood,
                      });
                      setJournalDirty(false);
                    }, "Jurnal tersimpan.")
                  }
                >
                  <Check size={17} />
                  Simpan catatan
                </button>
              </div>
            </Panel>
            <Panel>
              <SectionTitle icon={Clock3} title="Cerita sebelumnya" />
              {data.journals.length ? (
                data.journals
                  .slice()
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .slice(0, 20)
                  .map((j) => (
                    <button
                      className="journal-preview"
                      key={j.date}
                      onClick={() => {
                        setSelected(j.date);
                        setWeek(j.date);
                        setJournalText(j.content);
                        setMood(j.mood);
                        setJournalDirty(false);
                      }}
                    >
                      <span>
                        {j.date} <i>{j.mood}</i>
                      </span>
                      <p>
                        {j.content.slice(0, 100) ||
                          "Hari ini disimpan lewat perasaan."}
                      </p>
                      <ArrowUpRight size={16} />
                    </button>
                  ))
              ) : (
                <Empty
                  title="Cerita Anda dimulai di sini"
                  body="Catatan yang disimpan akan muncul di bagian ini."
                />
              )}
            </Panel>
          </div>
        )}
        {page === "profile" && (
          <div className="profile-layout">
            <Panel className="profile-card">
              <span className="avatar large">
                {firstName.slice(0, 1).toUpperCase()}
              </span>
              <h2>{data.profile.name}</h2>
              <p>{user?.email ?? "Ruang pribadi pada perangkat ini"}</p>
              <span className="pill">
                {user ? (
                  <>
                    <Cloud size={14} />
                    Akun tersinkron
                  </>
                ) : (
                  <>
                    <CloudOff size={14} />
                    Mode perangkat
                  </>
                )}
              </span>
              {!user && (
                <button
                  className="primary full"
                  onClick={() => setDialog("auth")}
                >
                  Masuk / buat akun <ArrowRight size={17} />
                </button>
              )}
              <div className="profile-totals">
                <span>
                  <strong>{allDone}</strong>rutinitas selesai
                </span>
                <span>
                  <strong>{streakCount}</strong>hari konsisten
                </span>
              </div>
            </Panel>
            <div className="routine-side">
              <Panel>
                <SectionTitle icon={Settings2} title="Pengaturan pribadi" />
                <form
                  className="form-stack"
                  key={`${user?.id ?? "guest"}-${data.profile.name}`}
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    void run(
                      () =>
                        model.saveProfile({
                          ...data.profile,
                          name: String(f.get("name")).trim(),
                          timezone: "Asia/Makassar",
                        }),
                      "Profil diperbarui.",
                    );
                  }}
                >
                  <label>
                    Nama tampilan
                    <input
                      name="name"
                      defaultValue={data.profile.name}
                      required
                      maxLength={60}
                    />
                  </label>
                  <label>
                    Zona waktu
                    <input value="WITA — Asia/Makassar (UTC+8)" readOnly />
                  </label>
                  <button disabled={busy} className="primary">
                    Simpan pengaturan
                  </button>
                </form>
              </Panel>
              <GlassSettings
                value={glassAppearance.transparency}
                onChange={glassAppearance.setTransparency}
                saveError={glassAppearance.saveError}
              />

              <Panel>
                <SectionTitle icon={LayoutGrid} title="Ruang Anda" />
                <div className="profile-links">
                  <button onClick={() => navigate("goals")}>
                    <Trophy size={19} />
                    Target & pencapaian
                    <ChevronRight size={17} />
                  </button>
                  <button onClick={() => navigate("journal")}>
                    <NotebookPen size={19} />
                    Jurnal harian
                    <ChevronRight size={17} />
                  </button>
                  <button onClick={() => setDialog("notifications")}>
                    <Bell size={19} />
                    Pengingat rutinitas
                    <ChevronRight size={17} />
                  </button>
                  <button
                    onClick={() => {
                      const blob = new Blob(
                        [
                          JSON.stringify(
                            { exported_at: new Date().toISOString(), ...data },
                            null,
                            2,
                          ),
                        ],
                        { type: "application/json" },
                      );
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `FrRoutine-${today}.json`;
                      a.click();
                      setTimeout(() => URL.revokeObjectURL(url), 1000);
                      notify("Data Anda berhasil diekspor.");
                    }}
                  >
                    <ArrowDownToLine size={19} />
                    Ekspor data pribadi
                    <ChevronRight size={17} />
                  </button>
                  <button
                    onClick={async () => {
                      if (installEvent) {
                        await installEvent.prompt();
                        const choice = await installEvent.userChoice;
                        if (choice.outcome === "accepted")
                          setInstallEvent(null);
                      } else
                        notify(
                          "Untuk memasang: buka menu browser → Instal aplikasi / Tambahkan ke Layar Utama.",
                        );
                    }}
                  >
                    <House size={19} />
                    Pasang aplikasi PWA
                    <ChevronRight size={17} />
                  </button>
                  {user && (
                    <button
                      className="danger"
                      onClick={() =>
                        void run(
                          () => model.signOut(),
                          "Anda sudah keluar. Mode perangkat dipulihkan.",
                        )
                      }
                    >
                      <LogOut size={19} />
                      Keluar akun
                      <ChevronRight size={17} />
                    </button>
                  )}
                </div>
              </Panel>
              <p className="version-label">
                FrRoutine 1.0 · Plan. Do. Achieve.
                <br />
                Dibangun untuk langkah kecil yang berarti.
              </p>
            </div>
          </div>
        )}
        <footer className="page-footer">
          <span>
            FrRoutine <i /> Plan. Do. Achieve.
          </span>
          <span>
            {user ? (
              <>
                <Cloud size={13} />
                {loading ? "Menyinkronkan…" : "Ruang pribadi Anda"}
              </>
            ) : (
              <>
                <CloudOff size={13} />
                Tersimpan di perangkat
              </>
            )}
          </span>
        </footer>
      </main>
      <nav className="bottom-nav glass" aria-label="Navigasi mobile">
        <button
          className={page === "home" ? "active" : ""}
          onClick={() => navigate("home")}
        >
          <House size={22} />
          <span>Beranda</span>
        </button>
        <button
          className={page === "schedule" ? "active" : ""}
          onClick={() => navigate("schedule")}
        >
          <CalendarDays size={22} />
          <span>Jadwal</span>
        </button>
        <button
          className="mobile-add"
          onClick={newHabit}
          aria-label="Tambah rutinitas"
        >
          <Plus size={29} />
        </button>
        <button
          className={page === "stats" ? "active" : ""}
          onClick={() => navigate("stats")}
        >
          <BarChart3 size={22} />
          <span>Statistik</span>
        </button>
        <button
          className={page === "profile" ? "active" : ""}
          onClick={() => navigate("profile")}
        >
          <UserRound size={22} />
          <span>Profil</span>
        </button>
      </nav>
      {dialog !== "focus" && focus.state.status !== "idle" && (
        <button
          className="focus-dock glass"
          onClick={() => setDialog("focus")}
          aria-label="Buka mode fokus"
          title="Buka mode fokus"
        >
          <Timer size={22} />
          <span>
            <strong>
              {timerText(focus.left)} ·{" "}
              {focus.state.phase === "focus" ? "Fokus" : "Istirahat"}
            </strong>
            <small>
              {focus.state.status === "finished"
                ? "Sesi selesai · lihat hasil"
                : focus.state.status === "paused"
                  ? "Dijeda · lanjutkan sesi"
                  : focus.state.title}
            </small>
          </span>
          <ArrowUpRight size={18} />
        </button>
      )}
      {toast && (
        <div className="toast" role="status">
          <Sparkles size={17} />
          <span>{toast}</span>
          <button aria-label="Tutup pemberitahuan" onClick={() => setToast("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {dialog && (
        <Modal
          key={`${dialog}-${editingHabit?.id ?? ""}-${editingClass?.id ?? ""}`}
          title={
            dialog === "auth"
              ? "Selamat datang."
              : dialog === "habit"
                ? editingHabit
                  ? "Atur rutinitas"
                  : "Kebiasaan baru."
                : dialog === "class"
                  ? editingClass
                    ? "Atur jadwal kuliah"
                    : "Tambah kelas."
                  : dialog === "goal"
                    ? "Satu tujuan baru."
                    : dialog === "planner"
                      ? "Jadwal otomatis."
                      : dialog === "focus"
                        ? "Ruang fokus."
                        : dialog === "password"
                          ? "Password baru."
                          : "Pengingat Anda."
          }
          wide={dialog === "planner"}
          onClose={() => {
            if (!busy) setDialog(null);
          }}
        >
          {dialog === "auth" ? (
            <AuthForm
              onDone={() => {
                setDialog(null);
                notify("Selamat datang di ruang pribadi Anda.");
              }}
            />
          ) : dialog === "habit" ? (
            <HabitForm
              habit={editingHabit}
              classes={data.classes}
              busy={busy}
              onSave={async (h) => {
                await model.saveHabit(h);
                setDialog(null);
                notify("Rutinitas tersimpan.");
              }}
              onArchive={
                editingHabit
                  ? async () => {
                      await model.saveHabit({
                        ...editingHabit,
                        archived: true,
                      });
                      setDialog(null);
                      notify("Rutinitas diarsipkan. Riwayat tetap tersimpan.");
                    }
                  : undefined
              }
            />
          ) : dialog === "class" ? (
            <ClassForm
              item={editingClass}
              classes={data.classes}
              habits={data.habits}
              busy={busy}
              onSave={async (c) => {
                await model.saveClass(c);
                setDialog(null);
                notify("Jadwal kuliah tersimpan.");
              }}
              onDelete={
                editingClass
                  ? async () => {
                      await model.deleteClass(editingClass.id);
                      setDialog(null);
                      notify("Jadwal dihapus.");
                    }
                  : undefined
              }
            />
          ) : dialog === "goal" ? (
            <GoalForm
              busy={busy}
              onSave={async (g) => {
                await model.saveGoal(g);
                setDialog(null);
                notify("Target baru dibuat.");
              }}
            />
          ) : dialog === "planner" ? (
            <AutoPlanner
              data={data}
              busy={busy}
              onApply={async (habits) => {
                await model.saveHabits(habits);
                setDialog(null);
                notify(
                  "Jadwal otomatis tersimpan. Rutinitas sudah disesuaikan.",
                );
              }}
            />
          ) : dialog === "focus" ? (
            <FocusRoom
              focus={focus}
              habits={data.habits}
              completions={data.completions}
              today={today}
              busy={busy}
              onComplete={async (id) => {
                if (
                  !data.completions.some(
                    (c) => c.habit_id === id && c.date === today,
                  )
                )
                  await run(
                    () => model.toggle(id, today),
                    "Rutinitas ditandai selesai.",
                  );
              }}
            />
          ) : dialog === "password" ? (
            <PasswordForm
              onDone={() => {
                setDialog(null);
                notify("Password berhasil diperbarui.");
              }}
            />
          ) : (
            <ReminderSettings
              data={data}
              settings={reminders.settings}
              onChange={reminders.setSettings}
              saveError={reminders.saveError}
            />
          )}
        </Modal>
      )}
    </div>
  );
}
