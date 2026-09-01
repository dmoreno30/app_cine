// Paso "Reportería": catálogo de reportes comunes (clic para agregar, con
// valores por defecto y editables) + botón para agregar reportes personalizados.
// Cada reporte = Título + 5 filas (Qué muestra, Entidad, Filtros, Tipo, Consideraciones).
import { CATALOGO_REPORTES } from "../data/reportes.js";
import { TIPOS_VISUALIZACION, ENTIDADES_REPORTE } from "../data/config.js";
import { escapeHtml, escapeAttr } from "../utils.js";

function reporteCard(r, i) {
  const field = (prop, label, placeholder) => `
    <div class="rep-field">
      <label>${label}</label>
      <input type="text" data-rep-idx="${i}" data-rep-prop="${prop}"
             value="${escapeAttr(r[prop] || "")}" placeholder="${placeholder}"
             ${prop === "entidad" ? 'list="dl-entidades"' : ""}${prop === "tipoVisualizacion" ? 'list="dl-tipos"' : ""}>
    </div>`;
  return `
    <div class="rep-card">
      <div class="rep-head">
        <input type="text" class="rep-nombre" data-rep-idx="${i}" data-rep-prop="nombre"
               value="${escapeAttr(r.nombre || "")}" placeholder="Nombre del reporte (ej. Producción)">
        <button class="icon-btn" data-rep-remove="${i}" title="Quitar reporte"><i class="ti ti-trash"></i></button>
      </div>
      ${field("queMuestra", "Qué muestra", "Ej. Reporte de producción mediante tareas")}
      ${field("entidad", "Entidad", "Ej. Negociación + Tareas")}
      ${field("filtros", "Filtros", "Ej. Fecha, responsable")}
      ${field("tipoVisualizacion", "Tipo de visualización", "Ej. Tabla")}
      <div class="rep-field">
        <label>Consideraciones</label>
        <textarea data-rep-idx="${i}" data-rep-prop="consideraciones" rows="2" placeholder="(a completar)">${escapeHtml(r.consideraciones || "")}</textarea>
      </div>
    </div>`;
}

export function renderReporteriaStep(state) {
  const reportes = state.reporteria.reportes || [];
  const catalogo = CATALOGO_REPORTES.map((c) =>
    `<button class="rep-cat-btn" data-rep-add-cat="${c.key}"><i class="ti ti-plus"></i> ${c.nombre}</button>`).join("");

  const cards = reportes.length
    ? reportes.map((r, i) => reporteCard(r, i)).join("")
    : '<p style="font-size:13px;color:#888;margin:4px 0">Todavía no agregaste reportes. Elegí del catálogo o creá uno personalizado.</p>';

  return `
    <p class="step-title">Reportería</p>
    <p class="step-helper">Agregá los reportes que el cliente necesita. Podés partir de los comunes (ya vienen precargados y editables) o crear uno personalizado. Cada reporte sale como una tabla en el iCINE.</p>

    <datalist id="dl-tipos">${TIPOS_VISUALIZACION.map((t) => `<option value="${escapeAttr(t)}">`).join("")}</datalist>
    <datalist id="dl-entidades">${ENTIDADES_REPORTE.map((e) => `<option value="${escapeAttr(e)}">`).join("")}</datalist>

    <div class="field-block">
      <label class="field-label">Reportes comunes <span style="font-weight:400;color:var(--text-secondary)">— clic para agregar</span></label>
      <div class="rep-catalogo">${catalogo}</div>
    </div>

    <div class="field-block">
      <label class="field-label">Reportes a incluir en el iCINE</label>
      ${cards}
      <button class="add-btn" data-rep-add-custom><i class="ti ti-plus" style="margin-right:4px"></i>Agregar otro reporte</button>
    </div>`;
}

export function attachReporteriaListeners(container, state, onChange) {
  const rep = state.reporteria;
  if (!Array.isArray(rep.reportes)) rep.reportes = [];

  // Agregar desde catálogo (copia con valores por defecto)
  container.querySelectorAll("[data-rep-add-cat]").forEach((el) => el.addEventListener("click", () => {
    const key = el.getAttribute("data-rep-add-cat");
    const cat = CATALOGO_REPORTES.find((c) => c.key === key);
    if (cat) { const { key: _k, ...campos } = cat; rep.reportes.push({ ...campos }); onChange({ rerender: true }); }
  }));

  // Agregar personalizado (en blanco)
  const addCustom = container.querySelector("[data-rep-add-custom]");
  if (addCustom) addCustom.addEventListener("click", () => {
    rep.reportes.push({ nombre: "", queMuestra: "", entidad: "", filtros: "", tipoVisualizacion: "", consideraciones: "" });
    onChange({ rerender: true });
  });

  // Quitar
  container.querySelectorAll("[data-rep-remove]").forEach((el) => el.addEventListener("click", () => {
    rep.reportes.splice(parseInt(el.getAttribute("data-rep-remove"), 10), 1); onChange({ rerender: true });
  }));

  // Editar campos
  container.querySelectorAll("[data-rep-prop]").forEach((el) => el.addEventListener("input", (e) => {
    const idx = parseInt(el.getAttribute("data-rep-idx"), 10);
    rep.reportes[idx][el.getAttribute("data-rep-prop")] = e.target.value;
    onChange({ rerender: false });
  }));
}
