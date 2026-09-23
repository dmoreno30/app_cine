import { MONEDAS, WEBSERVICES } from "../data/config.js";
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
      <label class="field-label">Antecedentes de la empresa</label>
      <p class="step-helper" style="margin-top:2px">Describí bien el contexto: a qué se dedica, cómo trabaja hoy, qué problemas tiene y qué busca lograr. Este texto va en los Antecedentes del iCINE.</p>
      <textarea data-ne-descripcion rows="6" placeholder="Ej. SUR COMPANY es una empresa de ingeniería y venta de productos. Hoy gestiona sus oportunidades en hojas de cálculo, sin visibilidad del pipeline ni trazabilidad. Busca ordenar y automatizar su proceso comercial en Bitrix24...">${escapeHtml(state.ne.descripcion)}</textarea>
    </div>

    <div class="field-block" style="display:flex;gap:12px;flex-wrap:wrap">
      <div style="flex:1;min-width:220px">
        <label class="field-label">URL del Bitrix24 del cliente</label>
        <input type="text" data-meta-url value="${escapeAttr(state.meta && state.meta.url || "")}" placeholder="https://cliente.bitrix24.es">
      </div>
      <div style="flex:1;min-width:220px">
        <label class="field-label">Licencia actual</label>
        <input type="text" data-meta-licencia value="${escapeAttr(state.meta && state.meta.licencia || "")}" placeholder="Ej. Professional, Standard, Gratuita…">
      </div>
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
    ${bloqueImpuestos}

    <div class="field-block">
      <label class="field-label">¿La instancia/licencia actual alcanza o se recomienda upgrade?</label>
      <p class="step-helper" style="margin-top:2px">Se agrega en "Recomendaciones funcionales y de infraestructura" del iCINE.</p>
      <textarea data-empresa-recomendacion rows="2" placeholder="Ej. La licencia Standard alcanza para el alcance actual / Se recomienda upgrade a Professional para automatizaciones ilimitadas...">${escapeHtml(emp.recomendacionInstancia || "")}</textarea>
    </div>

    <div class="field-block">
      <label class="field-label">Infraestructura / Web Services</label>
      <select data-empresa-webservice>
        <option value="">No aplica</option>
        ${WEBSERVICES.map((w) => `<option value="${escapeAttr(w)}" ${emp.webService === w ? "selected" : ""}>${w}</option>`).join("")}
      </select>
    </div>

    <div class="field-block">
      <label class="field-label">Fuera del alcance de este iCINE (Versión 2 / Fase 2)</label>
      <textarea data-empresa-fasedos rows="3" placeholder="Qué queda propuesto para una fase posterior (integraciones, reportería avanzada, etc.)">${escapeHtml(emp.faseDos || "")}</textarea>
    </div>`;
}

export function attachNEListeners(container, state, onChange) {
  const emp = state.empresa;
  const bind = (sel, setter) => { const el = container.querySelector(sel); if (el) el.addEventListener("input", (e) => { setter(e.target.value); onChange({ rerender: false }); }); };

  if (!state.meta) state.meta = {};
  bind("[data-meta-url]", (v) => state.meta.url = v);
  bind("[data-meta-licencia]", (v) => state.meta.licencia = v);
  bind("[data-cliente]", (v) => state.cliente = v);
  bind("[data-ne-descripcion]", (v) => state.ne.descripcion = v);
  bind("[data-empresa-productos]", (v) => emp.tipoProductos = v);
  bind("[data-empresa-direccion]", (v) => emp.direccion = v);
  bind("[data-empresa-empleados]", (v) => emp.cantidadEmpleados = v);
  bind("[data-empresa-otras-monedas]", (v) => emp.otrasMonedas = v);
  bind("[data-empresa-unidades]", (v) => emp.unidadesMedida = v);
  bind("[data-empresa-paisimp]", (v) => emp.paisImpuestos = v);
  bind("[data-empresa-recomendacion]", (v) => emp.recomendacionInstancia = v);
  bind("[data-empresa-fasedos]", (v) => emp.faseDos = v);
  const ws = container.querySelector("[data-empresa-webservice]");
  if (ws) ws.addEventListener("change", (e) => { emp.webService = e.target.value; onChange({ rerender: false }); });

  container.querySelectorAll("[data-toggle-moneda]").forEach((el) => el.addEventListener("click", () => {
    const k = el.getAttribute("data-toggle-moneda"); emp.monedas[k] = !emp.monedas[k]; onChange({ rerender: true });
  }));

  const usa = container.querySelector("[data-empresa-usaimp]");
  if (usa) usa.addEventListener("change", (e) => {
    emp.usaImpuestos = e.target.checked;
    if (emp.usaImpuestos && (!emp.impuestos || emp.impuestos.length === 0)) emp.impuestos = [{ nombre: "", porcentaje: "" }];
    onChange({ rerender: true });
  });

  container.querySelectorAll("[data-imp-idx]").forEach((el) => el.addEventListener("input", (e) => {
    const i = parseInt(el.getAttribute("data-imp-idx"), 10); emp.impuestos[i][el.getAttribute("data-imp-prop")] = e.target.value; onChange({ rerender: false });
  }));
  const addImp = container.querySelector("[data-add-imp]");
  if (addImp) addImp.addEventListener("click", () => { emp.impuestos.push({ nombre: "", porcentaje: "" }); onChange({ rerender: true }); });
  container.querySelectorAll("[data-remove-imp]").forEach((el) => el.addEventListener("click", () => {
    emp.impuestos.splice(parseInt(el.getAttribute("data-remove-imp"), 10), 1); onChange({ rerender: true });
  }));
}
