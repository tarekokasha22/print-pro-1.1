import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, unlink, mkdir, readdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

const execAsync = promisify(exec);

const LO_PATHS = [
  "/usr/bin/libreoffice",
  "/usr/local/bin/libreoffice",
  "/opt/libreoffice/bin/soffice",
  "libreoffice",
  "soffice",
];

async function findLO(): Promise<string> {
  for (const p of LO_PATHS) {
    try {
      await execAsync(`${p} --version`, { timeout: 8000 });
      return p;
    } catch {}
  }
  throw new Error("LibreOffice غير مثبت — يرجى تثبيته أولاً: sudo apt install libreoffice");
}

const FORMATS: Record<string, { loFmt: string; ext: string; mime: string; infilter?: string }> = {
  docx: { loFmt: "docx:MS Word 2007 XML",  ext: "docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  pptx: { loFmt: "pptx:Impress MS PowerPoint 2007 XML", ext: "pptx", mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation" },
  xlsx: { loFmt: "xlsx:Calc MS Excel 2007 XML", ext: "xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  pdf:  { loFmt: "pdf:writer_pdf_Export",  ext: "pdf",  mime: "application/pdf" },
  txt:  { loFmt: "txt:Text (encoded):UTF8", ext: "txt",  mime: "text/plain" },
};

export async function POST(req: NextRequest) {
  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const tempDir = join(tmpdir(), `printpro-${uniqueId}`);
  const loProfile = join(tmpdir(), `lo-profile-${uniqueId}`);

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const targetFormat = formData.get("targetFormat") as string | null;

    if (!file || !targetFormat) {
      return NextResponse.json({ error: "الملف والصيغة مطلوبان" }, { status: 400 });
    }

    const fmt = FORMATS[targetFormat.toLowerCase()];
    if (!fmt) {
      return NextResponse.json({ error: `صيغة غير مدعومة: ${targetFormat}` }, { status: 400 });
    }

    await mkdir(tempDir, { recursive: true });
    await mkdir(loProfile, { recursive: true });

    // Use simple ASCII filename to avoid LO encoding issues
    const srcExt = (file.name.split(".").pop() || "bin").toLowerCase();
    const inputPath = join(tempDir, `input.${srcExt}`);
    const outputPath = join(tempDir, `input.${fmt.ext}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(inputPath, buffer);

    let outputBuf: Buffer;

    // ── PDF → TXT: LibreOffice loses text in frames, use poppler's pdftotext ──
    if (srcExt === "pdf" && fmt.ext === "txt") {
      try {
        await execAsync(`pdftotext -enc UTF-8 -layout "${inputPath}" "${outputPath}"`, { timeout: 60_000 });
      } catch (e: any) {
        return NextResponse.json({ error: `فشل استخراج النص من PDF: ${e.message.slice(0, 160)}` }, { status: 500 });
      }
      try {
        outputBuf = await readFile(outputPath);
      } catch {
        return NextResponse.json({ error: "لم يُنشأ الملف النصي" }, { status: 500 });
      }
    } else if (srcExt === "pdf" && fmt.ext === "pptx") {
      // ── PDF → PPTX: LibreOffice's Draw→Impress export comes out empty.
      // Rasterise each page to PNG (poppler) and build a real deck instead. ──
      const prefix = join(tempDir, "page");
      try {
        await execAsync(`pdftoppm -png -r 150 "${inputPath}" "${prefix}"`, { timeout: 120_000 });
      } catch (e: any) {
        return NextResponse.json({ error: `فشل تحويل صفحات PDF: ${e.message.slice(0, 160)}` }, { status: 500 });
      }
      const pngs = (await readdir(tempDir))
        .filter(f => f.startsWith("page") && f.endsWith(".png"))
        .sort((a, b) => {
          const na = parseInt(a.match(/(\d+)\.png$/)?.[1] || "0", 10);
          const nb = parseInt(b.match(/(\d+)\.png$/)?.[1] || "0", 10);
          return na - nb;
        });
      if (pngs.length === 0) {
        return NextResponse.json({ error: "تعذّر استخراج صفحات من ملف PDF" }, { status: 500 });
      }
      const imgs = await Promise.all(pngs.map(f => readFile(join(tempDir, f))));
      const { imagesToPptx } = await import("@/lib/pptx");
      outputBuf = await imagesToPptx(imgs);
    } else {
      const lo = await findLO();

      // PDF must be force-opened in Writer to export to docx (default opens in Draw).
      // For pptx/pdf the default Draw/Impress import path works correctly.
      const needsWriterImport = srcExt === "pdf" && (fmt.ext === "docx");
      const infilter = needsWriterImport ? ['--infilter="writer_pdf_import"'] : [];

      // Use unique user profile to avoid lock file collisions between concurrent requests
      const cmd = [
        lo,
        "--headless",
        "--norestore",
        "--nofirststartwizard",
        ...infilter,
        `-env:UserInstallation=file://${loProfile}`,
        "--convert-to", `"${fmt.loFmt}"`,
        "--outdir", `"${tempDir}"`,
        `"${inputPath}"`,
      ].join(" ");

      try {
        const { stderr } = await execAsync(cmd, {
          timeout: 120_000,
          env: { ...process.env, HOME: loProfile, DISPLAY: "" },
        });
        if (stderr && !stderr.includes("Warning")) {
          console.error("LO stderr:", stderr);
        }
      } catch (e: any) {
        console.error("LibreOffice exec error:", e.message);
        return NextResponse.json({ error: `فشل التحويل: ${e.message.slice(0, 200)}` }, { status: 500 });
      }

      // Find converted file
      const files = await readdir(tempDir);
      const output = files.find(f => f !== `input.${srcExt}` && f.endsWith(`.${fmt.ext}`));

      if (!output) {
        const allFiles = files.filter(f => !f.startsWith(".")).join(", ") || "(empty)";
        return NextResponse.json(
          { error: `تعذّر تحويل هذا الملف. قد يكون محمياً أو تالفاً. (${allFiles})` },
          { status: 500 }
        );
      }

      outputBuf = await readFile(join(tempDir, output));
    }

    const downloadName = `${file.name.replace(/\.[^.]+$/, "")}.${fmt.ext}`;

    // Cleanup in background
    rm(tempDir, { recursive: true, force: true }).catch(() => {});
    rm(loProfile, { recursive: true, force: true }).catch(() => {});

    return new NextResponse(outputBuf.buffer as ArrayBuffer, {
      headers: {
        "Content-Type": fmt.mime,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
      },
    });
  } catch (e: any) {
    rm(tempDir, { recursive: true, force: true }).catch(() => {});
    rm(loProfile, { recursive: true, force: true }).catch(() => {});
    console.error("Convert route error:", e);
    return NextResponse.json({ error: e.message || "خطأ داخلي" }, { status: 500 });
  }
}
