import { EJEMPLOS_ETAPAS } from "../data/ejemplosEtapas.js";

export function renderExampleStages(entityKey) {
  const ej = EJEMPLOS_ETAPAS[entityKey];
  if (!ej) return "";
  const row = (tag, cls, items) => `
    <div class="example-row">
      <span class="example-tag ${cls}">${tag}</span>
      ${items.map((s) => `<span class="ej-pill ${cls}">${s}</span>`).join("")}
    </div>`;

  return `
    <div class="example-block">
      <p class="example-label"><i class="ti ti-bulb"></i> Ejemplo ilustrativo — así se ve normalmente, no es tu configuración</p>
      ${row("Progreso", "prog", ej.progreso)}
      ${row("Éxito", "suc", ej.exito)}
      ${row("Descarte", "loss", ej.descarte)}
    </div>`;
}
