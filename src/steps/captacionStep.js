import { CANALES } from "../data/config.js";
import { escapeHtml, escapeAttr } from "../utils.js";

export function renderCaptacionStep(state) {
  const cap = state.captacion;
  const chips = CANALES.map((c) => {
    const on = cap.canales[c.key];
    return `<div class="canal-chip ${on ? "on" : ""}" data-toggle-canal="${c.key}"><i class="ti ${c.icon}"></i>${c.label}</div>`;
  }).join("");

  return `
    <p class="step-title">Captación de clientes</p>
    <p class="step-helper">¿Por dónde llegan tus clientes? Marcá todos los canales que usás actualmente — esto determina qué integraciones necesitará Bitrix24.</p>
    <div class="field-block">
      <div class="canal-grid">${chips}</div>
    </div>

    ${cap.canales.paginaweb ? `
    <div class="field-block">
      <label class="field-label">¿Cuál es la URL de tu página web?</label>
      <input type="text" data-canal-url="paginawebUrl" value="${escapeAttr(cap.paginawebUrl)}" placeholder="https://...">
    </div>` : ""}

    ${cap.canales.tiendavirtual ? `
    <div class="field-block">
      <label class="field-label">¿Cuál es la URL de tu tienda virtual?</label>
      <input type="text" data-canal-url="tiendavirtualUrl" value="${escapeAttr(cap.tiendavirtualUrl)}" placeholder="https://...">
    </div>` : ""}

    ${cap.canales.whatsapp ? `
    <div class="entity-info">
      <i class="ti ti-info-circle"></i> WhatsApp no es un canal nativo de Bitrix24 — se conecta mediante una plataforma externa de pago (Wazzup). Esa integración se cotiza y trabaja aparte, con horas propias, y no forma parte de este iCINE.
    </div>` : ""}

    <div class="field-block">
      <label class="checkbox-row">
        <input type="checkbox" data-chatbot-bool="necesita" ${cap.chatbot.necesita ? "checked" : ""}>
        ¿Necesitás un chatbot?
      </label>
    </div>
    ${cap.chatbot.necesita ? `
    <div class="entity-info">
      <i class="ti ti-info-circle"></i> Un chatbot atiende automáticamente los primeros mensajes de un cliente (por ejemplo en tu web o redes), responde preguntas frecuentes y deriva la conversación a un vendedor cuando hace falta una persona. Se integra al ecosistema de Bitrix24 a través de Canal Abierto, pero requiere una <strong>licencia externa de pago</strong> además de la de Bitrix24.
    </div>
    <div class="field-block">
      <label class="field-label">¿Qué te gustaría que haga el chatbot?</label>
      <textarea data-chatbot-text="descripcion" rows="3" placeholder="Ej. Responder horarios y ubicación, calificar si el interesado busca comprar o solo cotizar, agendar una llamada con un vendedor...">${escapeHtml(cap.chatbot.descripcion)}</textarea>
    </div>` : ""}

    <div class="field-block">
      <label class="field-label">Otros canales no listados</label>
      <textarea data-canal-otros rows="2" placeholder="Ej. ferias comerciales, referidos de otros clientes...">${escapeHtml(cap.otros)}</textarea>
    </div>
    <div class="field-block">
      <label class="field-label">¿Quién atiende estos mensajes?</label>
      <textarea data-canal-distribucion rows="3" placeholder="Ej. Un asistente recibe todos los mensajes y los deriva por zona a cada vendedor / Todos llegan directo a un mismo vendedor / Se reparten por turno...">${escapeHtml(cap.distribucion)}</textarea>
    </div>`;
}

export function attachCaptacionListeners(container, state, onChange) {
  container.querySelectorAll("[data-toggle-canal]").forEach((el) => {
    el.addEventListener("click", () => {
      const key = el.getAttribute("data-toggle-canal");
      state.captacion.canales[key] = !state.captacion.canales[key];
      onChange({ rerender: true });
    });
  });

  container.querySelectorAll("[data-canal-url]").forEach((el) => {
    el.addEventListener("input", (e) => {
      state.captacion[el.getAttribute("data-canal-url")] = e.target.value;
      onChange({ rerender: false });
    });
  });

  const chatbotBool = container.querySelector("[data-chatbot-bool]");
  if (chatbotBool) chatbotBool.addEventListener("change", (e) => {
    state.captacion.chatbot.necesita = e.target.checked;
    onChange({ rerender: true });
  });
  const chatbotText = container.querySelector("[data-chatbot-text]");
  if (chatbotText) chatbotText.addEventListener("input", (e) => {
    state.captacion.chatbot.descripcion = e.target.value;
    onChange({ rerender: false });
  });

  const otros = container.querySelector("[data-canal-otros]");
  if (otros) otros.addEventListener("input", (e) => { state.captacion.otros = e.target.value; onChange({ rerender: false }); });

  const dist = container.querySelector("[data-canal-distribucion]");
  if (dist) dist.addEventListener("input", (e) => { state.captacion.distribucion = e.target.value; onChange({ rerender: false }); });
}
