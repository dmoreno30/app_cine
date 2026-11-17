// Navegación por ÁRBOL del wizard. Reusa los pasos que ya decide getPasos(state)
// y los agrupa en áreas (según el rediseño del CEO). Cada hoja conserva el índice
// global dentro de `pasos`, de modo que la navegación (currentStep, Anterior/
// Siguiente y attachStepperListeners) sigue funcionando igual que con las píldoras.

// Definición de áreas: a qué grupo pertenece cada paso. El orden de las hojas
// dentro del área lo sigue marcando getPasos() (no esta tabla).
const AREAS = [
  { key: "base", label: "Datos del proyecto", icon: "ti-settings", steps: ["ne", "seleccion"] },
  { key: "gcd", label: "Gestión Colaborativa digital", icon: "ti-layout-grid", steps: ["captacion", "proceso", "reporteria", "chatbot", "api", "app"] },
  { key: "rrhh", label: "RR.HH.", icon: "ti-users-group", steps: ["rrhh"] },
  { key: "cierre", label: "Cierre", icon: "ti-clipboard-check", steps: ["confirmacion"] }
];

// Devuelve el área a la que pertenece un stepKey (o "gcd" por defecto).
function areaDe(stepKey) {
  const a = AREAS.find((ar) => ar.steps.includes(stepKey));
  return a ? a.key : "gcd";
}

// Renderiza el árbol lateral. `pasos` es la lista plana (de getPasos filtrada);
// `currentIndex` es el índice activo dentro de esa lista.
export function renderTree(currentIndex, pasos) {
  // Index global de cada paso para conservar data-goto-paso.
  const conIdx = pasos.map((p, i) => ({ ...p, idx: i }));
  const bloques = AREAS.map((area) => {
    const hojas = conIdx.filter((p) => areaDe(p.key) === area.key);
    if (!hojas.length) return "";
    const items = hojas.map((p) => {
      const cls = ["wz-leaf"];
      if (p.idx === currentIndex) cls.push("active");
      else if (p.idx < currentIndex) cls.push("done");
      return `<div class="${cls.join(" ")}" data-goto-paso="${p.idx}">
        <i class="ti ${p.icon}"></i><span>${p.label}</span>
      </div>`;
    }).join("");
    // No mostramos el encabezado del grupo "base" ni "cierre" (son contenedores
    // de un par de hojas sueltas); sí el de las áreas reales del rediseño.
    const conHeader = area.key === "gcd" || area.key === "rrhh";
    const header = conHeader
      ? `<div class="wz-area-h"><i class="ti ${area.icon}"></i>${area.label}</div>`
      : "";
    return `<div class="wz-area">${header}${items}</div>`;
  }).join("");
  return `<nav class="wizard-tree" aria-label="Navegación del desarrollo">${bloques}</nav>`;
}

export { AREAS };
