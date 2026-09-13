// Paso "Creación de API / Integración": dirección de la integración, flujos de
// sincronización por objeto (con el patrón de mapeo de ID), y productos.
import { OBJETOS_API, DIRECCIONES_API } from "../data/config.js";
import { escapeHtml, escapeAttr } from "../utils.js";

function flujoCard(f, i) {
  const objetos = OBJETOS_API.map((o) => `<option value="${escapeAttr(o)}" ${f.objeto === o ? "selected" : ""}>${o}</option>`).join("");
  const dirs = DIRECCIONES_API.map((d) => `<option value="${d.key}" ${f.direccion === d.key ? "selected" : ""}>${d.label}</option>`).join("");
  return `
    <div class="rep-card">
      <div class="rep-head">
        <select data-api-f="${i}" data-api-fprop="objeto" style="max-width:200px"><option value="">Objeto…</option>${objetos}</select>
        <select data-api-f="${i}" data-api-fprop="direccion" style="max-width:230px"><option value="">Dirección…</option>${dirs}</select>
        <button class="icon-btn" data-api-fremove="${i}" title="Quitar flujo"><i class="ti ti-trash"></i></button>
      </div>
      <div class="rep-field">
        <label>¿Cómo funciona este flujo?</label>
        <textarea data-api-f="${i}" data-api-fprop="descripcion" rows="2" placeholder="Ej. Al crear un contacto en Bitrix24 se crea en el otro software; al actualizarlo, se actualiza allá.">${escapeHtml(f.descripcion || "")}</textarea>
      </div>
      <label class="chk-line">
        <input type="checkbox" data-api-f="${i}" data-api-fprop="mapeaId" ${f.mapeaId ? "checked" : ""}>
        El sistema destino devuelve un ID que se guarda para futuras actualizaciones (mapeo de IDs)
      </label>
      <div class="rep-field" style="margin-top:8px">
        <label>Consideraciones de este flujo</label>
        <input type="text" data-api-f="${i}" data-api-fprop="consideraciones" value="${escapeAttr(f.consideraciones || "")}" placeholder="Ej. requiere sincronización de inventario / productos por código">
      </div>
    </div>`;
}

export function renderAPIStep(state) {
  if (!state.api) state.api = { flujos: [] };
  const a = state.api;
  const flujos = (a.flujos || []).map((f, i) => flujoCard(f, i)).join("")
    || '<p style="font-size:13px;color:#888;margin:4px 0">Todavía no agregaste flujos de sincronización.</p>';

  return `
    <p class="step-title">Creación de API / Integración</p>
    <p class="step-helper">Documentá la integración entre Bitrix24 y otro software: en qué sentido viaja la información y qué objetos se sincronizan.</p>

    <div class="field-block">
      <label class="field-label">¿Con qué software se integra?</label>
      <input type="text" data-api-soft value="${escapeAttr(a.otroSoftware)}" placeholder="Ej. ERP contable, sistema propio, etc.">
    </div>

    <div class="field-block">
      <label class="field-label">Dirección de la integración <span style="font-weight:400;color:var(--text-secondary)">— podés marcar las dos</span></label>
      <label class="chk-line"><input type="checkbox" data-api-dir="dirBitrixHaciaOtro" ${a.dirBitrixHaciaOtro ? "checked" : ""}> Bitrix24 → software externo</label>
      <label class="chk-line"><input type="checkbox" data-api-dir="dirOtroHaciaBitrix" ${a.dirOtroHaciaBitrix ? "checked" : ""}> Software externo → Bitrix24</label>
    </div>

    <div class="field-block">
      <label class="chk-line"><input type="checkbox" data-api-ws ${a.webService ? "checked" : ""}> Se construirá un web service / API propia (recomendado cuando no se conoce el otro software)</label>
      ${a.webService ? `<input type="text" data-api-wsnota value="${escapeAttr(a.webServiceNota)}" placeholder="Detalle del web service (opcional)" style="margin-top:8px">` : ""}
    </div>

    <div class="field-block">
      <label class="field-label">Flujos de sincronización</label>
      ${flujos}
      <button class="add-btn" data-api-fadd><i class="ti ti-plus" style="margin-right:4px"></i>Agregar flujo</button>
    </div>

    <div class="field-block">
      <label class="chk-line"><input type="checkbox" data-api-prod ${a.sincronizaProductos ? "checked" : ""}> Requiere sincronización de productos / inventario</label>
      ${a.sincronizaProductos ? `
        <div class="rep-field" style="margin-top:8px">
          <label>¿Cómo se identifican los productos entre ambos sistemas?</label>
          <input type="text" data-api-prodcod value="${escapeAttr(a.codigoProductos)}" placeholder="Ej. cada producto en Bitrix24 tiene un código que lo identifica en el otro software">
        </div>` : ""}
    </div>`;
}

export function attachAPIListeners(container, state, onChange) {
  if (!state.api) state.api = { flujos: [] };
  const a = state.api;
  const bind = (sel, prop) => { const el = container.querySelector(sel); if (el) el.addEventListener("input", (e) => { a[prop] = e.target.value; onChange({ rerender: false }); }); };

  bind("[data-api-soft]", "otroSoftware");
  bind("[data-api-wsnota]", "webServiceNota");
  bind("[data-api-prodcod]", "codigoProductos");

  container.querySelectorAll("[data-api-dir]").forEach((el) => el.addEventListener("change", (e) => { a[el.getAttribute("data-api-dir")] = e.target.checked; onChange({ rerender: false }); }));
  const ws = container.querySelector("[data-api-ws]");
  if (ws) ws.addEventListener("change", (e) => { a.webService = e.target.checked; onChange({ rerender: true }); });
  const prod = container.querySelector("[data-api-prod]");
  if (prod) prod.addEventListener("change", (e) => { a.sincronizaProductos = e.target.checked; onChange({ rerender: true }); });

  // Flujos
  const add = container.querySelector("[data-api-fadd]");
  if (add) add.addEventListener("click", () => { a.flujos.push({ objeto: "", direccion: "", descripcion: "", mapeaId: false, consideraciones: "" }); onChange({ rerender: true }); });
  container.querySelectorAll("[data-api-fremove]").forEach((el) => el.addEventListener("click", () => { a.flujos.splice(parseInt(el.getAttribute("data-api-fremove"), 10), 1); onChange({ rerender: true }); }));
  container.querySelectorAll("[data-api-fprop]").forEach((el) => {
    const prop = el.getAttribute("data-api-fprop");
    const evt = (el.type === "checkbox") ? "change" : (el.tagName === "SELECT" ? "change" : "input");
    el.addEventListener(evt, (e) => {
      const i = parseInt(el.getAttribute("data-api-f"), 10);
      a.flujos[i][prop] = (el.type === "checkbox") ? e.target.checked : e.target.value;
      onChange({ rerender: false });
    });
  });
}
