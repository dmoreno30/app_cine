import { CANALES } from "../data/config.js";
import { escapeHtml, escapeAttr } from "../utils.js";

const cfgDe = (tipo) => CANALES.find((c) => c.key === tipo) || {};
const labelDe = (tipo) => cfgDe(tipo).label || tipo;
const iconDe = (tipo) => cfgDe(tipo).icon || "ti-plug-connected";

function renderCanalCard(c, idx, numDelTipo) {
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

  // Widget: no flujo, solo URL + tiempo
  if (cfg.esWidget) {
    return `
      <div class="rep-card">${header}
        <p class="step-helper" style="margin:2px 0 8px">Vinculación de un widget a un sitio web. No lleva flujo: indicá el sitio y el tiempo.</p>
        <div class="rep-field"><label>Página web donde se vincula <span style="color:#c00">*</span></label>
          <input type="text" data-cap-url="${idx}" value="${escapeAttr(c.url || "")}" placeholder="https://..."></div>
        <div class="rep-field"><label>Tiempo de la actividad <span style="color:#c00">*</span></label>
          <input type="text" data-cap-tiempo="${idx}" value="${escapeAttr(c.tiempo || "")}" placeholder="Ej. 2 h" style="max-width:150px"></div>
      </div>`;
  }

  const conectorField = cfg.necesitaConector ? `
    <div class="rep-field"><label>¿Con qué conector externo se hará la conexión? <span style="color:#c00">*</span></label>
      <input type="text" data-cap-conector="${idx}" value="${escapeAttr(c.conector || "")}" placeholder="Ej. conector de un tercero">
    </div>` : "";

  const pasos = (c.flujo || []).map((p, i) => `
    <div class="paso-item">
      <div class="paso-num">${i + 1}</div>
      <div class="paso-campos">
        <textarea data-cf="${idx}" data-cf-i="${i}" data-cf-prop="accion" rows="2" placeholder="Acción / Descripción *">${escapeHtml(p.accion || "")}</textarea>
        <div class="row-flex">
          <input type="text" data-cf="${idx}" data-cf-i="${i}" data-cf-prop="responsable" value="${escapeAttr(p.responsable || "")}" placeholder="Responsable">
          <input type="text" data-cf="${idx}" data-cf-i="${i}" data-cf-prop="tiempo" value="${escapeAttr(p.tiempo || "")}" placeholder="Tiempo * (ej. 2 h)" style="max-width:150px">
        </div>
        <input type="text" data-cf="${idx}" data-cf-i="${i}" data-cf-prop="condicion" value="${escapeAttr(p.condicion || "")}" placeholder="Condición o regla (opcional)">
      </div>
      <button class="icon-btn" data-cf-remove="${idx}|${i}"><i class="ti ti-x"></i></button>
    </div>`).join("");

  return `
    <div class="rep-card">${header}
      ${conectorField}
      <p class="step-helper" style="margin:2px 0 8px">Flujo de este canal, paso a paso. <b>Acción</b> y <b>Tiempo</b> son requeridos.</p>
      ${pasos || '<p style="font-size:12px;color:#999;margin:4px 0">Sin pasos todavía.</p>'}
      <button class="add-btn small" data-cf-add="${idx}"><i class="ti ti-plus" style="margin-right:4px"></i>Agregar paso</button>
    </div>`;
}

export function renderCaptacionStep(state) {
  const cap = state.captacion;
  if (!Array.isArray(cap.canales)) cap.canales = [];
  if (!Array.isArray(cap.conexiones)) cap.conexiones = [];

  const menu = CANALES.map((c) => `<div class="canal-chip" data-cap-add="${c.key}"><i class="ti ${c.icon}"></i>${c.label}</div>`).join("");
  const countTipo = {};
  cap.canales.forEach((c) => { countTipo[c.tipo] = (countTipo[c.tipo] || 0) + 1; });
  const cards = cap.canales.length
    ? cap.canales.map((c, i) => renderCanalCard(c, i, countTipo[c.tipo])).join("")
    : '<p style="font-size:13px;color:#888;margin:4px 0">Todavía no agregaste canales. Elegí uno del menú (podés sumar varios del mismo tipo).</p>';

  const conex = cap.conexiones.map((x, i) => `
    <div class="row-flex">
      <input type="text" data-conx-i="${i}" data-conx-prop="titulo" value="${escapeAttr(x.titulo || "")}" placeholder="Actividad (ej. Conectar canales FB e IG a la cuenta)">
      <input type="text" data-conx-i="${i}" data-conx-prop="tiempo" value="${escapeAttr(x.tiempo || "")}" placeholder="Tiempo (ej. 1 h)" style="max-width:150px">
      <button class="icon-btn" data-conx-remove="${i}"><i class="ti ti-x"></i></button>
    </div>`).join("");

  return `
    <p class="step-title">Captación de clientes</p>
    <p class="step-helper">Agregá los canales por donde llegan los clientes. Podés sumar varios del mismo tipo.</p>

    <div class="field-block">
      <label class="field-label">Definición del proceso de captación <span style="color:#c00">*</span></label>
      <p class="step-helper" style="margin-top:2px">Texto introductorio de cómo entran y se derivan los clientes. Va al iCINE.</p>
      <textarea data-cap-intro rows="3" placeholder="Ej. Los clientes ingresarán por diversos canales conectados a Bitrix24 y se derivarán a los asesores en cola según las reglas establecidas...">${escapeHtml(cap.intro || "")}</textarea>
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

    <div class="field-block" style="border:1px solid #e6e6e6;border-radius:12px;padding:12px;background:#fafafa">
      <label class="field-label"><i class="ti ti-link"></i> Actividades de conexión de canales abiertos <span style="color:#c00">*</span></label>
      <p class="step-helper" style="margin-top:2px">Crear el canal es una cosa; conectarlo a la cuenta (o vincular el widget al sitio) es otra. Una actividad puede cubrir varios canales. Suma al tiempo del iCINE.</p>
      ${conex || '<p style="font-size:12px;color:#999;margin:4px 0">Sin actividades todavía.</p>'}
      <button class="add-btn" data-conx-add><i class="ti ti-plus" style="margin-right:4px"></i>Agregar actividad</button>
    </div>`;
}

export function attachCaptacionListeners(container, state, onChange) {
  const cap = state.captacion;
  if (!Array.isArray(cap.canales)) cap.canales = [];
  if (!Array.isArray(cap.conexiones)) cap.conexiones = [];

  const intro = container.querySelector("[data-cap-intro]");
  if (intro) intro.addEventListener("input", (e) => { cap.intro = e.target.value; onChange({ rerender: false }); });

  container.querySelectorAll("[data-cap-add]").forEach((el) => el.addEventListener("click", () => {
    const tipo = el.getAttribute("data-cap-add"); const cfg = CANALES.find((c) => c.key === tipo) || {};
    const inst = { tipo, nombre: "", colapsado: false };
    if (cfg.esWidget) { inst.url = ""; inst.tiempo = ""; inst.flujo = []; }
    else { if (cfg.necesitaConector) inst.conector = ""; inst.flujo = [{ accion: "", responsable: "", condicion: "", tiempo: "" }]; }
    cap.canales.push(inst); onChange({ rerender: true });
  }));
  container.querySelectorAll("[data-cap-remove]").forEach((el) => el.addEventListener("click", () => { cap.canales.splice(parseInt(el.getAttribute("data-cap-remove"), 10), 1); onChange({ rerender: true }); }));
  container.querySelectorAll("[data-cap-toggle]").forEach((el) => el.addEventListener("click", () => { const i = parseInt(el.getAttribute("data-cap-toggle"), 10); cap.canales[i].colapsado = !cap.canales[i].colapsado; onChange({ rerender: true }); }));
  const colAll = container.querySelector("[data-cap-colapsar]");
  if (colAll) colAll.addEventListener("click", () => { cap.canales.forEach((c) => { c.colapsado = true; }); onChange({ rerender: true }); });

  container.querySelectorAll("[data-cap-nombre]").forEach((el) => el.addEventListener("input", (e) => { cap.canales[parseInt(el.getAttribute("data-cap-nombre"), 10)].nombre = e.target.value; onChange({ rerender: false }); }));
  container.querySelectorAll("[data-cap-url]").forEach((el) => el.addEventListener("input", (e) => { cap.canales[parseInt(el.getAttribute("data-cap-url"), 10)].url = e.target.value; onChange({ rerender: false }); }));
  container.querySelectorAll("[data-cap-tiempo]").forEach((el) => el.addEventListener("input", (e) => { cap.canales[parseInt(el.getAttribute("data-cap-tiempo"), 10)].tiempo = e.target.value; onChange({ rerender: false }); }));
  container.querySelectorAll("[data-cap-conector]").forEach((el) => el.addEventListener("input", (e) => { cap.canales[parseInt(el.getAttribute("data-cap-conector"), 10)].conector = e.target.value; onChange({ rerender: false }); }));

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

  // Actividades de conexión
  container.querySelectorAll("[data-conx-prop]").forEach((el) => el.addEventListener("input", (e) => {
    cap.conexiones[parseInt(el.getAttribute("data-conx-i"), 10)][el.getAttribute("data-conx-prop")] = e.target.value; onChange({ rerender: false });
  }));
  const addConx = container.querySelector("[data-conx-add]");
  if (addConx) addConx.addEventListener("click", () => { cap.conexiones.push({ titulo: "", tiempo: "" }); onChange({ rerender: true }); });
  container.querySelectorAll("[data-conx-remove]").forEach((el) => el.addEventListener("click", () => { cap.conexiones.splice(parseInt(el.getAttribute("data-conx-remove"), 10), 1); onChange({ rerender: true }); }));
}
