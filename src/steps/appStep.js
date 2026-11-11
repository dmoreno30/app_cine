// Paso "Creación de aplicación": una app local de Bitrix24, de ámbito general o
// incrustada (widget). Captura tipo, dónde se incrusta, permisos/alcances,
// endpoints a crear (múltiples) y actividades con su tiempo (van al Resumen).
import { APP_TIPOS, APP_WIDGET_ZONAS, APP_CRM_ENTIDADES, APP_CRM_UBICACION, APP_PERMISOS, APP_METODOS } from "../data/config.js";
import { escapeHtml, escapeAttr } from "../utils.js";

function opciones(lista, val) {
  return lista.map((o) => `<option value="${o.key}" ${val === o.key ? "selected" : ""}>${escapeHtml(o.label)}</option>`).join("");
}

function endpointCard(e, i) {
  const metodos = APP_METODOS.map((m) => `<option value="${m}" ${e.metodo === m ? "selected" : ""}>${m}</option>`).join("");
  return `
    <div class="rep-card">
      <div class="rep-head">
        <input type="text" data-app-ep="${i}" data-app-ep-prop="ruta" value="${escapeAttr(e.ruta || "")}" placeholder="Ruta (ej. /instalar, /crm/contacto)" style="flex:1">
        <select data-app-ep="${i}" data-app-ep-prop="metodo" style="max-width:110px">${metodos}</select>
        <button class="icon-btn" data-app-ep-remove="${i}" title="Quitar endpoint"><i class="ti ti-trash"></i></button>
      </div>
      <div class="rep-field">
        <label>¿Qué hace este endpoint?</label>
        <input type="text" data-app-ep="${i}" data-app-ep-prop="descripcion" value="${escapeAttr(e.descripcion || "")}" placeholder="Ej. Devuelve los datos del contacto para mostrarlos en el widget.">
      </div>
    </div>`;
}

function actividadRow(a, i) {
  return `
    <div class="row-flex">
      <input type="text" data-app-act="${i}" data-app-act-prop="titulo" value="${escapeAttr(a.titulo || "")}" placeholder="Actividad a realizar">
      <input type="text" data-app-act="${i}" data-app-act-prop="tiempo" value="${escapeAttr(a.tiempo || "")}" placeholder="Tiempo (ej. 4 h)" style="max-width:130px">
      <button class="icon-btn" data-app-act-remove="${i}"><i class="ti ti-x"></i></button>
    </div>`;
}

export function renderAppStep(state) {
  const a = state.app;
  const esWidget = a.tipo === "widget";
  const esCRM = esWidget && a.widgetZona === "crm";

  const permisos = APP_PERMISOS.map((p) =>
    `<label class="chk-line"><input type="checkbox" data-app-perm="${p.key}" ${a.permisos[p.key] ? "checked" : ""}> ${escapeHtml(p.label)}</label>`
  ).join("");

  const endpoints = (a.endpoints || []).map((e, i) => endpointCard(e, i)).join("")
    || '<p style="font-size:13px;color:#888;margin:4px 0">Todavía no agregaste endpoints.</p>';

  const actividades = (a.actividades || []).map((x, i) => actividadRow(x, i)).join("");

  return `
    <p class="step-title">Creación de aplicación</p>
    <p class="step-helper">Documentá la aplicación a medida que se desarrollará dentro de Bitrix24: qué hace, dónde vive, a qué accede y qué hay que construir.</p>

    <div class="field-block">
      <label class="field-label">Descripción del desarrollo</label>
      <textarea data-app-field="descripcion" rows="4" placeholder="Ej. Una app para que los técnicos registren visitas desde el celular y queden vinculadas a la negociación...">${escapeHtml(a.descripcion || "")}</textarea>
    </div>

    <div class="field-block">
      <label class="field-label">Tipo de aplicación</label>
      <select data-app-field="tipo">${opciones(APP_TIPOS, a.tipo)}</select>
      <p class="step-helper" style="margin-top:2px;font-size:12px">${escapeHtml((APP_TIPOS.find((t) => t.key === a.tipo) || {}).desc || "")}</p>
    </div>

    ${esWidget ? `
    <div class="field-block">
      <label class="field-label">¿Dónde se incrusta el widget?</label>
      <select data-app-field="widgetZona">${opciones(APP_WIDGET_ZONAS, a.widgetZona)}</select>
    </div>` : ""}

    ${esCRM ? `
    <div class="field-block">
      <label class="field-label">¿En qué entidades del CRM? <span style="font-weight:400;color:var(--text-secondary)">— podés marcar varias</span></label>
      ${APP_CRM_ENTIDADES.map((e) => `<label class="chk-line"><input type="checkbox" data-app-ent="${e.key}" ${(a.crmEntidades || []).includes(e.key) ? "checked" : ""}> ${escapeHtml(e.label)}</label>`).join("")}
    </div>
    <div class="field-block">
      <label class="field-label">¿En qué lugar de la ficha?</label>
      <select data-app-field="crmUbicacion">${opciones(APP_CRM_UBICACION, a.crmUbicacion)}</select>
    </div>` : ""}

    <div class="field-block">
      <label class="field-label">Restricción de acceso</label>
      <label class="chk-line"><input type="checkbox" data-app-restr ${a.restringeUsuarios ? "checked" : ""}> La aplicación tendrá acceso restringido (no todos los usuarios la ven)</label>
      ${a.restringeUsuarios ? `
        <div class="rep-field" style="margin-top:8px">
          <label>¿Quiénes pueden acceder?</label>
          <input type="text" data-app-field="usuariosPermitidos" value="${escapeAttr(a.usuariosPermitidos || "")}" placeholder="Ej. equipo de soporte, administradores, departamento de ventas">
        </div>` : `<p class="step-helper" style="margin-top:2px;font-size:12px">Si no se marca, la aplicación estará disponible para todos los usuarios.</p>`}
    </div>

    <div class="field-block">
      <label class="field-label">Permisos / alcances que necesita en Bitrix24</label>
      ${permisos}
    </div>

    <div class="field-block">
      <label class="field-label">Endpoints a crear</label>
      <p class="step-helper" style="margin-top:2px;font-size:12px">Las rutas que expondrá o consumirá la aplicación.</p>
      ${endpoints}
      <button class="add-btn" data-app-ep-add><i class="ti ti-plus" style="margin-right:4px"></i>Agregar endpoint</button>
    </div>

    <div class="field-block">
      <label class="field-label">Mockup / diseño <span style="font-weight:400;color:var(--text-secondary)">— opcional</span></label>
      <input type="text" data-app-field="mockupUrl" value="${escapeAttr(a.mockupUrl || "")}" placeholder="Enlace al diseño (Figma, imagen, etc.)">
    </div>

    <div class="field-block">
      <label class="field-label">Actividades a realizar <span style="color:#c00">*</span></label>
      <p class="step-helper" style="margin-top:2px;font-size:12px">Se suman a la tabla de tiempos del iCINE.</p>
      ${actividades}
      <button class="add-btn" data-app-act-add><i class="ti ti-plus" style="margin-right:4px"></i>Agregar actividad</button>
    </div>`;
}

export function attachAppListeners(container, state, onChange) {
  const a = state.app;

  // Campos escalares. Algunos requieren rerender (muestran/ocultan otros campos).
  const RERENDER = new Set(["tipo", "widgetZona"]);
  container.querySelectorAll("[data-app-field]").forEach((el) => {
    const prop = el.getAttribute("data-app-field");
    const evt = el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(evt, (e) => { a[prop] = e.target.value; onChange({ rerender: RERENDER.has(prop) }); });
  });

  // Restricción de usuarios (muestra/oculta el campo "¿quiénes?").
  const restr = container.querySelector("[data-app-restr]");
  if (restr) restr.addEventListener("change", (e) => { a.restringeUsuarios = e.target.checked; onChange({ rerender: true }); });

  // Entidades del CRM (selección múltiple).
  if (!Array.isArray(a.crmEntidades)) a.crmEntidades = [];
  container.querySelectorAll("[data-app-ent]").forEach((el) => {
    el.addEventListener("change", (e) => {
      const key = el.getAttribute("data-app-ent");
      if (e.target.checked) { if (!a.crmEntidades.includes(key)) a.crmEntidades.push(key); }
      else { a.crmEntidades = a.crmEntidades.filter((k) => k !== key); }
      onChange({ rerender: false });
    });
  });

  // Permisos (checklist).
  container.querySelectorAll("[data-app-perm]").forEach((el) => {
    el.addEventListener("change", (e) => { a.permisos[el.getAttribute("data-app-perm")] = e.target.checked; onChange({ rerender: false }); });
  });

  // Endpoints.
  const epAdd = container.querySelector("[data-app-ep-add]");
  if (epAdd) epAdd.addEventListener("click", () => { a.endpoints.push({ ruta: "", metodo: "GET", descripcion: "" }); onChange({ rerender: true }); });
  container.querySelectorAll("[data-app-ep-remove]").forEach((el) => el.addEventListener("click", () => { a.endpoints.splice(parseInt(el.getAttribute("data-app-ep-remove"), 10), 1); onChange({ rerender: true }); }));
  container.querySelectorAll("[data-app-ep-prop]").forEach((el) => {
    const prop = el.getAttribute("data-app-ep-prop");
    const evt = el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(evt, (e) => { a.endpoints[parseInt(el.getAttribute("data-app-ep"), 10)][prop] = e.target.value; onChange({ rerender: false }); });
  });

  // Actividades.
  const actAdd = container.querySelector("[data-app-act-add]");
  if (actAdd) actAdd.addEventListener("click", () => { a.actividades.push({ titulo: "", tiempo: "" }); onChange({ rerender: true }); });
  container.querySelectorAll("[data-app-act-remove]").forEach((el) => el.addEventListener("click", () => { a.actividades.splice(parseInt(el.getAttribute("data-app-act-remove"), 10), 1); onChange({ rerender: true }); }));
  container.querySelectorAll("[data-app-act-prop]").forEach((el) => {
    const prop = el.getAttribute("data-app-act-prop");
    el.addEventListener("input", (e) => { a.actividades[parseInt(el.getAttribute("data-app-act"), 10)][prop] = e.target.value; onChange({ rerender: false }); });
  });
}
