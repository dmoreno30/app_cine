// Paso "Chatbot": documenta el flujo del bot sobre una plataforma vinculada a
// Bitrix24. Dos ramas según tipoBot: "menus" (árbol de menús planos con acciones)
// o "conversacional" (IA con reintentos y derivación).
import { PLATAFORMAS_CHATBOT, TIPOS_ACCION_BOT, ENTIDADES_BOT } from "../data/config.js";
import { escapeHtml, escapeAttr } from "../utils.js";

const tipoNecesitaEntidad = (tipo) => {
  const t = TIPOS_ACCION_BOT.find((x) => x.key === tipo);
  return !!(t && t.entidad);
};

function renderComunes(cb) {
  const opciones = PLATAFORMAS_CHATBOT.map((p) =>
    `<option value="${escapeAttr(p)}" ${cb.plataforma === p ? "selected" : ""}>${p}</option>`).join("");
  const otro = cb.plataforma === "Otra"
    ? `<input type="text" data-cb-plataforma-otro value="${escapeAttr(cb.plataformaOtro)}" placeholder="¿En qué plataforma?" style="margin-top:8px">` : "";
  return `
    <div class="field-block">
      <label class="field-label">¿En qué plataforma / canal corre el bot?</label>
      <select data-cb-plataforma><option value="">Seleccioná una opción…</option>${opciones}</select>
      ${otro}
    </div>
    <div class="field-block">
      <label class="field-label">Objetivo del bot</label>
      <textarea data-cb-objetivo rows="2" placeholder="Ej. Atender el primer contacto, resolver consultas frecuentes y derivar lo que no puede resolver.">${escapeHtml(cb.objetivo)}</textarea>
    </div>`;
}

function renderAccion(mi, ai, a) {
  const tipos = TIPOS_ACCION_BOT.map((t) =>
    `<option value="${t.key}" ${a.tipo === t.key ? "selected" : ""}>${t.label}</option>`).join("");
  const entidadSel = tipoNecesitaEntidad(a.tipo)
    ? `<select data-cb-acc-m="${mi}" data-cb-acc-i="${ai}" data-cb-acc-prop="entidad" style="max-width:170px">
         <option value="">Entidad…</option>
         ${ENTIDADES_BOT.map((e) => `<option value="${escapeAttr(e)}" ${a.entidad === e ? "selected" : ""}>${e}</option>`).join("")}
       </select>` : "";
  return `
    <div class="bot-accion">
      <div class="bot-accion-top">
        <select data-cb-acc-m="${mi}" data-cb-acc-i="${ai}" data-cb-acc-prop="tipo" style="max-width:210px">${tipos}</select>
        ${entidadSel}
        <button class="icon-btn" data-cb-acc-remove-m="${mi}" data-cb-acc-remove-i="${ai}" title="Quitar acción"><i class="ti ti-x"></i></button>
      </div>
      <input type="text" data-cb-acc-m="${mi}" data-cb-acc-i="${ai}" data-cb-acc-prop="descripcion"
             value="${escapeAttr(a.descripcion)}" placeholder="Qué hace el bot en esta acción">
      <input type="text" data-cb-acc-m="${mi}" data-cb-acc-i="${ai}" data-cb-acc-prop="condicion"
             value="${escapeAttr(a.condicion)}" placeholder="Condición / regla (opcional — ej. 'si existe', 'si no responde')">
    </div>`;
}

function renderMenus(cb) {
  const menus = (cb.menus || []).map((m, mi) => `
    <div class="bot-menu">
      <div class="bot-menu-head">
        <input type="text" data-cb-menu-idx="${mi}" data-cb-menu-prop="nombre"
               value="${escapeAttr(m.nombre)}" placeholder="Nombre del menú (ej. Menú principal, Ventas, Soporte)">
        <button class="icon-btn" data-cb-menu-remove="${mi}" title="Quitar menú"><i class="ti ti-trash"></i></button>
      </div>
      <div class="bot-acciones">
        ${(m.acciones || []).map((a, ai) => renderAccion(mi, ai, a)).join("") || '<p style="font-size:12px;color:#999;margin:4px 0">Sin acciones todavía.</p>'}
      </div>
      <button class="add-btn small" data-cb-acc-add="${mi}"><i class="ti ti-plus" style="margin-right:4px"></i>Agregar acción</button>
    </div>`).join("");
  return `
    <div class="field-block">
      <label class="field-label">Menús del bot <span style="font-weight:400;color:var(--text-secondary)">— cada submenú es otro menú de la lista, enlazado con la acción "Ir a otro menú"</span></label>
      ${menus || '<p style="font-size:13px;color:#888;margin:4px 0">Todavía no agregaste menús.</p>'}
      <button class="add-btn" data-cb-menu-add><i class="ti ti-plus" style="margin-right:4px"></i>Agregar menú</button>
    </div>`;
}

function renderConversacional(cb) {
  return `
    <div class="field-block">
      <label class="field-label">Mensaje de bienvenida</label>
      <textarea data-cb-bienvenida rows="2" placeholder="Ej. ¡Hola! ¿En qué puedo ayudarte hoy?">${escapeHtml(cb.bienvenida)}</textarea>
    </div>
    <div class="field-block">
      <label class="field-label">¿Qué resuelve y con qué conocimiento responde?</label>
      <textarea data-cb-conocimiento rows="3" placeholder="Ej. Responde preguntas frecuentes sobre productos, precios y horarios, usando el catálogo y las FAQ de la empresa.">${escapeHtml(cb.conocimiento)}</textarea>
    </div>
    <div class="field-block" style="display:flex;gap:12px;flex-wrap:wrap">
      <div style="flex:1;min-width:160px">
        <label class="field-label">Intentos antes de derivar</label>
        <input type="text" data-cb-intentos value="${escapeAttr(cb.intentosDerivar)}" placeholder="Ej. 2">
      </div>
      <div style="flex:2;min-width:200px">
        <label class="field-label">¿A quién deriva?</label>
        <input type="text" data-cb-deriva value="${escapeAttr(cb.derivaA)}" placeholder="Ej. Asesor comercial de turno">
      </div>
    </div>`;
}

export function renderChatbotStep(state) {
  const cb = state.chatbot;
  const rama = cb.tipoBot === "menus" ? renderMenus(cb)
    : cb.tipoBot === "conversacional" ? renderConversacional(cb)
    : `<p style="font-size:13px;color:#888">Elegí el tipo de bot para ver las preguntas correspondientes.</p>`;
  return `
    <p class="step-title">Chatbot</p>
    <p class="step-helper">Documentá el flujo del bot sobre la plataforma vinculada a Bitrix24. No es una app: es la lógica conversacional y de derivación.</p>

    <div class="field-block">
      <label class="field-label">Tipo de bot</label>
      <div class="canal-grid">
        <div class="canal-chip ${cb.tipoBot === "menus" ? "on" : ""}" data-cb-tipo="menus"><i class="ti ti-list-tree"></i> Bot de menús</div>
        <div class="canal-chip ${cb.tipoBot === "conversacional" ? "on" : ""}" data-cb-tipo="conversacional"><i class="ti ti-sparkles"></i> Conversacional / IA</div>
      </div>
    </div>

    ${renderComunes(cb)}
    ${rama}

    <div class="field-block">
      <label class="field-label">Fuera de horario / si nadie responde (fallback)</label>
      <textarea data-cb-fallback rows="2" placeholder="Ej. Fuera de horario responde con un mensaje automático y agenda seguimiento para el día siguiente.">${escapeHtml(cb.fallback)}</textarea>
    </div>`;
}

export function attachChatbotListeners(container, state, onChange) {
  const cb = state.chatbot;
  const bindInput = (sel, prop) => { const el = container.querySelector(sel); if (el) el.addEventListener("input", (e) => { cb[prop] = e.target.value; onChange({ rerender: false }); }); };

  // Tipo de bot (rerender: cambian las preguntas)
  container.querySelectorAll("[data-cb-tipo]").forEach((el) => el.addEventListener("click", () => { cb.tipoBot = el.getAttribute("data-cb-tipo"); onChange({ rerender: true }); }));

  // Plataforma
  const plat = container.querySelector("[data-cb-plataforma]");
  if (plat) plat.addEventListener("change", (e) => { cb.plataforma = e.target.value; onChange({ rerender: true }); });
  bindInput("[data-cb-plataforma-otro]", "plataformaOtro");
  bindInput("[data-cb-objetivo]", "objetivo");
  bindInput("[data-cb-fallback]", "fallback");

  // Conversacional
  bindInput("[data-cb-bienvenida]", "bienvenida");
  bindInput("[data-cb-conocimiento]", "conocimiento");
  bindInput("[data-cb-intentos]", "intentosDerivar");
  bindInput("[data-cb-deriva]", "derivaA");

  // Menús
  const addMenu = container.querySelector("[data-cb-menu-add]");
  if (addMenu) addMenu.addEventListener("click", () => { cb.menus.push({ nombre: "", acciones: [] }); onChange({ rerender: true }); });
  container.querySelectorAll("[data-cb-menu-remove]").forEach((el) => el.addEventListener("click", () => { cb.menus.splice(parseInt(el.getAttribute("data-cb-menu-remove"), 10), 1); onChange({ rerender: true }); }));
  container.querySelectorAll("[data-cb-menu-idx]").forEach((el) => el.addEventListener("input", (e) => { cb.menus[parseInt(el.getAttribute("data-cb-menu-idx"), 10)][el.getAttribute("data-cb-menu-prop")] = e.target.value; onChange({ rerender: false }); }));

  // Acciones dentro de menú
  container.querySelectorAll("[data-cb-acc-add]").forEach((el) => el.addEventListener("click", () => {
    const mi = parseInt(el.getAttribute("data-cb-acc-add"), 10);
    cb.menus[mi].acciones.push({ tipo: "mensaje", entidad: "", descripcion: "", condicion: "" });
    onChange({ rerender: true });
  }));
  container.querySelectorAll("[data-cb-acc-remove-m]").forEach((el) => el.addEventListener("click", () => {
    const mi = parseInt(el.getAttribute("data-cb-acc-remove-m"), 10), ai = parseInt(el.getAttribute("data-cb-acc-remove-i"), 10);
    cb.menus[mi].acciones.splice(ai, 1); onChange({ rerender: true });
  }));
  container.querySelectorAll("[data-cb-acc-prop]").forEach((el) => {
    const evt = el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(evt, (e) => {
      const mi = parseInt(el.getAttribute("data-cb-acc-m"), 10), ai = parseInt(el.getAttribute("data-cb-acc-i"), 10);
      const prop = el.getAttribute("data-cb-acc-prop");
      cb.menus[mi].acciones[ai][prop] = e.target.value;
      // Si cambió el tipo, re-render para mostrar/ocultar el selector de entidad
      onChange({ rerender: prop === "tipo" });
    });
  });
}
