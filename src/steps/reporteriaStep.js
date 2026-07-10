import { REPORTES_PROSPECTOS, REPORTES_NEGOCIACIONES } from "../data/reportes.js";
import { escapeHtml } from "../utils.js";

export function renderReporteriaStep(state) {
  const rep = state.reporteria;
  const mostrarProspectos = state.entidadesHabilitadas.prospectos;
  const mostrarNegociaciones = state.entidadesHabilitadas.negociaciones;

  return `
    <p class="step-title">Reportería</p>
    <p class="step-helper">Estos son los reportes más comunes que solemos configurar. Marcá los que te sirvan — si necesitás algo distinto, contanos abajo.</p>
    ${mostrarProspectos ? renderGrupoWrapper("prospectos", "Reportes de Prospectos", REPORTES_PROSPECTOS, rep.prospectos) : ""}
    ${mostrarNegociaciones ? renderGrupoWrapper("negociaciones", "Reportes de Negociaciones", REPORTES_NEGOCIACIONES, rep.negociaciones) : ""}
    <div class="field-block">
      <label class="field-label">¿Necesitás otro reporte que no esté en la lista?</label>
      <textarea data-reporte-otros rows="3" placeholder="Describí qué información te gustaría ver y con qué frecuencia la consultarías">${escapeHtml(rep.otros)}</textarea>
    </div>`;
}

function renderGrupoWrapper(grupo, titulo, items, seleccion) {
  const rows = items.map((r) => `
    <label class="checkbox-row">
      <input type="checkbox" data-reporte-grupo="${grupo}" data-reporte="${r.key}" ${seleccion[r.key] ? "checked" : ""}>
      ${r.label}
    </label>`).join("");
  return `
    <div class="field-block">
      <label class="field-label">${titulo}</label>
      ${rows}
    </div>`;
}

export function attachReporteriaListeners(container, state, onChange) {
  container.querySelectorAll("[data-reporte-grupo]").forEach((el) => {
    el.addEventListener("change", (e) => {
      const grupo = el.getAttribute("data-reporte-grupo");
      const key = el.getAttribute("data-reporte");
      state.reporteria[grupo][key] = e.target.checked;
      onChange({ rerender: false });
    });
  });
  const otros = container.querySelector("[data-reporte-otros]");
  if (otros) otros.addEventListener("input", (e) => { state.reporteria.otros = e.target.value; onChange({ rerender: false }); });
}
