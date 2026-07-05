"use client";

import { Sun, Contrast, Palette, RotateCcw, Droplet, Wand2 } from "lucide-react";

export interface EnhanceSettings {
  brightness: number;
  contrast: number;
  saturate: number;
  grayscale: boolean;
  sharpen: boolean;
  invert: boolean;
  sepia: boolean;
  smartWhiten: boolean; // ← تبييض ذكي
}

const defaultSettings: EnhanceSettings = {
  brightness: 100,
  contrast:   100,
  saturate:   100,
  grayscale:  false,
  sharpen:    false,
  invert:     false,
  sepia:      false,
  smartWhiten: false,
};

/**
 * Shared CSS filter string — used by the live preview AND the PDF export.
 * "Smart Whitening" overrides the regular sliders with a document-optimised
 * high-contrast grayscale filter that produces very clean black-on-white text.
 */
function buildFilter(s: EnhanceSettings): string {
  if (s.smartWhiten) {
    // Live-preview approximation of the pixel-level whitening done on export.
    // Kept moderate so the preview stays legible (export uses lib/scan).
    const bri = Math.min(s.brightness + 18, 160);
    return [
      `brightness(${bri}%)`,
      `contrast(155%)`,
      `grayscale(100%)`,
      s.invert ? "invert(100%)" : "",
    ].filter(Boolean).join(" ");
  }
  return [
    `brightness(${s.brightness}%)`,
    `contrast(${s.contrast}%)`,
    `saturate(${s.sharpen ? Math.min(s.saturate + 20, 200) : s.saturate}%)`,
    s.grayscale ? "grayscale(100%)" : "",
    s.sepia     ? "sepia(70%)"     : "",
    s.invert    ? "invert(100%)"   : "",
  ].filter(Boolean).join(" ");
}

type Preset = { id: string; label: string; emoji: string; patch: Partial<EnhanceSettings> };
const PRESETS: Preset[] = [
  { id:"original", label:"أصلي",        emoji:"🖼️", patch:{ ...defaultSettings } },
  { id:"document", label:"مستند",       emoji:"📄", patch:{ grayscale:true, contrast:150, brightness:110, sepia:false, invert:false, saturate:100, smartWhiten:false } },
  { id:"bw",       label:"أبيض وأسود",  emoji:"⚫", patch:{ grayscale:true, contrast:200, brightness:105, sepia:false, invert:false, saturate:100, smartWhiten:false } },
  { id:"warm",     label:"دافئ",        emoji:"🟤", patch:{ sepia:true, grayscale:false, invert:false, contrast:110, brightness:105, saturate:100, smartWhiten:false } },
  { id:"vivid",    label:"زاهي",        emoji:"🌈", patch:{ saturate:160, contrast:120, brightness:105, grayscale:false, sepia:false, invert:false, smartWhiten:false } },
  { id:"invert",   label:"عكس",         emoji:"🔄", patch:{ invert:true, smartWhiten:false } },
];

interface Props {
  settings: EnhanceSettings;
  onSettingsChange: (s: EnhanceSettings) => void;
  disabled?: boolean;
}

export default function ImageEnhancer({ settings, onSettingsChange, disabled }: Props) {
  const update     = (key: keyof EnhanceSettings, value: number | boolean) =>
    onSettingsChange({ ...settings, [key]: value });
  const applyPreset = (p: Preset) =>
    onSettingsChange({ ...settings, ...p.patch });
  const reset = () => onSettingsChange(defaultSettings);

  return (
    <div className="rounded-2xl p-5 space-y-4"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-700 text-slate-200 flex items-center gap-2">
          <Palette className="w-4 h-4 text-gold-400" />
          تحسين الصورة
        </h3>
        <button onClick={reset} disabled={disabled}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40">
          <RotateCcw className="w-3 h-3" />إعادة تعيين
        </button>
      </div>

      {/* ── تبييض ذكي ── */}
      <button
        onClick={() => update("smartWhiten", !settings.smartWhiten)}
        disabled={disabled}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-700 transition-all duration-200 disabled:opacity-40"
        style={{
          background: settings.smartWhiten
            ? "linear-gradient(135deg,rgba(245,158,11,0.2),rgba(251,191,36,0.12))"
            : "rgba(255,255,255,0.04)",
          border: `1px solid ${settings.smartWhiten ? "rgba(245,158,11,0.45)" : "rgba(255,255,255,0.1)"}`,
          color: settings.smartWhiten ? "#F59E0B" : "#94a3b8",
          boxShadow: settings.smartWhiten ? "0 0 16px rgba(245,158,11,0.15)" : "none",
        }}
      >
        <Wand2 className={`w-4 h-4 ${settings.smartWhiten ? "text-gold-400" : "text-slate-500"}`} />
        <span>تبييض ذكي</span>
        <span className="mr-auto text-[10px] px-2 py-0.5 rounded-full"
          style={{
            background: settings.smartWhiten ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.06)",
            border: `1px solid ${settings.smartWhiten ? "rgba(245,158,11,0.35)" : "rgba(255,255,255,0.1)"}`,
          }}>
          {settings.smartWhiten ? "✓ مفعّل" : "اضغط لتفعيل"}
        </span>
      </button>

      {/* Filter presets */}
      <div>
        <p className="text-xs text-slate-500 mb-2">فلاتر جاهزة</p>
        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map((p) => (
            <button key={p.id} onClick={() => applyPreset(p)} disabled={disabled}
              className="flex flex-col items-center gap-1 py-2 rounded-xl text-[11px] font-600 text-slate-300 transition-all hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <span className="text-lg leading-none">{p.emoji}</span>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sliders — dimmed when smart-whiten is on */}
      <div className={settings.smartWhiten ? "opacity-40 pointer-events-none select-none" : ""}>
        <Slider icon={<Sun className="w-3.5 h-3.5 text-yellow-400"/>}
          label="السطوع" value={settings.brightness} min={50} max={200} accent="#F59E0B"
          onChange={(v) => update("brightness", v)} disabled={disabled} />
        <div className="mt-3">
          <Slider icon={<Contrast className="w-3.5 h-3.5 text-blue-400"/>}
            label="التباين" value={settings.contrast} min={50} max={300} accent="#3B82F6"
            onChange={(v) => update("contrast", v)} disabled={disabled} />
        </div>
        <div className="mt-3">
          <Slider icon={<Droplet className="w-3.5 h-3.5 text-emerald-400"/>}
            label="التشبع" value={settings.saturate} min={0} max={200} accent="#10B981"
            onChange={(v) => update("saturate", v)} disabled={disabled} />
        </div>

        {/* Toggles */}
        <div className="flex gap-2 flex-wrap mt-3">
          <ToggleChip active={settings.grayscale} onClick={() => update("grayscale", !settings.grayscale)} label="رمادي"       disabled={disabled} />
          <ToggleChip active={settings.sepia}     onClick={() => update("sepia",     !settings.sepia)}     label="بُني"        disabled={disabled} />
          <ToggleChip active={settings.invert}    onClick={() => update("invert",    !settings.invert)}    label="عكس الألوان" disabled={disabled} />
          <ToggleChip active={settings.sharpen}   onClick={() => update("sharpen",   !settings.sharpen)}   label="حدة"         disabled={disabled} />
        </div>
      </div>
    </div>
  );
}

function Slider({ icon, label, value, min, max, accent, onChange, disabled }: {
  icon: React.ReactNode; label: string; value: number; min: number; max: number;
  accent: string; onChange: (v: number) => void; disabled?: boolean;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs text-slate-400 flex items-center gap-1.5">{icon}{label}</label>
        <span className="text-xs text-gold-400 font-600">{value}%</span>
      </div>
      <input type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(+e.target.value)} disabled={disabled}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer disabled:opacity-40"
        style={{ background: `linear-gradient(to right, ${accent} ${pct}%, rgba(255,255,255,0.1) ${pct}%)` }}
      />
    </div>
  );
}

function ToggleChip({ active, onClick, label, disabled }: {
  active: boolean; onClick: () => void; label: string; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="px-3 py-1.5 rounded-lg text-xs font-600 transition-all duration-200 disabled:opacity-40"
      style={{
        background: active ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.05)",
        border: `1px solid ${active ? "rgba(245,158,11,0.4)" : "rgba(255,255,255,0.08)"}`,
        color: active ? "#F59E0B" : "#94a3b8",
      }}>
      {active ? "✓ " : ""}{label}
    </button>
  );
}

export { defaultSettings, buildFilter };
