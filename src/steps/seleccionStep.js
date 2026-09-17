// "Selección de desarrollos". Proceso Comercial es un grupo con 3 sub-opciones
// independientes (Captación / Proceso / Reportes). Chatbot aparte.
// RRHH, API y Aplicación quedan como "Próximamente" (deshabilitados).

const SUB_PROCESO = [
  { key: "captacion", icon: "ti-antenna", label: "Captación de clientes", desc: "Canales y omnicanalidad" },
  { key: "proceso", icon: "ti-route", label: "Proceso Comercial", desc: "Prospectos, negociaciones, cotizaciones…" },
  { key: "reportes", icon: "ti-chart-bar", label: "Reportes", desc: "Tableros e indicadores de gestión" }
];
const OTROS = [
  { key: "chatbot", icon: "ti-message-chatbot", label: "Chatbot", desc: "Flujo del bot sobre plataforma vinculada a Bitrix24" }
];
const PROXIMAMENTE = [
  { key: "rrhh", icon: "ti-users-group", label: "Procesos de gestión de RRHH" },
  { key: "api", icon: "ti-plug-connected", label: "Creación de API / Integración" },
  { key: "app", icon: "ti-app-window", label: "Creación de aplicación" }
];

function ensureDesarrollos(state) {
  if (!state.desarrollos) state.desarrollos = {};
  const d = state.desarrollos;
  ["captacion", "proceso", "reportes", "chatbot", "api", "app", "rrhh"].forEach((k) => { if (d[k] === undefined) d[k] = false; });
  return d;
}

function card(m, on) {
  return `
    <div class="sel-card ${on ? "on" : ""}" data-toggle-des="${m.key}">
      <div class="sel-check">${on ? '<i class="ti ti-check"></i>' : ""}</div>
      <div class="sel-body">
        <div class="sel-title"><i class="ti ${m.icon}"></i> ${m.label}</div>
        <div class="sel-desc">${m.desc}</div>
      </div>
    </div>`;
}
function cardProx(m) {
  return `
    <div class="sel-card locked" style="opacity:.6">
      <div class="sel-check"></div>
      <div class="sel-body">
        <div class="sel-title"><i class="ti ${m.icon}"></i> ${m.label}</div>
        <div class="sel-lock"><i class="ti ti-clock"></i> Próximamente</div>
      </div>
    </div>`;
}

export function renderSeleccionStep(state) {
  const d = ensureDesarrollos(state);
  const grupoProc = SUB_PROCESO.map((m) => card(m, d[m.key])).join("");
  const otros = OTROS.map((m) => card(m, d[m.key])).join("");
  const prox = PROXIMAMENTE.map((m) => cardProx(m)).join("");

  return `
    <p class="step-title">Selección de desarrollos</p>
    <p class="step-helper">Marcá lo que este cliente necesita. El iCINE incluirá solo las secciones elegidas.</p>
    <div class="sel-fixed"><i class="ti ti-lock"></i> Pasos fijos: <b>Sobre la empresa</b> al inicio y <b>Generar iCINE</b> al final.</div>

    <p class="field-label" style="margin-top:6px">Proceso Comercial <span style="font-weight:400;color:var(--text-secondary)">— elegí las partes que apliquen</span></p>
    <div class="sel-grid">${grupoProc}</div>

    <p class="field-label" style="margin-top:16px">Otros desarrollos</p>
    <div class="sel-grid">${otros}</div>

    <p class="field-label" style="margin-top:16px">Próximamente</p>
    <div class="sel-grid">${prox}</div>`;
}

export function attachSeleccionListeners(container, state, onChange) {
  ensureDesarrollos(state);
  container.querySelectorAll("[data-toggle-des]").forEach((el) => {
    el.addEventListener("click", () => {
      const key = el.getAttribute("data-toggle-des");
      state.desarrollos[key] = !state.desarrollos[key];
      onChange({ rerender: true });
    });
  });
}
