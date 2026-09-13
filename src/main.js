import { loadState, resetState } from "./state.js";
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

const ctx = { proyectoId: null, proyectoNombre: "", jefeId: "", usuario: null };
const sesion = { elementId: null, tipo: "icine", neTexto: "", lista: [], status: "" };

function normalizar(s) {
  s = s || {};
  if (!s.desarrollos) s.desarrollos = { proceso: false, reportes: false, chatbot: false, api: false, app: false, rrhh: false };
  if (s.desarrollos.rrhh === undefined) s.desarrollos.rrhh = false;
  if (!s.modulos) s.modulos = { api: "", app: "" };
  if (!s.rrhh) s.rrhh = { procesos: [] };
  if (!s.api) s.api = { flujos: [] };
  if (!s.chatbot) s.chatbot = { tipoBot: "", plataformas: {}, menus: [] };
  if (!s.reporteria) s.reporteria = { reportes: [] };
  if (!s.empresa) s.empresa = { tipoProductos: "", monedas: {}, otrasMonedas: "", impuestos: [] };
  if (!s.ne) s.ne = { descripcion: "" };
  if (s.cliente === undefined) s.cliente = "";
  return s;
}
function setStatus(t) { sesion.status = t; const el = document.getElementById("sesion-status"); if (el) el.textContent = t; }
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
  ctx.usuario = c.usuario || null;
  await refrescarLista();
  cargando = false;
  render();
}
init();
