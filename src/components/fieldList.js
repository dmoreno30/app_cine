import { TIPOS_CAMPO } from "../data/config.js";
import { escapeAttr } from "../utils.js";

export function renderFieldList(entityKey, fields) {
  const rows = fields.map((f, i) => `
    <div class="row-flex">
      <input type="text" data-field-entity="${entityKey}" data-field-prop="nombre" data-field-idx="${i}"
             value="${escapeAttr(f.nombre)}" placeholder="Nombre del campo">
      <select data-field-entity="${entityKey}" data-field-prop="tipo" data-field-idx="${i}">
        ${TIPOS_CAMPO.map((t) => `<option value="${t}" ${f.tipo === t ? "selected" : ""}>${t}</option>`).join("")}
      </select>
      <button class="icon-btn" data-remove-field="${entityKey}|${i}"><i class="ti ti-x"></i></button>
    </div>`).join("");

  return `
    <div class="field-block">
      <label class="field-label">Campos personalizados</label>
      ${rows}
      <button class="add-btn" data-add-field="${entityKey}"><i class="ti ti-plus" style="margin-right:4px"></i>Agregar campo</button>
    </div>`;
}

export function attachFieldListeners(container, state, onChange) {
  container.querySelectorAll("[data-field-entity]").forEach((el) => {
    const evt = el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(evt, (e) => {
      const entity = el.getAttribute("data-field-entity");
      const prop = el.getAttribute("data-field-prop");
      const idx = parseInt(el.getAttribute("data-field-idx"), 10);
      state.entidades[entity].camposPersonalizados[idx][prop] = e.target.value;
      onChange({ rerender: false });
    });
  });
  container.querySelectorAll("[data-add-field]").forEach((el) => {
    el.addEventListener("click", () => {
      const entity = el.getAttribute("data-add-field");
      state.entidades[entity].camposPersonalizados.push({ nombre: "", tipo: "Texto" });
      onChange({ rerender: true });
    });
  });
  container.querySelectorAll("[data-remove-field]").forEach((el) => {
    el.addEventListener("click", () => {
      const [entity, idx] = el.getAttribute("data-remove-field").split("|");
      const arr = state.entidades[entity].camposPersonalizados;
      if (arr.length > 1) arr.splice(parseInt(idx, 10), 1);
      onChange({ rerender: true });
    });
  });
}
