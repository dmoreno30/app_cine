// Paso "Creación de API / Integración": describe la integración entre Bitrix24 y
// otro software y la detalla como PASOS numerados de sincronización. Cada paso
// indica el objeto, si crea o actualiza, el sentido (incluida la propia instancia
// de Bitrix24), su endpoint y método, y un tiempo opcional.
import { OBJETOS_API, DIRECCIONES_API, API_ACCIONES, API_METODOS, API_AUTENTICACION, API_SINCRONIZACION } from "../data/config.js";
import { escapeHtml, escapeAttr } from "../utils.js";

function sel(lista, val, usaKey) {
  return lista.map((o) => {
    const v = usaKey ? o.key : o;
    const t = usaKey ? o.label : o;
    return `<option value="${escapeAttr(v)}" ${val === v ? "selected" : ""}>${escapeHtml(t)}</option>`;
  }).join("");
}

function pasoCard(p, i) {
  return `
    <div class="rep-card">
      <div class="rep-head" style="align-items:center">
        <span class="paso-num">${i + 1}</span>
        <select data-api-p="${i}" data-api-pprop="accion" style="max-width:130px"><option value="">Acción…</option>${sel(API_ACCIONES, p.accion, true)}</select>
        <select data-api-p="${i}" data-api-pprop="objeto" style="max-width:170px"><option value="">Objeto…</option>${sel(OBJETOS_API, p.objeto, false)}</select>
        <button class="icon-btn" data-api-premove="${i}" title="Quitar paso"><i class="ti ti-trash"></i></button>
      </div>
      <div class="rep-field">
        <label>Sentido</label>
        <select data-api-p="${i}" data-api-pprop="direccion"><option value="">¿Dónde ocurre?…</option>${sel(DIRECCIONES_API, p.direccion, true)}</select>
      </div>
      <div class="rep-field">
        <label>¿Qué hace este paso?</label>
        <textarea data-api-p="${i}" data-api-pprop="descripcion" rows="2" placeholder="Ej. Al ganar una negociación en Bitrix24 se crea la factura en el ERP.">${escapeHtml(p.descripcion || "")}</textarea>
      </div>
      <div class="row-flex" style="margin-top:8px">
        <select data-api-p="${i}" data-api-pprop="metodo" style="max-width:110px"><option value="">Método…</option>${sel(API_METODOS, p.metodo, false)}</select>
        <input type="text" data-api-p="${i}" data-api-pprop="endpoint" value="${escapeAttr(p.endpoint || "")}" placeholder="Endpoint (opcional) — ej. /api/facturas" style="flex:1">
        <input type="text" data-api-p="${i}" data-api-pprop="tiempo" value="${escapeAttr(p.tiempo || "")}" placeholder="T. desarrollo (opc.)" style="max-width:150px">
      </div>
      <p class="step-helper" style="margin:2px 0 0;font-size:11px">Tiempo estimado para <b>construir</b> este paso (no el de ejecución del endpoint).</p>
      <label class="chk-line" style="margin-top:8px">
        <input type="checkbox" data-api-p="${i}" data-api-pprop="mapeaId" ${p.mapeaId ? "checked" : ""}>
        El sistema destino devuelve un ID que se guarda para futuras actualizaciones (mapeo de IDs)
      </label>
      <div class="rep-field" style="margin-top:4px">
        <label>Consideraciones de este paso</label>
        <input type="text" data-api-p="${i}" data-api-pprop="consideraciones" value="${escapeAttr(p.consideraciones || "")}" placeholder="Ej. requiere que el producto exista en ambos sistemas">
      </div>
    </div>`;
}

export function renderAPIStep(state) {
  if (!state.api) state.api = {};
  const a = state.api;
  if (!Array.isArray(a.pasos)) a.pasos = [];

  const pasos = a.pasos.map((p, i) => pasoCard(p, i)).join("")
    || '<p style="font-size:13px;color:#888;margin:4px 0">Todavía no agregaste pasos de sincronización.</p>';

  const autOtro = a.autenticacion === "Otro / a definir";

  return `
    <p class="step-title">Creación de API / Integración</p>
    <p class="step-helper">Documentá la integración entre Bitrix24 y otro software: qué resuelve, cómo se conecta y los pasos de la sincronización.</p>

    <div class="field-block">
      <label class="field-label">Descripción del desarrollo</label>
      <textarea data-api-field="descripcion" rows="4" placeholder="Ej. Integrar Bitrix24 con el ERP contable para que, al ganar una negociación, la factura se genere automáticamente y se devuelva el número de comprobante...">${escapeHtml(a.descripcion || "")}</textarea>
    </div>

    <div class="field-block" style="display:flex;gap:12px;flex-wrap:wrap">
      <div style="flex:1;min-width:220px">
        <label class="field-label">¿Con qué software se integra?</label>
        <input type="text" data-api-field="otroSoftware" value="${escapeAttr(a.otroSoftware || "")}" placeholder="Ej. ERP contable, sistema propio, etc.">
      </div>
      <div style="flex:1;min-width:220px">
        <label class="field-label">URL base del servicio <span style="font-weight:400;color:var(--text-secondary)">— opcional</span></label>
        <input type="text" data-api-field="urlBase" value="${escapeAttr(a.urlBase || "")}" placeholder="Ej. https://api.erp.com/v1">
      </div>
    </div>

    <div class="field-block">
      <label class="field-label">Autenticación</label>
      <select data-api-sel="autenticacion"><option value="">¿Cómo se autentica?…</option>${sel(API_AUTENTICACION, a.autenticacion, false)}</select>
      ${autOtro ? `<input type="text" data-api-field="autenticacionNota" value="${escapeAttr(a.autenticacionNota || "")}" placeholder="Detalle de la autenticación" style="margin-top:8px">` : ""}
    </div>

    <div class="field-block">
      <label class="field-label">Dirección de la integración <span style="font-weight:400;color:var(--text-secondary)">— podés marcar las dos</span></label>
      <label class="chk-line"><input type="checkbox" data-api-dir="dirBitrixHaciaOtro" ${a.dirBitrixHaciaOtro ? "checked" : ""}> Bitrix24 → software externo</label>
      <label class="chk-line"><input type="checkbox" data-api-dir="dirOtroHaciaBitrix" ${a.dirOtroHaciaBitrix ? "checked" : ""}> Software externo → Bitrix24</label>
    </div>

    <div class="field-block">
      <label class="field-label">¿Cuándo se sincroniza?</label>
      <select data-api-sel="sincronizacion">${sel(API_SINCRONIZACION, a.sincronizacion, true)}</select>
      ${a.sincronizacion === "programada" ? `<input type="text" data-api-field="sincronizacionNota" value="${escapeAttr(a.sincronizacionNota || "")}" placeholder="¿Cada cuánto? Ej. cada 15 minutos, cada noche…" style="margin-top:8px">` : ""}
    </div>

    <div class="field-block">
      <label class="chk-line"><input type="checkbox" data-api-ws ${a.webService ? "checked" : ""}> Se construirá un web service / API propia (recomendado cuando no se conoce el otro software)</label>
      ${a.webService ? `<input type="text" data-api-wsnota value="${escapeAttr(a.webServiceNota || "")}" placeholder="Detalle del web service (opcional)" style="margin-top:8px">` : ""}
    </div>

    <div class="field-block">
      <label class="field-label">Pasos de la sincronización</label>
      <p class="step-helper" style="margin-top:2px;font-size:12px">En orden. El endpoint y el tiempo de desarrollo son opcionales: hay pasos que solo se mencionan.</p>
      ${pasos}
      <button class="add-btn" data-api-padd><i class="ti ti-plus" style="margin-right:4px"></i>Agregar paso</button>
    </div>

    <div class="field-block">
      <label class="chk-line"><input type="checkbox" data-api-prod ${a.sincronizaProductos ? "checked" : ""}> Requiere sincronización de productos / inventario</label>
      ${a.sincronizaProductos ? `
        <div class="rep-field" style="margin-top:8px">
          <label>¿Cómo se identifican los productos entre ambos sistemas?</label>
          <input type="text" data-api-field="codigoProductos" value="${escapeAttr(a.codigoProductos || "")}" placeholder="Ej. cada producto en Bitrix24 tiene un código que lo identifica en el otro software">
        </div>` : ""}
    </div>`;
}

export function attachAPIListeners(container, state, onChange) {
  if (!state.api) state.api = {};
  const a = state.api;
  if (!Array.isArray(a.pasos)) a.pasos = [];

  // Campos de texto simples.
  container.querySelectorAll("[data-api-field]").forEach((el) => {
    el.addEventListener("input", (e) => { a[el.getAttribute("data-api-field")] = e.target.value; onChange({ rerender: false }); });
  });
  // Selects que muestran/ocultan un campo dependiente.
  container.querySelectorAll("[data-api-sel]").forEach((el) => {
    el.addEventListener("change", (e) => { a[el.getAttribute("data-api-sel")] = e.target.value; onChange({ rerender: true }); });
  });

  container.querySelectorAll("[data-api-dir]").forEach((el) => el.addEventListener("change", (e) => { a[el.getAttribute("data-api-dir")] = e.target.checked; onChange({ rerender: false }); }));
  const ws = container.querySelector("[data-api-ws]");
  if (ws) ws.addEventListener("change", (e) => { a.webService = e.target.checked; onChange({ rerender: true }); });
  const wsnota = container.querySelector("[data-api-wsnota]");
  if (wsnota) wsnota.addEventListener("input", (e) => { a.webServiceNota = e.target.value; onChange({ rerender: false }); });
  const prod = container.querySelector("[data-api-prod]");
  if (prod) prod.addEventListener("change", (e) => { a.sincronizaProductos = e.target.checked; onChange({ rerender: true }); });

  // Pasos.
  const add = container.querySelector("[data-api-padd]");
  if (add) add.addEventListener("click", () => { a.pasos.push({ objeto: "", accion: "crear", direccion: "", descripcion: "", endpoint: "", metodo: "", tiempo: "", mapeaId: false, consideraciones: "" }); onChange({ rerender: true }); });
  container.querySelectorAll("[data-api-premove]").forEach((el) => el.addEventListener("click", () => { a.pasos.splice(parseInt(el.getAttribute("data-api-premove"), 10), 1); onChange({ rerender: true }); }));
  container.querySelectorAll("[data-api-pprop]").forEach((el) => {
    const prop = el.getAttribute("data-api-pprop");
    const evt = (el.type === "checkbox") ? "change" : (el.tagName === "SELECT" ? "change" : "input");
    el.addEventListener(evt, (e) => {
      const i = parseInt(el.getAttribute("data-api-p"), 10);
      a.pasos[i][prop] = (el.type === "checkbox") ? e.target.checked : e.target.value;
      onChange({ rerender: false });
    });
  });
}
