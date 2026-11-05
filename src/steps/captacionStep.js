import { CANALES, CAPTACION_TEXTOS, CAPTACION_ACTIVIDADES, CAPTACION_CIP, conCliente } from "../data/config.js";
import { escapeHtml, escapeAttr } from "../utils.js";

const cfgDe = (tipo) => CANALES.find((c) => c.key === tipo) || {};
const labelDe = (tipo) => cfgDe(tipo).label || tipo;
const iconDe = (tipo) => cfgDe(tipo).icon || "ti-plug-connected";
const USA_DESC = new Set(["facebook", "instagram", "formularios"]); // canales con descripción + consideración por defecto

// Carga los textos estándar como VALOR por defecto (editable) solo si están vacíos.
function seedCaptacion(state) {
  const cap = state.captacion;
  const cli = state.cliente || "";
  if (!Array.isArray(cap.canales)) cap.canales = [];
  if (!Array.isArray(cap.conexiones)) cap.conexiones = [];
  if (!(cap.intro || "").trim()) cap.intro = conCliente(CAPTACION_TEXTOS.intro, cli);
  if (!cap.conexiones.length) cap.conexiones = CAPTACION_ACTIVIDADES.map((a) => ({ titulo: a, tiempo: "" }));
  if (!state.consideraciones) state.consideraciones = {};
  if (!(state.consideraciones.captacion || "").trim()) state.consideraciones.captacion = conCliente(CAPTACION_TEXTOS.consideracionGeneral, cli);
  if (!state.cip) state.cip = {};
  if (!Array.isArray(state.cip.captacion) || !state.cip.captacion.length) state.cip.captacion = CAPTACION_CIP.map((c) => ({ titulo: c.titulo, tiempo: c.tiempo }));
  // Descripción/consideración por canal (FB/IG/Formularios) si no existe todavía.
  cap.canales.forEach((c) => {
    if (USA_DESC.has(c.tipo)) {
      if (c.descripcion === undefined) c.descripcion = c.tipo === "formularios" ? conCliente(CAPTACION_TEXTOS.formularios, cli) : CAPTACION_TEXTOS.facebook;
      if (c.consideracion === undefined) c.consideracion = c.tipo === "formularios" ? CAPTACION_TEXTOS.formulariosConsideracion : CAPTACION_TEXTOS.facebookConsideracion;
    }
  });
}

function renderCanalCard(c, idx) {
  const cfg = cfgDe(c.tipo);
  const col = !!c.colapsado;
  const ph = cfg.necesitaNombre ? "Nombre del canal (requerido)" : "Nombre / etiqueta";
  const header = `
    <div class="rep-head">
      <button class="icon-btn" data-cap-toggle="${idx}" title="${col ? "Mostrar" : "Ocultar"}"><i class="ti ti-chevron-${col ? "right" : "down"}"></i></button>
      <i class="ti ${iconDe(c.tipo)}" style="font-size:18px;color:#056AA1"></i>
      <input type="text" class="rep-nombre" data-cap-nombre="${idx}" value="${escapeAttr(c.nombre || "")}" placeholder="${escapeAttr(labelDe(c.tipo))} — ${ph}">
      <button class="icon-btn" data-cap-remove="${idx}" title="Quitar canal"><i class="ti ti-trash"></i></button>
    </div>`;
  if (col) return `<div class="rep-card">${header}</div>`;

  // FB / IG / Formularios → descripción y consideración (editables, con texto por defecto)
  if (USA_DESC.has(c.tipo)) {
    return `
      <div class="rep-card">${header}
        <div class="rep-field"><label>Descripción (va al iCINE)</label>
          <textarea data-cap-desc="${idx}" rows="3">${escapeHtml(c.descripcion || "")}</textarea></div>
        <div class="rep-field"><label>Consideración</label>
          <input type="text" data-cap-consid="${idx}" value="${escapeAttr(c.consideracion || "")}"></div>
      </div>`;
  }

  // Widget → página web (editable, sin tiempo)
  if (cfg.esWidget) {
    return `
      <div class="rep-card">${header}
        <div class="rep-field"><label>Página web donde se vincula <span style="color:#c00">*</span></label>
          <input type="text" data-cap-url="${idx}" value="${escapeAttr(c.url || "")}" placeholder="https://..."></div>
      </div>`;
  }

  // TikTok / LinkedIn → conector; resto → flujo simple (en columnas, sin tiempo)
  const conectorField = cfg.necesitaConector ? `
    <div class="rep-field"><label>¿Con qué conector externo se hará la conexión? <span style="color:#c00">*</span></label>
      <input type="text" data-cap-conector="${idx}" value="${escapeAttr(c.conector || "")}" placeholder="Ej. conector de un tercero">
    </div>` : "";
  const pasos = (c.flujo || []).map((p, i) => `
    <div class="paso-item">
      <div class="paso-num">${i + 1}</div>
      <div class="paso-campos">
        <div class="paso-campo"><label class="paso-lbl">¿Qué se realiza en este paso?</label>
          <textarea data-cf="${idx}" data-cf-i="${i}" data-cf-prop="accion" rows="2">${escapeHtml(p.accion || "")}</textarea></div>
        <div class="paso-grid-2">
          <div class="paso-campo"><label class="paso-lbl">Responsable</label>
            <input type="text" data-cf="${idx}" data-cf-i="${i}" data-cf-prop="responsable" value="${escapeAttr(p.responsable || "")}"></div>
          <div class="paso-campo"><label class="paso-lbl">Condición o regla</label>
            <input type="text" data-cf="${idx}" data-cf-i="${i}" data-cf-prop="condicion" value="${escapeAttr(p.condicion || "")}" placeholder="Opcional"></div>
        </div>
      </div>
      <button class="icon-btn" data-cf-remove="${idx}|${i}"><i class="ti ti-x"></i></button>
    </div>`).join("");
  return `
    <div class="rep-card">${header}
      ${conectorField}
      <p class="step-helper" style="margin:2px 0 8px">Flujo de este canal, paso a paso (sin tiempos).</p>
      ${pasos || '<p style="font-size:12px;color:#999;margin:4px 0">Sin pasos todavía.</p>'}
      <button class="add-btn small" data-cf-add="${idx}"><i class="ti ti-plus" style="margin-right:4px"></i>Agregar paso</button>
    </div>`;
}

export function renderCaptacionStep(state) {
  const cap = state.captacion;
  seedCaptacion(state);

  const menu = CANALES.map((c) => `<div class="canal-chip" data-cap-add="${c.key}"><i class="ti ${c.icon}"></i>${c.label}</div>`).join("");
  const cards = cap.canales.length
    ? cap.canales.map((c, i) => renderCanalCard(c, i)).join("")
    : '<p style="font-size:13px;color:#888;margin:4px 0">Todavía no agregaste canales. Elegí uno del menú (podés sumar varios del mismo tipo).</p>';

  const conex = cap.conexiones.map((x, i) => `
    <div class="row-flex">
      <input type="text" data-conx-i="${i}" data-conx-prop="titulo" value="${escapeAttr(x.titulo || "")}" placeholder="Actividad">
      <input type="text" data-conx-i="${i}" data-conx-prop="tiempo" value="${escapeAttr(x.tiempo || "")}" placeholder="Tiempo (opcional)" style="max-width:150px">
      <button class="icon-btn" data-conx-remove="${i}"><i class="ti ti-x"></i></button>
    </div>`).join("");

  const cip = (state.cip && Array.isArray(state.cip.captacion)) ? state.cip.captacion : [];
  const capRows = cip.map((c, i) => `
    <div class="row-flex">
      <input type="text" data-capcip-i="${i}" data-capcip-prop="titulo" value="${escapeAttr(c.titulo || "")}" placeholder="Título de la capacitación">
      <input type="text" data-capcip-i="${i}" data-capcip-prop="tiempo" value="${escapeAttr(c.tiempo || "")}" placeholder="Tiempo (ej. 1 hora)" style="max-width:150px">
      <button class="icon-btn" data-capcip-remove="${i}"><i class="ti ti-x"></i></button>
    </div>`).join("");

  return `
    <p class="step-title">Captación de clientes</p>
    <p class="step-helper">Los textos vienen con un contenido estándar que podés editar libremente. Todo lo que escribas acá va al iCINE.</p>

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
  seedCaptacion(state);

  const intro = container.querySelector("[data-cap-intro]");
  if (intro) intro.addEventListener("input", (e) => { cap.intro = e.target.value; onChange({ rerender: false }); });
  const cons = container.querySelector("[data-cap-consideraciones]");
  if (cons) cons.addEventListener("input", (e) => { if (!state.consideraciones) state.consideraciones = {}; state.consideraciones.captacion = e.target.value; onChange({ rerender: false }); });

  container.querySelectorAll("[data-cap-add]").forEach((el) => el.addEventListener("click", () => {
    const tipo = el.getAttribute("data-cap-add"); const cfg = CANALES.find((c) => c.key === tipo) || {};
    const inst = { tipo, nombre: "", colapsado: false };
    if (cfg.esWidget) { inst.url = ""; inst.flujo = []; }
    else if (USA_DESC.has(tipo)) {
      inst.flujo = [];
      inst.descripcion = tipo === "formularios" ? conCliente(CAPTACION_TEXTOS.formularios, state.cliente) : CAPTACION_TEXTOS.facebook;
      inst.consideracion = tipo === "formularios" ? CAPTACION_TEXTOS.formulariosConsideracion : CAPTACION_TEXTOS.facebookConsideracion;
    } else { if (cfg.necesitaConector) inst.conector = ""; inst.flujo = [{ accion: "", responsable: "", condicion: "", tiempo: "" }]; }
    cap.canales.push(inst); onChange({ rerender: true });
  }));
  container.querySelectorAll("[data-cap-remove]").forEach((el) => el.addEventListener("click", () => { cap.canales.splice(parseInt(el.getAttribute("data-cap-remove"), 10), 1); onChange({ rerender: true }); }));
  container.querySelectorAll("[data-cap-toggle]").forEach((el) => el.addEventListener("click", () => { const i = parseInt(el.getAttribute("data-cap-toggle"), 10); cap.canales[i].colapsado = !cap.canales[i].colapsado; onChange({ rerender: true }); }));
  const colAll = container.querySelector("[data-cap-colapsar]");
  if (colAll) colAll.addEventListener("click", () => { cap.canales.forEach((c) => { c.colapsado = true; }); onChange({ rerender: true }); });

  container.querySelectorAll("[data-cap-nombre]").forEach((el) => el.addEventListener("input", (e) => { cap.canales[parseInt(el.getAttribute("data-cap-nombre"), 10)].nombre = e.target.value; onChange({ rerender: false }); }));
  container.querySelectorAll("[data-cap-url]").forEach((el) => el.addEventListener("input", (e) => { cap.canales[parseInt(el.getAttribute("data-cap-url"), 10)].url = e.target.value; onChange({ rerender: false }); }));
  container.querySelectorAll("[data-cap-conector]").forEach((el) => el.addEventListener("input", (e) => { cap.canales[parseInt(el.getAttribute("data-cap-conector"), 10)].conector = e.target.value; onChange({ rerender: false }); }));
  container.querySelectorAll("[data-cap-desc]").forEach((el) => el.addEventListener("input", (e) => { cap.canales[parseInt(el.getAttribute("data-cap-desc"), 10)].descripcion = e.target.value; onChange({ rerender: false }); }));
  container.querySelectorAll("[data-cap-consid]").forEach((el) => el.addEventListener("input", (e) => { cap.canales[parseInt(el.getAttribute("data-cap-consid"), 10)].consideracion = e.target.value; onChange({ rerender: false }); }));

  container.querySelectorAll("[data-cf-prop]").forEach((el) => el.addEventListener("input", (e) => {
    const idx = parseInt(el.getAttribute("data-cf"), 10), i = parseInt(el.getAttribute("data-cf-i"), 10);
    cap.canales[idx].flujo[i][el.getAttribute("data-cf-prop")] = e.target.value; onChange({ rerender: false });
  }));
  container.querySelectorAll("[data-cf-add]").forEach((el) => el.addEventListener("click", () => {
    const idx = parseInt(el.getAttribute("data-cf-add"), 10);
    (cap.canales[idx].flujo = cap.canales[idx].flujo || []).push({ accion: "", responsable: "", condicion: "", tiempo: "" }); onChange({ rerender: true });
  }));
  container.querySelectorAll("[data-cf-remove]").forEach((el) => el.addEventListener("click", () => {
    const [idx, i] = el.getAttribute("data-cf-remove").split("|");
    cap.canales[parseInt(idx, 10)].flujo.splice(parseInt(i, 10), 1); onChange({ rerender: true });
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
