import { defaultState, resetState, PIPELINE_NOMBRE_DEF } from "./state.js";
import { ENTIDADES } from "./data/config.js";
import { getPasos, renderStepper, attachStepperListeners } from "./components/stepper.js";
import { renderHeader } from "./components/header.js";
import { renderFooter } from "./components/footer.js";
import { renderNEStep, attachNEListeners } from "./steps/neStep.js";
import { renderClienteEmpresa, attachClienteEmpresa } from "./steps/clienteEmpresaStep.js";
import { renderClienteCaptacion, attachClienteCaptacion } from "./steps/clienteCaptacionStep.js";
import { renderSeleccionStep, attachSeleccionListeners } from "./steps/seleccionStep.js";
import { renderCaptacionStep, attachCaptacionListeners } from "./steps/captacionStep.js";
import { renderProcesoComercialStep, attachProcesoComercialListeners } from "./steps/procesoComercialStep.js";
import { renderReporteriaStep, attachReporteriaListeners } from "./steps/reporteriaStep.js";
import { renderChatbotStep, attachChatbotListeners } from "./steps/chatbotStep.js";
import { renderRRHHStep, attachRRHHListeners } from "./steps/rrhhStep.js";
import { renderAPIStep, attachAPIListeners } from "./steps/apiStep.js";
import { renderAppStep, attachAppListeners } from "./steps/appStep.js";
import { renderConfirmacionStep, attachConfirmacionListeners } from "./steps/confirmacionStep.js";
import { initBitrix, obtenerContextoBX, enBitrix } from "./bitrix.js";
import { listarDesarrollos, crearDesarrollo, cargarDesarrollo, guardarDesarrollo, listarFormularios, guardarFormularioBorrador, enviarFormulario } from "./apiCliente.js";
import { escapeHtml, escapeAttr } from "./utils.js";

let state = normalizar(resetState());
let currentStep = 0;
let vista = "inicio";            // "inicio" | "form" | "cliente"
let cargando = true;
const devProy = new URLSearchParams(window.location.search).get("proyecto"); // fallback de prueba
// Fuerza modo cliente en pruebas fuera de Bitrix: ?modo=cliente
const devModo = new URLSearchParams(window.location.search).get("modo");

const ctx = { proyectoId: null, proyectoNombre: "", jefeId: "", jefeNombre: "", usuario: null, esExtranet: false, debug: null };
const sesion = { elementId: null, tipo: "icine", neTexto: "", lista: [], status: "", conFormulario: false, modoCliente: false, formStatus: "", formularios: [] };

function normalizar(s) {
  const base = defaultState();
  s = s || {};
  const emp = s.empresa || {};
  const cap = s.captacion || {};
  const out = {
    ...base, ...s,
    ne: { ...base.ne, ...(s.ne || {}) },
    meta: { ...base.meta, ...(s.meta || {}) },
    cip: { ...base.cip, ...(s.cip || {}) },
    pruebas: { ...base.pruebas, ...(s.pruebas || {}) },
    empresa: {
      ...base.empresa, ...emp,
      monedas: { ...base.empresa.monedas, ...(emp.monedas || {}) },
      impuestos: Array.isArray(emp.impuestos) ? emp.impuestos : base.empresa.impuestos
    },
    desarrollos: { ...base.desarrollos, ...(s.desarrollos || {}) },
    modulos: { ...base.modulos, ...(s.modulos || {}) },
    chatbot: {
      ...base.chatbot, ...(s.chatbot || {}),
      plataformas: { ...(base.chatbot.plataformas || {}), ...((s.chatbot || {}).plataformas || {}) },
      menus: Array.isArray((s.chatbot || {}).menus) ? s.chatbot.menus : base.chatbot.menus
    },
    rrhh: { procesos: Array.isArray((s.rrhh || {}).procesos) ? s.rrhh.procesos : base.rrhh.procesos },
    api: { ...base.api, ...(s.api || {}), flujos: Array.isArray((s.api || {}).flujos) ? s.api.flujos : base.api.flujos },
    captacion: {
      ...base.captacion, ...cap,
      canales: Array.isArray(cap.canales) ? cap.canales : base.captacion.canales,
      conexiones: Array.isArray(cap.conexiones) ? cap.conexiones : base.captacion.conexiones,
      chatbot: { ...base.captacion.chatbot, ...(cap.chatbot || {}) }
    },
    entidadesHabilitadas: { ...base.entidadesHabilitadas, ...(s.entidadesHabilitadas || {}) },
    entidades: { ...base.entidades, ...(s.entidades || {}) },
    reporteria: {
      descripcionReportes: (s.reporteria || {}).descripcionReportes || "",
      datasets: Array.isArray((s.reporteria || {}).datasets) ? s.reporteria.datasets : (((s.reporteria || {}).dataset || "").trim() ? [{ descripcion: s.reporteria.dataset, tiempo: "" }] : base.reporteria.datasets),
      reportes: Array.isArray((s.reporteria || {}).reportes) ? s.reporteria.reportes : base.reporteria.reportes,
      roles: Array.isArray((s.reporteria || {}).roles) ? s.reporteria.roles : base.reporteria.roles
    },
    roles: Array.isArray(s.roles) && s.roles.length ? s.roles : base.roles,
    rolesTiempo: s.rolesTiempo != null ? s.rolesTiempo : base.rolesTiempo,
    consideraciones: { ...base.consideraciones, ...(s.consideraciones || {}) }
  };
  // Migración: borradores viejos donde "proceso" era el paquete completo.
  if (s.desarrollos && s.desarrollos.proceso && s.desarrollos.captacion === undefined) {
    out.desarrollos.captacion = true;
    out.desarrollos.reportes = true;
  }
  // Migración de entidades pipeline (borradores viejos → estructura con varios pipelines)
  const toStage = (x) => (typeof x === "string" ? { nombre: x, descripcion: "" } : { nombre: (x && (x.nombre || x.etapa)) || "", descripcion: (x && (x.descripcion || x.desc)) || "" });
  const normCampos = (arr) => (arr || []).map((f) => ({ nombre: f.nombre || "", tipo: f.tipo || "Texto", personalizado: f.personalizado !== false, obligatorio: !!f.obligatorio, valores: f.valores || "" }));
  const normAutos = (e) => {
    if (!Array.isArray(e.automatizaciones)) return e.automatizacion ? [{ parametro: "", valor: e.automatizacion, etapa: "", tiempo: "" }] : [{ parametro: "", valor: "", etapa: "", tiempo: "" }];
    return e.automatizaciones.map((a) => ({ parametro: a.parametro || "", valor: a.valor || "", etapa: a.etapa || "", tiempo: a.tiempo || "" }));
  };
  // Normaliza la configuración de UN pipeline.
  const normPipe = (p) => {
    if (Array.isArray(p.etapasProgreso)) p.etapasProgreso = p.etapasProgreso.map(toStage); else p.etapasProgreso = [{ nombre: "", descripcion: "" }];
    if (Array.isArray(p.etapasFallo)) p.etapasFallo = p.etapasFallo.map(toStage); else p.etapasFallo = [{ nombre: "", descripcion: "" }];
    if (!p.exito || typeof p.exito !== "object") p.exito = { titulo: "", descripcion: "" };
    if (!p.actividadEtapas || typeof p.actividadEtapas !== "object") p.actividadEtapas = { descripcion: "", tiempo: "" };
    if (!p.actividadCampos || typeof p.actividadCampos !== "object") p.actividadCampos = { descripcion: "", tiempo: "" };
    if (!Array.isArray(p.flujoPasos)) p.flujoPasos = [{ accion: "", responsable: "", herramienta: "CRM / Prospecto", condicion: "" }];
    p.automatizaciones = normAutos(p);
    p.camposPersonalizados = normCampos(p.camposPersonalizados);
    if (!Array.isArray(p.autoTiempos)) p.autoTiempos = [{ descripcion: "", tiempo: "" }];
    if (typeof p.flujo !== "string") p.flujo = "";
  };
  Object.keys(out.entidades || {}).forEach((key) => {
    const e = out.entidades[key];
    if (!e || typeof e !== "object") return;
    const cfg = ENTIDADES[key];
    if (cfg && cfg.type === "pipeline") {
      if (!Array.isArray(e.pipelines) || !e.pipelines.length) {
        // Envolver config legacy (campos al nivel de la entidad) en pipelines[0]
        const legacy = { ...e, nombre: PIPELINE_NOMBRE_DEF[key] || "General" };
        delete legacy.pipelines; delete legacy.pipelineActivo; delete legacy.origenExterno;
        e.pipelines = [legacy];
      }
      if (typeof e.pipelineActivo !== "number" || e.pipelineActivo < 0 || e.pipelineActivo >= e.pipelines.length) e.pipelineActivo = 0;
      e.pipelines.forEach((p) => { if (!p.nombre) p.nombre = PIPELINE_NOMBRE_DEF[key] || "General"; normPipe(p); });
    } else if (cfg && cfg.type === "simple") {
      e.camposPersonalizados = normCampos(e.camposPersonalizados);
      e.automatizaciones = normAutos(e);
      if (!e.actividadCampos || typeof e.actividadCampos !== "object") e.actividadCampos = { descripcion: "", tiempo: "" };
      if (!Array.isArray(e.autoTiempos)) e.autoTiempos = [{ descripcion: "", tiempo: "" }];
    }
  });
  return out;
}
function setStatus(t) { sesion.status = t; const el = document.getElementById("sesion-status"); if (el) el.textContent = t; }
function aplicarMetaContexto() {
  if (!state.meta) state.meta = {};
  if (ctx.usuario && ctx.usuario.nombre) state.meta.consultor = ctx.usuario.nombre;
  if (ctx.jefeNombre) state.meta.jefeProyecto = ctx.jefeNombre;
  if (!state.meta.version) state.meta.version = "1.0";
}
function datosComunes() {
  return {
    proyectoId: ctx.proyectoId, proyectoNombre: ctx.proyectoNombre,
    jefeId: ctx.jefeId, desarrolladorId: ctx.usuario && ctx.usuario.id,
    neTexto: sesion.neTexto, tipo: sesion.tipo, conFormulario: sesion.conFormulario, borrador: state
  };
}
async function refrescarLista() {
  if (!ctx.proyectoId) { sesion.lista = []; return; }
  const r = await listarDesarrollos(ctx.proyectoId);
  sesion.lista = (r && r.ok) ? r.items : [];
}
async function crear(neTexto, tipo, conFormulario) {
  if (ctx.esExtranet) return;   // el extranet no puede crear desarrollos
  if (!ctx.proyectoId) { setStatus("No se detectó el proyecto."); return; }
  sesion.neTexto = neTexto; sesion.tipo = tipo || "icine";
  sesion.conFormulario = !!conFormulario; sesion.modoCliente = false; sesion.formStatus = "";
  state = normalizar(resetState());
  aplicarMetaContexto();
  setStatus("Creando…");
  const r = await crearDesarrollo(datosComunes());
  if (r && r.ok) { sesion.elementId = r.elementId; vista = "form"; currentStep = 0; setStatus("Creado #" + r.elementId); render(); }
  else setStatus("Error: " + ((r && r.mensaje) || "no se pudo crear"));
}
async function continuar(elementId) {
  if (ctx.esExtranet) return;   // el extranet no abre el iCINE del consultor
  setStatus("Cargando…");
  const r = await cargarDesarrollo(elementId);
  if (r && r.ok) {
    state = normalizar(r.borrador || {});
    aplicarMetaContexto();
    sesion.elementId = r.elementId; sesion.tipo = r.tipo || "icine"; sesion.neTexto = r.neTexto || "";
    sesion.modoCliente = false; sesion.formStatus = r.formStatus || "";
    vista = "form"; currentStep = 0; setStatus("Editando #" + r.elementId); render();
  } else setStatus("Error: " + ((r && r.mensaje) || "no se pudo cargar"));
}
async function guardar() {
  if (!sesion.elementId) return;
  setStatus("Guardando…");
  const r = await guardarDesarrollo({ elementId: sesion.elementId, ...datosComunes() });
  setStatus(r && r.ok ? "Guardado ✓" : "Error: " + ((r && r.mensaje) || "no se pudo"));
}
function volverInicio() {
  sesion.elementId = null; sesion.modoCliente = false;
  if (ctx.esExtranet) { vista = "cliente"; refrescarFormularios().then(render); return; }
  vista = "inicio"; refrescarLista().then(render);
}

/* ---------------- MODO CLIENTE (extranet) ---------------- */
async function refrescarFormularios() {
  if (!ctx.proyectoId) { sesion.formularios = []; return; }
  const r = await listarFormularios(ctx.proyectoId);
  sesion.formularios = (r && r.ok) ? r.items : [];
}
async function abrirFormulario(elementId) {
  setStatus("Cargando…");
  const r = await cargarDesarrollo(elementId);
  if (r && r.ok) {
    state = normalizar(r.borrador || {});
    sesion.elementId = r.elementId; sesion.tipo = r.tipo || "icine"; sesion.neTexto = r.neTexto || "";
    sesion.modoCliente = true; sesion.formStatus = r.formStatus || "pendiente";
    vista = "form"; currentStep = 0; setStatus(""); render();
  } else setStatus("Error: " + ((r && r.mensaje) || "no se pudo cargar"));
}
async function guardarBorradorCliente() {
  if (!sesion.elementId) return;
  if (sesion.formStatus === "enviado") return;
  setStatus("Guardando…");
  const r = await guardarFormularioBorrador({ elementId: sesion.elementId, borrador: state });
  setStatus(r && r.ok ? "Borrador guardado ✓" : "Error: " + ((r && r.mensaje) || "no se pudo"));
}
async function enviarCliente() {
  if (!sesion.elementId) return;
  if (sesion.formStatus === "enviado") return;
  if (!window.confirm("Al enviar, el formulario quedará bloqueado y ya no podrás editarlo. ¿Enviar ahora?")) return;
  setStatus("Enviando…");
  const r = await enviarFormulario({ elementId: sesion.elementId, borrador: state });
  if (r && r.ok) { sesion.formStatus = "enviado"; setStatus("Formulario enviado ✓"); render(); }
  else setStatus("Error: " + ((r && r.mensaje) || "no se pudo enviar"));
}
function onChange(result = {}) { if (result.reset) { volverInicio(); return; } if (result.rerender) render(); }

/* ---------------- PANTALLA DE INICIO ---------------- */
function renderInicio() {
  if (cargando) return `<div class="card"><p>Cargando…</p></div>`;
  if (!ctx.proyectoId) {
    return `<div class="card">
      <p class="step-title">No se detectó el proyecto</p>
      <p class="step-helper">Esta aplicación debe abrirse <b>dentro de un proyecto de Bitrix24</b> (registrada como aplicación, no como iframe suelto). Si estás probando fuera de Bitrix, agregá <code>?proyecto=ID</code> a la URL.</p>
    </div>`;
  }
  const filas = sesion.lista.length
    ? sesion.lista.map((d) => {
        const tieneForm = d.formStatus === "pendiente" || d.formStatus === "enviado";
        const estadoForm = d.formStatus === "enviado" ? '<span style="color:#1a7f37;font-size:12px"> · Formulario enviado</span>'
          : d.formStatus === "pendiente" ? '<span style="color:#8a5a00;font-size:12px"> · Formulario pendiente</span>' : "";
        const botones = tieneForm
          ? `<button class="sb-btn" data-abrir-form="${d.id}"><i class="ti ti-forms"></i> Formulario</button>
             <button class="sb-btn primary" data-continuar="${d.id}"><i class="ti ti-file-text"></i> iCINE</button>`
          : `<button class="sb-btn primary" data-continuar="${d.id}">Continuar</button>`;
        return `<div class="ini-row">
          <div><b>${escapeHtml(d.neTexto || d.nombre || "Sin nombre")}</b> <span style="color:#888">#${d.id}</span>${estadoForm}</div>
          <div style="display:flex;gap:6px">${botones}</div>
        </div>`;
      }).join("")
    : `<p style="color:#888">No hay desarrollos en curso para este proyecto.</p>`;
  return `<div class="card">
    <p class="step-title">Desarrollos del proyecto</p>
    <p class="step-helper">Proyecto: <b>${escapeHtml(ctx.proyectoNombre || "")}</b> (#${ctx.proyectoId})</p>
    <div class="ini-lista">${filas}</div>
    <hr style="margin:18px 0;border:none;border-top:1px solid #eee">
    <p class="field-label">Crear un nuevo desarrollo</p>
    <input type="text" data-ne-texto placeholder="Título del desarrollo (ej. Proceso comercial - chatbot - reportes)">
    <div style="display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap">
      <select data-crear-modo title="¿Qué deseas crear?">
        <option value="icine">Crear iCINE</option>
        <option value="form">Crear Formulario + iCINE</option>
        <option value="form-t24" disabled>Crear Formulario para T24 (próximamente)</option>
      </select>
      <button class="sb-btn primary" data-crear><i class="ti ti-plus"></i> Crear</button>
    </div>
    <p class="step-helper" style="margin-top:6px">"Formulario + iCINE" habilita el formulario que el cliente (extranet) llenará; luego, como desarrollador, abres el iCINE o el formulario desde la lista.</p>
  </div>`;
}

/* ---------------- PANTALLA DE INICIO (CLIENTE / EXTRANET) ---------------- */
function renderCliente() {
  if (cargando) return `<div class="card"><p>Cargando…</p></div>`;
  if (!ctx.proyectoId) {
    return `<div class="card"><p class="step-title">No se detectó el proyecto</p>
      <p class="step-helper">Abre esta aplicación dentro de tu proyecto en Bitrix24.</p></div>`;
  }
  const filas = sesion.formularios.length
    ? sesion.formularios.map((f) => `
        <div class="ini-row">
          <div><b>${escapeHtml(f.neTexto || f.nombre || "Formulario")}</b> <span style="color:#888">#${f.id}</span>
            ${f.formStatus === "enviado"
              ? '<span style="color:#1a7f37;font-size:12px"> · Enviado</span>'
              : '<span style="color:#8a5a00;font-size:12px"> · Pendiente</span>'}</div>
          <button class="sb-btn primary" data-abrir-form="${f.id}">${f.formStatus === "enviado" ? "Ver" : "Llenar"}</button>
        </div>`).join("")
    : `<p style="color:#888">No hay formularios asignados para este proyecto todavía.</p>`;
  return `<div class="card">
    <p class="step-title">Información sobre los procesos a implementar</p>
    <p class="step-helper">Proyecto: <b>${escapeHtml(ctx.proyectoNombre || "")}</b>. Cuéntanos qué necesitas; puedes guardar un borrador y volver más tarde. Cuando envíes, tu equipo de asesores-e lo revisará.</p>
    <div class="ini-lista">${filas}</div>
  </div>`;
}

/* ---------------- DIAGNÓSTICO (temporal) ---------------- */
function renderDiag() {
  const d = ctx.debug || {};
  const vistaActual = ctx.esExtranet ? "CLIENTE (solo formularios)" : "CONSULTOR (iCINE + formularios)";
  return `<div style="background:#fff8e1;border:1px solid #e0b400;border-radius:8px;padding:8px 12px;margin-bottom:12px;font:12px/1.5 ui-monospace,monospace;color:#5a4500">
    <b>DIAGNÓSTICO</b> — vista: <b>${vistaActual}</b> · esExtranet=<b>${ctx.esExtranet}</b> · modo=${ctx.modoForzado || "automático"}<br>
    USER_TYPE (user.current)=<b>${d.userTypeCurrent}</b> · resuelto=<b>${d.userTypeResuelto}</b> · user.get=${d.userGet || "-"}<br>
    campos de user.current: ${d.keys || "-"}${d.error ? " · ERROR: " + d.error : ""}<br>
    <span style="color:#8a6d00">Forzar vista: agregá <code>?modo=cliente</code> o <code>?modo=dev</code> a la URL.</span>
  </div>`;
}

/* ---------------- RENDER GENERAL ---------------- */
function render() {
  const app = document.getElementById("app");
  try { document.body.classList.toggle("cliente-mode", !!(ctx.esExtranet || sesion.modoCliente)); } catch (e) { /* noop */ }

  // Candado de seguridad: el extranet NUNCA ve la vista de consultor (inicio/crear).
  if (ctx.esExtranet && vista === "inicio") { vista = "cliente"; }

  if (vista === "inicio") {
    app.innerHTML = `${renderHeader()}${renderDiag()}${renderInicio()}<div id="sesion-status" class="sb-status">${sesion.status}</div>${renderFooter()}`;
    const cr = app.querySelector("[data-crear]");
    if (cr) cr.addEventListener("click", () => {
      const t = app.querySelector("[data-ne-texto]"); const md = app.querySelector("[data-crear-modo]");
      const modo = (md && md.value) || "icine";
      const tipo = modo === "form-t24" ? "t24" : "icine";
      const conFormulario = modo === "form" || modo === "form-t24";
      crear((t && t.value.trim()) || "Desarrollo", tipo, conFormulario);
    });
    app.querySelectorAll("[data-continuar]").forEach((el) => el.addEventListener("click", () => continuar(el.getAttribute("data-continuar"))));
    app.querySelectorAll("[data-abrir-form]").forEach((el) => el.addEventListener("click", () => abrirFormulario(el.getAttribute("data-abrir-form"))));
    return;
  }

  if (vista === "cliente") {
    app.innerHTML = `${renderHeader()}${renderDiag()}${renderCliente()}<div id="sesion-status" class="sb-status">${sesion.status}</div>${renderFooter()}`;
    app.querySelectorAll("[data-abrir-form]").forEach((el) => el.addEventListener("click", () => abrirFormulario(el.getAttribute("data-abrir-form"))));
    return;
  }

  // vista === "form"
  const modoCliente = !!sesion.modoCliente;
  const bloqueado = modoCliente && sesion.formStatus === "enviado";
  const pasos = getPasos(state).filter((p) => !(modoCliente && p.key === "confirmacion"));
  if (currentStep > pasos.length - 1) currentStep = pasos.length - 1;
  const stepKey = pasos[currentStep].key;
  let bodyHtml = "";
  if (stepKey === "ne") bodyHtml = modoCliente ? renderClienteEmpresa(state) : renderNEStep(state);
  else if (stepKey === "seleccion") bodyHtml = renderSeleccionStep(state, modoCliente);
  else if (stepKey === "captacion") bodyHtml = modoCliente ? renderClienteCaptacion(state) : renderCaptacionStep(state);
  else if (stepKey === "proceso") bodyHtml = renderProcesoComercialStep(state);
  else if (stepKey === "reporteria") bodyHtml = renderReporteriaStep(state);
  else if (stepKey === "chatbot") bodyHtml = renderChatbotStep(state);
  else if (stepKey === "rrhh") bodyHtml = renderRRHHStep(state);
  else if (stepKey === "api") bodyHtml = renderAPIStep(state);
  else if (stepKey === "app") bodyHtml = renderAppStep(state);
  else if (stepKey === "confirmacion") bodyHtml = renderConfirmacionStep(state, false);

  // Campo "Consideraciones" + Capacitación: solo para el desarrollador, no en modo cliente.
  const NE_CONS = { captacion: "captacion", proceso: "proceso", reporteria: "reporteria", chatbot: "chatbot", api: "api", app: "app", rrhh: "rrhh" };
  if (!modoCliente && NE_CONS[stepKey]) {
    const ck = NE_CONS[stepKey];
    if (!state.cip) state.cip = {};
    if (!Array.isArray(state.cip[ck])) state.cip[ck] = [];
    // En Proceso Comercial la capacitación se captura al inicio del paso (única, requerida),
    // así que aquí no se vuelve a mostrar el bloque de CIP.
    const cipFijo = stepKey === "proceso" || stepKey === "captacion"; // proceso y captación capturan la capacitación de forma propia
    const cipRows = cipFijo ? "" : state.cip[ck].map((c, i) => `
      <div class="row-flex">
        <input type="text" data-cip="${ck}" data-cip-idx="${i}" data-cip-prop="titulo" value="${escapeAttr(c.titulo || "")}" placeholder="Título de la capacitación">
        <input type="text" data-cip="${ck}" data-cip-idx="${i}" data-cip-prop="tiempo" value="${escapeAttr(c.tiempo || "")}" placeholder="Tiempo (ej. 2 h)" style="max-width:130px">
        <button class="icon-btn" data-cip-remove="${ck}|${i}"><i class="ti ti-x"></i></button>
      </div>`).join("");
    if (!cipFijo) bodyHtml += `
      <div class="field-block" style="border-top:1px solid #eee;margin-top:16px;padding-top:14px">
        <label class="field-label"><i class="ti ti-school"></i> Capacitación (CIP) <span style="color:#c00">*</span></label>
        <p class="step-helper" style="margin-top:2px">Capacitación de implementación personalizada para esta NE. Se agrega a la tabla de tiempos (Capacitación — CIP).</p>
        ${cipRows}
        <button class="add-btn" data-cip-add="${ck}"><i class="ti ti-plus" style="margin-right:4px"></i>Agregar capacitación</button>
      </div>`;

    if (!state.consideraciones) state.consideraciones = {};
    // Captación fija sus consideraciones dentro del propio paso.
    if (stepKey !== "captacion") {
      const val = escapeHtml(state.consideraciones[ck] || "");
      bodyHtml += `
        <div class="field-block" style="border-top:1px solid #eee;margin-top:16px;padding-top:14px">
          <label class="field-label"><i class="ti ti-note"></i> Consideraciones</label>
          <p class="step-helper" style="margin-top:2px">Texto libre que se agregará al final de esta NE en el iCINE.</p>
          <textarea data-consideraciones="${ck}" rows="3" placeholder="Aclaraciones, supuestos, dependencias…">${val}</textarea>
        </div>`;
    }
  }

  // En modo desarrollador, si el registro tiene formulario, ofrecemos abrirlo directo.
  const tieneForm = !!(sesion.conFormulario || sesion.formStatus);
  const verFormBtn = (!modoCliente && tieneForm)
    ? `<button class="sb-btn" data-ver-form><i class="ti ti-forms"></i> Formulario</button>` : "";
  const accionesBar = modoCliente
    ? `<button class="sb-btn" data-cli-borrador ${bloqueado ? "disabled" : ""}><i class="ti ti-device-floppy"></i> Guardar borrador</button>
       <button class="sb-btn primary" data-cli-enviar ${bloqueado ? "disabled" : ""}><i class="ti ti-send"></i> Enviar</button>`
    : `${verFormBtn}<button class="sb-btn save" data-guardar><i class="ti ti-device-floppy"></i> Guardar</button>`;
  const barra = `<div class="sesion-bar">
    <button class="sb-btn" data-volver><i class="ti ti-arrow-left"></i> ${ctx.esExtranet ? "Mis formularios" : "Inicio"}</button>
    <span class="sb-item">${escapeHtml(sesion.neTexto || "Desarrollo")} · #${sesion.elementId}</span>
    ${accionesBar}
    <span id="sesion-status" class="sb-status">${sesion.status}</span>
  </div>`;

  const bannerBloqueo = bloqueado
    ? `<div class="aviso" style="background:#fff4e5;border:1px solid #ffd59e;color:#8a5a00;padding:10px 12px;border-radius:8px;margin-bottom:12px"><i class="ti ti-lock"></i> Este formulario ya fue enviado y está en solo lectura.</div>`
    : "";

  app.innerHTML = `${renderHeader()}${barra}
    <div class="stepper">${renderStepper(currentStep, pasos)}</div>
    <div class="card">${bannerBloqueo}${bodyHtml}</div>
    <div class="nav-row">
      <button class="nav-btn" data-nav="prev" ${currentStep === 0 ? "disabled" : ""}>Anterior</button>
      ${currentStep >= pasos.length - 1 ? "" : '<button class="nav-btn primary" data-nav="next">Siguiente<i class="ti ti-arrow-right" style="margin-left:6px"></i></button>'}
    </div>${renderFooter()}`;

  app.querySelector("[data-volver]").addEventListener("click", volverInicio);
  const gBtn = app.querySelector("[data-guardar]"); if (gBtn) gBtn.addEventListener("click", guardar);
  const vfBtn = app.querySelector("[data-ver-form]"); if (vfBtn) vfBtn.addEventListener("click", () => { if (sesion.elementId) abrirFormulario(sesion.elementId); });
  const cbBtn = app.querySelector("[data-cli-borrador]"); if (cbBtn) cbBtn.addEventListener("click", guardarBorradorCliente);
  const ceBtn = app.querySelector("[data-cli-enviar]"); if (ceBtn) ceBtn.addEventListener("click", enviarCliente);
  attachStepperListeners(app, (i) => { currentStep = i; render(); });
  const prev = app.querySelector('[data-nav="prev"]'); if (prev) prev.addEventListener("click", () => { currentStep = Math.max(0, currentStep - 1); render(); });
  const next = app.querySelector('[data-nav="next"]'); if (next) next.addEventListener("click", () => { currentStep = Math.min(pasos.length - 1, currentStep + 1); render(); });

  // Modo cliente bloqueado: deshabilitar toda entrada del formulario (menos la navegación).
  if (bloqueado) {
    app.querySelectorAll(".card input, .card textarea, .card select, .card button").forEach((el) => { el.disabled = true; });
  }

  // listener del campo Consideraciones (si está presente)
  const cons = app.querySelector("[data-consideraciones]");
  if (cons) cons.addEventListener("input", (e) => {
    const k = cons.getAttribute("data-consideraciones");
    if (!state.consideraciones) state.consideraciones = {};
    state.consideraciones[k] = e.target.value;
  });

  // CIP (capacitación) por NE
  app.querySelectorAll("[data-cip-prop]").forEach((el) => el.addEventListener("input", (e) => {
    const k = el.getAttribute("data-cip"); const i = parseInt(el.getAttribute("data-cip-idx"), 10);
    state.cip[k][i][el.getAttribute("data-cip-prop")] = e.target.value;
  }));
  app.querySelectorAll("[data-cip-add]").forEach((el) => el.addEventListener("click", () => {
    const k = el.getAttribute("data-cip-add");
    (state.cip[k] = state.cip[k] || []).push({ titulo: "", tiempo: "" });
    render();
  }));
  app.querySelectorAll("[data-cip-remove]").forEach((el) => el.addEventListener("click", () => {
    const [k, i] = el.getAttribute("data-cip-remove").split("|");
    state.cip[k].splice(parseInt(i, 10), 1); render();
  }));

  const card = app.querySelector(".card");
  if (stepKey === "ne") { if (modoCliente) attachClienteEmpresa(card, state, onChange); else attachNEListeners(card, state, onChange); }
  else if (stepKey === "seleccion") attachSeleccionListeners(card, state, onChange);
  else if (stepKey === "captacion") { if (modoCliente) attachClienteCaptacion(card, state, onChange); else attachCaptacionListeners(card, state, onChange); }
  else if (stepKey === "proceso") attachProcesoComercialListeners(card, state, onChange);
  else if (stepKey === "reporteria") attachReporteriaListeners(card, state, onChange);
  else if (stepKey === "chatbot") attachChatbotListeners(card, state, onChange);
  else if (stepKey === "rrhh") attachRRHHListeners(card, state, onChange);
  else if (stepKey === "api") attachAPIListeners(card, state, onChange);
  else if (stepKey === "app") attachAppListeners(card, state, onChange);
  else if (stepKey === "confirmacion") attachConfirmacionListeners(card, state, onChange, null);
}

async function init() {
  render();
  await initBitrix();
  const c = await obtenerContextoBX();
  ctx.proyectoId = c.proyectoId || devProy || null;
  ctx.proyectoNombre = c.proyectoNombre || (devProy ? "Proyecto de prueba" : "");
  ctx.jefeId = c.jefeId || "";
  ctx.jefeNombre = c.jefeNombre || "";
  ctx.usuario = c.usuario || null;
  ctx.esExtranet = !!c.esExtranet || devModo === "cliente";
  ctx.debug = c.debug || null;
  ctx.modoForzado = devModo === "cliente" ? "cliente (forzado por URL)" : (devModo === "dev" ? "consultor (forzado por URL)" : "automático");
  if (ctx.esExtranet) {
    vista = "cliente";
    await refrescarFormularios();
  } else {
    await refrescarLista();
  }
  cargando = false;
  render();
}
init();
