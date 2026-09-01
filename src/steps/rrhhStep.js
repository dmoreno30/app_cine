// Paso "Procesos de gestión de RRHH": catálogo de procesos (clic para agregar);
// cada proceso muestra los campos que le corresponden (según CATALOGO_RRHH),
// incluyendo "aprobadores" como lista secuencial (varios, en orden).
import { CATALOGO_RRHH, CAMPOS_RRHH } from "../data/rrhh.js";
import { escapeHtml, escapeAttr } from "../utils.js";

function renderAprobadores(pi, aprobadores) {
  const rows = (aprobadores || []).map((a, ai) => `
    <div class="row-flex">
      <span class="apr-num">${ai + 1}</span>
      <input type="text" data-rh-apr-p="${pi}" data-rh-apr-i="${ai}" value="${escapeAttr(a)}" placeholder="Nombre o cargo de quien aprueba">
      <button class="icon-btn" data-rh-apr-remove-p="${pi}" data-rh-apr-remove-i="${ai}"><i class="ti ti-x"></i></button>
    </div>`).join("");
  return `
    <div class="rep-field">
      <label>${CAMPOS_RRHH.aprobadores.label}</label>
      ${rows || '<p style="font-size:12px;color:#999;margin:2px 0">Sin aprobadores todavía.</p>'}
      <button class="add-btn small" data-rh-apr-add="${pi}"><i class="ti ti-plus" style="margin-right:4px"></i>Agregar aprobador</button>
    </div>`;
}

function renderProceso(pr, pi) {
  const cat = CATALOGO_RRHH.find((c) => c.key === pr.tipo);
  if (!cat) return "";
  const campos = cat.campos.map((fk) => {
    const meta = CAMPOS_RRHH[fk];
    if (!meta) return "";
    if (meta.tipo === "aprobadores") return renderAprobadores(pi, pr.aprobadores);
    if (meta.tipo === "textarea") return `
      <div class="rep-field">
        <label>${meta.label}</label>
        <textarea data-rh-p="${pi}" data-rh-prop="${fk}" rows="2" placeholder="${escapeAttr(meta.placeholder || "")}">${escapeHtml(pr[fk] || "")}</textarea>
      </div>`;
    return `
      <div class="rep-field">
        <label>${meta.label}</label>
        <input type="text" data-rh-p="${pi}" data-rh-prop="${fk}" value="${escapeAttr(pr[fk] || "")}" placeholder="${escapeAttr(meta.placeholder || "")}">
      </div>`;
  }).join("");
  return `
    <div class="rep-card">
      <div class="rep-head">
        <span class="rep-nombre">${cat.label}</span>
        <button class="icon-btn" data-rh-remove="${pi}" title="Quitar proceso"><i class="ti ti-trash"></i></button>
      </div>
      ${campos}
    </div>`;
}

export function renderRRHHStep(state) {
  if (!state.rrhh) state.rrhh = { procesos: [] };
  const procesos = state.rrhh.procesos || [];
  const usados = procesos.map((p) => p.tipo);
  const catalogo = CATALOGO_RRHH.map((c) => {
    const yaEsta = usados.includes(c.key);
    return `<button class="rep-cat-btn" data-rh-add="${c.key}" ${yaEsta ? "disabled style='opacity:.45'" : ""}>
      <i class="ti ti-${yaEsta ? "check" : "plus"}"></i> ${c.label}</button>`;
  }).join("");

  const cards = procesos.length
    ? procesos.map((pr, i) => renderProceso(pr, i)).join("")
    : '<p style="font-size:13px;color:#888;margin:4px 0">Todavía no agregaste procesos. Elegí del catálogo de arriba.</p>';

  return `
    <p class="step-title">Procesos de gestión de RRHH</p>
    <p class="step-helper">Elegí los procesos de RRHH que se van a documentar. Cada uno abre sus propios campos. Los aprobadores se agregan en el orden en que aprueban.</p>
    <div class="field-block">
      <label class="field-label">Procesos disponibles <span style="font-weight:400;color:var(--text-secondary)">— clic para agregar</span></label>
      <div class="rep-catalogo">${catalogo}</div>
    </div>
    <div class="field-block">
      <label class="field-label">Procesos a incluir</label>
      ${cards}
    </div>`;
}

export function attachRRHHListeners(container, state, onChange) {
  if (!state.rrhh) state.rrhh = { procesos: [] };
  const procesos = state.rrhh.procesos;

  container.querySelectorAll("[data-rh-add]").forEach((el) => el.addEventListener("click", () => {
    if (el.disabled) return;
    procesos.push({ tipo: el.getAttribute("data-rh-add"), aprobadores: [] });
    onChange({ rerender: true });
  }));
  container.querySelectorAll("[data-rh-remove]").forEach((el) => el.addEventListener("click", () => {
    procesos.splice(parseInt(el.getAttribute("data-rh-remove"), 10), 1); onChange({ rerender: true });
  }));
  container.querySelectorAll("[data-rh-prop]").forEach((el) => el.addEventListener("input", (e) => {
    procesos[parseInt(el.getAttribute("data-rh-p"), 10)][el.getAttribute("data-rh-prop")] = e.target.value;
    onChange({ rerender: false });
  }));
  // Aprobadores
  container.querySelectorAll("[data-rh-apr-add]").forEach((el) => el.addEventListener("click", () => {
    const pi = parseInt(el.getAttribute("data-rh-apr-add"), 10);
    if (!Array.isArray(procesos[pi].aprobadores)) procesos[pi].aprobadores = [];
    procesos[pi].aprobadores.push(""); onChange({ rerender: true });
  }));
  container.querySelectorAll("[data-rh-apr-remove-p]").forEach((el) => el.addEventListener("click", () => {
    const pi = parseInt(el.getAttribute("data-rh-apr-remove-p"), 10), ai = parseInt(el.getAttribute("data-rh-apr-remove-i"), 10);
    procesos[pi].aprobadores.splice(ai, 1); onChange({ rerender: true });
  }));
  container.querySelectorAll("[data-rh-apr-p]").forEach((el) => el.addEventListener("input", (e) => {
    const pi = parseInt(el.getAttribute("data-rh-apr-p"), 10), ai = parseInt(el.getAttribute("data-rh-apr-i"), 10);
    procesos[pi].aprobadores[ai] = e.target.value; onChange({ rerender: false });
  }));
}
