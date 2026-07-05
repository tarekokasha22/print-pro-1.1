"use client";

import { useState } from "react";
import { ScanText, Copy, Download, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { ScannedPage } from "./ImageUploadZone";
import { addFile, bumpUsage } from "@/lib/store";

interface Props {
  pages: ScannedPage[];
  selectedIdx: number;
}

type Lang = "ara+eng" | "ara" | "eng";

export default function ScannerOCR({ pages, selectedIdx }: Props) {
  const [lang, setLang] = useState<Lang>("ara+eng");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const page = pages[selectedIdx];

  const runOcr = async () => {
    if (!page) return;
    setRunning(true);
    setProgress(0);
    setText("");
    setError("");
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker(lang, 1, {
        logger: (m: any) => {
          if (m.status === "recognizing text") setProgress(Math.round(m.progress * 100));
        },
      });
      const { data } = await worker.recognize(page.previewUrl);
      await worker.terminate();
      const out = (data.text || "").trim();
      setText(out);
      bumpUsage({ operations: 1 });
      if (!out) setError("لم يتم العثور على نص واضح في الصورة.");
    } catch (e) {
      console.error("OCR error:", e);
      setError("تعذّر استخراج النص. حاول مع صورة أوضح.");
    } finally {
      setRunning(false);
    }
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  const downloadTxt = () => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const name = `نص-مستخرج-${Date.now().toString(36)}.txt`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    // Save to "ملفاتي"
    const reader = new FileReader();
    reader.onload = () =>
      addFile({ name, type: "other", size: blob.size, dataUrl: reader.result as string, source: "scanner-ocr" });
    reader.readAsDataURL(blob);
  };

  const langs: { id: Lang; label: string }[] = [
    { id: "ara+eng", label: "عربي + إنجليزي" },
    { id: "ara", label: "عربي" },
    { id: "eng", label: "إنجليزي" },
  ];

  return (
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <h3 className="text-sm font-700 text-slate-200 flex items-center gap-2">
        <ScanText className="w-4 h-4 text-electric-400" />
        استخراج النص (OCR)
      </h3>

      <p className="text-xs text-slate-500">
        استخرج النص من الصفحة المعروضة حالياً ({pages.length ? selectedIdx + 1 : 0}/{pages.length}).
      </p>

      {/* Language */}
      <div className="flex gap-1.5">
        {langs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setLang(id)}
            disabled={running}
            className="flex-1 px-2 py-1.5 rounded-lg text-xs font-600 transition-all disabled:opacity-50"
            style={{
              background: lang === id ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${lang === id ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.08)"}`,
              color: lang === id ? "#60a5fa" : "#94a3b8",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Progress */}
      {running && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              جاري القراءة…
            </span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
      )}

      {/* Result */}
      {text && (
        <div className="space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            dir="auto"
            className="input-glass text-sm leading-relaxed resize-y w-full"
          />
          <div className="flex gap-2">
            <Button variant="glass" size="sm" className="flex-1" onClick={copyText}>
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? "تم النسخ" : "نسخ"}
            </Button>
            <Button variant="glass" size="sm" className="flex-1" onClick={downloadTxt}>
              <Download className="w-4 h-4" />
              تنزيل نص
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-amber-400">{error}</p>}

      <Button
        variant="gold"
        size="lg"
        className="w-full"
        onClick={runOcr}
        loading={running}
        disabled={!page || running}
      >
        <ScanText className="w-4 h-4" />
        {running ? "جاري الاستخراج…" : "استخراج النص"}
      </Button>
    </div>
  );
}
