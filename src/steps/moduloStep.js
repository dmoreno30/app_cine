// Paso genérico para los módulos nuevos (chatbot, api, app). Por ahora capturan
// una descripción libre; sus preguntas detalladas se agregan más adelante.
import { escapeHtml } from "../utils.js";

const META = {
  chatbot: {
    titulo: "Chatbot",
    helper: "Describí el flujo del bot que se va a construir sobre la plataforma vinculada a Bitrix24: qué debe preguntar, cómo califica y cuándo deriva a un asesor.",
    placeholder: "Ej. El bot saluda, pregunta producto y zona, califica el interés y, si está calificado, deriva al asesor de esa zona..."
  },
  api: {
    titulo: "Creación de API / Integración con terceros",
    helper: "Describí qué sistemas se van a integrar, en qué sentido viaja la información y qué se sincroniza.",
    placeholder: "Ej. Integrar el ERP contable con Bitrix24: al ganar una negociación, generar el comprobante y devolver el número de factura..."
  },
  app: {
    titulo: "Creación de aplicación",
    helper: "Describí qué debe hacer la aplicación a medida, quién la usa y qué problema resuelve.",
    placeholder: "Ej. Una app interna para que los técnicos registren visitas desde el celular y queden vinculadas a la negociación..."
  }
};

export function renderModuloStep(state, key) {
  if (!state.modulos) state.modulos = { chatbot: "", api: "", app: "" };
  const meta = META[key];
  return `
    <p class="step-title">${meta.titulo}</p>
    <p class="step-helper">${meta.helper}</p>
    <div class="field-block">
      <label class="field-label">Descripción del desarrollo</label>
      <textarea data-modulo="${key}" rows="8" placeholder="${meta.placeholder}">${escapeHtml(state.modulos[key] || "")}</textarea>
    </div>
    <div class="sel-dedup" style="background:var(--surface-alt,#f5f5f5)">
      <i class="ti ti-tools"></i> Las preguntas detalladas de este módulo se irán agregando aquí en próximas versiones. Por ahora, esta descripción se guarda y viaja en el borrador.
    </div>`;
}

export function attachModuloListeners(container, state, onChange, key) {
  if (!state.modulos) state.modulos = { chatbot: "", api: "", app: "" };
  const el = container.querySelector(`[data-modulo="${key}"]`);
  if (el) el.addEventListener("input", (e) => { state.modulos[key] = e.target.value; onChange({ rerender: false }); });
}
