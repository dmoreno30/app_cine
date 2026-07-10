import { loadState, scheduleSave, resetState } from "./state.js";
import { PASOS_PRINCIPALES, renderStepper, attachStepperListeners } from "./components/stepper.js";
import { renderHeader } from "./components/header.js";
import { renderFooter } from "./components/footer.js";
import { renderNEStep, attachNEListeners } from "./steps/neStep.js";
import { renderCaptacionStep, attachCaptacionListeners } from "./steps/captacionStep.js";
import { renderProcesoComercialStep, attachProcesoComercialListeners } from "./steps/procesoComercialStep.js";
import { renderReporteriaStep, attachReporteriaListeners } from "./steps/reporteriaStep.js";
import { renderConfirmacionStep, attachConfirmacionListeners } from "./steps/confirmacionStep.js";

let state = loadState();
let currentStep = 0;

// Modo desarrollador: agregá ?dev=1 a la URL para ver el JSON canónico
// y las herramientas de descarga/copia/reinicio en el paso final.
// El cliente nunca ve esto en el enlace normal que le compartís.
const devMode = new URLSearchParams(window.location.search).get("dev") === "1";

// Token de invitación de un solo uso — viene del link que le compartís al
// cliente (?id=xxxx). Si no está presente, el servidor puente igual acepta
// el envío, pero sin control de duplicados (útil en pruebas locales).
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
  const stepKey = PASOS_PRINCIPALES[currentStep].key;

  let bodyHtml = "";
  if (stepKey === "ne") bodyHtml = renderNEStep(state);
  else if (stepKey === "captacion") bodyHtml = renderCaptacionStep(state);
  else if (stepKey === "proceso") bodyHtml = renderProcesoComercialStep(state);
  else if (stepKey === "reporteria") bodyHtml = renderReporteriaStep(state);
  else if (stepKey === "confirmacion") bodyHtml = renderConfirmacionStep(state, devMode);

  app.innerHTML = `
    ${renderHeader()}
    <div class="stepper">${renderStepper(currentStep)}</div>
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
  if (nextBtn) nextBtn.addEventListener("click", () => { currentStep = Math.min(PASOS_PRINCIPALES.length - 1, currentStep + 1); render(); });

  const card = app.querySelector(".card");
  if (stepKey === "ne") attachNEListeners(card, state, onChange);
  else if (stepKey === "captacion") attachCaptacionListeners(card, state, onChange);
  else if (stepKey === "proceso") attachProcesoComercialListeners(card, state, onChange);
  else if (stepKey === "reporteria") attachReporteriaListeners(card, state, onChange);
  else if (stepKey === "confirmacion") attachConfirmacionListeners(card, state, onChange, inviteToken);
}

render();
