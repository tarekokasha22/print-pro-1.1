// ─────────────────────────────────────────────────────────────────────────────
// Print Pro — minimal PPTX (OOXML) builder.
// LibreOffice cannot meaningfully convert a PDF to PowerPoint (it opens the PDF
// in Draw and the Impress export comes out empty). Instead we rasterise each
// PDF page to a PNG and assemble a real .pptx with one full-bleed image slide
// per page — exactly how "PDF to PowerPoint" services behave.
// ─────────────────────────────────────────────────────────────────────────────

import JSZip from "jszip";

const EMU_PER_PX = 9525; // 914400 EMU per inch / 96 px per inch

/** Read width/height from a PNG's IHDR chunk (big-endian uint32 at 16/20). */
function pngSize(buf: Buffer): { w: number; h: number } {
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

const RELS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PML = "http://schemas.openxmlformats.org/presentationml/2006/main";
const DML = "http://schemas.openxmlformats.org/drawingml/2006/main";

const contentTypes = (n: number) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="png" ContentType="image/png"/>
<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
<Override PartName="/ppt/presProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presProps+xml"/>
<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
${Array.from({ length: n }, (_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join("\n")}
</Types>`;

const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="${RELS}/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`;

const presentation = (n: number, cx: number, cy: number) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="${DML}" xmlns:r="${RELS}" xmlns:p="${PML}">
<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId${n + 1}"/></p:sldMasterIdLst>
<p:sldIdLst>
${Array.from({ length: n }, (_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 1}"/>`).join("\n")}
</p:sldIdLst>
<p:sldSz cx="${cx}" cy="${cy}"/>
<p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`;

const presentationRels = (n: number) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${Array.from({ length: n }, (_, i) => `<Relationship Id="rId${i + 1}" Type="${RELS}/slide" Target="slides/slide${i + 1}.xml"/>`).join("\n")}
<Relationship Id="rId${n + 1}" Type="${RELS}/slideMaster" Target="slideMasters/slideMaster1.xml"/>
<Relationship Id="rId${n + 2}" Type="${RELS}/presProps" Target="presProps.xml"/>
<Relationship Id="rId${n + 3}" Type="${RELS}/theme" Target="theme/theme1.xml"/>
</Relationships>`;

const presProps = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentationPr xmlns:a="${DML}" xmlns:r="${RELS}" xmlns:p="${PML}"/>`;

const slideMaster = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="${DML}" xmlns:r="${RELS}" xmlns:p="${PML}">
<p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg>
<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
</p:spTree></p:cSld>
<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
</p:sldMaster>`;

const slideMasterRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="${RELS}/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
<Relationship Id="rId2" Type="${RELS}/theme" Target="../theme/theme1.xml"/>
</Relationships>`;

const slideLayout = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="${DML}" xmlns:r="${RELS}" xmlns:p="${PML}" type="blank" preserve="1">
<p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>`;

const slideLayoutRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="${RELS}/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`;

const theme = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="${DML}" name="Office">
<a:themeElements>
<a:clrScheme name="Office">
<a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>
<a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
<a:dk2><a:srgbClr val="44546A"/></a:dk2><a:lt2><a:srgbClr val="E7E6E6"/></a:lt2>
<a:accent1><a:srgbClr val="4472C4"/></a:accent1><a:accent2><a:srgbClr val="ED7D31"/></a:accent2>
<a:accent3><a:srgbClr val="A5A5A5"/></a:accent3><a:accent4><a:srgbClr val="FFC000"/></a:accent4>
<a:accent5><a:srgbClr val="5B9BD5"/></a:accent5><a:accent6><a:srgbClr val="70AD47"/></a:accent6>
<a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink>
</a:clrScheme>
<a:fontScheme name="Office">
<a:majorFont><a:latin typeface="Calibri Light"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>
<a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont>
</a:fontScheme>
<a:fmtScheme name="Office">
<a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>
<a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>
<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>
<a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst>
</a:fmtScheme>
</a:themeElements>
</a:theme>`;

const slide = (cx: number, cy: number) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="${DML}" xmlns:r="${RELS}" xmlns:p="${PML}">
<p:cSld><p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
<p:pic>
<p:nvPicPr><p:cNvPr id="2" name="Page"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>
<p:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>
<p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>
</p:pic>
</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;

const slideRels = (i: number) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="${RELS}/image" Target="../media/image${i}.png"/>
<Relationship Id="rId2" Type="${RELS}/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`;

/** Build a .pptx (Buffer) with one full-page image slide per PNG. */
export async function imagesToPptx(images: Buffer[]): Promise<Buffer> {
  if (images.length === 0) throw new Error("no pages to build pptx");
  const n = images.length;
  const { w, h } = pngSize(images[0]);
  const cx = w * EMU_PER_PX;
  const cy = h * EMU_PER_PX;

  const zip = new JSZip();
  zip.file("[Content_Types].xml", contentTypes(n));
  zip.file("_rels/.rels", rootRels);
  zip.file("ppt/presentation.xml", presentation(n, cx, cy));
  zip.file("ppt/_rels/presentation.xml.rels", presentationRels(n));
  zip.file("ppt/presProps.xml", presProps);
  zip.file("ppt/theme/theme1.xml", theme);
  zip.file("ppt/slideMasters/slideMaster1.xml", slideMaster);
  zip.file("ppt/slideMasters/_rels/slideMaster1.xml.rels", slideMasterRels);
  zip.file("ppt/slideLayouts/slideLayout1.xml", slideLayout);
  zip.file("ppt/slideLayouts/_rels/slideLayout1.xml.rels", slideLayoutRels);

  images.forEach((img, idx) => {
    const i = idx + 1;
    zip.file(`ppt/slides/slide${i}.xml`, slide(cx, cy));
    zip.file(`ppt/slides/_rels/slide${i}.xml.rels`, slideRels(i));
    zip.file(`ppt/media/image${i}.png`, img);
  });

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
