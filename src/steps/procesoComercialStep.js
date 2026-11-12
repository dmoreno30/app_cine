import { ENTIDADES, ORDEN_ENTIDADES, PERMISOS_CRM, ROL_SUPERVISOR } from "../data/config.js";
import { pipelineConfig, PIPELINE_NOMBRE_DEF } from "../state.js";
import { renderEntityMap, attachEntityMapListeners } from "../components/entityMap.js";
import { renderStageList, attachStageListeners } from "../components/stageList.js";
import { renderFieldList, attachFieldListeners } from "../components/fieldList.js";
import { renderExampleStages } from "../components/ejemploEtapas.js";
import { escapeHtml, escapeAttr, pipeActivo } from "../utils.js";

// Sub-estado local a este paso: cuál entidad se está configurando (una sola,
// resaltada en el mapa) y cuál sub-sección está activa. Vive aquí (no en el
// estado persistido) porque es solo de navegación, no data del cliente.
let activeEntityTab = null;   // pieza seleccionada = la que se configura
let rolesColapsado = false;   // minimizar el bloque de Roles y permisos
let formColapsado = false;    // minimizar todo el proceso (form de la entidad)
let activeSection = null;     // pestaña de sección activa dentro de la entidad

function entidadesHabilitadasEnOrden(state) {
  return ORDEN_ENTIDADES.filter((k) => ENTIDADES[k].obligatorio || state.entidadesHabilitadas[k]);
}

export function renderProcesoComercialStep(state) {
  const habilitadas = entidadesHabilitadasEnOrden(state);
  if (!activeEntityTab || !habilitadas.includes(activeEntityTab)) {
    activeEntityTab = habilitadas[0] || null;
  }

  const rolesHtml = renderRolesCRM(state);
  // El mapa resalta la pieza que se está configurando (única selección).
  const mapHtml = renderEntityMap(state, activeEntityTab);

  const formHtml = activeEntityTab ? renderEntityForm(state, activeEntityTab) : `<p class="step-helper">No hay piezas activas todavía. Activá al menos una en el mapa de arriba.</p>`;

  const introHtml = `
    <div class="field-block">
      <label class="field-label">Explicación del proceso comercial completo <span style="color:#d00">*</span></label>
      <p class="step-helper">Describe de inicio a fin cómo funciona el proceso comercial: qué entidades intervienen, cómo se conectan y cómo fluye una oportunidad hasta el cierre.</p>
      <textarea data-proceso-intro rows="4" placeholder="Explica el proceso comercial completo…">${escapeHtml(state.procesoIntro || "")}</textarea>
    </div>`;

  const capList = (state.cip && Array.isArray(state.cip.proceso)) ? state.cip.proceso : [];
  const capRows = capList.map((c, i) => `
    <div class="row-flex">
      <input type="text" data-pc-cap-idx="${i}" data-pc-cap-prop="titulo" value="${escapeAttr(c.titulo || "")}" placeholder="Título de la capacitación (ej. Uso del CRM comercial)">
      <input type="text" data-pc-cap-idx="${i}" data-pc-cap-prop="tiempo" value="${escapeAttr(c.tiempo || "")}" placeholder="Tiempo (ej. 4 h)" style="max-width:150px">
      <button class="icon-btn" data-pc-cap-remove="${i}"><i class="ti ti-x"></i></button>
    </div>`).join("");
  const capHtml = `
    <div class="field-block">
      <label class="field-label"><i class="ti ti-school"></i> Capacitación del proceso comercial <span style="color:#d00">*</span></label>
      <p class="step-helper">Capacitaciones para todo el proceso comercial (no dependen de la entidad). Se suman a la tabla de tiempos del iCINE (CIP).</p>
      ${capRows}
      <button class="add-btn" data-pc-cap-add><i class="ti ti-plus" style="margin-right:4px"></i>Agregar capacitación</button>
    </div>`;

  return `
    ${rolesHtml}
    ${introHtml}
    ${capHtml}
    ${mapHtml}
    <div id="entity-form-container" class="entity-form-panel">${formHtml}</div>`;
}

function renderEntityForm(state, key) {
  const cfg = ENTIDADES[key];
  const data = state.entidades[key];

  if (cfg.type === "postventa") return renderPostventaForm(data);

  const cabecera = `
    <div class="pc-form-head">
      <p class="step-title" style="margin:0;display:flex;align-items:center;gap:8px">
        <span class="pc-config-tag"><i class="ti ti-adjustments-alt"></i> Configurando</span>
        <i class="ti ${cfg.icon}" style="color:var(--ae-red)"></i> ${cfg.label}
        <span class="badge">${cfg.type === "pipeline" ? "proceso" : "solo campos"}</span>
      </p>
      <button class="rep-cat-btn" data-form-toggle><i class="ti ti-chevrons-${formColapsado ? "down" : "up"}"></i> ${formColapsado ? "Expandir" : "Minimizar"} todo</button>
    </div>
    <p class="step-helper">${cfg.helper}</p>`;
  if (formColapsado) return cabecera;

  // Secciones en pestañas para evitar el scroll infinito.
  const secciones = cfg.type === "pipeline"
    ? [
        { key: "flujo", label: "Flujo general", icon: "ti-route" },
        { key: "etapas", label: "Etapas", icon: "ti-stack-2" },
        { key: "pasos", label: "Paso a paso", icon: "ti-list-numbers" },
        { key: "campos", label: "Campos", icon: "ti-forms" },
        { key: "autos", label: "Automatizaciones", icon: "ti-settings-automation" }
      ]
    : [
        { key: "campos", label: "Campos", icon: "ti-forms" },
        { key: "autos", label: "Procesos de negocio", icon: "ti-settings-automation" }
      ];
  if (!activeSection || !secciones.some((s) => s.key === activeSection)) activeSection = secciones[0].key;
  const tabsBar = secciones.map((s) => `
    <div class="sec-tab ${s.key === activeSection ? "active" : ""}" data-sec-tab="${s.key}"><i class="ti ${s.icon}"></i> ${s.label}</div>`).join("");

  // Para entidades pipeline: trabajamos sobre el PIPELINE ACTIVO (puede haber varios).
  const esPipeline = cfg.type === "pipeline";
  const pipe = esPipeline ? pipeActivo(state, key) : data;

  // Barra de selección de pipelines. Prospectos NUNCA tiene varios pipelines,
  // así que no mostramos ni el selector ni el campo "Nombre del pipeline".
  const permiteMultiPipeline = esPipeline && key !== "prospectos";
  let pipesBar = "";
  if (permiteMultiPipeline) {
    const pipes = Array.isArray(data.pipelines) ? data.pipelines : [];
    const pIdx = data.pipelineActivo || 0;
    const chips = pipes.map((p, i) => `
      <div class="pipe-tab ${i === pIdx ? "active" : ""}" data-pipe-tab="${i}"><i class="ti ti-git-branch"></i> ${escapeHtml(p.nombre || "Pipeline " + (i + 1))}</div>`).join("");
    pipesBar = `
      <div class="pipes-bar">
        ${chips}
        <button class="pipe-add" data-pipe-add><i class="ti ti-plus"></i> Nuevo pipeline</button>
      </div>
      <div class="field-block">
        <label class="field-label">Nombre del pipeline</label>
        <div class="row-flex">
          <input type="text" data-pipe-nombre value="${escapeAttr(pipe.nombre || "")}" placeholder="Ej. Ventas generales">
          ${pipes.length > 1 ? '<button class="icon-btn" data-pipe-remove title="Quitar este pipeline"><i class="ti ti-trash"></i></button>' : ""}
        </div>
      </div>`;
  }

  let body = "";
  if (activeSection === "flujo") {
    body = `
      <div class="field-block">
        <label class="field-label pc-sec">Flujo del proceso de venta (${cfg.label.toLowerCase()}) <span style="color:#d00">*</span></label>
        <p class="step-helper">En tus palabras, cómo se mueve un registro desde que entra hasta que se cierra o se descarta.</p>
        <textarea data-entity-text="${key}" data-entity-prop="flujo" rows="5" placeholder="Describe el flujo comercial completo…">${escapeHtml(pipe.flujo || "")}</textarea>
      </div>
      ${key === "cotizaciones" ? renderOrigenExternoCotizaciones(data.origenExterno) : ""}`;
  } else if (activeSection === "etapas") {
    body = `
      ${renderStageList(key, "etapasProgreso", "Etapas de progreso", pipe.etapasProgreso, "et-progreso")}
      ${renderStageList(key, "etapasFallo", "Etapas de descarte", pipe.etapasFallo, "et-descarte")}
      ${renderExitoStage(key, pipe.exito || { titulo: "", descripcion: "" })}
      ${renderActividad(key, "actividadEtapas", `Crear las etapas del proceso de ${cfg.label.toLowerCase()}`, pipe.actividadEtapas)}`;
  } else if (activeSection === "pasos") {
    body = renderPasoAPaso(key, pipe.flujoPasos || [], cfg.label);
  } else if (activeSection === "campos") {
    body = renderFieldList(key, pipe.camposPersonalizados)
      + renderActividad(key, "actividadCampos", `Crear los campos y ordenar la ficha de ${cfg.label.toLowerCase()}`, pipe.actividadCampos);
  } else if (activeSection === "autos") {
    body = renderAutomatizaciones(key, pipe.automatizaciones || [], cfg.type);
  }

  return `${cabecera}
    ${pipesBar}
    <div class="sec-tabs">${tabsBar}</div>
    <div class="sec-body">${body}</div>`;
}

function renderActividad(key, slot, label, act) {
  act = act || { descripcion: "", tiempo: "" };
  return `
    <div class="field-block pc-actividad">
      <label class="field-label"><i class="ti ti-clock-bolt" style="color:#056AA1"></i> Actividad - ${label} <span style="font-weight:400;color:var(--text-secondary)">— se suma al iCINE</span></label>
      <input type="text" data-act="${key}" data-act-slot="${slot}" data-act-prop="tiempo" value="${escapeAttr(act.tiempo || "")}" placeholder="Tiempo que tomará (ej. 2 h)" style="max-width:200px">
    </div>`;
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


function renderExitoStage(key, exito) {
  return `
    <div class="field-block">
      <label class="field-label et-exito">Etapa de Éxito <span style="font-weight:400;color:var(--text-secondary)">— única, no se agregan más</span></label>
      <div class="stage-item">
        <input type="text" data-exito="${key}" data-exito-prop="titulo" value="${escapeAttr(exito.titulo || "")}" placeholder="Título de la etapa de éxito (ej. Venta ganada)">
        <textarea data-exito="${key}" data-exito-prop="descripcion" rows="2" placeholder="Descripción: qué ocurre al cerrar exitosamente">${escapeHtml(exito.descripcion || "")}</textarea>
      </div>
    </div>`;
}

function campoPaso(key, i, prop, label, value, placeholder, isTextarea) {
  const campo = isTextarea
    ? `<textarea data-paso="${key}" data-paso-idx="${i}" data-paso-prop="${prop}" rows="2" placeholder="${escapeAttr(placeholder)}">${escapeHtml(value || "")}</textarea>`
    : `<input type="text" data-paso="${key}" data-paso-idx="${i}" data-paso-prop="${prop}" value="${escapeAttr(value || "")}" placeholder="${escapeAttr(placeholder)}">`;
  return `<div class="paso-campo"><label class="paso-lbl">${label}</label>${campo}</div>`;
}

function renderPasoAPaso(key, pasos, label) {
  const nombre = (label || "Prospectos").toLowerCase();
  const rows = pasos.map((p, i) => `
    <div class="paso-item">
      <div class="paso-num">${i + 1}</div>
      <div class="paso-campos">
        ${campoPaso(key, i, "accion", "Siguiente paso", p.accion, "Describe el paso / acción a realizar", true)}
        <div class="paso-grid-2">
          ${campoPaso(key, i, "responsable", "Responsable", p.responsable, "Ej. Asesor comercial", false)}
          ${campoPaso(key, i, "herramienta", "Herramienta / Módulo", (p.herramienta !== undefined ? p.herramienta : "CRM / Prospecto"), "CRM / Prospecto", false)}
        </div>
        ${campoPaso(key, i, "condicion", "Condición o regla", p.condicion, "Opcional", false)}
      </div>
      <button class="icon-btn" data-paso-remove="${key}|${i}"><i class="ti ti-x"></i></button>
    </div>`).join("");
  return `
    <div class="field-block">
      <div class="pc-pasoapaso-head">
        <i class="ti ti-list-numbers"></i>
        <div>
          <div class="pc-pasoapaso-title">Ahora explica el paso a paso del proceso de ${nombre}</div>
          <div class="pc-pasoapaso-sub">Desde que inicia y su progreso hasta su fin (cierre exitoso o fallido).</div>
        </div>
      </div>
      ${rows}
      <button class="add-btn" data-paso-add="${key}"><i class="ti ti-plus" style="margin-right:4px"></i>Agregar paso</button>
    </div>`;
}

function renderAutomatizaciones(key, autos, tipo) {
  const esPipeline = tipo === "pipeline";
  const rows = autos.map((a, i) => `
    <div class="rep-card">
      <div class="auto-head">
        <span class="auto-num">${i + 1}</span>
        <button class="icon-btn" data-auto-remove="${key}|${i}" style="margin-left:auto"><i class="ti ti-x"></i></button>
      </div>
      ${esPipeline ? `<div class="paso-campo"><label class="paso-lbl">Título <span style="font-weight:400;color:var(--text-secondary)">— es lo que irá a la tabla de tiempos del iCINE</span></label>
        <input type="text" data-auto="${key}" data-auto-idx="${i}" data-auto-prop="parametro" value="${escapeAttr(a.parametro || "")}" placeholder='Ej. "Cambio de título y notificaciones"'></div>` : ""}
      <div class="paso-campo"><label class="paso-lbl">¿Qué hace?</label>
        <textarea data-auto="${key}" data-auto-idx="${i}" data-auto-prop="valor" rows="2" placeholder="Describe qué hace la automatización / proceso de negocio (sin el tiempo)">${escapeHtml(a.valor || "")}</textarea></div>
      ${esPipeline ? `<div class="paso-campo"><label class="paso-lbl">Etapa donde se ejecuta</label>
        <input type="text" data-auto="${key}" data-auto-idx="${i}" data-auto-prop="etapa" value="${escapeAttr(a.etapa || "")}" placeholder="Ej. Nuevo Prospecto"></div>` : ""}
      <div class="paso-campo"><label class="paso-lbl"><i class="ti ti-clock-bolt" style="color:#056AA1"></i> Tiempo de desarrollo <span style="font-weight:400;color:var(--text-secondary)">— se suma al iCINE</span></label>
        <input type="text" data-auto="${key}" data-auto-idx="${i}" data-auto-prop="tiempo" value="${escapeAttr(a.tiempo || "")}" placeholder="Ej. 2 h" style="max-width:200px"></div>
    </div>`).join("");

  const titulo = esPipeline
    ? `Automatizaciones <span style="font-weight:400;color:var(--text-secondary)">— título, qué hace, etapa y tiempo</span>`
    : `Procesos de negocio <span style="font-weight:400;color:var(--text-secondary)">— qué hace y tiempo</span>`;
  const ayuda = esPipeline
    ? `El <b>título</b> es lo que aparecerá como tarea en el iCINE, con su tiempo. En "¿Qué hace?" no pongas el tiempo.`
    : `El tiempo de cada proceso se suma a la tabla de tiempos del iCINE.`;
  return `
    <div class="field-block">
      <label class="field-label pc-sec">${titulo}</label>
      <p class="step-helper" style="margin-top:2px;font-size:12px">${ayuda}</p>
      ${rows}
      <button class="add-btn" data-auto-add="${key}"><i class="ti ti-plus" style="margin-right:4px"></i>Agregar ${esPipeline ? "automatización" : "proceso"}</button>
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
      <p class="field-label" style="font-size:15px;display:flex;align-items:center;justify-content:space-between;cursor:pointer" data-rol-toggle>
        <span><i class="ti ti-users"></i> Roles y permisos en el CRM</span>
        <i class="ti ${rolesColapsado ? "ti-chevron-down" : "ti-chevron-up"}"></i>
      </p>
      ${rolesColapsado ? "" : `
      ${rows}
      <button class="add-btn" data-rol-add><i class="ti ti-plus" style="margin-right:4px"></i>Agregar rol</button>
      <div class="field-block pc-actividad" style="margin-top:12px;margin-bottom:0">
        <label class="field-label"><i class="ti ti-clock-bolt" style="color:#056AA1"></i> Actividad - Crear los roles y permisos <span style="font-weight:400;color:var(--text-secondary)">— se suma al iCINE</span></label>
        <input type="text" data-roles-tiempo value="${escapeAttr(state.rolesTiempo || "")}" placeholder="Tiempo total (ej. 2 h)" style="max-width:200px">
      </div>`}
    </div>`;
}

export function attachProcesoComercialListeners(container, state, onChange) {
  attachEntityMapListeners(container, state, (result) => {
    // Interruptor: activa/desactiva la pieza.
    if (result.toggleKey !== undefined) {
      const key = result.toggleKey;
      state.entidadesHabilitadas[key] = result.checked;
      if (result.checked) {
        activeEntityTab = key;          // al activar, pasa a ser la que se configura
        activeSection = null;
      } else if (activeEntityTab === key) {
        activeEntityTab = entidadesHabilitadasEnOrden(state)[0] || null;  // al apagar la activa, saltar a otra
        activeSection = null;
      }
      onChange({ rerender: true });
      return;
    }
    // Clic en la tarjeta: seleccionar para configurar (encendiéndola si estaba apagada).
    if (result.selectKey !== undefined) {
      const key = result.selectKey;
      if (!ENTIDADES[key].obligatorio && !state.entidadesHabilitadas[key]) {
        state.entidadesHabilitadas[key] = true;  // un clic en una apagada la enciende y la selecciona
      }
      activeEntityTab = key;
      activeSection = null;  // volver a la primera sección al cambiar de pieza
      onChange({ rerender: true });
      return;
    }
    onChange(result);
  });

  // Pestañas de sección dentro de la entidad
  container.querySelectorAll("[data-sec-tab]").forEach((el) => {
    el.addEventListener("click", () => { activeSection = el.getAttribute("data-sec-tab"); onChange({ rerender: true }); });
  });

  // Selector de pipelines (varios pipelines por entidad)
  container.querySelectorAll("[data-pipe-tab]").forEach((el) => el.addEventListener("click", () => {
    state.entidades[activeEntityTab].pipelineActivo = parseInt(el.getAttribute("data-pipe-tab"), 10);
    onChange({ rerender: true });
  }));
  const pipeAdd = container.querySelector("[data-pipe-add]");
  if (pipeAdd) pipeAdd.addEventListener("click", () => {
    const ent = state.entidades[activeEntityTab];
    if (!Array.isArray(ent.pipelines)) return;
    const copiar = window.confirm("¿Copiar la configuración del pipeline actual al nuevo?\n\nAceptar = copiar lo que ya tienes (flujo, etapas, paso a paso, campos y automatizaciones).\nCancelar = crear uno nuevo con los textos por defecto.");
    let nuevo;
    if (copiar) {
      nuevo = JSON.parse(JSON.stringify(ent.pipelines[ent.pipelineActivo || 0]));
      nuevo.nombre = ((nuevo.nombre || "Pipeline").trim()) + " (copia)";
    } else {
      nuevo = { nombre: "Nuevo pipeline", ...pipelineConfig(activeEntityTab) };
    }
    ent.pipelines.push(nuevo);
    ent.pipelineActivo = ent.pipelines.length - 1;
    onChange({ rerender: true });
  });
  const pipeNombre = container.querySelector("[data-pipe-nombre]");
  if (pipeNombre) pipeNombre.addEventListener("input", (e) => { pipeActivo(state, activeEntityTab).nombre = e.target.value; onChange({ rerender: false }); });
  const pipeRemove = container.querySelector("[data-pipe-remove]");
  if (pipeRemove) pipeRemove.addEventListener("click", () => {
    const ent = state.entidades[activeEntityTab];
    if (!Array.isArray(ent.pipelines) || ent.pipelines.length <= 1) return;
    if (!window.confirm("¿Quitar este pipeline? Se perderá su configuración.")) return;
    ent.pipelines.splice(ent.pipelineActivo || 0, 1);
    ent.pipelineActivo = 0;
    onChange({ rerender: true });
  });

  // Explicación global del proceso comercial
  const introEl = container.querySelector("[data-proceso-intro]");
  if (introEl) introEl.addEventListener("input", (e) => { state.procesoIntro = e.target.value; onChange({ rerender: false }); });

  // Capacitación (CIP) del proceso comercial — múltiple
  const cipProc = () => { if (!state.cip) state.cip = {}; if (!Array.isArray(state.cip.proceso)) state.cip.proceso = []; return state.cip.proceso; };
  container.querySelectorAll("[data-pc-cap-prop]").forEach((el) => {
    el.addEventListener("input", (e) => {
      const i = parseInt(el.getAttribute("data-pc-cap-idx"), 10);
      const arr = cipProc();
      if (!arr[i]) arr[i] = { titulo: "", tiempo: "" };
      arr[i][el.getAttribute("data-pc-cap-prop")] = e.target.value;
      onChange({ rerender: false });
    });
  });
  const capAdd = container.querySelector("[data-pc-cap-add]");
  if (capAdd) capAdd.addEventListener("click", () => { cipProc().push({ titulo: "", tiempo: "" }); onChange({ rerender: true }); });
  container.querySelectorAll("[data-pc-cap-remove]").forEach((el) => {
    el.addEventListener("click", () => { cipProc().splice(parseInt(el.getAttribute("data-pc-cap-remove"), 10), 1); onChange({ rerender: true }); });
  });

  // Actividades con tiempo (configurar etapas / crear campos)
  container.querySelectorAll("[data-act-prop]").forEach((el) => {
    el.addEventListener("input", (e) => {
      const key = el.getAttribute("data-act");
      const slot = el.getAttribute("data-act-slot");
      const prop = el.getAttribute("data-act-prop");
      const t = pipeActivo(state, key);
      if (!t[slot] || typeof t[slot] !== "object") t[slot] = { descripcion: "", tiempo: "" };
      t[slot][prop] = e.target.value;
      onChange({ rerender: false });
    });
  });

  // Toggle minimizar Roles y permisos
  const rolToggle = container.querySelector("[data-rol-toggle]");
  if (rolToggle) rolToggle.addEventListener("click", () => { rolesColapsado = !rolesColapsado; onChange({ rerender: true }); });

  // Tiempo de creación de todos los roles
  const rolesT = container.querySelector("[data-roles-tiempo]");
  if (rolesT) rolesT.addEventListener("input", (e) => { state.rolesTiempo = e.target.value; onChange({ rerender: false }); });

  // Toggle minimizar todo el proceso (form de la entidad)
  const formToggle = container.querySelector("[data-form-toggle]");
  if (formToggle) formToggle.addEventListener("click", () => { formColapsado = !formColapsado; onChange({ rerender: true }); });

  // Etapa de cierre exitoso (única por entidad)
  container.querySelectorAll("[data-exito-prop]").forEach((el) => {
    el.addEventListener("input", (e) => {
      const key = el.getAttribute("data-exito");
      const prop = el.getAttribute("data-exito-prop");
      const t = pipeActivo(state, key);
      if (!t.exito || typeof t.exito !== "object") t.exito = { titulo: "", descripcion: "" };
      t.exito[prop] = e.target.value;
      onChange({ rerender: false });
    });
  });

  container.querySelectorAll("textarea[data-entity-text]").forEach((el) => {
    el.addEventListener("input", (e) => {
      const entity = el.getAttribute("data-entity-text");
      const prop = el.getAttribute("data-entity-prop");
      pipeActivo(state, entity)[prop] = e.target.value;
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
    pipeActivo(state, key).flujoPasos[i][el.getAttribute("data-paso-prop")] = e.target.value; onChange({ rerender: false });
  }));
  container.querySelectorAll("[data-paso-add]").forEach((el) => el.addEventListener("click", () => {
    const key = el.getAttribute("data-paso-add");
    { const t = pipeActivo(state, key); (t.flujoPasos = t.flujoPasos || []).push({ accion: "", responsable: "", herramienta: "CRM / Prospecto", condicion: "" }); }
    onChange({ rerender: true });
  }));
  container.querySelectorAll("[data-paso-remove]").forEach((el) => el.addEventListener("click", () => {
    const [key, i] = el.getAttribute("data-paso-remove").split("|");
    pipeActivo(state, key).flujoPasos.splice(parseInt(i, 10), 1); onChange({ rerender: true });
  }));

  // Automatizaciones (tabla)
  container.querySelectorAll("[data-auto-prop]").forEach((el) => el.addEventListener("input", (e) => {
    const key = el.getAttribute("data-auto"); const i = parseInt(el.getAttribute("data-auto-idx"), 10);
    pipeActivo(state, key).automatizaciones[i][el.getAttribute("data-auto-prop")] = e.target.value; onChange({ rerender: false });
  }));
  container.querySelectorAll("[data-auto-add]").forEach((el) => el.addEventListener("click", () => {
    const key = el.getAttribute("data-auto-add");
    { const t = pipeActivo(state, key); (t.automatizaciones = t.automatizaciones || []).push({ parametro: "", valor: "", etapa: "", tiempo: "" }); }
    onChange({ rerender: true });
  }));
  container.querySelectorAll("[data-auto-remove]").forEach((el) => el.addEventListener("click", () => {
    const [key, i] = el.getAttribute("data-auto-remove").split("|");
    pipeActivo(state, key).automatizaciones.splice(parseInt(i, 10), 1); onChange({ rerender: true });
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
