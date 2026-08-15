// Catálogo de TODOS los pasos posibles. Cuáles se muestran lo decide getPasos()
// según los desarrollos que el usuario haya marcado.
const PASO_NE = { key: "ne", label: "Sobre la empresa", icon: "ti-building-store" };
const PASO_SELECCION = { key: "seleccion", label: "Selección de desarrollos", icon: "ti-checklist" };
const PASO_CAPTACION = { key: "captacion", label: "Captación de clientes", icon: "ti-antenna" };
const PASO_PROCESO = { key: "proceso", label: "Proceso comercial", icon: "ti-route" };
const PASO_REPORTERIA = { key: "reporteria", label: "Reportería", icon: "ti-chart-bar" };
const PASO_CHATBOT = { key: "chatbot", label: "Chatbot", icon: "ti-message-chatbot" };
const PASO_API = { key: "api", label: "API / Integración", icon: "ti-plug-connected" };
const PASO_APP = { key: "app", label: "Aplicación", icon: "ti-app-window" };
const PASO_CONFIRMACION = { key: "confirmacion", label: "Generar iCINE", icon: "ti-clipboard-check" };

// Devuelve los pasos activos, en orden, según state.desarrollos.
// Reglas: "Sobre la empresa" y "Generar iCINE" son fijos. El paquete "proceso"
// activa Captación + Proceso Comercial + Reportería. "Reportes" suelto reusa la
// pestaña Reportería y NO se agrega si el paquete ya está activo (de-duplicación).
export function getPasos(state) {
  const d = (state && state.desarrollos) || {};
  const pasos = [PASO_NE, PASO_SELECCION];
  if (d.proceso) pasos.push(PASO_CAPTACION, PASO_PROCESO, PASO_REPORTERIA);
  if (d.reportes && !d.proceso) pasos.push(PASO_REPORTERIA);
  if (d.chatbot) pasos.push(PASO_CHATBOT);
  if (d.api) pasos.push(PASO_API);
  if (d.app) pasos.push(PASO_APP);
  pasos.push(PASO_CONFIRMACION);
  return pasos;
}

export function renderStepper(currentIndex, pasos) {
  return pasos.map((s, i) => {
    const cls = ["step-pill"];
    if (i === currentIndex) cls.push("active");
    else if (i < currentIndex) cls.push("done");
    return `<div class="${cls.join(" ")}" data-goto-paso="${i}"><i class="ti ${s.icon}"></i>${s.label}</div>`;
  }).join("");
}

export function attachStepperListeners(container, onGoto) {
  container.querySelectorAll("[data-goto-paso]").forEach((el) => {
    el.addEventListener("click", () => onGoto(parseInt(el.getAttribute("data-goto-paso"), 10)));
  });
}
