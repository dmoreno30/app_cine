import {
  Document, Packer, Paragraph, TextRun, PageBreak,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle
} from "docx";
import {
  buildHeader, buildFooter, PAGE_MARGINS, COLOR, FONT, SPACING,
  seccionH1, seccionH2, etiqueta, parrafo, subtitulo, aviso, bullets, tabla, espaciador
} from "./brand.js";

/* =========================================================================
   Helpers de tabla enriquecidos (locales a build.js).
   No tocan brand.js: solo se apoyan en COLOR / FONT ya exportados.
   Permiten celdas multi-línea, bullets dentro de celda, sombreados y
   encabezados de color — necesarios para el formato del iCINE (etapas
   agrupadas, mapeo de 5 columnas, automatizaciones por disparador, banner).
   ========================================================================= */
const NONE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const BORDE = (c = COLOR.tableBorder) => ({
  top: { style: BorderStyle.SINGLE, size: 2, color: c },
  bottom: { style: BorderStyle.SINGLE, size: 2, color: c },
  left: { style: BorderStyle.SINGLE, size: 2, color: c },
  right: { style: BorderStyle.SINGLE, size: 2, color: c }
});

// Celda flexible. `val` puede ser string, array de líneas, o {b:true,t} para bullet.
function celdaX(val, opts = {}) {
  const lines = Array.isArray(val) ? val : [val];
  return new TableCell({
    width: { size: opts.width, type: WidthType.DXA },
    shading: opts.fill ? { type: ShadingType.CLEAR, fill: opts.fill }
      : (opts.header ? { type: ShadingType.CLEAR, fill: COLOR.tableHeaderFill }
        : (opts.group ? { type: ShadingType.CLEAR, fill: "FAFAFA" } : undefined)),
    margins: { top: 40, bottom: 40, left: 90, right: 90 },
    borders: BORDE(),
    children: lines.map((ln) => {
      const isBullet = typeof ln === "object" && ln.b;
      const text = isBullet ? ln.t : ln;
      return new Paragraph({
        ...(isBullet ? { bullet: { level: 0 } } : {}),
        spacing: { after: lines.length > 1 ? 40 : 0 },
        children: [new TextRun({
          text: String(text == null ? "" : text),
          bold: !!opts.header || !!opts.boldAll || (typeof ln === "object" && ln.bold),
          color: opts.header ? COLOR.tableHeaderText : (opts.whiteText ? COLOR.white : (opts.group ? COLOR.redDark : undefined)),
          font: FONT, size: opts.size || 20
        })]
      });
    })
  });
}

// Tabla genérica. headers: string[]; rows: (celda)[][]; widths: number[].
// opt.groupCol0 sombrea la 1ª columna (grupos de etapas).
function tablaX(headers, rows, widths, opt = {}) {
  return new Table({
    width: { size: 9000, type: WidthType.DXA }, columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: headers.map((h, i) => celdaX(h, { header: true, width: widths[i] })) }),
      ...rows.map((r) => new TableRow({
        children: r.map((v, i) => celdaX(v, { width: widths[i], group: opt.groupCol0 && i === 0 && v !== "" }))
      }))
    ]
  });
}

// Caja gris de encabezado de NE (dos celdas: "NE n" | título + subtítulo).
function cajaNE(nLabel, titulo, sub) {
  const cell = (txt, w) => new TableCell({
    width: { size: w, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: COLOR.neCajaFill },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: (Array.isArray(txt) ? txt : [txt]).map((t, i) =>
      new Paragraph({ children: [new TextRun({ text: t, bold: i === 0, color: COLOR.neCajaText, size: i === 0 ? 24 : 20, font: FONT })] }))
  });
  return new Table({
    width: { size: 9000, type: WidthType.DXA }, columnWidths: [1600, 7400],
    rows: [new TableRow({ children: [cell(nLabel, 1600), cell(sub ? [titulo, sub] : titulo, 7400)] })]
  });
}

// Barra de título de un sub-proceso.
function tituloSubproceso(txt) {
  return new Paragraph({
    shading: { type: ShadingType.CLEAR, fill: COLOR.blueLight },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: COLOR.redDark, space: 4 } },
    spacing: { before: 220, after: 100 }, indent: { left: 100 },
    children: [new TextRun({ text: txt, bold: true, color: COLOR.redDark, size: 22, font: FONT })]
  });
}

// Nota 💡 (caja amarilla) con una o varias líneas.
function notaTip(txt) {
  const lineas = Array.isArray(txt) ? txt : [txt];
  return new Paragraph({
    border: BORDE(COLOR.warnBorder), shading: { type: ShadingType.CLEAR, fill: COLOR.warnFill },
    spacing: { before: 120, after: 120 },
    children: lineas.map((l, i) => new TextRun({ text: l, bold: true, color: COLOR.warnBorder, font: FONT, size: 20, break: i > 0 ? 1 : 0 }))
  });
}

// Anchos reutilizables
const FLUJO_COLS = ["#", "Acción / Descripción", "Responsable", "Herramienta / Módulo", "Condición o Regla"];
const FLUJO_W = [500, 3100, 1800, 1800, 1800];
const MAPEO_COLS = ["Campo", "Tipo de dato", "Obligatorio", "Origen", "Observación"];
const MAPEO_W = [2100, 1500, 1300, 1400, 2700];

/* =========================================================================
   buildICINE — misma firma de siempre: recibe el JSON canónico y devuelve
   { buffer, nes, cliente }. La API (api/captura.js) no cambia.
   ========================================================================= */
export async function buildICINE(dataRaw) {

// ---------- normalización defensiva ----------
const data = {
  ...dataRaw,
  captacionDeClientes: {
    canales: [], otrosCanales: "", distribucion: "", paginawebUrl: "", tiendavirtualUrl: "",
    ...dataRaw.captacionDeClientes,
    chatbot: { necesita: false, descripcion: "", ...(dataRaw.captacionDeClientes || {}).chatbot }
  },
  reporteria: { prospectos: [], negociaciones: [], otros: "", ...dataRaw.reporteria },
  // metadatos opcionales de portada (si el formulario aún no los captura, quedan placeholders)
  meta: {
    url: "", licencia: "", consultor: "", jefeProyecto: "", version: "1.0", estado: "EN CREACIÓN",
    ...(dataRaw.meta || {})
  },
  // configurables por cliente (con defaults tomados de los iCINEs reales)
  firmantes: dataRaw.firmantes || ["Cliente", "Consultor Comercial", "Jefe de Proyecto", "Coordinador de Servicios y Productos", "Desarrollador"],
  incluirTerminos: dataRaw.incluirTerminos !== false
};

const ENTIDAD_LABELS = {
  prospectos: "Prospectos", negociaciones: "Negociaciones", contactos: "Contactos",
  companias: "Compañías", cotizaciones: "Cotizaciones", facturas: "Facturas", postventa: "Post-venta"
};
const REPORTE_LABELS = {
  origen: "Reporte por origen",
  por_responsable: "Reporte por responsable (progreso / descarte agrupado / éxito)",
  tasa_conversion: "Tasa de prospectos convertidos",
  ingreso_vs_conversion_dia: "Prospectos ingresados vs. convertidos en el mismo día",
  tasa_ganadas_pipeline: "Tasa de negociaciones ganadas por pipeline",
  creadas_vs_ganadas_dia: "Negociaciones creadas vs. ganadas en el mismo día",
  por_contacto: "Negociaciones por cada contacto",
  por_contacto_status: "Negociaciones por contacto y su status",
  tiempo_promedio: "Tiempo promedio de duración de una negociación"
};
const CANAL_LABELS = {
  facebook: "Facebook", instagram: "Instagram", formularios: "Formularios del CRM",
  whatsapp: "WhatsApp", telegram: "Telegram", chatvivo: "Chat en vivo",
  visitadirecta: "Visita directa", tiendavirtual: "Tienda virtual", paginaweb: "Página web",
  tiktok: "TikTok", linkedin: "LinkedIn"
};

const ROLES_PROCESO_COMERCIAL = [
  ["Acceso Completo CRM (SPA)", "Agregar, leer, editar y eliminar registros de cualquier entidad. Configurar el CRM.", "Para coordinadores de ventas. Único rol que puede configurar automatizaciones y etapas."],
  ["Acceso Denegado CRM", "Sin acceso a agregar, leer, editar ni eliminar registros. Solo puede ver el módulo.", "Para usuarios que no deben operar en el CRM pero sí tienen acceso a Bitrix24."],
  ["Supervisor de Departamento", "Agregar, leer, editar y eliminar registros propios y de sus subordinados. Sin configuración.", "Para jefes de equipo o gerentes comerciales."],
  ["Empleado (Asesor Comercial)", "Ver y editar solo registros propios. Sin eliminar. Solo importar (no exportar).", "Para asesores comerciales. El rol más restrictivo del equipo de ventas."]
];
const ROLES_REPORTERIA = [
  ["Acceso Completo / Supervisor", "Acceso a todos los reportes y vistas del CRM.", ""],
  ["Empleado (Asesor Comercial)", "Solo ve reportes específicos de su gestión.", ""]
];
const ROLES_CAPTACION = [
  ["Acceso Completo Contact Center", "Configurar canales, líneas de atención y reglas de distribución.", "Para el administrador del Contact Center."],
  ["Agente de Atención", "Recibir y responder las conversaciones que se le asignen.", "Para quien atiende los mensajes día a día."]
];

const REPORTES_META = {
  origen: { label: "Reporte por origen", queMuestra: "Cantidad de prospectos por canal de origen.", entidad: "Prospectos", filtros: "Fecha, canal, responsable.", tipoVisualizacion: "Barras" },
  por_responsable: { label: "Prospectos por responsable (progreso / descarte agrupado / éxito)", queMuestra: "Prospectos por responsable, agrupados en progreso / descarte / éxito.", entidad: "Prospectos", filtros: "Fecha, responsable.", tipoVisualizacion: "Tabla resumen" },
  tasa_conversion: { label: "Tasa de prospectos convertidos", queMuestra: "Porcentaje de prospectos que se convierten en negociación.", entidad: "Prospectos", filtros: "Fecha, canal, responsable.", tipoVisualizacion: "Indicador (KPI)" },
  ingreso_vs_conversion_dia: { label: "Prospectos ingresados vs. convertidos en el mismo día", queMuestra: "Prospectos ingresados vs. convertidos en el mismo día.", entidad: "Prospectos", filtros: "Fecha.", tipoVisualizacion: "Líneas comparativas" },
  tasa_ganadas_pipeline: { label: "Tasa de negociaciones ganadas por pipeline", queMuestra: "Porcentaje de negociaciones ganadas, por pipeline.", entidad: "Negociaciones", filtros: "Fecha, pipeline.", tipoVisualizacion: "Indicador (KPI) + barras" },
  creadas_vs_ganadas_dia: { label: "Negociaciones creadas vs. ganadas en el mismo día", queMuestra: "Negociaciones creadas vs. ganadas en el mismo día.", entidad: "Negociaciones", filtros: "Fecha.", tipoVisualizacion: "Líneas comparativas" },
  por_contacto: { label: "Negociaciones por cada contacto", queMuestra: "Negociaciones asociadas a cada contacto.", entidad: "Negociaciones + Contactos", filtros: "Contacto, fecha.", tipoVisualizacion: "Tabla detalle" },
  por_contacto_status: { label: "Negociaciones por contacto y su status", queMuestra: "Negociaciones por contacto, con su status actual (progreso / descarte / éxito).", entidad: "Negociaciones + Contactos", filtros: "Contacto, status.", tipoVisualizacion: "Tabla detalle" },
  tiempo_promedio: { label: "Tiempo promedio de duración de una negociación", queMuestra: "Tiempo promedio entre creación y cierre de una negociación (ganada o perdida).", entidad: "Negociaciones", filtros: "Fecha, pipeline.", tipoVisualizacion: "Indicador (KPI)" }
};

function pageBreak() { return new Paragraph({ children: [new PageBreak()] }); }
const espacio = (a = 120) => new Paragraph({ text: "", spacing: { after: a } });

// ---------- detección de NEs activas ----------
const seleccion = Array.isArray(data.desarrollos) ? data.desarrollos : [];
const chatbotData = data.chatbot || {};
// JSON viejo sin selección → comportamiento legacy (proceso siempre on).
const legacy = seleccion.length === 0;
const neProceso = legacy ? true : seleccion.includes("proceso");
// Captación y Reportería forman parte del paquete "Proceso Comercial".
const neCaptacion = (legacy || neProceso) && data.captacionDeClientes.canales.length > 0;
// Reportería: nueva lista de reportes (editable) con compatibilidad hacia atrás
// con el modelo viejo (prospectos/negociaciones/otros).
const reportesLista = Array.isArray(data.reporteria.reportes) ? data.reporteria.reportes : [];
const totalReportesViejo = (Array.isArray(data.reporteria.prospectos) ? data.reporteria.prospectos.length : 0)
  + (Array.isArray(data.reporteria.negociaciones) ? data.reporteria.negociaciones.length : 0)
  + (data.reporteria.otros ? 1 : 0);
const hayReportes = reportesLista.length > 0 || totalReportesViejo > 0;
const neReporteria = (legacy || neProceso || seleccion.includes("reportes")) && hayReportes;
// El Chatbot se activa por la selección (nuevo) o por el toggle viejo (compat).
const neChatbot = seleccion.includes("chatbot") || data.captacionDeClientes.chatbot.necesita;
const nePostventa = neProceso && !!(data.procesoComercial.entidades || {}).postventa;

const nes = [];
if (neCaptacion) nes.push({ key: "captacion", label: "Captación de Clientes" });
if (neProceso) nes.push({ key: "proceso", label: "Proceso Comercial" });
if (neReporteria) nes.push({ key: "reporteria", label: "Reportería" });
if (neChatbot) nes.push({ key: "chatbot", label: "Proceso de Atención mediante Chatbot" });
if (nePostventa) nes.push({ key: "postventa", label: "Post-venta" });
// ordinal de cada NE (para la numeración x.1, x.2, ...)
const ord = {};
nes.forEach((n, i) => { ord[n.key] = i + 1; });

/* ------------------------ normalizadores de datos ------------------------ */
// Devuelve los pipelines de una entidad. Si `pipelines` existe (esquema nuevo)
// los usa; si no, trata el objeto plano como un pipeline único (retrocompat).
function getPipelines(key) {
  const ent = data.procesoComercial.entidades[key] || {};
  if (Array.isArray(ent.pipelines) && ent.pipelines.length) {
    return ent.pipelines.map((p, i) => ({ ...p, nombre: `${ENTIDAD_LABELS[key]} — ${p.nombre || "Pipeline " + (i + 1)}` }));
  }
  return [{ ...ent, nombre: ENTIDAD_LABELS[key] }];
}
// Normaliza etapas a { progreso[], exito[], fallo[] } con {etapa, desc}.
function normEtapas(pipe) {
  const toS = (s) => (typeof s === "string"
    ? { etapa: s, desc: "" }
    : { etapa: s.etapa || s.nombre || "", desc: s.desc || s.descripcion || "" });
  if (pipe.etapas && (pipe.etapas.progreso || pipe.etapas.exito || pipe.etapas.fallo)) {
    return {
      progreso: (pipe.etapas.progreso || []).map(toS),
      exito: (pipe.etapas.exito || []).map(toS),
      fallo: (pipe.etapas.fallo || []).map(toS)
    };
  }
  return {
    progreso: (pipe.etapasProgreso || []).map(toS),
    exito: (pipe.etapasExito || []).map(toS),
    fallo: (pipe.etapasFallo || []).map(toS)
  };
}
// Normaliza campos a {campo, tipo, obl, origen, obs}. Retrocompat con {nombre,tipo}.
function normCampos(campos) {
  return (campos || []).map((f) => ({
    campo: f.campo || f.nombre || "",
    tipo: f.tipo || "",
    obl: f.obligatorio != null ? (f.obligatorio ? "Sí" : "No") : (f.obl || ""),
    origen: f.origen || "Nuevo",
    obs: f.observacion || f.obs || ""
  }));
}

/* ------------------------ render de sub-proceso ------------------------ */
function tablaEtapas(titulo, et) {
  const rows = [];
  const push = (grupo, arr) => (arr || []).forEach((e, i) => rows.push([i === 0 ? grupo : "", e.etapa, e.desc]));
  push("Etapas de progreso", et.progreso);
  push("Etapa de Éxito", et.exito);
  push("Etapas de fallo", et.fallo);
  if (!rows.length) return [subtitulo("🔧 " + titulo), aviso("EDITAR: sin etapas definidas todavía para esta entidad.")];
  return [subtitulo("🔧 " + titulo), tablaX(["Grupo", "Etapa", "Valor / Configuración"], rows, [2100, 2400, 4500], { groupCol0: true })];
}
function renderSubproceso(pipe) {
  const et = normEtapas(pipe);
  const out = [tituloSubproceso("Sub-proceso: " + pipe.nombre)];
  if (pipe.flujo) out.push(parrafo(pipe.flujo));
  out.push(...tablaEtapas(`Etapas de ${pipe.nombre}`, et));
  out.push(espaciador());
  // Flujo del proceso
  out.push(subtitulo(`Flujo del proceso — ${pipe.nombre}`));
  if (Array.isArray(pipe.flujoPasos) && pipe.flujoPasos.length) {
    out.push(tablaX(FLUJO_COLS, pipe.flujoPasos.map((p, i) => [String(p.n || i + 1), p.accion || "", p.responsable || "", p.herramienta || "", p.condicion || ""]), FLUJO_W));
  } else {
    out.push(aviso("EDITAR: completar los pasos del flujo (agregar o quitar filas según haga falta)."));
    out.push(tablaX(FLUJO_COLS, [["1", "", "", "", ""], ["2", "", "", "", ""], ["3", "", "", "", ""]], FLUJO_W));
  }
  out.push(espaciador());
  // Automatizaciones
  out.push(subtitulo(`🔧 Automatizaciones en ${pipe.nombre}`));
  if (Array.isArray(pipe.automatizaciones) && pipe.automatizaciones.length) {
    out.push(tablaX(["Parámetro", "Valor / Configuración"],
      pipe.automatizaciones.map((a) => [a.trigger || a.parametro || "", (a.acciones || [a.valor || ""]).map((t) => ({ b: true, t }))]),
      [3000, 6000]));
  } else {
    if (pipe.automatizacion) out.push(parrafo(`Lo que comentó el cliente: ${pipe.automatizacion}`));
    const todas = [...et.progreso, ...et.exito, ...et.fallo].map((e) => e.etapa).filter(Boolean);
    if (todas.length) out.push(tablaX(["Parámetro", "Valor / Configuración"], todas.map((e) => [`Etapa: ${e}`, ""]), [3000, 6000]));
    else out.push(aviso("EDITAR: sin etapas definidas para armar la tabla de automatizaciones."));
  }
  if (pipe.origenExterno && pipe.origenExterno.usaOtroSoftware) {
    out.push(aviso(`Algunos clientes cotizan primero en ${pipe.origenExterno.cual}. Continuidad en Bitrix24: ${pipe.origenExterno.continuidad}`));
  }
  out.push(espaciador(240));
  return out;
}

// entidades pipeline (en orden) presentes en el JSON
const PIPELINE_KEYS = ["prospectos", "negociaciones", "cotizaciones", "facturas"];
function pipelineKeysPresentes() { return PIPELINE_KEYS.filter((k) => data.procesoComercial.entidades[k]); }

// Mapeo consolidado: una tabla por entidad/pipeline; entidades sin campos → nota.
function mapeoLista() {
  const list = [];
  pipelineKeysPresentes().forEach((key) => {
    getPipelines(key).forEach((pipe) => list.push({ titulo: pipe.nombre, campos: normCampos(pipe.camposPersonalizados) }));
  });
  ["contactos", "companias"].forEach((key) => {
    if (data.procesoComercial.entidades[key]) list.push({ titulo: ENTIDAD_LABELS[key], campos: normCampos(data.procesoComercial.entidades[key].camposPersonalizados) });
  });
  return list;
}
function renderMapeo(numero) {
  const out = [etiqueta(`${numero}  Mapeo de datos`),
    notaTip(["💡 Los campos 'Existente' son nativos de Bitrix24 y no requieren creación. Los 'Nuevo' se crean como campos personalizados."])];
  mapeoLista().forEach((e) => {
    out.push(subtitulo("📋 Entidad: " + e.titulo));
    if (e.campos.length) out.push(tablaX(MAPEO_COLS, e.campos.map((c) => [c.campo, c.tipo, c.obl, c.origen, c.obs]), MAPEO_W));
    else out.push(parrafo("Se mantienen los campos nativos de Bitrix24 para esta entidad."));
    out.push(espaciador());
  });
  return out;
}

/* ============================ PORTADA ============================ */
// Banner de horas simple (como el iCINE de referencia): un solo total global,
// tres bloques → valor grande arriba, etiqueta debajo. Las horas van entre
// corchetes como placeholder editable ([56] / [6] / [62]).
function bannerHoras() {
  const W = [3000, 3000, 3000];
  const bloque = (valor, label) => new TableCell({
    width: { size: 3000, type: WidthType.DXA },
    margins: { top: 100, bottom: 100, left: 100, right: 100 },
    borders: { top: { style: BorderStyle.SINGLE, size: 2, color: COLOR.tableBorder }, bottom: { style: BorderStyle.SINGLE, size: 2, color: COLOR.tableBorder }, left: { style: BorderStyle.SINGLE, size: 2, color: COLOR.tableBorder }, right: { style: BorderStyle.SINGLE, size: 2, color: COLOR.tableBorder } },
    children: [
      new Paragraph({ alignment: "center", spacing: { after: 20 }, children: [new TextRun({ text: valor, bold: true, color: COLOR.redDark, size: 32, font: FONT })] }),
      new Paragraph({ alignment: "center", children: [new TextRun({ text: label, color: COLOR.gray, size: 18, font: FONT })] })
    ]
  });
  return new Table({ width: { size: 9000, type: WidthType.DXA }, columnWidths: W,
    rows: [new TableRow({ children: [
      bloque("[  ] hrs", "Horas de desarrollo"),
      bloque("[  ] hrs", "Horas de capacitación"),
      bloque("[  ] hrs", "Total horas")
    ] })] });
}

// Tabla de datos del cliente SIN cabecera "Campo/Valor": primera columna en
// azul y negrita (los títulos), segunda columna el valor.
function tablaDatos(filas) {
  const W = [3000, 6000];
  return new Table({ width: { size: 9000, type: WidthType.DXA }, columnWidths: W,
    rows: filas.map(([k, v]) => new TableRow({ children: [
      new TableCell({ width: { size: W[0], type: WidthType.DXA }, margins: { top: 40, bottom: 40, left: 90, right: 90 },
        borders: { top: { style: BorderStyle.SINGLE, size: 2, color: COLOR.tableBorder }, bottom: { style: BorderStyle.SINGLE, size: 2, color: COLOR.tableBorder }, left: { style: BorderStyle.SINGLE, size: 2, color: COLOR.tableBorder }, right: { style: BorderStyle.SINGLE, size: 2, color: COLOR.tableBorder } },
        children: [new Paragraph({ children: [new TextRun({ text: String(k), bold: true, color: COLOR.blue, font: FONT, size: 20 })] })] }),
      new TableCell({ width: { size: W[1], type: WidthType.DXA }, margins: { top: 40, bottom: 40, left: 90, right: 90 },
        borders: { top: { style: BorderStyle.SINGLE, size: 2, color: COLOR.tableBorder }, bottom: { style: BorderStyle.SINGLE, size: 2, color: COLOR.tableBorder }, left: { style: BorderStyle.SINGLE, size: 2, color: COLOR.tableBorder }, right: { style: BorderStyle.SINGLE, size: 2, color: COLOR.tableBorder } },
        children: [new Paragraph({ children: [new TextRun({ text: String(v), font: FONT, size: 20 })] })] })
    ] })) });
}
const portada = [
  new Paragraph({ alignment: "center", spacing: { before: 200, after: 100 }, children: [
    new TextRun({ text: `“${data.cliente}” `, bold: true, color: COLOR.redDark, size: 48, font: FONT, break: 1 }),
    new TextRun({ text: "Informe de Consultoría para la Implementación de Necesidad Específica · iCINE", color: COLOR.blue, size: 28, font: FONT })
  ] }),
  aviso("ESTADO DEL DOCUMENTO: " + data.meta.estado),
  espacio(200),
  bannerHoras(),
  espacio(240),
  tablaDatos([
    ["Cliente", data.cliente],
    ["Plataforma", "Bitrix24"],
    ["Url", data.meta.url || "(a completar)"],
    ["Licencia actual", data.meta.licencia || "(a completar)"],
    ["Consultor / Recurso", data.meta.consultor || "(a completar)"],
    ["Jefe de Proyecto", data.meta.jefeProyecto || "(a completar)"],
    ["Fecha de elaboración", new Date().toLocaleDateString("es")],
    ["Versión del documento", data.meta.version || "1.0"]
  ]),
  espacio(240),
  subtitulo("Control de versiones"),
  tablaX(["Versión", "Fecha", "Comentario", "Estado", "Realizado por"],
    [[data.meta.version || "1.0", new Date().toLocaleDateString("es"), "iCINE en construcción", data.meta.estado, data.meta.consultor || "(consultor)"]],
    [1200, 1600, 3000, 1600, 1600]),
  pageBreak()
];

/* ============================ ÍNDICE (tabla) ============================ */
const indiceItems = [
  "1. Antecedentes",
  "2. Necesidades de gestión detectadas",
  "3. Recomendaciones funcionales y de infraestructura",
  "4. Diseño de la solución",
  "5. Resumen de actividades",
  "6. Requerimientos adicionales",
  "7. Glosario",
  "8. Aprobación y firmas"
];
if (data.incluirTerminos) indiceItems.push("9. Términos y condiciones");
const indice = [seccionH1("", "ÍNDICE DE CONTENIDOS"), tablaX(["Sección"], indiceItems.map((i) => [i]), [9000]), pageBreak()];

/* ============================ 1. Antecedentes ============================ */
const antecedentes = [
  seccionH1("1", "ANTECEDENTES"),
  parrafo(data.necesidadEspecifica.descripcion || "(el cliente no dejó una descripción en el formulario)"),
  parrafo("Con este propósito se inició un proceso de consultoría bajo la metodología iCINE (Investigación, Consultoría, Análisis y Diseño), cuya primera etapa consistió en sesiones de levantamiento de información con los responsables del proceso comercial. El presente documento corresponde a la fase de Análisis y Diseño y documenta las propuestas de optimización identificadas."),
  aviso("EDITAR: expandir el primer párrafo — es lo que escribió el cliente, no un antecedente redactado por el consultor."),
  pageBreak()
];

/* ============================ 2. Necesidades ============================ */
// Título de necesidad: negrita sobre fondo blanco (sin rojo), con consecutivo.
let _neCount = 0;
function tituloNecesidad(texto) {
  _neCount += 1;
  return new Paragraph({
    spacing: { before: 180, after: 80 },
    children: [new TextRun({ text: `${_neCount}.  ${texto}`, bold: true, font: FONT, size: 23 })]
  });
}
const necesidades = [seccionH1("2", "NECESIDADES DE GESTIÓN DETECTADAS"), subtitulo("A implementar en este iCINE")];
if (neCaptacion) {
  necesidades.push(tituloNecesidad("Proceso de Captación y Gestión de Clientes (Omnicanalidad)"));
  necesidades.push(parrafo(`Contempla la centralización de los siguientes canales dentro del CRM: ${data.captacionDeClientes.canales.map((c) => CANAL_LABELS[c] || c).join(", ")}.`));
  if (data.captacionDeClientes.canales.includes("whatsapp")) necesidades.push(aviso("WhatsApp requiere Wazzup (licencia externa) — se gestiona en un proceso aparte con horas propias, fuera del alcance de este iCINE."));
}
if (neProceso) {
  necesidades.push(tituloNecesidad("Proceso Comercial"));
  necesidades.push(parrafo(`Contempla la estructuración del flujo comercial usando las entidades: ${Object.keys(data.procesoComercial.entidades).map((k) => ENTIDAD_LABELS[k]).join(", ")}.`));
}
if (neReporteria) {
  necesidades.push(tituloNecesidad("Reportería y Análisis Comercial"));
  const nombres = reportesLista.length
    ? reportesLista.map((r) => r.nombre).filter(Boolean)
    : [...(Array.isArray(data.reporteria.prospectos) ? data.reporteria.prospectos : []).map((k) => REPORTE_LABELS[k]),
       ...(Array.isArray(data.reporteria.negociaciones) ? data.reporteria.negociaciones : []).map((k) => REPORTE_LABELS[k])].filter(Boolean);
  necesidades.push(parrafo(`Reportes solicitados: ${nombres.join("; ")}.`));
}
if (neChatbot) {
  necesidades.push(tituloNecesidad("Proceso de Atención mediante Chatbot"));
  necesidades.push(parrafo(chatbotData.objetivo || data.captacionDeClientes.chatbot.descripcion || "(sin detalle adicional del cliente)"));
}
necesidades.push(subtitulo("Fuera del alcance de este iCINE (propuesto para Versión 2 / Fase 2)"));
necesidades.push(...bullets(["Toda integración con sistemas externos (ERP, etc.) queda propuesta para Fase 2.", "Otras necesidades detectadas se documentarán para una versión futura."]));
necesidades.push(pageBreak());

/* ============================ 3. Recomendaciones ============================ */
const recModulos = [];
if (neProceso) recModulos.push(["CRM", Object.keys(data.procesoComercial.entidades).map((k) => ENTIDAD_LABELS[k]).join(" — "), ""]);
if (neCaptacion) {
  const canalesSinWhatsapp = data.captacionDeClientes.canales.filter((c) => c !== "whatsapp").map((c) => CANAL_LABELS[c] || c);
  recModulos.push(["Contact Center", canalesSinWhatsapp.join(" — "), data.captacionDeClientes.canales.includes("whatsapp") ? "WhatsApp fuera de este iCINE" : ""]);
}
if (neReporteria) recModulos.push(["Reportería", "BI Builder — Informes", ""]);
if (!recModulos.length) recModulos.push(["—", "—", "Sin módulos nativos en el alcance de este iCINE."]);
const recAdicionales = [];
// El chatbot solo se lista como herramienta adicional si se construye con algo
// externo (campo "¿con qué se construirá?"). El canal donde vive no es proveedor.
if (neChatbot && (chatbotData.herramienta || "").trim()) {
  recAdicionales.push(["Chatbot", chatbotData.herramienta.trim(), "Según herramienta", "Herramienta con la que se construye el bot"]);
}
if (data.captacionDeClientes.canales.includes("whatsapp")) recAdicionales.push(["WhatsApp (Wazzup)", "Wazzup", "Pago por licencia", "Proceso y cotización aparte, con horas propias"]);
const recomendaciones = [
  seccionH1("3", "RECOMENDACIONES FUNCIONALES Y DE INFRAESTRUCTURA"),
  subtitulo("Licenciamiento y plataforma"),
  parrafo(`Licencia actual del cliente: ${data.meta.licencia || "(a confirmar)"}.`),
  subtitulo("Herramientas nativas de Bitrix24 (incluidas en la licencia)"),
  tabla(["Módulo", "Herramientas", "Observación"], recModulos, [2200, 4800, 2000]),
  ...(recAdicionales.length ? [subtitulo("Productos y herramientas adicionales"), tabla(["Producto / Servicio", "Proveedor", "Costo / Licencia", "Observación"], recAdicionales, [2200, 2200, 2000, 2600])] : []),
  subtitulo("Infraestructura / Web Services"),
  parrafo("No aplica para el alcance de este iCINE, salvo indicación contraria."),
  aviso("Toda integración con sistemas externos (ERP, otros CRM, etc.) queda propuesta para Fase 2 — no se mezcla en el alcance de este iCINE."),
  pageBreak()
];

/* ============================ 4. Diseño ============================ */
// --- NE Captación ---
function seccionCaptacion() {
  const N = ord.captacion;
  const out = [cajaNE(`NE ${N}`, "Captación de Clientes", "vista de cliente"),
    etiqueta(`${N}.1  ¿Qué se va a implementar?`),
    parrafo(`Se centralizarán en Bitrix24 los siguientes canales de contacto: ${data.captacionDeClientes.canales.map((c) => CANAL_LABELS[c] || c).join(", ")}. Cada interacción quedará registrada automáticamente, evitando la pérdida de oportunidades entre distintos canales.`)];
  if (data.captacionDeClientes.distribucion) out.push(parrafo(`Distribución actual de mensajes: ${data.captacionDeClientes.distribucion}`));
  out.push(etiqueta(`${N}.2  Beneficios para tu negocio`));
  out.push(tablaX(["✓", "Beneficio", "Descripción"], [
    ["✓", "Cero prospectos perdidos entre canales", "Todos los canales alimentan un solo lugar."],
    ["✓", "Atención centralizada desde Bitrix24", "El equipo responde sin salir del CRM."],
    ["✓", "Trazabilidad desde el primer contacto", "Cada mensaje queda registrado y asignado."]
  ], [700, 3100, 5200]));
  out.push(aviso("EDITAR: personalizar los beneficios según el cliente."));
  out.push(etiqueta(`${N}.3  Diagrama del proceso:`));
  out.push(aviso("Diagrama a insertar aparte — no se genera en este documento."));
  out.push(pageBreak());
  out.push(cajaNE(`NE ${N}`, "DETALLE TÉCNICO", "Uso interno del equipo — cómo se va a construir"));
  out.push(etiqueta(`${N}.4  Roles y permisos`));
  out.push(tabla(["Rol", "Acceso", "Observación"], ROLES_CAPTACION, [2800, 4200, 2000]));
  out.push(aviso("💡 Plantilla sugerida — ajustar según el cliente."));
  out.push(etiqueta(`${N}.5  Acciones a realizar`));
  out.push(...bullets(["Configuración de Contact Center"]));
  data.captacionDeClientes.canales.filter((c) => c !== "whatsapp").forEach((c) => out.push(...bullets([`Conexión de ${CANAL_LABELS[c] || c}`], 1)));
  return out;
}

// --- NE Proceso Comercial (el bloque central, formato completo) ---
function seccionProcesoComercial() {
  const N = ord.proceso;
  const entidadesActivas = Object.keys(data.procesoComercial.entidades).filter((k) => k !== "postventa").map((k) => ENTIDAD_LABELS[k]);
  const out = [cajaNE(`NE ${N}`, "Proceso Comercial", "vista de cliente"),
    etiqueta(`${N}.1  ¿Qué se va a implementar?`),
    parrafo(`Se estructurará el flujo comercial completo en Bitrix24 usando las entidades: ${entidadesActivas.join(", ")}. Desde la calificación inicial hasta el cierre de la venta, cada oportunidad queda organizada, trazable y asignada al equipo comercial.`),
    etiqueta(`${N}.2  Beneficios para tu negocio`),
    tablaX(["✓", "Beneficio", "Descripción"], [
      ["✓", "Visibilidad total del pipeline", "Estado de cada oportunidad en tiempo real."],
      ["✓", "Seguimiento sistemático", "Ninguna oportunidad se pierde entre etapas."],
      ["✓", "Análisis de motivos de pérdida", "Cada cierre perdido queda tipificado."]
    ], [700, 3100, 5200]),
    aviso("EDITAR: personalizar los beneficios según el cliente."),
    etiqueta(`${N}.3  Diagrama del proceso:`),
    aviso("Diagrama a insertar aparte — no se genera en este documento."),
    pageBreak(),
    cajaNE(`NE ${N}`, "DETALLE TÉCNICO", "Uso interno del equipo — cómo se va a construir"),
    etiqueta(`${N}.4  Roles y permisos en CRM y SPA`),
    tabla(["Rol", "Permisos en Bitrix24", "Observación"], ROLES_PROCESO_COMERCIAL, [2400, 3800, 2800]),
    etiqueta(`${N}.5  Flujo del proceso`),
    parrafo("El proceso inicia con la calificación de la oportunidad; al avanzar, se encausa por el pipeline correspondiente hasta el cierre. Cada sub-proceso se detalla a continuación.")];
  // sub-procesos: cada entidad pipeline (negociaciones puede traer varios pipelines)
  pipelineKeysPresentes().forEach((key) => getPipelines(key).forEach((pipe) => out.push(...renderSubproceso(pipe))));
  // mapeo consolidado
  out.push(...renderMapeo(`${N}.6`));
  // acciones
  out.push(etiqueta(`${N}.7  Acciones a realizar`));
  pipelineKeysPresentes().forEach((key) => getPipelines(key).forEach((pipe) => {
    out.push(...bullets([`Creación de ${pipe.nombre}`]));
    out.push(...bullets(["Creación de etapas + automatizaciones", "Creación de campos + orden de ficha"], 1));
  }));
  const simples = ["contactos", "companias"].filter((k) => data.procesoComercial.entidades[k]).map((k) => ENTIDAD_LABELS[k]);
  if (simples.length) out.push(...bullets([`Creación de campos — ${simples.join(" y ")}`]));
  out.push(...bullets(["Configuración de permisos en CRM"]));
  return out;
}

// --- NE Reportería ---
function seccionReporteria() {
  const N = ord.reporteria;
  const out = [cajaNE(`NE ${N}`, "Reportería", "vista de cliente"),
    etiqueta(`${N}.1  ¿Qué se va a implementar?`),
    parrafo("Se configurarán los reportes solicitados para transformar la información del CRM en indicadores de gestión."),
    etiqueta(`${N}.2  Diagrama del proceso:`),
    aviso("No aplica diagrama de flujo para esta NE — los reportes son vistas de análisis, no procesos operativos."),
    pageBreak(),
    cajaNE(`NE ${N}`, "DETALLE TÉCNICO", "Uso interno del equipo — cómo se va a construir"),
    etiqueta(`${N}.3  Roles y permisos`),
    tabla(["Rol", "Acceso", "Observación"], ROLES_REPORTERIA, [2800, 4200, 2000]),
    etiqueta(`${N}.4  Flujo del proceso`),
    aviso("No aplica flujo de proceso para esta NE — los reportes son consultas sobre la data existente en el CRM."),
    etiqueta(`${N}.5  Reportes a configurar`),
    aviso("Estos reportes utilizan las herramientas nativas de Bitrix24 (BI Builder) — no requieren desarrollo adicional, solo configuración de las vistas.")];

  // Nueva lista de reportes (editable). Si viene vacía, compat con modelo viejo.
  let reportes = reportesLista.map((r) => ({
    nombre: r.nombre || "Reporte",
    queMuestra: r.queMuestra || "", entidad: r.entidad || "",
    filtros: r.filtros || "", tipoVisualizacion: r.tipoVisualizacion || "",
    consideraciones: r.consideraciones || ""
  }));
  if (!reportes.length) {
    const viejos = [
      ...(Array.isArray(data.reporteria.prospectos) ? data.reporteria.prospectos : []),
      ...(Array.isArray(data.reporteria.negociaciones) ? data.reporteria.negociaciones : [])
    ].map((k) => REPORTES_META[k]).filter(Boolean);
    reportes = viejos.map((m) => ({ nombre: m.label, queMuestra: m.queMuestra, entidad: m.entidad, filtros: m.filtros, tipoVisualizacion: m.tipoVisualizacion, consideraciones: "" }));
    if (data.reporteria.otros) reportes.push({ nombre: "Reporte adicional solicitado", queMuestra: data.reporteria.otros, entidad: "", filtros: "", tipoVisualizacion: "", consideraciones: "" });
  }

  reportes.forEach((r, i) => {
    out.push(subtitulo(`🔧 Reporte ${i + 1} — ${r.nombre}`));
    out.push(tablaX(["Parámetro", "Valor / Configuración"], [
      ["Qué muestra", r.queMuestra || ""],
      ["Entidad", r.entidad || ""],
      ["Filtros", r.filtros || ""],
      ["Tipo de visualización", r.tipoVisualizacion || ""],
      ["Consideraciones", r.consideraciones || "(a completar)"]
    ], [2800, 6200]));
    out.push(espaciador());
  });

  out.push(etiqueta(`${N}.6  Mapeo de datos`));
  out.push(aviso("No aplica creación de nuevos campos para esta NE — los reportes se construyen sobre los campos ya configurados en Proceso Comercial."));
  out.push(etiqueta(`${N}.7  Acciones a realizar`));
  out.push(...bullets(["Permisos en BI Builder", "Consultas a la base de datos + creación de DATASET"]));
  reportes.forEach((r, i) => out.push(...bullets([`Configuración del Reporte ${i + 1} — ${r.nombre}`])));
  return out;
}

// Etiquetas legibles de los tipos de acción del bot.
const TIPO_ACCION_LABEL = {
  mensaje: "Mensaje", pedir_dato: "Pedir dato", buscar: "Buscar en Bitrix24",
  crear: "Crear registro", condicion: "Condición", derivar: "Derivar a asesor",
  ir_menu: "Ir a otro menú", volver: "Volver al menú"
};

// --- NE Chatbot (detallada, desde data.chatbot) ---
function seccionChatbot() {
  const N = ord.chatbot;
  const cb = chatbotData;
  const esConversacional = cb.tipoBot === "conversacional";
  const canales = Array.isArray(cb.plataformas) && cb.plataformas.length ? cb.plataformas.join(", ") : "(canales a definir)";
  const herramienta = (cb.herramienta || "").trim() || "(herramienta a definir)";
  const objetivo = cb.objetivo || data.captacionDeClientes.chatbot.descripcion || "(sin objetivo definido)";
  const tipoTxt = esConversacional ? "un bot conversacional con IA" : "un bot de menús";

  const out = [
    cajaNE(`NE ${N}`, "Proceso de Atención mediante Chatbot", "vista de cliente"),
    etiqueta(`${N}.1  ¿Qué se va a implementar?`),
    parrafo(`Se documentará el flujo de ${tipoTxt} que atenderá en: ${canales}. Objetivo: ${objetivo}`),
    etiqueta(`${N}.2  Beneficios para tu negocio`),
    tablaX(["✓", "Beneficio", "Descripción"], [
      ["✓", "Respuesta inmediata 24/7", "El primer contacto se atiende al instante, sin depender de un agente."],
      ["✓", "Atención estructurada", "Cada consulta sigue un camino claro hasta resolverse o derivarse."],
      ["✓", "Menos carga operativa", "El bot filtra y deriva; el equipo se enfoca en lo que aporta valor."]
    ], [700, 3100, 5200]),
    aviso("EDITAR: personalizar los beneficios según el cliente."),
    etiqueta(`${N}.3  Diagrama del proceso:`),
    aviso("Diagrama del flujo a insertar aparte — no se genera en este documento."),
    espaciador(300),
    cajaNE(`NE ${N}`, "DETALLE TÉCNICO", "Uso interno del equipo — cómo se va a construir"),
    etiqueta(`${N}.4  Canales y herramienta`),
    tablaX(["Parámetro", "Valor / Configuración"], [
      ["Canal(es) donde atiende", canales],
      ["Se construirá con", herramienta]
    ], [3000, 6000])
  ];

  if (esConversacional) {
    // ----- Rama B: conversacional / IA -----
    out.push(etiqueta(`${N}.5  Lógica conversacional`));
    out.push(tablaX(["Parámetro", "Valor / Configuración"], [
      ["Mensaje de bienvenida", cb.bienvenida || "(a definir)"],
      ["Qué resuelve / conocimiento", cb.conocimiento || "(a definir)"],
      ["Intentos antes de derivar", cb.intentosDerivar || "(a definir)"],
      ["Deriva a", cb.derivaA || "(a definir)"]
    ], [3000, 6000]));
  } else {
    // ----- Rama A: bot de menús -----
    out.push(etiqueta(`${N}.5  Flujo por menús`));
    const menus = Array.isArray(cb.menus) ? cb.menus : [];
    if (!menus.length) {
      out.push(aviso("EDITAR: definir los menús del bot y sus acciones."));
    } else {
      menus.forEach((m) => {
        out.push(subtitulo("🔧 Menú: " + (m.nombre || "(sin nombre)")));
        const acciones = m.acciones || [];
        if (!acciones.length) {
          out.push(parrafo("(sin acciones definidas para este menú)"));
        } else {
          out.push(tablaX(["Acción", "Descripción", "Condición / Regla"],
            acciones.map((a) => {
              let tipo = TIPO_ACCION_LABEL[a.tipo] || a.tipo || "";
              if (a.entidad) tipo += ` · ${a.entidad}`;
              return [tipo, a.descripcion || "", a.condicion || ""];
            }), [2400, 4200, 2400]));
        }
        out.push(espaciador());
      });
    }
  }

  out.push(etiqueta(`${N}.6  Fuera de horario / fallback`));
  out.push(parrafo(cb.fallback || "(a definir el comportamiento cuando nadie responde o es fuera de horario)"));
  out.push(etiqueta(`${N}.7  Acciones a realizar`));
  out.push(...bullets([
    "Contratación / configuración de la plataforma del bot",
    esConversacional ? "Configuración del modelo de IA y su base de conocimiento" : "Construcción de los menús y sus acciones",
    "Conexión del bot con Bitrix24 (buscar / crear registros)",
    "Configuración de la lógica de derivación al equipo"
  ]));
  return out;
}

// --- NE Post-venta ---
function seccionPostventa() {
  const N = ord.postventa;
  const pv = data.procesoComercial.entidades.postventa;
  const out = [cajaNE(`NE ${N}`, "Post-venta", "vista de cliente"),
    etiqueta(`${N}.1  ¿Qué se va a implementar?`),
    parrafo(pv.procesoDescripcion || "(sin descripción del cliente)")];
  if (pv.facturaERP) {
    out.push(parrafo(`Actualmente factura mediante: ${pv.erpNombre || "(no especificado)"}.`));
    if (pv.deseaIntegracion) {
      out.push(parrafo(`Integración deseada con Bitrix24: ${pv.detalleIntegracion || "(sin detalle)"}`));
      out.push(aviso("Esta integración con el ERP externo queda propuesta para Fase 2 — no se implementa dentro de este iCINE."));
    }
  }
  out.push(espaciador(300));
  out.push(cajaNE(`NE ${N}`, "DETALLE TÉCNICO", "Uso interno del equipo — cómo se va a construir"));
  out.push(etiqueta(`${N}.2  Detalle operativo`));
  out.push(aviso("EDITAR: definir con el cliente el detalle operativo del proceso de post-venta."));
  return out;
}

const diseno = [seccionH1("4", "DISEÑO DE LA SOLUCIÓN"),
  parrafo("Las necesidades específicas se presentan en orden de flujo.")];
if (neCaptacion) diseno.push(...seccionCaptacion(), pageBreak());
if (neProceso) diseno.push(...seccionProcesoComercial(), pageBreak());
if (neReporteria) diseno.push(...seccionReporteria(), pageBreak());
if (neChatbot) diseno.push(...seccionChatbot(), pageBreak());
if (nePostventa) diseno.push(...seccionPostventa(), pageBreak());

/* ============================ 5. Resumen de actividades ============================ */
// Genera actividades predefinidas (sin horas — el consultor las completa).
function resumenActividades() {
  const rows = [];
  rows.push(["", `NE${ord.proceso} — Proceso Comercial`, "", "", ""]);
  pipelineKeysPresentes().forEach((key) => getPipelines(key).forEach((pipe) => {
    rows.push(["", "", `Creación de ${pipe.nombre} + campos + automatizaciones.`, "[  ]", "No"]);
  }));
  const simples = ["contactos", "companias"].filter((k) => data.procesoComercial.entidades[k]).map((k) => ENTIDAD_LABELS[k]);
  if (simples.length) rows.push(["", "", `Creación de campos — ${simples.join(" y ")}.`, "[  ]", "No"]);
  rows.push(["", "", "Configuración de permisos en CRM.", "[  ]", "No"]);
  if (neReporteria) {
    rows.push(["", `NE${ord.reporteria} — Reportería`, "", "", ""]);
    rows.push(["", "", "Creación del DATASET y permisos en BI Builder.", "[  ]", "No"]);
    const total = reportesLista.length || totalReportesViejo;
    rows.push(["", "", `Configuración de ${total} reporte(s).`, "[  ]", "No"]);
  }
  rows.push(["", "Pruebas", "", "", ""]);
  rows.push(["", "", "Pruebas QA internas del proceso.", "[  ]", "No"]);
  rows.push(["", "", "Pruebas Alpha con el cliente.", "[  ]", "Sí"]);
  rows.push(["", "Capacitación — CIP", "", "", ""]);
  rows.push(["", "", "Capacitación nivel usuario.", "[  ]", "Sí"]);
  rows.push(["", "", "Capacitación nivel administrador.", "[  ]", "Sí"]);
  // numerar solo las filas de actividad (las de grupo quedan sin número)
  let n = 0;
  rows.forEach((r) => { if (r[2]) { n += 1; r[0] = String(n); } });
  rows.push(["", "", "DICA: [  ] horas   |   CIP: [  ] horas   |   TOTAL: [  ] horas", "", ""]);
  return rows;
}
const resumen = [
  seccionH1("5", "RESUMEN DE ACTIVIDADES"),
  parrafo("Actividades a ejecutar con sus tiempos estimados y la participación del cliente. Las horas de desarrollo (DICA) y capacitación (CIP) se totalizan al pie."),
  aviso("EDITAR: completar las horas por actividad — sigue siendo criterio del consultor."),
  tablaX(["#", "Ref.", "Actividad", "Horas", "Cliente"], resumenActividades(), [600, 1800, 4900, 900, 800]),
  pageBreak()
];

/* ============================ 6. Requerimientos adicionales ============================ */
const requerimientos = [
  seccionH1("6", "REQUERIMIENTOS ADICIONALES"),
  parrafo("Requisitos que el cliente debe garantizar para la correcta ejecución del proyecto."),
  ...bullets([
    "Usuarios de Bitrix24 creados y con licencia asignada antes del inicio.",
    "Un responsable designado por el cliente como contraparte del Jefe de Proyecto.",
    "Información base (zonas, catálogo de productos, etc.) disponible antes de la carga de campos."
  ]),
  pageBreak()
];

/* ============================ 7. Glosario ============================ */
const glosarioBase = [
  ["Bitrix24", "Plataforma de gestión empresarial que incluye CRM, comunicación, automatización y gestión de proyectos."],
  ["CRM", "Customer Relationship Management. Sistema de gestión de relaciones con clientes."],
  ["iCINE", "Informe de Consultoría para la Implementación de Necesidad Específica."],
  ["NE", "Necesidad Específica. Cada módulo o proceso a desarrollar dentro del iCINE."],
  ["Pipeline", "Flujo de etapas por el que avanza una oportunidad, desde el primer contacto hasta el cierre."],
  ["SPA", "Smart Process Automation. Proceso inteligente configurable dentro del CRM de Bitrix24."],
  ["Canal Abierto", "Funcionalidad de Bitrix24 que integra canales de comunicación externos con el CRM."],
  ["DICA", "Horas de Desarrollo, Implementación, Configuración y Ajuste."],
  ["CIP", "Horas de Capacitación, Instrucción y Preparación."]
];
if (neChatbot) glosarioBase.push(["Chatbot", "Asistente automatizado que atiende el primer contacto y deriva a un responsable humano cuando corresponde."]);
if (data.captacionDeClientes.canales.includes("whatsapp")) glosarioBase.push(["Wazzup", "Plataforma externa de pago que conecta WhatsApp con Bitrix24."]);
const glosario = [seccionH1("7", "GLOSARIO"),
  parrafo("Definición de los términos técnicos utilizados a lo largo de este documento."),
  tabla(["Término", "Definición"], glosarioBase, [2200, 6800]), pageBreak()];

/* ============================ 8. Firmas ============================ */
function celdaFirma(rol) {
  const nombre = rol === "Cliente" ? data.cliente : rol;
  const NB = { top: NONE, bottom: NONE, left: NONE, right: NONE };
  return new TableCell({ width: { size: 4500, type: WidthType.DXA }, margins: { top: 200, bottom: 200, left: 120, right: 120 }, borders: NB,
    children: [
      new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: nombre, bold: true, color: COLOR.blue, font: FONT, size: 20 })] }),
      new Paragraph({ spacing: { before: 400 }, border: { top: { style: BorderStyle.SINGLE, size: 6, color: COLOR.gray } },
        children: [new TextRun({ text: "Nombre y firma", color: COLOR.gray, font: FONT, size: 18 })] })
    ] });
}
const firmaRows = [];
for (let i = 0; i < data.firmantes.length; i += 2) {
  const NB = { top: NONE, bottom: NONE, left: NONE, right: NONE };
  firmaRows.push(new TableRow({ children: [celdaFirma(data.firmantes[i]), data.firmantes[i + 1] ? celdaFirma(data.firmantes[i + 1]) : new TableCell({ borders: NB, children: [new Paragraph("")] })] }));
}
const firmas = [
  seccionH1("8", "APROBACIÓN Y FIRMAS"),
  parrafo("Las partes abajo firmantes declaran haber leído, comprendido y aprobado el contenido del presente iCINE, autorizando el inicio del desarrollo conforme a lo establecido en este documento."),
  new Table({ width: { size: 9000, type: WidthType.DXA }, columnWidths: [4500, 4500],
    borders: { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE }, rows: firmaRows })
];

/* ============================ 9. Términos y condiciones ============================ */
const terminos = data.incluirTerminos ? [
  pageBreak(),
  seccionH1("9", "TÉRMINOS Y CONDICIONES"),
  ...bullets([
    "El alcance de este iCINE se limita a las necesidades específicas descritas en la sección 4. Cualquier requerimiento fuera de ese alcance se cotiza por separado.",
    "Las horas estimadas (DICA/CIP) son referenciales y se ajustan según la información final entregada por el cliente.",
    "Las integraciones con sistemas externos y la reportería avanzada quedan propuestas para una fase posterior.",
    "La ejecución del proyecto requiere la participación activa de la contraparte designada por el cliente."
  ])
] : [];

/* ============================ ensamblar ============================ */
const doc = new Document({
  styles: { default: { document: { run: { font: FONT, size: 22 } } } },
  sections: [{
    properties: { page: { margin: PAGE_MARGINS } },
    headers: { default: buildHeader() },
    footers: { default: buildFooter() },
    children: [
      ...portada, ...indice, ...antecedentes, ...necesidades, ...recomendaciones,
      ...diseno, ...resumen, ...requerimientos, ...glosario, ...firmas, ...terminos
    ]
  }]
});

const buf = await Packer.toBuffer(doc);
return { buffer: buf, nes: nes.map((n) => n.label), cliente: data.cliente };
}
