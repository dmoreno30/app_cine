import { escapeAttr, escapeHtml } from "../utils.js";

function nombreDe(x) { return typeof x === "string" ? x : (x.nombre || ""); }
function descDe(x) { return typeof x === "string" ? "" : (x.descripcion || ""); }

export function renderStageList(entityKey, listKey, label, list) {
  const rows = (list || []).map((val, i) => `
    <div class="stage-item">
      <div class="row-flex">
        <input type="text" data-stage-entity="${entityKey}" data-stage-list="${listKey}" data-stage-idx="${i}" data-stage-prop="nombre"
               value="${escapeAttr(nombreDe(val))}" placeholder="Nombre de la etapa">
        <button class="icon-btn" data-remove-stage="${entityKey}|${listKey}|${i}"><i class="ti ti-x"></i></button>
      </div>
      <textarea data-stage-entity="${entityKey}" data-stage-list="${listKey}" data-stage-idx="${i}" data-stage-prop="descripcion"
                rows="2" placeholder="Descripción: qué pasa en esta etapa">${escapeHtml(descDe(val))}</textarea>
    </div>`).join("");
  return `
    <div class="field-block">
      <label class="field-label">${label}</label>
      ${rows}
      <button class="add-btn" data-add-stage="${entityKey}|${listKey}"><i class="ti ti-plus" style="margin-right:4px"></i>Agregar etapa</button>
    </div>`;
}

export function attachStageListeners(container, state, onChange) {
  container.querySelectorAll("[data-stage-prop]").forEach((el) => {
    el.addEventListener("input", (e) => {
      const entity = el.getAttribute("data-stage-entity");
      const list = el.getAttribute("data-stage-list");
      const idx = parseInt(el.getAttribute("data-stage-idx"), 10);
      const prop = el.getAttribute("data-stage-prop");
      let item = state.entidades[entity][list][idx];
      if (typeof item === "string") item = { nombre: item, descripcion: "" };
      item[prop] = e.target.value;
      state.entidades[entity][list][idx] = item;
      onChange({ rerender: false });
    });
  });
  container.querySelectorAll("[data-add-stage]").forEach((el) => {
    el.addEventListener("click", () => {
      const [entity, list] = el.getAttribute("data-add-stage").split("|");
      state.entidades[entity][list].push({ nombre: "", descripcion: "" });
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
