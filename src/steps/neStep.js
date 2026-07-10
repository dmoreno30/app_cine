import { escapeHtml, escapeAttr } from "../utils.js";

export function renderNEStep(state) {
  return `
    <p class="step-title">Necesidad específica</p>
    <p class="step-helper">Antes de entrar en detalle, contanos en tus palabras qué hace la empresa y qué esperás lograr con esta implementación. Esta introducción la usamos luego para que la IA tenga contexto real al armar el iCINE.</p>
    <div class="field-block">
      <label class="field-label">Nombre del cliente</label>
      <input type="text" data-cliente value="${escapeAttr(state.cliente)}" placeholder="Ej. Gramar">
    </div>
    <div class="field-block">
      <label class="field-label">¿A qué se dedica la empresa y qué esperan implementar?</label>
      <textarea data-ne-descripcion rows="6" placeholder="Ej. Somos una distribuidora de mármol y granito. Hoy llevamos todo en Excel y perdemos seguimiento de los prospectos que llegan por WhatsApp. Queremos ordenar el proceso comercial y dejar de perder oportunidades...">${escapeHtml(state.ne.descripcion)}</textarea>
    </div>`;
}

export function attachNEListeners(container, state, onChange) {
  const cliente = container.querySelector("[data-cliente]");
  if (cliente) cliente.addEventListener("input", (e) => { state.cliente = e.target.value; onChange({ rerender: false }); });

  const desc = container.querySelector("[data-ne-descripcion]");
  if (desc) desc.addEventListener("input", (e) => { state.ne.descripcion = e.target.value; onChange({ rerender: false }); });
}
