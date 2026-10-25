import { CANALES } from "../data/config.js";
import { escapeHtml, escapeAttr } from "../utils.js";

const labelDe = (tipo) => (CANALES.find((c) => c.key === tipo) || {}).label || tipo;
const iconDe = (tipo) => (CANALES.find((c) => c.key === tipo) || {}).icon || "ti-plug-connected";
const necesitaNombre = (tipo) => !!(CANALES.find((c) => c.key === tipo) || {}).necesitaNombre;

// Título visible de una instancia de canal
function tituloCanal(c, i, mismoTipo) {
  const base = labelDe(c.tipo);
  if ((c.nombre || "").trim()) return `${base} — ${c.nombre.trim()}`;
  return mismoTipo > 1 ? `${base} (${i})` : base;
}

function renderCanalCard(c, idx, numDelTipo) {
  const col = !!c.colapsado;
  const nombreField = necesitaNombre(c.tipo) || (c.nombre || "")
    ? `<input type="text" class="rep-nombre" data-cap-nombre="${idx}" value="${escapeAttr(c.nombre || "")}" placeholder="${necesitaNombre(c.tipo) ? "Nombre del canal (requerido)" : "Nombre / etiqueta (opcional)"}">`
    : `<span class="sel-title" style="flex:1"><i class="ti ${iconDe(c.tipo)}"></i> ${escapeHtml(labelDe(c.tipo))}${numDelTipo > 1 ? ` <span style="color:#888;font-weight:400">#${idx}</span>` : ""}</span>`;

  const header = `
    <div class="rep-head">
      <button class="icon-btn" data-cap-toggle="${idx}" title="${col ? "Mostrar" : "Ocultar"}"><i class="ti ti-chevron-${col ? "right" : "down"}"></i></button>
      <i class="ti ${iconDe(c.tipo)}" style="font-size:18px;color:#056AA1"></i>
      ${nombreField}
      <button class="icon-btn" data-cap-remove="${idx}" title="Quitar canal"><i class="ti ti-trash"></i></button>
    </div>`;
  if (col) return `<div class="rep-card">${header}</div>`;

  const pasos = (c.flujo || []).map((p, i) => `
    <div class="paso-item">
      <div class="paso-num">${i + 1}</div>
      <div class="paso-campos">
        <textarea data-cf="${idx}" data-cf-i="${i}" data-cf-prop="accion" rows="2" placeholder="Acción / Descripción">${escapeHtml(p.accion || "")}</textarea>
        <div class="row-flex">
          <input type="text" data-cf="${idx}" data-cf-i="${i}" data-cf-prop="responsable" value="${escapeAttr(p.responsable || "")}" placeholder="Responsable">
          <input type="text" data-cf="${idx}" data-cf-i="${i}" data-cf-prop="tiempo" value="${escapeAttr(p.tiempo || "")}" placeholder="Tiempo (ej. 2 h)" style="max-width:150px">
        </div>
        <input type="text" data-cf="${idx}" data-cf-i="${i}" data-cf-prop="condicion" value="${escapeAttr(p.condicion || "")}" placeholder="Condición o regla (opcional)">
      </div>
      <button class="icon-btn" data-cf-remove="${idx}|${i}"><i class="ti ti-x"></i></button>
    </div>`).join("");

  return `
    <div class="rep-card">
      ${header}
      <p class="step-helper" style="margin:2px 0 8px">Flujo de este canal, paso a paso.</p>
      ${pasos || '<p style="font-size:12px;color:#999;margin:4px 0">Sin pasos todavía.</p>'}
      <button class="add-btn small" data-cf-add="${idx}"><i class="ti ti-plus" style="margin-right:4px"></i>Agregar paso</button>
    </div>`;
}

export function renderCaptacionStep(state) {
  const cap = state.captacion;
  if (!Array.isArray(cap.canales)) cap.canales = [];

  const menu = CANALES.map((c) =>
    `<div class="canal-chip" data-cap-add="${c.key}"><i class="ti ${c.icon}"></i>${c.label}</div>`).join("");

  // conteo por tipo para numerar instancias repetidas
  const countTipo = {};
  cap.canales.forEach((c) => { countTipo[c.tipo] = (countTipo[c.tipo] || 0) + 1; });

  const cards = cap.canales.length
    ? cap.canales.map((c, i) => renderCanalCard(c, i, countTipo[c.tipo])).join("")
    : '<p style="font-size:13px;color:#888;margin:4px 0">Todavía no agregaste canales. Elegí uno del menú de arriba (podés agregar varios del mismo tipo).</p>';

  return `
    <p class="step-title">Captación de clientes</p>
    <p class="step-helper">Agregá los canales por donde llegan los clientes. Podés sumar varios del mismo tipo (ej. dos Facebook o tres formularios).</p>

    <div class="field-block">
      <label class="field-label">Definición del proceso de captación</label>
      <p class="step-helper" style="margin-top:2px">Texto introductorio que explica, en general, cómo entran y se derivan los clientes. Va al iCINE.</p>
      <textarea data-cap-intro rows="3" placeholder="Ej. Los clientes ingresarán por diversos canales conectados a Bitrix24 y se derivarán a los asesores en cola según las reglas establecidas por la organización...">${escapeHtml(cap.intro || "")}</textarea>
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
    </div>`;
}

export function attachCaptacionListeners(container, state, onChange) {
  const cap = state.captacion;
  if (!Array.isArray(cap.canales)) cap.canales = [];

  const intro = container.querySelector("[data-cap-intro]");
  if (intro) intro.addEventListener("input", (e) => { cap.intro = e.target.value; onChange({ rerender: false }); });

  // Agregar canal (desde el menú)
  container.querySelectorAll("[data-cap-add]").forEach((el) => el.addEventListener("click", () => {
    cap.canales.push({ tipo: el.getAttribute("data-cap-add"), nombre: "", colapsado: false, flujo: [{ accion: "", responsable: "", condicion: "", tiempo: "" }] });
    onChange({ rerender: true });
  }));
  container.querySelectorAll("[data-cap-remove]").forEach((el) => el.addEventListener("click", () => {
    cap.canales.splice(parseInt(el.getAttribute("data-cap-remove"), 10), 1); onChange({ rerender: true });
  }));
  container.querySelectorAll("[data-cap-toggle]").forEach((el) => el.addEventListener("click", () => {
    const i = parseInt(el.getAttribute("data-cap-toggle"), 10); cap.canales[i].colapsado = !cap.canales[i].colapsado; onChange({ rerender: true });
  }));
  const colAll = container.querySelector("[data-cap-colapsar]");
  if (colAll) colAll.addEventListener("click", () => { cap.canales.forEach((c) => { c.colapsado = true; }); onChange({ rerender: true }); });

  container.querySelectorAll("[data-cap-nombre]").forEach((el) => el.addEventListener("input", (e) => {
    cap.canales[parseInt(el.getAttribute("data-cap-nombre"), 10)].nombre = e.target.value; onChange({ rerender: false });
  }));

  // Pasos del flujo de cada canal
  container.querySelectorAll("[data-cf-prop]").forEach((el) => el.addEventListener("input", (e) => {
    const idx = parseInt(el.getAttribute("data-cf"), 10), i = parseInt(el.getAttribute("data-cf-i"), 10);
    cap.canales[idx].flujo[i][el.getAttribute("data-cf-prop")] = e.target.value; onChange({ rerender: false });
  }));
  container.querySelectorAll("[data-cf-add]").forEach((el) => el.addEventListener("click", () => {
    const idx = parseInt(el.getAttribute("data-cf-add"), 10);
    (cap.canales[idx].flujo = cap.canales[idx].flujo || []).push({ accion: "", responsable: "", condicion: "", tiempo: "" });
    onChange({ rerender: true });
  }));
  container.querySelectorAll("[data-cf-remove]").forEach((el) => el.addEventListener("click", () => {
    const [idx, i] = el.getAttribute("data-cf-remove").split("|");
    cap.canales[parseInt(idx, 10)].flujo.splice(parseInt(i, 10), 1); onChange({ rerender: true });
  }));
}
