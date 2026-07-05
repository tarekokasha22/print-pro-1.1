// ─────────────────────────────────────────────────────────────────────────────
// Print Pro — document scan enhancement (CamScanner-style).
// Pixel-level processing for crisp, clean export. The "smart whiten" mode
// removes uneven lighting / shadows by normalising each pixel against a locally
// blurred background estimate, then applies a contrast curve — this is what
// makes scanned paper look flat-white with sharp black text.
// ─────────────────────────────────────────────────────────────────────────────

export interface ScanProc {
  grayscale: boolean;
  contrast: number;   // percent, 100 = unchanged
  brightness: number; // percent, 100 = unchanged
  sepia: boolean;
  invert: boolean;
  smartWhiten: boolean;
}

/** Fast separable box blur on a single-channel buffer (sliding window, O(n)). */
function boxBlur(src: Float32Array, w: number, h: number, radius: number): Float32Array {
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  const win = radius * 2 + 1;
  // horizontal pass
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let sum = 0;
    for (let x = -radius; x <= radius; x++) sum += src[row + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = sum / win;
      const add = src[row + Math.min(w - 1, x + radius + 1)];
      const sub = src[row + Math.max(0, x - radius)];
      sum += add - sub;
    }
  }
  // vertical pass
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = -radius; y <= radius; y++) sum += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum / win;
      const add = tmp[Math.min(h - 1, y + radius + 1) * w + x];
      const sub = tmp[Math.max(0, y - radius) * w + x];
      sum += add - sub;
    }
  }
  return out;
}

const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

/** Draw an image/canvas to a fresh canvas with enhancement applied per-pixel. */
export function enhanceToCanvas(
  src: HTMLImageElement | HTMLCanvasElement,
  s: ScanProc,
): HTMLCanvasElement {
  const w = (src as HTMLImageElement).naturalWidth || src.width;
  const h = (src as HTMLImageElement).naturalHeight || src.height;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(src, 0, 0, w, h);

  const noop = !s.smartWhiten && !s.grayscale && !s.sepia && !s.invert &&
    s.contrast === 100 && s.brightness === 100;
  if (noop) return canvas;

  const id = ctx.getImageData(0, 0, w, h);
  const d = id.data;
  const n = w * h;

  if (s.smartWhiten) {
    // Shadow/illumination removal: estimate the local paper brightness with a
    // wide blur, then express every pixel as a *ratio* of its background. Paper
    // sits near 1.0 (→ white); ink sits well below (→ stays dark). A gentle
    // levels stretch finishes the job WITHOUT the old aggressive curve that used
    // to blow mid-grey text out to pure white and make pages unreadable.
    const gray = new Float32Array(n);
    for (let i = 0, p = 0; p < n; i += 4, p++) {
      gray[p] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    }
    // Wider window → background dominated by paper, so text is never eaten.
    // Wider blur window → background estimate dominated by paper, not text.
    const radius = Math.max(14, Math.round(Math.max(w, h) / 12));
    const bg = boxBlur(gray, w, h, radius);
    const briF = s.brightness / 100;
    const con = Math.max(0.5, s.contrast / 100);

    // White point  : pixels at ≥ this fraction of local background → pure white
    //               (0.88 is safer than 0.93 — leaves a wider zone for faint marks)
    // Black point  : pixels at ≤ this fraction → solid ink
    //               Decreasing with higher contrast deepens the ink without losing text.
    const whitePt = 0.88;
    const blackPt = Math.max(0.14, Math.min(0.65, 0.40 / con));
    const span    = whitePt - blackPt;

    for (let i = 0, p = 0; p < n; i += 4, p++) {
      const base  = bg[p] > 1 ? bg[p] : 1;
      const ratio = gray[p] / base;
      let t = (ratio - blackPt) / span;   // linear levels stretch
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      // Gamma < 1 darkens midtones: thin pencil lines / faint stamps stay visible
      // while paper (t≈1) stays pure white.
      t = Math.pow(t, 0.82);
      const v = clamp(t * 255 * briF);
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    if (s.invert) for (let i = 0; i < d.length; i += 4) { d[i] = 255 - d[i]; d[i+1] = 255 - d[i+1]; d[i+2] = 255 - d[i+2]; }
    ctx.putImageData(id, 0, 0);
    return canvas;
  }

  const briF = s.brightness / 100;
  const conF = s.contrast / 100;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];
    if (s.grayscale) { const y = 0.299 * r + 0.587 * g + 0.114 * b; r = g = b = y; }
    if (s.sepia) {
      const nr = r * 0.393 + g * 0.769 + b * 0.189;
      const ng = r * 0.349 + g * 0.686 + b * 0.168;
      const nb = r * 0.272 + g * 0.534 + b * 0.131;
      r = nr; g = ng; b = nb;
    }
    r = ((r / 255 - 0.5) * conF + 0.5) * 255 * briF;
    g = ((g / 255 - 0.5) * conF + 0.5) * 255 * briF;
    b = ((b / 255 - 0.5) * conF + 0.5) * 255 * briF;
    if (s.invert) { r = 255 - r; g = 255 - g; b = 255 - b; }
    d[i] = clamp(r); d[i + 1] = clamp(g); d[i + 2] = clamp(b);
  }
  ctx.putImageData(id, 0, 0);
  return canvas;
}
