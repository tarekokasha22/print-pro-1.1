"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, Plus, X, GripVertical, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ScannedPage {
  id: string;
  file: File;
  previewUrl: string;    // original object URL for images; blob URL for PDF
  renderedUrl?: string;  // canvas-rendered image URL for PDF pages
  name: string;
  isPdf?: boolean;
}

interface Props {
  pages: ScannedPage[];
  onPagesChange: (pages: ScannedPage[]) => void;
}

/** Render every page of a PDF file into JPEG data URLs via pdf.js */
async function pdfToImages(file: File): Promise<{ dataUrl: string; name: string }[]> {
  const { loadPdfjs } = await import("@/lib/pdf");
  const pdfjs = await loadPdfjs();
  const ab = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(ab) }).promise;
  const results: { dataUrl: string; name: string }[] = [];
  const MAX_PAGES = 30;
  for (let p = 1; p <= Math.min(doc.numPages, MAX_PAGES); p++) {
    const page = await doc.getPage(p);
    // Render at high resolution so the scanned output stays crisp (was 1.8).
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(3, Math.max(2.2, 2200 / base.width));
    const vp = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = vp.width;
    canvas.height = vp.height;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await (page.render as any)({ canvasContext: ctx, viewport: vp }).promise;
    results.push({ dataUrl: canvas.toDataURL("image/jpeg", 0.96), name: `${file.name} — صفحة ${p}` });
  }
  return results;
}

export default function ImageUploadZone({ pages, onPagesChange }: Props) {
  const [dragging, setDragging]     = useState(false);
  const [processing, setProcessing] = useState(false);
  const inputRef    = useRef<HTMLInputElement>(null);
  const dragPageRef = useRef<number | null>(null);

  const addFiles = useCallback(async (files: FileList | null) => {
    if (!files) return;
    const accepted = Array.from(files).filter(
      (f) => f.type.startsWith("image/") || f.type === "application/pdf"
    );
    if (!accepted.length) return;

    setProcessing(true);
    try {
      const newPages: ScannedPage[] = [];
      for (const f of accepted) {
        if (f.type.startsWith("image/")) {
          newPages.push({
            id: Math.random().toString(36).slice(2),
            file: f,
            previewUrl: URL.createObjectURL(f),
            name: f.name,
          });
        } else {
          // PDF → render every page as an image so filters & export work uniformly
          const rendered = await pdfToImages(f);
          for (const { dataUrl, name } of rendered) {
            newPages.push({
              id: Math.random().toString(36).slice(2),
              file: f,
              previewUrl: dataUrl,   // rendered canvas image — used everywhere
              renderedUrl: dataUrl,
              name,
              isPdf: true,
            });
          }
        }
      }
      onPagesChange([...pages, ...newPages]);
    } finally {
      setProcessing(false);
    }
  }, [pages, onPagesChange]);

  const removePage = (id: string) => {
    const page = pages.find((p) => p.id === id);
    if (page && !page.isPdf) URL.revokeObjectURL(page.previewUrl);
    onPagesChange(pages.filter((p) => p.id !== id));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files);
  };

  const handlePageDragStart = (idx: number) => { dragPageRef.current = idx; };
  const handlePageDragOver  = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    const from = dragPageRef.current;
    if (from === null || from === idx) return;
    const updated = [...pages];
    const [moved] = updated.splice(from, 1);
    updated.splice(idx, 0, moved);
    dragPageRef.current = idx;
    onPagesChange(updated);
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={cn("upload-zone p-8 text-center relative", dragging && "drag-over")}
        onDragEnter={() => setDragging(true)}
        onDragLeave={() => setDragging(false)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => !processing && inputRef.current?.click()}
      >
        <input
          ref={inputRef} type="file" className="hidden" multiple
          accept="image/*,application/pdf"
          onChange={(e) => addFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-3">
          {processing ? (
            <>
              <Loader2 className="w-8 h-8 text-gold-400 animate-spin" />
              <p className="text-sm text-slate-400">جاري معالجة الملفات…</p>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
                <Upload className="w-6 h-6 text-gold-400" />
              </div>
              <div>
                <p className="text-sm font-600 text-slate-200 mb-1">اسحب الصور أو اضغط للاختيار</p>
                <p className="text-xs text-slate-500">JPG · PNG · WebP · PDF (تُحوَّل تلقائياً لمعاينة فورية)</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Pages grid */}
      {pages.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-600 text-slate-300">
              {pages.length} {pages.length === 1 ? "صفحة" : "صفحات"}
            </p>
            <button
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1.5 text-sm text-gold-400 hover:text-gold-300 transition-colors"
            >
              <Plus className="w-4 h-4" />إضافة المزيد
            </button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {pages.map((page, idx) => (
              <div key={page.id} draggable
                onDragStart={() => handlePageDragStart(idx)}
                onDragOver={(e) => handlePageDragOver(e, idx)}
                className="relative group rounded-xl overflow-hidden cursor-grab active:cursor-grabbing"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <img src={page.previewUrl} alt={page.name} className="w-full aspect-[3/4] object-cover" />
                {page.isPdf && (
                  <div className="absolute top-1 right-1 px-1 py-0.5 rounded text-[8px] font-700 text-red-300"
                    style={{ background: "rgba(239,68,68,0.3)" }}>PDF</div>
                )}
                <div className="absolute inset-0 bg-navy-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <GripVertical className="w-5 h-5 text-white/60" />
                </div>
                <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-navy-900/80 flex items-center justify-center">
                  <span className="text-[10px] text-gold-400 font-700">{idx + 1}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removePage(page.id); }}
                  className="absolute top-1 left-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-600 mt-2">اسحب الصفحات لإعادة ترتيبها</p>
        </div>
      )}
    </div>
  );
}
