import { buildCanonicalJSON, resetState } from "../state.js";
import { CANALES, ENTIDADES, ORDEN_ENTIDADES } from "../data/config.js";
import { REPORTES_PROSPECTOS, REPORTES_NEGOCIACIONES } from "../data/reportes.js";
import { escapeHtml } from "../utils.js";
import { submitCaptura } from "../submit.js";

let lastSendStatus = null; // {ok:boolean, message:string} | null
let sending = false;
let lastDocxUrl = null;

function resumenCanales(state) {
  const activos = CANALES.filter((c) => state.captacion.canales[c.key]).map((c) => c.label);
  if (state.captacion.otros.trim()) activos.push(state.captacion.otros.trim());
  return activos;
}

function resumenEntidades(state) {
  return ORDEN_ENTIDADES.filter((k) => state.entidadesHabilitadas[k]).map((k) => ENTIDADES[k].label);
}

function resumenReportes(state) {
  const nombres = [];
  REPORTES_PROSPECTOS.forEach((r) => { if (state.reporteria.prospectos[r.key]) nombres.push(r.label); });
  REPORTES_NEGOCIACIONES.forEach((r) => { if (state.reporteria.negociaciones[r.key]) nombres.push(r.label); });
  if (state.reporteria.otros.trim()) nombres.push(state.reporteria.otros.trim());
  return nombres;
}

function grupo(titulo, items) {
  const body = items.length
    ? `<ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`
    : `<p class="summary-empty">Nada seleccionado todavía.</p>`;
  return `<div class="summary-group"><h4>${titulo}</h4>${body}</div>`;
}

export function renderConfirmacionStep(state, devMode) {
  let html = `
    <p class="step-title">Confirmar y enviar</p>
    <p class="step-helper">Revisá que todo esté correcto. Al enviar, tus respuestas quedan guardadas para que el equipo de ${" "}
    asesores-e prepare el iCINE — no vas a ver el documento técnico acá.</p>
    ${grupo("Cliente", [state.cliente.trim() || "(sin nombre)"])}
    ${grupo("Necesidad específica", [state.ne.descripcion.trim() || "(sin descripción)"])}
    ${grupo("Canales de captación", resumenCanales(state))}
    ${grupo("Entidades del proceso comercial", resumenEntidades(state))}
    ${grupo("Reportes solicitados", resumenReportes(state))}
    <button class="nav-btn primary" data-action="enviar" ${sending ? "disabled" : ""}>
      ${sending ? "Enviando…" : '<i class="ti ti-send" style="margin-right:6px"></i>Enviar respuestas'}
    </button>`;

  if (lastSendStatus) {
    html += `<p class="send-status ${lastSendStatus.ok ? "ok" : "error"}">${escapeHtml(lastSendStatus.message)}</p>`;
  }

  if (lastDocxUrl) {
    html += `
      <p class="send-status ok" style="margin-top:8px">
        <a href="${lastDocxUrl}" target="_blank" rel="noopener" style="color:inherit;font-weight:600">
          <i class="ti ti-file-download" style="margin-right:6px"></i>Descargar el iCINE generado
        </a>
      </p>`;
  }

  if (devMode) {
    const json = JSON.stringify(buildCanonicalJSON(state), null, 2);
    html += `
      <div class="dev-panel">
        <p class="dev-label"><i class="ti ti-code"></i> Modo desarrollador — JSON canónico</p>
        <pre class="json-preview">${escapeHtml(json)}</pre>
        <div class="export-actions">
          <button class="nav-btn" data-action="download"><i class="ti ti-download" style="margin-right:6px"></i>Descargar JSON</button>
          <button class="nav-btn" data-action="copy"><i class="ti ti-copy" style="margin-right:6px"></i>Copiar</button>
          <button class="nav-btn" data-action="reset"><i class="ti ti-refresh" style="margin-right:6px"></i>Reiniciar formulario</button>
        </div>
      </div>`;
  }

  return html;
}

export function attachConfirmacionListeners(container, state, onChange, inviteToken) {
  const enviar = container.querySelector('[data-action="enviar"]');
  if (enviar) enviar.addEventListener("click", async () => {
    sending = true; lastSendStatus = null; onChange({ rerender: true });
    const json = buildCanonicalJSON(state);
    const result = await submitCaptura({ ...json, _token: inviteToken });
    sending = false;
    lastDocxUrl = result.ok ? result.docxUrl : null;
    lastSendStatus = result.ok
      ? { ok: true, message: "Enviado correctamente. El equipo de asesores-e ya puede continuar." }
      : result.reason === "rejected"
        ? { ok: false, message: result.mensaje || "No se pudo enviar." }
        : { ok: false, message: "Todavía no hay conexión con Bitrix24 configurada — tu borrador sigue guardado localmente. Avisale a Dairon para terminar de conectar el envío." };
    onChange({ rerender: true });
  });

  const dl = container.querySelector('[data-action="download"]');
  if (dl) dl.addEventListener("click", () => {
    try {
      const json = JSON.stringify(buildCanonicalJSON(state), null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const slug = (state.cliente.trim() || "cliente").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      a.href = url; a.download = `captura-icine-${slug}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) { alert("No se pudo generar la descarga: " + e.message); }
  });

  const cp = container.querySelector('[data-action="copy"]');
  if (cp) cp.addEventListener("click", () => {
    const json = JSON.stringify(buildCanonicalJSON(state), null, 2);
    navigator.clipboard.writeText(json).then(() => {
      cp.innerHTML = '<i class="ti ti-check" style="margin-right:6px"></i>Copiado';
      setTimeout(() => { cp.innerHTML = '<i class="ti ti-copy" style="margin-right:6px"></i>Copiar'; }, 1500);
    }).catch(() => alert("No se pudo copiar automáticamente."));
  });

  const rs = container.querySelector('[data-action="reset"]');
  if (rs) rs.addEventListener("click", () => {
    if (!confirm("Esto borra el borrador guardado localmente. ¿Continuar?")) return;
    onChange({ reset: true });
  });
}
