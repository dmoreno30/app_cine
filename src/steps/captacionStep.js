import { CANALES } from "../data/config.js";
import { escapeHtml, escapeAttr } from "../utils.js";

// Tabla de flujo (paso a paso) para un canal seleccionado.
function renderFlujoCanal(key, label, pasos) {
  const rows = (pasos || []).map((p, i) => `
    <div class="paso-item">
      <div class="paso-num">${i + 1}</div>
      <div class="paso-campos">
        <textarea data-cflow="${key}" data-cflow-idx="${i}" data-cflow-prop="accion" rows="2" placeholder="Acción / Descripción">${escapeHtml(p.accion || "")}</textarea>
        <div class="row-flex">
          <input type="text" data-cflow="${key}" data-cflow-idx="${i}" data-cflow-prop="responsable" value="${escapeAttr(p.responsable || "")}" placeholder="Responsable">
          <input type="text" data-cflow="${key}" data-cflow-idx="${i}" data-cflow-prop="herramienta" value="${escapeAttr(p.herramienta || "")}" placeholder="Herramienta / Módulo">
        </div>
        <input type="text" data-cflow="${key}" data-cflow-idx="${i}" data-cflow-prop="condicion" value="${escapeAttr(p.condicion || "")}" placeholder="Condición o Regla (opcional)">
      </div>
      <button class="icon-btn" data-cflow-remove="${key}|${i}"><i class="ti ti-x"></i></button>
    </div>`).join("");
  return `
    <div class="field-block" style="border:1px solid #e6e6e6;border-radius:12px;padding:12px;background:#fafafa">
      <p class="field-label"><i class="ti ti-arrow-guide"></i> Sub-proceso: Canal ${escapeHtml(label)}</p>
      <p class="step-helper" style="margin-top:2px">Explicá el flujo de este canal, paso a paso.</p>
      ${rows}
      <button class="add-btn" data-cflow-add="${key}"><i class="ti ti-plus" style="margin-right:4px"></i>Agregar paso</button>
    </div>`;
}

export function renderCaptacionStep(state) {
  const cap = state.captacion;
  const chips = CANALES.map((c) => {
    const on = cap.canales[c.key];
    return `<div class="canal-chip ${on ? "on" : ""}" data-toggle-canal="${c.key}"><i class="ti ${c.icon}"></i>${c.label}</div>`;
  }).join("");

  const flujos = CANALES.filter((c) => cap.canales[c.key])
    .map((c) => renderFlujoCanal(c.key, c.label, (cap.flujosPorCanal || {})[c.key] || []))
    .join("");

  return `
    <p class="step-title">Captación de clientes</p>
    <p class="step-helper">¿Por dónde llegan tus clientes? Marcá los canales que usás — por cada uno vas a poder describir su flujo.</p>
    <div class="field-block">
      <div class="canal-grid">${chips}</div>
    </div>

    ${cap.canales.paginaweb ? `
    <div class="field-block">
      <label class="field-label">¿Cuál es la URL de tu página web?</label>
      <input type="text" data-canal-url="paginawebUrl" value="${escapeAttr(cap.paginawebUrl)}" placeholder="https://...">
    </div>` : ""}

    ${cap.canales.tiendavirtual ? `
    <div class="field-block">
      <label class="field-label">¿Cuál es la URL de tu tienda virtual?</label>
      <input type="text" data-canal-url="tiendavirtualUrl" value="${escapeAttr(cap.tiendavirtualUrl)}" placeholder="https://...">
    </div>` : ""}

    ${cap.canales.whatsapp ? `
    <div class="entity-info">
      <i class="ti ti-info-circle"></i> WhatsApp no es nativo de Bitrix24 — se conecta con una plataforma externa de pago (Wazzup), que se cotiza y trabaja aparte.
    </div>` : ""}

    ${flujos ? `<div class="field-block"><label class="field-label">Flujo por canal</label>${flujos}</div>` : ""}

    <div class="field-block">
      <label class="field-label">Otros canales no listados</label>
      <textarea data-canal-otros rows="2" placeholder="Ej. ferias comerciales, referidos...">${escapeHtml(cap.otros)}</textarea>
    </div>
    <div class="field-block">
      <label class="field-label">¿Quién atiende estos mensajes?</label>
      <textarea data-canal-distribucion rows="3" placeholder="Ej. Un asistente recibe todo y deriva por zona / Todos llegan a un mismo vendedor / Por turno...">${escapeHtml(cap.distribucion)}</textarea>
    </div>`;
}

export function attachCaptacionListeners(container, state, onChange) {
  const cap = state.captacion;
  container.querySelectorAll("[data-toggle-canal]").forEach((el) => el.addEventListener("click", () => {
    cap.canales[el.getAttribute("data-toggle-canal")] = !cap.canales[el.getAttribute("data-toggle-canal")];
    onChange({ rerender: true });
  }));
  container.querySelectorAll("[data-canal-url]").forEach((el) => el.addEventListener("input", (e) => {
    cap[el.getAttribute("data-canal-url")] = e.target.value; onChange({ rerender: false });
  }));
  const otros = container.querySelector("[data-canal-otros]");
  if (otros) otros.addEventListener("input", (e) => { cap.otros = e.target.value; onChange({ rerender: false }); });
  const dist = container.querySelector("[data-canal-distribucion]");
  if (dist) dist.addEventListener("input", (e) => { cap.distribucion = e.target.value; onChange({ rerender: false }); });

  // Flujo por canal (paso a paso)
  if (!cap.flujosPorCanal) cap.flujosPorCanal = {};
  container.querySelectorAll("[data-cflow-prop]").forEach((el) => el.addEventListener("input", (e) => {
    const k = el.getAttribute("data-cflow"); const i = parseInt(el.getAttribute("data-cflow-idx"), 10);
    cap.flujosPorCanal[k][i][el.getAttribute("data-cflow-prop")] = e.target.value; onChange({ rerender: false });
  }));
  container.querySelectorAll("[data-cflow-add]").forEach((el) => el.addEventListener("click", () => {
    const k = el.getAttribute("data-cflow-add");
    (cap.flujosPorCanal[k] = cap.flujosPorCanal[k] || []).push({ accion: "", responsable: "", herramienta: "", condicion: "" });
    onChange({ rerender: true });
  }));
  container.querySelectorAll("[data-cflow-remove]").forEach((el) => el.addEventListener("click", () => {
    const [k, i] = el.getAttribute("data-cflow-remove").split("|");
    cap.flujosPorCanal[k].splice(parseInt(i, 10), 1); onChange({ rerender: true });
  }));
}
