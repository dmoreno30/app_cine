import { CANALES, CAPTACION_TEXTOS, CAPTACION_ACTIVIDADES, CAPTACION_CIP, conCliente } from "../data/config.js";
import { escapeHtml, escapeAttr } from "../utils.js";

const cfgDe = (tipo) => CANALES.find((c) => c.key === tipo) || {};
const labelDe = (tipo) => cfgDe(tipo).label || tipo;
const iconDe = (tipo) => cfgDe(tipo).icon || "ti-plug-connected";
const TEXTO_FIJO = { facebook: "facebook", instagram: "facebook" }; // ambos usan el texto de FB/IG

function bloqueFijo(html) {
  return `<div class="cap-fijo"><i class="ti ti-lock" style="font-size:12px;margin-right:4px;color:#8a8a8a"></i>${html}</div>`;
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

  // Facebook / Instagram → texto y consideración fijos
  if (c.tipo === "facebook" || c.tipo === "instagram") {
    return `
      <div class="rep-card">${header}
        ${bloqueFijo(`<p style="margin:0">${escapeHtml(CAPTACION_TEXTOS.facebook)}</p>`)}
        ${bloqueFijo(`<b>Consideración:</b> ${escapeHtml(CAPTACION_TEXTOS.facebookConsideracion)}`)}
      </div>`;
  }

  // Formularios del CRM → texto y consideración fijos
  if (c.tipo === "formularios") {
    return `
      <div class="rep-card">${header}
        ${bloqueFijo(`<p style="margin:0">${escapeHtml(CAPTACION_TEXTOS.formularios)}</p>`)}
        ${bloqueFijo(`<b>Consideración:</b> ${escapeHtml(CAPTACION_TEXTOS.formulariosConsideracion)}`)}
      </div>`;
  }

  // Widget → solo página web (sin tiempo)
  if (cfg.esWidget) {
    return `
      <div class="rep-card">${header}
        <div class="rep-field"><label>Página web donde se vincula <span style="color:#c00">*</span></label>
          <input type="text" data-cap-url="${idx}" value="${escapeAttr(c.url || "")}" placeholder="https://..."></div>
      </div>`;
  }

  // TikTok / LinkedIn → conector externo; resto → flujo simple (SIN tiempo)
  const conectorField = cfg.necesitaConector ? `
    <div class="rep-field"><label>¿Con qué conector externo se hará la conexión? <span style="color:#c00">*</span></label>
      <input type="text" data-cap-conector="${idx}" value="${escapeAttr(c.conector || "")}" placeholder="Ej. conector de un tercero">
    </div>` : "";
  const pasos = (c.flujo || []).map((p, i) => `
    <div class="paso-item">
      <div class="paso-num">${i + 1}</div>
      <div class="paso-campos">
        <textarea data-cf="${idx}" data-cf-i="${i}" data-cf-prop="accion" rows="2" placeholder="Acción / Descripción">${escapeHtml(p.accion || "")}</textarea>
        <input type="text" data-cf="${idx}" data-cf-i="${i}" data-cf-prop="responsable" value="${escapeAttr(p.responsable || "")}" placeholder="Responsable">
        <input type="text" data-cf="${idx}" data-cf-i="${i}" data-cf-prop="condicion" value="${escapeAttr(p.condicion || "")}" placeholder="Condición o regla (opcional)">
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

// Fija en el estado los textos/valores estándar de Captación (idempotente).
function fijarEstandar(state) {
  const cap = state.captacion;
  cap.intro = conCliente(CAPTACION_TEXTOS.intro, state.cliente);
  if (!state.consideraciones) state.consideraciones = {};
  state.consideraciones.captacion = conCliente(CAPTACION_TEXTOS.consideracionGeneral, state.cliente);
  if (!state.cip) state.cip = {};
  state.cip.captacion = CAPTACION_CIP.map((c) => ({ titulo: c.titulo, tiempo: c.tiempo }));
}

export function renderCaptacionStep(state) {
  const cap = state.captacion;
  if (!Array.isArray(cap.canales)) cap.canales = [];
  fijarEstandar(state);

  const menu = CANALES.map((c) => `<div class="canal-chip" data-cap-add="${c.key}"><i class="ti ${c.icon}"></i>${c.label}</div>`).join("");
  const cards = cap.canales.length
    ? cap.canales.map((c, i) => renderCanalCard(c, i)).join("")
    : '<p style="font-size:13px;color:#888;margin:4px 0">Todavía no agregaste canales. Elegí uno del menú (podés sumar varios del mismo tipo).</p>';

  const actividades = CAPTACION_ACTIVIDADES.map((a) => `<li>${escapeHtml(a)}</li>`).join("");
  const capacitacion = CAPTACION_CIP.map((c) => `<li>${escapeHtml(c.titulo)} <b>— ${escapeHtml(c.tiempo)}</b></li>`).join("");
  const introClienteNota = (state.cliente || "").trim() ? "" : `<p class="step-helper" style="margin-top:4px;color:#8a5a00"><i class="ti ti-info-circle"></i> "XX" se reemplazará por el nombre del cliente cuando lo completes en "Detalles de la empresa".</p>`;

  return `
    <p class="step-title">Captación de clientes</p>
    <p class="step-helper">Agregá los canales por donde llegan los clientes. Los textos estándar ya están definidos y se incluyen en el iCINE.</p>

    <div class="field-block">
      <label class="field-label">Texto introductorio <span style="font-weight:400;color:var(--text-secondary)">— fijo, va al iCINE</span></label>
      ${bloqueFijo(conCliente(CAPTACION_TEXTOS.intro, state.cliente).split(/\n\n+/).map((p) => `<p style="margin:0 0 8px">${escapeHtml(p)}</p>`).join(""))}
      ${introClienteNota}
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
      <label class="field-label"><i class="ti ti-link"></i> Actividades de creación y conexión de canales en general <span style="font-weight:400;color:var(--text-secondary)">— fijas, van al iCINE</span></label>
      <ul class="cap-lista">${actividades}</ul>
    </div>

    <div class="field-block" style="border:1px solid #e6e6e6;border-radius:12px;padding:14px;background:#fafafa">
      <label class="field-label"><i class="ti ti-school"></i> Capacitación (CIP) <span style="font-weight:400;color:var(--text-secondary)">— fija</span></label>
      <ul class="cap-lista">${capacitacion}</ul>
    </div>

    <div class="field-block" style="border:1px solid #e6e6e6;border-radius:12px;padding:14px;background:#fafafa">
      <label class="field-label"><i class="ti ti-note"></i> Consideraciones <span style="font-weight:400;color:var(--text-secondary)">— fijas, van al iCINE</span></label>
      ${bloqueFijo(conCliente(CAPTACION_TEXTOS.consideracionGeneral, state.cliente).split(/\n\n+/).map((p) => `<p style="margin:0 0 8px">${escapeHtml(p)}</p>`).join(""))}
    </div>`;
}

export function attachCaptacionListeners(container, state, onChange) {
  const cap = state.captacion;
  if (!Array.isArray(cap.canales)) cap.canales = [];
  fijarEstandar(state);

  container.querySelectorAll("[data-cap-add]").forEach((el) => el.addEventListener("click", () => {
    const tipo = el.getAttribute("data-cap-add"); const cfg = CANALES.find((c) => c.key === tipo) || {};
    const inst = { tipo, nombre: "", colapsado: false };
    if (cfg.esWidget) { inst.url = ""; inst.flujo = []; }
    else if (tipo === "facebook" || tipo === "instagram" || tipo === "formularios") { inst.flujo = []; }
    else { if (cfg.necesitaConector) inst.conector = ""; inst.flujo = [{ accion: "", responsable: "", condicion: "", tiempo: "" }]; }
    cap.canales.push(inst); onChange({ rerender: true });
  }));
  container.querySelectorAll("[data-cap-remove]").forEach((el) => el.addEventListener("click", () => { cap.canales.splice(parseInt(el.getAttribute("data-cap-remove"), 10), 1); onChange({ rerender: true }); }));
  container.querySelectorAll("[data-cap-toggle]").forEach((el) => el.addEventListener("click", () => { const i = parseInt(el.getAttribute("data-cap-toggle"), 10); cap.canales[i].colapsado = !cap.canales[i].colapsado; onChange({ rerender: true }); }));
  const colAll = container.querySelector("[data-cap-colapsar]");
  if (colAll) colAll.addEventListener("click", () => { cap.canales.forEach((c) => { c.colapsado = true; }); onChange({ rerender: true }); });

  container.querySelectorAll("[data-cap-nombre]").forEach((el) => el.addEventListener("input", (e) => { cap.canales[parseInt(el.getAttribute("data-cap-nombre"), 10)].nombre = e.target.value; onChange({ rerender: false }); }));
  container.querySelectorAll("[data-cap-url]").forEach((el) => el.addEventListener("input", (e) => { cap.canales[parseInt(el.getAttribute("data-cap-url"), 10)].url = e.target.value; onChange({ rerender: false }); }));
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
}
