import { defaultState, resetState } from "./state.js";
import { getPasos, renderStepper, attachStepperListeners } from "./components/stepper.js";
import { renderHeader } from "./components/header.js";
import { renderFooter } from "./components/footer.js";
import { renderNEStep, attachNEListeners } from "./steps/neStep.js";
import { renderSeleccionStep, attachSeleccionListeners } from "./steps/seleccionStep.js";
import { renderCaptacionStep, attachCaptacionListeners } from "./steps/captacionStep.js";
import { renderProcesoComercialStep, attachProcesoComercialListeners } from "./steps/procesoComercialStep.js";
import { renderReporteriaStep, attachReporteriaListeners } from "./steps/reporteriaStep.js";
import { renderModuloStep, attachModuloListeners } from "./steps/moduloStep.js";
import { renderChatbotStep, attachChatbotListeners } from "./steps/chatbotStep.js";
import { renderRRHHStep, attachRRHHListeners } from "./steps/rrhhStep.js";
import { renderAPIStep, attachAPIListeners } from "./steps/apiStep.js";
import { renderConfirmacionStep, attachConfirmacionListeners } from "./steps/confirmacionStep.js";
import { initBitrix, obtenerContextoBX, enBitrix } from "./bitrix.js";
import { listarDesarrollos, crearDesarrollo, cargarDesarrollo, guardarDesarrollo } from "./apiCliente.js";
import { escapeHtml, escapeAttr } from "./utils.js";

let state = normalizar(resetState());
let currentStep = 0;
let vista = "inicio";            // "inicio" | "form"
let cargando = true;
const devProy = new URLSearchParams(window.location.search).get("proyecto"); // fallback de prueba

const ctx = { proyectoId: null, proyectoNombre: "", jefeId: "", jefeNombre: "", usuario: null };
const sesion = { elementId: null, tipo: "icine", neTexto: "", lista: [], status: "" };

function normalizar(s) {
  const base = defaultState();
  s = s || {};
  const emp = s.empresa || {};
  const cap = s.captacion || {};
  const out = {
    ...base, ...s,
    ne: { ...base.ne, ...(s.ne || {}) },
    meta: { ...base.meta, ...(s.meta || {}) },
    cip: { ...base.cip, ...(s.cip || {}) },
    pruebas: { ...base.pruebas, ...(s.pruebas || {}) },
    empresa: {
      ...base.empresa, ...emp,
      monedas: { ...base.empresa.monedas, ...(emp.monedas || {}) },
      impuestos: Array.isArray(emp.impuestos) ? emp.impuestos : base.empresa.impuestos
    },
    desarrollos: { ...base.desarrollos, ...(s.desarrollos || {}) },
    modulos: { ...base.modulos, ...(s.modulos || {}) },
    chatbot: {
      ...base.chatbot, ...(s.chatbot || {}),
      plataformas: { ...(base.chatbot.plataformas || {}), ...((s.chatbot || {}).plataformas || {}) },
      menus: Array.isArray((s.chatbot || {}).menus) ? s.chatbot.menus : base.chatbot.menus
    },
    rrhh: { procesos: Array.isArray((s.rrhh || {}).procesos) ? s.rrhh.procesos : base.rrhh.procesos },
    api: { ...base.api, ...(s.api || {}), flujos: Array.isArray((s.api || {}).flujos) ? s.api.flujos : base.api.flujos },
    captacion: {
      ...base.captacion, ...cap,
      canales: { ...base.captacion.canales, ...(cap.canales || {}) },
      chatbot: { ...base.captacion.chatbot, ...(cap.chatbot || {}) }
    },
    entidadesHabilitadas: { ...base.entidadesHabilitadas, ...(s.entidadesHabilitadas || {}) },
    entidades: { ...base.entidades, ...(s.entidades || {}) },
    reporteria: {
      descripcionReportes: (s.reporteria || {}).descripcionReportes || "",
      datasets: Array.isArray((s.reporteria || {}).datasets) ? s.reporteria.datasets : (((s.reporteria || {}).dataset || "").trim() ? [{ descripcion: s.reporteria.dataset, tiempo: "" }] : base.reporteria.datasets),
      reportes: Array.isArray((s.reporteria || {}).reportes) ? s.reporteria.reportes : base.reporteria.reportes,
      roles: Array.isArray((s.reporteria || {}).roles) ? s.reporteria.roles : base.reporteria.roles
    },
    roles: Array.isArray(s.roles) && s.roles.length ? s.roles : base.roles,
    consideraciones: { ...base.consideraciones, ...(s.consideraciones || {}) }
  };
  // Migración: borradores viejos donde "proceso" era el paquete completo.
  if (s.desarrollos && s.desarrollos.proceso && s.desarrollos.captacion === undefined) {
    out.desarrollos.captacion = true;
    out.desarrollos.reportes = true;
  }
  // Migración de entidades pipeline (borradores viejos → estructura nueva)
  const toStage = (x) => (typeof x === "string" ? { nombre: x, descripcion: "" } : { nombre: (x && (x.nombre || x.etapa)) || "", descripcion: (x && (x.descripcion || x.desc)) || "" });
  Object.values(out.entidades || {}).forEach((e) => {
    if (!e || typeof e !== "object") return;
    if (Array.isArray(e.etapasProgreso)) e.etapasProgreso = e.etapasProgreso.map(toStage);
    if (Array.isArray(e.etapasFallo)) e.etapasFallo = e.etapasFallo.map(toStage);
    if (!Array.isArray(e.flujoPasos)) e.flujoPasos = [{ accion: "", responsable: "", herramienta: "", condicion: "" }];
    if (!Array.isArray(e.automatizaciones)) {
      e.automatizaciones = e.automatizacion ? [{ parametro: "", valor: e.automatizacion }] : [{ parametro: "", valor: "" }];
    }
  });
  return out;
}
function setStatus(t) { sesion.status = t; const el = document.getElementById("sesion-status"); if (el) el.textContent = t; }
function aplicarMetaContexto() {
  if (!state.meta) state.meta = {};
  if (ctx.usuario && ctx.usuario.nombre) state.meta.consultor = ctx.usuario.nombre;
  if (ctx.jefeNombre) state.meta.jefeProyecto = ctx.jefeNombre;
  if (!state.meta.version) state.meta.version = "1.0";
}
function datosComunes() {
  return {
    proyectoId: ctx.proyectoId, proyectoNombre: ctx.proyectoNombre,
    jefeId: ctx.jefeId, desarrolladorId: ctx.usuario && ctx.usuario.id,
    neTexto: sesion.neTexto, tipo: sesion.tipo, borrador: state
  };
}
async function refrescarLista() {
  if (!ctx.proyectoId) { sesion.lista = []; return; }
  const r = await listarDesarrollos(ctx.proyectoId);
  sesion.lista = (r && r.ok) ? r.items : [];
}
async function crear(neTexto, tipo) {
  if (!ctx.proyectoId) { setStatus("No se detectó el proyecto."); return; }
  sesion.neTexto = neTexto; sesion.tipo = tipo || "icine";
  state = normalizar(resetState());
  aplicarMetaContexto();
  setStatus("Creando…");
  const r = await crearDesarrollo(datosComunes());
  if (r && r.ok) { sesion.elementId = r.elementId; vista = "form"; currentStep = 0; setStatus("Creado #" + r.elementId); render(); }
  else setStatus("Error: " + ((r && r.mensaje) || "no se pudo crear"));
}
async function continuar(elementId) {
  setStatus("Cargando…");
  const r = await cargarDesarrollo(elementId);
  if (r && r.ok) {
    state = normalizar(r.borrador || {});
    aplicarMetaContexto();
    sesion.elementId = r.elementId; sesion.tipo = r.tipo || "icine"; sesion.neTexto = r.neTexto || "";
    vista = "form"; currentStep = 0; setStatus("Editando #" + r.elementId); render();
  } else setStatus("Error: " + ((r && r.mensaje) || "no se pudo cargar"));
}
async function guardar() {
  if (!sesion.elementId) return;
  setStatus("Guardando…");
  const r = await guardarDesarrollo({ elementId: sesion.elementId, ...datosComunes() });
  setStatus(r && r.ok ? "Guardado ✓" : "Error: " + ((r && r.mensaje) || "no se pudo"));
}
function volverInicio() { vista = "inicio"; sesion.elementId = null; refrescarLista().then(render); }
function onChange(result = {}) { if (result.reset) { volverInicio(); return; } if (result.rerender) render(); }

/* ---------------- PANTALLA DE INICIO ---------------- */
function renderInicio() {
  if (cargando) return `<div class="card"><p>Cargando…</p></div>`;
  if (!ctx.proyectoId) {
    return `<div class="card">
      <p class="step-title">No se detectó el proyecto</p>
      <p class="step-helper">Esta aplicación debe abrirse <b>dentro de un proyecto de Bitrix24</b> (registrada como aplicación, no como iframe suelto). Si estás probando fuera de Bitrix, agregá <code>?proyecto=ID</code> a la URL.</p>
    </div>`;
  }
  const filas = sesion.lista.length
    ? sesion.lista.map((d) => `
        <div class="ini-row">
          <div><b>${escapeHtml(d.neTexto || d.nombre || "Sin nombre")}</b> <span style="color:#888">#${d.id}</span></div>
          <button class="sb-btn primary" data-continuar="${d.id}">Continuar</button>
        </div>`).join("")
    : `<p style="color:#888">No hay desarrollos en curso para este proyecto.</p>`;
  return `<div class="card">
    <p class="step-title">Desarrollos del proyecto</p>
    <p class="step-helper">Proyecto: <b>${escapeHtml(ctx.proyectoNombre || "")}</b> (#${ctx.proyectoId})</p>
    <div class="ini-lista">${filas}</div>
    <hr style="margin:18px 0;border:none;border-top:1px solid #eee">
    <p class="field-label">Crear un nuevo desarrollo</p>
    <input type="text" data-ne-texto placeholder="Nombre de las NE (ej. Proceso comercial - chatbot - reportes)">
    <div style="display:flex;gap:8px;align-items:center;margin-top:8px">
      <select data-tipo><option value="icine">iCINE</option><option value="t24">T24</option></select>
      <button class="sb-btn primary" data-crear><i class="ti ti-plus"></i> Crear</button>
    </div>
  </div>`;
}

/* ---------------- RENDER GENERAL ---------------- */
function render() {
  const app = document.getElementById("app");

  if (vista === "inicio") {
    app.innerHTML = `${renderHeader()}${renderInicio()}<div id="sesion-status" class="sb-status">${sesion.status}</div>${renderFooter()}`;
    const cr = app.querySelector("[data-crear]");
    if (cr) cr.addEventListener("click", () => {
      const t = app.querySelector("[data-ne-texto]"); const tp = app.querySelector("[data-tipo]");
      crear((t && t.value.trim()) || "Desarrollo", tp && tp.value);
    });
    app.querySelectorAll("[data-continuar]").forEach((el) => el.addEventListener("click", () => continuar(el.getAttribute("data-continuar"))));
    return;
  }

  // vista === "form"
  const pasos = getPasos(state);
  if (currentStep > pasos.length - 1) currentStep = pasos.length - 1;
  const stepKey = pasos[currentStep].key;
  let bodyHtml = "";
  if (stepKey === "ne") bodyHtml = renderNEStep(state);
  else if (stepKey === "seleccion") bodyHtml = renderSeleccionStep(state);
  else if (stepKey === "captacion") bodyHtml = renderCaptacionStep(state);
  else if (stepKey === "proceso") bodyHtml = renderProcesoComercialStep(state);
  else if (stepKey === "reporteria") bodyHtml = renderReporteriaStep(state);
  else if (stepKey === "chatbot") bodyHtml = renderChatbotStep(state);
  else if (stepKey === "rrhh") bodyHtml = renderRRHHStep(state);
  else if (stepKey === "api") bodyHtml = renderAPIStep(state);
  else if (stepKey === "app") bodyHtml = renderModuloStep(state, stepKey);
  else if (stepKey === "confirmacion") bodyHtml = renderConfirmacionStep(state, false);

  // Campo "Consideraciones" al final de cada NE (se agrega al iCINE al cerrar la NE)
  const NE_CONS = { captacion: "captacion", proceso: "proceso", reporteria: "reporteria", chatbot: "chatbot", api: "api", app: "app", rrhh: "rrhh" };
  if (NE_CONS[stepKey]) {
    const ck = NE_CONS[stepKey];
    if (!state.cip) state.cip = {};
    if (!Array.isArray(state.cip[ck])) state.cip[ck] = [];
    const cipRows = state.cip[ck].map((c, i) => `
      <div class="row-flex">
        <input type="text" data-cip="${ck}" data-cip-idx="${i}" data-cip-prop="titulo" value="${escapeAttr(c.titulo || "")}" placeholder="Título de la capacitación">
        <input type="text" data-cip="${ck}" data-cip-idx="${i}" data-cip-prop="tiempo" value="${escapeAttr(c.tiempo || "")}" placeholder="Tiempo (ej. 2 h)" style="max-width:130px">
        <button class="icon-btn" data-cip-remove="${ck}|${i}"><i class="ti ti-x"></i></button>
      </div>`).join("");
    bodyHtml += `
      <div class="field-block" style="border-top:1px solid #eee;margin-top:16px;padding-top:14px">
        <label class="field-label"><i class="ti ti-school"></i> Capacitación (CIP) <span style="color:#c00">*</span></label>
        <p class="step-helper" style="margin-top:2px">Capacitación de implementación personalizada para esta NE. Se agrega a la tabla de tiempos (Capacitación — CIP).</p>
        ${cipRows}
        <button class="add-btn" data-cip-add="${ck}"><i class="ti ti-plus" style="margin-right:4px"></i>Agregar capacitación</button>
      </div>`;

    if (!state.consideraciones) state.consideraciones = {};
    const val = escapeHtml(state.consideraciones[ck] || "");
    bodyHtml += `
      <div class="field-block" style="border-top:1px solid #eee;margin-top:16px;padding-top:14px">
        <label class="field-label"><i class="ti ti-note"></i> Consideraciones</label>
        <p class="step-helper" style="margin-top:2px">Texto libre que se agregará al final de esta NE en el iCINE.</p>
        <textarea data-consideraciones="${ck}" rows="3" placeholder="Aclaraciones, supuestos, dependencias…">${val}</textarea>
      </div>`;
  }

  const barra = `<div class="sesion-bar">
    <button class="sb-btn" data-volver><i class="ti ti-arrow-left"></i> Inicio</button>
    <span class="sb-item">${escapeHtml(sesion.neTexto || "Desarrollo")} · #${sesion.elementId}</span>
    <button class="sb-btn primary" data-guardar><i class="ti ti-device-floppy"></i> Guardar</button>
    <span id="sesion-status" class="sb-status">${sesion.status}</span>
  </div>`;

  app.innerHTML = `${renderHeader()}${barra}
    <div class="stepper">${renderStepper(currentStep, pasos)}</div>
    <div class="card">${bodyHtml}</div>
    <div class="nav-row">
      <button class="nav-btn" data-nav="prev" ${currentStep === 0 ? "disabled" : ""}>Anterior</button>
      ${stepKey === "confirmacion" ? "" : '<button class="nav-btn primary" data-nav="next">Siguiente<i class="ti ti-arrow-right" style="margin-left:6px"></i></button>'}
    </div>${renderFooter()}`;

  app.querySelector("[data-volver]").addEventListener("click", volverInicio);
  app.querySelector("[data-guardar]").addEventListener("click", guardar);
  attachStepperListeners(app, (i) => { currentStep = i; render(); });
  const prev = app.querySelector('[data-nav="prev"]'); if (prev) prev.addEventListener("click", () => { currentStep = Math.max(0, currentStep - 1); render(); });
  const next = app.querySelector('[data-nav="next"]'); if (next) next.addEventListener("click", () => { currentStep = Math.min(getPasos(state).length - 1, currentStep + 1); render(); });

  // listener del campo Consideraciones (si está presente)
  const cons = app.querySelector("[data-consideraciones]");
  if (cons) cons.addEventListener("input", (e) => {
    const k = cons.getAttribute("data-consideraciones");
    if (!state.consideraciones) state.consideraciones = {};
    state.consideraciones[k] = e.target.value;
  });

  // CIP (capacitación) por NE
  app.querySelectorAll("[data-cip-prop]").forEach((el) => el.addEventListener("input", (e) => {
    const k = el.getAttribute("data-cip"); const i = parseInt(el.getAttribute("data-cip-idx"), 10);
    state.cip[k][i][el.getAttribute("data-cip-prop")] = e.target.value;
  }));
  app.querySelectorAll("[data-cip-add]").forEach((el) => el.addEventListener("click", () => {
    const k = el.getAttribute("data-cip-add");
    (state.cip[k] = state.cip[k] || []).push({ titulo: "", tiempo: "" });
    render();
  }));
  app.querySelectorAll("[data-cip-remove]").forEach((el) => el.addEventListener("click", () => {
    const [k, i] = el.getAttribute("data-cip-remove").split("|");
    state.cip[k].splice(parseInt(i, 10), 1); render();
  }));

  const card = app.querySelector(".card");
  if (stepKey === "ne") attachNEListeners(card, state, onChange);
  else if (stepKey === "seleccion") attachSeleccionListeners(card, state, onChange);
  else if (stepKey === "captacion") attachCaptacionListeners(card, state, onChange);
  else if (stepKey === "proceso") attachProcesoComercialListeners(card, state, onChange);
  else if (stepKey === "reporteria") attachReporteriaListeners(card, state, onChange);
  else if (stepKey === "chatbot") attachChatbotListeners(card, state, onChange);
  else if (stepKey === "rrhh") attachRRHHListeners(card, state, onChange);
  else if (stepKey === "api") attachAPIListeners(card, state, onChange);
  else if (stepKey === "app") attachModuloListeners(card, state, onChange, stepKey);
  else if (stepKey === "confirmacion") attachConfirmacionListeners(card, state, onChange, null);
}

async function init() {
  render();
  await initBitrix();
  const c = await obtenerContextoBX();
  ctx.proyectoId = c.proyectoId || devProy || null;
  ctx.proyectoNombre = c.proyectoNombre || (devProy ? "Proyecto de prueba" : "");
  ctx.jefeId = c.jefeId || "";
  ctx.jefeNombre = c.jefeNombre || "";
  ctx.usuario = c.usuario || null;
  await refrescarLista();
  cargando = false;
  render();
}
init();
