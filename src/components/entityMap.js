import { ENTIDADES, ORDEN_ENTIDADES } from "../data/config.js";

// Mapa de piezas del proceso. Un solo control: el interruptor activa/desactiva
// la pieza y un clic en una pieza activa la selecciona para configurarla abajo.
// La pieza que se está configurando queda resaltada ("Configurando").
export function renderEntityMap(state, selectedKey) {
  const cards = ORDEN_ENTIDADES.map((key) => {
    const cfg = ENTIDADES[key];
    const enabled = cfg.obligatorio || !!state.entidadesHabilitadas[key];
    const isSel = enabled && selectedKey === key;

    const cls = ["entity-card"];
    if (isSel) cls.push("selected");
    if (!enabled) cls.push("disabled");

    const control = cfg.obligatorio
      ? `<span class="en-tag">Obligatorio</span>`
      : `<label class="toggle-switch" onclick="event.stopPropagation()" title="Activar / desactivar">
           <input type="checkbox" data-toggle-entidad="${key}" ${enabled ? "checked" : ""}>
           <span class="toggle-slider"></span>
         </label>`;

    const pie = isSel
      ? `<div class="ec-foot sel"><i class="ti ti-adjustments-alt"></i> Configurando</div>`
      : (enabled
          ? `<div class="ec-foot on">Tocar para configurar</div>`
          : `<div class="ec-foot off">Desactivada</div>`);

    const title = enabled ? "Clic para configurar esta pieza" : "Activá el interruptor para poder configurarla";

    return `
      <div class="${cls.join(" ")}" data-select-entidad="${key}" title="${title}">
        <div class="ec-top"><i class="ti ${cfg.icon}"></i>${control}</div>
        <div class="en-label">${cfg.label}</div>
        ${pie}
      </div>`;
  }).join("");

  const info = selectedKey && ENTIDADES[selectedKey]
    ? `<div class="entity-info"><strong>${ENTIDADES[selectedKey].label}:</strong> ${ENTIDADES[selectedKey].info}</div>`
    : `<div class="entity-info">Activá las piezas que el cliente necesita y hacé clic en una para configurarla abajo.</div>`;

  return `
    <p class="step-title">Las piezas del proceso en Bitrix24</p>
    <p class="step-helper">Usá el <b>interruptor</b> para activar o desactivar cada pieza. Hacé <b>clic en una pieza activa</b> para configurarla abajo: la que estás configurando queda resaltada. Negociaciones, Contactos y Compañías son la base y siempre están activas.</p>
    <div class="entity-grid">${cards}</div>
    ${info}`;
}

export function attachEntityMapListeners(container, state, onChange) {
  // El interruptor activa/desactiva (no selecciona por sí mismo; eso lo resuelve el paso).
  container.querySelectorAll("[data-toggle-entidad]").forEach((el) => {
    el.addEventListener("change", (e) => {
      onChange({ toggleKey: el.getAttribute("data-toggle-entidad"), checked: e.target.checked });
    });
  });
  // Clic en la tarjeta: seleccionar para configurar (el paso la enciende si estaba apagada).
  container.querySelectorAll("[data-select-entidad]").forEach((el) => {
    el.addEventListener("click", () => {
      onChange({ selectKey: el.getAttribute("data-select-entidad") });
    });
  });
}
