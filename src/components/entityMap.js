import { ENTIDADES, ORDEN_ENTIDADES } from "../data/config.js";

export function renderEntityMap(state, expandedKey) {
  const cards = ORDEN_ENTIDADES.map((key) => {
    const cfg = ENTIDADES[key];
    const enabled = state.entidadesHabilitadas[key];
    const cls = ["entity-card"];
    if (expandedKey === key) cls.push("selected");
    if (!cfg.obligatorio && !enabled) cls.push("disabled");

    const toggle = cfg.obligatorio
      ? `<span class="en-tag">Obligatorio</span>`
      : `<label class="toggle-switch" onclick="event.stopPropagation()">
           <input type="checkbox" data-toggle-entidad="${key}" ${enabled ? "checked" : ""}>
           <span class="toggle-slider"></span>
         </label><span class="en-tag opt">Opcional</span>`;

    return `
      <div class="${cls.join(" ")}" data-select-entidad="${key}">
        ${toggle}
        <i class="ti ${cfg.icon}"></i>
        <div class="en-label">${cfg.label}</div>
      </div>`;
  }).join("");

  const info = expandedKey
    ? `<div class="entity-info"><strong>${ENTIDADES[expandedKey].label}:</strong> ${ENTIDADES[expandedKey].info}</div>`
    : `<div class="entity-info">Hacé clic en cualquier entidad para ver qué guarda. Las opcionales se pueden desactivar si el cliente no las necesita.</div>`;

  return `
    <p class="step-title">Las piezas del proceso en Bitrix24</p>
    <p class="step-helper">Bitrix24 organiza todo en "entidades". Cada una cumple un rol distinto y se conectan entre sí. Negociaciones, Contactos y Compañías son la base y siempre se capturan; Prospectos, Cotizaciones y Facturas dependen de cómo trabaja el cliente.</p>
    <div class="entity-grid">${cards}</div>
    ${info}`;
}

export function attachEntityMapListeners(container, state, onChange) {
  container.querySelectorAll("[data-toggle-entidad]").forEach((el) => {
    el.addEventListener("change", (e) => {
      const key = el.getAttribute("data-toggle-entidad");
      state.entidadesHabilitadas[key] = e.target.checked;
      onChange({ rerender: true });
    });
  });
  container.querySelectorAll("[data-select-entidad]").forEach((el) => {
    el.addEventListener("click", () => {
      onChange({ rerender: true, expandKey: el.getAttribute("data-select-entidad") });
    });
  });
}
