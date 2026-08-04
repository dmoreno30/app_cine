import { MONEDAS } from "../data/config.js";
import { escapeHtml, escapeAttr } from "../utils.js";

export function renderNEStep(state) {
  const emp = state.empresa;

  const monedaChips = MONEDAS.map((m) => {
    const on = emp.monedas[m.key];
    return `<div class="canal-chip ${on ? "on" : ""}" data-toggle-moneda="${m.key}">${m.label}</div>`;
  }).join("");

  const impuestoRows = emp.impuestos.map((t, i) => `
    <div class="row-flex">
      <input type="text" data-imp-idx="${i}" data-imp-prop="nombre"
             value="${escapeAttr(t.nombre)}" placeholder="Nombre del impuesto (ej. IVA, IGV)">
      <input type="text" data-imp-idx="${i}" data-imp-prop="porcentaje"
             value="${escapeAttr(t.porcentaje)}" placeholder="%" style="max-width:90px">
      <button class="icon-btn" data-remove-imp="${i}"><i class="ti ti-x"></i></button>
    </div>`).join("");

  return `
    <p class="step-title">Cuéntanos sobre ti</p>
    <p class="step-helper">Antes de entrar en detalle, contanos en tus palabras qué hace la empresa y qué esperás lograr con esta implementación. Esta introducción la usamos luego para que la IA tenga contexto real al armar el iCINE.</p>

    <div class="field-block">
      <label class="field-label">Nombre del cliente</label>
      <input type="text" data-cliente value="${escapeAttr(state.cliente)}" placeholder="Ej. Gramar">
    </div>

    <div class="field-block">
      <label class="field-label">¿A qué se dedica la empresa y qué esperan implementar?</label>
      <textarea data-ne-descripcion rows="6" placeholder="Ej. Somos una distribuidora de mármol y granito. Hoy llevamos todo en Excel y perdemos seguimiento de los prospectos que llegan por WhatsApp. Queremos ordenar el proceso comercial y dejar de perder oportunidades...">${escapeHtml(state.ne.descripcion)}</textarea>
    </div>

    <div class="field-block">
      <label class="field-label">¿Qué tipo de productos o servicios vende?</label>
      <textarea data-empresa-productos rows="3" placeholder="Ej. Mármol, granito y cuarzo para cocinas y baños. También servicio de instalación a medida...">${escapeHtml(emp.tipoProductos)}</textarea>
    </div>

    <div class="field-block">
      <label class="field-label">¿Con qué moneda(s) opera? <span style="font-weight:400;color:var(--text-secondary)">— podés marcar varias</span></label>
      <div class="canal-grid">${monedaChips}</div>
    </div>

    <div class="field-block">
      <label class="field-label">Otras monedas no listadas</label>
      <input type="text" data-empresa-otras-monedas value="${escapeAttr(emp.otrasMonedas)}" placeholder="Ej. Real brasileño (BRL), Guaraní (PYG)...">
    </div>

    <div class="field-block">
      <label class="field-label">Impuestos que aplica <span style="font-weight:400;color:var(--text-secondary)">— nombre y porcentaje</span></label>
      ${impuestoRows}
      <button class="add-btn" data-add-imp><i class="ti ti-plus" style="margin-right:4px"></i>Agregar impuesto</button>
    </div>`;
}

export function attachNEListeners(container, state, onChange) {
  const cliente = container.querySelector("[data-cliente]");
  if (cliente) cliente.addEventListener("input", (e) => { state.cliente = e.target.value; onChange({ rerender: false }); });

  const desc = container.querySelector("[data-ne-descripcion]");
  if (desc) desc.addEventListener("input", (e) => { state.ne.descripcion = e.target.value; onChange({ rerender: false }); });

  const productos = container.querySelector("[data-empresa-productos]");
  if (productos) productos.addEventListener("input", (e) => { state.empresa.tipoProductos = e.target.value; onChange({ rerender: false }); });

  const otras = container.querySelector("[data-empresa-otras-monedas]");
  if (otras) otras.addEventListener("input", (e) => { state.empresa.otrasMonedas = e.target.value; onChange({ rerender: false }); });

  // Monedas (toggle tipo chip)
  container.querySelectorAll("[data-toggle-moneda]").forEach((el) => {
    el.addEventListener("click", () => {
      const key = el.getAttribute("data-toggle-moneda");
      state.empresa.monedas[key] = !state.empresa.monedas[key];
      onChange({ rerender: true });
    });
  });

  // Impuestos (filas agregables)
  container.querySelectorAll("[data-imp-idx]").forEach((el) => {
    el.addEventListener("input", (e) => {
      const idx = parseInt(el.getAttribute("data-imp-idx"), 10);
      const prop = el.getAttribute("data-imp-prop");
      state.empresa.impuestos[idx][prop] = e.target.value;
      onChange({ rerender: false });
    });
  });
  const addImp = container.querySelector("[data-add-imp]");
  if (addImp) addImp.addEventListener("click", () => {
    state.empresa.impuestos.push({ nombre: "", porcentaje: "" });
    onChange({ rerender: true });
  });
  container.querySelectorAll("[data-remove-imp]").forEach((el) => {
    el.addEventListener("click", () => {
      const idx = parseInt(el.getAttribute("data-remove-imp"), 10);
      state.empresa.impuestos.splice(idx, 1);
      onChange({ rerender: true });
    });
  });
}
