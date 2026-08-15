// Pantalla "Selección de desarrollos": el checklist que enciende/apaga pestañas.
// Arranca vacío. "Proceso Comercial" es un paquete (Captación + Proceso + Reportería).
// "Reportes" suelto se desactiva si el paquete está activo (de-duplicación).

const DESARROLLOS = [
  { key: "proceso", icon: "ti-route", label: "Proceso Comercial", desc: "Paquete: Captación + Proceso Comercial + Reportería", paquete: ["Captación", "Proceso Comercial", "Reportería"] },
  { key: "reportes", icon: "ti-chart-bar", label: "Reportes", desc: "Solo tableros e indicadores de gestión", paquete: [] },
  { key: "chatbot", icon: "ti-message-chatbot", label: "Chatbot", desc: "Flujo del bot sobre una plataforma vinculada a Bitrix24", paquete: [] },
  { key: "api", icon: "ti-plug-connected", label: "Creación de API", desc: "Integración con terceros", paquete: [] },
  { key: "app", icon: "ti-app-window", label: "Creación de aplicación", desc: "Desarrollo de una app a medida", paquete: [] }
];

function ensureDesarrollos(state) {
  if (!state.desarrollos) state.desarrollos = { proceso: false, reportes: false, chatbot: false, api: false, app: false };
  return state.desarrollos;
}
function reportesBloqueado(state) { return !!ensureDesarrollos(state).proceso; }

export function renderSeleccionStep(state) {
  ensureDesarrollos(state);
  const cards = DESARROLLOS.map((m) => {
    const locked = m.key === "reportes" && reportesBloqueado(state);
    const on = state.desarrollos[m.key] && !locked;
    const badges = m.paquete.length
      ? `<div class="sel-badges">${m.paquete.map((p) => `<span class="sel-badge">${p}</span>`).join("")}</div>`
      : "";
    const lockNote = locked
      ? `<div class="sel-lock"><i class="ti ti-lock"></i> incluido en Proceso Comercial</div>`
      : "";
    return `
      <div class="sel-card ${on ? "on" : ""} ${locked ? "locked" : ""}" ${locked ? "" : `data-toggle-des="${m.key}"`}>
        <div class="sel-check">${on ? '<i class="ti ti-check"></i>' : ""}</div>
        <div class="sel-body">
          <div class="sel-title"><i class="ti ${m.icon}"></i> ${m.label}</div>
          <div class="sel-desc">${m.desc}</div>
          ${badges}${lockNote}
        </div>
      </div>`;
  }).join("");

  const dedup = (state.desarrollos.reportes && reportesBloqueado(state))
    ? `<div class="sel-dedup"><i class="ti ti-info-circle"></i> Reportes ya viene dentro del paquete <b>Proceso Comercial</b>. Para no duplicar, la pestaña de Reportes suelta se desactiva sola.</div>`
    : "";

  return `
    <p class="step-title">Selección de desarrollos</p>
    <p class="step-helper">Marcá los desarrollos que este cliente necesita. El iCINE final va a incluir solo las secciones que elijas — y si elegís varias, se generan juntas en un mismo documento.</p>
    <div class="sel-fixed"><i class="ti ti-lock"></i> Pasos fijos, siempre presentes: <b>Sobre la empresa</b> al inicio y <b>Generar iCINE</b> al final.</div>
    <div class="sel-grid">${cards}</div>
    ${dedup}`;
}

export function attachSeleccionListeners(container, state, onChange) {
  ensureDesarrollos(state);
  container.querySelectorAll("[data-toggle-des]").forEach((el) => {
    el.addEventListener("click", () => {
      const key = el.getAttribute("data-toggle-des");
      state.desarrollos[key] = !state.desarrollos[key];
      // Si desactivo el paquete, "reportes" vuelve a estar disponible tal como estaba.
      onChange({ rerender: true });
    });
  });
}
