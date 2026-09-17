import { CATALOGO_REPORTES } from "../data/reportes.js";
import { TIPOS_VISUALIZACION, ENTIDADES_REPORTE, PERMISOS_CRM } from "../data/config.js";
import { escapeHtml, escapeAttr } from "../utils.js";

function entidadesChips(i, seleccionadas) {
  const sel = seleccionadas || [];
  return ENTIDADES_REPORTE.map((e) => {
    const on = sel.includes(e);
    return `<div class="canal-chip ${on ? "on" : ""}" data-rep-ent="${i}|${escapeAttr(e)}">${e}</div>`;
  }).join("");
}

function reporteCard(r, i) {
  const field = (prop, label, placeholder, dl) => `
    <div class="rep-field">
      <label>${label}</label>
      <input type="text" data-rep-idx="${i}" data-rep-prop="${prop}" value="${escapeAttr(r[prop] || "")}" placeholder="${placeholder}" ${dl ? `list="${dl}"` : ""}>
    </div>`;
  return `
    <div class="rep-card">
      <div class="rep-head">
        <span class="paso-num">${i + 1}</span>
        <input type="text" class="rep-nombre" data-rep-idx="${i}" data-rep-prop="nombre" value="${escapeAttr(r.nombre || "")}" placeholder="Nombre del reporte (ej. Producción)">
        <button class="icon-btn" data-rep-remove="${i}" title="Quitar reporte"><i class="ti ti-trash"></i></button>
      </div>
      ${field("queMuestra", "Qué muestra", "Ej. Reporte de producción mediante tareas")}
      <div class="rep-field">
        <label>Entidad(es) <span style="font-weight:400;color:var(--text-secondary)">— podés marcar varias</span></label>
        <div class="canal-grid">${entidadesChips(i, r.entidades)}</div>
      </div>
      ${field("filtros", "Filtros", "Ej. Fecha, responsable")}
      ${field("tipoVisualizacion", "Tipo de visualización", "Ej. Tabla", "dl-tipos")}
      ${field("tiempo", "Tiempo estimado de desarrollo", "Ej. 2 h")}
      <div class="rep-field">
        <label>Consideraciones</label>
        <textarea data-rep-idx="${i}" data-rep-prop="consideraciones" rows="2" placeholder="(a completar)">${escapeHtml(r.consideraciones || "")}</textarea>
      </div>
    </div>`;
}

function rolesCard(r, i) {
  const chips = PERMISOS_CRM.map((perm) => {
    const on = (r.permisos || []).includes(perm);
    return `<div class="canal-chip ${on ? "on" : ""}" data-repol-perm="${i}|${perm}">${perm}</div>`;
  }).join("");
  return `
    <div class="rep-card">
      <div class="rep-head">
        <input type="text" class="rep-nombre" data-repol-idx="${i}" data-repol-prop="rol" value="${escapeAttr(r.rol || "")}" placeholder="Rol (ej. Supervisor)">
        <button class="icon-btn" data-repol-remove="${i}"><i class="ti ti-trash"></i></button>
      </div>
      <div class="rep-field"><label>Permisos</label><div class="canal-grid">${chips}</div></div>
      <div class="rep-field"><label>Observaciones</label>
        <input type="text" data-repol-idx="${i}" data-repol-prop="observaciones" value="${escapeAttr(r.observaciones || "")}" placeholder="Para quién es / notas"></div>
    </div>`;
}

export function renderReporteriaStep(state) {
  const rep = state.reporteria;
  const catalogo = CATALOGO_REPORTES.map((c) => `<button class="rep-cat-btn" data-rep-add-cat="${c.key}"><i class="ti ti-plus"></i> ${c.nombre}</button>`).join("");
  const cards = (rep.reportes || []).length ? rep.reportes.map((r, i) => reporteCard(r, i)).join("") : '<p style="font-size:13px;color:#888;margin:4px 0">Todavía no agregaste reportes.</p>';
  const roles = (rep.roles || []).length ? rep.roles.map((r, i) => rolesCard(r, i)).join("") : '<p style="font-size:13px;color:#888;margin:4px 0">Sin roles definidos.</p>';

  return `
    <p class="step-title">Reportería</p>
    <p class="step-helper">Agregá los reportes que el cliente necesita. Cada uno sale enumerado como tabla en el iCINE.</p>
    <datalist id="dl-tipos">${TIPOS_VISUALIZACION.map((t) => `<option value="${escapeAttr(t)}">`).join("")}</datalist>

    <div class="field-block">
      <label class="field-label">Explicación general del DataSet a crear</label>
      <textarea data-rep-dataset rows="3" placeholder="Ej. Se creará un DataSet en BI Builder que consolida negociaciones, prospectos y tareas para alimentar los reportes...">${escapeHtml(rep.dataset || "")}</textarea>
    </div>

    <div class="field-block" style="border:1px solid #e6e6e6;border-radius:12px;padding:12px;background:#fafafa">
      <p class="field-label"><i class="ti ti-users"></i> Roles y permisos (Reportería)</p>
      ${roles}
      <button class="add-btn" data-repol-add><i class="ti ti-plus" style="margin-right:4px"></i>Agregar rol</button>
    </div>

    <div class="field-block">
      <label class="field-label">Reportes comunes <span style="font-weight:400;color:var(--text-secondary)">— clic para agregar</span></label>
      <div class="rep-catalogo">${catalogo}</div>
    </div>
    <div class="field-block">
      <label class="field-label">Reportes a incluir</label>
      ${cards}
      <button class="add-btn" data-rep-add-custom><i class="ti ti-plus" style="margin-right:4px"></i>Agregar otro reporte</button>
    </div>`;
}

export function attachReporteriaListeners(container, state, onChange) {
  const rep = state.reporteria;
  if (!Array.isArray(rep.reportes)) rep.reportes = [];
  if (!Array.isArray(rep.roles)) rep.roles = [];

  const ds = container.querySelector("[data-rep-dataset]");
  if (ds) ds.addEventListener("input", (e) => { rep.dataset = e.target.value; onChange({ rerender: false }); });

  container.querySelectorAll("[data-rep-add-cat]").forEach((el) => el.addEventListener("click", () => {
    const cat = CATALOGO_REPORTES.find((c) => c.key === el.getAttribute("data-rep-add-cat"));
    if (cat) { const { key, ...campos } = cat; rep.reportes.push(JSON.parse(JSON.stringify(campos))); onChange({ rerender: true }); }
  }));
  const addCustom = container.querySelector("[data-rep-add-custom]");
  if (addCustom) addCustom.addEventListener("click", () => { rep.reportes.push({ nombre: "", queMuestra: "", entidades: [], filtros: "", tipoVisualizacion: "", tiempo: "", consideraciones: "" }); onChange({ rerender: true }); });
  container.querySelectorAll("[data-rep-remove]").forEach((el) => el.addEventListener("click", () => { rep.reportes.splice(parseInt(el.getAttribute("data-rep-remove"), 10), 1); onChange({ rerender: true }); }));
  container.querySelectorAll("[data-rep-prop]").forEach((el) => el.addEventListener("input", (e) => {
    rep.reportes[parseInt(el.getAttribute("data-rep-idx"), 10)][el.getAttribute("data-rep-prop")] = e.target.value; onChange({ rerender: false });
  }));
  // entidades múltiples (chips)
  container.querySelectorAll("[data-rep-ent]").forEach((el) => el.addEventListener("click", () => {
    const [i, ent] = el.getAttribute("data-rep-ent").split("|"); const r = rep.reportes[parseInt(i, 10)];
    r.entidades = r.entidades || [];
    const idx = r.entidades.indexOf(ent);
    if (idx >= 0) r.entidades.splice(idx, 1); else r.entidades.push(ent);
    onChange({ rerender: true });
  }));

  // Roles reportería
  container.querySelectorAll("[data-repol-prop]").forEach((el) => el.addEventListener("input", (e) => {
    rep.roles[parseInt(el.getAttribute("data-repol-idx"), 10)][el.getAttribute("data-repol-prop")] = e.target.value; onChange({ rerender: false });
  }));
  container.querySelectorAll("[data-repol-perm]").forEach((el) => el.addEventListener("click", () => {
    const [i, perm] = el.getAttribute("data-repol-perm").split("|"); const r = rep.roles[parseInt(i, 10)];
    r.permisos = r.permisos || [];
    const idx = r.permisos.indexOf(perm);
    if (idx >= 0) r.permisos.splice(idx, 1); else r.permisos.push(perm);
    onChange({ rerender: true });
  }));
  const addRol = container.querySelector("[data-repol-add]");
  if (addRol) addRol.addEventListener("click", () => { rep.roles.push({ rol: "", permisos: [], observaciones: "" }); onChange({ rerender: true }); });
  container.querySelectorAll("[data-repol-remove]").forEach((el) => el.addEventListener("click", () => { rep.roles.splice(parseInt(el.getAttribute("data-repol-remove"), 10), 1); onChange({ rerender: true }); }));
}
