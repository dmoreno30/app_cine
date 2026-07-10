import { escapeAttr } from "../utils.js";

export function renderStageList(entityKey, listKey, label, list) {
  const rows = list.map((val, i) => `
    <div class="row-flex">
      <input type="text" data-stage-entity="${entityKey}" data-stage-list="${listKey}" data-stage-idx="${i}"
             value="${escapeAttr(val)}" placeholder="Nombre de la etapa">
      <button class="icon-btn" data-remove-stage="${entityKey}|${listKey}|${i}"><i class="ti ti-x"></i></button>
    </div>`).join("");

  return `
    <div class="field-block">
      <label class="field-label">${label}</label>
      ${rows}
      <button class="add-btn" data-add-stage="${entityKey}|${listKey}"><i class="ti ti-plus" style="margin-right:4px"></i>Agregar etapa</button>
    </div>`;
}

export function attachStageListeners(container, state, onChange) {
  container.querySelectorAll("input[data-stage-entity]").forEach((el) => {
    el.addEventListener("input", (e) => {
      const entity = el.getAttribute("data-stage-entity");
      const list = el.getAttribute("data-stage-list");
      const idx = parseInt(el.getAttribute("data-stage-idx"), 10);
      state.entidades[entity][list][idx] = e.target.value;
      onChange({ rerender: false });
    });
  });
  container.querySelectorAll("[data-add-stage]").forEach((el) => {
    el.addEventListener("click", () => {
      const [entity, list] = el.getAttribute("data-add-stage").split("|");
      state.entidades[entity][list].push("");
      onChange({ rerender: true });
    });
  });
  container.querySelectorAll("[data-remove-stage]").forEach((el) => {
    el.addEventListener("click", () => {
      const [entity, list, idx] = el.getAttribute("data-remove-stage").split("|");
      const arr = state.entidades[entity][list];
      if (arr.length > 1) arr.splice(parseInt(idx, 10), 1);
      onChange({ rerender: true });
    });
  });
}
