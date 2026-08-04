export const PASOS_PRINCIPALES = [
  { key: "ne", label: "Sobre la empresa", icon: "ti-building-store" },
  { key: "captacion", label: "Captación de clientes", icon: "ti-antenna" },
  { key: "proceso", label: "Proceso comercial", icon: "ti-route" },
  { key: "reporteria", label: "Reportería", icon: "ti-chart-bar" },
  { key: "confirmacion", label: "Confirmar y enviar", icon: "ti-clipboard-check" }
];

export function renderStepper(currentIndex) {
  return PASOS_PRINCIPALES.map((s, i) => {
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
