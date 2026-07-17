import { Document, Packer, Paragraph, TextRun, PageBreak } from "docx";
import {
  buildHeader, buildFooter, PAGE_MARGINS, COLOR, FONT,
  seccionH1, seccionH2, etiqueta, parrafo, subtitulo, aviso, bullets, tabla
} from "./brand.js";

// Construye el .docx del iCINE a partir del JSON canónico y devuelve un Buffer.
// No lee ni escribe archivos — eso lo decide quien la llama (el CLI de prueba
// en generate.js, o el servidor puente en bridge-server/server.js).
export async function buildICINE(dataRaw) {

// ---------- normalización defensiva ----------
// Las dos carpetas (captura-icine e icine-generator) evolucionan por separado.
// Si el JSON viene de una versión de la app anterior a algún campo nuevo
// (chatbot, postventa, origenExterno, etc.), completamos con valores por
// defecto en vez de que el script truene. Mejor un iCINE con esa sección
// vacía que un error que no diga qué archivo hay que actualizar.
const data = {
  ...dataRaw,
  captacionDeClientes: {
    canales: [], otrosCanales: "", distribucion: "", paginawebUrl: "", tiendavirtualUrl: "",
    ...dataRaw.captacionDeClientes,
    chatbot: { necesita: false, descripcion: "", ...(dataRaw.captacionDeClientes || {}).chatbot }
  },
  reporteria: { prospectos: [], negociaciones: [], otros: "", ...dataRaw.reporteria }
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

// Plantillas fijas de Roles y permisos — extraídas tal cual de iCINEs reales
// de referencia (Liga de Lima, Naturlich). Se repiten casi igual de un
// cliente a otro, por eso se dejan como base y no como pregunta del formulario.
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
// Sin un iCINE de referencia todavía para Captación — se marca explícitamente
// como sugerencia a validar, no como algo tomado de un documento real.
const ROLES_CAPTACION = [
  ["Acceso Completo Contact Center", "Configurar canales, líneas de atención y reglas de distribución.", "Para el administrador del Contact Center."],
  ["Agente de Atención", "Recibir y responder las conversaciones que se le asignen.", "Para quien atiende los mensajes día a día."]
];

// Catálogo de reportes enriquecido con la plantilla de 4 parámetros que se
// vio en el iCINE de Naturlich (Qué muestra / Entidad / Filtros clave / Tipo
// de visualización). Son valores sugeridos por defecto — el consultor los
// ajusta al caso puntual del cliente.
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

// ---------- detección de NEs activas ----------
const neCaptacion = data.captacionDeClientes.canales.length > 0;
const totalReportes = data.reporteria.prospectos.length + data.reporteria.negociaciones.length + (data.reporteria.otros ? 1 : 0);
const neReporteria = totalReportes > 0;
const neChatbot = data.captacionDeClientes.chatbot.necesita;
const nePostventa = !!(data.procesoComercial.entidades || {}).postventa;

const nes = [];
if (neCaptacion) nes.push({ key: "captacion", label: "Captación de Clientes" });
nes.push({ key: "proceso", label: "Proceso Comercial" });
if (neReporteria) nes.push({ key: "reporteria", label: "Reportería" });
if (neChatbot) nes.push({ key: "chatbot", label: "Proceso de Atención mediante Chatbot" });
if (nePostventa) nes.push({ key: "postventa", label: "Post-venta" });

// ---------- Portada (formato exacto: nombre en rojo A9091E + subtítulo azul 056AA1) ----------
const portada = [
  new Paragraph({
    alignment: "center",
    spacing: { before: 240, after: 0 },
    children: [
      new TextRun({ text: `“${data.cliente}” `, bold: true, color: COLOR.redDark, size: 48, font: FONT, break: 1 }),
      new TextRun({ text: "Informe de Consultoría para la Implementación de Necesidad Específica · iCINE", color: COLOR.blue, size: 28, font: FONT })
    ]
  }),
  new Paragraph({ text: "", spacing: { after: 200 } }),
  aviso("ESTADO DEL DOCUMENTO: EN CREACIÓN"),
  new Paragraph({ text: "", spacing: { after: 200 } }),
  tabla(
    ["Campo", "Valor"],
    [
      ["Cliente", data.cliente],
      ["Plataforma", "Bitrix24"],
      ["Fecha de elaboración", new Date().toLocaleDateString("es")],
      ["Necesidades específicas incluidas", String(nes.length)]
    ]
  ),
  pageBreak()
];

// ---------- Índice ----------
const indice = [
  seccionH1("", "ÍNDICE DE CONTENIDOS"),
  ...bullets([
    "1. Antecedentes",
    "2. Necesidades de gestión detectadas",
    "3. Recomendaciones funcionales y de infraestructura",
    ...nes.map((n, i) => `4.${i + 1} Diseño de la solución — ${n.label}`),
    "5. Resumen de actividades",
    "6. Glosario",
    "7. Aprobación y firmas"
  ]),
  pageBreak()
];

// ---------- 1. Antecedentes ----------
const antecedentes = [
  seccionH1("1", "ANTECEDENTES"),
  parrafo(data.necesidadEspecifica.descripcion || "(el cliente no dejó una descripción en el formulario)"),
  aviso("EDITAR: expandir este contexto — el texto de arriba es lo que escribió el cliente, no un antecedente redactado por el consultor."),
  pageBreak()
];

// ---------- 2. Necesidades detectadas ----------
const necesidades = [seccionH1("2", "NECESIDADES DE GESTIÓN DETECTADAS")];
if (neCaptacion) {
  necesidades.push(subtitulo("[NE] Proceso de Captación y Gestión de Clientes (Omnicanalidad)"));
  necesidades.push(parrafo(`Contempla la centralización de los siguientes canales dentro del CRM: ${data.captacionDeClientes.canales.map((c) => CANAL_LABELS[c] || c).join(", ")}.`));
  if (data.captacionDeClientes.canales.includes("whatsapp")) {
    necesidades.push(aviso("WhatsApp requiere Wazzup (licencia externa) — se gestiona en un proceso aparte con horas propias, fuera del alcance de este iCINE."));
  }
}
necesidades.push(subtitulo("[NE] Proceso Comercial"));
necesidades.push(parrafo(`Contempla la estructuración del flujo comercial usando las entidades: ${Object.keys(data.procesoComercial.entidades).map((k) => ENTIDAD_LABELS[k]).join(", ")}.`));
if (neReporteria) {
  necesidades.push(subtitulo("[NE] Reportería y Análisis Comercial"));
  const nombres = [...data.reporteria.prospectos.map((k) => REPORTE_LABELS[k]), ...data.reporteria.negociaciones.map((k) => REPORTE_LABELS[k])];
  necesidades.push(parrafo(`Reportes solicitados: ${nombres.join("; ")}${data.reporteria.otros ? "; " + data.reporteria.otros : ""}.`));
}
if (neChatbot) {
  necesidades.push(subtitulo("[NE] Proceso de Atención mediante Chatbot"));
  necesidades.push(parrafo(data.captacionDeClientes.chatbot.descripcion || "(sin detalle adicional del cliente)"));
  necesidades.push(aviso("Requiere licencia externa de pago, adicional a Bitrix24."));
}
necesidades.push(pageBreak());

// ---------- 3. Recomendaciones ----------
const recModulos = [["CRM", Object.keys(data.procesoComercial.entidades).map((k) => ENTIDAD_LABELS[k]).join(" — "), ""]];
if (neCaptacion) {
  const canalesSinWhatsapp = data.captacionDeClientes.canales.filter((c) => c !== "whatsapp").map((c) => CANAL_LABELS[c] || c);
  recModulos.push(["Contact Center", canalesSinWhatsapp.join(" — "), data.captacionDeClientes.canales.includes("whatsapp") ? "WhatsApp fuera de este iCINE" : ""]);
}
if (neReporteria) recModulos.push(["Reportería", "BI Builder — Informes", ""]);

const recAdicionales = [];
if (neChatbot) recAdicionales.push(["Chatbot", "Proveedor externo (a definir)", "Pago por licencia", data.captacionDeClientes.chatbot.descripcion]);
if (data.captacionDeClientes.canales.includes("whatsapp")) recAdicionales.push(["WhatsApp (Wazzup)", "Wazzup", "Pago por licencia", "Proceso y cotización aparte, con horas propias"]);

const recomendaciones = [
  seccionH1("3", "RECOMENDACIONES FUNCIONALES Y DE INFRAESTRUCTURA"),
  aviso("EDITAR: confirmar la licencia actual de Bitrix24 del cliente — dato no capturado en el formulario."),
  subtitulo("Herramientas nativas de Bitrix24 (incluidas en la licencia)"),
  tabla(["Módulo", "Herramientas", "Observación"], recModulos, [2200, 4800, 2000]),
  ...(recAdicionales.length ? [
    subtitulo("Productos y herramientas adicionales"),
    tabla(["Producto / Servicio", "Proveedor", "Costo / Licencia", "Observación"], recAdicionales, [2200, 2200, 2000, 2600])
  ] : []),
  aviso("Toda integración con sistemas externos (ERP, otros CRM, etc.) mencionada por el cliente queda propuesta para Fase 2 — no se mezcla en el alcance de este iCINE."),
  pageBreak()
];

// ---------- 4. Diseño de la solución ----------
function seccionCaptacion() {
  const out = [seccionH2("NE — Captación de Clientes"), subtitulo("VISTA CLIENTE"), etiqueta("¿Qué se va a implementar?")];
  out.push(parrafo(`Se centralizarán en Bitrix24 los siguientes canales de contacto: ${data.captacionDeClientes.canales.map((c) => CANAL_LABELS[c] || c).join(", ")}. Cada interacción quedará registrada automáticamente, evitando la pérdida de oportunidades entre distintos canales.`));
  if (data.captacionDeClientes.distribucion) out.push(parrafo(`Distribución actual de mensajes: ${data.captacionDeClientes.distribucion}`));
  out.push(etiqueta("Beneficios para tu negocio"));
  out.push(...bullets(["Cero prospectos perdidos entre canales", "Atención centralizada desde Bitrix24", "Trazabilidad desde el primer contacto"]));
  out.push(aviso("EDITAR: personalizar los beneficios de arriba según el cliente."));
  out.push(etiqueta("Diagrama del proceso"));
  out.push(aviso("Diagrama a insertar aparte — no se genera en este documento."));
  out.push(subtitulo("DETALLE TÉCNICO"));
  out.push(etiqueta("Roles y permisos"));
  out.push(tabla(["Rol", "Acceso", "Observación"], ROLES_CAPTACION, [2800, 4200, 2000]));
  out.push(aviso("💡 Plantilla sugerida — todavía no viene de un iCINE de referencia real, ajustar según el cliente."));
  out.push(etiqueta("Acciones a realizar"));
  out.push(...accionesCaptacion());
  return out;
}

function accionesCaptacion() {
  const out = [...bullets(["Configuración de Contact Center"])];
  data.captacionDeClientes.canales.filter((c) => c !== "whatsapp").forEach((c) => {
    out.push(...bullets([`Conexión de ${CANAL_LABELS[c] || c}`], 1));
  });
  return out;
}

function seccionEntidadPipeline(key) {
  const ent = data.procesoComercial.entidades[key];
  const out = [subtitulo(`Etapas de ${ENTIDAD_LABELS[key]}`)];
  out.push(tabla(["Parámetro", "Valor / Configuración"], [
    ["Etapas activas", ent.etapasProgreso.join(" → ") || "(sin definir)"],
    ["Etapas de fallo", ent.etapasFallo.join(" / ") || "(sin definir)"]
  ], [2500, 6500]));
  if (ent.camposPersonalizados.length) {
    out.push(subtitulo(`Mapeo de datos — ${ENTIDAD_LABELS[key]}`));
    out.push(tabla(["Campo", "Tipo de dato", "Origen"], ent.camposPersonalizados.map((f) => [f.nombre, f.tipo, "Nuevo — a crear"]), [3500, 2500, 3000]));
  }

  out.push(subtitulo(`Flujo del proceso — ${ENTIDAD_LABELS[key]}`));
  if (ent.flujo) out.push(parrafo(ent.flujo));
  out.push(aviso("EDITAR: expandir la narrativa de arriba en la tabla de pasos de abajo (agregar o quitar filas según haga falta)."));
  out.push(tabla(
    ["#", "Acción / Descripción", "Responsable", "Herramienta / Módulo", "Condición o Regla"],
    [["1", "", "", "", ""], ["2", "", "", "", ""], ["3", "", "", "", ""]],
    [500, 3200, 1800, 2000, 1500]
  ));

  const etapasTodas = [...ent.etapasProgreso, ...ent.etapasFallo].filter(Boolean);
  out.push(subtitulo(`Automatizaciones — ${ENTIDAD_LABELS[key]}`));
  if (ent.automatizacion) out.push(parrafo(`Lo que comentó el cliente: ${ent.automatizacion}`));
  if (etapasTodas.length) {
    out.push(tabla(["Parámetro", "Valor / Configuración"], etapasTodas.map((e) => [`Etapa: ${e}`, ""]), [3000, 6000]));
  } else {
    out.push(aviso("EDITAR: sin etapas definidas todavía para armar la tabla de automatizaciones."));
  }
  if (key === "cotizaciones" && ent.origenExterno && ent.origenExterno.usaOtroSoftware) {
    out.push(aviso(`Algunos clientes cotizan primero en ${ent.origenExterno.cual}. Continuidad en Bitrix24: ${ent.origenExterno.continuidad}`));
  }
  return out;
}

function seccionEntidadSimple(key) {
  const ent = data.procesoComercial.entidades[key];
  if (!ent.camposPersonalizados.length) return [parrafo(`${ENTIDAD_LABELS[key]}: sin campos personalizados adicionales.`)];
  return [subtitulo(`Campos personalizados — ${ENTIDAD_LABELS[key]}`), tabla(["Campo", "Tipo de dato"], ent.camposPersonalizados.map((f) => [f.nombre, f.tipo]), [5000, 4000])];
}

function seccionProcesoComercial() {
  const out = [seccionH2("NE — Proceso Comercial"), subtitulo("VISTA CLIENTE"), etiqueta("¿Qué se va a implementar?")];
  const entidadesActivas = Object.keys(data.procesoComercial.entidades).map((k) => ENTIDAD_LABELS[k]);
  out.push(parrafo(`Se estructurará el flujo comercial completo en Bitrix24 usando las entidades: ${entidadesActivas.join(", ")}. Desde la calificación inicial hasta el cierre de la venta, cada oportunidad queda organizada, trazable y asignada al equipo comercial.`));
  out.push(etiqueta("Beneficios para tu negocio"));
  out.push(...bullets(["Visibilidad total del pipeline en tiempo real", "Seguimiento sistemático de cada oportunidad", "Análisis claro de motivos de pérdida"]));
  out.push(etiqueta("Diagrama del proceso"));
  out.push(aviso("Diagrama a insertar aparte."));
  out.push(subtitulo("DETALLE TÉCNICO"));
  out.push(etiqueta("Roles y permisos"));
  out.push(tabla(["Rol", "Permisos en Bitrix24", "Observación"], ROLES_PROCESO_COMERCIAL, [2400, 3800, 2800]));
  out.push(etiqueta("Flujo, etapas y campos por entidad"));
  Object.keys(data.procesoComercial.entidades).forEach((key) => {
    if (key === "postventa") return; // tiene su propia sección, no es pipeline ni simple
    const esPipeline = ["prospectos", "negociaciones", "cotizaciones", "facturas"].includes(key);
    out.push(...(esPipeline ? seccionEntidadPipeline(key) : seccionEntidadSimple(key)));
  });
  out.push(etiqueta("Acciones a realizar"));
  out.push(...accionesProcesoComercial());
  return out;
}

function accionesProcesoComercial() {
  const out = [];
  Object.keys(data.procesoComercial.entidades).forEach((key) => {
    if (key === "postventa") return;
    const esPipeline = ["prospectos", "negociaciones", "cotizaciones", "facturas"].includes(key);
    out.push(...bullets([`Creación de ${ENTIDAD_LABELS[key]}`]));
    const sub = esPipeline
      ? ["Creación de etapas + automatizaciones", "Creación de campos + orden de ficha"]
      : ["Creación de campos + orden de ficha"];
    out.push(...bullets(sub, 1));
  });
  return out;
}

function seccionPostventa() {
  const pv = data.procesoComercial.entidades.postventa;
  const out = [seccionH2("NE — Post-venta"), subtitulo("VISTA CLIENTE"), etiqueta("¿Qué se va a implementar?")];
  out.push(parrafo(pv.procesoDescripcion || "(sin descripción del cliente)"));
  if (pv.facturaERP) {
    out.push(parrafo(`Actualmente factura mediante: ${pv.erpNombre || "(no especificado)"}.`));
    if (pv.deseaIntegracion) {
      out.push(parrafo(`Integración deseada con Bitrix24: ${pv.detalleIntegracion || "(sin detalle)"}`));
      out.push(aviso("Esta integración con el ERP externo queda propuesta para Fase 2 — no se implementa dentro de este iCINE."));
    }
  }
  out.push(subtitulo("DETALLE TÉCNICO"));
  out.push(aviso("EDITAR: definir con el cliente el detalle operativo del proceso de post-venta — no capturado a ese nivel en el formulario."));
  return out;
}

function seccionReporteria() {
  const out = [seccionH2("NE — Reportería"), subtitulo("VISTA CLIENTE"), etiqueta("¿Qué se va a implementar?")];
  out.push(parrafo("Se configurarán los reportes solicitados para transformar la información del CRM en indicadores de gestión."));
  out.push(etiqueta("Diagrama del proceso"));
  out.push(aviso("No aplica diagrama de flujo para esta NE — los reportes son vistas de análisis, no procesos operativos."));

  out.push(subtitulo("DETALLE TÉCNICO"));
  out.push(etiqueta("Roles y permisos"));
  out.push(tabla(["Rol", "Acceso", "Observación"], ROLES_REPORTERIA, [2800, 4200, 2000]));
  out.push(etiqueta("Flujo del proceso"));
  out.push(aviso("No aplica flujo de proceso para esta NE — los reportes son consultas sobre la data existente en el CRM."));

  const seleccionados = [
    ...data.reporteria.prospectos.map((k) => ({ key: k, meta: REPORTES_META[k] })),
    ...data.reporteria.negociaciones.map((k) => ({ key: k, meta: REPORTES_META[k] }))
  ];
  out.push(etiqueta("Reportes a configurar"));
  out.push(aviso("Estos reportes utilizan las herramientas nativas de Bitrix24 (BI Builder) — no requieren desarrollo adicional, solo configuración y personalización de las vistas."));
  seleccionados.forEach(({ key, meta }, i) => {
    out.push(subtitulo(`Reporte ${i + 1} — ${meta ? meta.label : key}`));
    out.push(tabla(["Parámetro", "Valor / Configuración"], [
      ["Qué muestra", meta ? meta.queMuestra : ""],
      ["Entidad", meta ? meta.entidad : ""],
      ["Filtros clave", meta ? meta.filtros : ""],
      ["Tipo de visualización", meta ? meta.tipoVisualizacion : ""]
    ], [2800, 6200]));
  });
  if (data.reporteria.otros) {
    out.push(subtitulo("Reporte adicional solicitado por el cliente"));
    out.push(parrafo(data.reporteria.otros));
    out.push(aviso("EDITAR: definir Qué muestra / Entidad / Filtros clave / Tipo de visualización para este reporte adicional."));
  }

  out.push(etiqueta("Mapeo de datos"));
  out.push(aviso("No aplica creación de nuevos campos para esta NE — los reportes se construyen sobre los campos ya configurados en Proceso Comercial."));

  out.push(etiqueta("Acciones a realizar"));
  out.push(...accionesReporteria());
  return out;
}

function accionesReporteria() {
  const out = [...bullets(["Permisos en BI Builder"])];
  const seleccionados = [...data.reporteria.prospectos, ...data.reporteria.negociaciones];
  seleccionados.forEach((key, i) => {
    const meta = REPORTES_META[key];
    out.push(...bullets([`Configuración del Reporte ${i + 1} — ${meta ? meta.label : key}`]));
  });
  if (data.reporteria.otros) out.push(...bullets(["Configuración del reporte adicional solicitado"]));
  return out;
}

function seccionChatbot() {
  const out = [seccionH2("NE — Chatbot"), subtitulo("VISTA CLIENTE"), etiqueta("¿Qué se va a implementar?")];
  out.push(parrafo(data.captacionDeClientes.chatbot.descripcion || "(sin detalle del cliente)"));
  out.push(aviso("Requiere licencia externa de pago — se recomienda cotizar aparte según proveedor y cantidad de flujos."));
  out.push(subtitulo("DETALLE TÉCNICO"));
  out.push(aviso("EDITAR: definir flujos, mensajes y lógica de derivación — no capturado en el formulario."));
  return out;
}

const diseno = [seccionH1("4", "DISEÑO DE LA SOLUCIÓN")];
if (neCaptacion) diseno.push(...seccionCaptacion(), pageBreak());
diseno.push(...seccionProcesoComercial(), pageBreak());
if (neReporteria) diseno.push(...seccionReporteria(), pageBreak());
if (neChatbot) diseno.push(...seccionChatbot(), pageBreak());
if (nePostventa) diseno.push(...seccionPostventa(), pageBreak());

// ---------- 5. Resumen de actividades ----------
const resumenActividades = [
  seccionH1("5", "RESUMEN DE ACTIVIDADES"),
  aviso("EDITAR: estimar horas DICA/CIP por actividad — el formulario no calcula horas, sigue siendo criterio del consultor."),
  tabla(["#", "NE", "Actividad", "Horas DICA", "Capacitación"], [["1", "-", "(pendiente de estimar)", "-", "-"]]),
  pageBreak()
];

// ---------- 6. Glosario ----------
const glosarioBase = [
  ["Bitrix24", "Plataforma de gestión empresarial que incluye CRM, comunicación, automatización y gestión de proyectos."],
  ["CRM", "Customer Relationship Management. Sistema de gestión de relaciones con clientes."],
  ["iCINE", "Informe de Consultoría para la Implementación de Necesidad Específica."],
  ["NE", "Necesidad Específica. Cada módulo o proceso a desarrollar dentro del iCINE."],
  ["Pipeline", "Representación visual del flujo de oportunidades comerciales, desde el primer contacto hasta el cierre."],
  ["Canal Abierto", "Funcionalidad de Bitrix24 que integra canales de comunicación externos con el CRM."]
];
if (neChatbot) glosarioBase.push(["Chatbot", "Asistente automatizado que atiende el primer contacto y deriva a un responsable humano cuando corresponde."]);
if (data.captacionDeClientes.canales.includes("whatsapp")) glosarioBase.push(["Wazzup", "Plataforma externa de pago que conecta WhatsApp con Bitrix24."]);

const glosario = [seccionH1("6", "GLOSARIO"), tabla(["Término", "Definición"], glosarioBase, [2200, 6800]), pageBreak()];

// ---------- 7. Firmas ----------
const firmas = [
  seccionH1("7", "APROBACIÓN Y FIRMAS"),
  parrafo("Las partes abajo firmantes declaran haber leído, comprendido y aprobado el contenido del presente iCINE."),
  tabla(["Cliente", "Consultor Comercial"], [["_______________________", "_______________________"]], [4500, 4500])
];

// ---------- ensamblar documento ----------
const doc = new Document({
  styles: {
    default: { document: { run: { font: FONT, size: 22 } } }
  },
  sections: [{
    properties: { page: { margin: PAGE_MARGINS } },
    headers: { default: buildHeader() },
    footers: { default: buildFooter() },
    children: [
      ...portada, ...indice, ...antecedentes, ...necesidades, ...recomendaciones,
      ...diseno, ...resumenActividades, ...glosario, ...firmas
    ]
  }]
});

const buf = await Packer.toBuffer(doc);
  return { buffer: buf, nes: nes.map((n) => n.label), cliente: data.cliente };
}
