import { buildCanonicalJSON, resetState } from "../state.js";
import { CANALES, ENTIDADES, ORDEN_ENTIDADES } from "../data/config.js";
import { escapeHtml, escapeAttr } from "../utils.js";
import { submitCaptura } from "../submit.js";

let lastSendStatus = null;
let sending = false;
let lastDocxUrl = null;

const ESTADOS = ["EN CREACIÓN", "POR PRESENTAR", "FINALIZADO"];

function neSeleccionadas(state) {
  const d = state.desarrollos || {};
  const map = { captacion: "Captación", proceso: "Proceso Comercial", reportes: "Reportería", chatbot: "Chatbot", api: "API / Integración", app: "Aplicación", rrhh: "RRHH" };
  return Object.keys(map).filter((k) => d[k]).map((k) => ({ key: k, label: map[k] }));
}

// Validación: cada NE seleccionada necesita al menos una CIP, y pruebas QA + Alpha.
function validar(state) {
  const faltan = [];
  const cipKeyDe = { captacion: "captacion", proceso: "proceso", reportes: "reporteria", chatbot: "chatbot", api: "api", app: "app", rrhh: "rrhh" };
  neSeleccionadas(state).forEach((ne) => {
    const arr = (state.cip && state.cip[cipKeyDe[ne.key]]) || [];
    const tiene = arr.some((c) => (c.titulo || "").trim() && (c.tiempo || "").trim());
    if (!tiene) faltan.push(`Capacitación (CIP) en “${ne.label}”`);
  });
  if (!(state.pruebas && (state.pruebas.qa || "").trim())) faltan.push("Tiempo de Pruebas internas QA");
  if (!(state.pruebas && (state.pruebas.alpha || "").trim())) faltan.push("Tiempo de Pruebas Alpha con el cliente");
  return faltan;
}

export function renderConfirmacionStep(state, devMode) {
  if (!state.meta) state.meta = {};
  if (!state.pruebas) state.pruebas = { qa: "", alpha: "" };
  const nes = neSeleccionadas(state);
  const faltan = validar(state);

  let html = `
    <p class="step-title">Generar iCINE</p>
    <p class="step-helper">Revisá los datos, completá lo requerido y generá el documento.</p>

    <div class="field-block">
      <label class="field-label">Status del iCINE</label>
      <select data-status>
        ${ESTADOS.map((e) => `<option value="${e}" ${((state.meta.estado || "EN CREACIÓN") === e) ? "selected" : ""}>${e}</option>`).join("")}
      </select>
    </div>

    <div class="field-block" style="display:flex;gap:12px;flex-wrap:wrap">
      <div style="flex:1;min-width:200px">
        <label class="field-label">Pruebas internas QA — tiempo <span style="color:#c00">*</span></label>
        <input type="text" data-prueba-qa value="${escapeAttr(state.pruebas.qa)}" placeholder="Ej. 3 h">
      </div>
      <div style="flex:1;min-width:200px">
        <label class="field-label">Pruebas Alpha con el cliente — tiempo <span style="color:#c00">*</span></label>
        <input type="text" data-prueba-alpha value="${escapeAttr(state.pruebas.alpha)}" placeholder="Ej. 2 h">
      </div>
    </div>

    <div class="summary-group"><h4>Desarrollos a documentar</h4>
      ${nes.length ? `<ul>${nes.map((n) => `<li>${n.label}</li>`).join("")}</ul>` : `<p class="summary-empty">Nada seleccionado.</p>`}
    </div>
    <div class="summary-group"><h4>Cliente</h4><ul><li>${escapeHtml(state.cliente.trim() || "(sin nombre)")}</li></ul></div>`;

  if (faltan.length) {
    html += `<div class="sel-dedup"><i class="ti ti-alert-triangle"></i> Para generar el iCINE falta completar: ${faltan.map((f) => escapeHtml(f)).join(" · ")}.</div>`;
  }

  html += `
    <button class="nav-btn primary" data-action="enviar" ${(sending || faltan.length) ? "disabled" : ""}>
      ${sending ? "Generando…" : '<i class="ti ti-file-download" style="margin-right:6px"></i>Generar iCINE'}
    </button>`;

  if (lastSendStatus) html += `<p class="send-status ${lastSendStatus.ok ? "ok" : "error"}">${escapeHtml(lastSendStatus.message)}</p>`;
  if (lastDocxUrl) html += `<p class="send-status ok" style="margin-top:8px"><a href="${lastDocxUrl}" target="_blank" rel="noopener" style="color:inherit;font-weight:600"><i class="ti ti-file-download" style="margin-right:6px"></i>Descargar el iCINE generado</a></p>`;

  if (devMode) {
    const json = JSON.stringify(buildCanonicalJSON(state), null, 2);
    html += `<div class="dev-panel"><p class="dev-label"><i class="ti ti-code"></i> JSON canónico</p><pre class="json-preview">${escapeHtml(json)}</pre></div>`;
  }
  return html;
}

export function attachConfirmacionListeners(container, state, onChange, inviteToken) {
  if (!state.meta) state.meta = {};
  if (!state.pruebas) state.pruebas = { qa: "", alpha: "" };

  const st = container.querySelector("[data-status]");
  if (st) st.addEventListener("change", (e) => { state.meta.estado = e.target.value; onChange({ rerender: false }); });
  const qa = container.querySelector("[data-prueba-qa]");
  if (qa) qa.addEventListener("input", (e) => { state.pruebas.qa = e.target.value; onChange({ rerender: true }); });
  const al = container.querySelector("[data-prueba-alpha]");
  if (al) al.addEventListener("input", (e) => { state.pruebas.alpha = e.target.value; onChange({ rerender: true }); });

  const enviar = container.querySelector('[data-action="enviar"]');
  if (enviar) enviar.addEventListener("click", async () => {
    if (validar(state).length) return;
    sending = true; lastSendStatus = null; onChange({ rerender: true });
    const json = buildCanonicalJSON(state);
    const result = await submitCaptura({ ...json, _token: inviteToken });
    sending = false;
    lastDocxUrl = result.ok ? result.docxUrl : null;
    lastSendStatus = result.ok
      ? { ok: true, message: "iCINE generado correctamente." }
      : { ok: false, message: result.mensaje || "No se pudo generar. Revisá la conexión." };
    onChange({ rerender: true });
  });
}
