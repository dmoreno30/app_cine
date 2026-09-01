import { loadState, scheduleSave, resetState } from "./state.js";
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
import { renderConfirmacionStep, attachConfirmacionListeners } from "./steps/confirmacionStep.js";

let state = loadState();
// Auto-reparación: si el borrador guardado es de una versión anterior y no
// trae estos campos, los inicializamos para que la app nunca se rompa.
if (!state.desarrollos) state.desarrollos = { proceso: false, reportes: false, chatbot: false, api: false, app: false };
if (!state.modulos) state.modulos = { chatbot: "", api: "", app: "" };
let currentStep = 0;

const devMode = new URLSearchParams(window.location.search).get("dev") === "1";
const inviteToken = new URLSearchParams(window.location.search).get("id");

function setSaveStatus(text) {
  const el = document.getElementById("save-indicator");
  if (el) el.textContent = text;
}

function onChange(result = {}) {
  if (result.reset) {
    state = resetState();
    currentStep = 0;
    render();
    return;
  }
  scheduleSave(state, setSaveStatus);
  if (result.rerender) render();
}

function render() {
  const app = document.getElementById("app");
  const pasos = getPasos(state);
  // Si cambió la selección y el paso actual quedó fuera de rango, lo acotamos.
  if (currentStep > pasos.length - 1) currentStep = pasos.length - 1;
  const stepKey = pasos[currentStep].key;

  let bodyHtml = "";
  if (stepKey === "ne") bodyHtml = renderNEStep(state);
  else if (stepKey === "seleccion") bodyHtml = renderSeleccionStep(state);
  else if (stepKey === "captacion") bodyHtml = renderCaptacionStep(state);
  else if (stepKey === "proceso") bodyHtml = renderProcesoComercialStep(state);
  else if (stepKey === "reporteria") bodyHtml = renderReporteriaStep(state);
  else if (stepKey === "chatbot") bodyHtml = renderChatbotStep(state);
  else if (stepKey === "api" || stepKey === "app") bodyHtml = renderModuloStep(state, stepKey);
  else if (stepKey === "confirmacion") bodyHtml = renderConfirmacionStep(state, devMode);

  app.innerHTML = `
    ${renderHeader()}
    <div class="stepper">${renderStepper(currentStep, pasos)}</div>
    <div id="save-indicator" class="save-indicator"></div>
    <div class="card">${bodyHtml}</div>
    <div class="nav-row">
      <button class="nav-btn" data-nav="prev" ${currentStep === 0 ? "disabled" : ""}>Anterior</button>
      ${stepKey === "confirmacion" ? "" : '<button class="nav-btn primary" data-nav="next">Guardar y continuar<i class="ti ti-arrow-right" style="margin-left:6px"></i></button>'}
    </div>
    ${renderFooter()}`;

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
  else if (stepKey === "api" || stepKey === "app") attachModuloListeners(card, state, onChange, stepKey);
  else if (stepKey === "confirmacion") attachConfirmacionListeners(card, state, onChange, inviteToken);
}

render();
