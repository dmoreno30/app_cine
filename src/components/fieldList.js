import { TIPOS_CAMPO } from "../data/config.js";
import { escapeAttr } from "../utils.js";

export function renderFieldList(entityKey, fields) {
  const rows = fields.map((f, i) => `
    <div class="campo-item">
      <div class="row-flex" style="align-items:center">
        <input type="text" data-field-entity="${entityKey}" data-field-prop="nombre" data-field-idx="${i}"
               value="${escapeAttr(f.nombre)}" placeholder="Nombre del campo">
        <select data-field-entity="${entityKey}" data-field-prop="tipo" data-field-idx="${i}">
          ${TIPOS_CAMPO.map((t) => `<option value="${t}" ${f.tipo === t ? "selected" : ""}>${t}</option>`).join("")}
        </select>
        <label class="checkbox-row" style="margin:0;white-space:nowrap" title="Marca si el campo es obligatorio">
          <input type="checkbox" data-field-entity="${entityKey}" data-field-prop="obligatorio" data-field-idx="${i}" ${f.obligatorio ? "checked" : ""}>
          Requerido
        </label>
        <button class="icon-btn" data-remove-field="${entityKey}|${i}"><i class="ti ti-x"></i></button>
      </div>
      ${f.tipo === "Lista" ? `
      <div class="campo-valores">
        <label style="font-size:12px;color:var(--text-secondary);display:block;margin:4px 0 3px">Valores de la lista <span style="color:#8B8983">— separados por coma</span></label>
        <input type="text" data-field-entity="${entityKey}" data-field-prop="valores" data-field-idx="${i}" value="${escapeAttr(f.valores || "")}" placeholder="Ej. Alto, Medio, Bajo">
      </div>` : ""}
    </div>`).join("");

  return `
    <div class="field-block">
      <label class="field-label">Campos personalizados</label>
      <p class="step-helper">Los campos nativos de Bitrix24 ya se incluyen por defecto. Agrega aquí únicamente los campos personalizados que necesite el cliente.</p>
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
      const val = el.type === "checkbox" ? el.checked : e.target.value;
      state.entidades[entity].camposPersonalizados[idx][prop] = val;
      // Cambiar el tipo a "Lista" debe re-renderizar para mostrar el campo de valores.
      onChange({ rerender: prop === "tipo" });
    });
  });
  container.querySelectorAll("[data-add-field]").forEach((el) => {
    el.addEventListener("click", () => {
      const entity = el.getAttribute("data-add-field");
      state.entidades[entity].camposPersonalizados.push({ nombre: "", tipo: "Texto", personalizado: true, obligatorio: false, valores: "" });
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
