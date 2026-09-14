import { ENTIDADES, ORDEN_ENTIDADES, PERMISOS_CRM } from "../data/config.js";
import { renderEntityMap, attachEntityMapListeners } from "../components/entityMap.js";
import { renderStageList, attachStageListeners } from "../components/stageList.js";
import { renderFieldList, attachFieldListeners } from "../components/fieldList.js";
import { renderExampleStages } from "../components/ejemploEtapas.js";
import { escapeHtml, escapeAttr } from "../utils.js";

// Sub-estado local a este paso: cuál entidad está expandida en el mapa
// y cuál sub-tab está activa. Vive aquí (no en el estado persistido)
// porque es solo de navegación, no data del cliente.
let expandedKey = null;
let activeEntityTab = null;

function entidadesHabilitadasEnOrden(state) {
  return ORDEN_ENTIDADES.filter((k) => state.entidadesHabilitadas[k]);
}

export function renderProcesoComercialStep(state) {
  const habilitadas = entidadesHabilitadasEnOrden(state);
  if (!activeEntityTab || !habilitadas.includes(activeEntityTab)) {
    activeEntityTab = habilitadas[0] || null;
  }

  const rolesHtml = renderRolesCRM(state);
  const mapHtml = renderEntityMap(state, expandedKey);

  const subtabsHtml = habilitadas.map((key) => {
    const cfg = ENTIDADES[key];
    return `<div class="subtab ${key === activeEntityTab ? "active" : ""}" data-entity-tab="${key}">
      <i class="ti ${cfg.icon}"></i>${cfg.label}
      <span class="tag">${cfg.type === "pipeline" ? "pipeline" : cfg.type === "postventa" ? "proceso" : "campos"}</span>
    </div>`;
  }).join("");

  const formHtml = activeEntityTab ? renderEntityForm(state, activeEntityTab) : `<p class="step-helper">No hay entidades habilitadas todavía. Activá al menos una en el mapa de arriba.</p>`;

  return `
    ${rolesHtml}
    ${mapHtml}
    <div class="subtabs">${subtabsHtml}</div>
    <div id="entity-form-container">${formHtml}</div>`;
}

function renderEntityForm(state, key) {
  const cfg = ENTIDADES[key];
  const data = state.entidades[key];

  if (cfg.type === "postventa") return renderPostventaForm(data);

  let html = `<p class="step-title">${cfg.label}<span class="badge">${cfg.type === "pipeline" ? "pipeline" : "solo campos"}</span></p>`;
  html += `<p class="step-helper">${cfg.helper}</p>`;

  if (cfg.type === "pipeline") {
    // El flujo va primero: entender la narrativa completa antes de pedir etapas sueltas.
    html += `
      <div class="field-block">
        <label class="field-label">Flujo del proceso de venta (${cfg.label.toLowerCase()})</label>
        <textarea data-entity-text="${key}" data-entity-prop="flujo" rows="3" placeholder="Cuéntanos, en tus palabras, cómo se mueve un registro desde que entra hasta que se cierra o se descarta">${escapeHtml(data.flujo)}</textarea>
      </div>`;
    html += renderExampleStages(key);
    html += renderStageList(key, "etapasProgreso", "Etapas de progreso", data.etapasProgreso);
    html += renderStageList(key, "etapasFallo", "Etapas de descarte (éxito ya es fija)", data.etapasFallo);
  }

  if (cfg.type === "pipeline") {
    html += renderPasoAPaso(key, data.flujoPasos || []);
  }

  html += renderFieldList(key, data.camposPersonalizados);

  if (cfg.type === "pipeline") {
    html += renderAutomatizaciones(key, data.automatizaciones || []);
  }

  if (key === "cotizaciones") html += renderOrigenExternoCotizaciones(data.origenExterno);

  return html;
}

function renderOrigenExternoCotizaciones(oe) {
  return `
    <div class="field-block">
      <label class="checkbox-row">
        <input type="checkbox" data-cot-bool="usaOtroSoftware" ${oe.usaOtroSoftware ? "checked" : ""}>
        Algunos clientes cotizan en otro software y luego siguen la negociación en Bitrix24
      </label>
    </div>
    ${oe.usaOtroSoftware ? `
    <div class="field-block">
      <label class="field-label">¿En qué software cotizan?</label>
      <input type="text" data-cot-text="cual" value="${escapeAttr(oe.cual)}" placeholder="Ej. Excel, un ERP, otro CRM...">
    </div>
    <div class="field-block">
      <label class="field-label">¿Cómo continúa el proceso una vez que pasa a Bitrix24?</label>
      <textarea data-cot-text="continuidad" rows="2" placeholder="Ej. Se adjunta la cotización como archivo a la negociación, se copian los montos manualmente...">${escapeHtml(oe.continuidad)}</textarea>
    </div>` : ""}`;
}

function renderPostventaForm(data) {
  return `
    <p class="step-title">Post-venta<span class="badge">opcional</span></p>
    <p class="step-helper">Si existe un proceso después de ganar la venta, contanos cómo funciona — sobre todo la facturación, que casi siempre vive fuera de Bitrix24.</p>
    <div class="field-block">
      <label class="checkbox-row">
        <input type="checkbox" data-postventa-bool="facturaERP" ${data.facturaERP ? "checked" : ""}>
        ¿Facturan mediante un ERP o sistema contable externo?
      </label>
    </div>
    ${data.facturaERP ? `
    <div class="field-block">
      <label class="field-label">¿Cuál sistema usan?</label>
      <input type="text" data-postventa-text="erpNombre" value="${escapeAttr(data.erpNombre)}" placeholder="Ej. Contpaqi, SAP Business One, Siigo...">
    </div>
    <div class="field-block">
      <label class="checkbox-row">
        <input type="checkbox" data-postventa-bool="deseaIntegracion" ${data.deseaIntegracion ? "checked" : ""}>
        ¿Les interesa integrar Bitrix24 con ese sistema?
      </label>
    </div>
    ${data.deseaIntegracion ? `
    <div class="field-block">
      <label class="field-label">¿Qué información debería sincronizarse?</label>
      <textarea data-postventa-text="detalleIntegracion" rows="3" placeholder="Ej. Que al ganar la negociación se cree el cliente automáticamente en el ERP, o que el estado de la factura se refleje de vuelta en Bitrix24...">${escapeHtml(data.detalleIntegracion)}</textarea>
    </div>` : ""}` : ""}
    <div class="field-block">
      <label class="field-label">Describí el proceso de post-venta en general</label>
      <textarea data-postventa-text="procesoDescripcion" rows="3" placeholder="Ej. Después de ganar, se agenda instalación, se hace seguimiento de garantía por 6 meses...">${escapeHtml(data.procesoDescripcion)}</textarea>
    </div>`;
}


function renderPasoAPaso(key, pasos) {
  const rows = pasos.map((p, i) => `
    <div class="paso-item">
      <div class="paso-num">${i + 1}</div>
      <div class="paso-campos">
        <textarea data-paso="${key}" data-paso-idx="${i}" data-paso-prop="accion" rows="2" placeholder="Acción / Descripción">${escapeHtml(p.accion || "")}</textarea>
        <div class="row-flex">
          <input type="text" data-paso="${key}" data-paso-idx="${i}" data-paso-prop="responsable" value="${escapeAttr(p.responsable || "")}" placeholder="Responsable">
          <input type="text" data-paso="${key}" data-paso-idx="${i}" data-paso-prop="herramienta" value="${escapeAttr(p.herramienta || "")}" placeholder="Herramienta / Módulo">
        </div>
        <input type="text" data-paso="${key}" data-paso-idx="${i}" data-paso-prop="condicion" value="${escapeAttr(p.condicion || "")}" placeholder="Condición o Regla (opcional)">
      </div>
      <button class="icon-btn" data-paso-remove="${key}|${i}"><i class="ti ti-x"></i></button>
    </div>`).join("");
  return `
    <div class="field-block">
      <label class="field-label">Paso a paso del proceso <span style="font-weight:400;color:var(--text-secondary)">— la explicación detallada en pasos</span></label>
      ${rows}
      <button class="add-btn" data-paso-add="${key}"><i class="ti ti-plus" style="margin-right:4px"></i>Agregar paso</button>
    </div>`;
}

function renderAutomatizaciones(key, autos) {
  const rows = autos.map((a, i) => `
    <div class="row-flex" style="align-items:flex-start">
      <input type="text" data-auto="${key}" data-auto-idx="${i}" data-auto-prop="parametro" value="${escapeAttr(a.parametro || "")}" placeholder="Disparador (ej. Etapa X / Creación)" style="max-width:220px">
      <textarea data-auto="${key}" data-auto-idx="${i}" data-auto-prop="valor" rows="2" placeholder="Qué hace la automatización">${escapeHtml(a.valor || "")}</textarea>
      <button class="icon-btn" data-auto-remove="${key}|${i}"><i class="ti ti-x"></i></button>
    </div>`).join("");
  return `
    <div class="field-block">
      <label class="field-label">Automatizaciones <span style="font-weight:400;color:var(--text-secondary)">— disparador y qué hace</span></label>
      ${rows}
      <button class="add-btn" data-auto-add="${key}"><i class="ti ti-plus" style="margin-right:4px"></i>Agregar automatización</button>
    </div>`;
}

export function renderRolesCRM(state) {
  const roles = state.roles || [];
  const rows = roles.map((r, i) => {
    const chips = PERMISOS_CRM.map((perm) => {
      const on = (r.permisos || []).includes(perm);
      return `<div class="canal-chip ${on ? "on" : ""}" data-rol-perm="${i}|${perm}">${perm}</div>`;
    }).join("");
    return `
      <div class="rep-card">
        <div class="rep-head">
          <input type="text" class="rep-nombre" data-rol-idx="${i}" data-rol-prop="rol" value="${escapeAttr(r.rol || "")}" placeholder="Nombre del rol (ej. Asesor Comercial)">
          <button class="icon-btn" data-rol-remove="${i}"><i class="ti ti-trash"></i></button>
        </div>
        <div class="rep-field"><label>Permisos</label><div class="canal-grid">${chips}</div></div>
        <div class="rep-field"><label>Observaciones</label>
          <input type="text" data-rol-idx="${i}" data-rol-prop="observaciones" value="${escapeAttr(r.observaciones || "")}" placeholder="Para quién es este rol / notas"></div>
      </div>`;
  }).join("");
  return `
    <div class="field-block" style="border:1px solid #e6e6e6;border-radius:12px;padding:12px;margin-bottom:16px;background:#fafafa">
      <p class="field-label" style="font-size:15px"><i class="ti ti-users"></i> Roles y permisos en el CRM</p>
      ${rows}
      <button class="add-btn" data-rol-add><i class="ti ti-plus" style="margin-right:4px"></i>Agregar rol</button>
    </div>`;
}

export function attachProcesoComercialListeners(container, state, onChange) {
  attachEntityMapListeners(container, state, (result) => {
    // Toggle simple: si se hace clic en la card ya expandida, se colapsa la info.
    if (result.expandKey !== undefined) {
      expandedKey = expandedKey === result.expandKey ? null : result.expandKey;
      // Además, hacer clic en la card selecciona esa entidad como pestaña activa
      // debajo (si está habilitada) — antes había que buscarla en las sub-tabs.
      if (state.entidadesHabilitadas[result.expandKey]) {
        activeEntityTab = result.expandKey;
      }
    }
    onChange(result);
  });

  container.querySelectorAll("[data-entity-tab]").forEach((el) => {
    el.addEventListener("click", () => {
      activeEntityTab = el.getAttribute("data-entity-tab");
      onChange({ rerender: true });
    });
  });

  container.querySelectorAll("textarea[data-entity-text]").forEach((el) => {
    el.addEventListener("input", (e) => {
      const entity = el.getAttribute("data-entity-text");
      const prop = el.getAttribute("data-entity-prop");
      state.entidades[entity][prop] = e.target.value;
      onChange({ rerender: false });
    });
  });

  container.querySelectorAll("[data-cot-bool]").forEach((el) => {
    el.addEventListener("change", (e) => {
      state.entidades.cotizaciones.origenExterno[el.getAttribute("data-cot-bool")] = e.target.checked;
      onChange({ rerender: true });
    });
  });
  container.querySelectorAll("[data-cot-text]").forEach((el) => {
    el.addEventListener("input", (e) => {
      state.entidades.cotizaciones.origenExterno[el.getAttribute("data-cot-text")] = e.target.value;
      onChange({ rerender: false });
    });
  });

  container.querySelectorAll("[data-postventa-bool]").forEach((el) => {
    el.addEventListener("change", (e) => {
      state.entidades.postventa[el.getAttribute("data-postventa-bool")] = e.target.checked;
      onChange({ rerender: true });
    });
  });
  container.querySelectorAll("[data-postventa-text]").forEach((el) => {
    el.addEventListener("input", (e) => {
      state.entidades.postventa[el.getAttribute("data-postventa-text")] = e.target.value;
      onChange({ rerender: false });
    });
  });

  attachStageListeners(container, state, onChange);
  attachFieldListeners(container, state, onChange);

  // Paso a paso
  container.querySelectorAll("[data-paso-prop]").forEach((el) => el.addEventListener("input", (e) => {
    const key = el.getAttribute("data-paso"); const i = parseInt(el.getAttribute("data-paso-idx"), 10);
    state.entidades[key].flujoPasos[i][el.getAttribute("data-paso-prop")] = e.target.value; onChange({ rerender: false });
  }));
  container.querySelectorAll("[data-paso-add]").forEach((el) => el.addEventListener("click", () => {
    const key = el.getAttribute("data-paso-add");
    (state.entidades[key].flujoPasos = state.entidades[key].flujoPasos || []).push({ accion: "", responsable: "", herramienta: "", condicion: "" });
    onChange({ rerender: true });
  }));
  container.querySelectorAll("[data-paso-remove]").forEach((el) => el.addEventListener("click", () => {
    const [key, i] = el.getAttribute("data-paso-remove").split("|");
    state.entidades[key].flujoPasos.splice(parseInt(i, 10), 1); onChange({ rerender: true });
  }));

  // Automatizaciones (tabla)
  container.querySelectorAll("[data-auto-prop]").forEach((el) => el.addEventListener("input", (e) => {
    const key = el.getAttribute("data-auto"); const i = parseInt(el.getAttribute("data-auto-idx"), 10);
    state.entidades[key].automatizaciones[i][el.getAttribute("data-auto-prop")] = e.target.value; onChange({ rerender: false });
  }));
  container.querySelectorAll("[data-auto-add]").forEach((el) => el.addEventListener("click", () => {
    const key = el.getAttribute("data-auto-add");
    (state.entidades[key].automatizaciones = state.entidades[key].automatizaciones || []).push({ parametro: "", valor: "" });
    onChange({ rerender: true });
  }));
  container.querySelectorAll("[data-auto-remove]").forEach((el) => el.addEventListener("click", () => {
    const [key, i] = el.getAttribute("data-auto-remove").split("|");
    state.entidades[key].automatizaciones.splice(parseInt(i, 10), 1); onChange({ rerender: true });
  }));

  // Roles y permisos
  if (!Array.isArray(state.roles)) state.roles = [];
  container.querySelectorAll("[data-rol-prop]").forEach((el) => el.addEventListener("input", (e) => {
    state.roles[parseInt(el.getAttribute("data-rol-idx"), 10)][el.getAttribute("data-rol-prop")] = e.target.value; onChange({ rerender: false });
  }));
  container.querySelectorAll("[data-rol-perm]").forEach((el) => el.addEventListener("click", () => {
    const [i, perm] = el.getAttribute("data-rol-perm").split("|"); const r = state.roles[parseInt(i, 10)];
    r.permisos = r.permisos || [];
    const idx = r.permisos.indexOf(perm);
    if (idx >= 0) r.permisos.splice(idx, 1); else r.permisos.push(perm);
    onChange({ rerender: true });
  }));
  container.querySelectorAll("[data-rol-add]").forEach((el) => el.addEventListener("click", () => {
    state.roles.push({ rol: "", permisos: [], observaciones: "" }); onChange({ rerender: true });
  }));
  container.querySelectorAll("[data-rol-remove]").forEach((el) => el.addEventListener("click", () => {
    state.roles.splice(parseInt(el.getAttribute("data-rol-remove"), 10), 1); onChange({ rerender: true });
  }));
}
