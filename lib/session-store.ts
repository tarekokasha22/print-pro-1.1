// ─────────────────────────────────────────────────────────────────────────────
// Print Pro — in-memory session store.
// Module-level variables persist as long as the browser tab is open, surviving
// Next.js client-side navigations (page mount/unmount). Pages read on mount to
// restore their previous state and write on unmount to save it.
// ─────────────────────────────────────────────────────────────────────────────

/* ── AI Studio ──────────────────────────────────────────────────────────── */
export interface AISessionState {
  modeId: string;
  prompt: string;
  result: string;
  fileText: string;
  fileName: string;
  fileBuffer: ArrayBuffer | null;
}

let _ai: AISessionState = {
  modeId: "create",
  prompt: "",
  result: "",
  fileText: "",
  fileName: "",
  fileBuffer: null,
};

export const getAISession  = () => _ai;
export const setAISession  = (s: Partial<AISessionState>) => { _ai = { ..._ai, ...s }; };
export const clearAISession = () => {
  _ai = { modeId: "create", prompt: "", result: "", fileText: "", fileName: "", fileBuffer: null };
};

/* ── PDF Editor ─────────────────────────────────────────────────────────── */
export interface EditorSessionState {
  fileBuffer: ArrayBuffer | null;
  fileName: string;
  numPages: number;
  currentPage: number;
  pageDataJson: Record<number, unknown>;
}

let _editor: EditorSessionState = {
  fileBuffer: null,
  fileName: "",
  numPages: 0,
  currentPage: 1,
  pageDataJson: {},
};

export const getEditorSession  = () => _editor;
export const setEditorSession  = (s: Partial<EditorSessionState>) => { _editor = { ..._editor, ...s }; };
export const clearEditorSession = () => {
  _editor = { fileBuffer: null, fileName: "", numPages: 0, currentPage: 1, pageDataJson: {} };
};

/* ── Cover Designer ─────────────────────────────────────────────────────── */
export interface DesignerSessionState {
  canvasJson: unknown | null;
  bgColor: string;
  tab: string;
}

let _designer: DesignerSessionState = {
  canvasJson: null,
  bgColor: "#0A1628",
  tab: "templates",
};

export const getDesignerSession  = () => _designer;
export const setDesignerSession  = (s: Partial<DesignerSessionState>) => { _designer = { ..._designer, ...s }; };
export const clearDesignerSession = () => {
  _designer = { canvasJson: null, bgColor: "#0A1628", tab: "templates" };
};

/* ── Scanner ────────────────────────────────────────────────────────────── */
export interface StoredScanPage {
  id: string;
  name: string;
  dataUrl: string;
  isPdf?: boolean;
}

export interface ScannerSessionState {
  pages: StoredScanPage[];
  selectedIdx: number;
  settings: Record<string, unknown>;
}

let _scanner: ScannerSessionState = {
  pages: [],
  selectedIdx: 0,
  settings: {},
};

export const getScannerSession  = () => _scanner;
export const setScannerSession  = (s: Partial<ScannerSessionState>) => { _scanner = { ..._scanner, ...s }; };
export const clearScannerSession = () => {
  _scanner = { pages: [], selectedIdx: 0, settings: {} };
};
