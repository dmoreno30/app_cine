import { MONEDAS } from "../data/config.js";
import { escapeHtml, escapeAttr } from "../utils.js";

export function renderNEStep(state) {
  const emp = state.empresa;

  const monedaChips = MONEDAS.map((m) => {
    const on = emp.monedas[m.key];
    return `<div class="canal-chip ${on ? "on" : ""}" data-toggle-moneda="${m.key}">${m.label}</div>`;
  }).join("");

  const impuestoRows = (emp.impuestos || []).map((t, i) => `
    <div class="row-flex">
      <input type="text" data-imp-idx="${i}" data-imp-prop="nombre" value="${escapeAttr(t.nombre)}" placeholder="Nombre (ej. IVA, IGV)">
      <input type="text" data-imp-idx="${i}" data-imp-prop="porcentaje" value="${escapeAttr(t.porcentaje)}" placeholder="%" style="max-width:90px">
      <button class="icon-btn" data-remove-imp="${i}"><i class="ti ti-x"></i></button>
    </div>`).join("");

  const bloqueImpuestos = emp.usaImpuestos ? `
    <div class="field-block">
      <label class="field-label">País de los impuestos</label>
      <input type="text" data-empresa-paisimp value="${escapeAttr(emp.paisImpuestos)}" placeholder="Ej. México, Perú, Colombia…">
    </div>
    <div class="field-block">
      <label class="field-label">Impuestos que aplica <span style="font-weight:400;color:var(--text-secondary)">— nombre y porcentaje</span></label>
      ${impuestoRows}
      <button class="add-btn" data-add-imp><i class="ti ti-plus" style="margin-right:4px"></i>Agregar impuesto</button>
    </div>` : "";

  return `
    <p class="step-title">Detalles de la empresa</p>
    <p class="step-helper">Datos generales de la empresa del cliente. Esta información le da contexto al iCINE.</p>

    <div class="field-block">
      <label class="field-label">Nombre del cliente</label>
      <input type="text" data-cliente value="${escapeAttr(state.cliente)}" placeholder="Ej. Bicicentro">
    </div>

    <div class="field-block">
      <label class="field-label">¿A qué se dedica la empresa y qué esperan implementar?</label>
      <textarea data-ne-descripcion rows="5" placeholder="Ej. Distribuidora de repuestos. Hoy llevan el seguimiento en Excel y quieren ordenar el proceso comercial...">${escapeHtml(state.ne.descripcion)}</textarea>
    </div>

    <div class="field-block">
      <label class="field-label">¿Qué tipo de productos o servicios vende?</label>
      <textarea data-empresa-productos rows="3" placeholder="Ej. Repuestos, accesorios y servicio técnico...">${escapeHtml(emp.tipoProductos)}</textarea>
    </div>

    <div class="field-block">
      <label class="field-label">Dirección de la compañía</label>
      <input type="text" data-empresa-direccion value="${escapeAttr(emp.direccion)}" placeholder="Dirección del cliente">
    </div>

    <div class="field-block">
      <label class="field-label">Cantidad de empleados</label>
      <input type="text" data-empresa-empleados value="${escapeAttr(emp.cantidadEmpleados)}" placeholder="Ej. 25">
    </div>

    <div class="field-block">
      <label class="field-label">¿Con qué moneda(s) opera? <span style="font-weight:400;color:var(--text-secondary)">— podés marcar varias</span></label>
      <div class="canal-grid">${monedaChips}</div>
    </div>
    <div class="field-block">
      <label class="field-label">Otras monedas no listadas</label>
      <input type="text" data-empresa-otras-monedas value="${escapeAttr(emp.otrasMonedas)}" placeholder="Ej. Real (BRL), Guaraní (PYG)…">
    </div>

    <div class="field-block">
      <label class="field-label">Unidades de medida que maneja</label>
      <input type="text" data-empresa-unidades value="${escapeAttr(emp.unidadesMedida)}" placeholder="Ej. unidad, caja, kg, metro, litro…">
    </div>

    <div class="field-block">
      <label class="chk-line"><input type="checkbox" data-empresa-usaimp ${emp.usaImpuestos ? "checked" : ""}> La empresa aplica impuestos</label>
    </div>
    ${bloqueImpuestos}`;
}

export function attachNEListeners(container, state, onChange) {
  const emp = state.empresa;
  const bind = (sel, setter) => { const el = container.querySelector(sel); if (el) el.addEventListener("input", (e) => { setter(e.target.value); onChange({ rerender: false }); }); };

  bind("[data-cliente]", (v) => state.cliente = v);
  bind("[data-ne-descripcion]", (v) => state.ne.descripcion = v);
  bind("[data-empresa-productos]", (v) => emp.tipoProductos = v);
  bind("[data-empresa-direccion]", (v) => emp.direccion = v);
  bind("[data-empresa-empleados]", (v) => emp.cantidadEmpleados = v);
  bind("[data-empresa-otras-monedas]", (v) => emp.otrasMonedas = v);
  bind("[data-empresa-unidades]", (v) => emp.unidadesMedida = v);
  bind("[data-empresa-paisimp]", (v) => emp.paisImpuestos = v);

  container.querySelectorAll("[data-toggle-moneda]").forEach((el) => el.addEventListener("click", () => {
    const k = el.getAttribute("data-toggle-moneda"); emp.monedas[k] = !emp.monedas[k]; onChange({ rerender: true });
  }));

  const usa = container.querySelector("[data-empresa-usaimp]");
  if (usa) usa.addEventListener("change", (e) => { emp.usaImpuestos = e.target.checked; onChange({ rerender: true }); });

  container.querySelectorAll("[data-imp-idx]").forEach((el) => el.addEventListener("input", (e) => {
    const i = parseInt(el.getAttribute("data-imp-idx"), 10); emp.impuestos[i][el.getAttribute("data-imp-prop")] = e.target.value; onChange({ rerender: false });
  }));
  const addImp = container.querySelector("[data-add-imp]");
  if (addImp) addImp.addEventListener("click", () => { emp.impuestos.push({ nombre: "", porcentaje: "" }); onChange({ rerender: true }); });
  container.querySelectorAll("[data-remove-imp]").forEach((el) => el.addEventListener("click", () => {
    emp.impuestos.splice(parseInt(el.getAttribute("data-remove-imp"), 10), 1); onChange({ rerender: true });
  }));
}
