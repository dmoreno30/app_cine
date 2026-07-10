import fs from "fs";
import {
  Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
  BorderStyle, ImageRun, Header, Footer, PageNumber,
  HorizontalPositionRelativeFrom, VerticalPositionRelativeFrom, TextWrappingType
} from "docx";

// ---------- Paleta extraída del theme1.xml / styles.xml del iCINE de referencia ----------
export const COLOR = {
  red: "E30D29",       // accent1 — marca principal
  redDark: "A9091E",   // accent1 sombreado — usado en el título de portada
  redDarker: "700614", // usado en encabezados de tercer nivel
  gray: "757070",       // dk1
  grayLight: "D8D8D8",  // accent4 — banners de segundo nivel
  blue: "056AA1",       // accent6 — etiquetas y bordes de sub-secciones
  blueLight: "EBF4FB",  // fondo de las cajas de sub-sección
  tableHeaderFill: "F2F2F2",
  tableBorder: "CCCCCC",
  warnFill: "FFF3CD",
  warnBorder: "856404",
  white: "FFFFFF"
};
export const FONT = "Arial";

const headerImg = fs.readFileSync(new URL("./assets/header-banner.png", import.meta.url));
const footerImg = fs.readFileSync(new URL("./assets/footer-banner.png", import.meta.url));

// ---------- Header / Footer reales del iCINE (mismas imágenes, misma posición flotante) ----------
export function buildHeader() {
  return new Header({
    children: [new Paragraph({
      children: [new ImageRun({
        type: "png",
        data: headerImg,
        transformation: { width: 799, height: 146 },
        floating: {
          horizontalPosition: { relative: HorizontalPositionRelativeFrom.COLUMN, offset: -683895 },
          verticalPosition: { relative: VerticalPositionRelativeFrom.PARAGRAPH, offset: -1077595 },
          behindDocument: true,
          allowOverlap: true,
          wrap: { type: TextWrappingType.NONE }
        }
      })]
    })]
  });
}

export function buildFooter() {
  return new Footer({
    children: [new Paragraph({
      children: [
        new ImageRun({
          type: "png",
          data: footerImg,
          transformation: { width: 796, height: 149 },
          floating: {
            horizontalPosition: { relative: HorizontalPositionRelativeFrom.COLUMN, offset: -683895 },
            verticalPosition: { relative: VerticalPositionRelativeFrom.PARAGRAPH, offset: 156845 },
            behindDocument: true,
            allowOverlap: true,
            wrap: { type: TextWrappingType.NONE }
          }
        }),
        new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 22 }),
        new TextRun({ text: " / ", font: FONT, size: 22 }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 22 })
      ]
    })]
  });
}

// Márgenes exactos del documento de referencia (en twips / dxa)
export const PAGE_MARGINS = { top: 1758, bottom: 2325, left: 1077, right: 1077, header: 1701, footer: 2268 };

// ---------- Helpers de contenido ----------

// Barra roja de sección de primer nivel — así se ven "1. ANTECEDENTES", "2. NECESIDADES...", etc.
export function seccionH1(numero, texto) {
  return new Paragraph({
    shading: { type: ShadingType.CLEAR, fill: COLOR.red },
    spacing: { before: 200, after: 200 },
    indent: { left: 288 },
    children: [new TextRun({ text: numero ? `${numero}.  ${texto}` : texto, bold: true, color: COLOR.white, size: 26, font: FONT })]
  });
}

// Barra gris de sub-sección (nivel NE) — subordinada a la roja
export function seccionH2(texto) {
  return new Paragraph({
    shading: { type: ShadingType.CLEAR, fill: COLOR.grayLight },
    spacing: { before: 160, after: 160 },
    indent: { left: 288 },
    children: [new TextRun({ text: texto, bold: true, color: COLOR.redDark, size: 24, font: FONT })]
  });
}

// Etiqueta de sub-apartado con borde azul a la izquierda — "▸ ¿Qué se va a implementar?"
export function etiqueta(texto) {
  return new Paragraph({
    shading: { type: ShadingType.CLEAR, fill: COLOR.blueLight },
    border: { left: { style: BorderStyle.SINGLE, size: 14, color: COLOR.blue, space: 4 } },
    spacing: { before: 160, after: 80 },
    indent: { left: 100 },
    children: [new TextRun({ text: `▸  ${texto}`, bold: true, color: COLOR.blue, size: 22, font: FONT })]
  });
}

export function parrafo(texto, opts = {}) {
  return new Paragraph({
    spacing: { after: 150 },
    children: [new TextRun({ text: texto, bold: !!opts.bold, font: FONT, size: 22 })]
  });
}

export function subtitulo(texto) {
  return new Paragraph({
    spacing: { before: 100, after: 80 },
    children: [new TextRun({ text: texto, bold: true, font: FONT, size: 22 })]
  });
}

// Caja amarilla de aviso — mismo estilo que ya usan para notas importantes
export function aviso(texto) {
  return new Paragraph({
    border: {
      top: { style: BorderStyle.SINGLE, size: 4, color: COLOR.warnBorder },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR.warnBorder },
      left: { style: BorderStyle.SINGLE, size: 4, color: COLOR.warnBorder },
      right: { style: BorderStyle.SINGLE, size: 4, color: COLOR.warnBorder }
    },
    shading: { type: ShadingType.CLEAR, fill: COLOR.warnFill },
    spacing: { before: 120, after: 120 },
    children: [new TextRun({ text: texto, bold: true, color: COLOR.warnBorder, font: FONT, size: 20 })]
  });
}

export function bullets(items) {
  return items.map((t) => new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text: t, font: FONT, size: 22 })]
  }));
}

function celda(texto, opts = {}) {
  return new TableCell({
    width: { size: opts.width || 2000, type: WidthType.DXA },
    shading: opts.header ? { type: ShadingType.CLEAR, fill: COLOR.tableHeaderFill } : undefined,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: COLOR.tableBorder },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: COLOR.tableBorder },
      left: { style: BorderStyle.SINGLE, size: 2, color: COLOR.tableBorder },
      right: { style: BorderStyle.SINGLE, size: 2, color: COLOR.tableBorder }
    },
    children: [new Paragraph({
      children: [new TextRun({ text: String(texto), bold: !!opts.header, color: opts.header ? COLOR.blue : undefined, font: FONT, size: 20 })]
    })]
  });
}

export function tabla(headers, rows, colWidths) {
  const widths = colWidths || headers.map(() => Math.floor(9000 / headers.length));
  return new Table({
    width: { size: 9000, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({ children: headers.map((hd, i) => celda(hd, { header: true, width: widths[i] })) }),
      ...rows.map((r) => new TableRow({ children: r.map((v, i) => celda(v, { width: widths[i] })) }))
    ]
  });
}
