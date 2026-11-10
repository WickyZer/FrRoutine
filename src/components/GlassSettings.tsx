import { useEffect, useState, type CSSProperties } from "react";
import { Layers, RotateCcw } from "lucide-react";
const KEY = "frroutine.glass-transparency.v1";
export const DEFAULT_TRANSPARENCY = 35;
function normalize(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n)
    ? Math.min(100, Math.max(0, Math.round(n)))
    : DEFAULT_TRANSPARENCY;
}
export function useGlassAppearance() {
  const [transparency, setTransparency] = useState(() => {
    try {
      const stored = localStorage.getItem(KEY);
      return stored === null ? DEFAULT_TRANSPARENCY : normalize(stored);
    } catch {
      return DEFAULT_TRANSPARENCY;
    }
  });
  const [saveError, setSaveError] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, String(transparency));
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }, [transparency]);
  const t = transparency / 100;
  const alpha = (middle:number, minimum:number) => t <= .35 ? 1 - (1-middle)*t/.35 : middle-(middle-minimum)*(t-.35)/.65;
  const style = {
    "--glass-highlight": String(alpha(.66,.28)),
    "--glass-body": String(alpha(.28,.10)),
    "--glass-tail": String(alpha(.42,.18)),
    "--glass-solid": String(1 - 0.32 * t),
    "--glass-chrome": String(1 - 0.67 * t),
    "--glass-dialog": String(1 - 0.22 * t),
  } as CSSProperties;
  return {
    transparency,
    setTransparency: (value: number) => setTransparency(normalize(value)),
    saveError,
    style,
  };
}
export default function GlassSettings({
  value,
  onChange,
  saveError,
}: {
  value: number;
  onChange: (v: number) => void;
  saveError: boolean;
}) {
  return (
    <section
      className="panel appearance-settings"
      aria-labelledby="glass-settings-heading"
    >
      <div className="section-heading">
        <h2 id="glass-settings-heading">
          <span className="heading-icon">
            <Layers size={19} aria-hidden="true" />
          </span>
          Tampilan Liquid Glass
        </h2>
        <output
          htmlFor="glass-transparency"
          className="pill"
          aria-live="polite"
        >
          {value}%
        </output>
      </div>
      <label htmlFor="glass-transparency">Tingkat transparansi</label>
      <p id="glass-transparency-help" className="muted">
        Geser ke kanan untuk membuat kaca lebih transparan. Perubahan langsung
        terlihat di seluruh tampilan.
      </p>
      <input
        id="glass-transparency"
        type="range"
        min="0"
        max="100"
        step="1"
        value={value}
        aria-describedby="glass-transparency-help"
        aria-valuetext={`${value} persen transparan`}
        onInput={(e) => onChange(Number(e.currentTarget.value))}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="transparency-scale">
        <span>Lebih solid</span>
        <span>Lebih transparan</span>
      </div>
      <div className="appearance-presets">
        {[
          { value: 0, label: "Solid" },
          { value: 35, label: "Seimbang" },
          { value: 80, label: "Transparan" },
        ].map((p) => (
          <button
            type="button"
            key={p.value}
            className={value === p.value ? "selected" : ""}
            aria-pressed={value === p.value}
            onClick={() => onChange(p.value)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="appearance-bottom">
        <p className="muted" role={saveError ? "status" : undefined}>
          {saveError
            ? "Belum bisa disimpan di perangkat ini. Pilihan berlaku selama halaman terbuka."
            : "Tersimpan otomatis di perangkat ini. Teks dan ikon tetap jelas."}
        </p>
        <button
          type="button"
          className="text-button"
          onClick={() => onChange(DEFAULT_TRANSPARENCY)}
        >
          <RotateCcw size={14} aria-hidden="true" />
          Default
        </button>
      </div>
    </section>
  );
}
