import 'server-only'

/**
 * Minimal, dependency-free PDF renderer for the lease "Download PDF" action
 * (docs/en/pages/19-landlord.md §3.4). Per the task brief ("a straightforward
 * server-rendered HTML→PDF or print-friendly view is an acceptable MVP
 * implementation — do not pull in a heavy new PDF pipeline"), this writes a
 * single-font, text-only, multi-page PDF directly using the PDF file format
 * rather than adding a PDF-generation dependency.
 *
 * Known MVP limitation: the base-14 Helvetica font only encodes WinAnsi/
 * Latin-1 text, so non-Latin lease content (e.g. Armenian/Cyrillic template
 * bodies) renders as '?' — acceptable for the single English template this
 * task ships (see the migration's seed row); revisit with a Unicode-
 * embedding PDF library if/when hy/ru templates are added.
 */

const PAGE_WIDTH = 595.28 // A4, points
const PAGE_HEIGHT = 841.89
const MARGIN = 50
const FONT_SIZE = 10
const LINE_HEIGHT = 14
const MAX_LINES_PER_PAGE = Math.floor((PAGE_HEIGHT - 2 * MARGIN) / LINE_HEIGHT)

/** Escapes a line of text for use inside a PDF literal string `(...)`, dropping non-Latin-1 code points. */
function escapePdfText(text: string): string {
  let out = ''
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 63
    out += code > 255 ? '?' : ch
  }
  return out.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

/**
 * Renders a flat list of text lines as a paginated PDF (Buffer of the raw
 * file bytes, ready to stream with `Content-Type: application/pdf`).
 */
export function renderTextPdf(lines: string[]): Buffer {
  const pages = chunk(lines.length > 0 ? lines : [' '], MAX_LINES_PER_PAGE)
  const numPages = pages.length

  // Object numbering: 1 = Catalog, 2 = Pages, then a (Page, Contents) pair
  // per page, then the shared Font object last.
  const fontObjNum = 3 + numPages * 2
  const pageObjNums = pages.map((_, i) => 3 + i * 2)
  const contentObjNums = pages.map((_, i) => 4 + i * 2)

  const objects: string[] = []
  objects[1] = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`
  objects[2] = `2 0 obj\n<< /Type /Pages /Kids [${pageObjNums
    .map((n) => `${n} 0 R`)
    .join(' ')}] /Count ${numPages} >>\nendobj\n`

  pages.forEach((pageLines, i) => {
    const pageObjNum = pageObjNums[i]
    const contentObjNum = contentObjNums[i]

    let stream = `BT\n/F1 ${FONT_SIZE} Tf\n${MARGIN} ${PAGE_HEIGHT - MARGIN} Td\n`
    pageLines.forEach((line, idx) => {
      if (idx > 0) stream += `0 -${LINE_HEIGHT} Td\n`
      stream += `(${escapePdfText(line)}) Tj\n`
    })
    stream += `ET\n`

    objects[pageObjNum] =
      `${pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
      `/Resources << /Font << /F1 ${fontObjNum} 0 R >> >> /Contents ${contentObjNum} 0 R >>\nendobj\n`
    objects[contentObjNum] =
      `${contentObjNum} 0 obj\n<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}endstream\nendobj\n`
  })

  objects[fontObjNum] = `${fontObjNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`

  const totalObjects = fontObjNum
  let body = '%PDF-1.4\n'
  const offsets: number[] = new Array(totalObjects + 1).fill(0)

  for (let n = 1; n <= totalObjects; n++) {
    offsets[n] = Buffer.byteLength(body, 'latin1')
    body += objects[n]
  }

  const xrefOffset = Buffer.byteLength(body, 'latin1')
  let xref = `xref\n0 ${totalObjects + 1}\n0000000000 65535 f \n`
  for (let n = 1; n <= totalObjects; n++) {
    xref += `${offsets[n].toString().padStart(10, '0')} 00000 n \n`
  }

  const trailer = `trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return Buffer.from(body + xref + trailer, 'latin1')
}
