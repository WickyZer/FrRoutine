import { useId } from "react";
import {
  Activity,
  BookOpen,
  Code2,
  GraduationCap,
  Keyboard,
  Languages,
  NotebookPen,
  Wallet,
  Droplets,
  PersonStanding,
  Target,
  Flame,
  Check,
  Star,
  Trophy,
  Sun,
  Mountain,
} from "lucide-react";
export const iconMap = {
  water: Droplets,
  stretch: PersonStanding,
  book: BookOpen,
  activity: Activity,
  graduation: GraduationCap,
  languages: Languages,
  code: Code2,
  keyboard: Keyboard,
  wallet: Wallet,
  journal: NotebookPen,
  target: Target,
};
export function HabitIcon({
  name,
  ...props
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const Icon = iconMap[name as keyof typeof iconMap] || Target;
  return <Icon aria-hidden="true" strokeWidth={1.7} {...props} />;
}
export function ProgressRing({
  value,
  size = 158,
}: {
  value: number;
  size?: number;
}) {
  const id = useId();
  const radius = 67;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="progress-ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 160 160" aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#ffb62d" />
            <stop offset=".45" stopColor="#ff6919" />
            <stop offset="1" stopColor="#aa123a" />
          </linearGradient>
        </defs>
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="#eadfd8"
          strokeWidth="12"
        />
        <circle
          className="ring-line"
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value / 100)}
          transform="rotate(-90 80 80)"
        />
      </svg>
      <div>
        <strong>
          {value}
          <small>%</small>
        </strong>
        <span>progres harian</span>
      </div>
    </div>
  );
}
export function GlassFlame() {
  const id = useId();
  return (
    <svg
      className="glass-flame"
      width="68"
      height="80"
      viewBox="0 0 68 80"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1=".2" y1="0" x2=".9" y2="1">
          <stop stopColor="#ffc65b" />
          <stop offset=".48" stopColor="#ff7b0c" />
          <stop offset="1" stopColor="#bf1332" />
        </linearGradient>
      </defs>
      <path
        d="M37 3C45 22 60 26 61 45C63 64 52 76 34 77C13 77 5 63 7 48C8 36 18 30 20 20C27 24 28 30 27 37C35 30 39 16 37 3Z"
        fill={`url(#${id})`}
        stroke="#fff5e5"
        strokeWidth="1.5"
      />
      <path
        d="M37 43C39 53 48 57 45 66C42 78 24 78 22 65C20 58 29 51 30 45C34 48 34 52 33 56C38 53 38 48 37 43Z"
        fill="#fff5d1"
      />
      <path
        d="M40 12C44 30 57 33 56 47"
        stroke="#ffd7a6"
        strokeWidth="2"
        opacity=".7"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function Landscape() {
  const id = useId();
  return (
    <svg
      className="landscape"
      viewBox="0 0 400 290"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x2="0" y2="1">
          <stop stopColor="#f4c584" />
          <stop offset=".5" stopColor="#f9dfb6" />
          <stop offset="1" stopColor="#a77c5f" />
        </linearGradient>
      </defs>
      <rect width="400" height="290" fill={`url(#${id})`} />
      <circle cx="272" cy="91" r="30" fill="#fff0bd" />
      <path
        d="M0 160L76 89L140 145L206 107L312 178L400 120V290H0Z"
        fill="#bb9475"
      />
      <path d="M0 188L94 147L173 190L290 118L400 177V290H0Z" fill="#8c7764" />
      <path d="M0 179L104 218L201 175L295 202L400 159V290H0Z" fill="#655c4e" />
      <path d="M0 229L93 200L201 243L301 210L400 239V290H0Z" fill="#393b34" />
    </svg>
  );
}
const badges = [Star, BookOpen, Flame, Target, Trophy];
export function BadgeArt({
  index,
  unlocked,
}: {
  index: number;
  unlocked: boolean;
}) {
  const Icon = badges[index % badges.length];
  return (
    <span className={`badge-art badge-${index} ${unlocked ? "unlocked" : ""}`}>
      <Icon size={25} strokeWidth={1.6} aria-hidden="true" />
    </span>
  );
}
export function DecorativeOrb() {
  return (
    <div className="decorative-orb" aria-hidden="true">
      <Sun size={36} />
      <span className="orb-ring" />
      <Check size={28} />
    </div>
  );
}
