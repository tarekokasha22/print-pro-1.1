// ────────────────────────────────────────────────────────────────────────────
// Print Pro — shared client-side store (localStorage).
// Holds the user's files ("ملفاتي") and usage statistics for the dashboard.
// All data is per-browser; there is no backend. Components subscribe via
// `subscribe()` and are notified whenever the store changes (cross-tab too).
// ────────────────────────────────────────────────────────────────────────────

export type FileKind = "pdf" | "image" | "docx" | "pptx" | "xlsx" | "other";

export interface StoredFile {
  id: string;
  name: string;
  type: FileKind;
  size: number;
  createdAt: string;       // ISO
  dataUrl?: string;        // base64 data URL for download (omitted if too large)
  source?: string;         // scanner | converter | editor | designer | upload
}

export interface Usage {
  filesCreated: number;    // total files ever added
  pagesProcessed: number;  // pages scanned / converted / edited
  operations: number;      // tool runs (merge, split, compress, ocr, …)
  byDay: Record<string, number>; // ISO date (YYYY-MM-DD) → operations that day
}

const FILES_KEY = "printpro_files";
const USAGE_KEY = "printpro_usage";
const EVENT = "printpro:store";

const isBrowser = () => typeof window !== "undefined";

/* ── helpers ─────────────────────────────────────────────────────────────── */

function write(key: string, value: unknown) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota exceeded — silently ignore so the app keeps working */
  }
  notify();
}

function trySet(key: string, value: string): boolean {
  if (!isBrowser()) return false;
  try { localStorage.setItem(key, value); return true; }
  catch { return false; }
}

/**
 * Persist the file list in a quota-resilient way. localStorage is only a few
 * MB, and base64 dataUrls fill it fast — a naive setItem throws QuotaExceeded
 * and the upload silently disappears. Here we degrade gracefully: if the full
 * payload doesn't fit, we drop dataUrls (oldest first) so the files still
 * appear in "ملفاتي" as metadata-only entries instead of vanishing.
 */
function writeFiles(files: StoredFile[]) {
  if (!isBrowser()) return;
  if (trySet(FILES_KEY, JSON.stringify(files))) { notify(); return; }
  const trimmed: StoredFile[] = files.map((f) => ({ ...f }));
  for (let i = trimmed.length - 1; i >= 0; i--) {
    if (trimmed[i].dataUrl) {
      delete trimmed[i].dataUrl;
      if (trySet(FILES_KEY, JSON.stringify(trimmed))) { notify(); return; }
    }
  }
  // Last resort: keep only the newest 60 entries' metadata.
  trySet(FILES_KEY, JSON.stringify(trimmed.slice(0, 60)));
  notify();
}

function notify() {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(EVENT));
}

/** Subscribe to any store change. Returns an unsubscribe function. */
export function subscribe(cb: () => void): () => void {
  if (!isBrowser()) return () => {};
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler); // cross-tab
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function kindFromFile(name: string, mime = ""): FileKind {
  const n = name.toLowerCase();
  if (mime.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp|svg)$/.test(n)) return "image";
  if (mime === "application/pdf" || n.endsWith(".pdf")) return "pdf";
  if (n.endsWith(".docx") || n.endsWith(".doc")) return "docx";
  if (n.endsWith(".pptx") || n.endsWith(".ppt")) return "pptx";
  if (n.endsWith(".xlsx") || n.endsWith(".xls") || n.endsWith(".csv")) return "xlsx";
  return "other";
}

/* ── cached snapshots (required for useSyncExternalStore stability) ────────
   getFiles / getUsage must return the SAME reference until the underlying
   localStorage value actually changes, otherwise React re-renders forever. */
const EMPTY_FILES: StoredFile[] = [];
let filesRaw: string | null = null;
let filesCache: StoredFile[] = EMPTY_FILES;
let usageRaw: string | null = null;
let usageCache: Usage | null = null;

/* ── files ───────────────────────────────────────────────────────────────── */

export function getFiles(): StoredFile[] {
  if (!isBrowser()) return EMPTY_FILES;
  const raw = localStorage.getItem(FILES_KEY) ?? "";
  if (raw === filesRaw) return filesCache;
  filesRaw = raw;
  try { filesCache = raw ? (JSON.parse(raw) as StoredFile[]) : EMPTY_FILES; }
  catch { filesCache = EMPTY_FILES; }
  return filesCache;
}

/**
 * Add a file to "ملفاتي". Tries to keep the dataUrl for download; if the
 * payload is large (> ~3 MB) the dataUrl is dropped to protect the quota,
 * but the file still appears in the list with its metadata.
 */
export function addFile(input: {
  name: string;
  type?: FileKind;
  size?: number;
  dataUrl?: string;
  source?: string;
}): StoredFile {
  const dataUrl =
    input.dataUrl && input.dataUrl.length < 4_000_000 ? input.dataUrl : undefined;

  const file: StoredFile = {
    id: Math.random().toString(36).slice(2) + Date.now().toString(36),
    name: input.name,
    type: input.type ?? kindFromFile(input.name),
    size: input.size ?? (dataUrl ? Math.round(dataUrl.length * 0.75) : 0),
    createdAt: new Date().toISOString(),
    dataUrl,
    source: input.source,
  };

  const files = getFiles();
  writeFiles([file, ...files]);
  bumpUsage({ files: 1 });
  return file;
}

export function addFiles(inputs: Parameters<typeof addFile>[0][]): StoredFile[] {
  return inputs.map((i) => addFile(i));
}

export function deleteFile(id: string) {
  writeFiles(getFiles().filter((f) => f.id !== id));
}

export function clearFiles() {
  writeFiles([]);
}

/* ── usage ───────────────────────────────────────────────────────────────── */

const emptyUsage = (): Usage => ({
  filesCreated: 0,
  pagesProcessed: 0,
  operations: 0,
  byDay: {},
});

export function getUsage(): Usage {
  if (!isBrowser()) { usageCache = usageCache ?? emptyUsage(); return usageCache; }
  const raw = localStorage.getItem(USAGE_KEY) ?? "";
  if (raw === usageRaw && usageCache) return usageCache;
  usageRaw = raw;
  try { usageCache = { ...emptyUsage(), ...(raw ? (JSON.parse(raw) as Usage) : {}) }; }
  catch { usageCache = emptyUsage(); }
  return usageCache;
}

/** Increment usage counters. Each call also records one "operation" day-bucket. */
export function bumpUsage(delta: {
  files?: number;
  pages?: number;
  operations?: number;
}) {
  const u = getUsage();
  u.filesCreated += delta.files ?? 0;
  u.pagesProcessed += delta.pages ?? 0;
  const ops = delta.operations ?? 0;
  u.operations += ops;
  if (ops > 0) {
    const day = new Date().toISOString().slice(0, 10);
    u.byDay[day] = (u.byDay[day] ?? 0) + ops;
  }
  write(USAGE_KEY, u);
}

/** Operations over the last `n` days (oldest → newest), filling gaps with 0. */
export function usageByDay(n = 7): { date: string; label: string; count: number }[] {
  const u = getUsage();
  const out: { date: string; label: string; count: number }[] = [];
  const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    out.push({ date: iso, label: days[d.getDay()], count: u.byDay[iso] ?? 0 });
  }
  return out;
}
