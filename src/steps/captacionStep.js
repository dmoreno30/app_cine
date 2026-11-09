import {
  CANALES, CAPTACION_TEXTOS, conCliente,
  CAP_CANAL_DEFAULTS, capDescripcion, CAP_ACCION_MENSAJE, CAP_DISTRIBUCION, CAP_SINO,
  CAP_FORM_TITULO, CAP_FORM_DESC, CAP_FORM_CREAR, CAP_FORM_CAMPOS, CAP_WIDGET_TITULO,
  CAP_ACTIVIDADES_DEF, CAP_CIP_DEF
} from "../data/config.js";
import { escapeHtml, escapeAttr } from "../utils.js";

const cfgDe = (tipo) => CANALES.find((c) => c.key === tipo) || {};
const labelDe = (tipo) => cfgDe(tipo).label || tipo;
const iconDe = (tipo) => cfgDe(tipo).icon || "ti-plug-connected";
// Canales de mensajería directa (set completo de campos)
const MENSAJERIA = new Set(["facebook", "instagram", "chatvivo", "telegram", "tiktok", "linkedin", "manual", "otros"]);
const esConector = (tipo) => tipo === "tiktok" || tipo === "linkedin";

function sel(attrs, options, value, placeholder) {
  const opts = [`<option value="">${placeholder || "Selecciona…"}</option>`]
    .concat(options.map((o) => `<option value="${escapeAttr(o)}" ${value === o ? "selected" : ""}>${escapeHtml(o)}</option>`)).join("");
  return `<select ${attrs}>${opts}</select>`;
}
function campo(label, inner) {
  return `<div class="rep-field"><label>${label}</label>${inner}</div>`;
}

// Defaults por canal (editable): el usuario puede sobrescribir.
function defaultsCanal(tipo, cliente) {
  const base = { nombre: "", descripcion: "", consideracion: "", colapsado: false };
  if (tipo === "formularios") {
    return { ...base, nombre: CAP_FORM_TITULO, descripcion: conCliente(CAP_FORM_DESC, cliente), crearQue: [], camposForm: CAP_FORM_CAMPOS.slice() };
  }
  if (tipo === "widget") {
    return { ...base, nombre: conCliente(CAP_WIDGET_TITULO, cliente), url: "" };
  }
  const d = CAP_CANAL_DEFAULTS[tipo] || CAP_CANAL_DEFAULTS.otros;
  const inst = {
    ...base,
    nombre: d.titulo,
    descripcion: capDescripcion(d.medio),
    asignacion: "Equipo de ventas",
    accionMensaje: "",
    origen: "",
    transferenciaID: "Sí",
    chatbot: "",
    chatbotNombre: "",
    distribucion: ""
  };
  if (esConector(tipo)) { inst.necesitaConector = ""; inst.conector = ""; inst.conectorProceso = ""; inst.conectorProveedor = ""; inst.conectorLicencia = ""; }
  return inst;
}

// Rellena valores por defecto solo en campos aún no definidos (no pisa ediciones).
function seedCaptacion(state) {
  const cap = state.captacion;
  const cli = state.cliente || "";
  if (!Array.isArray(cap.canales)) cap.canales = [];
  if (!Array.isArray(cap.conexiones)) cap.conexiones = [];
  if (!(cap.intro || "").trim()) cap.intro = conCliente(CAPTACION_TEXTOS.intro, cli);
  if (!cap.conexiones.length) cap.conexiones = CAP_ACTIVIDADES_DEF.map((a) => ({ titulo: a.titulo, tiempo: a.tiempo }));
  if (!state.consideraciones) state.consideraciones = {};
  if (!(state.consideraciones.captacion || "").trim()) state.consideraciones.captacion = conCliente(CAPTACION_TEXTOS.consideracionGeneral, cli);
  if (!state.cip) state.cip = {};
  if (!Array.isArray(state.cip.captacion) || !state.cip.captacion.length) state.cip.captacion = CAP_CIP_DEF.map((c) => ({ titulo: c.titulo, tiempo: c.tiempo }));
  cap.canales.forEach((c) => {
    const def = defaultsCanal(c.tipo, cli);
    Object.keys(def).forEach((k) => { if (c[k] === undefined) c[k] = Array.isArray(def[k]) ? def[k].slice() : def[k]; });
  });
}

function renderCanalCard(c, idx, cliente) {
  const cfg = cfgDe(c.tipo);
  const col = !!c.colapsado;
  const header = `
    <div class="rep-head">
      <button class="icon-btn" data-cap-toggle="${idx}" title="${col ? "Mostrar" : "Ocultar"}"><i class="ti ti-chevron-${col ? "right" : "down"}"></i></button>
      <i class="ti ${iconDe(c.tipo)}" style="font-size:18px;color:#056AA1"></i>
      <input type="text" class="rep-nombre" data-cap-nombre="${idx}" value="${escapeAttr(c.nombre || "")}" placeholder="${escapeAttr(labelDe(c.tipo))}">
      <button class="icon-btn" data-cap-remove="${idx}" title="Quitar canal"><i class="ti ti-trash"></i></button>
    </div>`;
  if (col) return `<div class="rep-card">${header}</div>`;

  // Widget
  if (cfg.esWidget) {
    return `<div class="rep-card">${header}
      ${campo("Descripción (va al iCINE)", `<textarea data-cap-desc="${idx}" rows="3">${escapeHtml(c.descripcion || "")}</textarea>`)}
      ${campo(`Página web donde se vincula <span style="color:#c00">*</span>`, `<input type="text" data-cap-url="${idx}" value="${escapeAttr(c.url || "")}" placeholder="https://...">`)}
    </div>`;
  }

  // Formularios del CRM
  if (c.tipo === "formularios") {
    const chips = CAP_FORM_CREAR.map((o) => `<div class="canal-chip ${(c.crearQue || []).includes(o) ? "on" : ""}" data-cap-crear="${idx}|${escapeAttr(o)}">${escapeHtml(o)}</div>`).join("");
    const campos = (c.camposForm || []).map((nombre, i) => `
      <div class="row-flex">
        <input type="text" data-capf="${idx}" data-capf-i="${i}" value="${escapeAttr(nombre)}" placeholder="Campo del formulario">
        <button class="icon-btn" data-capf-remove="${idx}|${i}"><i class="ti ti-x"></i></button>
      </div>`).join("");
    return `<div class="rep-card">${header}
      ${campo("Descripción (va al iCINE)", `<textarea data-cap-desc="${idx}" rows="3">${escapeHtml(c.descripcion || "")}</textarea>`)}
      ${campo("Consideraciones", `<input type="text" data-cap-f="${idx}" data-cap-prop="consideracion" value="${escapeAttr(c.consideracion || "")}">`)}
      ${campo("¿Qué debería crear el formulario?", `<div class="canal-grid">${chips}</div>`)}
      ${campo("Campos del formulario", `${campos}<button class="add-btn small" data-capf-add="${idx}"><i class="ti ti-plus" style="margin-right:4px"></i>Agregar campo</button>`)}
    </div>`;
  }

  // Mensajería directa (FB, IG, chat en vivo, telegram, tiktok, linkedin, manual, otros)
  let conectorBlock = "";
  if (esConector(c.tipo)) {
    const abierto = c.necesitaConector === "Sí";
    conectorBlock = `
      ${campo("¿Necesita un conector externo? <span style=\"color:#c00\">*</span>", sel(`data-cap-sel="${idx}" data-cap-prop="necesitaConector"`, CAP_SINO, c.necesitaConector || "", "Selecciona…"))}
      ${abierto ? `
        ${campo("Proceso del conector", `<textarea data-cap-f="${idx}" data-cap-prop="conectorProceso" rows="2">${escapeHtml(c.conectorProceso || "")}</textarea>`)}
        ${campo("Proveedor del conector", `<input type="text" data-cap-f="${idx}" data-cap-prop="conectorProveedor" value="${escapeAttr(c.conectorProveedor || "")}" placeholder="Ej. Albato, Wazzup…">`)}
        ${campo("Licencia del conector (gratis o de pago)", `<input type="text" data-cap-f="${idx}" data-cap-prop="conectorLicencia" value="${escapeAttr(c.conectorLicencia || "")}" placeholder="Ej. Gratuito / Pago mensual">`)}
      ` : ""}`;
  }
  const chatbotNombre = c.chatbot === "Sí"
    ? campo("Nombre del chatbot", `<input type="text" data-cap-f="${idx}" data-cap-prop="chatbotNombre" value="${escapeAttr(c.chatbotNombre || "")}" placeholder="Nombre del chatbot">`)
    : "";

  return `<div class="rep-card">${header}
    ${campo("Descripción (va al iCINE)", `<textarea data-cap-desc="${idx}" rows="3">${escapeHtml(c.descripcion || "")}</textarea>`)}
    ${campo("Asignación de mensajes a", `<input type="text" data-cap-f="${idx}" data-cap-prop="asignacion" value="${escapeAttr(c.asignacion || "")}" placeholder="Equipo de ventas">`)}
    ${campo("Consideraciones", `<input type="text" data-cap-f="${idx}" data-cap-prop="consideracion" value="${escapeAttr(c.consideracion || "")}">`)}
    ${campo("Acción al llegar el mensaje", sel(`data-cap-sel="${idx}" data-cap-prop="accionMensaje"`, CAP_ACCION_MENSAJE, c.accionMensaje || "", "Selecciona…"))}
    ${campo("Origen", `<input type="text" data-cap-f="${idx}" data-cap-prop="origen" value="${escapeAttr(c.origen || "")}">`)}
    ${campo("Transferencia de la consulta a la persona responsable si se reconoce el ID del cliente", sel(`data-cap-sel="${idx}" data-cap-prop="transferenciaID"`, CAP_SINO, c.transferenciaID || "", "Selecciona…"))}
    ${campo("¿Chatbot?", sel(`data-cap-sel="${idx}" data-cap-prop="chatbot"`, CAP_SINO, c.chatbot || "", "Selecciona…"))}
    ${chatbotNombre}
    ${campo("Distribuir comunicaciones entre las personas responsables", sel(`data-cap-sel="${idx}" data-cap-prop="distribucion"`, CAP_DISTRIBUCION, c.distribucion || "", "Selecciona…"))}
    ${conectorBlock}
  </div>`;
}

export function renderCaptacionStep(state) {
  const cap = state.captacion;
  const cli = state.cliente || "";
  seedCaptacion(state);

  const menu = CANALES.map((c) => `<div class="canal-chip" data-cap-add="${c.key}"><i class="ti ${c.icon}"></i>${c.label}</div>`).join("");
  const cards = cap.canales.length
    ? cap.canales.map((c, i) => renderCanalCard(c, i, cli)).join("")
    : '<p style="font-size:13px;color:#888;margin:4px 0">Todavía no agregaste canales. Elegí uno del menú (podés sumar varios del mismo tipo).</p>';

  const conex = cap.conexiones.map((x, i) => `
    <div class="row-flex">
      <input type="text" data-conx-i="${i}" data-conx-prop="titulo" value="${escapeAttr(x.titulo || "")}" placeholder="Actividad">
      <input type="text" data-conx-i="${i}" data-conx-prop="tiempo" value="${escapeAttr(x.tiempo || "")}" placeholder="Tiempo" style="max-width:150px">
      <button class="icon-btn" data-conx-remove="${i}"><i class="ti ti-x"></i></button>
    </div>`).join("");

  const cip = (state.cip && Array.isArray(state.cip.captacion)) ? state.cip.captacion : [];
  const capRows = cip.map((c, i) => `
    <div class="row-flex">
      <input type="text" data-capcip-i="${i}" data-capcip-prop="titulo" value="${escapeAttr(c.titulo || "")}" placeholder="Título de la capacitación">
      <input type="text" data-capcip-i="${i}" data-capcip-prop="tiempo" value="${escapeAttr(c.tiempo || "")}" placeholder="Tiempo" style="max-width:150px">
      <button class="icon-btn" data-capcip-remove="${i}"><i class="ti ti-x"></i></button>
    </div>`).join("");

  return `
    <p class="step-title">Captación de clientes</p>
    <p class="step-helper">Cada canal trae campos con valores por defecto, todos editables. Lo que escribas va al iCINE.</p>

    <div class="field-block">
      <label class="field-label">Texto introductorio <span style="font-weight:400;color:var(--text-secondary)">— editable, va al iCINE</span></label>
      <textarea data-cap-intro rows="6">${escapeHtml(cap.intro || "")}</textarea>
    </div>

    <div class="field-block">
      <label class="field-label">Canales disponibles <span style="font-weight:400;color:var(--text-secondary)">— clic para agregar</span></label>
      <div class="canal-grid">${menu}</div>
    </div>

    <div class="field-block">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
        <label class="field-label" style="margin:0">Canales conectados ${cap.canales.length ? `(${cap.canales.length})` : ""}</label>
        ${cap.canales.length > 1 ? '<button class="rep-cat-btn" data-cap-colapsar><i class="ti ti-chevrons-up"></i> Minimizar todos</button>' : ""}
      </div>
      ${cards}
    </div>

    <div class="field-block" style="border:1px solid #e6e6e6;border-radius:12px;padding:14px;background:#fafafa">
      <label class="field-label"><i class="ti ti-link"></i> Actividades de creación y conexión de canales en general <span style="font-weight:400;color:var(--text-secondary)">— editable, va al iCINE</span></label>
      ${conex || '<p style="font-size:12px;color:#999;margin:4px 0">Sin actividades.</p>'}
      <button class="add-btn" data-conx-add><i class="ti ti-plus" style="margin-right:4px"></i>Agregar actividad</button>
    </div>

    <div class="field-block" style="border:1px solid #e6e6e6;border-radius:12px;padding:14px;background:#fafafa">
      <label class="field-label"><i class="ti ti-school"></i> Capacitación (CIP) <span style="font-weight:400;color:var(--text-secondary)">— editable</span></label>
      ${capRows}
      <button class="add-btn" data-capcip-add><i class="ti ti-plus" style="margin-right:4px"></i>Agregar capacitación</button>
    </div>

    <div class="field-block" style="border:1px solid #e6e6e6;border-radius:12px;padding:14px;background:#fafafa">
      <label class="field-label"><i class="ti ti-note"></i> Consideraciones <span style="font-weight:400;color:var(--text-secondary)">— editable, va al iCINE</span></label>
      <textarea data-cap-consideraciones rows="6">${escapeHtml((state.consideraciones && state.consideraciones.captacion) || "")}</textarea>
    </div>`;
}

export function attachCaptacionListeners(container, state, onChange) {
  const cap = state.captacion;
  const cli = state.cliente || "";
  seedCaptacion(state);

  const intro = container.querySelector("[data-cap-intro]");
  if (intro) intro.addEventListener("input", (e) => { cap.intro = e.target.value; onChange({ rerender: false }); });
  const cons = container.querySelector("[data-cap-consideraciones]");
  if (cons) cons.addEventListener("input", (e) => { if (!state.consideraciones) state.consideraciones = {}; state.consideraciones.captacion = e.target.value; onChange({ rerender: false }); });

  container.querySelectorAll("[data-cap-add]").forEach((el) => el.addEventListener("click", () => {
    const tipo = el.getAttribute("data-cap-add");
    cap.canales.push({ tipo, ...defaultsCanal(tipo, cli) });
    onChange({ rerender: true });
  }));
  container.querySelectorAll("[data-cap-remove]").forEach((el) => el.addEventListener("click", () => { cap.canales.splice(parseInt(el.getAttribute("data-cap-remove"), 10), 1); onChange({ rerender: true }); }));
  container.querySelectorAll("[data-cap-toggle]").forEach((el) => el.addEventListener("click", () => { const i = parseInt(el.getAttribute("data-cap-toggle"), 10); cap.canales[i].colapsado = !cap.canales[i].colapsado; onChange({ rerender: true }); }));
  const colAll = container.querySelector("[data-cap-colapsar]");
  if (colAll) colAll.addEventListener("click", () => { cap.canales.forEach((c) => { c.colapsado = true; }); onChange({ rerender: true }); });

  container.querySelectorAll("[data-cap-nombre]").forEach((el) => el.addEventListener("input", (e) => { cap.canales[parseInt(el.getAttribute("data-cap-nombre"), 10)].nombre = e.target.value; onChange({ rerender: false }); }));
  container.querySelectorAll("[data-cap-url]").forEach((el) => el.addEventListener("input", (e) => { cap.canales[parseInt(el.getAttribute("data-cap-url"), 10)].url = e.target.value; onChange({ rerender: false }); }));
  container.querySelectorAll("[data-cap-desc]").forEach((el) => el.addEventListener("input", (e) => { cap.canales[parseInt(el.getAttribute("data-cap-desc"), 10)].descripcion = e.target.value; onChange({ rerender: false }); }));

  // Campos de texto genéricos por canal (sin rerender)
  container.querySelectorAll("[data-cap-f]").forEach((el) => el.addEventListener("input", (e) => {
    cap.canales[parseInt(el.getAttribute("data-cap-f"), 10)][el.getAttribute("data-cap-prop")] = e.target.value; onChange({ rerender: false });
  }));
  // Listas (selects): rerender para abrir campos condicionales
  container.querySelectorAll("[data-cap-sel]").forEach((el) => el.addEventListener("change", (e) => {
    cap.canales[parseInt(el.getAttribute("data-cap-sel"), 10)][el.getAttribute("data-cap-prop")] = e.target.value; onChange({ rerender: true });
  }));

  // Formularios: "qué crear" (multi) y campos del formulario
  container.querySelectorAll("[data-cap-crear]").forEach((el) => el.addEventListener("click", () => {
    const [i, opt] = el.getAttribute("data-cap-crear").split("|");
    const c = cap.canales[parseInt(i, 10)]; if (!Array.isArray(c.crearQue)) c.crearQue = [];
    const pos = c.crearQue.indexOf(opt);
    if (pos >= 0) c.crearQue.splice(pos, 1); else c.crearQue.push(opt);
    onChange({ rerender: true });
  }));
  container.querySelectorAll("[data-capf]").forEach((el) => el.addEventListener("input", (e) => {
    const i = parseInt(el.getAttribute("data-capf"), 10), j = parseInt(el.getAttribute("data-capf-i"), 10);
    cap.canales[i].camposForm[j] = e.target.value; onChange({ rerender: false });
  }));
  container.querySelectorAll("[data-capf-add]").forEach((el) => el.addEventListener("click", () => {
    const i = parseInt(el.getAttribute("data-capf-add"), 10);
    (cap.canales[i].camposForm = cap.canales[i].camposForm || []).push(""); onChange({ rerender: true });
  }));
  container.querySelectorAll("[data-capf-remove]").forEach((el) => el.addEventListener("click", () => {
    const [i, j] = el.getAttribute("data-capf-remove").split("|");
    cap.canales[parseInt(i, 10)].camposForm.splice(parseInt(j, 10), 1); onChange({ rerender: true });
  }));

  // Actividades (editable)
  container.querySelectorAll("[data-conx-prop]").forEach((el) => el.addEventListener("input", (e) => {
    cap.conexiones[parseInt(el.getAttribute("data-conx-i"), 10)][el.getAttribute("data-conx-prop")] = e.target.value; onChange({ rerender: false });
  }));
  const addConx = container.querySelector("[data-conx-add]");
  if (addConx) addConx.addEventListener("click", () => { cap.conexiones.push({ titulo: "", tiempo: "" }); onChange({ rerender: true }); });
  container.querySelectorAll("[data-conx-remove]").forEach((el) => el.addEventListener("click", () => { cap.conexiones.splice(parseInt(el.getAttribute("data-conx-remove"), 10), 1); onChange({ rerender: true }); }));

  // Capacitación (editable)
  const cipArr = () => { if (!state.cip) state.cip = {}; if (!Array.isArray(state.cip.captacion)) state.cip.captacion = []; return state.cip.captacion; };
  container.querySelectorAll("[data-capcip-prop]").forEach((el) => el.addEventListener("input", (e) => {
    const i = parseInt(el.getAttribute("data-capcip-i"), 10); const arr = cipArr();
    if (!arr[i]) arr[i] = { titulo: "", tiempo: "" };
    arr[i][el.getAttribute("data-capcip-prop")] = e.target.value; onChange({ rerender: false });
  }));
  const addCip = container.querySelector("[data-capcip-add]");
  if (addCip) addCip.addEventListener("click", () => { cipArr().push({ titulo: "", tiempo: "" }); onChange({ rerender: true }); });
  container.querySelectorAll("[data-capcip-remove]").forEach((el) => el.addEventListener("click", () => { cipArr().splice(parseInt(el.getAttribute("data-capcip-remove"), 10), 1); onChange({ rerender: true }); }));
}
