// Pantalla "Cuéntanos sobre ti" — versión CLIENTE (extranet) de "Detalles de la empresa".
// Tono conversacional, sin tecnicismos ni horas. Escribe en las mismas claves del state
// (cliente, empresa.*, meta.*) para que el iCINE del desarrollador lo lea tal cual.
import { MONEDAS } from "../data/config.js";
import { escapeHtml, escapeAttr } from "../utils.js";

export function renderClienteEmpresa(state) {
  const emp = state.empresa || {};
  const meta = state.meta || {};
  const mon = emp.monedas || {};
  const monedaChips = MONEDAS.map((m) => `
    <div class="canal-chip ${mon[m.key] ? "on" : ""}" data-cli-moneda="${m.key}">${m.label}</div>`).join("");
  const siNo = (v) => `
    <select data-cli-emp="productosEnBitrix">
      <option value="" ${!v ? "selected" : ""}>Selecciona…</option>
      <option value="si" ${v === "si" ? "selected" : ""}>Sí</option>
      <option value="no" ${v === "no" ? "selected" : ""}>No</option>
    </select>`;

  return `
    <p class="step-title">Cuéntanos sobre ti</p>
    <p class="step-helper">Con esta información arrancamos tu proyecto. Responde lo que sepas; puedes guardar un borrador y volver más tarde.</p>

    <div class="field-block">
      <label class="field-label">¿Cómo se llama tu empresa?</label>
      <input type="text" data-cli-cliente value="${escapeAttr(state.cliente || "")}" placeholder="Ej. Bicicentro">
    </div>

    <div class="field-block">
      <label class="field-label">¿A qué se dedica y qué vende?</label>
      <textarea data-cli-emp="tipoProductos" rows="3" placeholder="Ej. Vendemos e instalamos equipos de climatización para empresas…">${escapeHtml(emp.tipoProductos || "")}</textarea>
    </div>

    <div class="field-block">
      <label class="field-label">Cuéntanos un poco más sobre tu empresa</label>
      <p class="step-helper" style="margin-top:2px">¿Cómo trabajan hoy? ¿Qué te gustaría mejorar o lograr con Bitrix24?</p>
      <textarea data-cli-ne-desc rows="5" placeholder="Ej. Hoy llevamos los clientes en hojas de cálculo y se nos pierden oportunidades. Queremos ordenar y automatizar el proceso de ventas…">${escapeHtml((state.ne && state.ne.descripcion) || "")}</textarea>
    </div>

    <div class="field-block">
      <label class="field-label">¿Con qué monedas trabajas?</label>
      <div class="canal-grid">${monedaChips}</div>
      <input type="text" data-cli-emp="otrasMonedas" value="${escapeAttr(emp.otrasMonedas || "")}" placeholder="¿Otra moneda? escríbela aquí" style="margin-top:8px">
    </div>

    <div class="field-block">
      <label class="field-label">¿Ya tienes tus productos cargados en Bitrix24?</label>
      ${siNo(emp.productosEnBitrix || "")}
    </div>

    <hr style="margin:18px 0;border:none;border-top:1px solid #eee">
    <p class="field-label">Datos de tu cuenta Bitrix24</p>

    <div class="field-block">
      <label class="field-label">URL de tu cuenta</label>
      <input type="text" data-cli-meta="url" value="${escapeAttr(meta.url || "")}" placeholder="Ej. https://tuempresa.bitrix24.es">
    </div>

    <div class="field-block" style="display:flex;gap:12px;flex-wrap:wrap">
      <div style="flex:1;min-width:200px">
        <label class="field-label">¿Qué licencia tienes?</label>
        <input type="text" data-cli-meta="licencia" value="${escapeAttr(meta.licencia || "")}" placeholder="Ej. Standard, Professional…">
      </div>
      <div style="flex:1;min-width:200px">
        <label class="field-label">¿Cuándo vence?</label>
        <input type="text" data-cli-meta="licenciaVence" value="${escapeAttr(meta.licenciaVence || "")}" placeholder="Ej. 15/03/2026">
      </div>
    </div>`;
}

export function attachClienteEmpresa(container, state, onChange) {
  if (!state.empresa) state.empresa = {};
  if (!state.empresa.monedas) state.empresa.monedas = {};
  if (!state.meta) state.meta = {};
  if (!state.ne) state.ne = { descripcion: "" };

  const cli = container.querySelector("[data-cli-cliente]");
  if (cli) cli.addEventListener("input", (e) => { state.cliente = e.target.value; onChange({ rerender: false }); });

  const desc = container.querySelector("[data-cli-ne-desc]");
  if (desc) desc.addEventListener("input", (e) => { state.ne.descripcion = e.target.value; onChange({ rerender: false }); });

  container.querySelectorAll("[data-cli-emp]").forEach((el) => {
    const evt = el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(evt, (e) => { state.empresa[el.getAttribute("data-cli-emp")] = e.target.value; onChange({ rerender: false }); });
  });

  container.querySelectorAll("[data-cli-meta]").forEach((el) => {
    el.addEventListener("input", (e) => { state.meta[el.getAttribute("data-cli-meta")] = e.target.value; onChange({ rerender: false }); });
  });

  container.querySelectorAll("[data-cli-moneda]").forEach((el) => {
    el.addEventListener("click", () => {
      const k = el.getAttribute("data-cli-moneda");
      state.empresa.monedas[k] = !state.empresa.monedas[k];
      onChange({ rerender: true });
    });
  });
}
