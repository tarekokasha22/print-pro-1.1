"use client";

import { useSyncExternalStore } from "react";
import { FileStack, Layers, Wrench, HardDrive, BarChart3 } from "lucide-react";
import {
  subscribe, getFiles, getUsage, usageByDay,
  type StoredFile, type Usage,
} from "@/lib/store";
import { formatFileSize } from "@/lib/utils";

const TYPE_META: Record<string, { label: string; color: string }> = {
  pdf:   { label: "PDF",        color: "#EF4444" },
  image: { label: "صور",        color: "#10B981" },
  docx:  { label: "Word",       color: "#3B82F6" },
  pptx:  { label: "PowerPoint", color: "#F97316" },
  xlsx:  { label: "Excel",      color: "#22C55E" },
  other: { label: "أخرى",       color: "#64748B" },
};

export default function StatsPanel() {
  const files = useSyncExternalStore<StoredFile[]>(subscribe, getFiles, () => [] as StoredFile[]);
  const usage = useSyncExternalStore<Usage>(subscribe, getUsage, () => ({
    filesCreated: 0, pagesProcessed: 0, operations: 0, byDay: {},
  }));

  const days = usageByDay(7);
  const maxDay = Math.max(1, ...days.map((d) => d.count));
  const totalSize = files.reduce((s, f) => s + f.size, 0);

  // file-type breakdown
  const counts: Record<string, number> = {};
  files.forEach((f) => { counts[f.type] = (counts[f.type] ?? 0) + 1; });
  const breakdown = Object.entries(counts)
    .map(([type, n]) => ({ type, n, ...((TYPE_META[type]) || TYPE_META.other) }))
    .sort((a, b) => b.n - a.n);

  const stats = [
    { label: "إجمالي الملفات", value: files.length.toString(), icon: FileStack, color: "#F59E0B" },
    { label: "صفحات معالَجة", value: usage.pagesProcessed.toString(), icon: Layers, color: "#3B82F6" },
    { label: "عمليات منفّذة", value: usage.operations.toString(), icon: Wrench, color: "#8B5CF6" },
    { label: "المساحة المستخدمة", value: formatFileSize(totalSize), icon: HardDrive, color: "#10B981" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-800 text-slate-100 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-gold-400" />
          لوحة الإحصائيات
        </h2>
        <span className="text-xs text-slate-600">نشاطك على المنصة</span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
            </div>
            <p className="text-2xl font-900 text-slate-100">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 7-day activity chart */}
        <div className="lg:col-span-2 glass-card p-5">
          <p className="text-sm font-700 text-slate-200 mb-4">النشاط خلال 7 أيام</p>
          <div className="flex items-end justify-between gap-2 h-40">
            {days.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <span className="text-[10px] text-slate-500 font-600">{d.count || ""}</span>
                <div
                  className="w-full rounded-lg transition-all duration-500"
                  style={{
                    height: `${Math.max(4, (d.count / maxDay) * 100)}%`,
                    background: d.count
                      ? "linear-gradient(to top, #D97706, #F59E0B)"
                      : "rgba(255,255,255,0.05)",
                  }}
                />
                <span className="text-[10px] text-slate-600">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* File-type breakdown */}
        <div className="glass-card p-5">
          <p className="text-sm font-700 text-slate-200 mb-4">توزيع الملفات</p>
          {breakdown.length === 0 ? (
            <p className="text-xs text-slate-600 py-8 text-center">لا توجد ملفات بعد</p>
          ) : (
            <div className="space-y-3">
              {breakdown.map(({ type, n, label, color }) => {
                const pct = Math.round((n / files.length) * 100);
                return (
                  <div key={type}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">{label}</span>
                      <span className="text-slate-500 font-600">{n} ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
