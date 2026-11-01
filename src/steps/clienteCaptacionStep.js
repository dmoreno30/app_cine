// Captación — versión CLIENTE (extranet). Lenguaje simple, SIN horas ni flujo técnico.
// Escribe en state.captacion.canales (mismas claves que usa el desarrollador):
//   { tipo, nombre, url, flujo:[{ accion:"Atención de mensajes entrantes", responsable:<quién>, condicion:"", tiempo:"" }] }
import { CANALES } from "../data/config.js";
import { escapeHtml, escapeAttr } from "../utils.js";

const CANAL_LABEL = Object.fromEntries(CANALES.map((c) => [c.key, c.label]));
const NECESITA_ACCESO = new Set(["facebook", "instagram", "tiktok", "linkedin", "telegram", "widget", "tiendavirtual"]);

function quienDe(c) { return (c.flujo && c.flujo[0] && c.flujo[0].responsable) || ""; }

export function renderClienteCaptacion(state) {
  const cap = state.captacion || { intro: "", canales: [] };
  const canales = Array.isArray(cap.canales) ? cap.canales : [];

  const menu = CANALES.map((c) => `
    <div class="canal-chip" data-cli-cap-add="${c.key}"><i class="ti ${c.icon}"></i>${c.label}</div>`).join("");

  const tarjetas = canales.map((c, i) => {
    const esWidget = c.tipo === "widget";
    const legend = NECESITA_ACCESO.has(c.tipo)
      ? `<p class="step-helper" style="margin-top:6px"><i class="ti ti-info-circle"></i> Para conectar ${CANAL_LABEL[c.tipo] || "este canal"} necesitarás tener a la mano los accesos (usuario/contraseña o permisos de administrador).</p>`
      : "";
    return `
      <div class="cli-canal-card">
        <div class="cli-canal-head">
          <span class="cli-canal-name"><i class="ti ti-plug-connected"></i> ${escapeHtml(CANAL_LABEL[c.tipo] || "Canal")}</span>
          <button class="icon-btn" data-cli-cap-remove="${i}" title="Quitar"><i class="ti ti-x"></i></button>
        </div>
        <div class="field-block">
          <label class="field-label">¿Cómo quieres llamar a este canal?</label>
          <input type="text" data-cli-cap="${i}" data-cli-cap-prop="nombre" value="${escapeAttr(c.nombre || "")}" placeholder="Ej. ${escapeAttr(CANAL_LABEL[c.tipo] || "Canal")}">
        </div>
        ${esWidget ? `
        <div class="field-block">
          <label class="field-label">¿En qué página web estaría el widget?</label>
          <input type="text" data-cli-cap="${i}" data-cli-cap-prop="url" value="${escapeAttr(c.url || "")}" placeholder="https://tusitio.com">
        </div>` : ""}
        <div class="field-block">
          <label class="field-label">¿Quién atenderá los mensajes que lleguen por aquí?</label>
          <input type="text" data-cli-cap="${i}" data-cli-cap-prop="responsable" value="${escapeAttr(quienDe(c))}" placeholder="Ej. Equipo de ventas, un asesor específico…">
        </div>
        ${legend}
      </div>`;
  }).join("");

  return `
    <p class="step-title">¿Cómo llegan tus clientes?</p>
    <p class="step-helper">Elige los canales por los que te contactan tus clientes. Luego nos dices quién los atenderá. No te preocupes por los detalles técnicos: de eso nos encargamos nosotros.</p>

    <div class="field-block">
      <label class="field-label">Cuéntanos en pocas palabras cómo atiendes hoy a quienes te escriben</label>
      <textarea data-cli-cap-intro rows="3" placeholder="Ej. Hoy nos escriben por Facebook e Instagram y respondemos desde el celular, sin un orden claro…">${escapeHtml(cap.intro || "")}</textarea>
    </div>

    <p class="field-label">Agrega tus canales</p>
    <div class="canal-grid">${menu}</div>

    <div style="margin-top:14px">${tarjetas || '<p class="step-helper">Aún no agregaste canales. Toca uno de arriba para empezar.</p>'}</div>`;
}

export function attachClienteCaptacion(container, state, onChange) {
  if (!state.captacion) state.captacion = { intro: "", canales: [], conexiones: [] };
  if (!Array.isArray(state.captacion.canales)) state.captacion.canales = [];
  const cap = state.captacion;

  const intro = container.querySelector("[data-cli-cap-intro]");
  if (intro) intro.addEventListener("input", (e) => { cap.intro = e.target.value; onChange({ rerender: false }); });

  container.querySelectorAll("[data-cli-cap-add]").forEach((el) => el.addEventListener("click", () => {
    const tipo = el.getAttribute("data-cli-cap-add");
    cap.canales.push({ tipo, nombre: "", url: "", flujo: [{ accion: "Atención de mensajes entrantes", responsable: "", condicion: "", tiempo: "" }] });
    onChange({ rerender: true });
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
