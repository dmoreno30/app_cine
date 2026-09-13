import { loadState, resetState } from "./state.js";
import { buildCanonicalJSON } from "./state.js";
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

let state = loadState();
normalizar(state);
let currentStep = 0;
const devMode = new URLSearchParams(window.location.search).get("dev") === "1";

// Sesión de trabajo (un desarrollo = un registro en la Lista)
const sesion = { elementId: null, proyectoId: null, usuario: null, tipo: "icine", lista: [], status: "" };

// Asegura que el state tenga los campos mínimos (borradores viejos / nuevos)
function normalizar(s) {
  if (!s.desarrollos) s.desarrollos = { proceso: false, reportes: false, chatbot: false, api: false, app: false, rrhh: false };
  if (s.desarrollos.rrhh === undefined) s.desarrollos.rrhh = false;
  if (!s.modulos) s.modulos = { api: "", app: "" };
  if (!s.rrhh) s.rrhh = { procesos: [] };
  if (!s.api) s.api = { flujos: [] };
  if (!s.chatbot) s.chatbot = { tipoBot: "", plataformas: {}, menus: [] };
  if (!s.reporteria) s.reporteria = { reportes: [] };
  return s;
}
function tituloDesarrollo() {
  return `iCINE — ${(state.cliente || "sin nombre").trim()}`;
}
function setStatus(txt) { sesion.status = txt; const el = document.getElementById("sesion-status"); if (el) el.textContent = txt; }

async function refrescarLista() {
  if (!sesion.proyectoId) { sesion.lista = []; return; }
  const r = await listarDesarrollos(sesion.proyectoId);
  sesion.lista = (r && r.ok) ? r.items : [];
}

async function guardar() {
  if (!sesion.proyectoId) { setStatus("Falta el ID del proyecto."); return; }
  setStatus("Guardando…");
  const comun = { proyectoId: sesion.proyectoId, tipo: sesion.tipo, borrador: state, responsableId: sesion.usuario && sesion.usuario.id, nombre: tituloDesarrollo() };
  let r;
  if (!sesion.elementId) {
    r = await crearDesarrollo(comun);
    if (r && r.ok) { sesion.elementId = r.elementId; setStatus(`Creado #${r.elementId} ✓`); await refrescarLista(); render(); return; }
  } else {
    r = await guardarDesarrollo({ elementId: sesion.elementId, ...comun });
    if (r && r.ok) { setStatus("Guardado ✓"); return; }
  }
  setStatus("Error: " + ((r && r.mensaje) || "no se pudo guardar"));
}

async function continuar(elementId) {
  if (!elementId) return;
  setStatus("Cargando…");
  const r = await cargarDesarrollo(elementId);
  if (r && r.ok) {
    state = normalizar(r.borrador || {});
    sesion.elementId = r.elementId;
    sesion.tipo = r.tipo || "icine";
    currentStep = 0;
    setStatus(`Continuando #${r.elementId}`);
    render();
  } else { setStatus("Error: " + ((r && r.mensaje) || "no se pudo cargar")); }
}

function nuevo() {
  state = normalizar(resetState());
  sesion.elementId = null;
  currentStep = 0;
  setStatus("Nuevo iCINE (sin guardar)");
  render();
}

function onChange(result = {}) {
  if (result.reset) { nuevo(); return; }
  if (result.rerender) render();
}

function barraSesion() {
  const opciones = sesion.lista.map((d) => `<option value="${d.id}">${(d.nombre || "Sin nombre")} (#${d.id})</option>`).join("");
  return `
    <div class="sesion-bar">
      <span class="sb-item"><i class="ti ti-folder"></i> Proyecto: <b>${sesion.proyectoId || "—"}</b></span>
      ${!sesion.proyectoId ? '<input id="sb-proy" placeholder="ID proyecto" style="max-width:110px"><button class="sb-btn" data-sb="usarproy">Usar</button>' : ""}
      <span class="sb-sep"></span>
      <select id="sb-sel" ${sesion.lista.length ? "" : "disabled"}><option value="">${sesion.lista.length ? "Elegí un desarrollo…" : "No hay desarrollos"}</option>${opciones}</select>
      <button class="sb-btn" data-sb="continuar">Continuar</button>
      <button class="sb-btn" data-sb="nuevo"><i class="ti ti-plus"></i> Nuevo</button>
      <span class="sb-sep"></span>
      <button class="sb-btn primary" data-sb="guardar"><i class="ti ti-device-floppy"></i> Guardar</button>
      <span id="sesion-status" class="sb-status">${sesion.status}${sesion.elementId ? "  ·  Registro #" + sesion.elementId : ""}</span>
    </div>`;
}

function render() {
  const app = document.getElementById("app");
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
  else if (stepKey === "confirmacion") bodyHtml = renderConfirmacionStep(state, devMode);

  app.innerHTML = `
    ${renderHeader()}
    ${barraSesion()}
    <div class="stepper">${renderStepper(currentStep, pasos)}</div>
    <div class="card">${bodyHtml}</div>
    <div class="nav-row">
      <button class="nav-btn" data-nav="prev" ${currentStep === 0 ? "disabled" : ""}>Anterior</button>
      ${stepKey === "confirmacion" ? "" : '<button class="nav-btn primary" data-nav="next">Siguiente<i class="ti ti-arrow-right" style="margin-left:6px"></i></button>'}
    </div>
    ${renderFooter()}`;

  // Barra de sesión
  app.querySelectorAll("[data-sb]").forEach((el) => el.addEventListener("click", () => {
    const acc = el.getAttribute("data-sb");
    if (acc === "guardar") guardar();
    else if (acc === "nuevo") nuevo();
    else if (acc === "continuar") { const sel = document.getElementById("sb-sel"); continuar(sel && sel.value); }
    else if (acc === "usarproy") { const i = document.getElementById("sb-proy"); if (i && i.value) { sesion.proyectoId = i.value.trim(); refrescarLista().then(render); } }
  }));

  attachStepperListeners(app, (i) => { currentStep = i; render(); });
  const prevBtn = app.querySelector('[data-nav="prev"]');
  if (prevBtn) prevBtn.addEventListener("click", () => { currentStep = Math.max(0, currentStep - 1); render(); });
  const nextBtn = app.querySelector('[data-nav="next"]');
  if (nextBtn) nextBtn.addEventListener("click", () => { currentStep = Math.min(getPasos(state).length - 1, currentStep + 1); render(); });

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
  render(); // pinta ya, aunque el contexto tarde
  await initBitrix();
  const ctx = await obtenerContextoBX();
  sesion.proyectoId = ctx.proyectoId;
  sesion.usuario = ctx.usuario;
  await refrescarLista();
  setStatus(enBitrix() ? "" : "Fuera de Bitrix (modo prueba)");
  render();
}
init();
