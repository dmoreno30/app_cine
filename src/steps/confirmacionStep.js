import { buildCanonicalJSON, resetState } from "../state.js";
import { CANALES, ENTIDADES, ORDEN_ENTIDADES } from "../data/config.js";
import { escapeHtml, escapeAttr } from "../utils.js";
import { submitCaptura } from "../submit.js";

let lastSendStatus = null;
let sending = false;
let lastDocxUrl = null;

const ESTADOS = ["EN CREACIÓN", "POR PRESENTAR", "FINALIZADO"];

// Normaliza state.pruebas a listas { titulo, tiempo } (compat con el formato viejo de texto).
function ensurePruebas(state) {
  if (!state.pruebas) state.pruebas = {};
  const p = state.pruebas;
  const aLista = (v, def) => Array.isArray(v) ? v : ((v || "").trim() ? [{ titulo: def, tiempo: (v || "").trim() }] : [{ titulo: def, tiempo: "" }]);
  p.qa = aLista(p.qa, "Pruebas internas QA");
  p.alpha = aLista(p.alpha, "Pruebas Alpha con el cliente");
  return p;
}
function tienePrueba(arr) { return (arr || []).some((x) => (x.titulo || "").trim() && (x.tiempo || "").trim()); }

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
  // Proceso Comercial: requisitos específicos
  const dp = state.desarrollos || {};
  if (dp.proceso) {
    if (!(state.procesoIntro || "").trim()) faltan.push("Explicación del proceso comercial completo");
    ORDEN_ENTIDADES.forEach((key) => {
      const cfg = ENTIDADES[key];
      if (!cfg || cfg.type !== "pipeline") return;
      if (!(state.entidadesHabilitadas && state.entidadesHabilitadas[key])) return;
      const ent = (state.entidades && state.entidades[key]) || {};
      const pipes = Array.isArray(ent.pipelines) && ent.pipelines.length ? ent.pipelines : [ent];
      pipes.forEach((p) => {
        if (!(p.flujo || "").trim()) faltan.push(`Flujo del proceso de venta en “${cfg.label} — ${(p.nombre || "").trim() || cfg.label}”`);
      });
    });
  }

  // Captación: requisitos específicos
  const d = state.desarrollos || {};
  if (d.captacion) {
    const cap = state.captacion || {};
    if (!(cap.intro || "").trim()) faltan.push("Texto introductorio de captación");
    (cap.canales || []).forEach((c) => {
      const nom = (c.nombre || "").trim() || "canal";
      if (c.tipo === "widget") {
        if (!(c.url || "").trim()) faltan.push(`Página web del widget “${nom}”`);
      } else if (c.tipo === "tiktok" || c.tipo === "linkedin") {
        if (!(c.necesitaConector || "").trim()) faltan.push(`Indica si “${nom}” necesita conector externo`);
      }
      // FB/IG/Formularios (descripción) y demás canales no exigen pasos de flujo.
    });
    const conx = (cap.conexiones || []).filter((x) => (x.titulo || "").trim());
    if (!conx.length) faltan.push("Al menos una actividad de creación y conexión de canales");
  }
  // Aplicación: requisitos específicos
  if (d.app) {
    const ap = state.app || {};
    if (!(ap.descripcion || "").trim()) faltan.push("Descripción de la aplicación");
    const actApp = (ap.actividades || []).some((a) => (a.titulo || "").trim() && (a.tiempo || "").trim());
    if (!actApp) faltan.push("Al menos una actividad con tiempo en “Aplicación”");
    if (ap.restringeUsuarios && !(ap.usuariosPermitidos || "").trim()) faltan.push("Indicá a qué usuarios se restringe la aplicación");
  }

  const pr = ensurePruebas(state);
  if (!tienePrueba(pr.qa)) faltan.push("Al menos una Prueba interna QA con tiempo");
  if (!tienePrueba(pr.alpha)) faltan.push("Al menos una Prueba Alpha con tiempo");
  return faltan;
}

function pruebaRows(lista, tipo) {
  return (lista || []).map((x, i) => `
    <div class="row-flex">
      <input type="text" data-prueba="${tipo}" data-prueba-idx="${i}" data-prueba-prop="titulo" value="${escapeAttr(x.titulo || "")}" placeholder="Descripción de la prueba">
      <input type="text" data-prueba="${tipo}" data-prueba-idx="${i}" data-prueba-prop="tiempo" value="${escapeAttr(x.tiempo || "")}" placeholder="Tiempo (ej. 3 h)" style="max-width:140px">
      <button class="icon-btn" data-prueba-remove="${tipo}" data-prueba-idx="${i}"><i class="ti ti-x"></i></button>
    </div>`).join("");
}

export function renderConfirmacionStep(state, devMode) {
  if (!state.meta) state.meta = {};
  const pruebas = ensurePruebas(state);
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

    <div class="field-block">
      <label class="field-label">Pruebas internas QA <span style="color:#c00">*</span></label>
      <p class="step-helper" style="margin:0 0 8px;font-size:12px">Podés agregar varias. Cada una con su tiempo.</p>
      ${pruebaRows(pruebas.qa, "qa")}
      <button class="add-btn" data-prueba-add="qa"><i class="ti ti-plus" style="margin-right:4px"></i>Agregar prueba QA</button>
    </div>

    <div class="field-block">
      <label class="field-label">Pruebas Alpha con el cliente <span style="color:#c00">*</span></label>
      <p class="step-helper" style="margin:0 0 8px;font-size:12px">Podés agregar varias. Cada una con su tiempo.</p>
      ${pruebaRows(pruebas.alpha, "alpha")}
      <button class="add-btn" data-prueba-add="alpha"><i class="ti ti-plus" style="margin-right:4px"></i>Agregar prueba Alpha</button>
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
  const pruebas = ensurePruebas(state);

  const st = container.querySelector("[data-status]");
  if (st) st.addEventListener("change", (e) => { state.meta.estado = e.target.value; onChange({ rerender: false }); });

  // Pruebas QA / Alpha (listas múltiples).
  container.querySelectorAll("[data-prueba-prop]").forEach((el) => {
    const set = (e) => {
      const tipo = el.getAttribute("data-prueba");
      const idx = parseInt(el.getAttribute("data-prueba-idx"), 10);
      pruebas[tipo][idx][el.getAttribute("data-prueba-prop")] = e.target.value;
    };
    el.addEventListener("input", (e) => { set(e); onChange({ rerender: false }); });
    // Al salir del campo re-evaluamos (habilita/deshabilita "Generar") sin perder el foco al tipear.
    el.addEventListener("change", (e) => { set(e); onChange({ rerender: true }); });
  });
  container.querySelectorAll("[data-prueba-add]").forEach((el) => el.addEventListener("click", () => {
    pruebas[el.getAttribute("data-prueba-add")].push({ titulo: "", tiempo: "" });
    onChange({ rerender: true });
  }));
  container.querySelectorAll("[data-prueba-remove]").forEach((el) => el.addEventListener("click", () => {
    pruebas[el.getAttribute("data-prueba-remove")].splice(parseInt(el.getAttribute("data-prueba-idx"), 10), 1);
    onChange({ rerender: true });
  }));

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
