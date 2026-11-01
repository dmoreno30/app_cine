// Captación — versión CLIENTE (extranet). Lenguaje simple, SIN horas ni flujo técnico.
// Escribe en state.captacion.canales (mismas claves que usa el desarrollador):
//   { tipo, nombre, url, colapsado, flujo:[{ accion:"Atención de mensajes entrantes", responsable:<quién>, condicion:"", tiempo:"" }] }
import { escapeHtml, escapeAttr } from "../utils.js";

// Catálogo de canales para el cliente (no reutiliza config: aquí WhatsApp es referencia y no hay Tienda virtual).
const CANALES_CLIENTE = [
  { key: "facebook", label: "Facebook", icon: "ti-brand-facebook" },
  { key: "instagram", label: "Instagram", icon: "ti-brand-instagram" },
  { key: "whatsapp", label: "WhatsApp", icon: "ti-brand-whatsapp" },
  { key: "formularios", label: "Formularios del CRM", icon: "ti-forms" },
  { key: "widget", label: "Widget para sitio web", icon: "ti-browser-plus" },
  { key: "chatvivo", label: "Chat en vivo", icon: "ti-messages" },
  { key: "telegram", label: "Telegram", icon: "ti-brand-telegram" },
  { key: "tiktok", label: "TikTok", icon: "ti-brand-tiktok" },
  { key: "linkedin", label: "LinkedIn", icon: "ti-brand-linkedin" },
  { key: "manual", label: "Creado manualmente", icon: "ti-pencil-plus" },
  { key: "otros", label: "Otros", icon: "ti-dots" }
];
const LABEL = Object.fromEntries(CANALES_CLIENTE.map((c) => [c.key, c.label]));
const ICON = Object.fromEntries(CANALES_CLIENTE.map((c) => [c.key, c.icon]));

const PIDE_URL = { formularios: "¿En qué página web está el formulario?", widget: "¿En qué página web irá el widget?", chatvivo: "¿En qué página web está el chat en vivo?" };
const NECESITA_ACCESO = new Set(["facebook", "instagram", "telegram", "widget", "formularios"]);
const NOTA_EXTERNA = {
  whatsapp: "Para WhatsApp necesitamos una aplicación externa (como Wazzup). No te preocupes: nosotros te la proponemos y configuramos.",
  tiktok: "TikTok no se conecta directo a Bitrix24: usaremos una herramienta externa. No te preocupes, nosotros proponemos la mejor opción.",
  linkedin: "LinkedIn no se conecta directo a Bitrix24: usaremos una herramienta externa. No te preocupes, nosotros proponemos la mejor opción."
};

function quienDe(c) { return (c.flujo && c.flujo[0] && c.flujo[0].responsable) || ""; }

export function renderClienteCaptacion(state) {
  const cap = state.captacion || { intro: "", canales: [] };
  const canales = Array.isArray(cap.canales) ? cap.canales : [];

  const menu = CANALES_CLIENTE.map((c) => `
    <div class="canal-chip" data-cli-cap-add="${c.key}"><i class="ti ${c.icon}"></i>${c.label}</div>`).join("");

  const tarjetas = canales.map((c, i) => {
    const tipo = c.tipo || "otros";
    const colapsado = !!c.colapsado;
    const notaExterna = NOTA_EXTERNA[tipo] ? `<p class="cli-nota cli-nota--warn"><i class="ti ti-plug-connected-x"></i> ${NOTA_EXTERNA[tipo]}</p>` : "";
    const notaAcceso = NECESITA_ACCESO.has(tipo) ? `<p class="cli-nota"><i class="ti ti-info-circle"></i> Necesitarás tener a la mano los accesos de ${LABEL[tipo] || "este canal"} (usuario/clave o permisos de administrador).</p>` : "";
    const urlLabel = PIDE_URL[tipo];
    const cuerpo = colapsado ? "" : `
      <div class="cli-canal-body">
        <div class="field-block">
          <label class="field-label">¿Cómo quieres llamar a este canal?</label>
          <input type="text" data-cli-cap="${i}" data-cli-cap-prop="nombre" value="${escapeAttr(c.nombre || "")}" placeholder="Ej. ${escapeAttr(LABEL[tipo] || "Canal")}">
        </div>
        ${urlLabel ? `
        <div class="field-block">
          <label class="field-label">${urlLabel}</label>
          <input type="text" data-cli-cap="${i}" data-cli-cap-prop="url" value="${escapeAttr(c.url || "")}" placeholder="https://tusitio.com">
        </div>` : ""}
        <div class="field-block">
          <label class="field-label">¿Quién atenderá los mensajes que lleguen por aquí?</label>
          <input type="text" data-cli-cap="${i}" data-cli-cap-prop="responsable" value="${escapeAttr(quienDe(c))}" placeholder="Ej. Equipo de ventas, un asesor específico…">
        </div>
        ${notaExterna}${notaAcceso}
      </div>`;
    const resumen = colapsado && (c.nombre || "").trim() ? ` <span class="cli-canal-sub">— ${escapeHtml(c.nombre.trim())}</span>` : "";
    return `
      <div class="cli-canal-card ${colapsado ? "is-colapsado" : ""}">
        <div class="cli-canal-head">
          <span class="cli-canal-name"><i class="ti ${ICON[tipo] || "ti-plug-connected"}"></i> ${escapeHtml(LABEL[tipo] || "Canal")}${resumen}</span>
          <span class="cli-canal-acts">
            <button class="icon-btn" data-cli-cap-toggle="${i}" title="${colapsado ? "Expandir" : "Minimizar"}"><i class="ti ${colapsado ? "ti-chevron-down" : "ti-chevron-up"}"></i></button>
            <button class="icon-btn" data-cli-cap-remove="${i}" title="Quitar"><i class="ti ti-x"></i></button>
          </span>
        </div>
        ${cuerpo}
      </div>`;
  }).join("");

  return `
    <p class="step-title">¿Cómo llegan tus clientes?</p>
    <p class="step-helper">Elige los canales por los que te contactan. Luego nos dices quién los atenderá. De los detalles técnicos nos encargamos nosotros.</p>

    <div class="field-block">
      <label class="field-label">Cuéntanos en pocas palabras cómo atiendes hoy a quienes te escriben</label>
      <textarea data-cli-cap-intro rows="3" placeholder="Ej. Hoy nos escriben por Facebook e Instagram y respondemos desde el celular, sin un orden claro…">${escapeHtml(cap.intro || "")}</textarea>
    </div>

    <p class="field-label">Agrega tus canales</p>
    <div class="canal-grid">${menu}</div>

    <div class="cli-canal-list">${tarjetas || '<p class="step-helper" style="margin-top:12px">Aún no agregaste canales. Toca uno de arriba para empezar.</p>'}</div>`;
}

export function attachClienteCaptacion(container, state, onChange) {
  if (!state.captacion) state.captacion = { intro: "", canales: [], conexiones: [] };
  if (!Array.isArray(state.captacion.canales)) state.captacion.canales = [];
  const cap = state.captacion;

  const intro = container.querySelector("[data-cli-cap-intro]");
  if (intro) intro.addEventListener("input", (e) => { cap.intro = e.target.value; onChange({ rerender: false }); });

  container.querySelectorAll("[data-cli-cap-add]").forEach((el) => el.addEventListener("click", () => {
    const tipo = el.getAttribute("data-cli-cap-add");
    cap.canales.push({ tipo, nombre: "", url: "", colapsado: false, flujo: [{ accion: "Atención de mensajes entrantes", responsable: "", condicion: "", tiempo: "" }] });
    onChange({ rerender: true });
  }));

  container.querySelectorAll("[data-cli-cap-toggle]").forEach((el) => el.addEventListener("click", () => {
    const c = cap.canales[parseInt(el.getAttribute("data-cli-cap-toggle"), 10)]; if (!c) return;
    c.colapsado = !c.colapsado; onChange({ rerender: true });
  }));

  container.querySelectorAll("[data-cli-cap-remove]").forEach((el) => el.addEventListener("click", () => {
    cap.canales.splice(parseInt(el.getAttribute("data-cli-cap-remove"), 10), 1);
    onChange({ rerender: true });
  }));

  container.querySelectorAll("[data-cli-cap-prop]").forEach((el) => el.addEventListener("input", (e) => {
    const i = parseInt(el.getAttribute("data-cli-cap"), 10);
    const prop = el.getAttribute("data-cli-cap-prop");
    const c = cap.canales[i]; if (!c) return;
    if (prop === "responsable") {
      if (!Array.isArray(c.flujo) || !c.flujo.length) c.flujo = [{ accion: "Atención de mensajes entrantes", responsable: "", condicion: "", tiempo: "" }];
      c.flujo[0].responsable = e.target.value;
    } else {
      c[prop] = e.target.value;
    }
    onChange({ rerender: false });
  }));
}
